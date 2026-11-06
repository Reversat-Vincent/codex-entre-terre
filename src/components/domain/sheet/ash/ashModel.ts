// Modèle de la fiche de cendre de guerre : coût en FP (notation du wiki « X (Y Z) »), valeurs clés, classes d'armes compatibles et alertes de qualité.

import type { AshOfWarEntry } from '../../../../data/types/ashesOfWar.ts'
import { WEAPON_CLASS_ICONS } from '../../../../ui/labels.ts'
import { parseSkillCost } from '../../../../ui/skillCost.ts'
import { acquisitionAlert, acquisitionViews, missingFieldsAlert, presentAlerts } from '../sheetModel.ts'
import type { SheetAlert, SheetFact } from '../sheetModel.ts'

/**
 * Explication du coût en FP d'une cendre de guerre.
 * Notation du wiki `X (Y Z)` (data/README.md, notation des coûts de compétence) : X le coût de la compétence, Y et Z celui des suites légère et lourde,
 * `-` aucun. Une notation inconnue (« 6+12 », « 7 per second ») est gardée telle quelle, sans interprétation.
 * @param raw Valeur de `fp_cost`.
 * @returns La phrase d'explication, ou `null` pour un nombre simple ou une valeur absente.
 */
export function ashCostHint(raw: AshOfWarEntry['fp_cost']): string | null {
  if (typeof raw !== 'string') return null
  const cost = parseSkillCost(raw)
  if (cost === null) return 'Notation du wiki, gardée telle quelle.'
  const parts = [
    ...(cost.skill === null ? [] : [`compétence ${cost.skill}`]),
    ...(cost.light === null ? [] : [`suite légère ${cost.light}`]),
    ...(cost.heavy === null ? [] : [`suite lourde ${cost.heavy}`]),
  ]
  return cost.light === null && cost.heavy === null && cost.skill !== null
    ? null
    : `Notation du wiki « X (Y Z) » : ${parts.length > 0 ? parts.join(', ') : 'aucun coût lu'}.`
}

/**
 * Valeurs clés d'une cendre de guerre : affinité, coût en FP, compétence.
 * @param ash Cendre de guerre.
 * @returns Les valeurs dans l'ordre d'affichage ; `null` : non documenté.
 */
export function ashFacts(ash: AshOfWarEntry): SheetFact[] {
  const hint = ashCostHint(ash.fp_cost)
  return [
    { id: 'affinity', label: 'Affinité', value: ash.affinity },
    { id: 'fp', label: 'Coût en FP', value: ash.fp_cost, ...(hint === null ? {} : { hint }) },
    { id: 'skill', label: 'Compétence', value: ash.skill },
  ]
}

/** Classe d'armes compatible, avec son icône de classe si le sprite en a une. */
export interface CompatClass {
  readonly name: string
  readonly icon: string | null
}

/**
 * Classes d'armes compatibles avec leur icône.
 * @param ash Cendre de guerre.
 * @returns Une entrée par classe, dans l'ordre du wiki.
 */
export function compatClasses(ash: Pick<AshOfWarEntry, 'compatible_weapon_classes'>): CompatClass[] {
  return ash.compatible_weapon_classes.map((name) => ({ name, icon: WEAPON_CLASS_ICONS[name] ?? null }))
}

/**
 * Alertes de qualité d'une cendre de guerre : coût, classes ou affinités compatibles non documentés, obtention absente.
 * @param ash Cendre de guerre.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function ashAlerts(ash: AshOfWarEntry): SheetAlert[] {
  return presentAlerts([
    missingFieldsAlert([
      { label: 'coût en FP', missing: ash.fp_cost === null },
      { label: 'classes d’armes compatibles', missing: ash.compatible_weapon_classes.length === 0 },
      { label: 'affinités compatibles', missing: ash.compatible_affinities.length === 0 },
    ]),
    acquisitionAlert(acquisitionViews(ash)),
  ])
}
