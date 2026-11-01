// Types et schéma du jeu de données `mechanics` (pages de mécaniques en texte et tableaux), fidèles à `data/mechanics.json`.

import { counts, fieldNotes, infobox, sourceTag, wikiSection, wikiTable, wikiUrl } from './common.ts'
import type { BaseDerived, DatasetFile } from './common.ts'
import { arr, num, obj, opt, rec, str } from './schema.ts'
import type { Infer } from './schema.ts'

/** Schéma d'une page de `data/mechanics.json`. */
export const mechanicSchema = obj({
  /** Thème choisi par l'extraction (`Attributes & stats`, `Progression`…). */
  topic: str,
  title: str,
  url: wikiUrl,
  source: sourceTag,
  summary: arr(str),
  /** Sections nommées comme sur le wiki. */
  sections: rec(wikiSection),
  /** Tableaux de l'introduction ; la colonne `Increments` est un en-tête recopié, à ignorer. */
  summary_tables: opt(arr(wikiTable)),
  infobox: opt(infobox),
})

/** Page de mécanique telle que dans data/. */
export type MechanicRaw = Infer<typeof mechanicSchema>

/** Schéma des métadonnées de `data/mechanics.json`. */
export const mechanicsMetaSchema = obj({
  source_pages: arr(wikiUrl),
  retrieved: str,
  count: num,
  counts_by_topic: counts,
  counts_by_source: counts,
  field_notes: fieldNotes,
})

/** Métadonnées de `data/mechanics.json`. */
export type MechanicMeta = Infer<typeof mechanicsMetaSchema>

/** Page de mécanique préparée (identifiant = slug du titre). */
export interface MechanicEntry extends MechanicRaw {
  readonly id: string
  readonly derived: BaseDerived
}

/** Fichier préparé `mechanics`. */
export type MechanicFile = DatasetFile<MechanicEntry, MechanicMeta>
