// Coût en runes d'un niveau et total entre deux niveaux, lus dans la table officielle 1–713 (décision C1).
// Méthode : docs/design/ds/calculs.md, « Coût en runes d'un niveau ». La formule entière n'existe que dans les tests, comme contrôle de cohérence.

import type { CalcTables, LevelCostRow } from '../data/types/tables.ts'
import { isIntIn, makeCalc, nullCalc } from './types.ts'
import type { Calc, DataRef, ExplanationLimit } from './types.ts'

/**
 * Ligne de la table pour un niveau, ou `undefined` si elle n'existe pas.
 * @param tables Tables de calcul.
 * @param level Niveau de départ.
 * @returns La ligne du niveau.
 */
function rowOf(tables: CalcTables, level: number): LevelCostRow | undefined {
  const rows = tables.levelCosts.rows
  const direct = rows[level - 1]
  // La table est continue depuis 1 (contrôle de la préparation) ; la recherche ne sert que si ce n'était plus le cas.
  return direct?.level === level ? direct : rows.find((r) => r.level === level)
}

/**
 * Dernier niveau de la table.
 * @param tables Tables de calcul.
 * @returns Le plus haut niveau de départ de la table (713 avec les données actuelles).
 */
function lastLevel(tables: CalcTables): number {
  // Table vide : aucun niveau. 0 est sous tout niveau valide (≥ 1), donc chaque appel rend `level-out-of-table` ; ce 0 ne s'affiche jamais.
  return tables.levelCosts.rows.at(-1)?.level ?? 0
}

/**
 * Limite « plafond non confirmé » quand le calcul dépasse le dernier niveau de la table (calculs.md : plafond de 713 non vérifiable,
 * le coût de 713 vers 714 ne sert que si 713 n'est pas le plafond).
 * @param tables Tables de calcul.
 * @param level Plus haut niveau atteint par le calcul.
 * @returns La limite, ou rien.
 */
function capLimit(tables: CalcTables, level: number): ExplanationLimit[] {
  const last = lastLevel(tables)
  return level > last ? [{ code: 'max-level-unconfirmed', params: { level: last } }] : []
}

/**
 * Runes pour passer du niveau `level` au niveau suivant (calculs.md, « Coût en runes d'un niveau » : colonne `Runes to next`, qui fait foi).
 * @param level Niveau de départ, entier de la table (1 à 713).
 * @param tables Tables de calcul (`levelCosts`).
 * @returns Le coût ; `null` avec `level-out-of-table` si le niveau n'est pas dans la table.
 */
export function runeCost(level: number, tables: CalcTables): Calc<number> {
  const row = Number.isInteger(level) ? rowOf(tables, level) : undefined
  if (row === undefined) return nullCalc('rune-cost', { code: 'level-out-of-table', params: { level } })
  const input: DataRef = {
    file: 'tables',
    entry: 'levelCosts',
    field: `rows[level=${level}].runesToNext`,
    value: row.runesToNext,
    reliability: 'wiki',
  }
  return makeCalc('rune-cost', row.runesToNext, {
    components: [{ code: 'rune-cost', value: row.runesToNext, params: { level } }],
    inputs: [input],
    limits: capLimit(tables, level + 1),
  })
}

/**
 * Runes pour passer du niveau `from` au niveau `to` (calculs.md : somme des coûts niveau par niveau, de `from` à `to − 1`).
 * Le total tient dans un entier JavaScript sûr (1 692 566 842 au plus).
 * @param from Niveau actuel.
 * @param to Niveau visé (`to ≥ from`) ; `to = from` coûte 0.
 * @param tables Tables de calcul (`levelCosts`).
 * @returns Le total ; `null` avec `invalid-range` si `to < from`, ou `level-out-of-table` si un niveau manque.
 */
export function runesBetween(from: number, to: number, tables: CalcTables): Calc<number> {
  const last = lastLevel(tables)
  const components = [
    { code: 'level-from' as const, value: from },
    { code: 'level-to' as const, value: to },
  ]
  if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) {
    return nullCalc('rune-cost', { code: 'invalid-range', params: { from, to } }, { components })
  }
  // Le niveau `to` doit exister : la table donne le coût de 713 vers 714, donc `to` va jusqu'à 714 au plus.
  if (!isIntIn(from, 1, last) || !isIntIn(to, 1, last + 1)) {
    return nullCalc('rune-cost', { code: 'level-out-of-table', params: { from, to } }, { components })
  }
  let total = 0
  for (let l = from; l < to; l++) {
    const row = rowOf(tables, l)
    if (row === undefined) return nullCalc('rune-cost', { code: 'level-out-of-table', params: { level: l } }, { components })
    total += row.runesToNext
  }
  return makeCalc('rune-cost', total, {
    components: [...components, { code: 'runes-total', value: total }],
    inputs:
      to > from
        ? [{ file: 'tables', entry: 'levelCosts', field: 'rows[].runesToNext', value: `${from}–${to - 1}`, reliability: 'wiki' }]
        : [],
    limits: capLimit(tables, to),
  })
}
