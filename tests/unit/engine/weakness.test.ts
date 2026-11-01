// Tests de la lecture des faiblesses : bandes d'AbsorptionHeatmap, types les moins absorbés, immunités.

import { describe, expect, it } from 'vitest'
import { absorptionBand, bestDamageTypes, immunities } from '../../../src/engine/weakness.ts'
import { boss } from './helpers.ts'

describe('absorptionBand', () => {
  it.each([
    [-35, 'w2'],
    [-10, 'w2'],
    [-9, 'w1'],
    [-9.5, 'w1'],
    [5, 'w1'],
    [6, 'n'],
    [15, 'n'],
    [16, 'r1'],
    [30, 'r1'],
    [31, 'r2'],
    [50, 'r2'],
    [51, 'r3'],
    [100, 'r3'],
  ])('%d %% → %s', (v, band) => expect(absorptionBand(v)).toBe(band))

  it('null ou absent → null', () => {
    expect(absorptionBand(null)).toBe('null')
    expect(absorptionBand(undefined)).toBe('null')
  })
})

describe('bestDamageTypes et immunities', () => {
  it('trie par absorption croissante, ex æquo dans l’ordre des types', () => {
    const margit = boss('margit-the-fell-omen').encounters[0]
    if (margit?.damage_negation_percent === undefined) throw new Error('Margit sans absorption')
    const neg = margit.damage_negation_percent
    const best = bestDamageTypes(margit, 3)
    expect(best).toHaveLength(3)
    const values = (best ?? []).map((b) => b.value)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(Math.min(...Object.values(neg))).toBe(values[0])
  })

  it('renvoie null sans absorption ou sans résistances documentées', () => {
    expect(bestDamageTypes({}, 3)).toBeNull()
    expect(immunities({})).toBeNull()
  })

  it('ne retient que les valeurs exactement « Immune »', () => {
    expect(immunities({ status_resistance: { poison: 'Immune', blood_loss: 154, sleep: 'no', madness: 'Immune' } })).toEqual([
      'poison',
      'madness',
    ])
    expect(immunities({ status_resistance: {} })).toEqual([])
  })
})
