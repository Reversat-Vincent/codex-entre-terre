// Types et schéma du jeu de données `origins` (classes de départ), fidèles à `data/origins.json`.
// `base_stats` vient de l'infobox de chaque page ; le moteur calcule les statistiques dérivées depuis les tables (docs/architecture.md § 5.2).

import { counts, fieldNotes, sourceTag, wikiUrl } from './common.ts'
import type { BaseDerived, DatasetFile } from './common.ts'
import { arr, nullable, num, obj, opt, str } from './schema.ts'
import type { Infer } from './schema.ts'

const resistancePart = obj({ base: opt(num), equipment: opt(num), total: opt(num) })
const defenseBlock = obj({
  physical: nullable(num),
  strike: nullable(num),
  slash: nullable(num),
  pierce: nullable(num),
  magic: nullable(num),
  fire: nullable(num),
  lightning: nullable(num),
  holy: nullable(num),
})

/** Schéma d'une entrée de `data/origins.json`. */
export const originSchema = obj({
  name: str,
  wiki_page: str,
  url: wikiUrl,
  source: sourceTag,
  level: num,
  attributes: obj({
    vigor: num,
    mind: num,
    endurance: num,
    strength: num,
    dexterity: num,
    intelligence: num,
    faith: num,
    arcane: num,
  }),
  base_stats: obj({
    hp: num,
    fp: num,
    stamina: num,
    /** Heavy Knight corrigé de 53.3 à 59.3 (P1, data/CHANGELOG.md). */
    equip_load: num,
    discovery: nullable(num),
    poise: nullable(num),
  }),
  defense: defenseBlock,
  damage_negation: defenseBlock,
  resistance: obj({ immunity: resistancePart, robustness: resistancePart, focus: resistancePart, vitality: resistancePart }),
  in_game_description: str,
  summary: str,
  starting_equipment: obj({ Armaments: arr(str), Spells: arr(str), Gear: arr(str), Misc: arr(str) }),
  build_optimization: opt(arr(str)),
})

/** Origine telle que dans data/. */
export type OriginRaw = Infer<typeof originSchema>

/** Schéma des métadonnées de `data/origins.json`. */
export const originsMetaSchema = obj({
  source_page: wikiUrl,
  retrieved: str,
  count: num,
  counts_by_source: counts,
  field_notes: fieldNotes,
})

/** Métadonnées de `data/origins.json`. */
export type OriginMeta = Infer<typeof originsMetaSchema>

/** Origine préparée. */
export interface OriginEntry extends OriginRaw {
  readonly id: string
  readonly derived: BaseDerived
}

/** Fichier préparé `origins`. */
export type OriginFile = DatasetFile<OriginEntry, OriginMeta>
