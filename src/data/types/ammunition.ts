// Types et schéma du jeu de données `ammunition` (munitions (flèches, grandes flèches, carreaux, grands carreaux)), fidèles à `data/ammunition.json`.

import { galleryMetaSchema, wikiSection } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, nullable, num, obj, opt, rec, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/ammunition.json`. */
export const ammunitionSchema = obj({
  ...itemBaseShape,
  type: opt(str),
  attack_power: obj({ physical: nullable(num), magic: nullable(num), fire: nullable(num), lightning: nullable(num), holy: nullable(num) }),
  critical: nullable(num),
  summary: str,
  description: nullable(str),
  japanese_name: opt(str),
  effect: opt(str),
  effect_details: opt(arr(str)),
  crafting: opt(wikiSection),
  notes: opt(arr(str)),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/ammunition.json`. */
export const ammunitionMetaSchema = galleryMetaSchema

/** Entrée de `data/ammunition.json` telle que dans data/. */
export type AmmunitionRaw = Infer<typeof ammunitionSchema>

/** Métadonnées de `data/ammunition.json`. */
export type AmmunitionMeta = GalleryMeta

/** Entrée préparée de `ammunition` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface AmmunitionEntry extends AmmunitionRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `ammunition`. */
export type AmmunitionFile = DatasetFile<AmmunitionEntry, AmmunitionMeta>
