// Tests de la préparation et de la jauge (calculs.md, « Préparation et jauge ») : seuils Prêt / Limite / Trop tôt, maximum de la jauge.

import { describe, expect, it } from 'vitest'
import { gaugeMax, readiness } from '../../../src/engine/readiness.ts'
import { makeCalc } from '../../../src/engine/types.ts'

const rec = (v: number | null) => makeCalc('boss-level', v, { estimate: v === null ? null : { confidence: 'medium' } })

describe('readiness', () => {
  it.each([
    [62, 62, 'ready'],
    [70, 62, 'ready'],
    [61, 62, 'limit'],
    [54, 62, 'limit'],
    [53, 62, 'early'],
    [1, 62, 'early'],
  ])('niveau %i, recommandé %i → %s', (level, r, expected) => {
    expect(readiness(level, rec(r), false).value).toBe(expected)
  })

  it('Vaincu prime sur le niveau ; Non estimé sans niveau recommandé', () => {
    expect(readiness(1, rec(62), true).value).toBe('defeated')
    const u = readiness(40, rec(null), false)
    expect(u.value).toBe('unknown')
    expect(u.explanation.limits).toContainEqual({ code: 'boss-not-estimated' })
  })

  it('hérite de l’estimation du niveau recommandé', () => {
    const c = readiness(60, rec(62), false)
    expect(c.estimate).toEqual({ confidence: 'medium' })
    expect(c.explanation.components).toContainEqual({ code: 'limit-margin', value: 8 })
  })
})

describe('gaugeMax', () => {
  it('vaut max(recommandé + 30, niveau + 12, 60)', () => {
    expect(gaugeMax(10, 21)).toBe(60)
    expect(gaugeMax(40, 62)).toBe(92)
    expect(gaugeMax(150, 119)).toBe(162)
    expect(gaugeMax(30, 35)).toBe(65)
  })

  it('sans niveau recommandé, garde le repère du joueur dans la jauge', () => {
    expect(gaugeMax(20, null)).toBe(60)
    expect(gaugeMax(100, null)).toBe(112)
  })
})
