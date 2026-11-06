// Types et schéma du jeu de données `bosses` (pages de boss et leurs rencontres), fidèles à `data/bosses.json`.
// Sémantique (docs/architecture.md § 3.4) : `hp`, `runes` = texte du wiki ; `*_values` = nombres trouvés dans ce texte (plusieurs lieux ou NG+).

import { counts, fieldNotes, sourceTag, wikiUrl } from './common.ts'
import type { BaseDerived, DatasetFile } from './common.ts'
import { arr, bool, lit, nullable, num, obj, opt, rec, str, union } from './schema.ts'
import type { Infer } from './schema.ts'

/** Rangs de la navbox des boss du wiki. */
export const BOSS_TIERS = ['Enemies', 'Great Enemies', 'Legends', 'Gods', 'Demigods', 'Invaders and other minibosses'] as const

/** Rang d'un boss. */
export type BossTier = (typeof BOSS_TIERS)[number]

/** Indicateurs de la page « Bosses » du wiki. */
export const BOSS_FLAGS = [
  'mandatory_base_game',
  'required_to_access_dlc',
  'mandatory_dlc',
  'shardbearer',
  'remembrance_base_game',
  'remembrance_dlc',
] as const

/** Indicateur d'un boss. */
export type BossFlag = (typeof BOSS_FLAGS)[number]

/** Résistance à un statut : nombre, texte à plusieurs valeurs, `"Immune"` ou `"no"` (affichage brut). */
const statusValue = union(num, str)

/** Schéma d'une rencontre (un combat d'une page de boss). */
export const encounterSchema = obj({
  name: str,
  variant: opt(str),
  type: opt(str),
  location: nullable(str),
  regions: arr(str),
  source: sourceTag,
  hp: nullable(str),
  hp_values: arr(num),
  runes: nullable(str),
  runes_values: arr(num),
  drops: arr(str),
  /** Absorption en % par type de dégâts (plus haut = plus résistant ; négatif = faiblesse). */
  damage_negation_percent: opt(
    obj({ standard: num, strike: num, slash: num, pierce: num, magic: num, fire: num, lightning: num, holy: num }),
  ),
  status_resistance: opt(
    obj({
      poison: opt(statusValue),
      scarlet_rot: opt(statusValue),
      blood_loss: opt(statusValue),
      frostbite: opt(statusValue),
      sleep: opt(statusValue),
      madness: opt(statusValue),
      death_blight: opt(statusValue),
    }),
  ),
  other_infobox_fields: opt(rec(union(str, num))),
  damage_types_dealt: opt(arr(str)),
  parryable: opt(bool),
  critable: opt(bool),
  defense: opt(union(num, str)),
  poise: opt(num),
  weak_spot: opt(str),
  weakness: opt(str),
  spirit_ashes_allowed: opt(bool),
  npc_summon_available: opt(bool),
  summons_available: opt(str),
})

/** Rencontre telle que dans data/. */
export type Encounter = Infer<typeof encounterSchema>

/** Schéma d'une page de boss. */
export const bossSchema = obj({
  name: str,
  wiki_page: str,
  url: wikiUrl,
  source: sourceTag,
  tier: arr(lit(...BOSS_TIERS)),
  flags: arr(lit(...BOSS_FLAGS)),
  summary: str,
  character_location: opt(str),
  encounters: arr(encounterSchema),
  encounter_data_note: opt(str),
  fight_notes: opt(arr(str)),
})

/** Page de boss telle que dans data/. */
export type BossRaw = Infer<typeof bossSchema>

/** Schéma des métadonnées de `data/bosses.json`. */
export const bossesMetaSchema = obj({
  source_pages: arr(wikiUrl),
  retrieved: str,
  boss_pages: num,
  encounters: num,
  counts_by_source: counts,
  encounters_by_source: counts,
  counts_by_tier: counts,
  flag_lists_from_bosses_page: rec(arr(str)),
  navbox_tier_conflicts_ignored: arr(obj({ navbox_link: str, resolves_to: str, tier_ignored: str, link_navbox: str })),
  field_notes: fieldNotes,
})

/** Métadonnées de `data/bosses.json`. */
export type BossMeta = Infer<typeof bossesMetaSchema>

/** Clé d'une rencontre : `bossId/encounterId`, ou `bossId` seul pour une page sans rencontre (docs/architecture.md § 3.3). */
export type EncounterKey = string

/** Identité d'une rencontre, au même indice que `encounters`. */
export interface EncounterIdentity {
  /** Identifiant de la rencontre dans sa page (slug du nom, puis + variante, puis + lieu en cas de doublon). */
  readonly id: string
  readonly key: EncounterKey
}

/** Champs dérivés d'une page de boss. */
export interface BossDerived extends BaseDerived {
  readonly encounters: readonly EncounterIdentity[]
  /** Clé de la page quand elle n'a aucune rencontre (`bossId`), `null` sinon. */
  readonly pageKey: EncounterKey | null
}

/** Page de boss préparée. */
export interface BossEntry extends BossRaw {
  readonly id: string
  readonly derived: BossDerived
}

/** Fichier préparé `bosses`. */
export type BossFile = DatasetFile<BossEntry, BossMeta>
