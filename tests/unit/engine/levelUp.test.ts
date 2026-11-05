// Tests des priorités de montée de niveau (calculs.md, « Priorités de montée de niveau », D42) : ordre des trois règles, valeur visée,
// poids de survie, plafond de 4 priorités, absence de build cible, estimation héritée, meilleure arme de l'étape.

import { describe, expect, it } from 'vitest'
import { ARCHETYPES } from '../../../src/engine/config/archetypes.ts'
import { bestWeaponOfStage, levelUpPriorities } from '../../../src/engine/levelUp.ts'
import type { RequirementCheck } from '../../../src/engine/requirements.ts'
import type { ScoredWeapon, StageRecommendations, WeaponScore } from '../../../src/engine/score.ts'
import { targetAttributes } from '../../../src/engine/target.ts'
import { makeCalc } from '../../../src/engine/types.ts'
import type { Attributes, Estimate } from '../../../src/engine/types.ts'
import { ordered } from './helpers.ts'
import { candidate } from './prepared.ts'

/** Vagabond (`origins.json`) : VIG 15, MND 10, END 11, STR 14, DEX 13, INT 9, FAI 9, ARC 7. */
const VAGABOND: Attributes = ordered([15, 10, 11, 14, 13, 9, 9, 7])

/**
 * Arme évaluée fictive : seuls les prérequis comparés, le total et l'estimation comptent pour la méthode.
 * @param checks Prérequis comparés au profil.
 * @param total Score total.
 * @param estimate Estimation du score.
 * @param name Arme réelle prêtée à l'entrée (référence et fichier).
 * @returns L'arme évaluée.
 */
function scoredWith(checks: RequirementCheck[], total = 60, estimate: Estimate | null = null, name = 'Longsword'): ScoredWeapon {
  const c = candidate(name)
  const score = makeCalc<WeaponScore>(
    'weapon-score',
    { total, fit: 0, power: 0, access: 0, upgrade: 0, requirements: checks, missingPoints: 0, overBudget: null, stagesAhead: 0, startingBonus: false },
    { estimate },
  )
  return { candidate: c, stage: makeCalc('stage', { stage: 'early' } as never), score, hidden: null }
}

const str20: RequirementCheck = { attr: 'str', required: 20, actual: 14, effective: 14, met: false, gap: 6, twoHandApplied: false }

describe('levelUpPriorities', () => {
  it('cas de calculs.md : prérequis, palier de Vigor, puis écart pondéré au build `str` (4 au plus)', () => {
    const target = targetAttributes('str', 150, VAGABOND)
    const r = levelUpPriorities({ attrs: VAGABOND, weapon: scoredWith([str20]), target, weights: ARCHETYPES.str.weights })
    expect(r.explanation.method).toBe('level-up-priorities')
    expect(r.value?.map((p) => [p.attr, p.target, p.reason])).toEqual([
      ['str', 20, 'priority-weapon-requirement'],
      ['vig', 40, 'priority-vigor-soft-cap'],
      ['end', 31, 'priority-build-target'],
      ['mnd', 15, 'priority-build-target'],
    ])
    expect(r.value?.[0]).toMatchObject({ current: 14, weapon: 'weapon:' + candidate('Longsword').weapon.id, weight: null })
    expect(r.value?.[2]).toMatchObject({ current: 11, weight: 0.5 })
    expect(r.explanation.components[2]).toEqual({ code: 'priority-build-target', value: 31, params: { attr: 'end', actual: 11, weight: 0.5, points: 20 } })
    const codes = r.explanation.limits.map((l) => l.code)
    expect(codes).toContain('priorities-truncated')
    expect(codes).toContain('priorities-survival-weight')
    expect(codes).toContain('priorities-design-method')
    expect(r.estimate).toBeNull()
    expect(r.explanation.inputs).toContainEqual(expect.objectContaining({ field: 'requirements.str', value: 20, reliability: 'wiki' }))
    expect(r.explanation.inputs).toContainEqual(expect.objectContaining({ entry: 'softCaps', value: 40 }))
  })

  it('sans build cible : seulement les règles 1 et 2, avec la limite', () => {
    const r = levelUpPriorities({ attrs: VAGABOND, weapon: scoredWith([str20]), target: targetAttributes(null, 150, VAGABOND), weights: { str: 1 } })
    expect(r.value?.map((p) => p.reason)).toEqual(['priority-weapon-requirement', 'priority-vigor-soft-cap'])
    expect(r.explanation.limits.map((l) => l.code)).toContain('priorities-no-target')
  })

  it('sans arme, Vigor au palier : la cible seule, Vigor reprise vers sa cible', () => {
    const me = { ...VAGABOND, vig: 40 }
    const r = levelUpPriorities({ attrs: me, weapon: null, target: targetAttributes('str', 150, me), weights: ARCHETYPES.str.weights })
    expect(r.explanation.limits.map((l) => l.code)).toContain('priorities-no-weapon')
    // STR : 66 × 1 ; VIG : 20 × 0,5 ; END : 20 × 0,5 (ex æquo, ordre des attributs) ; MND : 5 × 0,5.
    expect(r.value?.map((p) => [p.attr, p.target])).toEqual([
      ['str', 80],
      ['vig', 60],
      ['end', 31],
      ['mnd', 15],
    ])
  })

  it('tout atteint : liste vide, jamais null', () => {
    const me = ordered([60, 15, 31, 80, 16, 9, 9, 9])
    const met: RequirementCheck = { ...str20, actual: 80, effective: 80, met: true, gap: 0 }
    const r = levelUpPriorities({ attrs: me, weapon: scoredWith([met]), target: targetAttributes('str', 150, me), weights: ARCHETYPES.str.weights })
    expect(r.value).toEqual([])
  })

  it('Force à deux mains : valeur visée en Force réelle, limite ; estimation du score héritée', () => {
    const twoHand: RequirementCheck = { attr: 'str', required: 23, actual: 14, effective: 21, met: false, gap: 2, twoHandApplied: true }
    const r = levelUpPriorities({ attrs: VAGABOND, weapon: scoredWith([twoHand], 60, { confidence: 'medium' }), target: targetAttributes(null, 150, VAGABOND), weights: {} })
    expect(r.value?.[0]).toMatchObject({ attr: 'str', target: 16 })
    expect(r.estimate).toEqual({ confidence: 'medium' })
    expect(r.explanation.limits.map((l) => l.code)).toEqual(expect.arrayContaining(['priorities-two-handed-strength', 'input-estimated']))
  })
})

describe('bestWeaponOfStage', () => {
  it('la mieux notée de la colonne, quel que soit son ordre d’affichage ; null sans étape ou colonne vide', () => {
    const low = scoredWith([], 40, null, 'Club')
    const high = scoredWith([], 70, null, 'Longsword')
    const recs: StageRecommendations = {
      columns: [{ stage: 'dlc', weapons: [low, high], visibleCount: 2, hidden: {}, hiddenCount: 0 }],
      unclassified: [],
      top: high,
    }
    expect(bestWeaponOfStage(recs, 'dlc')).toBe(high)
    expect(bestWeaponOfStage(recs, 'early')).toBeNull()
    expect(bestWeaponOfStage(recs, null)).toBeNull()
  })
})
