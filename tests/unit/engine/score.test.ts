// Tests du score de recommandation (calculs.md, « Score de recommandation d'une arme (0–100) ») sur des armes connues.
// Armes choisies pour résister aux compléments de données : type d'amélioration déjà documenté par le wiki (Longsword, Erdtree Seal),
// arme non améliorable (Meteorite Staff) ; les cas « estimé » et « non documenté » sont construits à partir d'une copie.

import { describe, expect, it } from 'vitest'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { STAGE_IDS } from '../../../src/engine/config/stages.ts'
import {
  alternatives,
  candidateWeapons,
  catalystCaps,
  styleCategories,
  filterWeapons,
  hiddenReason,
  loadBudget,
  recommendByStage,
  scoreWeapon,
  weaponFilesFor,
  widenSuggestions,
} from '../../../src/engine/score.ts'
import type { CandidateWeapon, ScoreContext, ScoredWeapon } from '../../../src/engine/score.ts'
import { entryStage } from '../../../src/engine/stage.ts'
import { attrs } from './helpers.ts'
import { allWeapons, candidate, data, encounters, weaponData } from './prepared.ts'

const stageOf = (c: CandidateWeapon) => entryStage(c.weapon, { ref: c.ref, file: c.file, encounters: encounters(), startingArmaments: null })

function ctx(c: CandidateWeapon, over: Partial<ScoreContext> = {}): ScoreContext {
  return {
    weights: { str: 1, dex: 1 },
    attrs: attrs(),
    hands: 'one',
    status: null,
    classes: [],
    stonePreference: 'none',
    playerStage: 'early',
    budget: 12.6,
    catalystCaps: catalystCaps(weaponData()),
    stage: stageOf(c),
    startingBonus: false,
    ...over,
  }
}

const withUpgrade = (c: CandidateWeapon, upgrade: WeaponEntry['derived']['upgrade']): CandidateWeapon => ({
  ...c,
  weapon: { ...c.weapon, derived: { ...c.weapon.derived, upgrade } },
})

describe('composantes sur des armes connues', () => {
  it('Longsword, build Qualité, classe préférée : 22 + 13 + 25 + 16 = 76', () => {
    const c = candidate('Longsword')
    const s = scoreWeapon(c, ctx(c, { classes: ['Straight Swords'] }))
    expect(s.value).toMatchObject({ fit: 22, power: 13, access: 25, upgrade: 16, total: 76, missingPoints: 0, overBudget: false, stagesAhead: 0 })
    expect(s.estimate).toBeNull()
    expect(s.explanation.method).toBe('weapon-score')
    expect(s.explanation.components.find((x) => x.code === 'score-total')).toEqual({ code: 'score-total', value: 76, max: 100 })
  })

  it('préférence de pierres : +5 pour le type préféré, −6 pour l’autre', () => {
    const c = candidate('Longsword')
    expect(scoreWeapon(c, ctx(c, { stonePreference: 'normal' })).value?.upgrade).toBe(21)
    expect(scoreWeapon(c, ctx(c, { stonePreference: 'somber' })).value?.upgrade).toBe(10)
  })

  it('pénalités : attribut hors build, classe non préférée, budget de poids', () => {
    const c = candidate('Longsword')
    // Build Force pur : DEX 10 n'est pas au-delà de 10, pas de pénalité ; classe préférée autre : −2.
    const s = scoreWeapon(c, ctx(c, { weights: { str: 1 }, classes: ['Katanas'], budget: 3 }))
    expect(s.value?.fit).toBe(18)
    expect(s.value?.overBudget).toBe(true)
    expect(s.value?.power).toBe(9)
  })

  it('Erdtree Seal (catalyseur) : puissance de sort à +0 sur le plafond des Sacred Seals', () => {
    const c = candidate('Erdtree Seal')
    const caps = catalystCaps(weaponData())
    expect(caps['Sacred Seals']).toBe(137)
    expect(caps.Staves).toBe(162)
    const s = scoreWeapon(c, ctx(c, { weights: { fai: 1, str: 0.3 } }))
    // Adéquation : C (0,55) sur des poids 1,3 → 21 ; puissance 17,5 + 2,58 → 20 ; accès : Milieu (−4), FAI 10 sur 40 (−9) → 12 ; sombres 20.
    expect(s.value).toMatchObject({ fit: 21, power: 20, access: 12, upgrade: 20, total: 73 })
  })

  it('accessibilité : étapes d’avance, points manquants plafonnés, Remembrance, départ', () => {
    const c = candidate('Blasphemous Blade')
    const s = scoreWeapon(c, ctx(c))
    // Fin (2 étapes d'avance, −8), STR 22 / FAI 21 / DEX 15 : 30 points manquants (−9), Remembrance (−4).
    expect(s.value?.access).toBe(4)
    const l = candidate('Longsword')
    expect(scoreWeapon(l, ctx(l, { startingBonus: true })).value?.access).toBe(25)
    expect(scoreWeapon(l, ctx(l, { startingBonus: true, playerStage: 'early', attrs: attrs({ str: 8 }) })).value?.access).toBe(25)
  })

  it('statut privilégié : +4 si l’effet passif correspond', () => {
    const c = candidate('Uchigatana')
    const plain = scoreWeapon(c, ctx(c, { weights: { dex: 1 } })).value?.fit ?? 0
    expect(scoreWeapon(c, ctx(c, { weights: { dex: 1 }, status: 'blood_loss' })).value?.fit).toBe(plain + 4)
  })
})

describe('coût d’amélioration (D6)', () => {
  it('non améliorable → 8', () => {
    const c = candidate('Meteorite Staff')
    expect(scoreWeapon(c, ctx(c)).value?.upgrade).toBe(8)
  })

  it('estimé : −2 et le score hérite de l’estimation ; sans type ni estimation → 14, sans préférence', () => {
    const c = candidate('Longsword')
    const est = withUpgrade(c, { material: 'Smithing Stones', maxLevel: 25, reliability: 'estimate', confidence: 'high' })
    const s = scoreWeapon(est, ctx(est, { stonePreference: 'somber' }))
    expect(s.value?.upgrade).toBe(8)
    expect(s.estimate).toEqual({ confidence: 'high' })
    const none = withUpgrade(c, { material: null, maxLevel: null, reliability: 'null' })
    expect(scoreWeapon(none, ctx(none, { stonePreference: 'somber' })).value?.upgrade).toBe(14)
  })
})

describe('arme « Non classé » (D18)', () => {
  it('pas de score : accessibilité et total null, jamais 0', () => {
    const c = candidate('Parrying Dagger')
    const s = scoreWeapon(c, ctx(c))
    expect(s.value?.access).toBeNull()
    expect(s.value?.total).toBeNull()
    expect(s.explanation.limits).toContainEqual({ code: 'stage-unclassified' })
  })

  it('puissance de sort non documentée : composante et total null', () => {
    const c = candidate('Erdtree Seal')
    const s = scoreWeapon(c, ctx(c, { catalystCaps: {} }))
    expect(s.value?.power).toBeNull()
    expect(s.value?.total).toBeNull()
  })
})

describe('candidats et filtres (D7)', () => {
  it('candidats selon le style ; boucliers seulement s’ils sont préférés', () => {
    const d = weaponData()
    const cats = (mode: 'melee' | 'ranged' | 'magic' | 'hybrid', classes: string[] = []) =>
      new Set(candidateWeapons(d, { mode, classes }).map((x) => x.weapon.category))
    expect([...cats('ranged')].sort()).toEqual(['Ballistas', 'Bows', 'Crossbows', 'Greatbows', 'Light Bows'])
    expect([...cats('magic')].sort()).toEqual(['Sacred Seals', 'Staves'])
    expect(cats('melee').has('Medium Shields')).toBe(false)
    expect(cats('melee', ['Medium Shields']).has('Medium Shields')).toBe(true)
    expect(cats('hybrid').has('Staves') && cats('hybrid').has('Katanas')).toBe(true)
    expect(weaponFilesFor({ mode: 'magic', classes: ['Greatshields'] })).toEqual(['ranged_weapons_catalysts', 'shields_torches'])
    expect(weaponFilesFor({ mode: 'hybrid', classes: [] })).toEqual(['melee_armaments', 'ranged_weapons_catalysts'])
  })

  it('magie : catalyseurs selon les poids du build (D39, S3)', () => {
    const d = weaponData()
    const cats = (weights: Record<string, number>) => [...new Set(candidateWeapons(d, { mode: 'magic', classes: [] }, weights).map((x) => x.weapon.category))].sort()
    expect(cats({ int: 1, dex: 0.2 })).toEqual(['Staves'])
    expect(cats({ fai: 1, str: 0.3 })).toEqual(['Sacred Seals'])
    expect(cats({ int: 1, fai: 1 })).toEqual(['Sacred Seals', 'Staves'])
    expect(cats({ str: 1 })).toEqual(['Sacred Seals', 'Staves'])
    expect(cats({})).toEqual(['Sacred Seals', 'Staves'])
    // Un poids nul ne retient pas sa catégorie ; les autres styles ne dépendent pas des poids.
    expect(styleCategories('magic', { int: 1, fai: 0 })).toEqual(['Staves'])
    expect(styleCategories('melee', { int: 1 })).toBeNull()
    expect(styleCategories('ranged', { fai: 1 })).toEqual(['Light Bows', 'Bows', 'Greatbows', 'Crossbows', 'Ballistas'])
  })

  it('contenu, exclusions et estimations', () => {
    const base = { content: { sote: true, tp: true }, constraints: { excludeRemembrance: false, excludeRandomDrop: false, excludeQuest: false }, reliability: { includeEstimates: true } }
    expect(hiddenReason(candidate('Milady'), { ...base, content: { sote: false, tp: true } })).toBe('content-sote')
    expect(hiddenReason(candidate('Hefty Scimitar'), { ...base, content: { sote: true, tp: false } })).toBe('content-tp')
    expect(hiddenReason(candidate('Blasphemous Blade'), { ...base, constraints: { ...base.constraints, excludeRemembrance: true } })).toBe('remembrance')
    expect(hiddenReason(candidate('Dagger'), { ...base, constraints: { ...base.constraints, excludeRandomDrop: true } })).toBe('random-drop')
    const est = withUpgrade(candidate('Longsword'), { material: 'Smithing Stones', maxLevel: 25, reliability: 'estimate', confidence: 'medium' })
    expect(hiddenReason(est, { ...base, reliability: { includeEstimates: false } })).toBe('estimate')
    const r = filterWeapons(allWeapons(), { ...base, content: { sote: false, tp: false } })
    expect(r.hidden['content-sote']).toBe(102)
    expect(r.hidden['content-tp']).toBe(8)
    expect(r.kept).toHaveLength(487 - 110)
  })

  it('budget de charge : Endurance 25 (72,0), charge moyenne → 12,6', () => {
    expect(loadBudget(25, 'mid', data().tables).value).toBe(12.6)
    expect(loadBudget(25, 'light', data().tables).value).toBe(5.4)
    expect(loadBudget(25, 'heavy', data().tables).value).toBe(18)
    expect(loadBudget(25, 'mid', null).explanation.limits).toContainEqual({ code: 'load-budget-unavailable' })
  })
})

describe('recommandations par étape', () => {
  const scored: ScoredWeapon[] = allWeapons().map((c) => {
    const stage = stageOf(c)
    return { candidate: c, stage, score: scoreWeapon(c, ctx(c, { stage })), hidden: null }
  })
  const rec = recommendByStage(scored)

  it('5 armes au plus par étape, triées par score ; « Non classé » hors des colonnes', () => {
    expect(rec.columns.map((c) => c.stage)).toEqual([...STAGE_IDS])
    for (const col of rec.columns) {
      expect(col.weapons.length).toBeLessThanOrEqual(5)
      for (const w of col.weapons) expect(w.stage.value?.stage).toBe(col.stage)
    }
    const early = rec.columns[0]!.weapons.map((w) => w.score.value?.total ?? -1)
    expect(early).toEqual([...early].sort((a, b) => b - a))
    expect(rec.unclassified.length).toBe(21)
    for (const u of rec.unclassified) expect(u.score.value?.total).toBeNull()
    expect(rec.top?.score.value?.total).toBe(Math.max(...scored.map((s) => s.score.value?.total ?? -1)))
  })

  it('colonne DLC groupée par sous-zone, « DLC non localisé » en fin', () => {
    const dlc = rec.columns.find((c) => c.stage === 'dlc')!
    const ranks = dlc.weapons.map((w) => ['entry', 'core', 'enir-ilim', null].indexOf(w.stage.value?.dlcZone ?? null))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('alternatives : une étape d’écart au plus, 4 au plus', () => {
    const target = rec.columns[1]!.weapons[0]!
    const alts = alternatives(target, scored)
    expect(alts.length).toBeLessThanOrEqual(4)
    for (const a of alts) {
      expect(a.candidate.ref).not.toBe(target.candidate.ref)
      expect(Math.abs(STAGE_IDS.indexOf(a.stage.value!.stage) - 1)).toBeLessThanOrEqual(1)
    }
    expect(alternatives(rec.unclassified[0]!, scored)).toEqual([])
  })

  it('élargissements : les plus efficaces d’abord, seulement sous 3 armes', () => {
    const hidden = scored.map((s) => ({ ...s, hidden: s.stage.value?.stage === 'dlc' ? ('content-sote' as const) : s.hidden }))
    const dlc = recommendByStage(hidden).columns.find((c) => c.stage === 'dlc')!
    expect(dlc.weapons).toHaveLength(0)
    expect(widenSuggestions(dlc, 3)).toEqual([
      { reason: 'content-sote', count: 102 },
      { reason: 'style', count: 3 },
    ])
    expect(widenSuggestions(rec.columns[0]!)).toEqual([])
  })
})
