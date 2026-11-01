// Types et schéma du jeu de données `key_items` (objets clés), fidèles à `data/key_items.json`.

import { galleryMetaSchema, patchNote, wikiSection, wikiTable } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, obj, opt, rec, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/key_items.json`. */
export const keyItemsSchema = obj({
  ...itemBaseShape,
  japanese_name: opt(str),
  type: opt(str),
  effect: opt(str),
  summary: str,
  description: nullable(str),
  effect_details: opt(arr(str)),
  effect_tables: opt(arr(wikiTable)),
  notes: opt(arr(str)),
  patch_notes: opt(arr(patchNote)),
  used_in_crafting: opt(wikiSection),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/key_items.json`. */
export const keyItemsMetaSchema = galleryMetaSchema

/** Entrée de `data/key_items.json` telle que dans data/. */
export type KeyItemRaw = Infer<typeof keyItemsSchema>

/** Métadonnées de `data/key_items.json`. */
export type KeyItemMeta = GalleryMeta

/** Champs dérivés d'un objet clé : catégories des doublons fusionnés (Grandes Runes listées deux fois par la galerie). */
export interface KeyItemDerived extends ItemDerived {
  /** Autres `category` sous lesquelles la galerie liste la même page ; vide si aucune. */
  readonly alsoListedIn: readonly string[]
}

/** Entrée préparée de `key_items` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface KeyItemEntry extends KeyItemRaw {
  readonly id: string
  readonly derived: KeyItemDerived
}

/** Fichier préparé `key_items`. */
export type KeyItemFile = DatasetFile<KeyItemEntry, KeyItemMeta>
