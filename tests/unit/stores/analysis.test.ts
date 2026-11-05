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
