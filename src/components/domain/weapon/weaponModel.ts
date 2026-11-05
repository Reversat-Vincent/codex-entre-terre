// Modèle d'affichage de la fiche d'arme : mise en forme des données de `data/` (tableaux d'amélioration, alertes de qualité, obtention, coût de compétence).
// Ne produit aucune valeur de jeu : les calculs (puissance d'attaque, prérequis, score) viennent du moteur ; ici on ne fait que lire, ranger et nommer.

import { DAMAGE_KEYS } from '../../../data/keys.ts'
import type { DamageKey } from '../../../data/keys.ts'
import type { UpgradeAffinityTable, UpgradeLevel, WeaponEntry } from '../../../data/types/weapon.ts'
import type { Confidence, WeaponFileKey } from '../../../engine/types.ts'
import { DAMAGE_LABELS } from '../../../ui/labels.ts'
import type { ReliabilityKey } from '../../../ui/labels.ts'
import type { ChartSeries } from '../../ds/types.ts'

/** Nombre de séries au plus du graphique d'affinités (README du design system : quatre teintes `cat-1` à `cat-4`). */
export const MAX_AFFINITY_SERIES = 4

/** Nombre minimal de niveaux documentés pour tracer une courbe (architecture § 15, P6) : en dessous, tableau et note « tableau partiel ». */
export const MIN_CHART_POINTS = 3

/** Ordre de préférence des affinités affichées par défaut (design : Standard, Keen, Cold, Blood), puis l'ordre du tableau du wiki. */
const DEFAULT_AFFINITIES: readonly string[] = ['Standard', 'Keen', 'Cold', 'Blood']

/** Les trois fichiers d'armes : une arme se trouve dans l'un d'eux, l'identifiant ne dit pas lequel. */
export const WEAPON_FILES: readonly WeaponFileKey[] = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches']

/**
 * Cherche une arme par identifiant dans les fichiers d'armes déjà chargés.
 * @param entriesOf Entrées d'un fichier, ou `null` s'il n'est pas chargé.
 * @param id Identifiant de l'arme (`slug(wiki_page)`).
 * @returns L'arme et son fichier, ou `null` si aucun fichier chargé ne la contient.
 */
export function findWeapon(
  entriesOf: (key: WeaponFileKey) => readonly WeaponEntry[] | null,
  id: string,
): { weapon: WeaponEntry; file: WeaponFileKey } | null {
  for (const file of WEAPON_FILES) {
    const weapon = entriesOf(file)?.find((e) => e.id === id)
    if (weapon) return { weapon, file }
  }
  return null
}

// ─── Tableaux d'amélioration ───────────────────────────────────────────────────

/** Mode du graphique d'évolution : aucun tableau, une courbe par affinité, ou une courbe par type de dégâts (une seule affinité documentée). */
export type ChartMode = 'none' | 'affinity' | 'damage'

/** Description des tableaux d'amélioration d'une arme. */
export interface UpgradeTables {
  readonly mode: ChartMode
  /** Affinités documentées, dans l'ordre du wiki. */
  readonly affinities: readonly string[]
  /** Affinité du tableau unique en mode `damage`, sinon `null`. */
  readonly single: string | null
  /** Plus haut niveau documenté, `0` sans tableau. */
  readonly highestDocumented: number
  /** Vrai si le tableau est signalé incohérent avec l'infobox (`derived.inconsistent`). */
  readonly inconsistent: boolean
}

/** Données du graphique : abscisses (niveaux documentés) et séries. */
export interface ChartData {
  readonly x: readonly number[]
  readonly series: readonly ChartSeries[]
}

/**
 * Niveaux `+N` documentés d'un tableau d'affinité, du plus bas au plus haut.
 * @param table Tableau d'une affinité.
 * @returns Les niveaux, sans `growth_per_level`.
 */
export function levelsOf(table: UpgradeAffinityTable): number[] {
  return Object.keys(table)
    .filter((k) => /^\+\d+$/.test(k))
    .map((k) => Number(k.slice(1)))
    .sort((a, b) => a - b)
}

/**
 * Ligne d'un niveau dans un tableau d'affinité.
 * @param table Tableau d'une affinité.
 * @param n Niveau.
 * @returns La ligne, ou `undefined` si le niveau n'est pas documenté.
 */
function rowAt(table: UpgradeAffinityTable, n: number): UpgradeLevel | undefined {
  return table[`+${n}`]
}

/**
 * Décrit les tableaux d'amélioration d'une arme : mode du graphique, affinités documentées, plus haut niveau.
 * Deux affinités documentées ou plus : une courbe par affinité ; une seule : une courbe par type de dégâts (armes à pierres sombres) ; aucune : pas de graphique.
 * @param weapon Arme.
 * @returns La description.
 */
export function describeUpgradeTables(weapon: WeaponEntry): UpgradeTables {
  const tables = weapon.upgrade.tables
  const affinities = tables === undefined ? [] : Object.keys(tables)
  const inconsistent = weapon.derived.inconsistent.some((i) => i.field === 'upgrade.tables')
  const highest = tables === undefined ? 0 : Math.max(0, ...Object.values(tables).flatMap((t) => levelsOf(t)))
  const mode: ChartMode = affinities.length === 0 ? 'none' : affinities.length === 1 ? 'damage' : 'affinity'
  return { mode, affinities, single: mode === 'damage' ? (affinities[0] ?? null) : null, highestDocumented: highest, inconsistent }
}

/**
 * Niveau maximal du curseur « Niveau affiché » : niveau maximal de l'arme, ou plus haut niveau documenté s'il le dépasse ; `0` sans tableau
 * (le calcul est alors limité à +0).
 * @param weapon Arme.
 * @param tables Description de ses tableaux.
 * @returns Le niveau maximal choisissable.
 */
export function sliderMax(weapon: WeaponEntry, tables: UpgradeTables): number {
  if (tables.mode === 'none') return 0
  return Math.max(weapon.derived.upgrade.maxLevel ?? 0, tables.highestDocumented)
}

/**
 * Types de dégâts de l'infobox dont le tableau ne donne aucune valeur alors que l'infobox en donne une : le total du tableau serait faux.
 * Seule l'affinité Standard est comparable à l'infobox (valeurs à +0 en Standard).
 * @param weapon Arme.
 * @param affinity Affinité.
 * @param table Tableau de l'affinité.
 * @returns Vrai si un type manque dans le tableau.
 */
function hasMissingType(weapon: WeaponEntry, affinity: string, table: UpgradeAffinityTable): boolean {
  if (affinity !== 'Standard') return false
  const rows = levelsOf(table).map((n) => rowAt(table, n))
  return DAMAGE_KEYS.some((t) => weapon.attack_power[t] > 0 && rows.every((r) => r === undefined || r.attack[t] === undefined))
}

/**
 * Attaque totale d'une ligne : somme des types documentés. Un type absent du tableau compte pour zéro (l'extraction omet les types sans dégâts) ;
 * une valeur illisible du wiki (« 56/56 ») rend le total `null`.
 * @param row Ligne de tableau.
 * @param missing Vrai si un type manque dans le tableau (total `null`).
 * @returns Le total, ou `null`.
 */
function rowTotal(row: UpgradeLevel, missing: boolean): number | null {
  if (missing) return null
  let sum = 0
  for (const t of DAMAGE_KEYS) {
    const v = row.attack[t]
    if (typeof v === 'string') return null
    if (typeof v === 'number') sum += v
  }
  return sum
}

/**
 * Affinités affichées par défaut au graphique : Standard, Keen, Cold, Blood quand elles sont documentées, puis les suivantes du tableau, 4 au plus.
 * @param affinities Affinités documentées.
 * @returns Quatre emplacements ; chaque couleur reste attachée à son emplacement tant que l'affinité est affichée.
 */
export function defaultSlots(affinities: readonly string[]): (string | null)[] {
  const preferred = DEFAULT_AFFINITIES.filter((a) => affinities.includes(a))
  const rest = affinities.filter((a) => !preferred.includes(a))
  const picked = [...preferred, ...rest].slice(0, MAX_AFFINITY_SERIES)
  return Array.from({ length: MAX_AFFINITY_SERIES }, (_, i) => picked[i] ?? null)
}

/**
 * Bascule une affinité du graphique : la retire (sauf si c'est la dernière) ou l'ajoute au premier emplacement libre (4 au plus).
 * La couleur est celle de l'emplacement : retirer une affinité ne change pas la couleur des autres.
 * @param slots Emplacements actuels.
 * @param affinity Affinité à basculer.
 * @returns Les nouveaux emplacements (les mêmes si le changement est refusé).
 */
export function toggleSlot(slots: readonly (string | null)[], affinity: string): (string | null)[] {
  const next = [...slots]
  const at = next.indexOf(affinity)
  if (at >= 0) {
    if (next.filter((s) => s !== null).length > 1) next[at] = null
    return next
  }
  const free = next.indexOf(null)
  if (free >= 0) next[free] = affinity
  return next
}

/**
 * Courbes par affinité : attaque totale à chaque niveau documenté, une série par affinité affichée, couleur attachée à l'emplacement.
 * @param weapon Arme.
 * @param slots Affinités affichées (voir `defaultSlots`).
 * @returns Les abscisses (niveaux documentés d'au moins une série) et les séries ; une valeur absente est `null`.
 */
export function affinityChart(weapon: WeaponEntry, slots: readonly (string | null)[]): ChartData {
  const tables = weapon.upgrade.tables ?? {}
  const shown = slots.flatMap((affinity, slot) => {
    const table = affinity === null ? undefined : tables[affinity]
    return affinity === null || table === undefined ? [] : [{ affinity, table, slot }]
  })
  const x = [...new Set(shown.flatMap((s) => levelsOf(s.table)))].sort((a, b) => a - b)
  const series = shown.map(({ affinity, table, slot }): ChartSeries => {
    const missing = hasMissingType(weapon, affinity, table)
    return {
      id: affinity,
      label: affinity,
      color: (slot + 1) as 1 | 2 | 3 | 4,
      values: x.map((n) => {
        const row = rowAt(table, n)
        return row === undefined ? null : rowTotal(row, missing)
      }),
    }
  })
  return { x, series }
}

/**
 * Courbes par type de dégâts pour une affinité : une série par type qui a des dégâts dans le tableau (armes sans affinité modifiable).
 * @param weapon Arme.
 * @param affinity Affinité du tableau.
 * @returns Les abscisses et les séries ; un type absent d'un niveau ou illisible vaut `null`.
 */
export function damageChart(weapon: WeaponEntry, affinity: string): ChartData {
  const table = weapon.upgrade.tables?.[affinity]
  if (table === undefined) return { x: [], series: [] }
  const x = levelsOf(table)
  const types = DAMAGE_KEYS.filter((t) => x.some((n) => (rowAt(table, n)?.attack[t] ?? 0) !== 0))
  const series = types.map((t, i): ChartSeries => ({
    id: t,
    label: DAMAGE_LABELS[t],
    color: ((i % MAX_AFFINITY_SERIES) + 1) as 1 | 2 | 3 | 4,
    values: x.map((n) => {
      const v = rowAt(table, n)?.attack[t]
      return typeof v === 'number' ? v : null
    }),
  }))
  return { x, series }
}

/** Cellule du tableau partiel : attaque totale à un niveau et détail des types non physiques. */
export interface PartialCell {
  readonly level: number
  readonly total: number | null
  /** « dont Feu 63 » quand un type non physique a des dégâts ; `null` sinon. */
  readonly split: string | null
}

/** Ligne du tableau partiel : une affinité et ses valeurs aux niveaux documentés. */
export interface PartialRow {
  readonly affinity: string
  readonly cells: readonly PartialCell[]
}

/**
 * Tableau des valeurs documentées quand il y a trop peu de niveaux pour une courbe : une ligne par affinité, une colonne par niveau.
 * @param weapon Arme.
 * @returns Les niveaux (colonnes) et les lignes.
 */
export function partialTable(weapon: WeaponEntry): { levels: number[]; rows: PartialRow[] } {
  const tables = weapon.upgrade.tables ?? {}
  const levels = [...new Set(Object.values(tables).flatMap((t) => levelsOf(t)))].sort((a, b) => a - b)
  const rows = Object.entries(tables).map(([affinity, table]): PartialRow => {
    const missing = hasMissingType(weapon, affinity, table)
    return {
      affinity,
      cells: levels.map((level): PartialCell => {
        const row = rowAt(table, level)
        if (row === undefined) return { level, total: null, split: null }
        const parts = DAMAGE_KEYS.filter((t): t is Exclude<DamageKey, 'physical'> => t !== 'physical').flatMap((t) => {
          const v = row.attack[t]
          return typeof v === 'number' && v > 0 ? [`${DAMAGE_LABELS[t]} ${v}`] : []
        })
        return { level, total: rowTotal(row, missing), split: parts.length > 0 ? `dont ${parts.join(', ')}` : null }
      }),
    }
  })
  return { levels, rows }
}

// ─── Fiabilité et alertes ──────────────────────────────────────────────────────

/** Alerte de qualité des données affichée en tête de fiche. */
export interface WeaponAlert {
  readonly id: string
  /** Ton du bandeau `CxNote`. */
  readonly tone: 'info' | 'partial' | 'est' | 'warn'
  /** Accroche en gras (« Wiki (déduit). »). */
  readonly title: string
  readonly text: string
  /** Texte de la donnée, en anglais comme dans `data/` (raison d'une incohérence du wiki). */
  readonly detail?: string
}

/**
 * Alertes de qualité des données d'une arme : type d'amélioration déduit ou estimé, non documenté, tableau absent, incohérence du wiki avec sa raison,
 * détails d'obtention absents.
 * @param weapon Arme.
 * @param tables Description de ses tableaux d'amélioration.
 * @returns Les alertes, dans l'ordre d'affichage (vide si les données sont complètes et cohérentes).
 */
export function weaponAlerts(weapon: WeaponEntry, tables: UpgradeTables): WeaponAlert[] {
  const out: WeaponAlert[] = []
  const up = weapon.derived.upgrade
  switch (up.reliability) {
    case 'deduced':
      out.push({ id: 'upgrade-deduced', tone: 'info', title: 'Wiki (déduit).', text: "Le type d'amélioration est déduit d'une règle du wiki : la page de l'arme ne l'indique pas." })
      break
    case 'estimate':
      out.push({
        id: 'upgrade-estimate',
        tone: 'est',
        title: `Estimation, confiance ${up.confidence === 'high' ? 'haute' : 'moyenne'}.`,
        text: "Le wiki ne documente pas le type d'amélioration : le matériau et le niveau maximal sont une estimation tirée des armes comparables.",
        ...(up.basis === undefined ? {} : { detail: up.basis }),
      })
      break
    case 'null':
      out.push({ id: 'upgrade-null', tone: 'partial', title: 'Non documenté.', text: "Le wiki ne documente pas le type d'amélioration de cette arme, et aucune estimation n'existe." })
      break
    case 'not-upgradeable':
      out.push({ id: 'not-upgradeable', tone: 'info', title: 'Non améliorable.', text: "Cette arme ne peut pas être améliorée : le calcul est limité à +0." })
      break
    case 'wiki':
      break
  }
  if (tables.mode === 'none' && up.reliability !== 'not-upgradeable') {
    out.push({ id: 'tables-none', tone: 'partial', title: 'Non documenté.', text: "Pas de tableau d'amélioration sur le wiki : l'évolution par niveau n'est pas affichée et le calcul est limité à +0." })
  }
  for (const inconsistency of weapon.derived.inconsistent) {
    if (inconsistency.field === 'upgrade.tables') {
      out.push({
        id: 'tables-inconsistent',
        tone: 'warn',
        title: 'Incohérence wiki.',
        text: "Le tableau d'amélioration ne concorde pas avec l'infobox de l'arme : les valeurs de l'infobox font foi à +0, celles du tableau servent aux autres niveaux.",
      })
    } else {
      out.push({
        id: 'material-inconsistent',
        tone: 'warn',
        title: 'Incohérence wiki.',
        text: "Le matériau d'amélioration vient de la page de liste du wiki, mais la page de l'arme dit autre chose : la valeur de la liste est conservée.",
        ...(inconsistency.reason === undefined ? {} : { detail: inconsistency.reason }),
      })
    }
  }
  if (!hasAcquisitionDetails(weapon)) {
    out.push({ id: 'acquisition-details', tone: 'partial', title: 'Non documenté.', text: "Le wiki ne donne pas de détails d'obtention pour cette arme." })
  }
  return out
}

/**
 * Indique si l'obtention est documentée : au moins une acquisition avec un détail.
 * @param weapon Arme.
 * @returns Vrai si un détail d'obtention existe.
 */
export function hasAcquisitionDetails(weapon: WeaponEntry): boolean {
  return weapon.acquisition.some((a) => a.details.length > 0)
}

/** Ligne du récapitulatif « Qualité des données ». */
export interface QualityRow {
  readonly id: string
  /** Champ concerné (français). */
  readonly label: string
  readonly kind: ReliabilityKey
  readonly confidence?: Confidence
  /** Précision courte après le badge. */
  readonly note?: string
  /** Info-bulle du badge (source du champ dans les données). */
  readonly tip?: string
}

/**
 * Fiabilité d'un champ de modifiabilité (Cendre de guerre, affinité) d'après sa source.
 * @param value Valeur du champ (`null` : non documenté).
 * @param source `changeability_info_source`.
 * @param field `ash` ou `affinity` : la source composée « wiki (…) + deduced (affinity_changeable…) » ne déduit que l'affinité.
 * @returns La fiabilité à afficher.
 */
export function changeabilityKind(value: boolean | null, source: string | null, field: 'ash' | 'affinity'): ReliabilityKey {
  if (value === null) return 'null'
  if (source !== null && field === 'affinity' && /deduced \(affinity_changeable/.test(source)) return 'deduced'
  return 'wiki'
}

/**
 * Récapitulatif « Qualité des données » : fiabilité champ par champ (hors score, ajouté par la vue).
 * @param weapon Arme.
 * @param tables Description de ses tableaux d'amélioration.
 * @returns Les lignes.
 */
export function qualityRows(weapon: WeaponEntry, tables: UpgradeTables): QualityRow[] {
  const up = weapon.derived.upgrade
  const rows: QualityRow[] = [{ id: 'stats', label: 'Attaque, scaling, prérequis', kind: 'wiki', tip: "Valeurs de l'infobox de la page du wiki, à +0." }]

  const guardValues = Object.values(weapon.guarded_damage_negation)
  const guardMissing = guardValues.filter((v) => v === null).length
  rows.push({
    id: 'guard',
    label: 'Absorption en garde',
    kind: guardMissing === guardValues.length ? 'null' : 'wiki',
    ...(guardMissing > 0 && guardMissing < guardValues.length ? { note: `${guardMissing} valeur${guardMissing > 1 ? 's' : ''} manquante${guardMissing > 1 ? 's' : ''}` } : {}),
  })

  rows.push({
    id: 'upgrade-type',
    label: "Type d'amélioration",
    kind: up.reliability === 'not-upgradeable' ? 'wiki' : up.reliability,
    ...(up.confidence === undefined ? {} : { confidence: up.confidence }),
    ...(up.reliability === 'not-upgradeable' ? { note: 'non améliorable' } : {}),
    ...(weapon.upgrade.material_info_source === null ? {} : { tip: weapon.upgrade.material_info_source }),
  })
  const materialIssue = weapon.derived.inconsistent.find((i) => i.field === 'upgrade.material')
  if (materialIssue) {
    rows.push({ id: 'material', label: 'Matériau', kind: 'inconsistent', note: 'liste du wiki retenue', ...(materialIssue.reason === undefined ? {} : { tip: materialIssue.reason }) })
  }
  rows.push({
    id: 'tables',
    label: "Tableau d'amélioration",
    kind: tables.mode === 'none' ? 'null' : tables.inconsistent ? 'inconsistent' : 'wiki',
    ...(tables.inconsistent ? { note: "l'infobox fait foi", tip: "Le tableau du wiki contredit l'infobox à +0." } : {}),
  })
  const source = weapon.upgrade.changeability_info_source
  rows.push({
    id: 'ash',
    label: 'Cendre de guerre modifiable',
    kind: changeabilityKind(weapon.upgrade.ash_of_war_changeable, source, 'ash'),
    ...(source === null ? {} : { tip: source }),
  })
  rows.push({
    id: 'affinity',
    label: 'Affinité modifiable',
    kind: changeabilityKind(weapon.upgrade.affinity_changeable, source, 'affinity'),
    ...(source === null ? {} : { tip: source }),
  })
  rows.push({ id: 'acquisition', label: "Détails d'obtention", kind: hasAcquisitionDetails(weapon) ? 'wiki' : 'null' })
  return rows
}

// ─── Obtention ─────────────────────────────────────────────────────────────────

/** Obtention préparée pour l'affichage. */
export interface AcquisitionView {
  readonly index: number
  /** Méthode brute du wiki (« Guaranteed Drop »), telle que dans `data/` ; `null` : non documentée. */
  readonly method: string | null
  /** Nom d'icône du sprite. */
  readonly icon: string
  readonly location: string | null
  /** Région du wiki, ou régions déduites (`derived.regions`) quand le wiki n'en donne pas. */
  readonly region: string | null
  /** Vrai si la région est déduite par l'application et non lue sur le wiki. */
  readonly regionDeduced: boolean
  /** Équipement de départ : le lieu est une origine. */
  readonly starting: boolean
  readonly details: readonly string[]
}

/** Icône de chaque méthode normalisée (`derived.methods`). */
const METHOD_ICONS: Readonly<Record<string, string>> = {
  purchase: 'trade',
  trade: 'trade',
  drop: 'drop',
  'guaranteed-drop': 'drop',
  loot: 'drop',
  quest: 'npc',
  starting: 'start',
  other: 'map',
}

/**
 * Obtentions d'une arme prêtes à afficher : méthode brute, icône de la méthode normalisée, région du wiki ou déduite.
 * @param weapon Arme.
 * @returns Une entrée par acquisition de `data/`.
 */
export function acquisitionViews(weapon: WeaponEntry): AcquisitionView[] {
  return weapon.acquisition.map((a, index): AcquisitionView => {
    const normalized = weapon.derived.methods[index] ?? null
    const derivedRegions = weapon.derived.regions.acquisitions.find((r) => r.index === index)?.values.map((v) => v.value) ?? []
    const starting = normalized === 'starting'
    return {
      index,
      method: a.method,
      icon: normalized === null ? 'map' : (METHOD_ICONS[normalized] ?? 'map'),
      location: a.location,
      region: a.region ?? (derivedRegions.length > 0 && !starting ? derivedRegions.join(', ') : null),
      regionDeduced: a.region === null && derivedRegions.length > 0 && !starting,
      starting,
      details: a.details,
    }
  })
}

// ─── Compétence ────────────────────────────────────────────────────────────────

/** Libellés français des types de compétence de `skill.type` ; `null` : pas de compétence à afficher. */
const SKILL_TYPE_LABELS: Readonly<Record<string, string | null>> = {
  'Unique Skill': 'Compétence unique',
  'Ash of War skill': 'Cendre de guerre',
  'Standard skill (no Ash of War item)': 'Compétence standard',
  'No skill': null,
}

/**
 * Libellé français du type de compétence.
 * @param type Valeur de `skill.type`.
 * @returns Le libellé, ou `null` pour « aucune compétence » ; un type inconnu est repris tel quel.
 */
export function skillTypeLabel(type: string): string | null {
  return type in SKILL_TYPE_LABELS ? (SKILL_TYPE_LABELS[type] ?? null) : type
}

/**
 * Tri des armes voisines : les armes évaluées d'abord (score décroissant, `null` après les notes), puis les autres par nom.
 * @param a Première arme voisine.
 * @param b Seconde arme voisine.
 * @returns Valeur de comparaison de `Array.sort`.
 */
export function bySimilarOrder(
  a: { readonly name: string; readonly score: number | null | undefined },
  b: { readonly name: string; readonly score: number | null | undefined },
): number {
  const rank = (s: number | null | undefined): number => (s === undefined ? 2 : s === null ? 1 : 0)
  const ra = rank(a.score)
  const rb = rank(b.score)
  if (ra !== rb) return ra - rb
  if (ra === 0 && a.score !== b.score) return (b.score ?? 0) - (a.score ?? 0)
  return a.name.localeCompare(b.name, 'en')
}
