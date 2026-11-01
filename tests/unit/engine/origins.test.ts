// Tests du classement des origines : cas A, B, C et Wretch de calculs.md (« Origine optimale ») et verification-calculs.md § 4.

import { describe, expect, it } from 'vitest'
import { effectiveOrigin, rankOrigins, startingArmamentNames } from '../../../src/engine/origins.ts'
import type { OriginRankContext } from '../../../src/engine/origins.ts'
import { originAttributes } from '../../../src/engine/level.ts'
import { makeCalc } from '../../../src/engine/types.ts'
import { ordered, origins } from './helpers.ts'

const noFit: OriginRankContext = { weights: {}, recommendedWeapons: new Set() }

function table(target: readonly number[], ctx: OriginRankContext = noFit): Map<string, [number, number]> {
  const all = origins()
  const byId = new Map(all.map((o) => [`origin:${o.id}`, o.name]))
  const out = new Map<string, [number, number]>()
  for (const c of rankOrigins(all, ordered(target), ctx)) {
    if (c.value === null) throw new Error('classement non calculé')
    out.set(byId.get(c.value.origin) ?? '?', [c.value.finalLevel, c.value.wastedPoints])
  }
  return out
}

describe('rankOrigins', () => {
  it('cas A : Vagabond (43, 0) ; Heavy Knight (46, 3) ; Samurai (47, 4) ; Wretch (48, 5) ; Prophet et Astrologer (57, 14)', () => {
    const t = table([40, 10, 20, 14, 13, 9, 9, 7])
    expect([...t.keys()][0]).toBe('Vagabond')
    expect(t.get('Vagabond')).toEqual([43, 0])
    expect(t.get('Heavy Knight')).toEqual([46, 3])
    expect(t.get('Samurai')).toEqual([47, 4])
    expect(t.get('Wretch')).toEqual([48, 5])
    expect(t.get('Prophet')).toEqual([57, 14])
    expect(t.get('Astrologer')).toEqual([57, 14])
  })

  it('cas B : Astrologer (92, 0) ; Prisoner (97, 5) ; Wretch (98, 6) ; Prophet (105, 13)', () => {
    const t = table([40, 20, 15, 8, 12, 60, 7, 9])
    expect([...t.keys()].slice(0, 3)).toEqual(['Astrologer', 'Prisoner', 'Wretch'])
    expect(t.get('Astrologer')).toEqual([92, 0])
    expect(t.get('Prisoner')).toEqual([97, 5])
    expect(t.get('Wretch')).toEqual([98, 6])
    expect(t.get('Prophet')).toEqual([105, 13])
  })

  it('cas C : Prophet (105, 0) ; Wretch (108, 3) ; Confessor et Heavy Knight (109, 4)', () => {
    const t = table([40, 25, 20, 12, 10, 7, 60, 10])
    expect([...t.keys()].slice(0, 2)).toEqual(['Prophet', 'Wretch'])
    expect(t.get('Confessor')).toEqual([109, 4])
    expect(t.get('Heavy Knight')).toEqual([109, 4])
  })

  it('cible = attributs du Wretch → Wretch (1, 0)', () => {
    const wretch = origins().find((o) => o.name === 'Wretch')
    if (wretch === undefined) throw new Error('Wretch')
    const [first] = rankOrigins(origins(), originAttributes(wretch), noFit)
    expect(first?.value).toMatchObject({ origin: 'origin:wretch', rank: 1, finalLevel: 1, wastedPoints: 0 })
  })

  it('départage les ex æquo par l’adéquation précoce, bonus d’arme recommandée compris', () => {
    // Cas C : Confessor et Heavy Knight à 109. Poids Force seul : Heavy Knight (STR 15) passe devant Confessor (STR 12).
    const target = ordered([40, 25, 20, 12, 10, 7, 60, 10])
    const strOnly = rankOrigins(origins(), target, { weights: { str: 1 }, recommendedWeapons: new Set() })
    const pos = (ranks: typeof strOnly, id: string): number => ranks.findIndex((c) => c.value?.origin === id)
    expect(pos(strOnly, 'origin:heavy-knight')).toBeLessThan(pos(strOnly, 'origin:confessor'))
    expect(strOnly[pos(strOnly, 'origin:heavy-knight')]?.value?.earlyFit).toBe(15)

    // Avec la Broadsword recommandée, Confessor reçoit le bonus de 5 (12 + 5 = 17 > 15) et passe devant.
    const ctx: OriginRankContext = { weights: { str: 1 }, recommendedWeapons: new Set(['Broadsword']) }
    const withBonus = rankOrigins(origins(), target, ctx)
    const confessor = withBonus[pos(withBonus, 'origin:confessor')]
    expect(confessor?.value).toMatchObject({ earlyFit: 17, recommendedStartingWeapons: ['Broadsword'], wastedPoints: 4 })
    expect(confessor?.explanation.components).toContainEqual({ code: 'starting-weapon-bonus', value: 5 })
    expect(pos(withBonus, 'origin:confessor')).toBeLessThan(pos(withBonus, 'origin:heavy-knight'))
    expect(withBonus[0]?.explanation.limits).toContainEqual({ code: 'wasted-points-not-tiebreak' })
  })

  it('hérite de l’estimation d’une cible calculée', () => {
    const target = makeCalc('target-attributes', ordered([40, 10, 20, 14, 13, 9, 9, 7]), { estimate: { confidence: 'medium' } })
    const [first] = rankOrigins(origins(), target, noFit)
    expect(first?.estimate).toEqual({ confidence: 'medium' })
    expect(first?.explanation.limits).toContainEqual({ code: 'input-estimated' })
  })

  it('renvoie null pour une cible hors de 1–99 ou non calculée', () => {
    const bad = rankOrigins(origins(), ordered([0, 10, 10, 10, 10, 10, 10, 10]), noFit)
    expect(bad.every((c) => c.value === null)).toBe(true)
    expect(bad[0]?.explanation.limits.at(-1)).toEqual({ code: 'target-out-of-range', params: { attr: 'vig' } })
    const missing = rankOrigins(origins(), makeCalc<ReturnType<typeof ordered>>('target-attributes', null), noFit)
    expect(missing.every((c) => c.value === null)).toBe(true)
  })
})

describe('startingArmamentNames et effectiveOrigin', () => {
  it('découpe les objets groupés et retire les quantités', () => {
    const byName = new Map(origins().map((o) => [o.name, o]))
    expect(startingArmamentNames(byName.get('Warrior')!)).toEqual(['Scimitar', 'Riveted Wooden Shield'])
    expect(startingArmamentNames(byName.get('Bandit')!)).toEqual(['Great Knife', 'Shortbow', 'Bone Arrow (Fletched)', 'Buckler'])
  })

  it('retient le rang 1 en automatique, sinon le choix', () => {
    const ranking = rankOrigins(origins(), ordered([40, 10, 20, 14, 13, 9, 9, 7]), noFit)
    expect(effectiveOrigin('auto', ranking)).toBe('origin:vagabond')
    expect(effectiveOrigin('origin:wretch', ranking)).toBe('origin:wretch')
    expect(effectiveOrigin('auto', [])).toBeNull()
  })
})
