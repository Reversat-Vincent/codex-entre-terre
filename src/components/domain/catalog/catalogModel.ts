// Modèle d'affichage des catalogues : titres et noms, onglets de famille, colonnes de chacun des 17 catalogues, lecture des champs affichés par les cellules
// (attaque à +0, amélioration, obtention, passif). Aucune donnée de jeu n'est ajoutée : seuls des libellés d'interface le sont.
// Aucun calcul : les prérequis comparés au profil viennent du getter `requirementsOf` du store `analysis`.

import type { RouteLocationRaw } from 'vue-router'
import type { CatalogKey, CatalogRow } from '../../../catalog/registry.ts'
import { CATALOG_KEYS, CATALOG_SPECS } from '../../../catalog/registry.ts'
import { DATASETS, entityRef } from '../../../data/datasets.ts'
import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import { ATTRIBUTE_KEYS, DAMAGE_KEYS, ORIGIN_ATTRIBUTE_FIELD, STATUS_KEYS } from '../../../data/keys.ts'
import type { DamageKey, StatusKey } from '../../../data/keys.ts'
import type { AshOfWarEntry } from '../../../data/types/ashesOfWar.ts'
import type { ArmorEntry } from '../../../data/types/armor.ts'
import type { BossEntry } from '../../../data/types/bosses.ts'
import type { LocationEntry } from '../../../data/types/locations.ts'
import type { NpcEntry } from '../../../data/types/npcs.ts'
import type { OriginEntry } from '../../../data/types/origins.ts'
import type { SpellEntry } from '../../../data/types/spells.ts'
import type { SpiritAshEntry } from '../../../data/types/spiritAshes.ts'
import type { TalismanEntry } from '../../../data/types/talismans.ts'
import type { AcquisitionDerived } from '../../../data/types/common.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import { entityRoute } from '../../../router/entityRoute.ts'
import { armorSlotLabel } from '../../../ui/armorSlots.ts'
import { formatInt } from '../../../ui/format.ts'
import { ATTRIBUTE_LABELS, DAMAGE_LABELS } from '../../../ui/labels.ts'
import type { EstimateConfidence, ReliabilityKey } from '../../../ui/labels.ts'
import { NO_SKILL_TYPE, skillTypeLabel } from '../../../ui/skillTypes.ts'

// ---------------------------------------------------------------------------------------------
// Catalogues : titres, noms, onglets

/** Famille de catalogues partageant une même vue à onglets (armes par classe de famille, objets par type). */
export type CatalogFamily = 'weapons' | 'items'

/** Libellés d'un catalogue. */
export interface CatalogInfo {
  readonly key: CatalogKey
  /** Titre de l'écran (« Armes de mêlée »). */
  readonly title: string
  /** Nom du groupe pour le fil d'Ariane (« Armes », « Objets » ; le titre sinon). */
  readonly group: string
  /** Libellé de l'onglet de la famille, si le catalogue en a une. */
  readonly tab: string | null
  readonly family: CatalogFamily | null
  /** Une entité au singulier (« arme ») et au pluriel (« armes »), minuscules. */
  readonly singular: string
  readonly plural: string
  /** Genre grammatical du nom, pour « Aucune arme » et « Aucun sort ». */
  readonly feminine: boolean
  /** Genre d'entité des lignes (nom de la route de leur fiche). */
  readonly kind: EntityKind
  /** Phrase qui suit le nombre d'entités, sous le titre (« Valeurs de base à +0. »). */
  readonly note: string | null
}

type InfoInput = Pick<CatalogInfo, 'singular' | 'plural' | 'feminine'> & Partial<Pick<CatalogInfo, 'group' | 'tab' | 'family' | 'note'>>

const INFO_INPUT: Readonly<Record<CatalogKey, InfoInput>> = {
  'weapons:melee': { singular: 'arme', plural: 'armes', feminine: true, group: 'Armes', tab: 'Mêlée', family: 'weapons', note: 'Valeurs de base à +0.' },
  'weapons:distance': { singular: 'arme', plural: 'armes', feminine: true, group: 'Armes', tab: 'Distance et catalyseurs', family: 'weapons', note: 'Valeurs de base à +0.' },
  'weapons:boucliers': { singular: 'arme', plural: 'armes', feminine: true, group: 'Armes', tab: 'Boucliers et torches', family: 'weapons', note: 'Valeurs de base à +0.' },
  ashes: { singular: 'cendre de guerre', plural: 'cendres de guerre', feminine: true },
  armors: { singular: 'armure', plural: 'armures', feminine: true, note: 'Absorptions en pourcentage, poids et équilibre de chaque pièce.' },
  talismans: { singular: 'talisman', plural: 'talismans', feminine: false },
  spells: { singular: 'sort', plural: 'sorts', feminine: false },
  spirits: { singular: 'cendre d’esprit', plural: 'cendres d’esprit', feminine: true },
  'items:outils': { singular: 'objet', plural: 'objets', feminine: false, group: 'Objets', tab: 'Outils', family: 'items' },
  'items:amelioration': { singular: 'objet', plural: 'objets', feminine: false, group: 'Objets', tab: 'Amélioration', family: 'items' },
  'items:cles': { singular: 'objet', plural: 'objets', feminine: false, group: 'Objets', tab: 'Objets clés', family: 'items' },
  'items:artisanat': { singular: 'objet', plural: 'objets', feminine: false, group: 'Objets', tab: 'Artisanat', family: 'items' },
  'items:munitions': { singular: 'objet', plural: 'objets', feminine: false, group: 'Objets', tab: 'Munitions', family: 'items' },
  bosses: { singular: 'boss', plural: 'boss', feminine: false },
  locations: { singular: 'lieu', plural: 'lieux', feminine: false },
  npcs: { singular: 'PNJ', plural: 'PNJ', feminine: false },
  origins: { singular: 'origine', plural: 'origines', feminine: true },
}

/** Libellés de chaque catalogue ; le titre est celui du jeu de données (`DATASETS`), seul registre des libellés français. */
export const CATALOG_INFO: Readonly<Record<CatalogKey, CatalogInfo>> = Object.fromEntries(
  CATALOG_KEYS.map((key) => {
    const dataset = DATASETS[CATALOG_SPECS[key].datasets[0] as keyof typeof DATASETS]
    const input = INFO_INPUT[key]
    const info: CatalogInfo = {
      key,
      title: dataset.label,
      group: input.group ?? dataset.label,
      tab: input.tab ?? null,
      family: input.family ?? null,
      singular: input.singular,
      plural: input.plural,
      feminine: input.feminine,
      kind: dataset.kind,
      note: input.note ?? null,
    }
    return [key, info]
  }),
) as Record<CatalogKey, CatalogInfo>

/**
 * Catalogues d'une même famille (les onglets de l'écran), dans l'ordre du registre.
 * @param key Catalogue affiché.
 * @returns Les catalogues de sa famille, ou une liste vide s'il n'a pas de famille.
 */
export function familyOf(key: CatalogKey): readonly CatalogKey[] {
  const family = CATALOG_INFO[key].family
  return family === null ? [] : CATALOG_KEYS.filter((k) => CATALOG_INFO[k].family === family)
}

/**
 * Emplacement d'un catalogue : la route de liste de son jeu de données et son filtre de requête (`famille`, `type`).
 * @param key Catalogue.
 * @returns Une route nommée utilisable par `RouterLink` et `router.push`.
 */
export function catalogRoute(key: CatalogKey): RouteLocationRaw {
  const { routes } = DATASETS[CATALOG_SPECS[key].datasets[0] as keyof typeof DATASETS]
  return routes.query ? { name: routes.list, query: { [routes.query.name]: routes.query.value } } : { name: routes.list }
}

/**
 * Emplacement de la fiche d'une ligne du catalogue (les fiches non construites mènent à leur vue provisoire).
 * @param key Catalogue.
 * @param row Ligne.
 * @returns La route de la fiche.
 */
export function rowRoute(key: CatalogKey, row: CatalogRow): RouteLocationRaw {
  return entityRoute(rowRef(key, row))
}

/**
 * Référence d'entité d'une ligne de catalogue (clé des getters du store `analysis` : `requirementsOf`, `scoreOf`, `stageOf`).
 * @param key Catalogue.
 * @param row Ligne.
 * @returns La référence `genre:id`.
 */
export function rowRef(key: CatalogKey, row: CatalogRow): EntityRef {
  return entityRef(CATALOG_INFO[key].kind, row.id)
}

/**
 * Phrase sous le titre : nombre d'entités, répartition par contenu quand le fichier la donne, puis la remarque du catalogue.
 * @param key Catalogue.
 * @param total Nombre d'entités du catalogue.
 * @param counts Répartition par source (`meta.counts_by_source` du fichier) ; absente ou illisible : pas de répartition.
 * @returns Par exemple « 335 armes : 250 du jeu de base, 79 de Shadow of the Erdtree, 6 du Tarnished Pack. Valeurs de base à +0. ».
 */
export function catalogIntro(key: CatalogKey, total: number, counts: unknown): string {
  const info = CATALOG_INFO[key]
  const head = `${formatInt(total)} ${total > 1 ? info.plural : info.singular}`
  const parts = sourceParts(counts)
  const text = parts.length > 1 ? `${head} : ${parts.join(', ')}.` : `${head}.`
  return info.note ? `${text} ${info.note}` : text
}

/** Libellé français d'une part de la répartition par contenu. */
const SOURCE_PART: Readonly<Record<string, string>> = {
  'Base game': 'du jeu de base',
  'Shadow of the Erdtree': 'de Shadow of the Erdtree',
  'Tarnished Pack': 'du Tarnished Pack',
  'Base game + Shadow of the Erdtree': 'communs au jeu de base et à l’extension',
}

function sourceParts(counts: unknown): string[] {
  if (typeof counts !== 'object' || counts === null) return []
  const record = counts as Record<string, unknown>
  return Object.keys(SOURCE_PART).flatMap((source) => {
    const n = Object.hasOwn(record, source) ? record[source] : undefined
    return typeof n === 'number' && n > 0 ? [`${formatInt(n)} ${SOURCE_PART[source]}`] : []
  })
}

// ---------------------------------------------------------------------------------------------
// Colonnes

/** Contenu composite d'une cellule ; absent = valeur simple (`CxValue`). */
export type CellKind =
  | 'name'
  | 'text'
  | 'attack'
  | 'scaling'
  | 'requirements'
  | 'spell-requirements'
  | 'skill'
  | 'passive'
  | 'upgrade'
  | 'obtention'

/** Colonne d'un catalogue. */
export interface CatalogColumn {
  /** Identifiant (clé de tri du registre, clé des préférences). */
  readonly id: string
  /** Libellé de l'en-tête. */
  readonly label: string
  /** Libellé dans le menu « Colonnes » si l'en-tête est abrégé. */
  readonly menuLabel?: string
  /** Libellé dans « Trier par » si l'en-tête est un nom d'entité (« Arme » → « Nom »). */
  readonly sortLabel?: string
  readonly align?: 'left' | 'right'
  readonly format?: 'int' | 'decimal' | 'percent' | 'weight' | 'signed'
  readonly digits?: number
  readonly cell?: CellKind
  /** Valeur simple de la cellule (`null` = non documenté). */
  readonly value?: (row: CatalogRow) => number | string | null | undefined
  /** Colonne affichée tant que l'utilisateur n'a pas choisi. */
  readonly defaultVisible: boolean
  /** Sens du premier tri depuis « Trier par » : croissant pour un texte, décroissant pour un nombre. */
  readonly firstSort: 'asc' | 'desc'
  /** Ligne de la carte de la grille (dans l'ordre des colonnes) et son icône ; absent : la carte ne l'affiche pas. */
  readonly card?: { readonly icon?: string }
}

/** Colonne telle qu'elle s'écrit : `firstSort` se déduit de l'alignement. */
type ColumnInput = Omit<CatalogColumn, 'firstSort' | 'defaultVisible'> & { defaultVisible?: boolean; firstSort?: 'asc' | 'desc' }

/**
 * Lecteur de ligne typé : donne à la fonction son vrai type de ligne (`ArmorEntry`…) alors que les catalogues manipulent des `CatalogRow`.
 * Le seul élargissement de type est ici ; les lignes du store d'un catalogue sont bien de ce type (comme `spec<R>` du registre).
 * @param get Lecture du champ dans la ligne typée.
 * @returns La même lecture, sur une `CatalogRow`.
 */
function read<R extends CatalogRow, V>(get: (row: R) => V): (row: CatalogRow) => V {
  return get as unknown as (row: CatalogRow) => V
}

function column(input: ColumnInput): CatalogColumn {
  return { ...input, defaultVisible: input.defaultVisible ?? true, firstSort: input.firstSort ?? (input.align === 'right' ? 'desc' : 'asc') }
}

const nameColumn = (label: string): CatalogColumn => column({ id: 'name', label, sortLabel: 'Nom', cell: 'name', defaultVisible: true })

const obtentionColumn = (defaultVisible = true): CatalogColumn =>
  column({ id: 'obtention', label: 'Obtention', cell: 'obtention', defaultVisible, card: { icon: 'map' } })

const WEAPON_COLUMNS: readonly CatalogColumn[] = [
  nameColumn('Arme'),
  column({ id: 'weight', label: 'Poids', align: 'right', format: 'weight', value: read<WeaponEntry, number>((r) => r.weight) }),
  column({ id: 'attack', label: 'Attaque +0', cell: 'attack', firstSort: 'desc', card: {} }),
  column({ id: 'scaling', label: 'Scaling', cell: 'scaling', card: {} }),
  column({ id: 'requirements', label: 'Prérequis', cell: 'requirements', card: {} }),
  column({ id: 'skill', label: 'Compétence', cell: 'skill', defaultVisible: false, card: { icon: 'skill' } }),
  column({ id: 'passive', label: 'Passif', cell: 'passive', card: { icon: 'info' } }),
  column({ id: 'upgrade', label: 'Amélioration', cell: 'upgrade', card: { icon: 'stone' } }),
  // Masquée par défaut, comme Compétence : le tableau tient sans défilement horizontal à 1440 px (D43, note `spec-catalog`).
  obtentionColumn(false),
]

const NEGATION_KEYS_SHOWN = ['physical', 'strike', 'slash', 'pierce', 'magic', 'fire', 'lightning', 'holy'] as const

const RESISTANCES = [
  { id: 'immunity', label: 'Immunity' },
  { id: 'robustness', label: 'Robustness' },
  { id: 'focus', label: 'Focus' },
  { id: 'vitality', label: 'Vitality' },
] as const

const ARMOR_COLUMNS: readonly CatalogColumn[] = [
  nameColumn('Armure'),
  column({ id: 'slot', label: 'Emplacement', value: read<ArmorEntry, string>((r) => armorSlotLabel(r.slot)) }),
  column({ id: 'weight', label: 'Poids', align: 'right', format: 'weight', value: read<ArmorEntry, number | null>((r) => r.weight) }),
  column({ id: 'poise', label: 'Équilibre', align: 'right', value: read<ArmorEntry, number>((r) => r.poise) }),
  ...NEGATION_KEYS_SHOWN.map((k) =>
    column({
      id: k,
      label: DAMAGE_LABELS[k],
      menuLabel: `Absorption : ${DAMAGE_LABELS[k]}`,
      align: 'right',
      format: 'percent',
      digits: 1,
      value: read<ArmorEntry, number | null>((r) => r.damage_negation[k]),
    }),
  ),
  ...RESISTANCES.map((res) =>
    column({
      id: res.id,
      label: res.label,
      menuLabel: `Résistance : ${res.label}`,
      align: 'right',
      defaultVisible: false,
      value: read<ArmorEntry, number>((r) => r.resistance[res.id]),
    }),
  ),
  obtentionColumn(false),
]

const SPELL_COLUMNS: readonly CatalogColumn[] = [
  nameColumn('Sort'),
  column({ id: 'type', label: 'Type', value: read<SpellEntry, string>((r) => r.type) }),
  column({ id: 'school', label: 'École', value: read<SpellEntry, string | null>((r) => r.sub_type ?? null) }),
  column({ id: 'fp', label: 'Coût en FP', align: 'right', value: read<SpellEntry, number | string>((r) => r.fp_cost) }),
  column({ id: 'slots', label: 'Emplacements', align: 'right', value: read<SpellEntry, number>((r) => r.slots_used) }),
  column({ id: 'requirements', label: 'Prérequis', cell: 'spell-requirements', card: {} }),
  column({ id: 'effect', label: 'Effet', cell: 'text', value: read<SpellEntry, string>((r) => r.effect), card: { icon: 'info' } }),
  obtentionColumn(false),
]

const effectOf = read<{ effect?: string | null; summary?: string | null } & CatalogRow, string | null>((r) => r.effect ?? r.summary ?? null)

const ITEM_COLUMNS: readonly CatalogColumn[] = [
  nameColumn('Objet'),
  column({ id: 'category', label: 'Catégorie', value: read<CatalogRow & { category: string }, string>((r) => r.category) }),
  column({ id: 'effect', label: 'Effet', cell: 'text', value: effectOf, card: { icon: 'info' } }),
  obtentionColumn(),
]

const COLUMNS: Readonly<Record<CatalogKey, readonly CatalogColumn[]>> = {
  'weapons:melee': WEAPON_COLUMNS,
  'weapons:distance': WEAPON_COLUMNS,
  'weapons:boucliers': WEAPON_COLUMNS,
  ashes: [
    nameColumn('Cendre de guerre'),
    column({ id: 'category', label: 'Catégorie', value: read<AshOfWarEntry, string>((r) => r.category) }),
    column({ id: 'affinity', label: 'Affinité', value: read<AshOfWarEntry, string>((r) => r.affinity) }),
    column({ id: 'fp', label: 'Coût en FP', align: 'right', value: read<AshOfWarEntry, number | string | null>((r) => r.fp_cost) }),
    column({ id: 'skill', label: 'Compétence', cell: 'text', value: read<AshOfWarEntry, string>((r) => r.skill), card: { icon: 'skill' } }),
    obtentionColumn(),
  ],
  armors: ARMOR_COLUMNS,
  talismans: [
    nameColumn('Talisman'),
    column({ id: 'category', label: 'Catégorie', value: read<TalismanEntry, string>((r) => r.category) }),
    column({ id: 'weight', label: 'Poids', align: 'right', format: 'weight', value: read<TalismanEntry, number>((r) => r.weight) }),
    column({ id: 'effect', label: 'Effet', cell: 'text', value: read<TalismanEntry, string>((r) => r.effect), card: { icon: 'info' } }),
    obtentionColumn(),
  ],
  spells: SPELL_COLUMNS,
  spirits: [
    nameColumn('Cendre d’esprit'),
    column({ id: 'category', label: 'Catégorie', value: read<SpiritAshEntry, string>((r) => r.category) }),
    column({ id: 'fp', label: 'Coût en FP', align: 'right', value: read<SpiritAshEntry, number | null>((r) => r.fp_cost ?? null) }),
    column({ id: 'hp', label: 'Coût en PV', align: 'right', value: read<SpiritAshEntry, number | null>((r) => r.hp_cost ?? null) }),
    column({ id: 'effect', label: 'Effet', cell: 'text', value: read<SpiritAshEntry, string | null>((r) => r.effect ?? r.summary), card: { icon: 'info' } }),
    obtentionColumn(),
  ],
  'items:outils': ITEM_COLUMNS,
  'items:amelioration': ITEM_COLUMNS,
  'items:cles': ITEM_COLUMNS,
  'items:artisanat': ITEM_COLUMNS,
  'items:munitions': ITEM_COLUMNS,
  bosses: [
    nameColumn('Boss'),
    column({ id: 'tier', label: 'Rang', value: read<BossEntry, string | null>((r) => (r.tier.length > 0 ? r.tier.join(', ') : null)) }),
    column({
      id: 'region',
      label: 'Région',
      value: read<BossEntry, string | null>((r) => {
        const regions = [...new Set(r.encounters.flatMap((e) => e.regions))]
        return regions.length > 0 ? regions.join(', ') : null
      }),
    }),
    column({ id: 'encounters', label: 'Rencontres', align: 'right', value: read<BossEntry, number>((r) => r.encounters.length) }),
  ],
  locations: [
    nameColumn('Lieu'),
    column({ id: 'kind', label: 'Type', value: read<LocationEntry, string | null>((r) => r.kind) }),
    column({ id: 'region', label: 'Région', value: read<LocationEntry, string | null>((r) => r.region) }),
  ],
  npcs: [nameColumn('PNJ'), column({ id: 'region', label: 'Région', value: read<NpcEntry, string | null>((r) => r.listed_region) })],
  origins: [
    nameColumn('Origine'),
    column({ id: 'level', label: 'Niveau', align: 'right', value: read<OriginEntry, number>((r) => r.level) }),
    column({ id: 'hp', label: 'PV', align: 'right', value: read<OriginEntry, number>((r) => r.base_stats.hp) }),
    column({ id: 'fp', label: 'FP', align: 'right', value: read<OriginEntry, number>((r) => r.base_stats.fp) }),
    column({ id: 'stamina', label: 'Endurance (jauge)', align: 'right', value: read<OriginEntry, number>((r) => r.base_stats.stamina) }),
    column({ id: 'equipLoad', label: 'Poids max.', align: 'right', format: 'decimal', digits: 1, value: read<OriginEntry, number>((r) => r.base_stats.equip_load) }),
    ...ATTRIBUTE_KEYS.map((k) =>
      column({
        id: k,
        label: ATTRIBUTE_LABELS[k].abbr,
        menuLabel: ATTRIBUTE_LABELS[k].name,
        align: 'right',
        value: read<OriginEntry, number>((r) => r.attributes[ORIGIN_ATTRIBUTE_FIELD[k]]),
      }),
    ),
  ],
}

/**
 * Colonnes d'un catalogue, dans l'ordre d'affichage ; la première est toujours le nom.
 * @param key Catalogue.
 * @returns Les colonnes.
 */
export function columnsOf(key: CatalogKey): readonly CatalogColumn[] {
  return COLUMNS[key]
}

/**
 * Colonnes affichées : le choix mémorisé, sinon les colonnes par défaut. Le nom reste toujours affiché ; un identifiant inconnu est ignoré.
 * @param key Catalogue.
 * @param chosen Identifiants choisis par l'utilisateur (préférence `catalogColumns`), ou `undefined` s'il n'a rien choisi.
 * @returns Les colonnes à afficher, dans l'ordre du catalogue.
 */
export function visibleColumns(key: CatalogKey, chosen: readonly string[] | undefined): readonly CatalogColumn[] {
  const all = columnsOf(key)
  if (chosen === undefined) return all.filter((c) => c.defaultVisible)
  const wanted = new Set(chosen)
  return all.filter((c) => c.id === 'name' || wanted.has(c.id))
}

/**
 * Identifiants des colonnes affichées par défaut, hors nom (valeur de « Colonnes par défaut »).
 * @param key Catalogue.
 * @returns Les identifiants.
 */
export function defaultColumnIds(key: CatalogKey): string[] {
  return columnsOf(key).filter((c) => c.defaultVisible && c.id !== 'name').map((c) => c.id)
}

/** Critère de « Trier par » : colonne du registre et son premier sens. */
export interface SortChoice {
  readonly column: string
  readonly label: string
  readonly first: 'asc' | 'desc'
}

/**
 * Critères proposés par « Trier par » : toutes les colonnes triables du catalogue (même masquées) et, pour les armes, la classe.
 * @param key Catalogue.
 * @returns Les critères, nom en premier.
 */
export function sortChoices(key: CatalogKey): readonly SortChoice[] {
  const accessors = CATALOG_SPECS[key].columns
  const out: SortChoice[] = columnsOf(key)
    .filter((c) => Object.hasOwn(accessors, c.id))
    .map((c) => ({ column: c.id, label: c.sortLabel ?? c.menuLabel ?? c.label, first: c.firstSort }))
  if (CATALOG_INFO[key].family === 'weapons') out.push({ column: 'category', label: 'Classe', first: 'asc' })
  return out
}

// ---------------------------------------------------------------------------------------------
// Champs affichés par les cellules

/** Dégâts d'une arme à +0 : un type et sa valeur. */
export interface AttackPart {
  readonly key: DamageKey
  readonly value: number
}

/**
 * Dégâts non nuls d'une arme à +0 (valeurs de base du wiki, jamais recalculées).
 * @param row Arme.
 * @returns Les types de dégâts à valeur positive, dans l'ordre des données (physique, magie, feu, foudre, sacré).
 */
export function attackParts(row: CatalogRow): readonly AttackPart[] {
  const power = (row as unknown as WeaponEntry).attack_power
  return DAMAGE_KEYS.flatMap((key) => (power[key] > 0 ? [{ key, value: power[key] }] : []))
}

/**
 * Info-bulle d'une puce de dégâts : « Physique 115 à +0 ».
 * @param part Dégâts.
 * @returns Le texte.
 */
export function attackTitle(part: AttackPart): string {
  return `${DAMAGE_LABELS[part.key]} ${part.value} à +0`
}

/** Effets passifs d'une arme : accumulations de statut chiffrées, ou textes quand aucun statut ne les dit déjà. */
export interface PassiveParts {
  readonly statuses: readonly { readonly key: StatusKey; readonly value: number }[]
  readonly texts: readonly string[]
}

/**
 * Effets passifs d'une arme (même règle que la facette « Effet passif », décision D30 : le statut vient de `status_buildup`).
 * @param row Arme.
 * @returns Les statuts non nuls ; les textes de `passive_effects` seulement s'il n'y a aucun statut.
 */
export function passiveParts(row: CatalogRow): PassiveParts {
  const weapon = row as unknown as WeaponEntry
  const statuses = STATUS_KEYS.flatMap((key) => {
    const value = weapon.status_buildup?.[key]
    return value === undefined || value === 0 ? [] : [{ key, value }]
  })
  return { statuses, texts: statuses.length > 0 ? [] : weapon.passive_effects }
}

/** Compétence d'une arme. */
export interface SkillParts {
  readonly name: string | null
  readonly type: string
  /** Vrai pour une arme sans compétence (`skill.type` = « No skill ») : la cellule dit « Aucune », pas « Non documenté ». */
  readonly none: boolean
}

/**
 * Compétence d'une arme : nom (en anglais, tel que dans les données) et type en français.
 * @param row Arme.
 * @returns Le nom (`null` = non documenté) et le type ; un type inconnu reste tel que dans les données.
 */
export function skillParts(row: CatalogRow): SkillParts {
  const { skill } = row as unknown as WeaponEntry
  return { name: skill.name, type: skillTypeLabel(skill.type), none: skill.type === NO_SKILL_TYPE }
}

/** Amélioration d'une arme telle que l'affiche la cellule. */
export interface UpgradeParts {
  /** « Pierres normales, +25 » ; `null` si le wiki ne la donne pas. */
  readonly text: string | null
  /** Forme courte du tableau : « Normales, +25 ». */
  readonly short: string | null
  /** Niveau de fiabilité du badge ; `null` : pas de badge (arme non améliorable, valeur non documentée). */
  readonly kind: ReliabilityKey | null
  /** Confiance d'une estimation. */
  readonly confidence: EstimateConfidence | null
  /** Info-bulle du badge : base de l'estimation, ou raison d'une incohérence. */
  readonly tip: string | undefined
}

const MATERIAL_LABELS: Readonly<Record<string, { full: string; short: string }>> = {
  'Smithing Stones': { full: 'Pierres normales', short: 'Normales' },
  'Somber Smithing Stones': { full: 'Pierres sombres', short: 'Sombres' },
}

/**
 * Amélioration d'une arme : pierres, niveau maximal et badge de fiabilité (architecture § 10.4 : Wiki, Wiki (déduit), Estimation avec sa confiance, Incohérence).
 * @param row Arme.
 * @returns Le texte et le badge ; une valeur non documentée n'a ni texte ni badge (la cellule affiche « Non documenté »).
 */
export function upgradeParts(row: CatalogRow): UpgradeParts {
  const weapon = row as unknown as WeaponEntry
  const u = weapon.derived.upgrade
  if (u.reliability === 'not-upgradeable') return { text: 'Non améliorable', short: 'Non améliorable', kind: null, confidence: null, tip: undefined }
  if (u.material === null) return { text: null, short: null, kind: null, confidence: null, tip: undefined }
  const label = MATERIAL_LABELS[u.material] ?? { full: u.material, short: u.material }
  const level = u.maxLevel === null ? '' : `, +${u.maxLevel}`
  const text = `${label.full}${level}`
  const short = `${label.short}${level}`
  const incoherent = weapon.derived.inconsistent.find((i) => i.field === 'upgrade.material')
  if (incoherent) {
    const tip = `Incohérence du wiki sur le matériau : ${incoherent.reason ?? 'pages en désaccord'}. La valeur de la liste « Armaments by Bolstering Material » est retenue.`
    return { text, short, kind: 'inconsistent', confidence: null, tip }
  }
  if (u.reliability === 'estimate') return { text, short, kind: 'estimate', confidence: u.confidence ?? 'medium', tip: u.basis }
  return { text, short, kind: u.reliability === 'deduced' ? 'deduced' : 'wiki', confidence: null, tip: undefined }
}

/** Obtention : régions retenues et première façon d'obtenir. */
export interface ObtentionParts {
  readonly regions: string | null
  readonly how: string | null
}

/**
 * Obtention d'une entité : régions déduites (`derived.regions`) et première acquisition, telles que dans les données.
 * @param row Entité qui a des acquisitions (arme, objet, armure, sort…).
 * @returns Les régions et le texte « méthode · lieu » (ou le premier détail si la méthode et le lieu manquent) ; `null` pour ce qui manque.
 */
export function obtentionParts(row: CatalogRow): ObtentionParts {
  const entry = row as unknown as { derived: AcquisitionDerived; acquisition: readonly { method: string | null; location: string | null; details: readonly string[] }[] }
  const regions = entry.derived.regions.values
  const first = entry.acquisition[0]
  const how = first ? ([first.method, first.location].filter((x): x is string => x !== null && x !== '').join(' · ') || (first.details[0] ?? '')) : ''
  return { regions: regions.length > 0 ? regions.join(', ') : null, how: how === '' ? null : how }
}

/**
 * Lettres de scaling d'une arme à +0 (`null` = pas de scaling, donc pas de puce : décision D17).
 * @param row Arme.
 * @returns Les lettres par attribut, telles que dans les données.
 */
export function weaponScaling(row: CatalogRow): WeaponEntry['scaling'] {
  return (row as unknown as WeaponEntry).scaling
}

/**
 * Classe d'une arme et son icône du sprite (une classe sans icône n'en a pas).
 * @param row Arme.
 * @returns La classe, en anglais comme dans les données.
 */
export function weaponClass(row: CatalogRow): string {
  return (row as unknown as WeaponEntry).category
}

/**
 * Hauteur d'une ligne du tableau : 52 px quand le nom porte la classe en dessous (armes), 34 px sinon.
 * @param key Catalogue.
 * @returns La hauteur en pixels (la virtualisation de `CxDataTable` en dépend : le contenu de chaque case tient dedans).
 */
export function rowHeightOf(key: CatalogKey): number {
  return CATALOG_INFO[key].family === 'weapons' ? 52 : 34
}
