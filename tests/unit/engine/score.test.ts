// Tests du score de recommandation (calculs.md, « Score de recommandation d'une arme (0–100) ») sur des armes connues.
// Armes choisies pour résister aux compléments de données : type d'amélioration déjà documenté par le wiki (Longsword, Erdtree Seal),
// arme non améliorable (Meteorite Staff) ; les cas « estimé » et « non documenté » sont construits à partir d'une copie.
// Filtre « hors build » (K-V1) et facteur de prérequis manquant (K-V2) : décisions D47 et D48 (seuil de 5 sur 25, plafond de 15, tolérance de
// 5 points), docs/contenu/verification-v1.md § 3.2 et § 3.3. Filtre « hors de portée » (V13) et paramètres des limites de masquage (V14, V15) :
// décision D51, docs/contenu/verification-v2.md § 1.3 et § 3.2.

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
  isOffBuild,
  isOutOfReach,
  loadBudget,
  reachOf,
  recommendByStage,
  scoreWeapon,
  weaponFilesFor,
  widenSuggestions,
  withVisibilityLimits,
} from '../../../src/engine/score.ts'
import type { CandidateWeapon, Reach, ScoreContext, ScoredWeapon } from '../../../src/engine/score.ts'
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
    // Adéquation : C (0,55) sur des poids 1,3 → 21 ; puissance : FAI 10 sur 40, 30 points manquants (au-delà de la tolérance de 5),
    // 17,5 × 0,6 + 2,58 → 13 (K-V2) ; accès : Volcano Manor (D-V4), Fin, 2 étapes d'avance (−8), 30 points manquants (18, plafond 15) → 2 ;
    // sombres 20.
    expect(s.value).toMatchObject({ fit: 21, power: 13, access: 2, upgrade: 20, total: 56 })
    // Profil qui atteint les prérequis (FAI 40) : puissance entière, 17,5 + 2,58 → 20, et accès sans point manquant (25 − 8).
    const met = scoreWeapon(c, ctx(c, { weights: { fai: 1, str: 0.3 }, attrs: attrs({ fai: 40 }) }))
    expect(met.value).toMatchObject({ fit: 21, power: 20, access: 17, upgrade: 20, total: 78 })
  })

  it('prérequis non atteint (K-V2) : puissance de base × 0,6, lettres inchangées, expliqué par une composante', () => {
    const c = candidate("Lusat's Glintstone Staff")
    const weights = { int: 1, dex: 0.2 }
    const base = c.weapon.sorcery_scaling as number
    const low = scoreWeapon(c, ctx(c, { weights, attrs: attrs({ int: 16 }) }))
    const high = scoreWeapon(c, ctx(c, { weights, attrs: attrs({ int: 52 }) }))
    const factor = low.explanation.components.find((x) => x.code === 'unmet-requirement-factor')
    expect(factor).toEqual({
      code: 'unmet-requirement-factor',
      value: Math.round(base * 0.6 * 10) / 10,
      max: 162,
      params: { factor: 0.6, attrs: 'int', points: 36, tolerance: 5 },
    })
    expect(high.explanation.components.some((x) => x.code === 'unmet-requirement-factor')).toBe(false)
    // La somme des lettres ne change pas ; seule la part de la puissance (70 % de 25) est réduite de 40 %.
    const sum = (s: typeof low) => s.explanation.components.find((x) => x.code === 'scaling-sum')?.value
    expect(sum(low)).toBe(sum(high))
    // INT 52 : 17,5 × 161 / 162 + 7,5 × 1,1 / 1,6 = 22,5 → 23 ; INT 16 : 17,5 × 0,6 × 161 / 162 + 5,16 = 15,6 → 16.
    expect(high.value?.power).toBe(23)
    expect(low.value?.power).toBe(16)
    // Puissance de sort non documentée : le facteur garde `null`, jamais 0.
    const none = scoreWeapon(c, ctx(c, { weights, attrs: attrs({ int: 16 }), catalystCaps: {} }))
    expect(none.value?.power).toBeNull()
    // Puissance de sort absente de l'entrée (champ facultatif) : non documentée.
    const rest = { ...c.weapon }
    delete rest.sorcery_scaling
    const undocumented: CandidateWeapon = { ...c, weapon: rest }
    const nullBase = scoreWeapon(undocumented, ctx(undocumented, { weights, attrs: attrs({ int: 16 }) }))
    expect(nullBase.explanation.components.find((x) => x.code === 'unmet-requirement-factor')?.value).toBeNull()
  })

  it('tolérance du facteur (D48) : × 0,6 seulement au-delà de 5 points manquants au total, × 1 affiché en deçà', () => {
    const c = candidate("Lusat's Glintstone Staff")
    const weights = { int: 1, dex: 0.2 }
    const factorOf = (int: number) => scoreWeapon(c, ctx(c, { weights, attrs: attrs({ int }) })).explanation.components.find((x) => x.code === 'unmet-requirement-factor')
    // INT 47 pour 52 : 5 points, dans la tolérance ; INT 46 : 6 points, au-delà.
    expect(factorOf(47)?.params).toEqual({ factor: 1, attrs: 'int', points: 5, tolerance: 5 })
    expect(factorOf(47)?.value).toBe(c.weapon.sorcery_scaling)
    expect(factorOf(46)?.params).toMatchObject({ factor: 0.6, points: 6 })
    // Iron Cleaver (STR 15) pour le Vagabond (STR 14) : un point manquant, puissance entière (cas de calculs.md, « Priorités de montée de niveau »).
    const cleaver = candidate('Iron Cleaver')
    const vagabond = { vig: 15, mnd: 10, end: 11, str: 14, dex: 13, int: 9, fai: 9, arc: 7 }
    const low = scoreWeapon(cleaver, ctx(cleaver, { weights: { str: 1, dex: 0.2 }, attrs: vagabond }))
    const met = scoreWeapon(cleaver, ctx(cleaver, { weights: { str: 1, dex: 0.2 }, attrs: { ...vagabond, str: 15 } }))
    expect(low.value?.missingPoints).toBe(1)
    expect(low.value?.power).toBe(met.value?.power)
    expect(low.explanation.components.find((x) => x.code === 'unmet-requirement-factor')?.params?.factor).toBe(1)
  })

  it('accessibilité : étapes d’avance, points manquants plafonnés, Remembrance, départ', () => {
    const c = candidate('Blasphemous Blade')
    const s = scoreWeapon(c, ctx(c))
    // Fin (2 étapes d'avance, −8), STR 22 / FAI 21 / DEX 15 : 30 points manquants (−18, plafond −15), Remembrance (−4) : 25 − 27, borné à 0.
    expect(s.value?.access).toBe(0)
    // Mêmes malus avec 10 points manquants seulement (STR 22, FAI 21, DEX 15 → 20, 13, 15) : −6, sous le plafond → 25 − 8 − 6 − 4 = 7.
    expect(scoreWeapon(c, ctx(c, { attrs: attrs({ str: 20, fai: 13, dex: 15 }) })).value).toMatchObject({ missingPoints: 10, access: 7 })
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

  it('hors build (K-V1, D48) : adéquation au build inférieure à 5 sur 25, avant arrondi ; rien sans build cible', () => {
    const base = { content: { sote: true, tp: true }, constraints: { excludeRemembrance: false, excludeRandomDrop: false, excludeQuest: false }, reliability: { includeEstimates: true } }
    const build = (weights: Record<string, number>, over: { status?: 'blood_loss'; classes?: string[] } = {}) => ({ weights, status: over.status ?? null, classes: over.classes ?? [] })
    const str = build({ str: 1, dex: 0.2 })
    const int = build({ int: 1, dex: 0.2 })
    const dexarc = build({ dex: 1, arc: 1 })
    const off = (name: string, b: ReturnType<typeof build> | null) => isOffBuild(candidate(name).weapon, b)
    // Coded Sword : seulement FAI ; Club : seulement STR.
    expect(off('Coded Sword', str)).toBe(true)
    expect(off('Club', str)).toBe(false)
    expect(off('Club', dexarc)).toBe(true)
    // verification-v1.md § 3.2 : une lettre sur un attribut faiblement pondéré ne suffit plus (DEX 0,2 de l'archétype Intelligence).
    expect(off('Winged Scythe', int)).toBe(true)
    expect(off("Rogier's Rapier", int)).toBe(true)
    expect(off('Rotten Crystal Sword', dexarc)).toBe(true)
    expect(off("Miquellan Knight's Sword", dexarc)).toBe(true)
    // Rogier's Rapier : DEX C (0,55 × 0,2 / 1,2 × 50 = 4,58) s'affiche 5 après arrondi, mais reste sous le seuil ; le score garde la valeur
    // avant arrondi (`fitExact`, V15).
    const rapier = candidate("Rogier's Rapier")
    const rapierScore = scoreWeapon(rapier, ctx(rapier, { weights: int.weights })).value
    expect(rapierScore?.fit).toBe(5)
    expect(rapierScore?.fitExact).toBeCloseTo((0.55 * 0.2) / 1.2 / 0.5 * 25, 10)
    // Le seuil porte sur toute la composante : le bonus de classe préférée (+2) la fait passer au-dessus.
    expect(off("Rogier's Rapier", build(int.weights, { classes: [rapier.weapon.category] }))).toBe(false)
    // Armes adaptées gardées.
    expect(off('Iron Cleaver', str)).toBe(false)
    expect(off('Reduvia', build(dexarc.weights, { status: 'blood_loss' }))).toBe(false)
    expect(off('Moonveil', int)).toBe(false)
    // Sans build cible (poids automatiques), ou build sans attribut d'arme pondéré : rien n'est écarté.
    expect(off('Coded Sword', null)).toBe(false)
    expect(off('Coded Sword', build({}))).toBe(false)
    // « Hors build » passe avant les critères : les décomptes des critères restent ceux qu'un élargissement montrerait.
    expect(hiddenReason(candidate('Coded Sword'), { ...base, content: { sote: true, tp: false } }, str)).toBe('off-build')
    expect(hiddenReason(candidate('Coded Sword'), base)).toBeNull()
    const r = filterWeapons(allWeapons(), base, str)
    expect(r.hidden['off-build']).toBe(r.hiddenItems.length)
    expect(r.hiddenItems.every((h) => isOffBuild(h.candidate.weapon, str))).toBe(true)
    expect(filterWeapons(allWeapons(), base).hidden['off-build']).toBe(0)
  })

  it('hors de portée (V13, D51) : plus de 25 points manquants, jusqu’à l’étape qui suit celle du joueur, étapes passées comprises', () => {
    const base = { content: { sote: true, tp: true }, constraints: { excludeRemembrance: false, excludeRandomDrop: false, excludeQuest: false }, reliability: { includeEstimates: true } }
    const reach = (stage: Reach['stage'], playerStage: Reach['playerStage'], missingPoints: number): Reach => ({ stage, playerStage, missingPoints })
    // Étape du joueur et suivante ; strictement plus de 25 points (25 : malus d'accessibilité au plafond, 15 / 0,6).
    expect(isOutOfReach(reach('mid', 'early', 38))).toBe(true)
    expect(isOutOfReach(reach('mid', 'mid', 38))).toBe(true)
    expect(isOutOfReach(reach('mid', 'mid', 26))).toBe(true)
    expect(isOutOfReach(reach('mid', 'mid', 25))).toBe(false)
    expect(isOutOfReach(reach('dlc', 'endgame', 30))).toBe(true)
    // Étapes déjà passées : touchées aussi (arbitrage de D51).
    expect(isOutOfReach(reach('early', 'mid', 38))).toBe(true)
    expect(isOutOfReach(reach('mid', 'late', 38))).toBe(true)
    expect(isOutOfReach(reach('early', 'dlc', 26))).toBe(true)
    expect(isOutOfReach(reach('early', 'dlc', 25))).toBe(false)
    // Étapes plus lointaines (Rotten Crystal Staff en Fin de jeu, joueur au Début ou au Milieu) : non touchées.
    expect(isOutOfReach(reach('endgame', 'early', 32))).toBe(false)
    expect(isOutOfReach(reach('endgame', 'mid', 32))).toBe(false)
    expect(isOutOfReach(reach('endgame', 'late', 32))).toBe(true)
    // Arme « Non classé » ou position inconnue : jamais écartée.
    expect(isOutOfReach(reach(null, 'early', 99))).toBe(false)
    expect(isOutOfReach(null)).toBe(false)

    // Position tirée du score : Lusat's Glintstone Staff (STR 10, INT 52) pour l'Astrologer (STR 8, INT 16), 38 points, Milieu.
    const lusat = candidate("Lusat's Glintstone Staff")
    const astrologer = { vig: 9, mnd: 15, end: 9, str: 8, dex: 12, int: 16, fai: 7, arc: 9 }
    const stage = stageOf(lusat)
    const score = scoreWeapon(lusat, ctx(lusat, { weights: { int: 1, dex: 0.2 }, attrs: astrologer, stage }))
    expect(reachOf(stage, score, 'early')).toEqual({ stage: 'mid', playerStage: 'early', missingPoints: 38 })
    const int = { weights: { int: 1, dex: 0.2 }, status: null, classes: [] }
    expect(hiddenReason(lusat, base, int, reachOf(stage, score, 'early'))).toBe('out-of-reach')
    // Joueur en Fin : le Milieu est passé, le bâton reste écarté (arbitrage de D51).
    expect(hiddenReason(lusat, base, int, reachOf(stage, score, 'late'))).toBe('out-of-reach')
    // « Hors build » passe d'abord, puis « hors de portée », puis les critères (décomptes d'élargissement exacts).
    const coded = candidate('Coded Sword')
    expect(hiddenReason(coded, base, { weights: { str: 1, dex: 0.2 }, status: null, classes: [] }, reach('mid', 'mid', 40))).toBe('off-build')
    const est = withUpgrade(candidate('Longsword'), { material: 'Smithing Stones', maxLevel: 25, reliability: 'estimate', confidence: 'medium' })
    expect(hiddenReason(est, { ...base, reliability: { includeEstimates: false } }, null, reach('early', 'early', 30))).toBe('out-of-reach')
    // Sans position, le filtre ne s'applique pas ; `filterWeapons` le compte avec les armes masquées quand la position est fournie.
    expect(hiddenReason(lusat, base, int)).toBeNull()
    const r = filterWeapons([lusat, candidate("Astrologer's Staff")], base, int, (c) => (c.ref === lusat.ref ? reachOf(stage, score, 'mid') : null))
    expect(r.hidden['out-of-reach']).toBe(1)
    expect(r.hiddenItems).toEqual([{ candidate: lusat, reason: 'out-of-reach' }])
    expect(r.kept.map((c) => c.weapon.name)).toEqual(["Astrologer's Staff"])
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

  it('hors build (K-V1) : hors des colonnes, compté par raison, jamais proposé en élargissement', () => {
    const offBuild = scored.map((s) => ({ ...s, hidden: s.stage.value?.stage === 'early' ? ('off-build' as const) : s.hidden }))
    const early = recommendByStage(offBuild).columns.find((c) => c.stage === 'early')!
    expect(early.weapons).toHaveLength(0)
    expect(early.hidden['off-build']).toBe(early.hiddenCount)
    expect(early.hiddenCount).toBeGreaterThan(0)
    expect(widenSuggestions(early, 2)).toEqual([{ reason: 'style', count: 2 }])
  })

  it('hors de portée (V13, D51) : hors des colonnes, compté avec les armes masquées, jamais proposé en élargissement', () => {
    const far = scored.map((s) => ({ ...s, hidden: s.stage.value?.stage === 'mid' ? ('out-of-reach' as const) : s.hidden }))
    const mid = recommendByStage(far).columns.find((c) => c.stage === 'mid')!
    expect(mid.weapons).toHaveLength(0)
    expect(mid.hidden['out-of-reach']).toBe(mid.hiddenCount)
    expect(mid.hiddenCount).toBeGreaterThan(0)
    expect(widenSuggestions(mid, 1)).toEqual([{ reason: 'style', count: 1 }])
  })
})

describe('withVisibilityLimits', () => {
  const ctx: ScoreContext = {
    weights: { str: 1 },
    attrs: attrs(),
    hands: 'one',
    status: null,
    classes: [],
    stonePreference: 'none',
    playerStage: 'early',
    budget: null,
    catalystCaps: {},
    stage: entryStage(candidate('Club').weapon, { ref: candidate('Club').ref, file: 'melee_armaments', encounters: encounters(), startingArmaments: null }),
    startingBonus: false,
  }

  it('score inchangé ; raison de masquage et style signalés par des limites', () => {
    const score = scoreWeapon(candidate('Club'), ctx)
    expect(withVisibilityLimits(score, null, true)).toBe(score)
    const out = withVisibilityLimits(score, 'remembrance', false)
    expect(out.value).toBe(score.value)
    expect(out.explanation.limits.slice(-2)).toEqual([{ code: 'weapon-outside-style' }, { code: 'weapon-hidden-remembrance' }])
    expect(score.explanation.limits).not.toContainEqual({ code: 'weapon-outside-style' })
  })

  it('« hors build » cite le seuil et l’adéquation avant arrondi (V15) ; « hors de portée » ses points manquants (V13)', () => {
    // Rogier's Rapier, archétype Intelligence : 4,58 avant arrondi, affiché 5 ; la limite cite 4,6, sous le seuil de 5.
    const rapier = candidate("Rogier's Rapier")
    const score = scoreWeapon(rapier, { ...ctx, weights: { int: 1, dex: 0.2 }, stage: entryStage(rapier.weapon, { ref: rapier.ref, file: rapier.file, encounters: encounters(), startingArmaments: null }) })
    expect(withVisibilityLimits(score, 'off-build', true).explanation.limits.at(-1)).toEqual({ code: 'weapon-hidden-off-build', params: { max: 5, fit: 4.6 } })
    // Un dixième qui atteindrait le seuil n'est jamais cité : 4,96 reste 4,96 (et non « 5,0, sous le seuil de 5 »).
    const edge = { ...score, value: { ...score.value!, fitExact: 4.96 } }
    expect(withVisibilityLimits(edge, 'off-build', true).explanation.limits.at(-1)?.params).toEqual({ max: 5, fit: 4.96 })
    // « Hors de portée » : seuil, étapes couvertes et points manquants du score.
    const far = { ...score, value: { ...score.value!, missingPoints: 38 } }
    expect(withVisibilityLimits(far, 'out-of-reach', true).explanation.limits.at(-1)).toEqual({
      code: 'weapon-hidden-out-of-reach',
      params: { max: 25, span: 1, points: 38 },
    })
  })
})
