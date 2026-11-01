// Type commun aux trois fichiers d'armes (mêlée, distance et catalyseurs, boucliers et torches) et à leurs champs dérivés.
// Un seul type pour les trois : un champ absent de l'un des fichiers y est facultatif, ce qui permet au moteur de traiter toutes les armes de la même façon.

import { GRADES } from '../keys.ts'
import {
  acquisitionSchema,
  counts,
  fieldNotes,
  patchNote,
  sourceTag,
  wikiUrl,
} from './common.ts'
import type { AcquisitionDerived, DatasetFile } from './common.ts'
import { arr, bool, lit, nullable, num, obj, opt, rec, str, union } from './schema.ts'
import type { Infer, Schema, SchemaIssue } from './schema.ts'

const grade = lit(...GRADES)

/** Schéma d'un coefficient de scaling d'un tableau d'amélioration ; `coef` n'est connu que pour 43 armes. */
const scalingCell = obj({ grade: nullable(grade), coef: nullable(num) })

/** Schéma d'un niveau `+N` d'un tableau d'amélioration. */
export const upgradeLevelSchema = obj({
  attack: obj({
    physical: num,
    // Une page écrit « 56/56 » : la valeur brute est gardée.
    magic: opt(union(num, str)),
    fire: opt(union(num, str)),
    lightning: opt(num),
    holy: opt(num),
  }),
  // `scaling` et `guard` manquent à certains niveaux des tableaux d'armes à distance.
  scaling: opt(obj({
    str: opt(scalingCell),
    dex: opt(scalingCell),
    int: opt(scalingCell),
    fai: opt(scalingCell),
    arc: opt(scalingCell),
  })),
  guard: opt(obj({
    boost: opt(num),
    physical: opt(num),
    magic: opt(num),
    fire: opt(num),
    lightning: opt(num),
    holy: opt(num),
  })),
  passive: opt(str),
  critical: opt(num),
  upgrade_cost_runes: opt(num),
  spell_buff: opt(num),
})

/** Niveau `+N` d'un tableau d'amélioration (attaque, scaling, garde). */
export type UpgradeLevel = Infer<typeof upgradeLevelSchema>

/** Schéma de la croissance par niveau affichée par le wiki (`"+5.8%"`). */
export const upgradeGrowthSchema = obj({
  atk: opt(str),
  scale_str: opt(str),
  scale_dex: opt(str),
  scale_int: opt(str),
  scale_fai: opt(str),
  scale_arc: opt(str),
  guard_boost: opt(str),
  passive: opt(str),
  spell_buff: opt(str),
})

/** Croissance par niveau, en texte du wiki. */
export type UpgradeGrowth = Infer<typeof upgradeGrowthSchema>

/** Tableau d'amélioration d'une affinité : niveaux `+N` et, parfois, `growth_per_level`. */
export interface UpgradeAffinityTable {
  readonly [level: `+${number}`]: UpgradeLevel
  readonly growth_per_level?: UpgradeGrowth
}

const LEVEL_KEY = /^\+\d+$/

/** Schéma d'un tableau d'affinité : les clés `+N` sont des niveaux, `growth_per_level` la croissance, toute autre clé est un écart. */
export const upgradeAffinityTableSchema: Schema<UpgradeAffinityTable> = {
  describe: 'UpgradeAffinityTable',
  /**
   * Contrôle un tableau d'affinité.
   * @param value Valeur lue.
   * @param path Chemin JSON de la valeur.
   * @param issues Écarts, complétés en place.
   */
  check(value: unknown, path: string, issues: SchemaIssue[]) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      issues.push({ path, message: 'objet attendu' })
      return
    }
    for (const [key, v] of Object.entries(value)) {
      const child = `${path}[${JSON.stringify(key)}]`
      if (key === 'growth_per_level') upgradeGrowthSchema.check(v, child, issues)
      else if (LEVEL_KEY.test(key)) upgradeLevelSchema.check(v, child, issues)
      else issues.push({ path: child, message: 'clé de niveau inconnue' })
    }
  },
}

/** Schéma d'une entrée d'arme. */
export const weaponSchema = obj({
  name: str,
  wiki_page: str,
  url: wikiUrl,
  category: str,
  weapon_type: str,
  source: sourceTag,
  japanese_name: opt(str),
  attack_type: arr(str),
  skill: obj({
    name: nullable(str),
    type: str,
    ash_of_war_available: opt(bool),
    fp_cost: nullable(str),
    description: opt(str),
    stamina_cost_wiki: opt(str),
    default_affinity: opt(str),
    properties: opt(
      obj({
        hold: opt(bool),
        charge: opt(bool),
        follow_up: opt(bool),
        combo: bool,
        channel: bool,
        parryable: opt(bool),
      }),
    ),
    wiki_url: opt(wikiUrl),
    attack_type: opt(str),
  }),
  weight: num,
  attack_power: obj({ physical: num, magic: num, fire: num, lightning: num, holy: num, critical: num }),
  guarded_damage_negation: obj({
    physical: nullable(num),
    magic: nullable(num),
    fire: nullable(num),
    lightning: nullable(num),
    holy: nullable(num),
    guard_boost: nullable(num),
  }),
  // `null` = pas de scaling pour cet attribut (field_notes), et non « non documenté ».
  scaling: obj({ str: nullable(grade), dex: nullable(grade), int: nullable(grade), fai: nullable(grade), arc: nullable(grade) }),
  // 0 = aucun prérequis.
  requirements: obj({ str: num, dex: num, int: num, fai: num, arc: num }),
  range: opt(num),
  passive_effects: arr(str),
  buy_price: nullable(num),
  sell_price: nullable(num),
  description: str,
  acquisition: arr(acquisitionSchema),
  regions_mentioned: arr(str),
  acquisition_flags: arr(str),
  upgrade: obj({
    material: nullable(str),
    max_level: nullable(num),
    material_info_source: nullable(str),
    ash_of_war_changeable: nullable(bool),
    affinity_changeable: nullable(bool),
    changeability_info_source: nullable(str),
    class_ash_of_war_rule: opt(str),
    notes: opt(arr(str)),
    tables: opt(rec(upgradeAffinityTableSchema)),
    tables_consistent_with_infobox: opt(bool),
    buffable: opt(bool),
    estimate_if_undocumented: opt(
      obj({ material: str, ash_of_war_changeable: bool, confidence: lit('medium', 'high'), basis: str }),
    ),
  }),
  notes: arr(str),
  patch_notes: opt(arr(patchNote)),
  compatible_ashes_of_war: opt(arr(str)),
  status_buildup: opt(
    obj({
      blood_loss: opt(num),
      frostbite: opt(num),
      poison: opt(num),
      scarlet_rot: opt(num),
      sleep: opt(num),
      madness: opt(num),
      death_blight: opt(num),
    }),
  ),
  sorcery_scaling: opt(num),
  incantation_scaling: opt(num),
  effects_details: opt(arr(str)),
})

/** Entrée d'arme telle que dans data/. */
export type WeaponRaw = Infer<typeof weaponSchema>

/** Schéma des métadonnées d'un fichier d'armes. */
export const weaponMetaSchema = obj({
  source_page: wikiUrl,
  source_wiki: str,
  retrieved: str,
  weapon_count: num,
  counts_by_source: counts,
  counts_by_category: counts,
  field_notes: fieldNotes,
  class_rules: opt(
    rec(
      obj({
        rule: str,
        compatible_ashes_of_war: arr(str),
        no_ash_of_war: bool,
        affinity_locked_standard: bool,
        source: wikiUrl,
      }),
    ),
  ),
  upgrade_path_documentation: obj({ documented_by_wiki: num, undocumented: num, undocumented_with_estimate: num }),
  wiki_inconsistencies_flagged: arr(str),
})

/** Métadonnées d'un fichier d'armes. */
export type WeaponMeta = Infer<typeof weaponMetaSchema>

/**
 * Fiabilité du type d'amélioration (docs/architecture.md § 3.2) : `wiki` documenté, `deduced` déduit par une règle du wiki,
 * `estimate` estimation statistique de l'extraction, `null` non documenté, `not-upgradeable` arme non améliorable.
 */
export type UpgradeReliability = 'wiki' | 'deduced' | 'estimate' | 'null' | 'not-upgradeable'

/** Amélioration d'une arme, restructurée sans valeur supposée. */
export interface DerivedUpgrade {
  /** Matériau (`Smithing Stones`, `Somber Smithing Stones`), estimé si `reliability === 'estimate'`, `null` sinon inconnu. */
  readonly material: string | null
  /** Niveau maximal ; pour une estimation, déduit du matériau (25 ou 10) et donc estimé lui aussi. */
  readonly maxLevel: number | null
  readonly reliability: UpgradeReliability
  /** Confiance de l'estimation (`upgrade.estimate_if_undocumented.confidence`). */
  readonly confidence?: 'medium' | 'high'
  /** Base statistique de l'estimation. */
  readonly basis?: string
}

/** Champ signalé incohérent par le wiki lui-même ; `reference` indique la valeur qui fait foi. */
export interface Inconsistency {
  readonly field: 'upgrade.tables'
  /** Les valeurs de l'infobox (`attack_power`, `scaling`…) font foi (`tables_consistent_with_infobox === false`). */
  readonly reference: 'infobox'
}

/** Champs dérivés d'une arme. */
export interface WeaponDerived extends AcquisitionDerived {
  readonly upgrade: DerivedUpgrade
  readonly inconsistent: readonly Inconsistency[]
}

/** Arme préparée : entrée d'origine intégrale, identifiant et champs dérivés. */
export interface WeaponEntry extends WeaponRaw {
  readonly id: string
  readonly derived: WeaponDerived
}

/** Fichier préparé d'armes. */
export type WeaponFile = DatasetFile<WeaponEntry, WeaponMeta>
