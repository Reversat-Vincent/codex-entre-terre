// Modèle de la fiche d'armure : lignes d'absorption (8 types) et de résistances (4), géométrie des barres, valeurs clés et alertes de qualité.
// La géométrie des barres est une mise à l'échelle d'affichage, pas un calcul de jeu : les valeurs écrites sont celles du wiki, sans conversion.

import type { ArmorEntry } from '../../../../data/types/armor.ts'
import { DAMAGE_ICONS, DAMAGE_LABELS, STATUS_LABELS } from '../../../../ui/labels.ts'
import type { DamageLabelKey } from '../../../../ui/labels.ts'
import { acquisitionAlert, acquisitionViews, missingFieldsAlert, presentAlerts } from '../sheetModel.ts'
import type { SheetAlert, SheetFact } from '../sheetModel.ts'

/** Types de dégâts de l'absorption d'une armure, dans l'ordre du wiki : le physique d'abord, puis les trois types physiques, puis les éléments. */
export const ARMOR_NEGATION_KEYS = ['physical', 'strike', 'slash', 'pierce', 'magic', 'fire', 'lightning', 'holy'] as const

/** Type de dégâts d'une absorption d'armure. */
export type ArmorNegationKey = (typeof ARMOR_NEGATION_KEYS)[number]

/** Borne haute de l'échelle des barres d'absorption : au-dessus du maximum des 704 armures (20,4 %), pour que toutes les pièces partagent la même échelle. */
export const NEGATION_SCALE_MAX = 25

/** Borne basse par défaut de l'échelle d'absorption : la place d'une absorption négative (Crimson Tear Scarab : −5,8 %). */
export const NEGATION_SCALE_MIN = -10

/** Borne haute de l'échelle des barres de résistance, au-dessus du maximum des armures (108). */
export const RESISTANCE_SCALE_MAX = 120

/** Ligne de l'absorption : un type de dégâts, sa valeur et sa barre. */
export interface NegationRow {
  readonly key: ArmorNegationKey
  /** Libellé français du type de dégâts. */
  readonly label: string
  /** Icône du sprite du type de dégâts. */
  readonly icon: string
  /** Absorption en %, `null` si non documentée (pas de barre). */
  readonly value: number | null
  /** Début de la barre en % de la largeur de la piste. */
  readonly left: number
  /** Longueur de la barre en % de la largeur de la piste. */
  readonly width: number
  /** Absorption négative : les dégâts sont amplifiés. */
  readonly negative: boolean
}

/** Géométrie de la piste d'absorption. */
export interface NegationScale {
  readonly min: number
  readonly max: number
  /** Position du 0 % en % de la largeur de la piste. */
  readonly zero: number
}

/**
 * Échelle de la piste d'absorption : de −10 % à 25 %, élargie par pas de 5 vers le bas si une valeur descend plus bas.
 * @param values Absorptions de la pièce ; les `null` sont ignorés.
 * @returns Bornes et position du zéro.
 */
export function negationScale(values: readonly (number | null)[]): NegationScale {
  const lowest = Math.min(0, ...values.filter((v): v is number => v !== null))
  const min = Math.min(NEGATION_SCALE_MIN, Math.floor(lowest / 5) * 5)
  return { min, max: NEGATION_SCALE_MAX, zero: (-min / (NEGATION_SCALE_MAX - min)) * 100 }
}

/**
 * Lignes d'absorption d'une armure, une par type de dégâts, avec la position de leur barre.
 * @param armor Armure.
 * @returns Huit lignes dans l'ordre de `ARMOR_NEGATION_KEYS`, et l'échelle de la piste.
 */
export function negationRows(armor: Pick<ArmorEntry, 'damage_negation'>): { rows: NegationRow[]; scale: NegationScale } {
  const values = ARMOR_NEGATION_KEYS.map((k) => armor.damage_negation[k])
  const scale = negationScale(values)
  const range = scale.max - scale.min
  const rows = ARMOR_NEGATION_KEYS.map((key, i): NegationRow => {
    const value = values[i] ?? null
    // Le total physique n'a pas d'icône propre dans le sprite : il prend celle du type « Standard », dégâts physiques non typés.
    const labelKey: DamageLabelKey = key
    const icon = DAMAGE_ICONS[labelKey] ?? DAMAGE_ICONS.standard ?? 'd-standard'
    const length = value === null ? 0 : (Math.abs(value) / range) * 100
    return {
      key,
      label: DAMAGE_LABELS[labelKey],
      icon,
      value,
      left: value === null ? scale.zero : value < 0 ? scale.zero - length : scale.zero,
      width: length,
      negative: value !== null && value < 0,
    }
  })
  return { rows, scale }
}

/** Résistances d'une armure, dans l'ordre du wiki. */
export const RESISTANCE_KEYS = ['immunity', 'robustness', 'focus', 'vitality'] as const

/** Clé de résistance d'une armure. */
export type ResistanceKey = (typeof RESISTANCE_KEYS)[number]

/**
 * Statuts que chaque résistance gouverne (docs : `mechanics.json`, sujet « Status Effects », colonne « Resistive Stat » :
 * Poison et Scarlet Rot → Immunity ; Blood Loss et Frostbite → Robustness ; Madness et Sleep → Focus ; Death Blight → Vitality).
 */
const RESISTANCE_STATUSES: Readonly<Record<ResistanceKey, readonly (keyof typeof STATUS_LABELS)[]>> = {
  immunity: ['poison', 'rot'],
  robustness: ['bleed', 'frost'],
  focus: ['madness', 'sleep'],
  vitality: ['death'],
}

/** Ligne de résistance : nom du wiki, statuts concernés (français) et barre. */
export interface ResistanceRow {
  readonly key: ResistanceKey
  /** Nom de la résistance dans le jeu (anglais, comme dans les données). */
  readonly label: string
  /** Statuts concernés, en français. */
  readonly statuses: string
  readonly value: number
  /** Longueur de la barre en % de la piste. */
  readonly width: number
}

/**
 * Lignes de résistance d'une armure.
 * @param armor Armure.
 * @returns Quatre lignes, dans l'ordre du wiki.
 */
export function resistanceRows(armor: Pick<ArmorEntry, 'resistance'>): ResistanceRow[] {
  const names: Readonly<Record<ResistanceKey, string>> = { immunity: 'Immunity', robustness: 'Robustness', focus: 'Focus', vitality: 'Vitality' }
  return RESISTANCE_KEYS.map((key): ResistanceRow => {
    const value = armor.resistance[key]
    return {
      key,
      label: names[key],
      statuses: RESISTANCE_STATUSES[key].map((s) => STATUS_LABELS[s]).join(', '),
      value,
      width: Math.min(100, Math.max(0, (value / RESISTANCE_SCALE_MAX) * 100)),
    }
  })
}

/**
 * Valeurs clés d'une armure : emplacement, poids, équilibre (poise), version altérée.
 * @param armor Armure.
 * @returns Les valeurs, `null` quand le wiki ne les donne pas.
 */
export function armorFacts(armor: ArmorEntry): SheetFact[] {
  return [
    { id: 'slot', label: 'Emplacement', value: armor.slot },
    { id: 'weight', label: 'Poids', value: armor.weight, format: 'weight' },
    { id: 'poise', label: 'Équilibre', value: armor.poise, format: 'decimal', hint: 'Poise, dans les données du wiki.' },
    ...(armor.altered_version === undefined ? [] : [{ id: 'altered', label: 'Version altérée', value: armor.altered_version }]),
  ]
}

/**
 * Alertes de qualité d'une armure : poids ou absorption physique non documentés, obtention absente.
 * @param armor Armure.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function armorAlerts(armor: ArmorEntry): SheetAlert[] {
  return presentAlerts([
    missingFieldsAlert([
      { label: 'Poids', missing: armor.weight === null },
      { label: 'Absorption physique', missing: armor.damage_negation.physical === null },
    ]),
    acquisitionAlert(acquisitionViews(armor)),
  ])
}
