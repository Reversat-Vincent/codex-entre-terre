// Tests de la puissance d'attaque calculée (calculs.md, « Puissance d'attaque calculée (Estimation) » ; verification-calculs.md § 7).
// Club +0 STR 9 → 61 est vérifié sur le wiki ; les cas Longsword sont des tests de non-régression de la méthode, pas des vérités du jeu.

import { describe, expect, it } from 'vitest'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { attackPower, curveFamily, scalingCurve } from '../../../src/engine/attackPower.ts'
import type { AttackBreakdown, AttackPowerResult } from '../../../src/engine/attackPower.ts'
import { ATTACK_POWER } from '../../../src/engine/config/attackPower.ts'
import type { Calc, Hands } from '../../../src/engine/types.ts'
import { attrs, weapon } from './helpers.ts'

const melee = { file: 'melee_armaments' } as const
const published = { file: 'melee_armaments', cfg: { ...ATTACK_POWER, mode: 'published' } } as const

function calc(r: AttackPowerResult): Calc<AttackBreakdown> {
  if ('unavailable' in r) throw new Error(`non calculable : ${r.unavailable}`)
  return r
}

function total(w: WeaponEntry, level: number, str: number, dex: number, hands: Hands, affinity = 'Standard'): number | null {
  return calc(attackPower(w, affinity, level, attrs({ str, dex }), hands, melee)).value?.total ?? null
}

describe('scalingCurve', () => {
  it('interpole la courbe physique du wiki', () => {
    expect(scalingCurve(10).value).toBe(15)
    expect(scalingCurve(15).value).toBe(25)
    expect(scalingCurve(20).value).toBe(35)
    expect(scalingCurve(21).value).toBeCloseTo(36.15, 10)
    expect(scalingCurve(99)).toEqual({ value: 96, limit: null })
  })

  it('signale les zones non documentées (sous 10, au-delà de 99)', () => {
    const low = scalingCurve(5)
    expect(low.value).toBeCloseTo((15 * 4) / 9, 10)
    expect(low.limit).toEqual({ code: 'curve-below-10', params: { points: 5 } })
    expect(scalingCurve(1).value).toBe(0)
    expect(scalingCurve(120)).toEqual({ value: 96, limit: { code: 'curve-above-99', params: { points: 120 } } })
  })

  it('interpole la courbe non physique du wiki ; sous 10, entre (1 ; 0) et (10 ; 19)', () => {
    expect(scalingCurve(10, ATTACK_POWER, 'nonPhysical').value).toBe(19)
    expect(scalingCurve(20, ATTACK_POWER, 'nonPhysical').value).toBe(40)
    expect(scalingCurve(45, ATTACK_POWER, 'nonPhysical').value).toBeCloseTo(73.25, 10)
    expect(scalingCurve(99, ATTACK_POWER, 'nonPhysical')).toEqual({ value: 100, limit: null })
    expect(scalingCurve(5, ATTACK_POWER, 'nonPhysical').value).toBeCloseTo((19 * 4) / 9, 10)
  })

  it('famille selon l’affinité (D39, S4) : huit affinités non physiques, le reste physique', () => {
    for (const a of ['Fire', 'Flame Art', 'Lightning', 'Sacred', 'Magic', 'Cold', 'Blood', 'Poison']) expect(curveFamily(a), a).toBe('nonPhysical')
    for (const a of ['Standard', 'Heavy', 'Keen', 'Quality', 'Occult']) expect(curveFamily(a), a).toBe('physical')
  })
})

describe('attackPower, Club (vérifié sur le wiki)', () => {
  const club = weapon('melee_armaments', 'club')

  it('Club +0, STR 9, une main → 61 (−40 %, sans bonus)', () => {
    const c = calc(attackPower(club, 'Standard', 0, attrs({ str: 9 }), 'one', melee))
    expect(c.value?.total).toBe(61)
    expect(c.value?.types[0]).toMatchObject({ type: 'physical', base: 103, status: 'penalty', value: 61 })
    expect(c.estimate).toEqual({ confidence: 'medium' })
    expect(c.explanation.limits).toContainEqual({ code: 'requirement-not-met', params: { type: 'physical', attrs: 'str' } })
    expect(c.explanation.inputs).toContainEqual({ file: 'melee_armaments', entry: 'club', field: 'attack_power.physical', value: 103, reliability: 'wiki' })
  })

  it('Club +0, STR 9, deux mains → effective 13, prérequis atteint, bonus non calculable', () => {
    const c = calc(attackPower(club, 'Standard', 0, attrs({ str: 9 }), 'two', melee))
    expect(c.value?.effective.str).toBe(13)
    expect(c.value?.types[0]).toMatchObject({ status: 'no-coef', bonus: null, coefs: { str: null }, value: 103 })
    expect(c.value?.partial).toBe(true)
    expect(c.explanation.limits).toContainEqual({ code: 'scaling-coef-missing', params: { type: 'physical' } })
    expect(c.explanation.limits).toContainEqual({ code: 'infobox-base' })
  })

  it('sans tableau, seul +0 en Standard est calculable', () => {
    expect(attackPower(club, 'Heavy', 0, attrs(), 'one', melee)).toEqual({ unavailable: 'affinity-undocumented' })
    expect(attackPower(club, 'Standard', 5, attrs(), 'one', melee)).toEqual({ unavailable: 'affinity-undocumented' })
  })
})

describe('attackPower, Longsword (non-régression)', () => {
  const longsword = weapon('melee_armaments', 'longsword')

  it.each([
    [0, 20, 20, 'one', 141],
    [25, 20, 20, 'one', 380],
    [25, 40, 40, 'one', 453],
    [10, 30, 15, 'one', 236],
    [0, 14, 10, 'two', 135],
    [0, 9, 20, 'one', 66],
    [0, 7, 20, 'two', 130],
  ] as const)('+%i, STR %i, DEX %i, %s main(s) → %i', (level, str, dex, hands, expected) => {
    expect(total(longsword, level, str, dex, hands)).toBe(expected)
  })

  it('+10 interpolé : base 172, coefficients 0,6 / 0,394, badge Estimation', () => {
    const c = calc(attackPower(longsword, 'Standard', 10, attrs({ str: 30, dex: 15 }), 'one', melee))
    const phys = c.value?.types[0]
    expect(phys?.base).toBeCloseTo(172, 10)
    expect(phys?.baseInterpolated).toBe(true)
    expect(phys?.coefs.str).toBeCloseTo(0.6, 10)
    expect(phys?.coefs.dex).toBeCloseTo(0.394, 10)
    expect(phys?.curve).toEqual({ str: 46.5, dex: 25 })
    expect(c.explanation.limits).toContainEqual({ code: 'base-interpolated', params: { from: 0, to: 25 } })
    expect(c.explanation.limits).toContainEqual({ code: 'coef-interpolated' })
    expect(c.explanation.limits).toContainEqual({ code: 'generic-curve' })
  })

  it('+0, STR 14 à deux mains : effective 21, courbe 36,15', () => {
    const c = calc(attackPower(longsword, 'Standard', 0, attrs({ str: 14, dex: 10 }), 'two', melee))
    expect(c.value?.effective.str).toBe(21)
    expect(c.value?.types[0]?.curve.str).toBeCloseTo(36.15, 10)
  })

  it('Cold : la magie varie avec INT, le physique avec STR et DEX, tous deux sur la courbe non physique', () => {
    const c = calc(attackPower(longsword, 'Cold', 0, attrs({ str: 20, dex: 20, int: 20 }), 'one', melee))
    const [phys, magic] = c.value?.types ?? []
    // Courbe non physique à 20 = 40 (point 6, D39) : 89 × (1 + (0,45 + 0,29) × 0,40) = 115,34 ; 71 × (1 + 0,4 × 0,40) = 82,36.
    expect(phys).toMatchObject({ type: 'physical', base: 89, status: 'scaled', value: 115, curve: { str: 40, dex: 40 } })
    expect(magic).toMatchObject({ type: 'magic', base: 71, status: 'scaled', value: 82 })
    expect(c.value?.total).toBe(197)
    expect(c.explanation.limits).toContainEqual({ code: 'curve-non-physical' })
    expect(c.explanation.inputs).toContainEqual({ file: 'config', entry: 'attackPower', field: 'curves.nonPhysical', value: 'Cold', reliability: 'wiki' })
  })

  it('Standard et Occult gardent la courbe physique, sans limite « non physique »', () => {
    const std = calc(attackPower(longsword, 'Standard', 0, attrs({ str: 20, dex: 20 }), 'one', melee))
    expect(std.explanation.limits).not.toContainEqual({ code: 'curve-non-physical' })
    const occult = calc(attackPower(longsword, 'Occult', 0, attrs({ str: 20, dex: 20, arc: 20 }), 'one', melee))
    expect(occult.value?.types[0]?.curve.str).toBe(35)
    expect(occult.explanation.limits).not.toContainEqual({ code: 'curve-non-physical' })
  })

  it('refuse un niveau au-delà du maximum ou non entier', () => {
    expect(attackPower(longsword, 'Standard', 26, attrs(), 'one', melee)).toEqual({ unavailable: 'level-out-of-range' })
    expect(attackPower(longsword, 'Standard', -1, attrs(), 'one', melee)).toEqual({ unavailable: 'level-out-of-range' })
    expect(attackPower(longsword, 'Standard', 2.5, attrs(), 'one', melee)).toEqual({ unavailable: 'level-out-of-range' })
  })

  it('garde null pour une base non documentée : le total reste null, jamais 0', () => {
    const table = longsword.upgrade.tables?.Standard
    if (table === undefined) throw new Error('tableau Standard absent')
    const zero = table['+0']
    if (zero === undefined) throw new Error('+0 absent')
    const odd = {
      ...longsword,
      upgrade: { ...longsword.upgrade, tables: { Standard: { ...table, '+0': { ...zero, attack: { ...zero.attack, magic: '56/56' } } } } },
    } as WeaponEntry
    const c = calc(attackPower(odd, 'Standard', 0, attrs({ str: 20, dex: 20 }), 'one', melee))
    expect(c.value?.types.find((t) => t.type === 'magic')).toMatchObject({ base: null, status: 'missing', value: null })
    expect(c.value?.total).toBeNull()
    expect(c.explanation.limits).toContainEqual({ code: 'attack-value-unparsed', params: { type: 'magic' } })
  })
})

describe('attackPower, données particulières', () => {
  it('tableau incohérent : base de l’infobox à +0, scaling élémentaire non documenté', () => {
    const w = weapon('melee_armaments', 'fire-knights-shortsword')
    const c = calc(attackPower(w, 'Standard', 0, attrs({ str: 20, dex: 20, fai: 20 }), 'one', melee))
    expect(c.value?.types.map((t) => [t.type, t.base, t.status])).toEqual([
      ['physical', 75, 'scaled'],
      ['fire', 32, 'undocumented'],
    ])
    expect(c.value?.partial).toBe(true)
    expect(c.explanation.limits).toContainEqual({ code: 'table-inconsistent' })
    expect(c.explanation.limits).toContainEqual({ code: 'elemental-scaling-undocumented', params: { type: 'fire' } })
    expect(c.explanation.limits).toContainEqual({ code: 'scaling-attribute-ignored', params: { attr: 'fai' } })
  })

  it('coefficients absents (lettres seules) : bonus non calculable', () => {
    const w = weapon('melee_armaments', 'scorpions-stinger')
    const c = calc(attackPower(w, 'Standard', 5, attrs({ str: 20, dex: 20 }), 'one', melee))
    expect(c.value?.types[0]).toMatchObject({ status: 'no-coef', bonus: null })
  })
})

describe('attackPower, mode published', () => {
  const longsword = weapon('melee_armaments', 'longsword')

  it('rend la valeur publiée au niveau documenté, sans estimation', () => {
    const c = calc(attackPower(longsword, 'Standard', 25, attrs({ str: 40, dex: 40 }), 'one', published))
    expect(c.value?.total).toBe(265)
    expect(c.value?.types[0]?.status).toBe('published')
    expect(c.estimate).toBeNull()
    expect(calc(attackPower(weapon('melee_armaments', 'club'), 'Standard', 0, attrs(), 'one', published)).value?.total).toBe(103)
  })

  it('n’interpole pas : niveau non documenté → non calculable', () => {
    expect(attackPower(longsword, 'Standard', 10, attrs(), 'one', published)).toEqual({ unavailable: 'published-value-missing' })
  })
})
