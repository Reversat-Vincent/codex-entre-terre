// Tests du plan d'amélioration (calculs.md, « Plan d'amélioration » ; verification-calculs.md § 5).

import { describe, expect, it } from 'vitest'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { upgradePlan, upgradeStatus } from '../../../src/engine/upgradePlan.ts'
import type { UpgradePlan } from '../../../src/engine/upgradePlan.ts'
import type { Calc } from '../../../src/engine/types.ts'
import { weapon } from './helpers.ts'

const melee = { file: 'melee_armaments' } as const

function totals(c: Calc<UpgradePlan>): Record<string, number> {
  return Object.fromEntries((c.value?.stones ?? []).map((s) => [s.name, s.quantity]))
}

describe('upgradePlan', () => {
  const longsword = weapon('melee_armaments', 'longsword')
  const stinger = weapon('melee_armaments', 'scorpions-stinger')

  it('normale +0 → +3 : 12 × Smithing Stone [1] (2 + 4 + 6)', () => {
    const c = upgradePlan(longsword, 0, 3, melee)
    expect(c.value?.steps.map((s) => s.quantity)).toEqual([2, 4, 6])
    expect(totals(c)).toEqual({ 'Smithing Stone [1]': 12 })
    expect(c.estimate).toBeNull()
    expect(c.value?.bellBearings.map((b) => b.item)).toEqual(['item:smithing-stone-miners-bell-bearing-1'])
  })

  it('normale +5 → +10 : 6 × [2], 12 × [3], 2 × [4]', () => {
    expect(totals(upgradePlan(longsword, 5, 10, melee))).toEqual({
      'Smithing Stone [2]': 6,
      'Smithing Stone [3]': 12,
      'Smithing Stone [4]': 2,
    })
  })

  it('normale +0 → +25 : 12 de chaque palier [1] à [8] (96) + 1 Ancient Dragon', () => {
    const c = upgradePlan(longsword, 0, 25, melee)
    const t = totals(c)
    for (let i = 1; i <= 8; i++) expect(t[`Smithing Stone [${i}]`]).toBe(12)
    expect(t['Ancient Dragon Smithing Stone']).toBe(1)
    expect(c.value?.totalStones).toBe(96)
    expect(c.value?.ancientStones).toBe(1)
    expect(c.value?.stones.at(-1)?.tier).toBe('ancient')
    expect(c.value?.bellBearings).toHaveLength(4)
    expect(c.explanation.limits).toContainEqual({ code: 'ancient-stones-not-purchasable' })
    expect(c.explanation.limits).toContainEqual({ code: 'prices-not-in-data' })
  })

  it('sombre +0 → +10 : une Somber [1] à [9] + 1 Somber Ancient Dragon', () => {
    const c = upgradePlan(stinger, 0, 10, melee)
    const t = totals(c)
    for (let i = 1; i <= 9; i++) expect(t[`Somber Smithing Stone [${i}]`]).toBe(1)
    expect(t['Somber Ancient Dragon Smithing Stone']).toBe(1)
    expect(c.value?.totalStones).toBe(9)
    expect(c.value?.bellBearings.map((b) => b.item)).toEqual([
      'item:somberstone-miners-bell-bearing-1',
      'item:somberstone-miners-bell-bearing-2',
      'item:somberstone-miners-bell-bearing-3',
      'item:somberstone-miners-bell-bearing-4',
      'item:somberstone-miners-bell-bearing-5',
    ])
  })

  it('Club (estimation normale, confiance moyenne) : plan +25 avec badge Estimation', () => {
    const club = weapon('melee_armaments', 'club')
    expect(upgradeStatus(club)).toBe('estimate')
    const c = upgradePlan(club, 0, 25, melee)
    expect(c.value?.material).toBe('Smithing Stones')
    expect(c.value?.totalStones).toBe(96)
    expect(c.estimate).toEqual({ confidence: 'medium' })
    expect(c.explanation.inputs[0]).toMatchObject({ field: 'upgrade.estimate_if_undocumented.material', reliability: 'estimate' })
    expect(c.explanation.limits).toContainEqual({ code: 'upgrade-type-estimated', params: { confidence: 'medium' } })
  })

  it('Moonveil (estimation sombre, confiance élevée) : plan +10 estimé', () => {
    const c = upgradePlan(weapon('melee_armaments', 'moonveil'), 0, 10, melee)
    expect(c.value?.material).toBe('Somber Smithing Stones')
    expect(c.estimate).toEqual({ confidence: 'high' })
  })

  it('bouclier sans type ni estimation : « Non documenté », plan non calculé', () => {
    const shield = weapon('shields_torches', 'rickety-shield')
    expect(upgradeStatus(shield)).toBe('undocumented')
    const c = upgradePlan(shield, 0, 1, { file: 'shields_torches' })
    expect(c.value).toBeNull()
    expect(c.explanation.limits).toEqual([{ code: 'upgrade-type-undocumented' }])
  })

  it('arme « Not upgradeable » : « Non améliorable », plan non calculé', () => {
    const staff = weapon('ranged_weapons_catalysts', 'meteorite-staff')
    expect(upgradeStatus(staff)).toBe('not-upgradeable')
    const c = upgradePlan(staff, 0, 0, { file: 'ranged_weapons_catalysts' })
    expect(c.value).toBeNull()
    expect(c.explanation.limits).toEqual([{ code: 'not-upgradeable' }])
  })

  it('type déduit : plan non estimé, limite « déduit »', () => {
    const idus = weapon('melee_armaments', 'idus-sword')
    const c = upgradePlan(idus, 0, 1, melee)
    expect(c.estimate).toBeNull()
    expect(c.explanation.limits).toContainEqual({ code: 'upgrade-type-deduced' })
    expect(c.explanation.inputs[0]?.reliability).toBe('deduced')
  })

  it('plan vide pour un même niveau, null hors bornes', () => {
    expect(upgradePlan(longsword, 7, 7, melee).value?.steps).toEqual([])
    expect(upgradePlan(longsword, 0, 26, melee).value).toBeNull()
    expect(upgradePlan(stinger, 0, 11, melee).explanation.limits.at(-1)?.code).toBe('level-out-of-range')
    expect(upgradePlan(longsword, 5, 3, melee).value).toBeNull()
  })

  it('refuse un matériau inconnu', () => {
    const odd = { ...longsword, derived: { ...longsword.derived, upgrade: { ...longsword.derived.upgrade, material: 'Glovewort' } } } as WeaponEntry
    expect(upgradePlan(odd, 0, 1, melee).explanation.limits.at(-1)?.code).toBe('material-unknown')
  })
})
