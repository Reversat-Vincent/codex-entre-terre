// Modèle de la fiche de cendre d'esprit : coût en FP ou en PV, matériau d'amélioration, alertes de qualité. Valeurs du wiki, sans conversion.

import type { SpiritAshEntry } from '../../../../data/types/spiritAshes.ts'
import { acquisitionAlert, acquisitionViews, presentAlerts } from '../sheetModel.ts'
import type { SheetAlert, SheetFact } from '../sheetModel.ts'

/**
 * Valeurs clés d'une cendre d'esprit. Le wiki donne un coût en FP (esprits invoqués avec des FP) ou en PV (esprits qui consomment des points de vie) ;
 * seuls les coûts présents sont listés. Si aucun n'est documenté, les deux lignes s'affichent « Non documenté », jamais 0.
 * @param spirit Cendre d'esprit.
 * @returns Les valeurs dans l'ordre d'affichage.
 */
export function spiritFacts(spirit: SpiritAshEntry): SheetFact[] {
  const noCost = spirit.fp_cost === undefined && spirit.hp_cost === undefined
  return [
    ...(spirit.fp_cost !== undefined || noCost ? [{ id: 'fp', label: 'Coût en FP', value: spirit.fp_cost ?? null }] : []),
    ...(spirit.hp_cost !== undefined || noCost ? [{ id: 'hp', label: 'Coût en PV', value: spirit.hp_cost ?? null }] : []),
    // `null` : le wiki ne nomme aucun matériau ; un nom est relié à sa fiche seulement s'il est exactement celui d'un objet.
    { id: 'upgrade', label: 'Matériau d’amélioration', value: spirit.upgrade_material, linkKinds: ['item'] as const },
    { id: 'type', label: 'Type', value: spirit.type },
  ]
}

/**
 * Alertes de qualité d'une cendre d'esprit : coût non documenté, matériau d'amélioration non documenté, obtention absente.
 * @param spirit Cendre d'esprit.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function spiritAlerts(spirit: SpiritAshEntry): SheetAlert[] {
  const missing: string[] = []
  if (spirit.fp_cost === undefined && spirit.hp_cost === undefined) missing.push('le coût (en FP ou en PV)')
  if (spirit.upgrade_material === null) missing.push('le matériau d’amélioration')
  return presentAlerts([
    missing.length === 0
      ? null
      : {
          id: 'missing-fields',
          tone: 'partial',
          title: 'Données partielles.',
          text: `Le wiki ne documente pas ${missing.join(' ni ')}. Ces valeurs s’affichent « Non documenté », jamais 0.`,
        },
    acquisitionAlert(acquisitionViews(spirit)),
  ])
}
