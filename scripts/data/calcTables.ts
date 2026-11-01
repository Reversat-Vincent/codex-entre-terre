// Extraction du fichier `tables` depuis `mechanics.json` : coût des niveaux et tables d'attributs, avec contrôle de continuité (bloquant).
// Références : docs/architecture.md § 3.2 (`tables`) et § 3.5 ; colonne `Increments` ignorée, table de la page « Stamina » (incomplète) non utilisée (décision C2).

import type { MechanicRaw } from '../../src/data/types/mechanics.ts'
import type { AttributeRow, CalcTable, CalcTables, LevelCostRow, TableSource } from '../../src/data/types/tables.ts'
import { assertNoFailures } from './checks.ts'

/** Niveau maximal de la table des coûts (page Level du wiki). */
export const LEVEL_MAX = 713
/** Valeur maximale d'un attribut. */
export const ATTRIBUTE_MAX = 99

interface Located {
  readonly source: TableSource
  readonly rows: readonly Readonly<Record<string, unknown>>[]
}

/**
 * Trouve le premier tableau d'introduction d'une page qui contient toutes les colonnes demandées.
 * @param topics Pages de `mechanics.json`.
 * @param title Titre de la page.
 * @param columns Colonnes requises.
 * @param failures Écarts, complétés en place.
 * @returns Le tableau et sa source, ou `null` s'il est introuvable.
 */
function locate(topics: readonly MechanicRaw[], title: string, columns: readonly string[], failures: string[]): Located | null {
  const topic = topics.find((t) => t.title === title)
  if (topic === undefined) {
    failures.push(`mechanics : page « ${title} » absente`)
    return null
  }
  const tables = topic.summary_tables ?? []
  for (let i = 0; i < tables.length; i++) {
    const rows = tables[i] ?? []
    const objects = rows.filter((r): r is Readonly<Record<string, string | number>> => !Array.isArray(r))
    if (objects.length > 0 && objects.length === rows.length && columns.every((c) => objects.some((r) => c in r))) {
      return { source: { file: 'mechanics', title, path: `topics[title="${title}"].summary_tables[${i}]` }, rows: objects }
    }
  }
  failures.push(`mechanics : aucun tableau de « ${title} » avec les colonnes ${columns.join(', ')}`)
  return null
}

/**
 * Lit une colonne numérique et vérifie la continuité de la colonne d'index (1, 2, …, max).
 * @param located Tableau trouvé.
 * @param indexColumn Colonne d'index.
 * @param max Dernière valeur attendue de l'index.
 * @param valueColumns Colonnes de valeurs à lire.
 * @param failures Écarts, complétés en place.
 * @returns Les lignes (index puis valeurs, dans l'ordre des colonnes), vide en cas d'écart.
 */
function readContinuous(
  located: Located,
  indexColumn: string,
  max: number,
  valueColumns: readonly string[],
  failures: string[],
): number[][] {
  const where = `${located.source.title} (${located.source.path})`
  if (located.rows.length !== max) {
    failures.push(`${where} : ${located.rows.length} lignes au lieu de ${max}`)
    return []
  }
  const out: number[][] = []
  for (let i = 0; i < located.rows.length; i++) {
    const row = located.rows[i] ?? {}
    const cells = [indexColumn, ...valueColumns].map((c) => row[c])
    if (cells.some((c) => typeof c !== 'number')) {
      failures.push(`${where} : ligne ${i + 1}, valeur non numérique ${JSON.stringify(row)}`)
      continue
    }
    if (cells[0] !== i + 1) failures.push(`${where} : ${indexColumn} ${String(cells[0])} à la ligne ${i + 1} (suite 1–${max} rompue)`)
    out.push(cells as number[])
  }
  return out
}

function attributeTable(
  topics: readonly MechanicRaw[],
  title: string,
  indexColumn: string,
  valueColumn: string,
  failures: string[],
): CalcTable<AttributeRow> | null {
  const located = locate(topics, title, [indexColumn, valueColumn], failures)
  if (located === null) return null
  const rows = readContinuous(located, indexColumn, ATTRIBUTE_MAX, [valueColumn], failures)
  return {
    source: located.source,
    columns: { points: indexColumn, value: valueColumn },
    rows: rows.map(([points, value]) => ({ points: points as number, value: value as number })),
  }
}

/**
 * Extrait les tables de calcul et contrôle leur continuité (niveaux 1–713, attributs 1–99).
 * @param topics Pages de `mechanics.json`.
 * @returns Les tables, chacune avec sa source.
 * @throws DataCheckError si une table manque, est incomplète ou discontinue.
 */
export function extractCalcTables(topics: readonly MechanicRaw[]): CalcTables {
  const failures: string[] = []
  const levelCols = { level: 'Level', runesToNext: 'Runes to next', costIncrease: 'Cost increase', totalRunes: 'Total runes' } as const
  const levelLocated = locate(topics, 'Level', Object.values(levelCols), failures)
  const levelRows = levelLocated
    ? readContinuous(levelLocated, levelCols.level, LEVEL_MAX, [levelCols.runesToNext, levelCols.costIncrease, levelCols.totalRunes], failures)
    : []
  const hpByVigor = attributeTable(topics, 'Vigor', 'Vigor', 'HP', failures)
  const fpByMind = attributeTable(topics, 'Mind', 'Mind', 'FP', failures)
  const staminaByEndurance = attributeTable(topics, 'Endurance', 'Endurance', 'Stamina', failures)
  const equipLoadByEndurance = attributeTable(topics, 'Endurance', 'Endurance', 'Equip Load', failures)
  assertNoFailures('tables continues (niveaux 1–713, attributs 1–99)', failures)
  const levelCosts: CalcTable<LevelCostRow> = {
    source: (levelLocated as Located).source,
    columns: levelCols,
    rows: levelRows.map(([level, runesToNext, costIncrease, totalRunes]) => ({
      level: level as number,
      runesToNext: runesToNext as number,
      costIncrease: costIncrease as number,
      totalRunes: totalRunes as number,
    })),
  }
  return {
    levelCosts,
    hpByVigor: hpByVigor as CalcTable<AttributeRow>,
    fpByMind: fpByMind as CalcTable<AttributeRow>,
    staminaByEndurance: staminaByEndurance as CalcTable<AttributeRow>,
    equipLoadByEndurance: equipLoadByEndurance as CalcTable<AttributeRow>,
  }
}
