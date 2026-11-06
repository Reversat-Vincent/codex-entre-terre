// Clés communes des données : attributs, types de dégâts, effets de statut, et correspondance avec les clés brutes de data/.
// Référence : docs/architecture.md § 3.4 ; icônes des statuts : sprite du design system (`i-st-*`).

/** Clés courtes des huit attributs, dans l'ordre du jeu (VIG, MND, END, STR, DEX, INT, FAI, ARC). */
export const ATTRIBUTE_KEYS = ['vig', 'mnd', 'end', 'str', 'dex', 'int', 'fai', 'arc'] as const

/** Attribut du personnage, en clé courte. */
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]

/** Attributs qui interviennent dans le scaling et les prérequis des armes (`scaling.<clé>`, `requirements.<clé>`). */
export const WEAPON_ATTRIBUTE_KEYS = ['str', 'dex', 'int', 'fai', 'arc'] as const

/** Attribut lu dans les tableaux d'armes. */
export type WeaponAttributeKey = (typeof WEAPON_ATTRIBUTE_KEYS)[number]

/** Clé longue de `origins.json` (`attributes.vigor`…) pour chaque clé courte. */
export const ORIGIN_ATTRIBUTE_FIELD: Readonly<Record<AttributeKey, OriginAttributeField>> = {
  vig: 'vigor',
  mnd: 'mind',
  end: 'endurance',
  str: 'strength',
  dex: 'dexterity',
  int: 'intelligence',
  fai: 'faith',
  arc: 'arcane',
}

/** Nom d'un attribut tel qu'il apparaît dans `origins.json` (`attributes`). */
export type OriginAttributeField =
  | 'vigor'
  | 'mind'
  | 'endurance'
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'faith'
  | 'arcane'

/** Types de dégâts d'attaque des armes (`attack_power`, `upgrade.tables[…].attack`). */
export const DAMAGE_KEYS = ['physical', 'magic', 'fire', 'lightning', 'holy'] as const

/** Type de dégâts d'une arme. */
export type DamageKey = (typeof DAMAGE_KEYS)[number]

/** Types de dégâts de l'absorption des boss (`encounters[].damage_negation_percent`). */
export const NEGATION_KEYS = ['standard', 'strike', 'slash', 'pierce', 'magic', 'fire', 'lightning', 'holy'] as const

/** Type de dégâts d'une absorption de boss. */
export type NegationKey = (typeof NEGATION_KEYS)[number]

/** Effets de statut (`status_resistance`, `status_buildup`), dans l'ordre de docs/architecture.md § 3.4. */
export const STATUS_KEYS = ['blood_loss', 'frostbite', 'poison', 'scarlet_rot', 'sleep', 'madness', 'death_blight'] as const

/** Effet de statut. */
export type StatusKey = (typeof STATUS_KEYS)[number]

/** Icône du sprite du design system pour chaque effet de statut. */
export const STATUS_ICON: Readonly<Record<StatusKey, string>> = {
  blood_loss: 'i-st-bleed',
  frostbite: 'i-st-frost',
  poison: 'i-st-poison',
  scarlet_rot: 'i-st-rot',
  sleep: 'i-st-sleep',
  madness: 'i-st-madness',
  death_blight: 'i-st-death',
}

/** Lettres de scaling du wiki, de la plus forte à la plus faible (`data/README.md`). */
export const GRADES = ['S', 'A', 'B', 'C', 'D', 'E'] as const

/** Lettre de scaling. */
export type Grade = (typeof GRADES)[number]
