// Types et schéma du jeu de données `spirit_ashes` (cendres d'esprit et marionnettes), fidèles à `data/spirit_ashes.json`.

import { galleryMetaSchema, patchNote, wikiSection } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, num, obj, opt, rec, str, union } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/spirit_ashes.json`. */
export const spiritAshesSchema = obj({
  ...itemBaseShape,
  japanese_name: str,
  type: str,
  effect: opt(str),
  fp_cost: opt(num),
  hp_cost: opt(num),
  summary: str,
  description: nullable(str),
  upgrade_material: nullable(str),
  effect_details: opt(arr(str)),
  notes: opt(arr(str)),
  // Une note de Fanged Imp Ashes a été extraite sous une clé de texte (« minor puzzle spoiler ») au lieu de `version` : forme gardée telle quelle.
  patch_notes: opt(arr(union(patchNote, rec(str)))),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/spirit_ashes.json`. */
export const spiritAshesMetaSchema = galleryMetaSchema

/** Entrée de `data/spirit_ashes.json` telle que dans data/. */
export type SpiritAshRaw = Infer<typeof spiritAshesSchema>

/** Métadonnées de `data/spirit_ashes.json`. */
export type SpiritAshMeta = GalleryMeta

/** Entrée préparée de `spirit_ashes` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface SpiritAshEntry extends SpiritAshRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `spirit_ashes`. */
export type SpiritAshFile = DatasetFile<SpiritAshEntry, SpiritAshMeta>
