// Tests du build cible (calculs.md, « Build cible ») : répartition `targetFor`, gabarits au niveau 150, poids automatiques `autoW`.

import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_KEYS } from '../../../src/data/keys.ts'
import { ARCHETYPES, ARCHETYPE_IDS, TARGET_FLOOR, TEMPLATE_LEVEL } from '../../../src/engine/config/archetypes.ts'
import { autoWeights, buildWeights, distributeTarget, targetAttributes } from '../../../src/engine/target.ts'
import { attrs, ordered } from './helpers.ts'

const sum = (a: Record<string, number>) => ATTRIBUTE_KEYS.reduce((s, k) => s + (a[k] ?? 0), 0)

describe('targetFor', () => {
  it('au niveau 150, la cible est le gabarit de chaque archétype', () => {
    for (const id of ARCHETYPE_IDS) {
      const t = targetAttributes(id, TEMPLATE_LEVEL, null)
      expect(t.value).toEqual(ordered(ARCHETYPES[id].template))
    }
  })

  it('somme des attributs = niveau + 79, pour chaque archétype et plusieurs niveaux', () => {
    for (const id of ARCHETYPE_IDS) {
      for (const level of [1, 30, 60, 100, 125, 150]) {
        const t = targetAttributes(id, level, null)
        expect(sum(t.value!), `${id} ${level}`).toBe(level + 79)
      }
    }
  })

  it('répartition du reste aux plus grandes parties fractionnaires (prototype)', () => {
    // dexarc au niveau 125 : S = 204, k = 143 / 168.
    expect(distributeTarget(ARCHETYPES.dexarc.template, 125, TARGET_FLOOR)).toEqual([52, 14, 22, 13, 44, 9, 8, 42])
  })

  it('aucun archétype : état vide ; borne 99 au-delà, avec une limite', () => {
    expect(targetAttributes(null, 150, null).explanation.limits).toEqual([{ code: 'no-archetype' }])
    expect(targetAttributes('inconnu', 150, null).value).toBeNull()
    const capped = targetAttributes('str', 713, null)
    expect(Math.max(...Object.values(capped.value!))).toBe(99)
    expect(capped.explanation.limits).toContainEqual({ code: 'target-capped', params: { level: 713 } })
  })

  it('signale les attributs du profil déjà au-delà de la cible ; jamais une estimation', () => {
    const t = targetAttributes('int', 150, attrs({ str: 40 }))
    expect(t.explanation.limits).toContainEqual({ code: 'target-below-current', params: { attr: 'str' } })
    expect(t.estimate).toBeNull()
  })
})

describe('poids du build', () => {
  it('autoW : valeur − 10 au-dessus de 12, normalisé au plus grand, deux décimales', () => {
    expect(autoWeights(attrs())).toEqual({ str: 1 })
    expect(autoWeights(attrs({ dex: 27, arc: 15 }))).toEqual({ dex: 1, arc: 0.29 })
    expect(autoWeights(attrs({ str: 12, int: 13 }))).toEqual({ int: 1 })
  })

  it('archétype prioritaire, sinon poids automatiques', () => {
    expect(buildWeights('dexarc', attrs())).toEqual({ weights: { dex: 1, arc: 1 }, source: 'archetype' })
    expect(buildWeights(null, attrs({ fai: 30 }))).toEqual({ weights: { fai: 1 }, source: 'auto' })
  })
})
