// Lignes de la couverture des données : met en forme les décomptes du moteur pour `CxCoverageBar` et rédige ce que chaque barre compte.
// Les décomptes viennent de `analysis.coverage` (calculs.md, « Couverture des données ») ; ce module ne compte rien.

import type { CoverageRow as BarRow } from '../../components/ds/types.ts'
import type { CoverageRow } from '../../engine/coverage.ts'
import { labelText } from '../../ui/explainText.ts'
import { formatInt } from '../../ui/format.ts'

/** Ligne de barre et détail du décompte, avec ce que la barre compte. */
export interface CoverageLine {
  /** Ligne de `CxCoverageBar`. */
  readonly bar: BarRow
  /** Nombre d'entrées déduites d'une règle du wiki, comptées dans « documenté ». */
  readonly deduced: number
  /** Ce que la barre compte, en une ou deux phrases. */
  readonly explanation: string
}

/** Règle des lignes « type d'amélioration » (calculs.md : `derived.upgrade.reliability`). */
const UPGRADE_RULE =
  "Compte chaque arme du fichier. Documenté : le type d'amélioration est lu sur le wiki, « non améliorable » compris ; déduit : il vient d'une règle du wiki ; estimé : c'est une estimation de la préparation des données (badge Estimation) ; non documenté : aucun type n'est connu."

/** Règles des lignes de la frise et des rencontres, selon la donnée comptée. */
const ENCOUNTER_RULES: Readonly<Record<'hp' | 'runes' | 'negation', string>> = {
  hp: 'Documenté : le wiki donne au moins une valeur de PV. Non documenté : aucune valeur, ou rencontre absente des données. Aucune estimation.',
  runes: 'Documenté : le wiki donne au moins une valeur de runes. Non documenté : aucune valeur, ou rencontre absente des données. Aucune estimation.',
  negation: "Documenté : le wiki donne l'absorption par type de dégâts. Non documenté : aucune absorption, ou rencontre absente des données. Aucune estimation.",
}

/**
 * Ce que compte une ligne de couverture.
 * @param row Ligne du moteur.
 * @returns Le texte de la règle de comptage.
 */
function explanationOf(row: CoverageRow): string {
  const scope = row.id.startsWith('coverage-timeline') ? 'Rencontres de la frise, prérequis boss compris. ' : row.id.startsWith('coverage-encounters') ? 'Toutes les rencontres de bosses.json. ' : ''
  if (row.id.startsWith('coverage-upgrade')) return UPGRADE_RULE
  const kind = row.id.endsWith('-hp') ? 'hp' : row.id.endsWith('-runes') ? 'runes' : 'negation'
  return `${scope}${ENCOUNTER_RULES[kind]}`
}

/**
 * Lignes de couverture prêtes à afficher. Le « documenté » d'une barre réunit le documenté et le déduit, comme le décompte de l'explication du moteur
 * (composante `coverage-documented`) ; le nombre de déduits reste lisible dans le détail.
 * @param rows Lignes du moteur (`analysis.coverage.value`).
 * @returns Une ligne par sujet, dans l'ordre du moteur.
 */
export function coverageLines(rows: readonly CoverageRow[]): CoverageLine[] {
  return rows.map((row) => ({
    bar: {
      id: row.id,
      label: labelText(row.id),
      documented: row.counts.documented + row.counts.deduced,
      estimated: row.counts.estimated,
      missing: row.counts.undocumented,
    },
    deduced: row.counts.deduced,
    explanation: explanationOf(row),
  }))
}

/**
 * Décompte d'une ligne en une phrase, pour le détail.
 * @param line Ligne.
 * @returns Par exemple « 150 documentés (dont 12 déduits), 40 estimés, 145 non documentés ».
 */
export function countsText(line: CoverageLine): string {
  const documented = `${formatInt(line.bar.documented)} documentés${line.deduced > 0 ? ` (dont ${formatInt(line.deduced)} déduits)` : ''}`
  return `${documented}, ${formatInt(line.bar.estimated)} estimés, ${formatInt(line.bar.missing)} non documentés`
}
