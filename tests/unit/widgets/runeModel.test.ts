// Tests de la petite courbe du calculateur de runes : hauteurs relatives, échantillonnage, plages vides.
import { describe, expect, it } from 'vitest'
import { MAX_COST_BARS, costBars } from '../../../src/widgets/misc/runeModel.ts'

const costs = (from: number, n: number): { level: number; cost: number }[] => Array.from({ length: n }, (_, i) => ({ level: from + i, cost: 100 * (i + 1) }))

describe('costBars', () => {
  it('ne rend aucune barre pour une plage vide', () => {
    expect(costBars([])).toEqual({ bars: [], step: 1 })
  })
  it('rapporte chaque barre à la plus haute', () => {
    const { bars, step } = costBars(costs(10, 4))
    expect(step).toBe(1)
    expect(bars.map((b) => b.height)).toEqual([25, 50, 75, 100])
    expect(bars.map((b) => b.level)).toEqual([10, 11, 12, 13])
  })
  it('garde une hauteur minimale pour rester visible', () => {
    const { bars } = costBars([{ level: 1, cost: 1 }, { level: 2, cost: 10000 }])
    expect(bars[0]?.height).toBe(4)
  })
  it('trace un niveau sur N au-delà du maximum, et toujours le dernier', () => {
    const list = costs(1, 200)
    const { bars, step } = costBars(list)
    expect(step).toBe(Math.ceil(200 / MAX_COST_BARS))
    expect(bars.length).toBeLessThanOrEqual(MAX_COST_BARS + 1)
    expect(bars[0]?.level).toBe(1)
    expect(bars.at(-1)?.level).toBe(200)
    // Aucune moyenne : chaque barre reprend le coût de la table.
    expect(bars.every((b) => b.cost === b.level * 100)).toBe(true)
  })
})
