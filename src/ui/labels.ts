// Libellés français de l'interface pour les clés de données : attributs, types de dégâts, statuts, sources, étapes, fiabilité.
// Les noms d'objets, de boss et de lieux ne passent jamais par ici : ce sont des données, affichées telles quelles en anglais.
// Les clés d'attribut, de dégâts et de statut sont celles de `src/data/keys.ts` (réexportées ici) ; la fiabilité et la confiance d'une estimation
// sont celles de `src/engine/types.ts`. Ce module ne redéfinit aucun type de données : il ajoute les libellés français.

import type { AttributeKey, DamageKey, NegationKey, StatusKey } from '../data/keys.ts'
import { STAGE_IDS } from '../engine/config/stages.ts'
import type { DlcZone, StageId } from '../engine/config/stages.ts'
import { LOAD_TARGETS } from '../engine/config/weights.ts'
import type { LoadTarget } from '../engine/config/weights.ts'
import type { Confidence, Reliability } from '../engine/types.ts'

export type { AttributeKey, DamageKey, NegationKey, StatusKey }

/** Libellés d'un attribut : abréviation anglaise (comme dans les données) et nom complet (info-bulle, panneau de critères). */
export interface AttributeLabel {
  /** Abréviation affichée, en anglais : VIG, MND, END, STR, DEX, INT, FAI, ARC. */
  abbr: string
  /** Nom complet en anglais, repris du jeu : Vigor, Mind, Endurance, Strength, Dexterity, Intelligence, Faith, Arcane. */
  name: string
}

/** Attributs dans l'ordre du jeu (réexport de `src/data/keys.ts`). */
export { ATTRIBUTE_KEYS } from '../data/keys.ts'

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

/**
 * Clé d'un type de dégâts d'une arme (`DamageKey`, dont `physical`, le total physique) ou d'absorption d'un boss (`NegationKey` :
 * `standard`, `strike`, `slash`, `pierce` et les quatre éléments).
 */
export type DamageLabelKey = DamageKey | NegationKey

/** Libellés français des types de dégâts (README du design system, composant DamageStatusChip) ; « Physique » est le total des armes. */
export const DAMAGE_LABELS: Readonly<Record<DamageLabelKey, string>> = {
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
export const DAMAGE_ICONS: Readonly<Partial<Record<DamageLabelKey, string>>> = {
  standard: 'd-standard',
  strike: 'd-strike',
  slash: 'd-slash',
  pierce: 'd-pierce',
  magic: 'd-magic',
  fire: 'd-fire',
  lightning: 'd-lightning',
  holy: 'd-holy',
}

/** Clé de style d'un statut dans le design system (classes `st-*`, variables `--st-*`) ; la clé de données correspondante est `StatusKey`. */
export type StatusStyleKey = 'bleed' | 'frost' | 'poison' | 'rot' | 'sleep' | 'madness' | 'death'

/** Libellés français des statuts (README du design system, composant DamageStatusChip), par clé de style (voir `STATUS_BY_DATA_KEY`). */
export const STATUS_LABELS: Readonly<Record<StatusStyleKey, string>> = {
  bleed: 'Saignement',
  frost: 'Givre',
  poison: 'Poison',
  rot: 'Putréfaction écarlate',
  sleep: 'Sommeil',
  madness: 'Folie',
  death: 'Mort',
}

/** Clés de statut de `data/` (`status_buildup`, `status_resistance`) vers la clé de style du design system. */
export const STATUS_BY_DATA_KEY: Readonly<Record<StatusKey, StatusStyleKey>> = {
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

/**
 * Identifiant d'étape de partie : seule définition du projet, dans `src/engine/config/stages.ts` (D32) ; `StageKey` en est un alias conservé
 * pour les composants qui l'importaient d'ici.
 */
export type StageKey = StageId

/** Étapes dans l'ordre de la progression (réexport de `STAGE_IDS`). */
export const STAGE_KEYS: readonly StageId[] = STAGE_IDS

/** Libellés français des étapes. */
export const STAGE_LABELS: Readonly<Record<StageId, string>> = {
  early: 'Début',
  mid: 'Milieu',
  late: 'Fin',
  endgame: 'Fin de jeu',
  dlc: 'DLC',
}

/** Libellés français des sous-zones du DLC (clé de tri de la colonne DLC, pas une étape : calculs.md, « Étape de progression d'une arme »). */
export const DLC_ZONE_LABELS: Readonly<Record<DlcZone, string>> = {
  entry: 'Entrée',
  core: 'Cœur',
  'enir-ilim': 'Enir-Ilim',
}

/** Charges visées (réexport de `LOAD_TARGETS` de `src/engine/config/weights.ts`) : `light`, `mid`, `heavy` ; jamais `medium`. */
export const LOAD_KEYS: readonly LoadTarget[] = LOAD_TARGETS

/** Libellés français de la charge visée (critère « Charge », budget de poids d'une arme). */
export const LOAD_LABELS: Readonly<Record<LoadTarget, string>> = {
  light: 'Légère',
  mid: 'Moyenne',
  heavy: 'Lourde',
}

/** Niveaux de fiabilité d'une valeur (architecture § 5.1) : du fait du wiki au calcul de l'application ; alias de `Reliability` du moteur. */
export type ReliabilityKey = Reliability

/** Libellés français de la fiabilité ; l'estimation reçoit sa confiance en suffixe (voir `ESTIMATE_CONFIDENCE_LABELS`). */
export const RELIABILITY_LABELS: Readonly<Record<ReliabilityKey, string>> = {
  wiki: 'Wiki',
  deduced: 'Wiki (déduit)',
  estimate: 'Estimation',
  null: 'Non documenté',
  inconsistent: 'Incohérence',
  calculated: 'Calculé',
}

/** Confiance d'une estimation ; alias de `Confidence` du moteur. */
export type EstimateConfidence = Confidence

/** Libellés de la confiance d'une estimation, entre parenthèses dans le badge : « Estimation (haute) ». */
export const ESTIMATE_CONFIDENCE_LABELS: Readonly<Record<EstimateConfidence, string>> = {
  high: 'haute',
  medium: 'moyenne',
}

/** Abréviations françaises des types de dégâts, pour les en-têtes de colonne étroits (matrice des faiblesses) ; le libellé complet va en info-bulle. */
export const DAMAGE_SHORT_LABELS: Readonly<Record<DamageLabelKey, string>> = {
  physical: 'Phys.',
  standard: 'Std',
  strike: 'Frap.',
  slash: 'Tran.',
  pierce: 'Estoc',
  magic: 'Mag.',
  fire: 'Feu',
  lightning: 'Fou.',
  holy: 'Sacré',
}

/** Abréviations françaises des statuts, par clé de style, pour les puces étroites (immunités de la matrice des faiblesses). */
export const STATUS_SHORT_LABELS: Readonly<Record<StatusStyleKey, string>> = {
  bleed: 'Sai.',
  frost: 'Giv.',
  poison: 'Poi.',
  rot: 'Put.',
  sleep: 'Som.',
  madness: 'Fol.',
  death: 'Mort',
}

/**
 * Icône du sprite de chaque classe d'arme (`category` de `data/`) ; une classe sans icône dans le sprite (Fists, Claws, Whips, Twinblades…) n'en a pas.
 * Regroupement de conception : le sprite ne compte que 15 familles pour 42 classes.
 */
export const WEAPON_CLASS_ICONS: Readonly<Record<string, string>> = {
  Daggers: 'c-dagger',
  'Straight Swords': 'c-straight',
  'Thrusting Swords': 'c-straight',
  'Heavy Thrusting Swords': 'c-straight',
  Greatswords: 'c-greatsword',
  'Colossal Swords': 'c-greatsword',
  'Light Greatswords': 'c-lgs',
  Katanas: 'c-katana',
  'Great Katanas': 'c-katana',
  'Curved Swords': 'c-curved',
  'Curved Greatswords': 'c-curved',
  Axes: 'c-axe',
  Greataxes: 'c-axe',
  Hammers: 'c-hammer',
  'Great Hammers': 'c-hammer',
  Flails: 'c-hammer',
  'Colossal Weapons': 'c-hammer',
  Spears: 'c-spear',
  'Great Spears': 'c-spear',
  Halberds: 'c-halberd',
  Reapers: 'c-halberd',
  'Light Bows': 'c-bow',
  Bows: 'c-bow',
  Greatbows: 'c-bow',
  Crossbows: 'c-bow',
  Ballistas: 'c-bow',
  Staves: 'c-staff',
  'Sacred Seals': 'c-seal',
  'Small Shields': 'c-shield',
  'Medium Shields': 'c-shield',
  Greatshields: 'c-shield',
  'Thrusting Shields': 'c-shield',
  Torches: 'c-torch',
}
