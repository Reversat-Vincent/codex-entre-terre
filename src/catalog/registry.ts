// Registre des catalogues (docs/architecture.md § 6, § 9) : pour chaque catalogue de l'application, ses jeux de données, ses facettes et ses colonnes triables.
// Logique pure : aucune Vue, aucun store. Le store `catalogs` s'appuie dessus ; les routes nomment les catalogues d'après `DATASETS[...].routes`.

import { DAMAGE_KEYS, ATTRIBUTE_KEYS, GRADES, ORIGIN_ATTRIBUTE_FIELD, WEAPON_ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { DatasetKey } from '../data/datasets.ts'
import { normalizeText } from '../data/slug.ts'
import type { AshOfWarEntry } from '../data/types/ashesOfWar.ts'
import type { ArmorEntry } from '../data/types/armor.ts'
import type { BossEntry } from '../data/types/bosses.ts'
import type { LocationEntry } from '../data/types/locations.ts'
import type { NpcEntry } from '../data/types/npcs.ts'
import type { OriginEntry } from '../data/types/origins.ts'
import type { SpellEntry } from '../data/types/spells.ts'
import type { SpiritAshEntry } from '../data/types/spiritAshes.ts'
import type { TalismanEntry } from '../data/types/talismans.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { checkRequirements } from '../engine/requirements.ts'
import type { RequirementWeapon } from '../engine/requirements.ts'
import type { Attributes, Hands, WeaponFileKey } from '../engine/types.ts'
import { BOSS_TIER_ORDER, armorCatalog, bossCatalog, genericCatalog, locationCatalog, spellCatalog, spellFpCost, weaponCatalog } from './facets.ts'
import type { CatalogDef, SpellRow, WeaponRow } from './facets.ts'
import type { SortAccessors, SortValue } from './sort.ts'

/** Clés des catalogues : armes par famille, objets par type, un catalogue pour chacun des autres genres. */
export const CATALOG_KEYS = [
  'weapons:melee',
  'weapons:distance',
  'weapons:boucliers',
  'ashes',
  'armors',
  'talismans',
  'spells',
  'spirits',
  'items:outils',
  'items:amelioration',
  'items:cles',
  'items:artisanat',
  'items:munitions',
  'bosses',
  'locations',
  'npcs',
  'origins',
] as const

/** Clé d'un catalogue. */
export type CatalogKey = (typeof CATALOG_KEYS)[number]

/** Ce que tout catalogue sait lire d'une ligne : identifiant, noms et source (toutes les entrées préparées de `data/` les portent). */
export interface CatalogRow {
  readonly id: string
  readonly name: string
  readonly source: string
  readonly derived: { readonly displayName: string }
}

/** Profil actif lu par les prédicats « Prérequis atteints » : attributs et posture (une ou deux mains). */
export interface ProfileContext {
  readonly attributes: Attributes
  readonly hands: Hands
}

/**
 * Description d'un catalogue.
 * Les lignes sont typées `CatalogRow` à ce niveau : chaque entrée du registre est construite par `spec<R>` avec son vrai type de ligne.
 */
export interface CatalogSpec {
  readonly key: CatalogKey
  /** Jeux de données dont les entrées forment le catalogue, dans l'ordre. */
  readonly datasets: readonly DatasetKey[]
  /**
   * Facettes du catalogue.
   * @param profile Lecture du profil actif, appelée seulement par les prédicats qui en ont besoin (le catalogue n'en dépend donc que s'il les utilise).
   */
  readonly def: (profile: () => ProfileContext) => CatalogDef<CatalogRow>
  /** Colonnes triables : identifiant de colonne → valeur de la ligne ; `null` = non documenté (toujours en dernier). */
  readonly columns: SortAccessors<CatalogRow>
}

/**
 * Construit une description de catalogue en gardant le type de ligne le temps de la déclarer.
 * Le seul élargissement de type est ici : `CatalogDef<R>` et `SortAccessors<R>` ne se substituent pas à `CatalogRow` par le compilateur
 * (paramètres de fonctions), alors que les lignes fournies par le store sont bien des `R`.
 */
function spec<R extends CatalogRow>(s: {
  key: CatalogKey
  datasets: readonly DatasetKey[]
  def: (profile: () => ProfileContext) => CatalogDef<R>
  columns: SortAccessors<R>
}): CatalogSpec {
  return s as unknown as CatalogSpec
}

// ---------------------------------------------------------------------------------------------
// Colonnes triables

const nameColumns = {
  name: (r: CatalogRow): SortValue => r.derived.displayName,
  source: (r: CatalogRow): SortValue => r.source,
}

/** Rang numérique d'une lettre de scaling : plus grand = meilleur (S > A > … > E) ; `null` = pas de scaling. */
function gradeValue(grade: string | null): SortValue {
  if (grade === null) return null
  const i = (GRADES as readonly string[]).indexOf(grade)
  return i < 0 ? null : GRADES.length - i
}

/** Rang d'un rang de boss : 0 = le plus élevé (Gods), d'après `BOSS_TIER_ORDER` ; le rang le plus élevé du boss s'il en a plusieurs. */
function bossTierRank(tiers: readonly string[]): SortValue {
  const ranks = tiers.map((t) => (BOSS_TIER_ORDER as readonly string[]).indexOf(t)).filter((i) => i >= 0)
  return ranks.length > 0 ? Math.min(...ranks) : null
}

const weaponColumns: SortAccessors<WeaponEntry> = {
  ...nameColumns,
  category: (r) => r.category,
  weight: (r) => r.weight,
  /** Somme des cinq types de dégâts à +0 (valeurs de base du wiki). */
  attack: (r) => DAMAGE_KEYS.reduce((sum, k) => sum + r.attack_power[k], 0),
  physical: (r) => r.attack_power.physical,
  critical: (r) => r.attack_power.critical,
  skill: (r) => r.skill.name,
  upgrade: (r) => r.derived.upgrade.material,
  maxLevel: (r) => r.derived.upgrade.maxLevel,
  ...Object.fromEntries(WEAPON_ATTRIBUTE_KEYS.map((k) => [`req-${k}`, (r: WeaponEntry): SortValue => r.requirements[k]])),
  ...Object.fromEntries(WEAPON_ATTRIBUTE_KEYS.map((k) => [`scaling-${k}`, (r: WeaponEntry): SortValue => gradeValue(r.scaling[k])])),
}

const armorColumns: SortAccessors<ArmorEntry> = {
  ...nameColumns,
  slot: (r) => r.slot,
  weight: (r) => r.weight,
  poise: (r) => r.poise,
  ...Object.fromEntries((['physical', 'strike', 'slash', 'pierce', 'magic', 'fire', 'lightning', 'holy'] as const).map((k) => [k, (r: ArmorEntry): SortValue => r.damage_negation[k]])),
  ...Object.fromEntries((['immunity', 'robustness', 'focus', 'vitality'] as const).map((k) => [k, (r: ArmorEntry): SortValue => r.resistance[k]])),
}

const spellColumns: SortAccessors<SpellEntry> = {
  ...nameColumns,
  type: (r) => r.type,
  school: (r) => r.sub_type ?? null,
  fp: (r) => spellFpCost(r.fp_cost),
  slots: (r) => r.slots_used,
  int: (r) => r.requirements.int,
  fai: (r) => r.requirements.fai,
  arc: (r) => r.requirements.arc,
}

const originColumns: SortAccessors<OriginEntry> = {
  ...nameColumns,
  level: (r) => r.level,
  hp: (r) => r.base_stats.hp,
  fp: (r) => r.base_stats.fp,
  stamina: (r) => r.base_stats.stamina,
  equipLoad: (r) => r.base_stats.equip_load,
  ...Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, (r: OriginEntry): SortValue => r.attributes[ORIGIN_ATTRIBUTE_FIELD[k]]])),
}

// ---------------------------------------------------------------------------------------------
// Prédicats « Prérequis atteints »

/**
 * Prédicat « Prérequis atteints » d'une arme : `checkRequirements` (calculs.md, « Prérequis comparés au profil ») sur les attributs et la posture du profil.
 * Une arme sans prérequis non nul est atteinte (`allMet` d'une liste vide).
 */
function weaponMeets(file: WeaponFileKey, profile: () => ProfileContext): (row: WeaponRow) => boolean {
  return (row) => {
    const p = profile()
    // Les lignes du catalogue sont des `WeaponEntry` : `WeaponRow` n'en décrit que les champs des facettes.
    return checkRequirements(row as WeaponRow & RequirementWeapon, p.attributes, p.hands, { file }).value?.allMet === true
  }
}

/** Prédicat « Prérequis atteints » d'un sort : INT, FAI et ARC du profil au moins égaux à ceux du sort (pas de bonus de posture pour les sorts). */
function spellMeets(profile: () => ProfileContext): (row: SpellRow) => boolean {
  return (row) => {
    const { attributes } = profile()
    return attributes.int >= row.requirements.int && attributes.fai >= row.requirements.fai && attributes.arc >= row.requirements.arc
  }
}

// ---------------------------------------------------------------------------------------------
// Registre

function weaponSpec(key: 'weapons:melee' | 'weapons:distance' | 'weapons:boucliers', file: WeaponFileKey): CatalogSpec {
  return spec<WeaponEntry>({
    key,
    datasets: [file],
    def: (profile) => weaponCatalog({ meetsRequirements: weaponMeets(file, profile) }),
    columns: weaponColumns,
  })
}

const itemColumns: SortAccessors<CatalogRow & { category: string }> = { ...nameColumns, category: (r) => r.category }

function itemSpec(key: CatalogKey, dataset: DatasetKey): CatalogSpec {
  return spec<CatalogRow & { category: string }>({ key, datasets: [dataset], def: () => genericCatalog(true), columns: itemColumns })
}

/** Les catalogues de l'application, par clé. */
export const CATALOG_SPECS: Readonly<Record<CatalogKey, CatalogSpec>> = {
  'weapons:melee': weaponSpec('weapons:melee', 'melee_armaments'),
  'weapons:distance': weaponSpec('weapons:distance', 'ranged_weapons_catalysts'),
  'weapons:boucliers': weaponSpec('weapons:boucliers', 'shields_torches'),
  ashes: spec<AshOfWarEntry>({
    key: 'ashes',
    datasets: ['ashes_of_war'],
    def: () => genericCatalog(true),
    columns: { ...nameColumns, category: (r) => r.category, affinity: (r) => r.affinity, fp: (r) => (r.fp_cost === null ? null : spellFpCost(r.fp_cost)) },
  }),
  armors: spec<ArmorEntry>({ key: 'armors', datasets: ['armor'], def: () => armorCatalog(), columns: armorColumns }),
  talismans: spec<TalismanEntry>({
    key: 'talismans',
    datasets: ['talismans'],
    def: () => genericCatalog(true),
    columns: { ...nameColumns, category: (r) => r.category, weight: (r) => r.weight },
  }),
  spells: spec<SpellEntry>({ key: 'spells', datasets: ['spells'], def: (profile) => spellCatalog({ meetsRequirements: spellMeets(profile) }), columns: spellColumns }),
  spirits: spec<SpiritAshEntry>({
    key: 'spirits',
    datasets: ['spirit_ashes'],
    def: () => genericCatalog(true),
    columns: { ...nameColumns, category: (r) => r.category, fp: (r) => r.fp_cost ?? null, hp: (r) => r.hp_cost ?? null },
  }),
  'items:outils': itemSpec('items:outils', 'tools'),
  'items:amelioration': itemSpec('items:amelioration', 'upgrade_materials'),
  'items:cles': itemSpec('items:cles', 'key_items'),
  'items:artisanat': itemSpec('items:artisanat', 'crafting_materials'),
  'items:munitions': itemSpec('items:munitions', 'ammunition'),
  bosses: spec<BossEntry>({
    key: 'bosses',
    datasets: ['bosses'],
    def: () => bossCatalog(),
    columns: {
      ...nameColumns,
      tier: (r) => bossTierRank(r.tier),
      region: (r) => r.encounters.flatMap((e) => e.regions)[0] ?? null,
      encounters: (r) => r.encounters.length,
    },
  }),
  locations: spec<LocationEntry>({ key: 'locations', datasets: ['locations'], def: () => locationCatalog(), columns: { ...nameColumns, kind: (r) => r.kind, region: (r) => r.region } }),
  npcs: spec<NpcEntry>({ key: 'npcs', datasets: ['npcs'], def: () => genericCatalog(false), columns: { ...nameColumns, region: (r) => r.listed_region } }),
  origins: spec<OriginEntry>({ key: 'origins', datasets: ['origins'], def: () => genericCatalog(false), columns: originColumns }),
}

/** Clé d'un catalogue d'après une route (`DATASETS[...].routes`) : nom de la route et valeur du filtre de requête (`famille`, `type`). */
const FAMILIES: Readonly<Record<string, CatalogKey>> = {
  melee: 'weapons:melee',
  distance: 'weapons:distance',
  boucliers: 'weapons:boucliers',
}
const ITEM_TYPES: Readonly<Record<string, CatalogKey>> = {
  outils: 'items:outils',
  amelioration: 'items:amelioration',
  cles: 'items:cles',
  artisanat: 'items:artisanat',
  munitions: 'items:munitions',
}

/**
 * Clé du catalogue affiché par une route de liste (docs/architecture.md § 9).
 * @param routeName Nom de la route (`weapons`, `items`, `armors`…).
 * @param queryValue Valeur du filtre de requête `famille` (armes) ou `type` (objets) ; absente ou inconnue : mêlée, outils.
 * @returns La clé, ou `null` si la route n'est pas celle d'un catalogue.
 */
export function catalogKeyOfRoute(routeName: string, queryValue?: string | null): CatalogKey | null {
  if (routeName === 'weapons') return (queryValue != null && Object.hasOwn(FAMILIES, queryValue) ? FAMILIES[queryValue] : undefined) ?? 'weapons:melee'
  if (routeName === 'items') return (queryValue != null && Object.hasOwn(ITEM_TYPES, queryValue) ? ITEM_TYPES[queryValue] : undefined) ?? 'items:outils'
  return (CATALOG_KEYS as readonly string[]).includes(routeName) && !routeName.includes(':') ? (routeName as CatalogKey) : null
}

// ---------------------------------------------------------------------------------------------
// Recherche par nom dans un catalogue

const normCache = new WeakMap<object, string>()

/** Nom normalisé d'une ligne (nom affiché et nom du fichier), mémorisé par ligne : les lignes sont figées. */
function normalizedName(row: CatalogRow): string {
  let norm = normCache.get(row)
  if (norm === undefined) {
    norm = normalizeText(row.derived.displayName === row.name ? row.name : `${row.derived.displayName} ${row.name}`)
    normCache.set(row, norm)
  }
  return norm
}

/**
 * Retient les lignes dont le nom contient tous les mots de la saisie (docs/architecture.md § 8 : `normalizeText`, tous les mots exigés ; casse, accents et apostrophes ignorés).
 * @param rows Lignes du catalogue.
 * @param text Saisie de l'utilisateur.
 * @returns Les lignes retenues, dans l'ordre d'entrée ; toutes si la saisie est vide.
 */
export function filterByName<R extends CatalogRow>(rows: readonly R[], text: string): readonly R[] {
  const words = normalizeText(text).split(' ').filter((w) => w !== '')
  if (words.length === 0) return rows
  return rows.filter((r) => {
    const norm = normalizedName(r)
    return words.every((w) => norm.includes(w))
  })
}
