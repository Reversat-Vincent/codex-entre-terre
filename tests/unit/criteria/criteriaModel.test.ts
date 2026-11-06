// Tests du modèle du panneau de critères : texte des puces, listes à cocher (classes, boss, régions), décomptes, relèvement des attributs.
// Les listes sont lues dans les vraies données préparées : les catégories, boss et régions ne sont jamais écrits en dur dans l'interface.

import { describe, expect, it } from 'vitest'
import {
  ARCHETYPE_LABELS,
  CLASSES_COLLAPSED,
  archetypeName,
  archetypeOptions,
  bossChecklist,
  chipViews,
  keysToToggle,
  originOptions,
  recommendedCount,
  regionChecklist,
  sectionSummary,
  visibleClasses,
  weaponClasses,
  weaponCounts,
} from '../../../src/components/criteria/criteriaModel.ts'
import { ARCHETYPE_IDS } from '../../../src/engine/config/archetypes.ts'
import { indexEncounters } from '../../../src/engine/encounters.ts'
import { buildTimeline } from '../../../src/engine/timeline.ts'
import type { CriteriaChip } from '../../../src/stores/analysis.ts'
import { defaultCriteria } from '../../../src/stores/criteria.ts'
import { prepared } from '../data/helpers.ts'

const ds = prepared().datasets
const weapons = [...ds.melee_armaments.entries, ...ds.ranged_weapons_catalysts.entries, ...ds.shields_torches.entries]

describe('classes d’armes', () => {
  it('liste les catégories des données, de la plus fournie à la moins fournie', () => {
    const classes = weaponClasses(weapons)
    expect(classes.reduce((n, c) => n + c.count, 0)).toBe(weapons.length)
    expect(new Set(classes.map((c) => c.name))).toEqual(new Set(weapons.map((w) => w.category)))
    for (let i = 1; i < classes.length; i++) expect(classes[i - 1]!.count).toBeGreaterThanOrEqual(classes[i]!.count)
  })

  it('replie la liste mais garde les classes choisies', () => {
    const classes = Array.from({ length: 12 }, (_, i) => ({ name: `C${i}`, count: 20 - i }))
    expect(visibleClasses(classes, [], false)).toHaveLength(CLASSES_COLLAPSED)
    const withChosen = visibleClasses(classes, ['C11'], false)
    expect(withChosen).toHaveLength(CLASSES_COLLAPSED + 1)
    expect(withChosen.at(-1)?.name).toBe('C11')
    expect(visibleClasses(classes, [], true)).toHaveLength(12)
  })

  it('compte les armes par contenu et les estimations', () => {
    const counts = weaponCounts(weapons)
    expect(counts.base + counts.sote + counts.tp).toBe(weapons.length)
    expect(counts.estimated).toBe(weapons.filter((w) => w.derived.upgrade.reliability === 'estimate').length)
  })
})

describe('origines et archétypes', () => {
  const origins = ds.origins.entries

  it('propose Automatique puis les origines, et garde l’origine choisie absente de la liste', () => {
    const base = origins.filter((o) => o.source !== 'Tarnished Pack')
    const options = originOptions(base, origins, 'auto')
    expect(options[0]?.value).toBe('auto')
    expect(options).toHaveLength(base.length + 1)
    const tp = origins.find((o) => o.source === 'Tarnished Pack')
    expect(tp).toBeDefined()
    const kept = originOptions(base, origins, tp!.id)
    expect(kept.at(-1)).toEqual({ value: tp!.id, label: `${tp!.name} (Tarnished Pack)` })
    expect(originOptions(base, origins, 'inconnue').at(-1)?.label).toBe('inconnue')
  })

  it('propose « Aucun » puis chaque archétype du moteur', () => {
    const options = archetypeOptions()
    expect(options[0]?.value).toBe('')
    expect(options.slice(1).map((o) => o.value)).toEqual([...ARCHETYPE_IDS])
  })

  it('nomme un archétype par ses clés propres, jamais par le prototype', () => {
    expect(archetypeName('str')).toBe(ARCHETYPE_LABELS.str)
    expect(archetypeName('constructor')).toBe('constructor')
    expect(archetypeName('toString')).toBe('toString')
  })
})

describe('boss et régions', () => {
  const encounters = indexEncounters(ds.bosses.entries)
  const names = new Map(ds.bosses.entries.map((b) => [b.id, b.name]))
  const nameOf = (id: string): string | null => names.get(id) ?? null

  it('liste les boss de la frise, la voie DLC seulement si l’extension est activée', () => {
    const timeline = buildTimeline(encounters, [], { dlcEnabled: true })
    const withDlc = bossChecklist(timeline, nameOf, true)
    const without = bossChecklist(timeline, nameOf, false)
    expect(without.length).toBeGreaterThan(10)
    expect(withDlc.length).toBeGreaterThan(without.length)
    expect(new Set(withDlc.map((b) => b.id)).size).toBe(withDlc.length)
    expect(withDlc.every((b) => b.label !== '' && !b.checked)).toBe(true)
  })

  it('coche et décoche toutes les rencontres d’un boss', () => {
    const timeline = buildTimeline(encounters, [], { dlcEnabled: false })
    const rennala = bossChecklist(timeline, nameOf, false).find((b) => b.id === 'rennala')
    expect(rennala?.keys.length).toBe(2)
    expect(keysToToggle(rennala!, [])).toEqual(rennala!.keys)
    const after = buildTimeline(encounters, [...rennala!.keys], { dlcEnabled: false })
    const done = bossChecklist(after, nameOf, false).find((b) => b.id === 'rennala')!
    expect(done.checked).toBe(true)
    expect(keysToToggle(done, [...rennala!.keys])).toEqual(rennala!.keys)
  })

  it('liste les régions des données avec leur étape, DLC masqué sans l’extension', () => {
    const locations = ds.locations.entries
    const base = regionChecklist(locations, [], false)
    const all = regionChecklist(locations, [], true)
    expect(base.length).toBeGreaterThan(5)
    expect(base.some((r) => r.stage === 'dlc')).toBe(false)
    expect(all.some((r) => r.stage === 'dlc')).toBe(true)
    expect(all[0]?.stage).toBe('early')
    const dlcRegion = all.find((r) => r.stage === 'dlc')!
    expect(regionChecklist(locations, [dlcRegion.name], false).find((r) => r.name === dlcRegion.name)?.checked).toBe(true)
  })
})

describe('puces de critères', () => {
  const names = { originName: (ref: string): string | null => (ref === 'origin:samurai' ? 'Samurai' : null) }

  it('compose le texte des puces et marque les critères facultatifs', () => {
    const chips: CriteriaChip[] = [
      { kind: 'content', sote: true, tp: false, reset: null },
      { kind: 'origin', choice: 'auto', effective: 'origin:samurai', reset: null },
      { kind: 'level', level: 1234, reset: null },
      { kind: 'build', archetype: 'dexarc', level: 125, reset: { target: { archetype: null } } },
      { kind: 'classes', classes: ['Katana', 'Dagger', 'Axe'], reset: { style: { classes: [] } } },
      { kind: 'stage', stage: 'mid', mode: 'boss', reset: null },
      { kind: 'estimates', reset: { reliability: { includeEstimates: true } } },
    ]
    const views = chipViews(chips, names)
    expect(views.map((v) => `${v.chip.label} ${v.chip.value}`)).toEqual([
      'Contenu Base, SotE',
      'Origine Automatique : Samurai',
      'Niveau 1 234',
      'Build Dextérité / Arcane → 125',
      'Classes Katana, Dagger +1',
      'Étape Milieu (boss vaincus)',
      'Estimations Exclues',
    ])
    expect(views.map((v) => v.chip.removable)).toEqual([false, false, false, true, true, false, true])
    expect(views[3]?.chip.active).toBe(true)
    expect(views[3]?.section).toBe('character')
    expect(views[3]?.reset).toEqual({ target: { archetype: null } })
  })

  it('résume les sections repliables', () => {
    const c = defaultCriteria()
    expect(sectionSummary('content', c, 1, null)).toBe('Base, SotE')
    expect(sectionSummary('character', c, 1, null)).toBe('Origine automatique, niveau 1')
    expect(sectionSummary('constraints', c, 1, null)).toBe('Aucune')
    c.constraints.excludeQuest = true
    c.constraints.stonePreference = 'somber'
    expect(sectionSummary('constraints', c, 1, null)).toBe('2 actives')
  })

  it('compte les armes recommandées de toutes les colonnes', () => {
    const rec = { columns: [{ weapons: [1, 2] }, { weapons: [3] }], unclassified: [], top: null }
    expect(recommendedCount(rec as never)).toBe(3)
  })
})
