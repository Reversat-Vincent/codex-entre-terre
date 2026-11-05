// Modèle du Comparateur : lignes à comparer pour chaque genre d'entité (colonnes du catalogue du genre, sens de chaque ligne) et valeur de comparaison d'une cellule.
// Ne produit aucune valeur de jeu : les valeurs viennent des données, des accesseurs du registre des catalogues et du moteur (prérequis comparés au profil).
// L'ordre des valeurs (meilleure valeur, écart) est jugé par `src/ui/compare.ts`.

import type { CatalogKey, CatalogRow, ProfileContext } from '../../../catalog/registry.ts'
import { CATALOG_SPECS } from '../../../catalog/registry.ts'
import type { EntityKind } from '../../../data/datasets.ts'
import { COMPARE_MAX } from '../../../stores/compare.ts'
import type { BetterWhen, CompareValue } from '../../../ui/compare.ts'
import { columnsOf, obtentionParts, passiveParts, skillParts, upgradeParts, weaponRequirements, weaponScaling } from '../catalog/catalogModel.ts'
import type { CatalogColumn } from '../catalog/catalogModel.ts'

/** Nombre maximal de colonnes du comparateur (celui du store `compare`). */
export const MAX_COLUMNS = COMPARE_MAX

/** Catalogue dont les colonnes décrivent chaque genre comparable : un seul par genre, les catalogues d'une famille partagent leurs colonnes. */
const KIND_CATALOG: Readonly<Partial<Record<EntityKind, CatalogKey>>> = {
  weapon: 'weapons:melee',
  ash: 'ashes',
  armor: 'armors',
  talisman: 'talismans',
  spell: 'spells',
  spirit: 'spirits',
  item: 'items:outils',
  boss: 'bosses',
  location: 'locations',
  npc: 'npcs',
  origin: 'origins',
}

/**
 * Catalogue qui décrit un genre pour la comparaison.
 * @param kind Genre d'entité.
 * @returns Le catalogue, ou `null` pour un genre qu'on ne compare pas (les mécaniques sont des articles).
 */
export function catalogOfKind(kind: EntityKind): CatalogKey | null {
  return KIND_CATALOG[kind] ?? null
}

/** Libellé du genre au pluriel, pour la recherche d'ajout et les messages. */
export const KIND_PLURALS: Readonly<Record<EntityKind, string>> = {
  weapon: 'armes',
  ash: 'cendres de guerre',
  armor: 'armures',
  talisman: 'talismans',
  spell: 'sorts',
  spirit: 'cendres d’esprit',
  item: 'objets',
  boss: 'boss',
  location: 'lieux',
  npc: 'PNJ',
  origin: 'origines',
  mechanic: 'mécaniques',
}

/** Éléments dont une ligne a besoin en plus de l'entrée : le profil et les scores déjà calculés par le moteur. */
export interface CompareContext {
  /** Attributs et posture du profil actif (prérequis comparés). */
  readonly profile: ProfileContext
}

/** Description d'une ligne du comparateur. */
export interface CompareRowSpec {
  /** Identifiant stable (clé de liste, test). */
  readonly id: string
  /** Libellé français de la ligne. */
  readonly label: string
  /** Précision sous le libellé (« comparés à votre profil »), ou `null`. */
  readonly note: string | null
  /** Titre du groupe qui contient la ligne (« Absorption »), ou `null` hors groupe. */
  readonly group: string | null
  /** Sens de la ligne : décide de la meilleure valeur. */
  readonly better: BetterWhen
  /** `column` : cellule du catalogue (via `CatalogCell`) ; `score` : score de recommandation, fourni par le moteur. */
  readonly cell: 'column' | 'score'
  /** Colonne du catalogue qui dit comment afficher la cellule, `null` pour le score. */
  readonly column: CatalogColumn | null
  /** Valeur comparée d'une entrée ; `null` : non documenté. Sans objet pour `score` (la vue fournit le score). */
  readonly rank: (row: CatalogRow, context: CompareContext) => CompareValue
}

/** Sens des lignes dont l'ordre a un sens, par catalogue puis identifiant de colonne ; toute autre ligne ne signale que l'écart. */
const BETTER: Readonly<Record<string, BetterWhen>> = {
  'armors/weight': 'lower',
  'armors/poise': 'higher',
  'talismans/weight': 'lower',
  'spells/fp': 'lower',
  'spells/slots': 'lower',
  'spirits/fp': 'lower',
  'spirits/hp': 'lower',
  'origins/hp': 'higher',
  'origins/fp': 'higher',
  'origins/stamina': 'higher',
  'origins/equipLoad': 'higher',
}

const ARMOR_NEGATIONS = ['physical', 'strike', 'slash', 'pierce', 'magic', 'fire', 'lightning', 'holy']
const ARMOR_RESISTANCES = ['immunity', 'robustness', 'focus', 'vitality']

/**
 * Valeur de comparaison d'une colonne : l'accesseur de tri du catalogue (même valeur que celle du tableau), ou la lecture de la colonne.
 * @param catalog Catalogue du genre.
 * @param column Colonne.
 * @returns La fonction de lecture.
 */
function defaultRank(catalog: CatalogKey, column: CatalogColumn): CompareRowSpec['rank'] {
  const accessor = CATALOG_SPECS[catalog].columns[column.id]
  return (row) => accessor?.(row) ?? column.value?.(row) ?? null
}

/** Signature textuelle du scaling : lettre de chaque attribut, `-` pour « pas de scaling » (une valeur, jamais « non documenté »). */
function scalingSignature(row: CatalogRow): string {
  return Object.entries(weaponScaling(row))
    .map(([attr, grade]) => `${attr} ${grade ?? '-'}`)
    .join(' · ')
}

/** Signature textuelle des effets passifs d'une arme (« Aucun » quand il n'y en a pas : le wiki n'en connaît pas). */
function passiveSignature(row: CatalogRow): string {
  const p = passiveParts(row)
  const parts = [...p.statuses.map((s) => `${s.key} ${s.value}`), ...p.texts]
  return parts.length === 0 ? 'Aucun' : parts.join(' · ')
}

/** Signature textuelle de l'obtention : régions puis première façon d'obtenir. */
function obtentionSignature(row: CatalogRow): string | null {
  const o = obtentionParts(row)
  const parts = [o.regions, o.how].filter((x): x is string => x !== null)
  return parts.length === 0 ? null : parts.join(' · ')
}

/**
 * Lignes d'une arme : attaque à +0, scaling, prérequis comparés au profil, poids, amélioration, compétence, passif, score, obtention.
 * @param catalog Catalogue du genre.
 * @param columns Colonnes du catalogue.
 * @param withScore Vrai si un score existe pour au moins une des armes comparées.
 * @returns Les lignes, dans l'ordre d'affichage.
 */
function weaponRows(catalog: CatalogKey, columns: readonly CatalogColumn[], withScore: boolean): CompareRowSpec[] {
  const col = (id: string): CatalogColumn => columns.find((c) => c.id === id) as CatalogColumn
  const rows: CompareRowSpec[] = [
    { id: 'attack', label: 'Attaque à +0', note: 'Valeurs de base du wiki', group: null, better: 'higher', cell: 'column', column: col('attack'), rank: defaultRank(catalog, col('attack')) },
    { id: 'scaling', label: 'Scaling', note: null, group: null, better: 'none', cell: 'column', column: col('scaling'), rank: scalingSignature },
    {
      id: 'requirements',
      label: 'Prérequis',
      note: 'Comparés à votre profil ; le meilleur est le plus proche d’être atteint',
      group: null,
      better: 'lower',
      cell: 'column',
      column: col('requirements'),
      // Écart total en points d'attribut à gagner (moteur : `compareRequirements`, calculs.md « Prérequis comparés au profil »).
      rank: (row, ctx) => weaponRequirements(row, ctx.profile).reduce((sum, check) => sum + check.gap, 0),
    },
    { id: 'weight', label: 'Poids', note: null, group: null, better: 'lower', cell: 'column', column: col('weight'), rank: defaultRank(catalog, col('weight')) },
    { id: 'upgrade', label: 'Amélioration', note: 'Pierres, niveau maximal et fiabilité', group: null, better: 'none', cell: 'column', column: col('upgrade'), rank: (row) => upgradeParts(row).text },
    { id: 'skill', label: 'Compétence', note: null, group: null, better: 'none', cell: 'column', column: col('skill'), rank: (row) => skillParts(row).name },
    { id: 'passive', label: 'Passif', note: null, group: null, better: 'none', cell: 'column', column: col('passive'), rank: passiveSignature },
  ]
  if (withScore) {
    rows.push({ id: 'score', label: 'Score pour votre profil', note: 'Calculé par l’application, sur 100', group: null, better: 'higher', cell: 'score', column: null, rank: () => null })
  }
  rows.push({ id: 'obtention', label: 'Obtention', note: null, group: null, better: 'none', cell: 'column', column: col('obtention'), rank: obtentionSignature })
  return rows
}

/**
 * Lignes d'une armure : emplacement, poids, équilibre, puis absorptions et résistances en groupes.
 * @param catalog Catalogue du genre.
 * @param columns Colonnes du catalogue.
 * @returns Les lignes, dans l'ordre d'affichage.
 */
function armorRows(catalog: CatalogKey, columns: readonly CatalogColumn[]): CompareRowSpec[] {
  const make = (c: CatalogColumn, group: string | null, label?: string): CompareRowSpec => ({
    id: c.id,
    label: label ?? c.label,
    note: null,
    group,
    better: BETTER[`${catalog}/${c.id}`] ?? (group === null ? 'none' : 'higher'),
    cell: 'column',
    column: c,
    rank: defaultRank(catalog, c),
  })
  const byId = (ids: readonly string[]): CatalogColumn[] => ids.flatMap((id) => columns.filter((c) => c.id === id))
  return [
    ...byId(['slot', 'weight', 'poise']).map((c) => make(c, null)),
    ...byId(ARMOR_NEGATIONS).map((c) => make(c, 'Absorption', c.label)),
    ...byId(ARMOR_RESISTANCES).map((c) => make(c, 'Résistances')),
    ...byId(['obtention']).map((c) => make(c, null)),
  ]
}

/**
 * Lignes à comparer pour un genre : les champs principaux du catalogue du genre (toutes ses colonnes sauf le nom), avec le sens de chaque ligne.
 * @param kind Genre d'entité (les armes et les armures ont des lignes dédiées).
 * @param options `withScore` : vrai si un score existe pour au moins une arme comparée (la ligne « Score » n'apparaît pas sinon).
 * @returns Les lignes, ou une liste vide pour un genre qu'on ne compare pas.
 */
export function compareRows(kind: EntityKind, options: { withScore?: boolean } = {}): readonly CompareRowSpec[] {
  const catalog = catalogOfKind(kind)
  if (catalog === null) return []
  const columns = columnsOf(catalog)
  if (kind === 'weapon') return weaponRows(catalog, columns, options.withScore ?? false)
  if (kind === 'armor') return armorRows(catalog, columns)
  return columns
    .filter((c) => c.id !== 'name')
    .map((c): CompareRowSpec => ({
      id: c.id,
      label: c.label,
      note: null,
      group: null,
      better: BETTER[`${catalog}/${c.id}`] ?? 'none',
      cell: 'column',
      column: c,
      rank: c.cell === 'obtention' ? obtentionSignature : defaultRank(catalog, c),
    }))
}
