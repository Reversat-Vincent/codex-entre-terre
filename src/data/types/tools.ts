// Types et schéma du jeu de données `tools` (outils (consommables, pots, graisses, objets de quête, Remembrances…)), fidèles à `data/tools.json`.

import { galleryMetaSchema, wikiSection, wikiTable } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, obj, opt, rec, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/tools.json`. */
export const toolsSchema = obj({
  ...itemBaseShape,
  japanese_name: str,
  type: opt(str),
  effect: opt(str),
  summary: nullable(str),
  description: nullable(str),
  effect_details: opt(arr(str)),
  effect_tables: opt(arr(wikiTable)),
  notes: opt(arr(str)),
  crafting: opt(wikiSection),
  used_in_crafting: opt(wikiSection),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/tools.json`. */
export const toolsMetaSchema = galleryMetaSchema

/** Entrée de `data/tools.json` telle que dans data/. */
export type ToolRaw = Infer<typeof toolsSchema>

/** Métadonnées de `data/tools.json`. */
export type ToolMeta = GalleryMeta

/** Entrée préparée de `tools` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface ToolEntry extends ToolRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `tools`. */
export type ToolFile = DatasetFile<ToolEntry, ToolMeta>
