// Tests des prérequis à deux mains : floor(STR × 1,5), écart en Force réelle, exceptions (calculs.md, « Prérequis comparés au profil » ;
// verification-calculs.md § 3). Les arcs et balistes sont lus dans data/ : ils ne sont pas dans les fixtures.

import { describe, expect, it } from 'vitest'
import {
  checkRequirements,
  compareRequirements,
  twoHandMode,
  twoHandedStrength,
  twoHandedStrengthNeeded,
} from '../../../src/engine/requirements.ts'
import { attrs, rawWeapon, weapon } from './helpers.ts'

describe('Force à deux mains', () => {
  it('STR 15 → effective 22 (floor)', () => {
    expect(twoHandedStrength(15)).toBe(22)
    expect(twoHandedStrength(7)).toBe(10)
    expect(twoHandedStrength(14)).toBe(21)
  })

  it.each([
    ["Igon's Greatbow", 23, 16],
    ['Greatbow', 20, 14],
    ['Golem Greatbow', 24, 16],
    ['Lion Greatbow', 22, 15],
    ['Hand Ballista', 30, 20],
    ['Jar Cannon', 34, 23],
    ["Rabbath's Cannon", 28, 19],
  ])('%s (prérequis %i) → Force réelle %i', (name, required, needed) => {
    const w = rawWeapon('ranged_weapons_catalysts', name)
    expect(w.requirements.str).toBe(required)
    expect(twoHandedStrengthNeeded(required)).toBe(needed)
    expect(twoHandMode(w)).toBe('always')
    // Le premier profil qui atteint le prérequis a exactement la Force réelle publiée par le wiki.
    const at = compareRequirements(w, attrs({ str: needed, dex: 99 }), 'one')[0]
    const below = compareRequirements(w, attrs({ str: needed - 1, dex: 99 }), 'one')[0]
    expect(at).toMatchObject({ attr: 'str', met: true, gap: 0, twoHandApplied: true })
    expect(below).toMatchObject({ met: false, gap: 1 })
  })

  it("Igon's Greatbow avec STR 15 : effective 22, écart affiché 1", () => {
    const w = rawWeapon('ranged_weapons_catalysts', "Igon's Greatbow")
    const [str] = compareRequirements(w, attrs({ str: 15, dex: 16 }), 'one')
    expect(str).toEqual({ attr: 'str', required: 23, actual: 15, effective: 22, met: false, gap: 1, twoHandApplied: true })
  })
})

describe('compareRequirements', () => {
  it('ne rend que les prérequis non nuls, atteints si effectif ≥ demandé', () => {
    const club = weapon('melee_armaments', 'club')
    expect(compareRequirements(club, attrs({ str: 10 }), 'one')).toEqual([
      { attr: 'str', required: 10, actual: 10, effective: 10, met: true, gap: 0, twoHandApplied: false },
    ])
    expect(compareRequirements(club, attrs({ str: 9 }), 'one')[0]).toMatchObject({ met: false, gap: 1 })
  })

  it('applique le bonus à deux mains à la Force seulement', () => {
    const longsword = weapon('melee_armaments', 'longsword')
    const checks = compareRequirements(longsword, attrs({ str: 7, dex: 9 }), 'two')
    expect(checks[0]).toMatchObject({ attr: 'str', effective: 10, met: true, twoHandApplied: true })
    expect(checks[1]).toMatchObject({ attr: 'dex', effective: 9, met: false, gap: 1, twoHandApplied: false })
  })

  it('refuse le bonus aux armes sans posture à deux mains', () => {
    const fist = rawWeapon('melee_armaments', 'Caestus')
    expect(fist.category).toBe('Fists')
    expect(twoHandMode(fist)).toBe('none')
    const ornamental = rawWeapon('melee_armaments', 'Ornamental Straight Sword')
    expect(twoHandMode(ornamental)).toBe('none')
    const [str] = compareRequirements(ornamental, attrs({ str: ornamental.requirements.str - 1 }), 'two')
    expect(str).toMatchObject({ met: false, twoHandApplied: false })
  })

  it('accorde le bonus à la Starscourge Greatsword', () => {
    const w = rawWeapon('melee_armaments', 'Starscourge Greatsword')
    expect(twoHandMode(w)).toBe('optional')
    expect(checkRequirements(w, attrs(), 'two', { file: 'melee_armaments' }).explanation.limits).toContainEqual({
      code: 'two-hand-bonus-exception',
    })
  })

  it('laisse la bascule aux arcs ordinaires', () => {
    expect(twoHandMode(rawWeapon('ranged_weapons_catalysts', 'Longbow'))).toBe('optional')
  })
})

describe('checkRequirements', () => {
  it('explique les prérequis lus et la Force effective', () => {
    const w = rawWeapon('ranged_weapons_catalysts', 'Greatbow')
    const c = checkRequirements(w, attrs({ str: 14, dex: 20 }), 'one', { file: 'ranged_weapons_catalysts' })
    expect(c.value?.allMet).toBe(true)
    expect(c.value?.mode).toBe('always')
    expect(c.explanation.method).toBe('requirements')
    expect(c.explanation.components).toContainEqual({ code: 'effective-strength', value: 21, params: { actual: 14 } })
    expect(c.explanation.inputs).toContainEqual({
      file: 'ranged_weapons_catalysts',
      entry: 'greatbow',
      field: 'requirements.str',
      value: 20,
      reliability: 'wiki',
    })
    expect(c.explanation.limits).toContainEqual({ code: 'two-hand-always', params: { category: 'Greatbows' } })
  })
})
