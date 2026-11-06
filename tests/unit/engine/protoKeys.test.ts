// Tests de robustesse du moteur face aux clés de prototype venues de l'état (fichier importé, stockage altéré) : `constructor`, `__proto__`,
// `toString`, `valueOf`, `hasOwnProperty` ne désignent aucune entrée d'une table de configuration (archétype, région, palier de zone ou de rencontre).

import { describe, expect, it } from 'vitest'
import { encounterTier } from '../../../src/engine/bossLevel.ts'
import type { EncounterRef } from '../../../src/engine/encounters.ts'
import { currentStage, dlcZoneOfRegion, mostPrecise, stageOfRegion } from '../../../src/engine/stage.ts'
import { buildWeights, targetAttributes } from '../../../src/engine/target.ts'
import { ownValue } from '../../../src/engine/types.ts'
import { attrs } from './helpers.ts'

const PROTO_KEYS = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'] as const

describe('ownValue', () => {
  it('ne lit que les clés propres', () => {
    const table: Record<string, number> = { a: 1 }
    expect(ownValue(table, 'a')).toBe(1)
    for (const k of PROTO_KEYS) expect(ownValue(table, k), k).toBeUndefined()
  })
})

describe.each(PROTO_KEYS)('clé de prototype « %s »', (key) => {
  it('archétype : aucun build cible, poids automatiques', () => {
    const t = targetAttributes(key, 150, null)
    expect(t.value).toBeNull()
    expect(t.explanation.limits).toEqual([{ code: 'no-archetype' }])
    expect(buildWeights(key, attrs()).source).toBe('auto')
  })

  it('région : ni étape ni sous-zone DLC ni région parente', () => {
    expect(stageOfRegion(key)).toBeNull()
    expect(dlcZoneOfRegion(key)).toBeNull()
    expect(mostPrecise([key])).toEqual([key])
  })

  it('progression par régions : région inconnue signalée, étape de départ', () => {
    const s = currentStage({ mode: 'region', stage: 'mid', regions: [key] }, null)
    expect(s.value).toBe('early')
    expect(s.explanation.limits).toContainEqual({ code: 'region-unknown', params: { region: key } })
  })

  it('palier d’une rencontre : ni palier fixé ni palier de zone', () => {
    const ref = { key, boss: { id: key, name: key, tier: [] }, encounter: { regions: [key] } } as unknown as EncounterRef
    expect(encounterTier(ref)).toBeNull()
  })
})
