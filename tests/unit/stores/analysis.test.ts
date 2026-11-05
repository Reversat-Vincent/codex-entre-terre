// Tests du store d'analyse : ordre d'évaluation du cycle A ↔ B (docs/architecture.md § 5.4), origines filtrées par contenu,
// étape courante, recommandations, frise et puces de critères, sur les vraies données préparées servies par un faux réseau.

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FILE_KEYS } from '../../../src/data/datasets.ts'
import type { FileKey } from '../../../src/data/datasets.ts'
import type { FetchFn } from '../../../src/data/loader.ts'
import type { DataManifest } from '../../../src/data/types/index.ts'
import { useAnalysisStore } from '../../../src/stores/analysis.ts'
import { useCriteriaStore } from '../../../src/stores/criteria.ts'
import { useDataStore } from '../../../src/stores/data.ts'
import { prepared } from '../data/helpers.ts'

const encoder = new TextEncoder()

function fileContent(key: FileKey): unknown {
  const p = prepared()
  if (key === 'tables') return { schema: 1, key: 'tables', tables: p.tables }
  if (key === 'search-index') return { schema: 1, key: 'search-index', docs: p.search }
  return p.datasets[key]
}

const texts = new Map<FileKey, string>(FILE_KEYS.map((k) => [k, JSON.stringify(fileContent(k))]))

function manifest(): DataManifest {
  const files = Object.fromEntries(
    FILE_KEYS.map((k) => {
      const content = fileContent(k) as { entries?: unknown[]; docs?: unknown[]; tables?: object }
      const entries = k === 'tables' ? Object.keys(content.tables ?? {}).length : k === 'search-index' ? (content.docs ?? []).length : (content.entries ?? []).length
      return [k, { path: `${k}.0123456789.json`, bytes: encoder.encode(texts.get(k)!).length, sha256: 'a', entries, label: k }]
    }),
  ) as DataManifest['files']
  return { schema: 1, dataVersion: '0123456789abcdef', retrieved: prepared().retrieved, files }
}

const fetchFn: FetchFn = async (url) => {
  if (url.endsWith('manifest.json')) return Response.json(manifest())
  const key = url.split('/').pop()!.split('.')[0] as FileKey
  return new Response(texts.get(key)!)
}

async function setup(keys: FileKey[] = ['origins', 'bosses', 'tables', 'melee_armaments']) {
  const data = useDataStore()
  data.configure({ base: '/', fetchFn })
  await data.ensure(keys)
  return { analysis: useAnalysisStore(), criteria: useCriteriaStore(), data }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ordre d’évaluation (§ 5.4)', () => {
  it('origine automatique : scores sans bonus → classement → origine retenue → scores définitifs avec bonus', async () => {
    const { analysis, criteria } = await setup()
    // Build Dextérité au niveau 150 : le Samurai (Uchigatana) doit être bien placé ; on lit l'origine retenue telle que classée.
    criteria.set({ target: { archetype: 'dex', level: 150 } })
    const effective = analysis.effectiveOrigin
    expect(effective).toBe(analysis.originRanking[0]?.value?.origin)
    expect(analysis.pipeline).toMatchObject({ preliminaryOrigin: null, effectiveOrigin: effective, rescored: true })
    expect(analysis.preliminary.every((s) => !s.score.value?.startingBonus)).toBe(true)
    const origin = useDataStore().dataset('origins')!.entries.find((o) => `origin:${o.id}` === effective)!
    const starting = origin.starting_equipment.Armaments
    const withBonus = analysis.scored.filter((s) => s.score.value?.startingBonus)
    expect(withBonus.length).toBeGreaterThan(0)
    for (const s of withBonus) expect(starting.some((a) => a.includes(s.candidate.weapon.name))).toBe(true)
    // Les armes recommandées par les scores préliminaires départagent les origines.
    expect(analysis.pipeline.recommendedWeapons.length).toBeGreaterThan(0)
  })

  it('origine choisie : un seul passage, bonus de départ dès les scores préliminaires', async () => {
    const { analysis, criteria } = await setup()
    criteria.set({ character: { origin: 'samurai' }, target: { archetype: 'dex', level: 150 } })
    expect(analysis.pipeline).toMatchObject({ preliminaryOrigin: 'origin:samurai', effectiveOrigin: 'origin:samurai', rescored: false })
    expect(analysis.scored).toBe(analysis.preliminary)
    const uchi = analysis.scored.find((s) => s.candidate.weapon.name === 'Uchigatana')
    expect(uchi?.score.value?.startingBonus).toBe(true)
    expect(uchi?.stage.value).toMatchObject({ stage: 'early', basis: 'starting' })
  })

  it('sans build cible : pas de classement, pas d’origine retenue (état vide du widget B)', async () => {
    const { analysis } = await setup()
    expect(analysis.target.value).toBeNull()
    expect(analysis.originRanking).toEqual([])
    expect(analysis.effectiveOrigin).toBeNull()
  })
})

describe('origines et contenu', () => {
  it('les origines du Tarnished Pack seulement si ce contenu est activé', async () => {
    const { analysis, criteria } = await setup()
    expect(analysis.origins.map((o) => o.id)).not.toContain('heavy-knight')
    expect(analysis.origins).toHaveLength(10)
    criteria.set({ content: { tp: true } })
    expect(analysis.origins).toHaveLength(12)
  })
})

describe('progression, frise et recommandations', () => {
  it('mode boss : étape du prochain boss ; niveau recommandé et préparation', async () => {
    const { analysis, criteria } = await setup()
    expect(analysis.stage.value).toBe('early')
    criteria.toggleDefeated('margit-the-fell-omen/margit-the-fell-omen')
    expect(analysis.nextBoss?.node.id).toBe('godrick')
    for (const k of ['godrick-the-grafted/godrick-the-grafted-phase-1', 'red-wolf-of-radagon/red-wolf-of-radagon', 'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2']) {
      criteria.toggleDefeated(k)
    }
    expect(analysis.nextBoss?.node.id).toBe('fias-champions')
    expect(analysis.stage.value).toBe('mid')
    const r = analysis.bossReadiness('fias-champions/fias-champions')
    expect(r?.level.value?.level).toBe(34)
    expect(r?.readiness.value).toBe('early')
    expect(r?.gaugeMax).toBe(64)
    expect(analysis.bossLevel('messmer-the-impaler/messmer-the-impaler-base-serpent-messmer')?.value?.blessing?.level).toBe(7)
  })

  it('colonnes du widget A : 5 armes au plus, budget de charge, puces structurées', async () => {
    const { analysis, criteria } = await setup()
    for (const col of analysis.recommendations.columns) expect(col.weapons.length).toBeLessThanOrEqual(5)
    expect(analysis.budget.value).toBe(Math.round(useDataStore().file('tables')!.tables.equipLoadByEndurance.rows[9]!.value * 0.7 * 0.25 * 10) / 10)
    criteria.set({ constraints: { excludeRemembrance: true }, style: { status: 'blood_loss' } })
    expect(analysis.filtered.hidden.remembrance).toBeGreaterThan(0)
    const kinds = analysis.chips.map((c) => c.kind)
    expect(kinds).toEqual(['content', 'origin', 'level', 'style', 'status', 'stage', 'exclusion'])
    expect(analysis.chips.find((c) => c.kind === 'exclusion')?.reset).toEqual({ constraints: { excludeRemembrance: false } })
    criteria.set({ content: { sote: false } })
    expect(analysis.widen('dlc')[0]).toMatchObject({ reason: 'content-sote' })
  })

  it('fichiers manquants : valeurs nulles plutôt qu’erreurs', async () => {
    const { analysis } = await setup(['origins'])
    expect(analysis.timeline).toBeNull()
    expect(analysis.derived).toBeNull()
    expect(analysis.budget.value).toBeNull()
    expect(analysis.recommendations.columns.every((c) => c.weapons.length === 0)).toBe(true)
    expect(analysis.bossLevel('elden-beast/elden-beast')).toBeNull()
    expect(analysis.weaponsAgainst('margit-the-fell-omen/margit-the-fell-omen')).toBeNull()
  })
})

describe('armes efficaces contre une rencontre (fiche boss)', () => {
  it('candidats des critères courants qui exploitent les faiblesses, avec leurs prérequis ; Mohg sans suggestion', async () => {
    const { analysis } = await setup()
    const margit = analysis.weaponsAgainst('margit-the-fell-omen/margit-the-fell-omen')
    expect(margit?.value?.length).toBeGreaterThan(0)
    const visible = new Set(analysis.scored.filter((s) => s.hidden === null).map((s) => s.candidate.ref))
    for (const w of margit?.value ?? []) {
      expect(visible.has(w.ref), w.name).toBe(true)
      expect(['slash', 'standard']).toContain(w.damage)
      expect(w.requirements).toEqual(analysis.scored.find((s) => s.candidate.ref === w.ref)?.score.value?.requirements)
    }
    const mohg = analysis.weaponsAgainst('mohg-lord-of-blood/mohg-lord-of-blood-phase-1')
    expect(mohg?.value).toEqual([])
    expect(mohg?.explanation.limits[0]?.code).toBe('absorption-undocumented')
  })

  it('style « magie » d’un build Intelligence : seulement des Staves (D39, S3)', async () => {
    const { analysis, criteria } = await setup(['origins', 'bosses', 'tables', 'ranged_weapons_catalysts'])
    criteria.set({ style: { mode: 'magic' }, target: { archetype: 'int', level: 150 } })
    expect(new Set(analysis.candidates.map((c) => c.weapon.category))).toEqual(new Set(['Staves']))
  })
})

describe('getters des fiches, des catalogues et des widgets (2.12)', () => {
  const MARGIT = 'margit-the-fell-omen/margit-the-fell-omen'
  const VAGABOND = { vig: 15, mnd: 10, end: 11, str: 14, dex: 13, int: 9, fai: 9, arc: 7 }

  /** Référence d'une arme chargée, par son nom exact. */
  function weaponRef(name: string): `weapon:${string}` {
    const data = useDataStore()
    for (const key of ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const) {
      const w = data.dataset(key)?.entries.find((x) => x.name === name)
      if (w !== undefined) return `weapon:${w.id}`
    }
    throw new Error(`arme ${name} absente`)
  }

  it('derivedOf : statistiques d’un jeu d’attributs quelconque (Astrologer, calculs.md) ; null sans tables', async () => {
    const { analysis } = await setup()
    expect(analysis.derivedOf({ vig: 9, mnd: 15, end: 9 })?.value).toEqual({ hp: 396, fp: 95, stamina: 94, equipLoad: 46.6 })
    setActivePinia(createPinia())
    const bare = await setup(['origins'])
    expect(bare.analysis.derivedOf({ vig: 9, mnd: 15, end: 9 })).toBeNull()
  })

  it('encounters : index des rencontres par clé ; null sans bosses', async () => {
    const { analysis } = await setup()
    expect(analysis.encounters?.byKey.get(MARGIT)?.boss.id).toBe('margit-the-fell-omen')
    setActivePinia(createPinia())
    expect((await setup(['origins'])).analysis.encounters).toBeNull()
  })

  it('weaponCalcs : puissance d’attaque et prérequis du profil (Longsword +0, STR et DEX 20 → 141) ; mémoïsé ; null si inconnue', async () => {
    const { analysis, criteria } = await setup()
    criteria.set({ character: { attributes: { ...VAGABOND, str: 20, dex: 20 } } })
    const ref = weaponRef('Longsword')
    const calcs = analysis.weaponCalcs(ref, 0, 'Standard', 'one')
    expect(calcs !== null && 'value' in calcs.attack ? calcs.attack.value?.total : undefined).toBe(141)
    expect(calcs?.requirements.value?.allMet).toBe(true)
    expect(analysis.weaponCalcs(ref, 0, 'Standard', 'one')).toBe(calcs)
    expect(analysis.weaponCalcs('weapon:absente', 0, 'Standard', 'one')).toBeNull()
  })

  it('scoreOf : score définitif d’une candidate ; arme masquée ou hors style signalée ; « Non classé » sans total', async () => {
    const { analysis, criteria } = await setup(['origins', 'bosses', 'tables', 'melee_armaments', 'ranged_weapons_catalysts'])
    const longsword = weaponRef('Longsword')
    expect(analysis.scoreOf(longsword)).toBe(analysis.scored.find((s) => s.candidate.ref === longsword)?.score)
    // Arc hors du style « mêlée » : score calculé, limite de style.
    const bow = analysis.scoreOf(weaponRef('Shortbow'))
    expect(bow?.value?.total).not.toBeNull()
    expect(bow?.explanation.limits).toContainEqual({ code: 'weapon-outside-style' })
    // Échange de Remembrance exclu par les critères.
    criteria.set({ constraints: { excludeRemembrance: true } })
    const blade = analysis.scoreOf(weaponRef('Blasphemous Blade'))
    expect(blade?.explanation.limits).toContainEqual({ code: 'weapon-hidden-remembrance' })
    expect(blade?.value?.total).not.toBeNull()
    // Broadsword n'a que des équipements de départ : sans origine retenue, « Non classé », sans total (D18).
    expect(analysis.scoreOf(weaponRef('Broadsword'))?.value?.total).toBeNull()
    expect(analysis.scoreOf('weapon:absente')).toBeNull()
  })

  it('requirementsOf : arme (maniement des critères) et sort ; null pour une autre entité', async () => {
    const { analysis, criteria, data } = await setup(['origins', 'bosses', 'tables', 'melee_armaments', 'spells'])
    criteria.set({ style: { hands: 2 }, character: { attributes: { ...VAGABOND } } })
    const greatsword = analysis.requirementsOf(weaponRef('Greatsword'))
    expect(greatsword?.value?.checks.find((c) => c.attr === 'str')).toMatchObject({ actual: 14, effective: 21, twoHandApplied: true })
    const spell = data.dataset('spells')!.entries.find((s) => s.requirements.int > 0)!
    const r = analysis.requirementsOf(`spell:${spell.id}`)
    expect(r?.value?.checks.find((c) => c.attr === 'int')?.required).toBe(spell.requirements.int)
    expect(r?.explanation.inputs[0]?.file).toBe('spells')
    expect(analysis.requirementsOf('boss:margit-the-fell-omen')).toBeNull()
  })

  it('levelUpPriorities : 4 au plus, Vigor au palier 40 ; sans build cible, règles 1 et 2 seulement', async () => {
    const { analysis, criteria } = await setup()
    criteria.set({ character: { attributes: { ...VAGABOND } } })
    const bare = analysis.levelUpPriorities
    expect(bare.explanation.method).toBe('level-up-priorities')
    expect(bare.value?.every((p) => p.reason !== 'priority-build-target')).toBe(true)
    expect(bare.value).toContainEqual(expect.objectContaining({ attr: 'vig', target: 40, reason: 'priority-vigor-soft-cap' }))
    expect(bare.explanation.limits.map((l) => l.code)).toContain('priorities-no-target')
    criteria.set({ target: { archetype: 'str', level: 150 } })
    const withTarget = analysis.levelUpPriorities.value ?? []
    expect(withTarget).toHaveLength(4)
    expect(withTarget.map((p) => p.reason)).toContain('priority-build-target')
    expect(new Set(withTarget.map((p) => p.attr)).size).toBe(withTarget.length)
  })

  it('runeCostsBetween : coût de chaque niveau (9 à 40 = 134 856) ; null sans tables', async () => {
    const { analysis } = await setup()
    const r = analysis.runeCostsBetween(9, 40)
    expect(r?.value?.reduce((s, c) => s + c.cost, 0)).toBe(134856)
    expect(r?.value?.[0]?.level).toBe(9)
    setActivePinia(createPinia())
    expect((await setup(['origins'])).analysis.runeCostsBetween(9, 40)).toBeNull()
  })

  it('weaknessRows : frise (11 sur 21, DLC activé) et toutes les rencontres ; vaincus atténués ; null sans bosses', async () => {
    const { analysis, criteria } = await setup()
    criteria.toggleDefeated(MARGIT)
    const timeline = analysis.weaknessRows('timeline')
    expect(timeline?.rows).toHaveLength(11)
    expect(timeline?.total).toBe(21)
    expect(timeline?.rows[0]).toMatchObject({ id: 'margit', bossId: 'margit-the-fell-omen', done: true })
    const all = analysis.weaknessRows('all')
    expect(all?.rows.length).toBeGreaterThan(11)
    expect(all?.rows.find((r) => r.id === MARGIT)?.done).toBe(true)
    setActivePinia(createPinia())
    const bare = (await setup(['origins'])).analysis
    expect(bare.weaknessRows('timeline')).toBeNull()
    expect(bare.weaknessRows('all')).toBeNull()
  })

  it('stageOf : étape de toute entité à acquisitions, hors style et filtres ; null pour une autre entité', async () => {
    const { analysis, data } = await setup(['origins', 'bosses', 'tables', 'melee_armaments', 'ranged_weapons_catalysts', 'armor'])
    const longsword = weaponRef('Longsword')
    expect(analysis.stageOf(longsword)).toEqual(analysis.scored.find((s) => s.candidate.ref === longsword)?.stage)
    expect(analysis.stageOf(weaponRef('Shortbow'))?.value?.stage).toBeDefined()
    expect(analysis.stageOf(weaponRef('Blasphemous Blade'))?.value).toMatchObject({ stage: 'late', basis: 'remembrance' })
    const armor = data.dataset('armor')!.entries[0]!
    expect(analysis.stageOf(`armor:${armor.id}`)?.explanation.method).toBe('stage')
    expect(analysis.stageOf('boss:margit-the-fell-omen')).toBeNull()
    expect(analysis.stageOf('armor:absente')).toBeNull()
  })
})
