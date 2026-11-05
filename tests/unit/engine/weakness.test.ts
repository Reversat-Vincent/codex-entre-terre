// Tests de la lecture des faiblesses : bandes d'AbsorptionHeatmap, types les moins absorbés, immunités, et armes efficaces contre une
// rencontre (calculs.md, « Armes efficaces contre une rencontre ») sur les vraies données préparées.

import { describe, expect, it } from 'vitest'
import { candidateWeapons, catalystCaps, filterWeapons, hiddenReason, scoreWeapon } from '../../../src/engine/score.ts'
import type { ScoredWeapon } from '../../../src/engine/score.ts'
import { entryStage } from '../../../src/engine/stage.ts'
import { absorptionBand, bestDamageTypes, immunities, weaponDamageTypes, weaponsAgainst } from '../../../src/engine/weakness.ts'
import { attrs, boss } from './helpers.ts'
import { candidate, encounters, weaponData } from './prepared.ts'

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

describe('armes efficaces contre une rencontre', () => {
  const criteria = {
    content: { sote: true, tp: true },
    constraints: { excludeRemembrance: false, excludeRandomDrop: false, excludeQuest: false },
    reliability: { includeEstimates: true },
  }

  /** Armes de mêlée évaluées pour un profil à 10 partout, build Force, étape Début (forme des scores du store `analysis`). */
  function scoredMelee(): ScoredWeapon[] {
    const d = weaponData()
    const caps = catalystCaps(d)
    const kept = filterWeapons(candidateWeapons(d, { mode: 'melee', classes: [] }, { str: 1 }), criteria).kept
    return kept.map((c) => {
      const stage = entryStage(c.weapon, { ref: c.ref, file: c.file, encounters: encounters(), startingArmaments: null })
      const score = scoreWeapon(c, {
        weights: { str: 1 },
        attrs: attrs(),
        hands: 'one',
        status: null,
        classes: [],
        stonePreference: 'none',
        playerStage: 'early',
        budget: 12.6,
        catalystCaps: caps,
        stage,
        startingBonus: false,
      })
      return { candidate: c, stage, score, hidden: hiddenReason(c, criteria) }
    })
  }

  it('types de dégâts d’une arme : `attack_type` pour le physique, attaques élémentaires non nulles', () => {
    expect(weaponDamageTypes(candidate('Club').weapon)).toEqual(['strike'])
    expect(weaponDamageTypes(candidate('Longsword').weapon)).toEqual(['standard', 'pierce'])
    expect(weaponDamageTypes(candidate("Fire Knight's Shortsword").weapon)).toEqual(['slash', 'pierce', 'fire'])
  })

  it('Margit : armes qui infligent ses deux types les moins absorbés (tranchant −10, standard 0), triées par type puis score', () => {
    const r = weaponsAgainst(encounters().byKey.get('margit-the-fell-omen/margit-the-fell-omen'), scoredMelee())
    expect(r.explanation.method).toBe('weapon-score')
    expect(r.explanation.components).toEqual([
      { code: 'weakness-absorption', value: -10, params: { type: 'slash' } },
      { code: 'weakness-absorption', value: 0, params: { type: 'standard' } },
    ])
    expect(r.explanation.limits).toContainEqual({ code: 'weakness-weapons-base-values' })
    const list = r.value ?? []
    expect(list).toHaveLength(5)
    expect(list.every((w) => w.damage === 'slash' && w.absorption === -10)).toBe(true)
    const scores = list.map((w) => w.score ?? -1)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
    for (const w of list) {
      expect(w.ref).toMatch(/^weapon:/)
      expect(w.attack).toBe(candidate(w.name).weapon.attack_power.physical)
      expect(Array.isArray(w.requirements)).toBe(true)
    }
  })

  it('Mohg : absorption non documentée → liste vide avec une limite, aucune suggestion', () => {
    const key = 'mohg-lord-of-blood/mohg-lord-of-blood-phase-1'
    const r = weaponsAgainst(encounters().byKey.get(key), scoredMelee())
    expect(r.value).toEqual([])
    expect(r.explanation.limits).toEqual([{ code: 'absorption-undocumented', params: { encounter: key } }])
  })

  it('rencontre absente → null avec `encounter-missing` ; armes « Non classé » écartées (D18)', () => {
    const missing = weaponsAgainst(undefined, [])
    expect(missing.value).toBeNull()
    expect(missing.explanation.limits).toContainEqual({ code: 'encounter-missing', params: { encounter: '' } })
    const scored = scoredMelee()
    const unclassified = scored.filter((s) => s.score.value?.total === null).map((s) => s.candidate.ref)
    expect(unclassified.length).toBeGreaterThan(0)
    const r = weaponsAgainst(encounters().byKey.get('margit-the-fell-omen/margit-the-fell-omen'), scored, { bestTypes: 8, max: 1000 })
    expect((r.value ?? []).length).toBeGreaterThan(5)
    for (const w of r.value ?? []) expect(unclassified).not.toContain(w.ref)
  })
})
