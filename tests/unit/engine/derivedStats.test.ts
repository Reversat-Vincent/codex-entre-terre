// Tests des statistiques dérivées : lecture des tables 1–99 (calculs.md, « Statistiques dérivées » ; verification-calculs.md § 2).

import { describe, expect, it } from 'vitest'
import { derivedStats } from '../../../src/engine/derivedStats.ts'
import { attrs, tables } from './helpers.ts'

describe('derivedStats', () => {
  const t = tables()
  const stats = (vig: number, mnd: number, end: number) => derivedStats(attrs({ vig, mnd, end }), t).value

  it('Vigor 15 → 522 PV ; Mind 10 → 78 FP ; Endurance 25 → 121 et 72,0', () => {
    expect(stats(15, 10, 25)).toEqual({ hp: 522, fp: 78, stamina: 121, equipLoad: 72 })
  })

  it.each([
    [15, 522],
    [40, 1450],
    [60, 1900],
    [99, 2100],
  ])('Vigor %i → %i PV', (vig, hp) => expect(stats(vig, 10, 10)?.hp).toBe(hp))

  it.each([
    [10, 78],
    [50, 300],
    [99, 450],
  ])('Mind %i → %i FP', (mnd, fp) => expect(stats(10, mnd, 10)?.fp).toBe(fp))

  it.each([
    [8, 92, 45],
    [15, 105, 56.1],
    [60, 158, 120],
    [99, 170, 160],
  ])('Endurance %i → endurance %i, charge %d', (end, stamina, load) => {
    expect(stats(10, 10, end)).toMatchObject({ stamina, equipLoad: load })
  })

  it('Astrologer et Samurai concordent avec origins.json', () => {
    expect(stats(9, 15, 9)).toEqual({ hp: 396, fp: 95, stamina: 94, equipLoad: 46.6 })
    expect(stats(12, 11, 13)).toEqual({ hp: 455, fp: 82, stamina: 101, equipLoad: 52.9 })
  })

  it('cite les tables lues et la limite des valeurs de base', () => {
    const c = derivedStats(attrs({ vig: 15 }), t)
    expect(c.explanation.inputs).toContainEqual({ file: 'tables', entry: 'hpByVigor', field: 'rows[points=15].value', value: 522, reliability: 'wiki' })
    expect(c.explanation.limits).toContainEqual({ code: 'base-values-only' })
    expect(c.estimate).toBeNull()
  })

  it('garde null pour un attribut hors table, jamais 0', () => {
    const c = derivedStats(attrs({ vig: 0, end: 100 }), t)
    expect(c.value).toEqual({ hp: null, fp: 78, stamina: null, equipLoad: null })
    expect(c.explanation.components.find((x) => x.code === 'hp')?.value).toBeNull()
    expect(c.explanation.limits.filter((l) => l.code === 'table-row-missing')).toHaveLength(3)
  })
})
