// Types et schéma du jeu de données `spells` (sorts (sorcelleries et incantations)), fidèles à `data/spells.json`.

import { galleryMetaSchema, patchNote, wikiSection } from './common.ts'
import type { DatasetFile, GalleryMeta } from './common.ts'
import { itemBaseShape } from './item.ts'
import type { ItemDerived } from './item.ts'
import { arr, num, obj, opt, rec, str, union } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une entrée de `data/spells.json`. */
export const spellsSchema = obj({
  ...itemBaseShape,
  japanese_name: str,
  type: str,
  effect: str,
  spell_type: str,
  sub_type: opt(str),
  // Coût du wiki : nombre, ou texte quand il varie (par exemple « 12 (24) »).
  fp_cost: union(num, str),
  stamina_cost: opt(union(num, str)),
  slots_used: num,
  // 0 = aucun prérequis.
  requirements: obj({ int: num, fai: num, arc: num }),
  summary: str,
  description: str,
  effect_details: opt(arr(str)),
  notes: arr(str),
  patch_notes: opt(arr(patchNote)),
  other_sections: opt(rec(wikiSection)),
})

/** Schéma des métadonnées de `data/spells.json`. */
export const spellsMetaSchema = galleryMetaSchema

/** Entrée de `data/spells.json` telle que dans data/. */
export type SpellRaw = Infer<typeof spellsSchema>

/** Métadonnées de `data/spells.json`. */
export type SpellMeta = GalleryMeta

/** Entrée préparée de `spells` : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface SpellEntry extends SpellRaw {
  readonly id: string
  readonly derived: ItemDerived
}

/** Fichier préparé `spells`. */
export type SpellFile = DatasetFile<SpellEntry, SpellMeta>
