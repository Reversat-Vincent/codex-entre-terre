// Puissance d'attaque « Calculé » d'une arme pour un profil, une affinité, un niveau et un maniement (hypothèse C3, mode `estimate` par défaut).
// Méthode : docs/design/ds/calculs.md, « Puissance d'attaque calculée (Estimation) » ; configuration : config/attackPower.ts.
// Estimation bornée : aucun autre module ne dépend de son détail (docs/architecture.md § 5.2). Les valeurs publiées à +0 restent affichées à côté.

import { DAMAGE_KEYS, WEAPON_ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { DamageKey, WeaponAttributeKey } from '../data/keys.ts'
import type { UpgradeAffinityTable, UpgradeLevel, WeaponEntry } from '../data/types/weapon.ts'
import { ATTACK_POWER } from './config/attackPower.ts'
import type { AttackPowerConfig, AttackPowerMode, CurveFamily } from './config/attackPower.ts'
import { TWO_HANDED } from './config/twoHanded.ts'
import type { TwoHandedConfig } from './config/twoHanded.ts'
import { twoHandBonusApplies, twoHandMode, twoHandedStrength } from './requirements.ts'
import type { TwoHandMode } from './requirements.ts'
import { makeCalc } from './types.ts'
import type { Attributes, Calc, DataRef, ExplanationComponent, ExplanationLimit, Hands, WeaponFileKey } from './types.ts'

/** Champs d'arme lus par le calcul. */
export type AttackWeapon = Pick<WeaponEntry, 'id' | 'category' | 'attack_power' | 'scaling' | 'requirements' | 'upgrade' | 'derived'>

/**
 * État du calcul d'un type de dégâts : `scaled` bonus calculé ; `no-scaling` aucun attribut ne le fait varier ; `penalty` prérequis non atteint
 * (−40 %, sans bonus) ; `no-coef` bonus non calculable (lettre sans coefficient) ; `undocumented` scaling élémentaire non documenté (base seule) ;
 * `exception` exception connue à la pénalité (base seule) ; `missing` base non documentée ; `published` valeur publiée (mode `published`).
 */
export type AttackTypeStatus = 'scaled' | 'no-scaling' | 'penalty' | 'no-coef' | 'undocumented' | 'exception' | 'missing' | 'published'

/** Détail d'un type de dégâts. */
export interface AttackTypeBreakdown {
  readonly type: DamageKey
  /** Base au niveau choisi ; `null` si non documentée. */
  readonly base: number | null
  /** Vrai si la base est interpolée entre deux niveaux documentés. */
  readonly baseInterpolated: boolean
  /** Coefficient de chaque attribut qui fait varier ce type (`null` = lettre seule, coefficient inconnu). */
  readonly coefs: Readonly<Partial<Record<WeaponAttributeKey, number | null>>>
  /** Valeur de courbe pour l'attribut effectif de chaque attribut à coefficient connu. */
  readonly curve: Readonly<Partial<Record<WeaponAttributeKey, number>>>
  /** `Σ coef × courbe / 100`, ou `null` si non calculé. */
  readonly bonus: number | null
  readonly status: AttackTypeStatus
  /** Puissance du type : `floor(base × (1 + bonus))`, `floor(base × 0,6)` ou `floor(base)` selon l'état ; `null` si la base manque. */
  readonly value: number | null
}

/** Puissance d'attaque calculée. */
export interface AttackBreakdown {
  readonly mode: AttackPowerMode
  readonly affinity: string
  readonly level: number
  readonly hands: Hands
  readonly twoHandMode: TwoHandMode
  /** Attributs effectifs utilisés (Force × 1,5 si le bonus de deux mains s'applique). */
  readonly effective: Readonly<Record<WeaponAttributeKey, number>>
  /** Types de dégâts non nuls de l'arme. */
  readonly types: readonly AttackTypeBreakdown[]
  /** Somme des types ; `null` si un type a une base non documentée. */
  readonly total: number | null
  /** Vrai si au moins un type n'a que sa base (bonus non calculable ou non documenté) : le total sous-estime alors la puissance. */
  readonly partial: boolean
}

/** Raison pour laquelle aucune valeur n'est calculable. */
export type AttackUnavailableCode =
  | 'level-out-of-range'
  | 'affinity-undocumented'
  | 'level-undocumented'
  | 'published-value-missing'

/** Puissance d'attaque non calculable : la colonne Calculé affiche « Non documenté » avec cette raison. */
export interface AttackUnavailable {
  readonly unavailable: AttackUnavailableCode
}

/** Résultat de `attackPower`. */
export type AttackPowerResult = Calc<AttackBreakdown> | AttackUnavailable

/** Contexte du calcul : fichier de l'arme (références de données) et configurations. */
export interface AttackPowerContext {
  readonly file: WeaponFileKey
  readonly cfg?: AttackPowerConfig
  readonly twoHanded?: TwoHandedConfig
}

/**
 * Marge des arrondis inférieurs : `floor(110 × 0,6)` doit valoir 66 alors que le produit flottant vaut 65,999…
 * Aucune valeur réelle n'est à moins de 1e-9 au-dessous d'un entier (bases et coefficients ont au plus 4 décimales).
 */
const FLOOR_EPSILON = 1e-9

/**
 * Arrondi inférieur tolérant aux erreurs de la virgule flottante.
 * @param x Valeur à arrondir.
 * @returns L'entier inférieur ou égal à `x`, à `FLOOR_EPSILON` près.
 */
function floorSafe(x: number): number {
  return Math.floor(x + FLOOR_EPSILON)
}

/**
 * Famille de courbe d'une affinité (calculs.md, point 6, D39) : « non physique » pour les affinités de `nonPhysicalAffinities`, « physique »
 * sinon (armes uniques comprises, traitées en Standard [conception]).
 * @param affinity Affinité (clé de `upgrade.tables`).
 * @param cfg Configuration.
 * @returns La famille.
 */
export function curveFamily(affinity: string, cfg: AttackPowerConfig = ATTACK_POWER): CurveFamily {
  return cfg.nonPhysicalAffinities.includes(affinity) ? 'nonPhysical' : 'physical'
}

/**
 * Valeur de la courbe générique pour un attribut effectif (calculs.md, point 6) : interpolation linéaire entre les points du wiki de la
 * famille ; sous le premier point, entre `curveFloor` et lui ([conception], limite `curve-below-10`) ; au-delà du dernier, valeur du dernier
 * point (non documenté, limite `curve-above-99`).
 * @param attr Attribut effectif.
 * @param cfg Configuration (courbes et point bas).
 * @param family Famille de courbe, « physique » par défaut.
 * @returns La valeur de courbe (en %) et la limite éventuelle.
 */
export function scalingCurve(
  attr: number,
  cfg: AttackPowerConfig = ATTACK_POWER,
  family: CurveFamily = 'physical',
): { value: number; limit: ExplanationLimit | null } {
  const pts = cfg.curves[family]
  const first = pts[0]
  const last = pts.at(-1)
  if (first === undefined || last === undefined) throw new Error('attackPower : courbe vide')
  if (attr < first.attr) {
    const f = cfg.curveFloor
    const value = attr <= f.attr ? f.value : f.value + ((first.value - f.value) * (attr - f.attr)) / (first.attr - f.attr)
    return { value, limit: { code: 'curve-below-10', params: { points: attr } } }
  }
  if (attr > last.attr) return { value: last.value, limit: { code: 'curve-above-99', params: { points: attr } } }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (a !== undefined && b !== undefined && attr <= b.attr) return { value: a.value + ((b.value - a.value) * (attr - a.attr)) / (b.attr - a.attr), limit: null }
  }
  return { value: last.value, limit: null }
}

/** Niveau documenté d'un tableau d'affinité. */
interface LevelRow {
  readonly n: number
  readonly row: UpgradeLevel
}

/** Source de la base et des coefficients au niveau choisi. */
type Sample =
  | { readonly kind: 'exact'; readonly at: LevelRow }
  | { readonly kind: 'interp'; readonly lo: LevelRow; readonly hi: LevelRow }
  | { readonly kind: 'infobox'; readonly zero: LevelRow | null }

/**
 * Niveaux documentés d'un tableau d'affinité, triés.
 * @param table Tableau d'affinité.
 * @returns Les lignes `+N`.
 */
function levelRows(table: UpgradeAffinityTable): LevelRow[] {
  return Object.entries(table)
    .filter(([k]) => /^\+\d+$/.test(k))
    .map(([k, row]) => ({ n: Number(k.slice(1)), row: row as UpgradeLevel }))
    .sort((a, b) => a.n - b.n)
}

/** Résultat de lecture d'une attaque dans une ligne de tableau. */
type AttackRead = number | 'missing' | 'unparsed'

/**
 * Attaque d'un type dans une ligne. Un type absent de toutes les lignes du tableau et nul dans l'infobox vaut 0 (l'extraction omet les types
 * sans dégâts : Longsword) ; absent mais documenté ailleurs, il est `missing` (Sword of Night and Flame : feu absent du tableau, non nul dans l'infobox).
 * @param row Ligne lue.
 * @param t Type de dégâts.
 * @param rows Toutes les lignes du tableau.
 * @param w Arme (infobox).
 * @returns La valeur, `missing` ou `unparsed` (texte du wiki comme « 56/56 »).
 */
function attackOf(row: UpgradeLevel, t: DamageKey, rows: readonly LevelRow[], w: AttackWeapon): AttackRead {
  const v = row.attack[t]
  if (typeof v === 'number') return v
  if (typeof v === 'string') return 'unparsed'
  const listed = rows.some((r) => r.row.attack[t] !== undefined)
  return !listed && w.attack_power[t] === 0 ? 0 : 'missing'
}

/**
 * Coefficient d'un attribut : `none` pas de scaling ; `coef` coefficient connu ; `unknown` coefficient inconnu, parce que le wiki ne publie que
 * la lettre (`letter-only`) ou parce que la ligne n'a pas de scaling (`row-without-scaling`, certains niveaux des armes à distance).
 */
type CoefRead =
  | { readonly kind: 'none' }
  | { readonly kind: 'coef'; readonly value: number; readonly interpolated?: boolean }
  | { readonly kind: 'unknown'; readonly reason: 'letter-only' | 'row-without-scaling' }

/**
 * Coefficient d'un attribut dans une ligne de tableau. Ligne sans `scaling` : inconnu. Cellule absente : pas de scaling.
 * Cellule sans coefficient : inconnu, sauf si la lettre est aussi `null` (pas de scaling).
 * @param row Ligne lue.
 * @param a Attribut.
 * @returns Le coefficient lu.
 */
function coefOf(row: UpgradeLevel, a: WeaponAttributeKey): CoefRead {
  if (row.scaling === undefined) return { kind: 'unknown', reason: 'row-without-scaling' }
  const cell = row.scaling[a]
  if (cell === undefined) return { kind: 'none' }
  if (cell.coef !== null) return { kind: 'coef', value: cell.coef }
  return cell.grade === null ? { kind: 'none' } : { kind: 'unknown', reason: 'letter-only' }
}

/**
 * Interpolation linéaire entre deux niveaux documentés (calculs.md, point 2).
 * @param lo Niveau bas et sa valeur.
 * @param hi Niveau haut et sa valeur.
 * @param n Niveau choisi.
 * @returns La valeur interpolée.
 */
function lerp(lo: { n: number; v: number }, hi: { n: number; v: number }, n: number): number {
  return lo.v + ((hi.v - lo.v) * (n - lo.n)) / (hi.n - lo.n)
}

/**
 * Puissance d'attaque calculée (calculs.md, « Puissance d'attaque calculée (Estimation) »).
 * Mode `estimate` : base au niveau N (interpolée sinon), −40 % par type lié à un prérequis non atteint, bonus de scaling seulement si les
 * coefficients existent ; badge Estimation toujours. Mode `published` : valeur du tableau au niveau N si documentée, sinon non calculable.
 * @param w Arme.
 * @param affinity Affinité (clé de `upgrade.tables`, `Standard` par défaut).
 * @param level Niveau d'amélioration N.
 * @param attrs Attributs du profil.
 * @param hands Maniement choisi.
 * @param ctx Fichier de l'arme et configurations.
 * @returns Le détail par type et le total, ou la raison pour laquelle aucune valeur n'est calculable.
 */
export function attackPower(
  w: AttackWeapon,
  affinity: string,
  level: number,
  attrs: Attributes,
  hands: Hands,
  ctx: AttackPowerContext,
): AttackPowerResult {
  const cfg = ctx.cfg ?? ATTACK_POWER
  const thCfg = ctx.twoHanded ?? TWO_HANDED
  const u = w.derived.upgrade
  if (!Number.isInteger(level) || level < 0) return { unavailable: 'level-out-of-range' }
  if (u.reliability === 'not-upgradeable' && level > 0) return { unavailable: 'level-out-of-range' }
  if (u.maxLevel !== null && level > u.maxLevel) return { unavailable: 'level-out-of-range' }

  const table = w.upgrade.tables?.[affinity]
  const rows = table === undefined ? [] : levelRows(table)
  const inconsistent = w.derived.inconsistent.some((i) => i.field === 'upgrade.tables')
  const isStandardZero = level === 0 && affinity === cfg.defaultAffinity
  const zeroRow = rows.find((r) => r.n === 0) ?? null

  // Point 2 : à +0 en Standard, l'infobox fait foi si le tableau la contredit ou s'il n'y a pas de ligne +0.
  let sample: Sample
  if (isStandardZero && (zeroRow === null || inconsistent)) sample = { kind: 'infobox', zero: zeroRow }
  else if (table === undefined) return { unavailable: 'affinity-undocumented' }
  else {
    const exact = rows.find((r) => r.n === level)
    if (exact !== undefined) sample = { kind: 'exact', at: exact }
    else {
      const lo = [...rows].reverse().find((r) => r.n < level)
      const hi = rows.find((r) => r.n > level)
      if (lo === undefined || hi === undefined) return { unavailable: cfg.mode === 'published' ? 'published-value-missing' : 'level-undocumented' }
      if (cfg.mode === 'published') return { unavailable: 'published-value-missing' }
      sample = { kind: 'interp', lo, hi }
    }
  }

  const mode = twoHandMode(w, thCfg)
  // Point 6 : la courbe dépend de l'affinité de l'arme et s'applique à tous ses types de dégâts.
  const family = curveFamily(affinity, cfg)
  const bonusApplies = twoHandBonusApplies(mode, hands)
  const effective = {} as Record<WeaponAttributeKey, number>
  for (const a of WEAPON_ATTRIBUTE_KEYS) effective[a] = a === 'str' && bonusApplies ? twoHandedStrength(attrs.str, thCfg) : attrs[a]

  const components: ExplanationComponent[] = []
  const inputs: DataRef[] = []
  const limits: ExplanationLimit[] = []
  const addLimit = (l: ExplanationLimit): void => {
    if (!limits.some((x) => x.code === l.code && JSON.stringify(x.params) === JSON.stringify(l.params))) limits.push(l)
  }
  const rowField = (n: number): string => `upgrade.tables.${affinity}["+${n}"]`
  const tableReliability = inconsistent ? 'inconsistent' : 'wiki'
  if (inconsistent) addLimit({ code: 'table-inconsistent' })
  if (sample.kind === 'infobox') addLimit({ code: 'infobox-base' })
  if (mode === 'always') addLimit({ code: 'two-hand-always', params: { category: w.category } })
  if (mode === 'none' && hands === 'two') addLimit({ code: 'two-hand-no-stance' })

  /** Base d'un type au niveau choisi. */
  const baseOf = (t: DamageKey): number | 'missing' | 'unparsed' => {
    if (sample.kind === 'infobox') return w.attack_power[t]
    if (sample.kind === 'exact') return attackOf(sample.at.row, t, rows, w)
    const a = attackOf(sample.lo.row, t, rows, w)
    const b = attackOf(sample.hi.row, t, rows, w)
    if (typeof a !== 'number') return a
    if (typeof b !== 'number') return b
    return lerp({ n: sample.lo.n, v: a }, { n: sample.hi.n, v: b }, level)
  }

  /** Coefficient d'un attribut au niveau choisi. */
  const coefAt = (a: WeaponAttributeKey): CoefRead => {
    if (sample.kind === 'infobox') {
      if (sample.zero !== null) return coefOf(sample.zero.row, a)
      // Sans tableau : la lettre de l'infobox dit seulement si l'attribut fait varier l'arme (`null` = pas de scaling).
      return w.scaling[a] === null ? { kind: 'none' } : { kind: 'unknown', reason: 'letter-only' }
    }
    if (sample.kind === 'exact') return coefOf(sample.at.row, a)
    const lo = coefOf(sample.lo.row, a)
    const hi = coefOf(sample.hi.row, a)
    if (lo.kind === 'none' && hi.kind === 'none') return lo
    if (lo.kind === 'coef' && hi.kind === 'coef') {
      return { kind: 'coef', value: lerp({ n: sample.lo.n, v: lo.value }, { n: sample.hi.n, v: hi.value }, level), interpolated: true }
    }
    if (lo.kind === 'unknown') return lo
    if (hi.kind === 'unknown') return hi
    // Un niveau sans scaling et l'autre avec : incohérence du tableau, coefficient non déterminable.
    return { kind: 'unknown', reason: 'letter-only' }
  }

  const types: AttackTypeBreakdown[] = []
  const usedAttrs = new Set<WeaponAttributeKey>()
  let anyBonus = false

  for (const t of DAMAGE_KEYS) {
    const raw = baseOf(t)
    if (raw === 0) continue
    const baseInterpolated = sample.kind === 'interp' && typeof raw === 'number'
    if (sample.kind === 'infobox') inputs.push({ file: ctx.file, entry: w.id, field: `attack_power.${t}`, value: w.attack_power[t], reliability: 'wiki' })
    else if (sample.kind === 'exact') inputs.push({ file: ctx.file, entry: w.id, field: `${rowField(sample.at.n)}.attack.${t}`, value: typeof raw === 'number' ? raw : null, reliability: tableReliability })
    else {
      inputs.push({ file: ctx.file, entry: w.id, field: `${rowField(sample.lo.n)}.attack.${t}`, reliability: tableReliability })
      inputs.push({ file: ctx.file, entry: w.id, field: `${rowField(sample.hi.n)}.attack.${t}`, reliability: tableReliability })
    }

    if (typeof raw !== 'number') {
      addLimit({ code: raw === 'unparsed' ? 'attack-value-unparsed' : 'attack-type-missing', params: { type: t } })
      types.push({ type: t, base: null, baseInterpolated: false, coefs: {}, curve: {}, bonus: null, status: 'missing', value: null })
      components.push({ code: 'base', value: null, params: { type: t } })
      components.push({ code: 'attack-type', value: null, params: { type: t } })
      continue
    }
    const base = raw
    components.push({ code: 'base', value: base, params: { type: t } })
    if (baseInterpolated) addLimit({ code: 'base-interpolated', params: { from: sample.kind === 'interp' ? sample.lo.n : level, to: sample.kind === 'interp' ? sample.hi.n : level } })

    if (cfg.mode === 'published') {
      types.push({ type: t, base, baseInterpolated: false, coefs: {}, curve: {}, bonus: null, status: 'published', value: base })
      components.push({ code: 'attack-type', value: base, params: { type: t } })
      continue
    }

    // Point 4 : attributs qui font varier ce type.
    const attrsForType = [...(cfg.attributesByType[t] ?? []), ...(cfg.attributesByAffinity[affinity]?.[t] ?? [])]
    attrsForType.forEach((a) => usedAttrs.add(a))
    const push = (status: AttackTypeStatus, value: number, extra: Partial<AttackTypeBreakdown> = {}): void => {
      types.push({ type: t, base, baseInterpolated, coefs: {}, curve: {}, bonus: null, status, value, ...extra })
      components.push({ code: 'attack-type', value, params: { type: t } })
    }

    if (attrsForType.length === 0) {
      addLimit({ code: 'elemental-scaling-undocumented', params: { type: t } })
      const unmet = WEAPON_ATTRIBUTE_KEYS.filter((a) => w.requirements[a] > 0 && effective[a] < w.requirements[a])
      if (unmet.length > 0) addLimit({ code: 'requirement-effect-undocumented', params: { type: t } })
      push('undocumented', floorSafe(base))
      continue
    }

    // Point 5 : prérequis non atteint → base × 0,6, sans bonus.
    const unmet = attrsForType.filter((a) => w.requirements[a] > 0 && effective[a] < w.requirements[a])
    for (const a of unmet) inputs.push({ file: ctx.file, entry: w.id, field: `requirements.${a}`, value: w.requirements[a], reliability: 'wiki' })
    if (unmet.length > 0) {
      if ((cfg.penaltyExceptions[w.id] ?? []).includes(t)) {
        addLimit({ code: 'penalty-exception', params: { type: t } })
        push('exception', floorSafe(base))
        continue
      }
      addLimit({ code: 'requirement-not-met', params: { type: t, attrs: unmet.join(',') } })
      components.push({ code: 'requirement-penalty', value: cfg.requirementPenaltyFactor, params: { type: t } })
      push('penalty', floorSafe(base * cfg.requirementPenaltyFactor))
      continue
    }

    // Point 3 et 6 : coefficients et courbe ; un coefficient manquant rend le bonus de ce type non calculable.
    const coefs: Partial<Record<WeaponAttributeKey, number | null>> = {}
    const curve: Partial<Record<WeaponAttributeKey, number>> = {}
    let unknown = false
    let bonus = 0
    let scaled = false
    for (const a of attrsForType) {
      const c = coefAt(a)
      if (c.kind === 'none') continue
      if (sample.kind === 'exact') inputs.push({ file: ctx.file, entry: w.id, field: `${rowField(sample.at.n)}.scaling.${a}.coef`, value: c.kind === 'coef' ? c.value : null, reliability: c.kind === 'coef' ? tableReliability : 'null' })
      else if (sample.kind === 'infobox') inputs.push(sample.zero !== null
        ? { file: ctx.file, entry: w.id, field: `${rowField(0)}.scaling.${a}.coef`, value: c.kind === 'coef' ? c.value : null, reliability: c.kind === 'coef' ? tableReliability : 'null' }
        : { file: ctx.file, entry: w.id, field: `scaling.${a}`, value: w.scaling[a], reliability: 'wiki' })
      if (c.kind === 'unknown') {
        unknown = true
        if (c.reason === 'row-without-scaling') addLimit({ code: 'scaling-missing-at-level', params: { level } })
        coefs[a] = null
        components.push({ code: 'coef', value: null, params: { type: t, attr: a } })
        continue
      }
      if (c.interpolated === true) addLimit({ code: 'coef-interpolated' })
      const k = scalingCurve(effective[a], cfg, family)
      if (k.limit !== null) addLimit(k.limit)
      coefs[a] = c.value
      curve[a] = k.value
      bonus += (c.value * k.value) / 100
      scaled = true
      components.push({ code: 'coef', value: c.value, params: { type: t, attr: a } })
      components.push({ code: 'curve', value: k.value, params: { attr: a, points: effective[a] } })
    }
    if (unknown) {
      addLimit({ code: 'scaling-coef-missing', params: { type: t } })
      components.push({ code: 'scaling-bonus', value: null, params: { type: t } })
      push('no-coef', floorSafe(base), { coefs, curve })
      continue
    }
    if (!scaled) {
      push('no-scaling', floorSafe(base), { coefs, curve, bonus: 0 })
      continue
    }
    anyBonus = true
    components.push({ code: 'scaling-bonus', value: bonus, params: { type: t } })
    push('scaled', floorSafe(base * (1 + bonus)), { coefs, curve, bonus })
  }

  // Attributs à scaling que la méthode ne rattache à aucun type de dégâts : leur effet n'est pas compté.
  if (cfg.mode === 'estimate') {
    for (const a of WEAPON_ATTRIBUTE_KEYS) {
      if (usedAttrs.has(a)) continue
      const c = coefAt(a)
      if (c.kind === 'coef' || (c.kind === 'unknown' && c.reason === 'letter-only')) addLimit({ code: 'scaling-attribute-ignored', params: { attr: a } })
    }
  }

  // Un type de base non documentée rend le total `null`, jamais une somme partielle.
  const values = types.map((x) => x.value)
  const total = values.every((v): v is number => v !== null) ? values.reduce((s, v) => s + v, 0) : null
  const partial = types.some((x) => x.status === 'no-coef' || x.status === 'undocumented' || x.status === 'exception')
  components.push({ code: 'attack-total', value: total })
  if (cfg.mode === 'estimate') {
    limits.unshift({ code: 'estimate-method' })
    if (anyBonus) addLimit({ code: 'generic-curve' })
    if (anyBonus && family === 'nonPhysical') addLimit({ code: 'curve-non-physical' })
    inputs.push({ file: 'config', entry: 'attackPower', field: `curves.${family}`, value: affinity, reliability: 'wiki' })
  }

  return makeCalc<AttackBreakdown>(
    'attack-power',
    { mode: cfg.mode, affinity, level, hands, twoHandMode: mode, effective, types, total, partial },
    // calculs.md : la colonne Calculé porte toujours le badge Estimation en mode `estimate` ; le mode `published` ne rend que des valeurs du wiki.
    { estimate: cfg.mode === 'estimate' ? { confidence: 'medium' } : null, components, inputs, limits },
  )
}
