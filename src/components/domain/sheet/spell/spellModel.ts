// Modèle de la fiche de sort : prérequis INT, FAI et ARC rangés avec la comparaison du store d'analyse (`requirementsOf`), valeurs clés et alertes de qualité.

import type { SpellEntry } from '../../../../data/types/spells.ts'
import type { RequirementCheck } from '../../../../engine/requirements.ts'
import type { Attributes } from '../../../../engine/types.ts'
import { acquisitionAlert, acquisitionViews, missingFieldsAlert, presentAlerts } from '../sheetModel.ts'
import type { SheetAlert, SheetFact } from '../sheetModel.ts'

/** Attributs dont un sort peut exiger une valeur, dans l'ordre du wiki. */
export const SPELL_ATTRIBUTES = ['int', 'fai', 'arc'] as const

/** Attribut exigible par un sort. */
export type SpellAttribute = (typeof SPELL_ATTRIBUTES)[number]

/** Ligne de prérequis : valeur exigée, valeur du profil et comparaison du moteur (absente si aucun prérequis ou si elle n'est pas calculée). */
export interface SpellRequirementRow {
  readonly attr: SpellAttribute
  /** Valeur exigée (`requirements.<attr>`) ; 0 : aucun prérequis. */
  readonly required: number
  /** Valeur de l'attribut dans les critères en cours. */
  readonly actual: number
  /** Comparaison produite par le moteur ; `null` quand le prérequis vaut 0. */
  readonly check: RequirementCheck | null
}

/**
 * Prérequis d'un sort rangés par attribut, avec la comparaison au profil faite par le moteur (calculs.md, « Prérequis comparés au profil »),
 * lue dans le store d'analyse (`requirementsOf`) : un sort n'exige que INT, FAI et ARC, et aucun bonus de deux mains ne s'applique.
 * @param spell Sort.
 * @param attrs Attributs des critères en cours.
 * @param checks Comparaisons du moteur (`requirementsOf(ref).value.checks`), vides tant qu'elles ne sont pas calculées.
 * @returns Une ligne par attribut (INT, FAI, ARC), même quand il n'y a pas de prérequis.
 */
export function spellRequirementRows(spell: Pick<SpellEntry, 'requirements'>, attrs: Attributes, checks: readonly RequirementCheck[]): SpellRequirementRow[] {
  return SPELL_ATTRIBUTES.map((attr): SpellRequirementRow => ({
    attr,
    required: spell.requirements[attr],
    actual: attrs[attr],
    check: checks.find((c) => c.attr === attr) ?? null,
  }))
}

/**
 * Valeurs clés d'un sort : type, école, vendeur et prix d'achat (infobox du wiki). Le vendeur est une liste de noms reliés aux fiches des PNJ.
 * @param spell Sort.
 * @returns Les valeurs dans l'ordre d'affichage ; `null` : non documenté.
 */
export function spellFacts(spell: SpellEntry): SheetFact[] {
  const seller = spell.infobox.seller
  const price = spell.infobox.buy_price
  return [
    { id: 'type', label: 'Type', value: spell.spell_type },
    // `sub_type` est tel que dans le wiki, casse comprise (« carian » et « Carian » coexistent dans les données).
    { id: 'school', label: 'École', value: spell.sub_type ?? null },
    { id: 'slots', label: 'Emplacements', value: spell.slots_used, hint: 'Emplacements de mémoire occupés.' },
    typeof seller === 'string'
      ? { id: 'seller', label: 'Vendeur', value: seller, linkKinds: ['npc'] as const, nameList: true }
      : { id: 'seller', label: 'Vendeur', value: null },
    { id: 'price', label: 'Prix d’achat', value: price ?? null, unit: 'runes' },
  ]
}

/**
 * Alertes de qualité d'un sort : école ou coût en endurance non documentés, obtention absente.
 * @param spell Sort.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function spellAlerts(spell: SpellEntry): SheetAlert[] {
  return presentAlerts([
    missingFieldsAlert([
      { label: 'école', missing: spell.sub_type === undefined },
      { label: 'coût en endurance', missing: spell.stamina_cost === undefined },
    ]),
    acquisitionAlert(acquisitionViews(spell)),
  ])
}
