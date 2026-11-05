// Tests de la frise des boss (calculs.md, « Frise des boss ») : structure, prérequis, voie DLC en ordre libre, prochain boss.

import { describe, expect, it } from 'vitest'
import { bossLevelContext, readBlessingTable, recommendedLevel } from '../../../src/engine/bossLevel.ts'
import { TIMELINE } from '../../../src/engine/config/timeline.ts'
import { buildTimeline } from '../../../src/engine/timeline.ts'
import { data, encounters } from './prepared.ts'

const ctx = bossLevelContext(encounters(), data().tables, readBlessingTable(data().datasets.mechanics.entries.find((e) => e.id === 'scadutree-fragment')))
const levelOf = (key: string) => recommendedLevel(key, ctx).value?.level ?? null
const view = (defeated: string[], dlcEnabled = true) => buildTimeline(encounters(), defeated, { dlcEnabled, levelOf })

/** Toutes les clés « Vaincu » de l'histoire principale. */
const story = TIMELINE.steps.flatMap((s) => s.nodes.flatMap((n) => [...n.keys]))

describe('structure', () => {
  it('11 étapes, « 2 parmi 5 », « ou », puis un boss par étape ; voie DLC de 3 nœuds', () => {
    const t = view([])
    expect(t.steps.map((s) => [s.n, s.kind, s.need, s.nodes.length])).toEqual([
      [1, 'choice', 2, 5],
      [2, 'or', 1, 2],
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => [n, 'one', 1, 1]),
    ])
    expect(t.steps[0]!.nodes.map((n) => n.id)).toEqual(['godrick', 'rennala', 'radahn', 'rykard', 'mohg'])
    expect(t.dlc.nodes.map((n) => n.id)).toEqual(['messmer', 'romina', 'promised-consort-radahn'])
    expect(t.dlc.freeOrder).toEqual(['messmer', 'romina'])
    expect(t.dlc.gate.map((g) => g.id)).toEqual(['radahn', 'mohg'])
  })

  it('prérequis boss (Margit, Red Wolf) et sous-nœuds textuels (Radahn, Rykard, Mohg)', () => {
    const [godrick, rennala, radahn, rykard, mohg] = view([]).steps[0]!.nodes
    expect(godrick?.prereqs).toMatchObject([{ kind: 'boss', node: { id: 'margit', defeated: false } }])
    expect(rennala?.prereqs).toMatchObject([{ kind: 'boss', node: { id: 'red-wolf' } }])
    expect(radahn?.prereqs).toEqual([{ kind: 'text', code: 'prereq-radahn-jerren' }])
    expect(rykard?.prereqs).toEqual([{ kind: 'text', code: 'prereq-rykard-tanith-or-godskin-noble' }])
    expect(mohg?.prereqs).toEqual([{ kind: 'text', code: 'prereq-mohg-varre-or-snowfield' }])
    expect(radahn?.prereqsMet).toBe(true)
    expect(godrick?.prereqsMet).toBe(false)
  })

  it('chaque nœud existe dans les données', () => {
    const t = view([])
    for (const n of [...t.steps.flatMap((s) => s.nodes), ...t.dlc.nodes]) expect(n.present, n.levelKey).toBe(true)
  })
})

describe('progression et prochain boss', () => {
  it('sans boss vaincu : Margit, prérequis de Godrick (plus bas niveau recommandé)', () => {
    expect(view([]).next).toMatchObject({ lane: 'story', step: 1, node: { id: 'margit' }, prereqOf: 'godrick' })
  })

  it('« N parmi M » : deux porteurs suffisent ; Rennala vaut par l’une de ses deux phases', () => {
    const d = ['margit-the-fell-omen/margit-the-fell-omen', 'godrick-the-grafted/godrick-the-grafted-phase-1']
    expect(view(d).next?.node.id).toBe('red-wolf')
    const t = view([...d, 'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-1'])
    expect(t.steps[0]).toMatchObject({ defeatedCount: 2, done: true })
    // Étape 2 : Fia's Champions (34) avant le Draconic Tree Sentinel (46).
    expect(t.next).toMatchObject({ step: 2, node: { id: 'fias-champions' }, prereqOf: null })
  })

  it('histoire finie : voie DLC (Messmer et Romina en ordre libre), puis Promised Consort Radahn', () => {
    expect(view(story).storyComplete).toBe(true)
    expect(view(story).next).toMatchObject({ lane: 'dlc', node: { id: 'messmer' } })
    expect(view([...story, 'romina-saint-of-the-bud/romina-saint-of-the-bud']).next?.node.id).toBe('messmer')
    const both = [...story, 'romina-saint-of-the-bud/romina-saint-of-the-bud', 'messmer-the-impaler/messmer-the-impaler-base-serpent-messmer']
    expect(view(both).next?.node.id).toBe('promised-consort-radahn')
    const all = [...both, 'promised-consort-radahn/promised-consort-radahn']
    expect(view(all)).toMatchObject({ next: null, complete: true })
  })

  it('DLC désactivé : pas de prochain boss DLC, histoire complète', () => {
    expect(view(story, false)).toMatchObject({ next: null, complete: true, dlc: { enabled: false } })
  })

  it('voie DLC ouverte par Radahn et Mohg', () => {
    expect(view(['starscourge-radahn/starscourge-radahn']).dlc.open).toBe(false)
    expect(view(['starscourge-radahn/starscourge-radahn', 'mohg-lord-of-blood/mohg-lord-of-blood-phase-1']).dlc.open).toBe(true)
  })

  it('sans les boss chargés : nœuds absents', () => {
    const t = buildTimeline(null, [], { dlcEnabled: true })
    expect(t.steps[0]!.nodes[0]!.present).toBe(false)
  })
})
