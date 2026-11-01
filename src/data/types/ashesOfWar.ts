// Types et schéma du jeu de données `ashes_of_war` (Cendres de guerre), fidèles à `data/ashes_of_war.json`.

import { galleryMetaSchema, wikiSection } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, num, obj, opt, rec, str, union } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/ashes_of_war.json`. */
export const ashesOfWarSchema = obj({
  ...itemBaseShape,
  japanese_name: opt(str),
  type: str,
  effect: opt(str),
  affinity: str,
  fp_cost: nullable(union(str, num)),
  affinity_group: str,
  summary: str,
  description: str,
  effect_details: arr(str),
  skill: str,
  compatible_weapon_classes: arr(str),
  compatible_affinities: arr(str),
  notes: opt(arr(str)),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/ashes_of_war.json`. */
export const ashesOfWarMetaSchema = galleryMetaSchema

/** Entrée de `data/ashes_of_war.json` telle que dans data/. */
export type AshOfWarRaw = Infer<typeof ashesOfWarSchema>

/** Métadonnées de `data/ashes_of_war.json`. */
export type AshOfWarMeta = GalleryMeta

/** Entrée préparée de `ashes_of_war` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface AshOfWarEntry extends AshOfWarRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `ashes_of_war`. */
export type AshOfWarFile = DatasetFile<AshOfWarEntry, AshOfWarMeta>
