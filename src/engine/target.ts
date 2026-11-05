// Build cible : attributs cibles d'un archétype au niveau cible (`targetFor`) et poids du build (archétype ou poids automatiques `autoW`).
// Méthode : docs/design/ds/calculs.md, « Build cible » (D16) ; configuration : config/archetypes.ts.

import { ATTRIBUTE_KEYS, WEAPON_ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { AttributeKey, WeaponAttributeKey } from '../data/keys.ts'
import { ARCHETYPES, AUTO_WEIGHTS, TARGET_FLOOR, TEMPLATE_LEVEL, TEMPLATE_ORDER, isArchetypeKey } from './config/archetypes.ts'
import type { Archetype } from './config/archetypes.ts'
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN, LEVEL_OFFSET } from './level.ts'
import type { BuildWeights } from './origins.ts'
import { makeCalc, nullCalc } from './types.ts'
import type { Attributes, Calc, DataRef, ExplanationComponent, ExplanationLimit } from './types.ts'

/** Configuration du build cible (par défaut celle de config/archetypes.ts). */
export interface TargetConfig {
  readonly archetypes: Readonly<Record<string, Archetype>>
  readonly floor: readonly number[]
  readonly templateLevel: number
}

/** Configuration par défaut. */
export const TARGET_CONFIG: TargetConfig = { archetypes: ARCHETYPES, floor: TARGET_FLOOR, templateLevel: TEMPLATE_LEVEL }

/**
 * Répartition `targetFor(archétype, L)` (calculs.md, « Build cible ») : `S = L + 79`, `k = (S − Σ plancher) / (Σ gabarit − Σ plancher)`
 * (168 avec les valeurs du prototype) ; brute = plancher + (gabarit − plancher) × k ; parties entières, puis le reste distribué un point
 * chacun aux plus grandes parties fractionnaires (ex æquo dans l'ordre des attributs) ; bornes 1–99.
 * @param template Gabarit, ordre VIG, MND, END, STR, DEX, INT, FAI, ARC.
 * @param level Niveau cible.
 * @param floor Plancher, même ordre.
 * @returns Les huit attributs cibles, même ordre.
 */
export function distributeTarget(template: readonly number[], level: number, floor: readonly number[]): number[] {
  const sum = level + LEVEL_OFFSET
  const floorSum = floor.reduce((a, b) => a + b, 0)
  const templateSum = template.reduce((a, b) => a + b, 0)
  const k = (sum - floorSum) / (templateSum - floorSum)
  // Gabarit et plancher sont des n-uplets de huit valeurs (config/archetypes.ts) : le repli 0 ne sert qu'au typage strict des indices.
  const raw = template.map((t, i) => (floor[i] ?? 0) + (t - (floor[i] ?? 0)) * k)
  const base = raw.map((v) => Math.floor(v))
  const rest = sum - base.reduce((a, b) => a + b, 0)
  // Tri stable : à partie fractionnaire égale, l'ordre des attributs départage (comme le prototype).
  const order = raw.map((v, i) => ({ frac: v - Math.floor(v), i })).sort((a, b) => b.frac - a.frac)
  for (let j = 0; j < rest && j < order.length; j++) {
    const idx = order[j]!.i
    // `idx` est un indice de `raw`, donc de `base` (même longueur) : le repli 0 ne sert qu'au typage strict des indices.
    base[idx] = (base[idx] ?? 0) + 1
  }
  return base.map((v) => Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, v)))
}

/**
 * Attributs cibles d'un archétype au niveau cible (calculs.md, « Build cible »). Le gabarit est un choix de conception du prototype :
 * la valeur est « Calculé » (pas une estimation d'un fait du jeu), avec la limite `template-design-choice`.
 * @param archetype Identifiant d'archétype, ou `null` (aucun build cible : état vide du widget B).
 * @param targetLevel Niveau cible (1 à 713).
 * @param current Attributs du profil, pour signaler les attributs déjà au-delà de la cible ; `null` pour ne rien signaler.
 * @param cfg Configuration.
 * @returns Les attributs cibles ; `null` avec `no-archetype` ou `level-out-of-range`.
 */
export function targetAttributes(
  archetype: string | null,
  targetLevel: number,
  current: Attributes | null,
  cfg: TargetConfig = TARGET_CONFIG,
): Calc<Attributes> {
  const arch = archetype === null ? undefined : cfg.archetypes[archetype]
  if (arch === undefined) return nullCalc('target-attributes', { code: 'no-archetype' })
  if (!Number.isInteger(targetLevel) || targetLevel < 1) {
    return nullCalc('target-attributes', { code: 'level-out-of-range', params: { level: targetLevel } })
  }
  const values = distributeTarget(arch.template, targetLevel, cfg.floor)
  const out = {} as Record<AttributeKey, number>
  TEMPLATE_ORDER.forEach((k, i) => {
    out[k] = values[i] ?? ATTRIBUTE_MIN
  })
  const total = ATTRIBUTE_KEYS.reduce((s, k) => s + out[k], 0)
  const limits: ExplanationLimit[] = [{ code: 'template-design-choice' }]
  if (total !== targetLevel + LEVEL_OFFSET) limits.push({ code: 'target-capped', params: { level: targetLevel } })
  if (current !== null) {
    for (const k of ATTRIBUTE_KEYS) if (current[k] > out[k]) limits.push({ code: 'target-below-current', params: { attr: k } })
  }
  const components: ExplanationComponent[] = [
    { code: 'target-level', value: targetLevel },
    { code: 'attribute-sum', value: total },
    ...ATTRIBUTE_KEYS.map((k): ExplanationComponent => ({ code: 'target-attribute', value: out[k], params: { attr: k } })),
  ]
  const inputs: DataRef[] = [
    { file: 'config', entry: 'archetypes', field: `ARCHETYPES.${arch.id}.template`, value: arch.template.join(', '), reliability: 'calculated' },
    { file: 'config', entry: 'archetypes', field: 'TARGET_FLOOR', value: cfg.floor.join(', '), reliability: 'calculated' },
  ]
  return makeCalc<Attributes>('target-attributes', out, { components, inputs, limits })
}

/**
 * Poids automatiques sans archétype (`autoW`, calculs.md, « Build cible ») : chaque attribut d'arme au-dessus de 12 pèse `valeur − 10` ;
 * sans aucun, STR = 1 ; puis division par le plus grand poids, arrondie à deux décimales (demi vers le haut).
 * @param attrs Attributs du profil.
 * @returns Les poids.
 */
export function autoWeights(attrs: Attributes): BuildWeights {
  const w: Partial<Record<WeaponAttributeKey, number>> = {}
  for (const k of WEAPON_ATTRIBUTE_KEYS) if (attrs[k] > AUTO_WEIGHTS.threshold) w[k] = attrs[k] - AUTO_WEIGHTS.offset
  if (Object.keys(w).length === 0) return { ...AUTO_WEIGHTS.fallback }
  const max = Math.max(...Object.values(w))
  const scale = 10 ** AUTO_WEIGHTS.decimals
  for (const [k, v] of Object.entries(w) as [WeaponAttributeKey, number][]) w[k] = Math.round((v / max) * scale) / scale
  return w
}

/** Poids du build et leur provenance. */
export interface BuildWeightsResult {
  readonly weights: BuildWeights
  readonly source: 'archetype' | 'auto'
}

/**
 * Poids du build (score, composante 1 ; classement des origines) : ceux de l'archétype choisi, sinon les poids automatiques.
 * @param archetype Identifiant d'archétype ou `null` ; un identifiant inconnu est traité comme « aucun ».
 * @param attrs Attributs du profil.
 * @returns Les poids et leur provenance.
 */
export function buildWeights(archetype: string | null, attrs: Attributes): BuildWeightsResult {
  if (archetype !== null && isArchetypeKey(archetype)) return { weights: ARCHETYPES[archetype].weights, source: 'archetype' }
  return { weights: autoWeights(attrs), source: 'auto' }
}
