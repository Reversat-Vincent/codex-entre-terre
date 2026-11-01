// Types et schémas communs aux jeux de données : étiquette de source, acquisition, tableaux et sections du wiki, fichier préparé, champs dérivés.
// Référence : data/README.md (structure commune) et docs/architecture.md § 3.2 à § 3.4.

import type { DatasetKey, EntityKind, ListKey } from '../datasets.ts'
import { arr, lit, nullable, num, obj, opt, prefixed, rec, str, union } from './schema.ts'
import type { Infer } from './schema.ts'

/** Préfixe obligatoire de toute adresse rendue en lien externe (docs/architecture.md § 3.5). */
export const WIKI_URL_PREFIX = 'https://eldenring.wiki.gg/wiki/'

/** Adresse d'une page du wiki. */
export const wikiUrl = prefixed(WIKI_URL_PREFIX)

/** Étiquettes de source admises (data/README.md, « Étiquette DLC »). */
export const SOURCE_TAGS = ['Base game', 'Shadow of the Erdtree', 'Tarnished Pack', 'Base game + Shadow of the Erdtree'] as const

/** Schéma de l'étiquette de source. */
export const sourceTag = lit(...SOURCE_TAGS)

/** Étiquette de source d'une entrée ou d'une rencontre. */
export type SourceTag = Infer<typeof sourceTag>

/** Schéma d'une acquisition `{method, location, region, details}` ; `null` = non documenté. */
export const acquisitionSchema = obj({
  method: nullable(str),
  location: nullable(str),
  region: nullable(str),
  details: arr(str),
})

/** Une façon d'obtenir un objet, telle que l'extraction l'a lue sur le wiki. */
export type Acquisition = Infer<typeof acquisitionSchema>

/** Cellule de tableau du wiki. */
export const tableCell = union(str, num)

/** Ligne de tableau : objet (colonne → valeur) ou liste de cellules. */
export const tableRow = union(rec(tableCell), arr(tableCell))

/** Schéma d'un tableau du wiki (lignes objets ou listes). */
export const wikiTable = arr(tableRow)

/** Tableau du wiki : lignes objets (en-tête → valeur) ou listes de cellules (docs/architecture.md § 10.5). */
export type WikiTableData = Infer<typeof wikiTable>

/** Schéma d'une section du wiki : lignes de texte (conventions `→` et `[Titre]`) et tableaux éventuels. */
export const wikiSection = obj({ text: arr(str), tables: opt(arr(wikiTable)) })

/** Section du wiki telle qu'extraite. */
export type WikiSection = Infer<typeof wikiSection>

/** Section ramenée à une forme unique par la préparation (`npcs[].overview`, `character_information`, `questline`). */
export interface RichSection {
  readonly text: readonly string[]
  readonly tables: readonly WikiTableData[]
}

/** Schéma d'une note de patch. */
export const patchNote = obj({ version: str, official_notes: opt(str), community_notes: opt(str) })

/** Note de patch d'une entrée. */
export type PatchNote = Infer<typeof patchNote>

/** Schéma d'une infobox brute : champs nettoyés du wiki, texte ou nombre. */
export const infobox = rec(union(str, num))

/** Infobox brute d'une page du wiki. */
export type WikiInfobox = Infer<typeof infobox>

/** Comptes par clé (`counts_by_source`, `counts_by_category`…). */
export const counts = rec(num)

/** Notes de champs du fichier (`metadata.field_notes`). */
export const fieldNotes = rec(str)

/** Forme commune des métadonnées des fichiers d'objets issus de la galerie du wiki. */
export const galleryMetaSchema = obj({
  source_page: wikiUrl,
  gallery_sections: arr(str),
  source_wiki: str,
  retrieved: str,
  count: num,
  counts_by_source: counts,
  counts_by_category: counts,
  field_notes: fieldNotes,
})

/** Métadonnées d'un fichier d'objets de la galerie. */
export type GalleryMeta = Infer<typeof galleryMetaSchema>

// ---------------------------------------------------------------------------------------------
// Fichier préparé et champs dérivés (docs/architecture.md § 3.1 et § 3.2)

/** Transformation appliquée par la préparation, consignée dans le fichier produit. */
export interface Transform {
  /** Code de la transformation. */
  readonly code: 'id' | 'derived' | 'rich-section' | 'merge-duplicates'
  /** Champ concerné, ou `null` pour toute l'entrée. */
  readonly field: string | null
  /** Nombre d'entrées touchées. */
  readonly count: number
  /** Description en français. */
  readonly note: string
}

/**
 * Fichier préparé d'un jeu de données : `metadata` d'origine dans `meta`, entrées d'origine intégrales plus `id` et `derived`.
 * @typeParam E Type d'une entrée préparée.
 * @typeParam M Type des métadonnées d'origine.
 */
export interface DatasetFile<E, M> {
  readonly schema: 1
  readonly key: DatasetKey
  readonly kind: EntityKind
  /** Clé de la liste dans le fichier d'origine. */
  readonly listKey: ListKey
  readonly meta: M
  readonly transforms: readonly Transform[]
  readonly entries: readonly E[]
}

/** Champs dérivés présents sur toute entrée. */
export interface BaseDerived {
  /** `name`, ou `wiki_page` quand plusieurs entrées du même genre portent le même `name` (`title` pour les mécaniques). */
  readonly displayName: string
}

/** Méthode d'acquisition normalisée ; la valeur brute de `acquisition[].method` reste celle à afficher. */
export type AcquisitionMethod = 'purchase' | 'drop' | 'guaranteed-drop' | 'loot' | 'trade' | 'quest' | 'starting' | 'other'

/**
 * Règle qui a produit une région (docs/contenu/decisions-progression.md § 1.4) :
 * `known` valeur connue telle quelle ; `suffix` partie entre parenthèses de `X (Région)` ; `prefix` partie `X` de `X (Région)` quand c'est elle-même une valeur connue ;
 * `location` région de l'entrée de `locations.json` de ce nom ; `npc` `listed_region` du PNJ de ce nom.
 */
export type RegionRule = 'known' | 'suffix' | 'prefix' | 'location' | 'npc'

/** Région résolue, avec sa provenance. */
export interface RegionResolution {
  /** Région retenue (nom exact de data/). */
  readonly value: string
  /** Champ lu. */
  readonly from: 'location' | 'region' | 'regions_mentioned'
  /** Morceau de texte d'origine. */
  readonly raw: string
  readonly rule: RegionRule
  /** Reste d'extraction (`"through Rauh Base"`) rattaché au lieu cité. */
  readonly residue: boolean
  /** Vrai si la valeur figure parmi les 79 valeurs de région relevées (decisions-progression.md § 1.3). */
  readonly known: boolean
}

/** Régions d'une acquisition. */
export interface AcquisitionRegions {
  /** Indice dans `acquisition`. */
  readonly index: number
  /** Équipement de départ : acquisition ignorée pour la région. */
  readonly starting: boolean
  /** Régions retenues, régions parentes retirées. */
  readonly values: readonly RegionResolution[]
  /** Régions parentes retirées parce qu'une valeur plus précise existe. */
  readonly parentsRemoved: readonly string[]
  /** Morceaux de texte non résolus. */
  readonly unresolved: readonly string[]
}

/** Régions déduites d'une entrée (décision D10) ; l'étape n'est pas calculée ici, elle appartient au moteur. */
export interface DerivedRegions {
  readonly acquisitions: readonly AcquisitionRegions[]
  /** Repli sur `regions_mentioned`, utilisé seulement si aucune acquisition ne donne de région. */
  readonly fallback: { readonly values: readonly RegionResolution[]; readonly parentsRemoved: readonly string[] } | null
  /** Provenance des valeurs retenues. */
  readonly basis: 'acquisition' | 'regions_mentioned' | 'none'
  /** Régions retenues, sans doublon, dans l'ordre de lecture. */
  readonly values: readonly string[]
}

/** Butin d'un PNJ envahisseur ou mini-boss (rang `Invaders and other minibosses`). */
export interface InvaderDrop {
  /** Identifiant du boss. */
  readonly boss: string
  /** Clé de la rencontre (`bossId/encounterId`). */
  readonly encounter: string
}

/** Champs dérivés des entrées qui ont des acquisitions (armes, objets, armures, sorts…). */
export interface AcquisitionDerived extends BaseDerived {
  readonly regions: DerivedRegions
  /** Méthode normalisée de chaque acquisition (même indice), `null` si la méthode brute est `null`. */
  readonly methods: readonly (AcquisitionMethod | null)[]
  /** Rencontres d'envahisseurs dont `drops` cite exactement cette entrée. */
  readonly invaderDrop: readonly InvaderDrop[]
}
