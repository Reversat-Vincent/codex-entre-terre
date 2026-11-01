// Types et schéma du jeu de données `talismans` (talismans), fidèles à `data/talismans.json`.

import { galleryMetaSchema, patchNote } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, num, obj, opt, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/talismans.json`. */
export const talismansSchema = obj({
  ...itemBaseShape,
  japanese_name: opt(str),
  type: str,
  effect: str,
  weight: num,
  summary: str,
  description: str,
  effect_details: opt(arr(str)),
  notes: opt(arr(str)),
  patch_notes: opt(arr(patchNote)),
})

/** Schéma des métadonnées de `data/talismans.json`. */
export const talismansMetaSchema = galleryMetaSchema

/** Entrée de `data/talismans.json` telle que dans data/. */
export type TalismanRaw = Infer<typeof talismansSchema>

/** Métadonnées de `data/talismans.json`. */
export type TalismanMeta = GalleryMeta

/** Entrée préparée de `talismans` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface TalismanEntry extends TalismanRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `talismans`. */
export type TalismanFile = DatasetFile<TalismanEntry, TalismanMeta>
