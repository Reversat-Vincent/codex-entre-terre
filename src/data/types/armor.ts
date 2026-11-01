// Types et schéma du jeu de données `armor` (armures (tête, torse, bras, jambes)), fidèles à `data/armor.json`.

import { galleryMetaSchema, patchNote } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, num, obj, opt, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/armor.json`. */
export const armorSchema = obj({
  ...itemBaseShape,
  type: str,
  slot: str,
  weight: nullable(num),
  damage_negation: obj({ physical: nullable(num), strike: num, slash: num, pierce: num, magic: num, fire: num, lightning: num, holy: num }),
  resistance: obj({ immunity: num, robustness: num, focus: num, vitality: num }),
  poise: num,
  altered_version: opt(str),
  summary: nullable(str),
  description: nullable(str),
  japanese_name: opt(str),
  effect_details: opt(arr(str)),
  notes: opt(arr(str)),
  patch_notes: opt(arr(patchNote)),
})

/** Schéma des métadonnées de `data/armor.json`. */
export const armorMetaSchema = galleryMetaSchema

/** Entrée de `data/armor.json` telle que dans data/. */
export type ArmorRaw = Infer<typeof armorSchema>

/** Métadonnées de `data/armor.json`. */
export type ArmorMeta = GalleryMeta

/** Entrée préparée de `armor` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface ArmorEntry extends ArmorRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `armor`. */
export type ArmorFile = DatasetFile<ArmorEntry, ArmorMeta>
