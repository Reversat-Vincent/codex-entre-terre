// Libellés français de l'interface pour les clés de données : attributs, types de dégâts, statuts, sources, étapes, fiabilité.
// Les noms d'objets, de boss et de lieux ne passent jamais par ici : ce sont des données, affichées telles quelles en anglais.
// Les types d'union ci-dessous suivent l'architecture (§ 5.1, § 5.3) ; ils seront alignés sur ceux du moteur et de `src/data/types/` quand ceux-ci existeront.

/** Clé courte d'un attribut du personnage, dans l'ordre d'affichage du panneau de critères. */
export type AttributeKey = 'vig' | 'mnd' | 'end' | 'str' | 'dex' | 'int' | 'fai' | 'arc'

/** Libellés d'un attribut : abréviation anglaise (comme dans les données) et nom complet (info-bulle, panneau de critères). */
export interface AttributeLabel {
  /** Abréviation affichée, en anglais : VIG, MND, END, STR, DEX, INT, FAI, ARC. */
  abbr: string
  /** Nom complet en anglais, repris du jeu : Vigor, Mind, Endurance, Strength, Dexterity, Intelligence, Faith, Arcane. */
  name: string
}

/** Attributs dans l'ordre du jeu. */
export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ['vig', 'mnd', 'end', 'str', 'dex', 'int', 'fai', 'arc']

/** Libellés des huit attributs. */
export const ATTRIBUTE_LABELS: Readonly<Record<AttributeKey, AttributeLabel>> = {
  vig: { abbr: 'VIG', name: 'Vigor' },
  mnd: { abbr: 'MND', name: 'Mind' },
  end: { abbr: 'END', name: 'Endurance' },
  str: { abbr: 'STR', name: 'Strength' },
  dex: { abbr: 'DEX', name: 'Dexterity' },
  int: { abbr: 'INT', name: 'Intelligence' },
  fai: { abbr: 'FAI', name: 'Faith' },
  arc: { abbr: 'ARC', name: 'Arcane' },
}

/** Clés d'attribut telles qu'elles figurent dans `data/` (`origins.json` en toutes lettres, armes en trois lettres) vers la clé courte. */
export const ATTRIBUTE_BY_DATA_KEY: Readonly<Record<string, AttributeKey>> = {
  vigor: 'vig',
  mind: 'mnd',
  endurance: 'end',
  strength: 'str',
  dexterity: 'dex',
  intelligence: 'int',
  faith: 'fai',
  arcane: 'arc',
  vig: 'vig',
  mnd: 'mnd',
  end: 'end',
  str: 'str',
  dex: 'dex',
  int: 'int',
  fai: 'fai',
  arc: 'arc',
}

/** Clé d'un type de dégâts ou d'absorption (clés de `data/` en minuscules). `physical` est le total physique des armes. */
export type DamageKey = 'physical' | 'standard' | 'strike' | 'slash' | 'pierce' | 'magic' | 'fire' | 'lightning' | 'holy'

/** Libellés français des types de dégâts (README du design system, composant DamageStatusChip) ; « Physique » est le total des armes. */
export const DAMAGE_LABELS: Readonly<Record<DamageKey, string>> = {
  physical: 'Physique',
  standard: 'Standard',
  strike: 'Frappe',
  slash: 'Tranchant',
  pierce: 'Estoc',
  magic: 'Magie',
  fire: 'Feu',
  lightning: 'Foudre',
  holy: 'Sacré',
}

/** Icônes du sprite pour les types de dégâts (`CxIcon name=…`) ; `physical` n'a pas d'icône dédiée dans le sprite. */
export const DAMAGE_ICONS: Readonly<Partial<Record<DamageKey, string>>> = {
  standard: 'd-standard',
  strike: 'd-strike',
  slash: 'd-slash',
  pierce: 'd-pierce',
  magic: 'd-magic',
  fire: 'd-fire',
  lightning: 'd-lightning',
  holy: 'd-holy',
}

/** Clé d'un statut (suit les classes `st-*` et les icônes `i-st-*` du design system). */
export type StatusKey = 'bleed' | 'frost' | 'poison' | 'rot' | 'sleep' | 'madness' | 'death'

/** Libellés français des statuts (README du design system, composant DamageStatusChip). */
export const STATUS_LABELS: Readonly<Record<StatusKey, string>> = {
  bleed: 'Saignement',
  frost: 'Givre',
  poison: 'Poison',
  rot: 'Putréfaction écarlate',
  sleep: 'Sommeil',
  madness: 'Folie',
  death: 'Mort',
}

/** Clés de statut de `data/` (`status_buildup`) vers la clé du design system. */
export const STATUS_BY_DATA_KEY: Readonly<Record<string, StatusKey>> = {
  blood_loss: 'bleed',
  frostbite: 'frost',
  poison: 'poison',
  scarlet_rot: 'rot',
  sleep: 'sleep',
  madness: 'madness',
  death_blight: 'death',
}

/** Valeur du champ `source` d'une entrée (un boss peut cumuler le jeu de base et l'extension). */
export type SourceName = 'Base game' | 'Shadow of the Erdtree' | 'Tarnished Pack' | 'Base game + Shadow of the Erdtree'

/** Présentation d'une source : libellé court du badge, nom complet, texte d'accessibilité et icône du sprite. */
export interface SourceLabel {
  /** Libellé court (Base, SotE, TP). */
  short: string
  /** Nom complet pour l'attribut `title`. */
  title: string
  /** Texte lu par les lecteurs d'écran. */
  aria: string
  /** Icône du sprite : carré (Base), demi-cercle (SotE), losange (TP). */
  icon: string
}

/** Libellés des trois sources simples ; la source double est composée de `Base game` et `Shadow of the Erdtree`. */
export const SOURCE_LABELS: Readonly<Record<'Base game' | 'Shadow of the Erdtree' | 'Tarnished Pack', SourceLabel>> = {
  'Base game': { short: 'Base', title: 'Base game', aria: 'Source : Base game', icon: 's-base' },
  'Shadow of the Erdtree': { short: 'SotE', title: 'Shadow of the Erdtree (DLC)', aria: 'Source : Shadow of the Erdtree', icon: 's-sote' },
  'Tarnished Pack': { short: 'TP', title: 'Tarnished Pack (DLC)', aria: 'Source : Tarnished Pack', icon: 's-tp' },
}

/** Libellés de la source double d'un boss présent dans le jeu de base et l'extension (badge à deux moitiés). */
export const SOURCE_BOTH_LABEL: Readonly<{ title: string; aria: string }> = {
  title: 'Base game + Shadow of the Erdtree',
  aria: 'Source : Base game et Shadow of the Erdtree',
}

/** Identifiant d'étape de partie (architecture § 5.3 : `early mid late endgame dlc`). */
export type StageKey = 'early' | 'mid' | 'late' | 'endgame' | 'dlc'

/** Étapes dans l'ordre de la progression. */
export const STAGE_KEYS: readonly StageKey[] = ['early', 'mid', 'late', 'endgame', 'dlc']

/** Libellés français des étapes. */
export const STAGE_LABELS: Readonly<Record<StageKey, string>> = {
  early: 'Début',
  mid: 'Milieu',
  late: 'Fin',
  endgame: 'Fin de jeu',
  dlc: 'DLC',
}

/** Niveaux de fiabilité d'une valeur (architecture § 5.1) : du fait du wiki au calcul de l'application. */
export type ReliabilityKey = 'wiki' | 'deduced' | 'estimate' | 'null' | 'inconsistent' | 'calculated'

/** Libellés français de la fiabilité ; l'estimation reçoit sa confiance en suffixe (voir `ESTIMATE_CONFIDENCE_LABELS`). */
export const RELIABILITY_LABELS: Readonly<Record<ReliabilityKey, string>> = {
  wiki: 'Wiki',
  deduced: 'Wiki (déduit)',
  estimate: 'Estimation',
  null: 'Non documenté',
  inconsistent: 'Incohérence',
  calculated: 'Calculé',
}

/** Confiance d'une estimation. */
export type EstimateConfidence = 'high' | 'medium'

/** Libellés de la confiance d'une estimation, entre parenthèses dans le badge : « Estimation (haute) ». */
export const ESTIMATE_CONFIDENCE_LABELS: Readonly<Record<EstimateConfidence, string>> = {
  high: 'haute',
  medium: 'moyenne',
}
