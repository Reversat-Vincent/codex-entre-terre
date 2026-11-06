// Niveau recommandé d'une rencontre de boss (méthode M3 : moyenne du palier de zone M1 et des runes NG M2), niveau d'entrée du DLC
// et bénédiction de l'Arbre-Ombre recommandée par sous-zone ; réexporte la préparation et la jauge (`readiness.ts`).
// Méthode : docs/design/ds/calculs.md, « Niveau recommandé d'un boss et préparation » (D14, D18) ; configuration : config/bossLevel.ts.

import type { CalcTables } from '../data/types/tables.ts'
import { BOSS_LEVEL } from './config/bossLevel.ts'
import type { BossLevelConfig, TierBasis } from './config/bossLevel.ts'
import { DLC_SOURCE, REGION_PARENT } from './config/stages.ts'
import type { DlcZone } from './config/stages.ts'
import type { EncounterIndex, EncounterRef } from './encounters.ts'
import { dlcZoneOfRegion, dlcZoneRank, mostPrecise } from './stage.ts'
import { makeCalc, nullCalc, ownValue } from './types.ts'
import type { Calc, DataRef, Estimate, ExplanationComponent, ExplanationLimit } from './types.ts'

export { gaugeMax, readiness } from './readiness.ts'
export type { ReadinessId } from './readiness.ts'

/** Le niveau recommandé est toujours une estimation (le wiki n'en publie aucun) : confiance moyenne. */
const LEVEL_ESTIMATE: Estimate = { confidence: 'medium' }

/** Marge des arrondis à l'entier le plus proche (0,5 vers le haut) sur des valeurs interpolées en virgule flottante. */
const ROUND_EPSILON = 1e-9

/**
 * Arrondi à l'entier le plus proche, 0,5 vers le haut (calculs.md, M1 et M3).
 * @param x Valeur.
 * @returns L'entier arrondi.
 */
function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + ROUND_EPSILON)
}

/** Ligne de la table de bénédiction : niveau et total de fragments requis. */
export interface BlessingRow {
  readonly level: number
  readonly total: number
}

/** Bénédiction recommandée d'un boss du DLC. */
export interface BlessingRecommendation {
  /** Sous-zone de la rencontre ; `null` pour une rencontre DLC non localisée. */
  readonly zone: DlcZone | null
  /** Fragments recommandés : `arrondi(13 × chemin / 33)`. */
  readonly fragments: number | null
  /** Niveau de bénédiction : plus haut niveau dont le total requis est ≤ aux fragments ; `null` sans table ou sans sous-zone. */
  readonly level: number | null
  /** Fragments du chemin principal jusqu'à la sous-zone. */
  readonly pathFragments: number | null
  /** Niveau atteignable avec tous les fragments du chemin (maximum affiché dans le « Pourquoi ? »). */
  readonly maxLevel: number | null
}

/** Niveau recommandé d'une rencontre. */
export interface BossLevel {
  readonly level: number
  /** M1 (palier de zone) ; `null` sans palier. */
  readonly m1: number | null
  /** M2 (runes NG) ; `null` sans runes ou runes exclues. */
  readonly m2: number | null
  /** Palier retenu pour M1. */
  readonly tier: number | null
  /** Vrai si le niveau est le niveau d'entrée du DLC. */
  readonly dlcEntry: boolean
  /** Bénédiction recommandée (boss du DLC seulement). */
  readonly blessing: BlessingRecommendation | null
}

/** Contexte du niveau recommandé, construit une fois par jeu de données. */
export interface BossLevelContext {
  readonly encounters: EncounterIndex
  readonly tables: CalcTables
  /** Table de bénédiction lue dans `tables.scadutreeBlessing` ; `null` si elle est absente (bénédiction non calculée). */
  readonly blessing: readonly BlessingRow[] | null
  readonly cfg: BossLevelConfig
  /** Niveau d'entrée du DLC (calculé par `bossLevelContext`). */
  readonly dlcEntry: Calc<number>
}

/**
 * Niveau d'un palier par interpolation linéaire entre les ancres (calculs.md, M1), arrondi à l'entier le plus proche ; au-delà de la
 * dernière ancre, la pente du dernier segment est prolongée ; en deçà de la première, la pente du premier segment.
 * @param tier Palier (T1 à T21).
 * @param cfg Configuration (ancres).
 * @returns Le niveau M1.
 */
export function tierLevel(tier: number, cfg: BossLevelConfig = BOSS_LEVEL): number {
  const a = cfg.anchors
  if (a.length < 2) throw new Error('bossLevel : deux ancres au moins')
  let lo = a[0]!
  let hi = a[1]!
  for (let i = 1; i < a.length; i++) {
    lo = a[i - 1]!
    hi = a[i]!
    if (tier <= hi.tier) break
  }
  return roundHalfUp(lo.level + ((hi.level - lo.level) * (tier - lo.tier)) / (hi.tier - lo.tier))
}

/** Palier d'une rencontre et sa provenance. */
export interface TierResolution {
  readonly tier: number
  readonly basis: TierBasis
  /** Région qui donne le palier, `null` si le palier vient de la configuration de la rencontre. */
  readonly region: string | null
}

/**
 * Palier d'une rencontre (calculs.md, M1) : palier fixé pour la rencontre, sinon palier de la zone la plus précise de `regions`
 * (puis de sa région parente) ; le plus bas quand plusieurs régions en ont un.
 * @param ref Rencontre.
 * @param cfg Configuration.
 * @returns Le palier, ou `null` si aucune zone n'a de palier (DLC, Deeproot Depths…).
 */
export function encounterTier(ref: EncounterRef, cfg: BossLevelConfig = BOSS_LEVEL): TierResolution | null {
  const fixed = ownValue(cfg.encounterTier, ref.key)
  if (fixed !== undefined) return { ...fixed, region: null }
  let best: TierResolution | null = null
  for (const region of mostPrecise(ref.encounter?.regions ?? [])) {
    let cur: string | undefined = region
    let viaParent = false
    while (cur !== undefined) {
      const zone = ownValue(cfg.zoneTier, cur)
      if (zone !== undefined) {
        if (best === null || zone.tier < best.tier) best = { tier: zone.tier, basis: viaParent ? 'parent' : zone.basis, region: cur }
        break
      }
      cur = ownValue(REGION_PARENT, cur)
      viaParent = true
    }
  }
  return best
}

/**
 * Méthode M1 : niveau du palier de zone de la rencontre (calculs.md, « M1 : palier de zone du wiki »).
 * @param ref Rencontre.
 * @param cfg Configuration.
 * @returns Le niveau, ou `null` avec `tier-missing`.
 */
export function levelFromTier(ref: EncounterRef, cfg: BossLevelConfig = BOSS_LEVEL): Calc<number> {
  const t = encounterTier(ref, cfg)
  if (t === null) return nullCalc('boss-level', { code: 'tier-missing' }, { estimate: null })
  const level = tierLevel(t.tier, cfg)
  return makeCalc('boss-level', level, {
    estimate: LEVEL_ESTIMATE,
    components: [{ code: 'zone-tier', value: t.tier, params: { basis: t.basis, region: t.region ?? '' } }, { code: 'm1', value: level }],
    inputs: [{ file: 'config', entry: 'bossLevel', field: t.region === null ? `encounterTier["${ref.key}"]` : `zoneTier["${t.region}"]`, value: t.tier, reliability: t.basis === 'wiki' ? 'wiki' : 'deduced' }],
  })
}

/**
 * Méthode M2 : plus petit niveau L tel que `coût(L) × runesAncre ≥ runes × coût(niveauAncre)` (calculs.md, « M2 : runes NG »),
 * en arithmétique entière, les coûts étant lus dans la table 1–713. Runes = première valeur de `runes_values` (combat principal).
 * @param ref Rencontre.
 * @param tables Tables de calcul (`levelCosts`).
 * @param cfg Configuration (calage, rencontres exclues).
 * @returns Le niveau, ou `null` avec `runes-missing`, `runes-excluded` ou `runes-beyond-table`.
 */
export function levelFromRunes(ref: EncounterRef, tables: CalcTables, cfg: BossLevelConfig = BOSS_LEVEL): Calc<number> {
  if (cfg.excludedRunes.includes(ref.key)) return nullCalc('boss-level', { code: 'runes-excluded' })
  const runes = ref.encounter?.runes_values[0]
  const input: DataRef = { file: 'bosses', entry: ref.key, field: 'runes_values[0]', value: runes ?? null, reliability: runes === undefined ? 'null' : 'wiki' }
  if (runes === undefined || runes <= 0) return nullCalc('boss-level', { code: 'runes-missing' }, { inputs: [input] })
  const rows = tables.levelCosts.rows
  const anchorCost = rows.find((r) => r.level === cfg.runeAnchor.level)?.runesToNext
  if (anchorCost === undefined) return nullCalc('boss-level', { code: 'level-out-of-table', params: { level: cfg.runeAnchor.level } }, { inputs: [input] })
  const found = rows.find((r) => r.runesToNext * cfg.runeAnchor.runes >= runes * anchorCost)
  if (found === undefined) return nullCalc('boss-level', { code: 'runes-beyond-table' }, { inputs: [input] })
  return makeCalc('boss-level', found.level, {
    estimate: LEVEL_ESTIMATE,
    components: [
      { code: 'runes', value: runes },
      { code: 'rune-anchor', value: cfg.runeAnchor.runes, params: { level: cfg.runeAnchor.level, cost: anchorCost } },
      { code: 'm2', value: found.level },
    ],
    inputs: [input, { file: 'tables', entry: 'levelCosts', field: `rows[level=${found.level}].runesToNext`, value: found.runesToNext, reliability: 'wiki' }],
  })
}

/**
 * Méthode M3 (calculs.md, « M3 : hybride ») : `arrondi((M1 + M2) / 2)`, 0,5 vers le haut ; l'une seule si l'autre manque ; « Non estimé » sinon.
 * @param ref Rencontre.
 * @param tables Tables de calcul.
 * @param cfg Configuration.
 * @returns Le niveau et ses composantes ; `null` avec `boss-not-estimated` sans M1 ni M2.
 */
export function hybridLevel(ref: EncounterRef, tables: CalcTables, cfg: BossLevelConfig = BOSS_LEVEL): Calc<BossLevel> {
  const m1 = levelFromTier(ref, cfg)
  const m2 = levelFromRunes(ref, tables, cfg)
  const components = [...m1.explanation.components, ...m2.explanation.components]
  const inputs = [...m1.explanation.inputs, ...m2.explanation.inputs]
  const limits: ExplanationLimit[] = [...m1.explanation.limits, ...m2.explanation.limits, { code: 'hp-not-used' }]
  const a = m1.value
  const b = m2.value
  const level = a !== null && b !== null ? roundHalfUp((a + b) / 2) : (a ?? b)
  if (level === null) return nullCalc('boss-level', { code: 'boss-not-estimated' }, { components, inputs, limits })
  components.push({ code: 'm3', value: level })
  const tier = encounterTier(ref, cfg)?.tier ?? null
  return makeCalc<BossLevel>('boss-level', { level, m1: a, m2: b, tier, dlcEntry: false, blessing: null }, { estimate: LEVEL_ESTIMATE, components, inputs, limits })
}

/**
 * Table de bénédiction lue dans `tables.scadutreeBlessing` (niveau → total cumulé de fragments requis).
 * @param tables Tables de calcul, ou `undefined` si le fichier `tables` n'est pas chargé.
 * @returns Les lignes triées par niveau, ou `null` si la table est absente, vide ou illisible.
 */
export function readBlessingTable(tables: Pick<CalcTables, 'scadutreeBlessing'> | undefined): BlessingRow[] | null {
  const source = tables?.scadutreeBlessing?.rows
  if (source === undefined || source.length === 0) return null
  const rows: BlessingRow[] = []
  for (const r of source) {
    if (!Number.isInteger(r.level) || !Number.isInteger(r.totalFragments)) return null
    rows.push({ level: r.level, total: r.totalFragments })
  }
  return rows.sort((x, y) => x.level - y.level)
}

/**
 * Niveau de bénédiction atteint avec un nombre de fragments (D18) : plus haut niveau dont le total requis est ≤ aux fragments.
 * @param fragments Fragments.
 * @param rows Table de bénédiction.
 * @returns Le niveau (0 au moins si la table commence à 0).
 */
export function blessingLevelFor(fragments: number, rows: readonly BlessingRow[]): number | null {
  let best: number | null = null
  for (const r of rows) if (r.total <= fragments && (best === null || r.level > best)) best = r.level
  return best
}

/**
 * Sous-zone DLC d'une rencontre : la plus précoce de ses régions les plus précises.
 * @param ref Rencontre.
 * @returns La sous-zone, ou `null`.
 */
export function encounterDlcZone(ref: EncounterRef): DlcZone | null {
  let best: DlcZone | null = null
  for (const r of mostPrecise(ref.encounter?.regions ?? [])) {
    const z = dlcZoneOfRegion(r)
    if (z !== null && (best === null || dlcZoneRank(z) < dlcZoneRank(best))) best = z
  }
  return best
}

/**
 * Bénédiction recommandée (calculs.md, « Boss du DLC », méthode B2) : `arrondi(13 × fragments du chemin / 33)` puis niveau de la table.
 * @param zone Sous-zone de la rencontre.
 * @param rows Table de bénédiction, ou `null` si elle n'est pas chargée.
 * @param cfg Configuration.
 * @returns La recommandation (valeurs `null` quand la sous-zone ou la table manque).
 */
export function recommendedBlessing(zone: DlcZone | null, rows: readonly BlessingRow[] | null, cfg: BossLevelConfig = BOSS_LEVEL): BlessingRecommendation {
  if (zone === null) return { zone, fragments: null, level: null, pathFragments: null, maxLevel: null }
  const path = cfg.blessing.pathFragments[zone]
  const fragments = roundHalfUp((cfg.blessing.anchor.fragments * path) / cfg.blessing.anchor.pathFragments)
  return {
    zone,
    fragments,
    pathFragments: path,
    level: rows === null ? null : blessingLevelFor(fragments, rows),
    maxLevel: rows === null ? null : blessingLevelFor(path, rows),
  }
}

/**
 * Niveau d'entrée du DLC (calculs.md, « Boss du DLC ») : le plus haut des M3 des rencontres qui ouvrent le DLC (Starscourge Radahn, Mohg).
 * @param encounters Index des rencontres.
 * @param tables Tables de calcul.
 * @param cfg Configuration.
 * @returns Le niveau, ou `null` si aucune des rencontres n'est estimable.
 */
export function dlcEntryLevel(encounters: EncounterIndex, tables: CalcTables, cfg: BossLevelConfig = BOSS_LEVEL): Calc<number> {
  const components: ExplanationComponent[] = []
  const inputs: DataRef[] = []
  let best: number | null = null
  for (const key of cfg.dlcEntryFrom) {
    const ref = encounters.byKey.get(key)
    const m3 = ref === undefined ? null : hybridLevel(ref, tables, cfg)
    const v = m3?.value?.level ?? null
    components.push({ code: 'dlc-entry-source', value: v, params: { encounter: key } })
    inputs.push({ file: 'bosses', entry: key, field: 'encounters[]', value: v, reliability: v === null ? 'null' : 'calculated' })
    if (v !== null && (best === null || v > best)) best = v
  }
  if (best === null) return nullCalc('boss-level', { code: 'boss-not-estimated' }, { components, inputs })
  return makeCalc('boss-level', best, { estimate: LEVEL_ESTIMATE, components: [...components, { code: 'dlc-entry-level', value: best }], inputs })
}

/**
 * Contexte du niveau recommandé : index, tables, table de bénédiction et niveau d'entrée du DLC calculé une fois.
 * @param encounters Index des rencontres.
 * @param tables Tables de calcul.
 * @param blessing Table de bénédiction (`readBlessingTable`), ou `null`.
 * @param cfg Configuration.
 * @returns Le contexte.
 */
export function bossLevelContext(
  encounters: EncounterIndex,
  tables: CalcTables,
  blessing: readonly BlessingRow[] | null,
  cfg: BossLevelConfig = BOSS_LEVEL,
): BossLevelContext {
  return { encounters, tables, blessing, cfg, dlcEntry: dlcEntryLevel(encounters, tables, cfg) }
}

/**
 * Niveau recommandé d'une rencontre (calculs.md, « Niveau recommandé d'un boss et préparation ») : M3 pour le jeu de base ;
 * pour une rencontre du DLC, niveau d'entrée du DLC et bénédiction recommandée de sa sous-zone. Les PV n'entrent jamais dans le calcul.
 * @param key Clé de la rencontre (`bossId/encounterId`, ou `bossId` d'une page sans rencontre).
 * @param ctx Contexte (`bossLevelContext`).
 * @returns Le niveau (estimation) ; `null` avec `boss-not-estimated` si la rencontre manque ou n'a ni palier ni runes.
 */
export function recommendedLevel(key: string, ctx: BossLevelContext): Calc<BossLevel> {
  const ref = ctx.encounters.byKey.get(key)
  if (ref === undefined || ref.encounter === null) {
    return nullCalc('boss-level', { code: 'boss-not-estimated' }, { inputs: [{ file: 'bosses', entry: key, field: 'encounters', value: null, reliability: 'null' }] })
  }
  if (ref.encounter.source !== DLC_SOURCE) return hybridLevel(ref, ctx.tables, ctx.cfg)

  const zone = encounterDlcZone(ref)
  const blessing = recommendedBlessing(zone, ctx.blessing, ctx.cfg)
  const limits: ExplanationLimit[] = [{ code: 'dlc-entry-level-used' }, { code: 'hp-not-used' }]
  if (zone === null) limits.push({ code: 'dlc-unlocated' })
  if (ctx.blessing === null) limits.push({ code: 'blessing-table-unavailable' })
  const components: ExplanationComponent[] = [
    ...ctx.dlcEntry.explanation.components,
    { code: 'blessing-fragments', value: blessing.fragments, params: { zone: zone ?? '', path: blessing.pathFragments ?? '' } },
    { code: 'blessing-level', value: blessing.level },
    { code: 'blessing-max-level', value: blessing.maxLevel },
  ]
  const inputs: DataRef[] = [
    ...ctx.dlcEntry.explanation.inputs,
    { file: 'bosses', entry: key, field: 'encounters[].regions', value: ref.encounter.regions.join(', '), reliability: 'wiki' },
  ]
  if (ctx.blessing !== null) {
    inputs.push({ file: 'tables', entry: 'scadutreeBlessing', field: 'rows[].totalFragments', reliability: 'wiki' })
  }
  const level = ctx.dlcEntry.value
  if (level === null) return nullCalc('boss-level', { code: 'boss-not-estimated' }, { components, inputs, limits })
  return makeCalc<BossLevel>('boss-level', { level, m1: null, m2: null, tier: null, dlcEntry: true, blessing }, {
    estimate: LEVEL_ESTIMATE,
    components,
    inputs,
    limits,
  })
}
