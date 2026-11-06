// Tests du store des quêtes : coches par PNJ, réinitialisation, bornes, instantané indépendant, clés d'étapes stables.
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { LIMITS } from '../../../src/persistence/model.ts'
import { questStepKey, questStepKeys, useQuestsStore } from '../../../src/stores/quests.ts'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('questStepKey', () => {
  it('normalise le texte puis le met en slug', () => {
    expect(questStepKey('Speak to Boc at Limgrave')).toBe('speak-to-boc-at-limgrave')
    expect(questStepKey('  Défaites: "Rennala"  — (again)! ')).toBe('defaites-rennala-again')
    expect(questStepKey('Kill Godrick’s knight')).toBe('kill-godricks-knight')
  })

  it('tronque à 80 caractères sans tiret final', () => {
    const key = questStepKey('word '.repeat(40))
    expect(key.length).toBeLessThanOrEqual(80)
    expect(key.endsWith('-')).toBe(false)
    expect(questStepKey('a'.repeat(200))).toHaveLength(80)
  })

  it('donne une clé non vide à un texte sans lettre', () => {
    expect(questStepKey('→ ???')).toBe('etape')
  })

  it('ne dépend que du texte : stable d’un appel à l’autre', () => {
    expect(questStepKey('Go to the Church')).toBe(questStepKey('Go to the Church'))
  })
})

describe('questStepKeys', () => {
  it('suffixe -2, -3 les textes en double, dans l’ordre', () => {
    expect(questStepKeys(['Go', 'Stop', 'Go', 'go!', 'Stop'])).toEqual(['go', 'stop', 'go-2', 'go-3', 'stop-2'])
  })

  it('saute une clé déjà prise par un suffixe', () => {
    const keys = questStepKeys(['Go', 'Go', 'Go 2'])
    expect(new Set(keys).size).toBe(3)
    expect(keys.slice(0, 2)).toEqual(['go', 'go-2'])
  })

  it('reste sous 100 caractères avec le suffixe', () => {
    const long = 'a'.repeat(200)
    const keys = questStepKeys(Array.from({ length: 12 }, () => long))
    expect(Math.max(...keys.map((k) => k.length))).toBeLessThanOrEqual(LIMITS.maxQuestKey)
    expect(new Set(keys).size).toBe(12)
  })

  it('liste vide', () => {
    expect(questStepKeys([])).toEqual([])
  })
})

describe('store', () => {
  it('coche et décoche une étape, par PNJ', () => {
    const quests = useQuestsStore()
    expect(quests.isDone('melina', 'a')).toBe(false)
    expect(quests.toggle('melina', 'a')).toBe(true)
    expect(quests.isDone('melina', 'a')).toBe(true)
    expect(quests.isDone('boc', 'a')).toBe(false)
    expect(quests.toggle('melina', 'a')).toBe(false)
    expect(quests.isDone('melina', 'a')).toBe(false)
    expect(quests.snapshot()).toEqual({})
  })

  it('compte les étapes cochées, éventuellement parmi des clés données', () => {
    const quests = useQuestsStore()
    quests.toggle('melina', 'a')
    quests.toggle('melina', 'b')
    quests.toggle('melina', 'ancienne')
    expect(quests.doneCount('melina')).toBe(3)
    expect(quests.doneCount('melina', ['a', 'b', 'c'])).toBe(2)
    expect(quests.doneCount('inconnu')).toBe(0)
  })

  it('reset décoche un seul PNJ', () => {
    const quests = useQuestsStore()
    quests.toggle('melina', 'a')
    quests.toggle('boc', 'x')
    quests.reset('melina')
    expect(quests.doneCount('melina')).toBe(0)
    expect(quests.snapshot()).toEqual({ boc: ['x'] })
    quests.reset('absent')
    expect(quests.snapshot()).toEqual({ boc: ['x'] })
  })

  it('snapshot est indépendant du store et hydrate remplace tout', () => {
    const quests = useQuestsStore()
    quests.toggle('melina', 'a')
    const snap = quests.snapshot()
    snap.melina!.push('zzz')
    snap.autre = ['y']
    expect(quests.snapshot()).toEqual({ melina: ['a'] })
    const slice = { boc: ['x', 'y'], vide: [] as string[] }
    quests.hydrate(slice)
    slice.boc.push('z')
    expect(quests.snapshot()).toEqual({ boc: ['x', 'y'] })
    expect(quests.isDone('melina', 'a')).toBe(false)
  })

  it('refuse de cocher au-delà des bornes ou avec une clé invalide', () => {
    const quests = useQuestsStore()
    expect(quests.toggle('melina', '')).toBe(false)
    expect(quests.toggle('melina', 'x'.repeat(LIMITS.maxQuestKey + 1))).toBe(false)
    expect(quests.toggle('', 'a')).toBe(false)
    for (let i = 0; i < LIMITS.maxQuestSteps; i++) expect(quests.toggle('melina', `e${i}`)).toBe(true)
    expect(quests.toggle('melina', 'de-trop')).toBe(false)
    expect(quests.doneCount('melina')).toBe(LIMITS.maxQuestSteps)
    expect(quests.toggle('melina', 'e0')).toBe(false)
    expect(quests.doneCount('melina')).toBe(LIMITS.maxQuestSteps - 1)
    for (let i = 0; i < LIMITS.maxQuestNpcs - 1; i++) quests.toggle(`pnj-${i}`, 'a')
    expect(quests.toggle('un-de-trop', 'a')).toBe(false)
    expect(quests.toggle('melina', 'de-trop')).toBe(true)
  })

  it('ne stocke jamais __proto__ ni ne lit le prototype', () => {
    const quests = useQuestsStore()
    expect(quests.toggle('__proto__', 'a')).toBe(false)
    expect(quests.isDone('constructor', 'a')).toBe(false)
    expect(quests.doneCount('toString')).toBe(0)
    quests.hydrate(JSON.parse('{"__proto__":["a"],"melina":["b"]}') as Record<string, string[]>)
    expect(Object.hasOwn(quests.snapshot(), '__proto__')).toBe(false)
    expect(({} as Record<string, unknown>).a).toBeUndefined()
    expect(quests.snapshot()).toEqual({ melina: ['b'] })
  })
})
