// Types et schéma du jeu de données `npcs` (PNJ, boutiques, quêtes), fidèles à `data/npcs.json`.
// `overview`, `character_information` et `questline` sont tantôt une liste de lignes, tantôt une section : la préparation les ramène à `RichSection`.

import { counts, fieldNotes, infobox, sourceTag, wikiSection, wikiUrl } from './common.ts'
import type { BaseDerived, DatasetFile, RichSection } from './common.ts'
import { arr, nullable, num, obj, opt, str, union } from './schema.ts'
import type { Infer } from './schema.ts'

/** Forme hétérogène d'origine : liste de lignes ou section avec tableaux. */
const textOrSection = union(arr(str), wikiSection)

/** Schéma d'une entrée de `data/npcs.json` (forme d'origine). */
export const npcSchema = obj({
  name: str,
  wiki_page: str,
  url: wikiUrl,
  source: sourceTag,
  /** Rubrique de la page NPCs sous laquelle le PNJ apparaît. */
  listed_region: nullable(str),
  listed_subregion: opt(str),
  regions: arr(str),
  critical_npc_note: opt(str),
  infobox,
  summary: nullable(str),
  overview: opt(textOrSection),
  character_information: opt(textOrSection),
  questline: opt(textOrSection),
  notes: opt(arr(str)),
  location_details: opt(arr(str)),
  shop_inventory: opt(wikiSection),
  equipment: opt(wikiSection),
})

/** PNJ tel que dans data/. */
export type NpcRaw = Infer<typeof npcSchema>

/** Champs ramenés à `RichSection` par la préparation. */
export const NPC_RICH_FIELDS = ['overview', 'character_information', 'questline'] as const

/** Schéma des métadonnées de `data/npcs.json`. */
export const npcsMetaSchema = obj({
  source_page: wikiUrl,
  retrieved: str,
  count: num,
  counts_by_source: counts,
  counts_by_listed_region: counts,
  field_notes: fieldNotes,
})

/** Métadonnées de `data/npcs.json`. */
export type NpcMeta = Infer<typeof npcsMetaSchema>

/** PNJ préparé : sections hétérogènes ramenées à `RichSection`, le reste intégral. */
export interface NpcEntry extends Omit<NpcRaw, (typeof NPC_RICH_FIELDS)[number]> {
  readonly overview?: RichSection
  readonly character_information?: RichSection
  readonly questline?: RichSection
  readonly id: string
  readonly derived: BaseDerived
}

/** Fichier préparé `npcs`. */
export type NpcFile = DatasetFile<NpcEntry, NpcMeta>
