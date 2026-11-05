// Lecture des faiblesses d'une rencontre : types de dégâts les moins absorbés, immunités aux statuts, bande de la matrice des faiblesses,
// armes candidates qui exploitent ces faiblesses (fiche boss) et lignes de la matrice des faiblesses (widget D1).
// Les trois lectures de données suivent le README `docs/design/ds/components/AbsorptionHeatmap/README.md` ; la sélection d'armes suit
// docs/design/ds/calculs.md, « Armes efficaces contre une rencontre » (configuration : config/weights.ts, `WEAKNESS_WEAPONS`).

import type { EntityRef } from '../data/datasets.ts'
import { NEGATION_KEYS, STATUS_KEYS } from '../data/keys.ts'
import type { NegationKey, StatusKey } from '../data/keys.ts'
import type { BossEntry, Encounter } from '../data/types/bosses.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { WEAKNESS_WEAPONS } from './config/weights.ts'
import type { EncounterIndex, EncounterRef } from './encounters.ts'
import type { RequirementCheck } from './requirements.ts'
import { byScore } from './score.ts'
import type { ScoredWeapon, WeaponScore } from './score.ts'
import type { TimelineBossView, TimelineView } from './timeline.ts'
import { makeCalc, mergeEstimates, nullCalc } from './types.ts'
import type { Calc, DataRef, ExplanationComponent } from './types.ts'

/** Bande de couleur d'une absorption (classes `h-*` d'AbsorptionHeatmap) ; `null` = absorption non documentée (`h-null`). */
export type AbsorptionBand = 'w2' | 'w1' | 'n' | 'r1' | 'r2' | 'r3' | 'null'

/**
 * Bornes hautes incluses des bandes, de la plus forte faiblesse à la plus forte résistance (README AbsorptionHeatmap) :
 * `h-w2` ≤ −10, `h-w1` −9 à 5, `h-n` 6 à 15, `h-r1` 16 à 30, `h-r2` 31 à 50, `h-r3` > 50.
 */
export const ABSORPTION_BANDS: readonly { readonly band: Exclude<AbsorptionBand, 'null' | 'r3'>; readonly max: number }[] = [
  { band: 'w2', max: -10 },
  { band: 'w1', max: 5 },
  { band: 'n', max: 15 },
  { band: 'r1', max: 30 },
  { band: 'r2', max: 50 },
]

/**
 * Bande d'une absorption (README AbsorptionHeatmap). Une valeur non entière entre deux bornes va dans la bande supérieure (−9,5 → `w1`).
 * @param v Absorption en %, négative pour une faiblesse ; `null` si non documentée.
 * @returns La bande, ou `null` pour une valeur non documentée.
 */
export function absorptionBand(v: number | null | undefined): AbsorptionBand {
  if (v === null || v === undefined || Number.isNaN(v)) return 'null'
  for (const b of ABSORPTION_BANDS) if (v <= b.max) return b.band
  return 'r3'
}

/** Absorption d'un type de dégâts. */
export interface DamageAbsorption {
  readonly type: NegationKey
  readonly value: number
}

/**
 * Types de dégâts les moins absorbés par une rencontre (absorption croissante ; ex æquo dans l'ordre de `NEGATION_KEYS`).
 * @param enc Rencontre (`damage_negation_percent`).
 * @param n Nombre de types rendus.
 * @returns Les `n` types les moins absorbés, ou `null` si l'absorption n'est pas documentée (aucune suggestion d'arme dans ce cas).
 */
export function bestDamageTypes(enc: Pick<Encounter, 'damage_negation_percent'>, n: number): DamageAbsorption[] | null {
  const neg = enc.damage_negation_percent
  if (neg === undefined) return null
  return NEGATION_KEYS.map((type) => ({ type, value: neg[type] }))
    .sort((a, b) => a.value - b.value || NEGATION_KEYS.indexOf(a.type) - NEGATION_KEYS.indexOf(b.type))
    .slice(0, Math.max(0, n))
}

/**
 * Statuts auxquels une rencontre est immunisée : valeur exactement `"Immune"` (docs/architecture.md § 3.4).
 * @param enc Rencontre (`status_resistance`).
 * @returns Les statuts immunisés dans l'ordre de `STATUS_KEYS`, ou `null` si les résistances ne sont pas documentées.
 */
export function immunities(enc: Pick<Encounter, 'status_resistance'>): StatusKey[] | null {
  const res = enc.status_resistance
  if (res === undefined) return null
  return STATUS_KEYS.filter((k) => res[k] === 'Immune')
}

/** Types d'absorption physiques, écrits avec une majuscule dans `attack_type` des armes (`Standard`, `Strike`, `Slash`, `Pierce`). */
const PHYSICAL_NEGATION_KEYS: readonly NegationKey[] = ['standard', 'strike', 'slash', 'pierce']

/** Types d'absorption élémentaires, mêmes clés que `attack_power`. */
const ELEMENTAL_NEGATION_KEYS = ['magic', 'fire', 'lightning', 'holy'] as const

/**
 * Types de dégâts d'une arme dans les clés d'absorption des boss (calculs.md, « Armes efficaces contre une rencontre ») : les types physiques
 * de `attack_type` si l'attaque physique à +0 est non nulle, et chaque type élémentaire dont l'attaque à +0 est non nulle.
 * @param w Arme (`attack_power`, `attack_type`).
 * @returns Les types, dans l'ordre de `NEGATION_KEYS` ; un type physique absent de `attack_type` n'est pas supposé.
 */
export function weaponDamageTypes(w: Pick<WeaponEntry, 'attack_power' | 'attack_type'>): NegationKey[] {
  const physical = w.attack_power.physical > 0 ? w.attack_type.map((t) => t.toLowerCase()) : []
  return NEGATION_KEYS.filter((k) =>
    PHYSICAL_NEGATION_KEYS.includes(k) ? physical.includes(k) : (ELEMENTAL_NEGATION_KEYS as readonly string[]).includes(k) && w.attack_power[k as (typeof ELEMENTAL_NEGATION_KEYS)[number]] > 0,
  )
}

/** Arme proposée contre une rencontre (forme lue par la fiche boss, `BossWeaponSuggestion`). */
export interface WeaknessWeapon {
  readonly ref: EntityRef
  readonly name: string
  /** Type de dégâts de l'arme qui exploite la faiblesse (le moins absorbé de ceux qu'elle inflige). */
  readonly damage: NegationKey
  /** Absorption de la rencontre pour ce type, en %. */
  readonly absorption: number
  /** Attaque de l'arme à +0 pour ce type (attaque physique pour un type physique) ; `null` si non documentée. */
  readonly attack: number | null
  /** Prérequis comparés au profil (maniement des critères). */
  readonly requirements: readonly RequirementCheck[]
  /** Score de recommandation de l'arme (ordre de la liste). */
  readonly score: number | null
}

/**
 * Armes candidates efficaces contre une rencontre (calculs.md, « Armes efficaces contre une rencontre ») : parmi les armes évaluées pour
 * les critères courants, visibles et classées (D18 : une arme « Non classé » n'a pas de score et reste hors des suggestions), celles qui
 * infligent l'un des `bestTypes` types les moins absorbés (`bestDamageTypes`) ; triées par rang de ce type, puis par score ; `max` au plus.
 * @param ref Rencontre trouvée dans l'index, ou `undefined`.
 * @param scored Armes évaluées par le store `analysis` (scores définitifs).
 * @param cfg Nombre de types retenus et d'armes proposées.
 * @returns La liste ; vide avec la limite `absorption-undocumented` si l'absorption n'est pas documentée (Mohg) ; `null` avec
 * `encounter-missing` si la rencontre n'existe pas. Hérite de l'estimation des scores des armes retenues.
 */
export function weaponsAgainst(
  ref: EncounterRef | undefined,
  scored: readonly ScoredWeapon[],
  cfg: { readonly bestTypes: number; readonly max: number } = WEAKNESS_WEAPONS,
): Calc<WeaknessWeapon[]> {
  if (ref === undefined || ref.encounter === null) {
    return nullCalc('weapon-score', { code: 'encounter-missing', params: { encounter: ref?.key ?? '' } })
  }
  const best = bestDamageTypes(ref.encounter, cfg.bestTypes)
  const inputs: DataRef[] = [{ file: 'bosses', entry: ref.key, field: 'encounters[].damage_negation_percent', value: best === null ? null : 'documented', reliability: best === null ? 'null' : 'wiki' }]
  if (best === null) return makeCalc('weapon-score', [], { inputs, limits: [{ code: 'absorption-undocumented', params: { encounter: ref.key } }] })

  const rank = (t: NegationKey): number => best.findIndex((b) => b.type === t)
  const matched: { weapon: ScoredWeapon; score: WeaponScore; damage: NegationKey; rank: number }[] = []
  for (const s of scored) {
    const score = s.score.value
    if (s.hidden !== null || score === null || score.total === null) continue
    const hit = weaponDamageTypes(s.candidate.weapon)
      .map((t) => ({ t, r: rank(t) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r)[0]
    if (hit !== undefined) matched.push({ weapon: s, score, damage: hit.t, rank: hit.r })
  }
  matched.sort((a, b) => a.rank - b.rank || byScore(a.weapon, b.weapon))
  const kept = matched.slice(0, Math.max(0, cfg.max))

  const value = kept.map(({ weapon, score, damage, rank: r }): WeaknessWeapon => {
    const w = weapon.candidate.weapon
    const ap = w.attack_power
    return {
      ref: weapon.candidate.ref,
      name: w.name,
      damage,
      absorption: best[r]!.value,
      attack: PHYSICAL_NEGATION_KEYS.includes(damage) ? ap.physical : ap[damage as (typeof ELEMENTAL_NEGATION_KEYS)[number]],
      requirements: score.requirements,
      score: score.total,
    }
  })
  const components: ExplanationComponent[] = best.map((b) => ({ code: 'weakness-absorption', value: b.value, params: { type: b.type } }))
  for (const k of kept) inputs.push({ file: k.weapon.candidate.file, entry: k.weapon.candidate.weapon.id, field: 'attack_power, attack_type', reliability: 'wiki' })
  return makeCalc('weapon-score', value, {
    estimate: mergeEstimates(...kept.map((k) => k.weapon.score.estimate)),
    components,
    inputs,
    limits: [{ code: 'weakness-weapons-base-values' }],
  })
}

/**
 * Ligne de la matrice des faiblesses (forme de `HeatmapRow` de `CxAbsorptionHeatmap`, sans l'adresse de la fiche : le moteur ne connaît
 * pas le routeur ; l'interface la construit avec `bossId` et `encounterId`, pour ouvrir la fiche sur la rencontre par `?rencontre=`).
 */
export interface WeaknessRow {
  /** Identifiant unique de la ligne : nœud de la frise (tableau de bord) ou clé de rencontre (plein écran). */
  readonly id: string
  /** Nom de la rencontre, en anglais comme dans les données. */
  readonly name: string
  /** Lieu de la rencontre ; absent si `location` vaut `null`. */
  readonly subtitle?: string
  readonly bossId: string
  /** Identifiant de la rencontre dans sa page (partie de la clé après `/`). */
  readonly encounterId: string
  /** Rencontre vaincue : ligne atténuée. */
  readonly done: boolean
  /** Absorption en % par type (toujours documentée : une rencontre sans absorption n'est pas une ligne). */
  readonly negation: Readonly<Record<NegationKey, number>>
  /** Statuts immunisés (`immunities`), `null` si les résistances ne sont pas documentées. */
  readonly immunities: readonly StatusKey[] | null
}

/** Lignes de la matrice et nombre de boss ou de rencontres examinés (avec ou sans données d'absorption). */
export interface WeaknessRows {
  readonly rows: readonly WeaknessRow[]
  readonly total: number
}

/**
 * Ligne d'une rencontre, si son absorption est documentée (lecture de données, sans calcul).
 * @param id Identifiant de la ligne.
 * @param bossId Page de boss.
 * @param encounter Rencontre.
 * @param encounterId Identifiant de la rencontre dans sa page.
 * @param done Rencontre vaincue.
 * @returns La ligne, ou `null` sans `damage_negation_percent`.
 */
function weaknessRowOf(id: string, bossId: string, encounter: Encounter, encounterId: string, done: boolean): WeaknessRow | null {
  const negation = encounter.damage_negation_percent
  if (negation === undefined) return null
  return {
    id,
    name: encounter.name,
    ...(encounter.location === null ? {} : { subtitle: encounter.location }),
    bossId,
    encounterId,
    done,
    negation,
    immunities: immunities(encounter),
  }
}

/**
 * Boss de la frise dans l'ordre de lecture : prérequis boss avant leur nœud, puis la voie DLC si elle est activée, sans doublon
 * (les boss qui ouvrent le DLC sont déjà des nœuds de l'histoire).
 * @param timeline Frise.
 * @returns Les boss à examiner.
 */
function timelineBossesInOrder(timeline: TimelineView): TimelineBossView[] {
  const out: TimelineBossView[] = []
  const push = (node: TimelineBossView): void => {
    if (!out.some((o) => o.id === node.id)) out.push(node)
  }
  for (const step of timeline.steps) {
    for (const node of step.nodes) {
      for (const prereq of node.prereqs) if (prereq.kind === 'boss') push(prereq.node)
      push(node)
    }
  }
  if (timeline.dlc.enabled) for (const node of timeline.dlc.nodes) push(node)
  return out
}

/**
 * Lignes de la matrice du tableau de bord (calculs.md, « Frise des boss » : seuls les nœuds dont l'absorption est documentée l'affichent,
 * 11 sur 21) : rencontre `levelKey` de chaque boss de la frise, dans l'ordre de la frise ; un boss vaincu est atténué.
 * @param timeline Frise courante.
 * @param index Index des rencontres.
 * @returns Les lignes documentées et le nombre de boss de la frise examinés.
 */
export function timelineWeaknessRows(timeline: TimelineView, index: EncounterIndex): WeaknessRows {
  const nodes = timelineBossesInOrder(timeline)
  const rows: WeaknessRow[] = []
  for (const node of nodes) {
    const ref = index.byKey.get(node.levelKey)
    if (ref === undefined || ref.encounter === null) continue
    // La clé de rencontre est `bossId/encounterId` (architecture § 3.3).
    const encounterId = node.levelKey.slice(node.levelKey.indexOf('/') + 1)
    const row = weaknessRowOf(node.id, ref.boss.id, ref.encounter, encounterId, node.defeated)
    if (row !== null) rows.push(row)
  }
  return { rows, total: nodes.length }
}

/**
 * Lignes de la matrice en plein écran : toutes les rencontres de `bosses.json` dont l'absorption est documentée, dans l'ordre des données,
 * sauf celles d'un contenu désactivé (Shadow of the Erdtree, Tarnished Pack).
 * @param bosses Pages de boss.
 * @param defeated Clés des rencontres vaincues.
 * @param content Contenus activés.
 * @returns Les lignes documentées et le nombre de rencontres examinées (contenu activé, avec ou sans données).
 */
export function allWeaknessRows(
  bosses: readonly BossEntry[],
  defeated: ReadonlySet<string>,
  content: { readonly sote: boolean; readonly tp: boolean },
): WeaknessRows {
  const rows: WeaknessRow[] = []
  let total = 0
  for (const boss of bosses) {
    boss.encounters.forEach((encounter, i) => {
      if (encounter.source === 'Shadow of the Erdtree' && !content.sote) return
      if (encounter.source === 'Tarnished Pack' && !content.tp) return
      const identity = boss.derived.encounters[i]
      if (identity === undefined) return
      total++
      const row = weaknessRowOf(identity.key, boss.id, encounter, identity.id, defeated.has(identity.key))
      if (row !== null) rows.push(row)
    })
  }
  return { rows, total }
}
