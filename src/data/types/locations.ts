// Types et schéma du jeu de données `locations` (régions, donjons principaux, donjons, evergaols…), fidèles à `data/locations.json`.

import { counts, fieldNotes, infobox, sourceTag, wikiUrl } from './common.ts'
import type { BaseDerived, DatasetFile } from './common.ts'
import { arr, nullable, num, obj, opt, str } from './schema.ts'
import type { Infer } from './schema.ts'

const list = opt(arr(str))

/** Schéma d'une entrée de `data/locations.json`. */
export const locationSchema = obj({
  name: str,
  wiki_page: str,
  url: wikiUrl,
  /** Type d'infobox : `Region`, `Subregion`, `Legacy Dungeon`, `Location`, `Dungeon`, `Evergaol`. */
  kind: nullable(str),
  /** Région parente (champ `region` de l'infobox) ; sert à la hiérarchie des régions. */
  region: nullable(str),
  source: sourceTag,
  navbox_group: opt(str),
  infobox: opt(infobox),
  summary: nullable(str),
  subtype: opt(str),
  overview: list,
  sites_of_grace: list,
  sub_regions: list,
  landmarks: list,
  dungeons: list,
  field_bosses: list,
  bosses: list,
  npcs: list,
  enemies: list,
  notable_loot: list,
  crafting_materials: list,
  notes: list,
})

/** Lieu tel que dans data/. */
export type LocationRaw = Infer<typeof locationSchema>

/** Schéma des métadonnées de `data/locations.json`. */
export const locationsMetaSchema = obj({
  source_pages: arr(wikiUrl),
  retrieved: str,
  count: num,
  counts_by_source: counts,
  counts_by_kind: counts,
  field_notes: fieldNotes,
})

/** Métadonnées de `data/locations.json`. */
export type LocationMeta = Infer<typeof locationsMetaSchema>

/** Lieu préparé. */
export interface LocationEntry extends LocationRaw {
  readonly id: string
  readonly derived: BaseDerived
}

/** Fichier préparé `locations`. */
export type LocationFile = DatasetFile<LocationEntry, LocationMeta>
