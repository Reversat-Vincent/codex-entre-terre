// Couverture des données (widget D8) : part documentée par le wiki, déduite, estimée ou non documentée, champ par champ et par source.
// Méthode : docs/design/ds/calculs.md, « Couverture des données » ; nœuds de la frise : config/timeline.ts.

import type { DatasetKey } from '../data/datasets.ts'
import type { BossEntry, Encounter } from '../data/types/bosses.ts'
import type { SourceTag } from '../data/types/common.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { TIMELINE, timelineBossRefs } from './config/timeline.ts'
import type { TimelineConfig } from './config/timeline.ts'
import type { LabelCode } from './codes.ts'
import { indexEncounters } from './encounters.ts'
import { makeCalc } from './types.ts'
import type { Calc, DataRef, WeaponFileKey } from './types.ts'

/** Décompte d'un champ. */
export interface CoverageCounts {
  /** Documenté par le wiki (dont « non améliorable »). */
  readonly documented: number
  /** Déduit d'une règle du wiki (badge « Wiki (déduit) »). */
  readonly deduced: number
  /** Estimé (badge Estimation). */
  readonly estimated: number
  /** Non documenté (`null`, ou rencontre absente des données). */
  readonly undocumented: number
  readonly total: number
}

/** Ligne de couverture. */
export interface CoverageRow {
  readonly id: LabelCode
  /** Fichier et champ décomptés. */
  readonly file: DatasetKey
  readonly field: string
  readonly counts: CoverageCounts
  /** Décompte par étiquette de source. */
  readonly bySource: Readonly<Partial<Record<SourceTag, CoverageCounts>>>
}

/** État d'une valeur décomptée. */
type CoverageState = 'documented' | 'deduced' | 'estimated' | 'undocumented'

/** Données lues par la couverture ; une famille absente (fichier non chargé) ne produit pas de ligne. */
export interface CoverageData {
  readonly weapons: Readonly<Partial<Record<WeaponFileKey, readonly WeaponEntry[]>>>
  readonly bosses: readonly BossEntry[] | null
}

const empty = (): { documented: number; deduced: number; estimated: number; undocumented: number; total: number } => ({
  documented: 0,
  deduced: 0,
  estimated: 0,
  undocumented: 0,
  total: 0,
})

/**
 * Décompte une liste de valeurs.
 * @param id Identifiant de la ligne.
 * @param file Fichier.
 * @param field Champ.
 * @param items Valeurs : état et source.
 * @returns La ligne.
 */
function row(id: LabelCode, file: DatasetKey, field: string, items: readonly { state: CoverageState; source: SourceTag }[]): CoverageRow {
  const counts = empty()
  const bySource: Partial<Record<SourceTag, ReturnType<typeof empty>>> = {}
  for (const it of items) {
    counts[it.state]++
    counts.total++
    const s = (bySource[it.source] ??= empty())
    s[it.state]++
    s.total++
  }
  return { id, file, field, counts, bySource }
}

/** Ligne de couverture du type d'amélioration de chaque fichier d'armes. */
const UPGRADE_ROWS: readonly { readonly file: WeaponFileKey; readonly id: LabelCode }[] = [
  { file: 'melee_armaments', id: 'coverage-upgrade-melee' },
  { file: 'ranged_weapons_catalysts', id: 'coverage-upgrade-ranged' },
  { file: 'shields_torches', id: 'coverage-upgrade-shields' },
]

/**
 * État du type d'amélioration d'une arme (`derived.upgrade.reliability`).
 * @param w Arme.
 * @returns L'état décompté.
 */
function upgradeState(w: WeaponEntry): CoverageState {
  switch (w.derived.upgrade.reliability) {
    case 'wiki':
    case 'not-upgradeable':
      return 'documented'
    case 'deduced':
      return 'deduced'
    case 'estimate':
      return 'estimated'
    case 'null':
      return 'undocumented'
  }
}

/**
 * Couverture des données (calculs.md, « Couverture des données ») : type d'amélioration des armes (par fichier), PV, runes et absorption
 * des rencontres de la frise, PV et absorption de toutes les rencontres. Décompte des données, sans estimation.
 * @param data Armes et boss chargés.
 * @param cfg Configuration de la frise (rencontres décomptées).
 * @returns Les lignes, dans l'ordre d'affichage.
 */
export function coverage(data: CoverageData, cfg: TimelineConfig = TIMELINE): Calc<CoverageRow[]> {
  const rows: CoverageRow[] = []
  const inputs: DataRef[] = []
  for (const { file, id } of UPGRADE_ROWS) {
    const list = data.weapons[file]
    if (list === undefined) continue
    rows.push(row(id, file, 'derived.upgrade.reliability', list.map((w) => ({ state: upgradeState(w), source: w.source }))))
    inputs.push({ file, field: 'derived.upgrade.reliability', value: list.length, reliability: 'calculated' })
  }
  if (data.bosses !== null) {
    const index = indexEncounters(data.bosses)
    const nodes = timelineBossRefs(cfg).map((n) => {
      const ref = index.byKey.get(n.levelKey)
      return { encounter: ref?.encounter ?? null, source: ref?.encounter?.source ?? ref?.boss.source ?? 'Base game' }
    })
    const state = (enc: Encounter | null, has: (e: Encounter) => boolean): CoverageState => (enc !== null && has(enc) ? 'documented' : 'undocumented')
    const hp = (e: Encounter): boolean => e.hp_values.length > 0
    const runes = (e: Encounter): boolean => e.runes_values.length > 0
    const negation = (e: Encounter): boolean => e.damage_negation_percent !== undefined
    rows.push(row('coverage-timeline-hp', 'bosses', 'encounters[].hp_values', nodes.map((n) => ({ state: state(n.encounter, hp), source: n.source }))))
    rows.push(row('coverage-timeline-runes', 'bosses', 'encounters[].runes_values', nodes.map((n) => ({ state: state(n.encounter, runes), source: n.source }))))
    rows.push(row('coverage-timeline-negation', 'bosses', 'encounters[].damage_negation_percent', nodes.map((n) => ({ state: state(n.encounter, negation), source: n.source }))))
    const all = data.bosses.flatMap((b) => b.encounters)
    rows.push(row('coverage-encounters-hp', 'bosses', 'encounters[].hp_values', all.map((e) => ({ state: state(e, hp), source: e.source }))))
    rows.push(row('coverage-encounters-negation', 'bosses', 'encounters[].damage_negation_percent', all.map((e) => ({ state: state(e, negation), source: e.source }))))
    inputs.push({ file: 'bosses', field: 'encounters', value: all.length, reliability: 'calculated' }, { file: 'config', entry: 'timeline', field: 'TIMELINE', value: nodes.length, reliability: 'calculated' })
  }
  return makeCalc('coverage', rows, {
    components: rows.map((r) => ({ code: 'coverage-documented', value: r.counts.documented + r.counts.deduced, max: r.counts.total, params: { row: r.id } })),
    inputs,
  })
}
