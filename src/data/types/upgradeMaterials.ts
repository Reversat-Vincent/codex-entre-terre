// Types et schéma du jeu de données `upgrade_materials` (matériaux d'amélioration), fidèles à `data/upgrade_materials.json`.

import { galleryMetaSchema, wikiSection, wikiTable } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, obj, opt, rec, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/upgrade_materials.json`. */
export const upgradeMaterialsSchema = obj({
  ...itemBaseShape,
  japanese_name: opt(str),
  type: str,
  effect: str,
  summary: str,
  description: str,
  effect_details: opt(arr(str)),
  effect_tables: opt(arr(wikiTable)),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/upgrade_materials.json`. */
export const upgradeMaterialsMetaSchema = galleryMetaSchema

/** Entrée de `data/upgrade_materials.json` telle que dans data/. */
export type UpgradeMaterialRaw = Infer<typeof upgradeMaterialsSchema>

/** Métadonnées de `data/upgrade_materials.json`. */
export type UpgradeMaterialMeta = GalleryMeta

/** Entrée préparée de `upgrade_materials` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface UpgradeMaterialEntry extends UpgradeMaterialRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `upgrade_materials`. */
export type UpgradeMaterialFile = DatasetFile<UpgradeMaterialEntry, UpgradeMaterialMeta>
