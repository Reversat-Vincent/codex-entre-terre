// Modèle de la fiche d'origine : attributs de départ, statistiques du wiki, défense et absorption, résistances, équipement de départ en noms à relier et alertes.
// Valeurs du wiki sans conversion : le moteur de calcul n'intervient pas ici (les statistiques dérivées du build cible sont celles du widget « Configuration de départ optimale »).

import type { OriginEntry } from '../../../../data/types/origins.ts'
import { ATTRIBUTE_BY_DATA_KEY, ATTRIBUTE_LABELS, DAMAGE_LABELS } from '../../../../ui/labels.ts'
import type { AttributeKey, DamageLabelKey } from '../../../../ui/labels.ts'
import { missingFieldsAlert, presentAlerts, toNameEntries } from '../sheetModel.ts'
import type { NameEntry, SheetAlert, SheetFact } from '../sheetModel.ts'

/** Attributs dans l'ordre du jeu, avec leur clé dans `origins.json` (en toutes lettres). */
const ATTRIBUTE_FIELDS = ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane'] as const

/** Un attribut de départ : abréviation, nom du jeu (anglais) et valeur. */
export interface OriginAttribute {
  readonly key: AttributeKey
  readonly abbr: string
  readonly name: string
  readonly value: number
}

/**
 * Les huit attributs de départ d'une origine, dans l'ordre du jeu.
 * @param origin Origine.
 * @returns Une ligne par attribut.
 */
export function originAttributes(origin: OriginEntry): OriginAttribute[] {
  return ATTRIBUTE_FIELDS.map((field): OriginAttribute => {
    const key = ATTRIBUTE_BY_DATA_KEY[field]!
    return { key, abbr: ATTRIBUTE_LABELS[key].abbr, name: ATTRIBUTE_LABELS[key].name, value: origin.attributes[field] }
  })
}

/**
 * Niveau et statistiques de départ du wiki (PV, FP, endurance, charge d'équipement, découverte, équilibre). Les valeurs viennent de l'infobox de la page :
 * ce sont celles du wiki, pas un calcul de l'application. `null` (Heavy Knight : découverte et équilibre) → « Non documenté ».
 * @param origin Origine.
 * @returns Les valeurs dans l'ordre d'affichage.
 */
export function originFacts(origin: OriginEntry): SheetFact[] {
  const s = origin.base_stats
  return [
    { id: 'level', label: 'Niveau', value: origin.level },
    { id: 'hp', label: 'PV', value: s.hp },
    { id: 'fp', label: 'FP', value: s.fp },
    { id: 'stamina', label: 'Endurance', value: s.stamina },
    { id: 'load', label: 'Charge d’équipement', value: s.equip_load, format: 'decimal' },
    { id: 'discovery', label: 'Découverte', value: s.discovery },
    { id: 'poise', label: 'Équilibre', value: s.poise },
  ]
}

/** Ligne de défense : un type de dégâts, sa défense et son absorption. */
export interface OriginDefenseRow {
  readonly key: DamageLabelKey
  readonly label: string
  readonly defense: number | null
  /** Absorption en % (jusqu'à trois décimales dans le wiki). */
  readonly negation: number | null
}

const DEFENSE_KEYS = ['physical', 'strike', 'slash', 'pierce', 'magic', 'fire', 'lightning', 'holy'] as const

/**
 * Lignes de défense et d'absorption d'une origine.
 * @param origin Origine.
 * @returns Huit lignes, dans l'ordre du wiki.
 */
export function originDefenseRows(origin: OriginEntry): OriginDefenseRow[] {
  return DEFENSE_KEYS.map((key): OriginDefenseRow => ({
    key,
    label: DAMAGE_LABELS[key],
    defense: origin.defense[key],
    negation: origin.damage_negation[key],
  }))
}

/** Ligne de résistance : nom du jeu (anglais), base, équipement et total. */
export interface OriginResistanceRow {
  readonly key: 'immunity' | 'robustness' | 'focus' | 'vitality'
  readonly label: string
  readonly base: number | undefined
  readonly equipment: number | undefined
  readonly total: number | undefined
}

const RESISTANCE_LABELS = { immunity: 'Immunity', robustness: 'Robustness', focus: 'Focus', vitality: 'Vitality' } as const

/**
 * Lignes de résistance d'une origine. Le total compte l'équipement de départ : le wiki le donne séparément de la base.
 * @param origin Origine.
 * @returns Quatre lignes, dans l'ordre du wiki.
 */
export function originResistanceRows(origin: OriginEntry): OriginResistanceRow[] {
  return (Object.keys(RESISTANCE_LABELS) as (keyof typeof RESISTANCE_LABELS)[]).map((key): OriginResistanceRow => {
    const r = origin.resistance[key]
    return { key, label: RESISTANCE_LABELS[key], base: r.base, equipment: r.equipment, total: r.total }
  })
}

/** Groupe d'équipement de départ. */
export interface OriginEquipmentGroup {
  readonly key: 'Armaments' | 'Spells' | 'Gear' | 'Misc'
  /** Libellé français du groupe. */
  readonly label: string
  readonly entries: readonly NameEntry[]
}

const EQUIPMENT_LABELS = { Armaments: 'Armes et boucliers', Spells: 'Sorts', Gear: 'Armure', Misc: 'Divers' } as const

/**
 * Équipement de départ en noms. Une entrée qui groupe plusieurs objets (« Shortbow + Bone Arrow ») est séparée pour que chaque nom puisse mener à sa fiche.
 * Les groupes vides sont omis.
 * @param origin Origine.
 * @returns Les groupes d'équipement non vides.
 */
export function originEquipment(origin: OriginEntry): OriginEquipmentGroup[] {
  return (Object.keys(EQUIPMENT_LABELS) as (keyof typeof EQUIPMENT_LABELS)[]).flatMap((key) => {
    const names = origin.starting_equipment[key].flatMap((entry) => entry.split(/\s+\+\s+/))
    const entries = toNameEntries(names)
    return entries.length === 0 ? [] : [{ key, label: EQUIPMENT_LABELS[key], entries }]
  })
}

/**
 * Alertes de qualité d'une origine : statistiques que le wiki ne documente pas.
 * @param origin Origine.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function originAlerts(origin: OriginEntry): SheetAlert[] {
  return presentAlerts([
    missingFieldsAlert([
      { label: 'la découverte', missing: origin.base_stats.discovery === null },
      { label: 'l’équilibre', missing: origin.base_stats.poise === null },
    ]),
  ])
}
