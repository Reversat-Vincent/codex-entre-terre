// Tests du niveau d'un jeu d'attributs : Σ − 79 pour les 12 origines (calculs.md, « Origine optimale »).

import { describe, expect, it } from 'vitest'
import { levelOf, originAttributes } from '../../../src/engine/level.ts'
import { attrs, origins } from './helpers.ts'

describe('levelOf', () => {
  it('vaut Σ attributs − 79 pour les 12 origines', () => {
    const all = origins()
    expect(all).toHaveLength(12)
    for (const o of all) expect(levelOf(originAttributes(o)).value, o.name).toBe(o.level)
  })

  it('donne Wretch 1, Confessor 10, Heavy Knight 10', () => {
    const byName = new Map(origins().map((o) => [o.name, o]))
    const lv = (n: string): number | null => {
      const o = byName.get(n)
      if (o === undefined) throw new Error(n)
      return levelOf(originAttributes(o)).value
    }
    expect([lv('Wretch'), lv('Confessor'), lv('Heavy Knight')]).toEqual([1, 10, 10])
  })

  it('explique la somme et le décalage', () => {
    const c = levelOf(attrs())
    expect(c.value).toBe(1)
    expect(c.explanation.method).toBe('level')
    expect(c.explanation.components).toContainEqual({ code: 'attribute-sum', value: 80 })
    expect(c.estimate).toBeNull()
  })

  it('renvoie null hors de 1–99, jamais 0', () => {
    expect(levelOf(attrs({ str: 0 })).value).toBeNull()
    expect(levelOf(attrs({ dex: 100 })).explanation.limits).toEqual([{ code: 'attribute-out-of-range', params: { attr: 'dex' } }])
    expect(levelOf(attrs({ int: 10.5 })).value).toBeNull()
  })
})
