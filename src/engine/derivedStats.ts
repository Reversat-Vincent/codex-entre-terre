// Statistiques dérivées de base (PV, FP, endurance, charge d'équipement), lues dans les tables 1–99 (décision C2).
// Méthode : docs/design/ds/calculs.md, « Statistiques dérivées ». Jamais `origins[].base_stats` (anomalie Heavy Knight), ni interpolation ni formule.

import type { AttributeRow, CalcTable, CalcTableKey, CalcTables } from '../data/types/tables.ts'
import type { ComponentCode } from './codes.ts'
import { isIntIn, makeCalc } from './types.ts'
import type { Attributes, Calc, DataRef, ExplanationComponent, ExplanationLimit } from './types.ts'

/** Statistiques dérivées ; une statistique dont l'attribut est hors table vaut `null`, jamais 0. */
export interface DerivedStats {
  readonly hp: number | null
  readonly fp: number | null
  readonly stamina: number | null
  /** Charge d'équipement, une décimale (table du sujet Endurance). */
  readonly equipLoad: number | null
}

/** Attributs lus : Vigor, Mind, Endurance. */
export type DerivedStatsInput = Pick<Attributes, 'vig' | 'mnd' | 'end'>

/** Lecture d'une statistique : attribut source, table et code de composante. */
interface StatSpec {
  readonly key: keyof DerivedStats
  readonly attr: keyof DerivedStatsInput
  readonly table: Exclude<CalcTableKey, 'levelCosts'>
  readonly code: ComponentCode
}

/** Table lue pour chaque statistique (calculs.md : sujets Vigor `HP`, Mind `FP`, Endurance `Stamina` et `Equip Load`). */
const STATS: readonly StatSpec[] = [
  { key: 'hp', attr: 'vig', table: 'hpByVigor', code: 'hp' },
  { key: 'fp', attr: 'mnd', table: 'fpByMind', code: 'fp' },
  { key: 'stamina', attr: 'end', table: 'staminaByEndurance', code: 'stamina' },
  { key: 'equipLoad', attr: 'end', table: 'equipLoadByEndurance', code: 'equip-load' },
]

/**
 * Valeur d'une table d'attribut pour un nombre de points.
 * @param table Table 1–99.
 * @param points Points de l'attribut.
 * @returns La valeur, ou `null` si la ligne n'existe pas.
 */
export function attributeTableValue(table: CalcTable<AttributeRow>, points: number): number | null {
  if (!Number.isInteger(points)) return null
  const direct = table.rows[points - 1]
  // Tables continues depuis 1 (contrôle de la préparation) ; la recherche ne sert que si ce n'était plus le cas.
  const row = direct?.points === points ? direct : table.rows.find((r) => r.points === points)
  return row?.value ?? null
}

/**
 * PV, FP, endurance et charge d'équipement de base (calculs.md, « Statistiques dérivées » : lecture directe des tables 1–99).
 * Les valeurs ne comptent ni talismans, ni Great Runes, ni Physick, ni armure (limite `base-values-only`).
 * @param attrs Vigor, Mind et Endurance du profil.
 * @param tables Tables de calcul.
 * @returns Les quatre statistiques ; chacune vaut `null` avec la limite `table-row-missing` si son attribut est hors de la table.
 */
export function derivedStats(attrs: DerivedStatsInput, tables: CalcTables): Calc<DerivedStats> {
  const values: Record<keyof DerivedStats, number | null> = { hp: null, fp: null, stamina: null, equipLoad: null }
  const components: ExplanationComponent[] = []
  const inputs: DataRef[] = []
  const limits: ExplanationLimit[] = [{ code: 'base-values-only' }]
  for (const s of STATS) {
    const points = attrs[s.attr]
    const value = isIntIn(points, 1, 99) ? attributeTableValue(tables[s.table], points) : null
    values[s.key] = value
    components.push({ code: s.code, value, params: { attr: s.attr, points } })
    if (value === null) {
      limits.push({ code: 'table-row-missing', params: { table: s.table, points } })
    } else {
      inputs.push({ file: 'tables', entry: s.table, field: `rows[points=${points}].value`, value, reliability: 'wiki' })
    }
  }
  return makeCalc('derived-stats', values, { components, inputs, limits })
}
