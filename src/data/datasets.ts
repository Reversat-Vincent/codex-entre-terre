// Registre des jeux de données : clé, fichier source, clé de liste, genre d'entité, libellé et routes (docs/architecture.md § 3.1, § 3.3, § 9).
// Partagé en lecture par la préparation des données, le chargeur, le routeur et les catalogues ; seul le module données le modifie.

/** Clés des 18 jeux de données : noms des fichiers de data/ sans extension. */
export const DATASET_KEYS = [
  'melee_armaments',
  'ranged_weapons_catalysts',
  'shields_torches',
  'ashes_of_war',
  'armor',
  'talismans',
  'spells',
  'spirit_ashes',
  'tools',
  'upgrade_materials',
  'key_items',
  'crafting_materials',
  'ammunition',
  'bosses',
  'locations',
  'npcs',
  'origins',
  'mechanics',
] as const

/** Clé d'un jeu de données. */
export type DatasetKey = (typeof DATASET_KEYS)[number]

/** Clé d'un fichier produit dans `public/data/` (jeux de données, tables de calcul, index de recherche). */
export type FileKey = DatasetKey | 'tables' | 'search-index'

/** Toutes les clés de fichiers produits, dans l'ordre du manifeste. */
export const FILE_KEYS: readonly FileKey[] = [...DATASET_KEYS, 'tables', 'search-index']

/** Genres d'entité ; l'unicité des identifiants est vérifiée par genre (docs/architecture.md § 3.3). */
export const ENTITY_KINDS = [
  'weapon',
  'ash',
  'armor',
  'talisman',
  'spell',
  'spirit',
  'item',
  'boss',
  'location',
  'npc',
  'origin',
  'mechanic',
] as const

/** Genre d'entité. */
export type EntityKind = (typeof ENTITY_KINDS)[number]

/** Référence stable d'une entité, `genre:id` (par exemple `weapon:moonveil`) : seule forme stockée par l'application. */
export type EntityRef = `${EntityKind}:${string}`

/** Clé de liste dans le fichier d'origine de data/. */
export type ListKey = 'weapons' | 'items' | 'bosses' | 'locations' | 'npcs' | 'origins' | 'topics'

/** Nom de route d'un catalogue et de sa fiche (docs/architecture.md § 9). */
export interface DatasetRoutes {
  /** Route nommée du catalogue. */
  readonly list: string
  /** Route nommée de la fiche (paramètre `id`). */
  readonly sheet: string
  /** Chemin du catalogue. */
  readonly path: string
  /** Filtre de requête qui sélectionne ce jeu de données dans le catalogue, s'il est partagé. */
  readonly query: { readonly name: string; readonly value: string } | null
}

/** Description d'un jeu de données. */
export interface DatasetInfo {
  readonly key: DatasetKey
  /** Nom du fichier dans data/. */
  readonly file: string
  readonly listKey: ListKey
  readonly kind: EntityKind
  /** Libellé français du jeu de données (manifeste, messages de chargement). */
  readonly label: string
  readonly routes: DatasetRoutes
}

const routes = (list: string, sheet: string, path: string, query: DatasetRoutes['query'] = null): DatasetRoutes => ({
  list,
  sheet,
  path,
  query,
})

const weaponRoutes = (value: string): DatasetRoutes => routes('weapons', 'weapon', '/armes', { name: 'famille', value })
const itemRoutes = (value: string): DatasetRoutes => routes('items', 'item', '/objets', { name: 'type', value })

/** Registre des 18 jeux de données. */
export const DATASETS: Readonly<Record<DatasetKey, DatasetInfo>> = {
  melee_armaments: { key: 'melee_armaments', file: 'melee_armaments.json', listKey: 'weapons', kind: 'weapon', label: 'Armes de mêlée', routes: weaponRoutes('melee') },
  ranged_weapons_catalysts: { key: 'ranged_weapons_catalysts', file: 'ranged_weapons_catalysts.json', listKey: 'weapons', kind: 'weapon', label: 'Armes à distance et catalyseurs', routes: weaponRoutes('distance') },
  shields_torches: { key: 'shields_torches', file: 'shields_torches.json', listKey: 'weapons', kind: 'weapon', label: 'Boucliers et torches', routes: weaponRoutes('boucliers') },
  ashes_of_war: { key: 'ashes_of_war', file: 'ashes_of_war.json', listKey: 'items', kind: 'ash', label: 'Cendres de guerre', routes: routes('ashes', 'ash', '/cendres-de-guerre') },
  armor: { key: 'armor', file: 'armor.json', listKey: 'items', kind: 'armor', label: 'Armures', routes: routes('armors', 'armor', '/armures') },
  talismans: { key: 'talismans', file: 'talismans.json', listKey: 'items', kind: 'talisman', label: 'Talismans', routes: routes('talismans', 'talisman', '/talismans') },
  spells: { key: 'spells', file: 'spells.json', listKey: 'items', kind: 'spell', label: 'Sorts', routes: routes('spells', 'spell', '/sorts') },
  spirit_ashes: { key: 'spirit_ashes', file: 'spirit_ashes.json', listKey: 'items', kind: 'spirit', label: 'Cendres d’esprit', routes: routes('spirits', 'spirit', '/esprits') },
  tools: { key: 'tools', file: 'tools.json', listKey: 'items', kind: 'item', label: 'Outils', routes: itemRoutes('outils') },
  upgrade_materials: { key: 'upgrade_materials', file: 'upgrade_materials.json', listKey: 'items', kind: 'item', label: 'Matériaux d’amélioration', routes: itemRoutes('amelioration') },
  key_items: { key: 'key_items', file: 'key_items.json', listKey: 'items', kind: 'item', label: 'Objets clés', routes: itemRoutes('cles') },
  crafting_materials: { key: 'crafting_materials', file: 'crafting_materials.json', listKey: 'items', kind: 'item', label: 'Matériaux d’artisanat', routes: itemRoutes('artisanat') },
  ammunition: { key: 'ammunition', file: 'ammunition.json', listKey: 'items', kind: 'item', label: 'Munitions', routes: itemRoutes('munitions') },
  bosses: { key: 'bosses', file: 'bosses.json', listKey: 'bosses', kind: 'boss', label: 'Boss', routes: routes('bosses', 'boss', '/boss') },
  locations: { key: 'locations', file: 'locations.json', listKey: 'locations', kind: 'location', label: 'Lieux', routes: routes('locations', 'location', '/lieux') },
  npcs: { key: 'npcs', file: 'npcs.json', listKey: 'npcs', kind: 'npc', label: 'PNJ', routes: routes('npcs', 'npc', '/pnj') },
  origins: { key: 'origins', file: 'origins.json', listKey: 'origins', kind: 'origin', label: 'Origines', routes: routes('origins', 'origin', '/origines') },
  mechanics: { key: 'mechanics', file: 'mechanics.json', listKey: 'topics', kind: 'mechanic', label: 'Mécaniques', routes: routes('mechanics', 'mechanic', '/mecaniques') },
}

/** Libellé français de chaque fichier produit (manifeste). */
export const FILE_LABELS: Readonly<Record<FileKey, string>> = {
  ...(Object.fromEntries(DATASET_KEYS.map((k) => [k, DATASETS[k].label])) as Record<DatasetKey, string>),
  tables: 'Tables de calcul',
  'search-index': 'Index de recherche',
}

/**
 * Jeux de données d'un genre (les armes viennent de trois fichiers, les objets de cinq).
 * @param kind Genre d'entité.
 * @returns Les clés des jeux de données de ce genre, dans l'ordre du registre.
 */
export function datasetsOfKind(kind: EntityKind): DatasetKey[] {
  return DATASET_KEYS.filter((k) => DATASETS[k].kind === kind)
}

/**
 * Construit la référence stable d'une entité.
 * @param kind Genre d'entité.
 * @param id Identifiant (slug) de l'entité.
 * @returns La référence `genre:id`.
 */
export function entityRef(kind: EntityKind, id: string): EntityRef {
  return `${kind}:${id}`
}
