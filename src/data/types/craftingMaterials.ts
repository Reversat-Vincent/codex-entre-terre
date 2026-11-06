// Types et schéma du jeu de données `crafting_materials` (matériaux d'artisanat), fidèles à `data/crafting_materials.json`.

import { galleryMetaSchema, wikiSection } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, obj, opt, rec, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/crafting_materials.json`. */
export const craftingMaterialsSchema = obj({
  ...itemBaseShape,
  japanese_name: str,
  type: str,
  effect: opt(str),
  summary: str,
  description: nullable(str),
  used_in_crafting: opt(wikiSection),
  effect_details: opt(arr(str)),
  notes: opt(arr(str)),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/crafting_materials.json`. */
export const craftingMaterialsMetaSchema = galleryMetaSchema

/** Entrée de `data/crafting_materials.json` telle que dans data/. */
export type CraftingMaterialRaw = Infer<typeof craftingMaterialsSchema>

/** Métadonnées de `data/crafting_materials.json`. */
export type CraftingMaterialMeta = GalleryMeta

/** Entrée préparée de `crafting_materials` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface CraftingMaterialEntry extends CraftingMaterialRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `crafting_materials`. */
export type CraftingMaterialFile = DatasetFile<CraftingMaterialEntry, CraftingMaterialMeta>
