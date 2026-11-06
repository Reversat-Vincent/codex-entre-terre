// Tests du store d'analyse : ordre d'évaluation du cycle A ↔ B (docs/architecture.md § 5.4), origines filtrées par contenu,
// étape courante, recommandations, frise et puces de critères, sur les vraies données préparées servies par un faux réseau.

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FILE_KEYS } from '../../../src/data/datasets.ts'
import type { FileKey } from '../../../src/data/datasets.ts'
import type { FetchFn } from '../../../src/data/loader.ts'
import type { DataManifest } from '../../../src/data/types/index.ts'
import { byScore } from '../../../src/engine/score.ts'
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

describe('étape d’une rencontre (frise, fiche boss)', () => {
  it('stageOfEncounter : étape et explication de la rencontre ; null si la clé est inconnue ou bosses non chargé', async () => {
    const { analysis } = await setup()
    const margit = analysis.stageOfEncounter('margit-the-fell-omen/margit-the-fell-omen')
    expect(margit?.value).toMatchObject({ stage: 'early', basis: 'encounter' })
    expect(margit?.explanation.method).toBe('stage')
    expect(margit?.explanation.inputs[0]).toMatchObject({ file: 'bosses', entry: 'margit-the-fell-omen/margit-the-fell-omen' })
    expect(analysis.stageOfEncounter('inconnu/inconnu')).toBeNull()
    setActivePinia(createPinia())
    const without = await setup(['origins'])
    expect(without.analysis.stageOfEncounter('margit-the-fell-omen/margit-the-fell-omen')).toBeNull()
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

describe('profils de verification-v1.md : hors build (K-V1) et prérequis manquants (K-V2), réglés par D48', () => {
  const ATTRS = {
    vagabond: { vig: 15, mnd: 10, end: 11, str: 14, dex: 13, int: 9, fai: 9, arc: 7 },
    samurai: { vig: 12, mnd: 11, end: 13, str: 12, dex: 15, int: 9, fai: 8, arc: 8 },
    astrologer: { vig: 9, mnd: 15, end: 9, str: 8, dex: 12, int: 16, fai: 7, arc: 9 },
  }
  const ALL_WEAPONS: FileKey[] = ['origins', 'bosses', 'tables', 'melee_armaments', 'ranged_weapons_catalysts', 'shields_torches']
  type Analysis = ReturnType<typeof useAnalysisStore>
  const names = (a: Analysis, stage: string) => a.recommendations.columns.find((c) => c.stage === stage)?.weapons.map((w) => w.candidate.weapon.name) ?? []
  const shown = (a: Analysis) => a.recommendations.columns.flatMap((c) => c.weapons)
  const hiddenOf = (a: Analysis, name: string) => a.scored.find((s) => s.candidate.weapon.name === name)?.hidden
  const offBuild = (a: Analysis) => a.scored.filter((s) => s.hidden === 'off-build').map((s) => s.candidate.weapon)
  /** Vrai si la lettre vaut au moins `min` (S > A > B > C > D > E ; `null` = pas de scaling). */
  const atLeast = (grade: string | null, min: string) => grade !== null && 'SABCDE'.indexOf(grade) <= 'SABCDE'.indexOf(min)
  const best = (a: Analysis, stage: string) => [...(a.recommendations.columns.find((c) => c.stage === stage)?.weapons ?? [])].sort(byScore)[0]

  it('Force (Vagabond, `str` 150) : Iron Cleaver en tête du Début, priorités STR 15, VIG 40, END 31, MND 15 (calculs.md) ; STR 17 au Milieu', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({ character: { attributes: { ...ATTRS.vagabond } } })
    // Sans build cible, rien n'est écarté.
    expect(analysis.filtered.hidden['off-build']).toBe(0)
    criteria.set({ target: { archetype: 'str', level: 150 } })
    const off = offBuild(analysis)
    expect(off.map((w) => w.name)).toEqual(expect.arrayContaining(['Coded Sword', 'Cipher Pata']))
    expect(analysis.filtered.hidden['off-build']).toBe(off.length)
    // Aucune arme de Force écartée à tort : les armes écartées n'ont au mieux qu'un E en Force.
    for (const w of off) expect(atLeast(w.scaling.str, 'D'), w.name).toBe(false)
    for (const w of shown(analysis)) expect(w.hidden).toBeNull()
    // La limite cite le seuil et l'adéquation avant arrondi (V15, D51), dans `scoreOf` comme dans la ligne de `scored` (V14), une seule fois.
    const coded = analysis.scored.find((s) => s.candidate.weapon.name === 'Coded Sword')!
    const codedLimits = analysis.scoreOf(coded.candidate.ref)?.explanation.limits ?? []
    expect(codedLimits.filter((l) => l.code === 'weapon-hidden-off-build')).toEqual([
      { code: 'weapon-hidden-off-build', params: { max: 5, fit: Math.round(coded.score.value!.fitExact * 10) / 10 } },
    ])
    expect(coded.score.explanation.limits).toEqual(codedLimits)
    // D48 : un point de Force manquant reste dans la tolérance, Iron Cleaver garde sa puissance (79 points).
    const cleaver = best(analysis, 'early')!
    expect(cleaver.candidate.weapon.name).toBe('Iron Cleaver')
    expect(cleaver.score.value).toMatchObject({ total: 79, missingPoints: 1 })
    expect((analysis.levelUpPriorities.value ?? []).map((p) => [p.attr, p.target, p.reason])).toEqual([
      ['str', 15, 'priority-weapon-requirement'],
      ['vig', 40, 'priority-vigor-soft-cap'],
      ['end', 31, 'priority-build-target'],
      ['mnd', 15, 'priority-build-target'],
    ])
    criteria.set({ progress: { stage: 'mid' } })
    expect(best(analysis, 'mid')?.candidate.weapon.name).toBe('Nox Flowing Hammer')
    expect((analysis.levelUpPriorities.value ?? []).map((p) => [p.attr, p.target])).toEqual([
      ['str', 17],
      ['vig', 40],
      ['end', 31],
      ['mnd', 15],
    ])
  })

  it('Dextérité / saignement (attributs du Samurai, `dexarc`) : Rotten Crystal Sword et Miquellan Knight’s Sword écartés, Reduvia en tête', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({ character: { attributes: { ...ATTRS.samurai } }, target: { archetype: 'dexarc', level: 150 }, style: { status: 'blood_loss' } })
    expect(names(analysis, 'early')[0]).toBe('Reduvia')
    for (const n of ['Rotten Crystal Sword', "Miquellan Knight's Sword", 'Winged Scythe', 'Club']) expect(hiddenOf(analysis, n), n).toBe('off-build')
    for (const w of shown(analysis)) expect(w.candidate.weapon.scaling.dex !== null || w.candidate.weapon.scaling.arc !== null, w.candidate.weapon.name).toBe(true)
    // Aucune arme adaptée écartée à tort : ni lettre C ou mieux en DEX ou ARC. Les quatre armes de saignement écartées demandent 18 ou plus
    // dans un attribut hors build (INT ou FAI), ce qui les pénalise (composante 1, −4 au-delà de 10, −7 au-delà de 20).
    const off = offBuild(analysis)
    for (const w of off) expect(atLeast(w.scaling.dex, 'C') || atLeast(w.scaling.arc, 'C'), w.name).toBe(false)
    const bleeding = off.filter((w) => w.status_buildup?.blood_loss !== undefined)
    expect(bleeding.map((w) => w.name).sort()).toEqual(['Barbed Staff-Spear', 'Meteoric Ore Blade', 'Moonveil', 'Winged Scythe'])
    for (const w of bleeding) expect(Math.max(w.requirements.int, w.requirements.fai), w.name).toBeGreaterThanOrEqual(18)
    // Les armes de saignement qu'une arme d'adéquation nulle évinçait reviennent en Fin de jeu (verification-v1.md § 3.2).
    expect(names(analysis, 'endgame')).toEqual(expect.arrayContaining(['Hand of Malenia', "Mohgwyn's Sacred Spear"]))
  })

  it('Intelligence en mêlée (Astrologer, `int`) : Winged Scythe et Rogier’s Rapier écartés, Début vide avec élargissement, plus de DEX 17', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({ character: { attributes: { ...ATTRS.astrologer } }, target: { archetype: 'int', level: 150 } })
    for (const n of ['Winged Scythe', "Rogier's Rapier"]) expect(hiddenOf(analysis, n), n).toBe('off-build')
    // V14, V15 (D51) : la ligne grisée du plein écran porte la limite avec l'adéquation avant arrondi (4,58 → 4,6, affichée 5 dans la colonne).
    const rapier = analysis.scored.find((s) => s.candidate.weapon.name === "Rogier's Rapier")!
    expect(rapier.score.value?.fit).toBe(5)
    expect(rapier.score.explanation.limits).toContainEqual({ code: 'weapon-hidden-off-build', params: { max: 5, fit: 4.6 } })
    // Aucune arme d'Intelligence écartée à tort : les armes écartées n'ont au mieux qu'un E en Intelligence.
    for (const w of offBuild(analysis)) expect(atLeast(w.scaling.int, 'D'), w.name).toBe(false)
    for (const w of shown(analysis)) expect(w.candidate.weapon.scaling.int, w.candidate.weapon.name).not.toBeNull()
    // Début : aucune arme d'Intelligence, la colonne propose de changer de style (« hors build » n'est jamais proposé).
    expect(names(analysis, 'early')).toEqual([])
    expect(analysis.widen('early').map((s) => s.reason)).toContain('style')
    expect((analysis.levelUpPriorities.value ?? []).some((p) => p.attr === 'dex')).toBe(false)
  })

  it('Intelligence en magie (Astrologer, INT 16) : Lusat’s, Azur’s et Crystal Staff réduits de 40 % et hors des cinq premiers du Milieu', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({ character: { attributes: { ...ATTRS.astrologer } }, target: { archetype: 'int', level: 150 }, style: { mode: 'magic' } })
    const mid = names(analysis, 'mid')
    expect(mid).toHaveLength(5)
    for (const n of ["Lusat's Glintstone Staff", "Azur's Glintstone Staff", 'Crystal Staff']) {
      expect(mid, n).not.toContain(n)
      const s = analysis.scored.find((x) => x.candidate.weapon.name === n)!
      // Lusat's demande aussi STR 10 (Astrologer : 8) : chaque prérequis manquant est cité, le facteur ne s'applique qu'une fois.
      const params = s.score.explanation.components.find((x) => x.code === 'unmet-requirement-factor')?.params
      expect(params?.factor, n).toBe(0.6)
      expect(String(params?.attrs).split(','), n).toContain('int')
      // Plus de 25 points manquants : le malus d'accessibilité atteint son plafond de 15 (25 − 4 pour une étape d'avance − 15).
      expect(s.score.value?.access, n).toBe(6)
      // Et, à l'étape suivant celle du joueur, l'arme est hors de portée (V13, D51).
      expect(s.hidden, n).toBe('out-of-reach')
    }
  })
})

describe('hors de portée (V13, D51) : verification-v2.md § 1.3', () => {
  const ALL_WEAPONS: FileKey[] = ['origins', 'bosses', 'tables', 'melee_armaments', 'ranged_weapons_catalysts', 'shields_torches']
  const ASTROLOGER = { vig: 9, mnd: 15, end: 9, str: 8, dex: 12, int: 16, fai: 7, arc: 9 }
  const PROPHET = { vig: 10, mnd: 14, end: 9, str: 11, dex: 10, int: 7, fai: 16, arc: 10 }
  type Analysis = ReturnType<typeof useAnalysisStore>
  const names = (a: Analysis, stage: string) => a.recommendations.columns.find((c) => c.stage === stage)?.weapons.map((w) => w.candidate.weapon.name) ?? []
  const row = (a: Analysis, name: string) => a.scored.find((s) => s.candidate.weapon.name === name)!
  /** Aucune colonne vide, sauf celles déjà vides sans le filtre (aucune pour ces profils). */
  const noEmptyColumn = (a: Analysis) => expect(a.recommendations.columns.map((c) => [c.stage, c.weapons.length > 0])).toEqual(a.recommendations.columns.map((c) => [c.stage, true]))

  it('mage INT 16, « pierres sombres », étape Milieu : Lusat’s et Azur’s Glintstone Staff écartés (38 points), limite chiffrée', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({
      character: { attributes: { ...ASTROLOGER } },
      target: { archetype: 'int', level: 150 },
      style: { mode: 'magic' },
      constraints: { stonePreference: 'somber' },
      progress: { mode: 'stage', stage: 'mid' },
    })
    expect(analysis.stage.value).toBe('mid')
    for (const n of ["Lusat's Glintstone Staff", "Azur's Glintstone Staff"]) {
      const s = row(analysis, n)
      expect(s.hidden, n).toBe('out-of-reach')
      expect(names(analysis, 'mid'), n).not.toContain(n)
      expect(s.score.value?.missingPoints, n).toBe(38)
      // La ligne du plein écran (V14) et `scoreOf` portent la même limite, une seule fois, avec ses paramètres.
      const limit = { code: 'weapon-hidden-out-of-reach', params: { max: 25, span: 1, points: 38 } }
      expect(s.score.explanation.limits.filter((l) => l.code === 'weapon-hidden-out-of-reach'), n).toEqual([limit])
      expect(analysis.scoreOf(s.candidate.ref), n).toBe(s.score)
    }
    // Comptées avec les armes masquées de la colonne et dans `filtered`, jamais proposées en élargissement.
    const mid = analysis.recommendations.columns.find((c) => c.stage === 'mid')!
    const out = analysis.scored.filter((s) => s.hidden === 'out-of-reach')
    expect(mid.hidden['out-of-reach']).toBe(out.filter((s) => s.stage.value?.stage === 'mid').length)
    expect(analysis.filtered.hidden['out-of-reach']).toBe(out.length)
    expect(analysis.filtered.hiddenItems.length).toBe(analysis.scored.filter((s) => s.hidden !== null).length)
    for (const c of analysis.recommendations.columns) expect(analysis.widen(c.stage).map((w) => w.reason)).not.toContain('out-of-reach')
    // V22 (statu quo) : Rotten Crystal Staff (INT 48, Fin de jeu), deux étapes après celle du joueur, reste la seule arme de sa colonne.
    expect(row(analysis, 'Rotten Crystal Staff').hidden).toBeNull()
    expect(names(analysis, 'endgame')).toEqual(['Rotten Crystal Staff'])
    noEmptyColumn(analysis)
    // Au Début, le Milieu est l'étape suivante : mêmes armes écartées ; Rotten Crystal Staff reste en Fin de jeu.
    criteria.set({ progress: { mode: 'stage', stage: 'early' } })
    for (const n of ["Lusat's Glintstone Staff", "Azur's Glintstone Staff"]) expect(row(analysis, n).hidden, n).toBe('out-of-reach')
    expect(names(analysis, 'endgame')).toEqual(['Rotten Crystal Staff'])
    noEmptyColumn(analysis)
  })

  it('mode « Boss vaincus » : même étape du joueur que le score (Milieu après Margit, Godrick, Red Wolf et Rennala)', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({
      character: { attributes: { ...ASTROLOGER } },
      target: { archetype: 'int', level: 150 },
      style: { mode: 'magic' },
      constraints: { stonePreference: 'somber' },
      progress: { mode: 'boss' },
    })
    for (const k of [
      'margit-the-fell-omen/margit-the-fell-omen',
      'godrick-the-grafted/godrick-the-grafted-phase-1',
      'red-wolf-of-radagon/red-wolf-of-radagon',
      'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2',
    ]) {
      criteria.toggleDefeated(k)
    }
    expect(analysis.stage.value).toBe('mid')
    expect(row(analysis, "Lusat's Glintstone Staff").hidden).toBe('out-of-reach')
    expect(row(analysis, 'Rotten Crystal Staff').hidden).toBeNull()
  })

  it('Foi en mêlée (Prophet, `fai`), « pierres sombres », étape Milieu : Staff of the Avatar écarté (31 points)', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({
      character: { attributes: { ...PROPHET } },
      target: { archetype: 'fai', level: 150 },
      constraints: { stonePreference: 'somber' },
      progress: { mode: 'stage', stage: 'mid' },
    })
    const avatar = row(analysis, 'Staff of the Avatar')
    expect(avatar.hidden).toBe('out-of-reach')
    expect(avatar.score.value?.missingPoints).toBe(31)
    expect(names(analysis, 'mid')).not.toContain('Staff of the Avatar')
    expect(names(analysis, 'mid')).toHaveLength(5)
    noEmptyColumn(analysis)
  })

  it('joueur en Fin : étape passée comprise, Lusat’s, Azur’s et Staff of the Avatar restent hors de la colonne Milieu (arbitrage de D51)', async () => {
    const { analysis, criteria } = await setup(ALL_WEAPONS)
    criteria.set({
      character: { attributes: { ...ASTROLOGER } },
      target: { archetype: 'int', level: 150 },
      style: { mode: 'magic' },
      constraints: { stonePreference: 'somber' },
      progress: { mode: 'stage', stage: 'late' },
    })
    expect(analysis.stage.value).toBe('late')
    for (const n of ["Lusat's Glintstone Staff", "Azur's Glintstone Staff"]) {
      expect(row(analysis, n).hidden, n).toBe('out-of-reach')
      expect(names(analysis, 'mid'), n).not.toContain(n)
    }
    criteria.set({ character: { attributes: { ...PROPHET } }, target: { archetype: 'fai', level: 150 }, style: { mode: 'melee' } })
    expect(row(analysis, 'Staff of the Avatar').hidden).toBe('out-of-reach')
    expect(names(analysis, 'mid')).not.toContain('Staff of the Avatar')
    expect(names(analysis, 'mid')).toHaveLength(5)
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

describe('clés de prototype venues de l’état (fichier importé)', () => {
  const PROTO_KEYS = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']

  it.each(PROTO_KEYS)('« %s » comme archétype, origine, classe, région ou boss vaincu : aucun calcul ne casse', async (key) => {
    const { analysis, criteria } = await setup(['origins', 'bosses', 'tables', 'melee_armaments', 'ranged_weapons_catalysts'])
    const base = criteria.snapshot()
    criteria.hydrate({
      ...base,
      character: { ...base.character, origin: key },
      target: { archetype: key, level: 150 },
      style: { ...base.style, classes: [key] },
      progress: { mode: 'region', stage: 'early', regions: [key], defeated: [key] },
    })
    expect(analysis.target.value).toBeNull()
    expect(analysis.weights.source).toBe('auto')
    expect(analysis.stage.value).toBe('early')
    // Une origine absente des données est conservée telle quelle (« toléré ») mais ne donne ni arme ni attribut de départ.
    expect(analysis.scored.length).toBeGreaterThan(0)
    expect(analysis.recommendations.columns.length).toBeGreaterThan(0)
    expect(analysis.timeline?.steps.length).toBeGreaterThan(0)
    expect(analysis.chips.some((c) => c.kind === 'build')).toBe(true)
    criteria.set({ progress: { mode: 'boss' } })
    expect(analysis.stage.value).toBeDefined()
  })
})
