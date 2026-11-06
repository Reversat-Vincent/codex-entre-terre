// Tests des aides du type Calc : un null reste un null, une estimation se propage (calculs.md, introduction).

import { describe, expect, it } from 'vitest'
import { inheritEstimate, isCalc, makeCalc, mapCalc, mapNullable, mergeEstimates, nullCalc } from '../../../src/engine/types.ts'

describe('Calc', () => {
  it('garde un null comme null, sans appeler la transformation', () => {
    let called = false
    const c = nullCalc<number>('level', { code: 'attribute-out-of-range' })
    const m = mapCalc(c, (v) => {
      called = true
      return v * 2
    })
    expect(m.value).toBeNull()
    expect(called).toBe(false)
    expect(m.explanation.limits).toEqual([{ code: 'attribute-out-of-range' }])
    expect(mapNullable<number, number>(null, (v) => v + 1)).toBeNull()
    expect(mapNullable(0, (v) => v + 1)).toBe(1)
  })

  it('propage une estimation à la valeur transformée', () => {
    const c = makeCalc('upgrade-plan', 10, { estimate: { confidence: 'high' } })
    expect(mapCalc(c, (v) => v + 1)).toMatchObject({ value: 11, estimate: { confidence: 'high' } })
  })

  it('retient la confiance la plus faible des sources', () => {
    expect(mergeEstimates(null, undefined)).toBeNull()
    expect(mergeEstimates({ confidence: 'high' }, null)).toEqual({ confidence: 'high' })
    expect(mergeEstimates({ confidence: 'high' }, { confidence: 'medium' }, { confidence: 'high' })).toEqual({ confidence: 'medium' })
    const a = makeCalc('level', 1)
    const b = makeCalc('level', 2, { estimate: { confidence: 'medium' } })
    expect(inheritEstimate(a)).toBeNull()
    expect(inheritEstimate(a, b)).toEqual({ confidence: 'medium' })
  })

  it('reconnaît un Calc', () => {
    expect(isCalc(makeCalc('level', 1))).toBe(true)
    expect(isCalc({ vig: 1 })).toBe(false)
  })
})
