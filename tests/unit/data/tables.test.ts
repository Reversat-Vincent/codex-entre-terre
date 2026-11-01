// Tests du fichier tables : continuité, valeurs lues dans mechanics.json, source de chaque table, contrôle bloquant.

import { describe, expect, it } from 'vitest'
import { extractCalcTables } from '../../../scripts/data/calcTables.ts'
import { DataCheckError } from '../../../scripts/data/checks.ts'
import type { MechanicRaw } from '../../../src/data/types/mechanics.ts'
import type { TablesFile } from '../../../src/data/types/tables.ts'
import { fixture, rawData } from './helpers.ts'

describe('tables de calcul', () => {
  const { tables } = fixture<TablesFile>('tables')

  it('couvrent les niveaux 1 à 713 sans trou', () => {
    expect(tables.levelCosts.rows).toHaveLength(713)
    tables.levelCosts.rows.forEach((r, i) => expect(r.level).toBe(i + 1))
    expect(tables.levelCosts.rows[0]?.runesToNext).toBe(673)
    expect(tables.levelCosts.source).toEqual({ file: 'mechanics', title: 'Level', path: 'topics[title="Level"].summary_tables[0]' })
  })

  it('couvrent les attributs 1 à 99 sans trou', () => {
    for (const t of [tables.hpByVigor, tables.fpByMind, tables.staminaByEndurance, tables.equipLoadByEndurance]) {
      expect(t.rows).toHaveLength(99)
      t.rows.forEach((r, i) => expect(r.points).toBe(i + 1))
    }
    expect(tables.hpByVigor.rows[14]).toEqual({ points: 15, value: 522 })
    expect(tables.hpByVigor.columns).toEqual({ points: 'Vigor', value: 'HP' })
    expect(tables.equipLoadByEndurance.rows[16]?.value).toBe(59.3)
  })

  it('arrêtent la préparation si une ligne manque', () => {
    const topics = structuredClone(rawData().mechanics.entries) as MechanicRaw[]
    const vigor = topics.find((t) => t.title === 'Vigor')
    const rows = vigor?.summary_tables?.[0] as unknown[] | undefined
    if (rows === undefined) throw new Error('table Vigor introuvable')
    rows.splice(10, 1)
    expect(() => extractCalcTables(topics)).toThrow(DataCheckError)
  })
})
