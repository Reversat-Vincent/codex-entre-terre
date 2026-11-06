// Tests du coût en runes : lecture de la table 1–713, cas de calculs.md et verification-calculs.md § 1, formule entière = table (cohérence).

import { describe, expect, it } from 'vitest'
import { runeCost, runeCostsBetween, runesBetween } from '../../../src/engine/runes.ts'
import { tables } from './helpers.ts'

/** Formule entière de calculs.md, qui n'existe que dans les tests : k = max(0, 2 × (L − 11)) + 10, coût = floor(k × (L + 81)² / 100) + 1. */
function formula(level: number): number {
  const k = Math.max(0, 2 * (level - 11)) + 10
  return Math.floor((k * (level + 81) ** 2) / 100) + 1
}

describe('runeCost', () => {
  const t = tables()

  it.each([
    [1, 673],
    [11, 847],
    [12, 1038],
    [150, 153680],
    [209, 341447],
    [679, 7774497],
    [712, 8879348],
  ])('coût(%i) = %i', (level, expected) => {
    const c = runeCost(level, t)
    expect(c.value).toBe(expected)
    expect(c.estimate).toBeNull()
    expect(c.explanation.inputs[0]).toMatchObject({ file: 'tables', entry: 'levelCosts', value: expected, reliability: 'wiki' })
  })

  it('égale la formule entière sur 1–712', () => {
    for (let l = 1; l <= 712; l++) expect(runeCost(l, t).value, `niveau ${l}`).toBe(formula(l))
  })

  it('signale que le plafond de 713 n’est pas confirmé', () => {
    expect(runeCost(713, t).explanation.limits).toContainEqual({ code: 'max-level-unconfirmed', params: { level: 713 } })
    expect(runeCost(712, t).explanation.limits).toEqual([])
  })

  it('renvoie null hors de la table', () => {
    for (const l of [0, 714, 1.5]) {
      const c = runeCost(l, t)
      expect(c.value).toBeNull()
      expect(c.explanation.limits[0]?.code).toBe('level-out-of-table')
    }
  })
})

describe('runesBetween', () => {
  const t = tables()

  it.each([
    [9, 10, 811],
    [9, 40, 134856],
    [1, 150, 7112459],
    [1, 713, 1692566842],
  ])('total de %i à %i = %i', (from, to, expected) => {
    expect(runesBetween(from, to, t).value).toBe(expected)
  })

  it('égale la colonne Total runes de la table', () => {
    for (const row of t.levelCosts.rows) expect(runesBetween(1, row.level, t).value).toBe(row.totalRunes)
  })

  it('vaut 0 pour un même niveau et null pour un intervalle inversé', () => {
    expect(runesBetween(50, 50, t).value).toBe(0)
    const c = runesBetween(50, 40, t)
    expect(c.value).toBeNull()
    expect(c.explanation.limits).toEqual([{ code: 'invalid-range', params: { from: 50, to: 40 } }])
  })

  it('refuse un niveau hors de la table', () => {
    expect(runesBetween(0, 10, t).value).toBeNull()
    expect(runesBetween(1, 715, t).value).toBeNull()
  })
})

describe('runeCostsBetween', () => {
  const t = tables()

  it('un coût par niveau, lu dans la table ; leur somme est le total (9 à 40 = 134 856)', () => {
    const r = runeCostsBetween(9, 40, t)
    expect(r.explanation.method).toBe('rune-cost')
    expect(r.value).toHaveLength(31)
    expect(r.value?.[0]).toEqual({ level: 9, cost: runeCost(9, t).value })
    expect(r.value?.at(-1)?.level).toBe(39)
    expect(r.value?.reduce((s, c) => s + c.cost, 0)).toBe(134856)
    expect(r.explanation.components).toContainEqual({ code: 'runes-total', value: 134856 })
  })

  it('plage vide, inversée ou hors table : liste vide, ou null avec la limite', () => {
    expect(runeCostsBetween(10, 10, t).value).toEqual([])
    const inverted = runeCostsBetween(40, 9, t)
    expect(inverted.value).toBeNull()
    expect(inverted.explanation.limits.at(-1)?.code).toBe('invalid-range')
    expect(runeCostsBetween(1, 715, t).explanation.limits.at(-1)?.code).toBe('level-out-of-table')
  })
})
