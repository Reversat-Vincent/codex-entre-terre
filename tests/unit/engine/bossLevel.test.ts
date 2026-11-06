// Tests du niveau recommandé (calculs.md, « Niveau recommandé d'un boss et préparation ») : cas M1 / M2 → M3, niveau d'entrée du DLC,
// bénédiction par sous-zone. Lisent les PV, runes et régions des boss de data/ (non touchés par les compléments sur les armes).

import { describe, expect, it } from 'vitest'
import {
  blessingLevelFor,
  bossLevelContext,
  gaugeMax,
  hybridLevel,
  readBlessingTable,
  readiness,
  recommendedBlessing,
  recommendedLevel,
  tierLevel,
} from '../../../src/engine/bossLevel.ts'
import { data, encounters } from './prepared.ts'

const tables = data().tables
const blessing = readBlessingTable(tables)
const ctx = bossLevelContext(encounters(), tables, blessing)

function m(key: string) {
  const ref = encounters().byKey.get(key)
  if (ref === undefined) throw new Error(key)
  return hybridLevel(ref, tables).value
}

describe('M1 : paliers et ancres', () => {
  it('interpolation entre les ancres, prolongée au-delà de T18', () => {
    expect([1, 4, 5, 7, 10, 11, 12, 13, 15, 16, 17, 18, 19].map((t) => tierLevel(t))).toEqual([10, 23, 27, 35, 48, 52, 56, 60, 100, 107, 113, 120, 127])
  })
})

describe('M3 : cas de test de calculs.md', () => {
  const cases: [string, number | null, number | null, number][] = [
    ['margit-the-fell-omen/margit-the-fell-omen', 23, 18, 21],
    ['godrick-the-grafted/godrick-the-grafted-phase-1', 27, 24, 26],
    ['red-wolf-of-radagon/red-wolf-of-radagon', 35, 19, 27],
    ['rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2', 35, 34, 35],
    ['starscourge-radahn/starscourge-radahn', 48, 46, 47],
    ['rykard-lord-of-blasphemy/rykard-lord-of-blasphemy-phase-1', 60, 64, 62],
    ['mohg-lord-of-blood/mohg-lord-of-blood-phase-1', 127, 111, 119],
    ['draconic-tree-sentinel/draconic-tree-sentinel-outskirts-draconic-tree-sentinel', 52, 39, 46],
    ['fias-champions/fias-champions', null, 34, 34],
    ['godfrey-first-elden-lord/godfrey-first-elden-lord-leyndell-royal-capital', 56, 50, 53],
    ['morgott-the-omen-king/morgott-the-omen-king', 56, 61, 59],
    ['fire-giant/fire-giant', 100, 75, 88],
    ['godskin-duo/godskin-duo', 100, 73, 87],
    ['maliketh-the-black-blade/maliketh-the-black-blade', 107, 83, 95],
    ['sir-gideon-ofnir-the-all-knowing/sir-gideon-ofnir-the-all-knowing', 113, 69, 91],
    ['godfrey-first-elden-lord/godfrey-first-elden-lord-leyndell-ashen-capital', 113, 96, 105],
    ['radagon-of-the-golden-order/radagon-of-the-golden-order', 120, null, 120],
    ['elden-beast/elden-beast', 120, 120, 120],
  ]
  it.each(cases)('%s : M1 %s, M2 %s → M3 %s', (key, m1, m2, m3) => {
    expect(m(key)).toMatchObject({ m1, m2, level: m3, dlcEntry: false })
  })

  it('niveau estimé, PV hors calcul, composantes dans le « Pourquoi ? »', () => {
    const r = recommendedLevel('morgott-the-omen-king/morgott-the-omen-king', ctx)
    expect(r.estimate).toEqual({ confidence: 'medium' })
    expect(r.explanation.limits).toContainEqual({ code: 'hp-not-used' })
    expect(r.explanation.components.map((c) => c.code)).toEqual(expect.arrayContaining(['zone-tier', 'm1', 'runes', 'm2', 'm3']))
  })

  it('Radagon : runes exclues ; rencontre absente : Non estimé', () => {
    const ref = encounters().byKey.get('radagon-of-the-golden-order/radagon-of-the-golden-order')!
    expect(hybridLevel(ref, tables).explanation.limits).toContainEqual({ code: 'runes-excluded' })
    const none = recommendedLevel('boss-inconnu/rencontre', ctx)
    expect(none.value).toBeNull()
    expect(none.explanation.limits).toContainEqual({ code: 'boss-not-estimated' })
  })
})

describe('DLC : niveau d’entrée et bénédiction', () => {
  it('niveau d’entrée = max(M3 Radahn, M3 Mohg) = 119, pour tous les boss du DLC', () => {
    expect(ctx.dlcEntry.value).toBe(119)
    for (const key of [
      'messmer-the-impaler/messmer-the-impaler-base-serpent-messmer',
      'romina-saint-of-the-bud/romina-saint-of-the-bud',
      'promised-consort-radahn/promised-consort-radahn-radahn-consort-of-miquella',
      'rellana-twin-moon-knight/rellana-twin-moon-knight',
    ]) {
      expect(recommendedLevel(key, ctx).value).toMatchObject({ level: 119, dlcEntry: true, m1: null, m2: null })
    }
  })

  it('table de bénédiction lue dans tables.scadutreeBlessing ; niveau = plus haut total ≤ fragments (D18)', () => {
    expect(blessing).not.toBeNull()
    expect(blessing?.[0]).toEqual({ level: 0, total: 0 })
    expect(blessingLevelFor(4, blessing!)).toBe(2)
    expect(blessingLevelFor(13, blessing!)).toBe(7)
    expect(blessingLevelFor(17, blessing!)).toBe(9)
  })

  it('bénédiction par sous-zone : Entrée 4 → 2, Cœur 13 → 7, Enir-Ilim 17 → 9', () => {
    expect(recommendedBlessing('entry', blessing)).toMatchObject({ fragments: 4, level: 2, pathFragments: 10 })
    expect(recommendedBlessing('core', blessing)).toMatchObject({ fragments: 13, level: 7, pathFragments: 33, maxLevel: 14 })
    expect(recommendedBlessing('enir-ilim', blessing)).toMatchObject({ fragments: 17, level: 9, pathFragments: 42, maxLevel: 17 })
    const at = (key: string) => recommendedLevel(key, ctx).value?.blessing
    expect(at('messmer-the-impaler/messmer-the-impaler-base-serpent-messmer')).toMatchObject({ zone: 'core', fragments: 13, level: 7 })
    expect(at('romina-saint-of-the-bud/romina-saint-of-the-bud')).toMatchObject({ zone: 'core', level: 7 })
    expect(at('promised-consort-radahn/promised-consort-radahn-radahn-consort-of-miquella')).toMatchObject({ zone: 'enir-ilim', level: 9 })
    expect(at('rellana-twin-moon-knight/rellana-twin-moon-knight')).toMatchObject({ zone: 'entry', level: 2 })
  })

  it('sans la table de bénédiction : fragments sans niveau, limite affichée', () => {
    const noTable = bossLevelContext(encounters(), tables, null)
    const r = recommendedLevel('messmer-the-impaler/messmer-the-impaler-base-serpent-messmer', noTable)
    expect(r.value?.blessing).toMatchObject({ fragments: 13, level: null })
    expect(r.explanation.limits).toContainEqual({ code: 'blessing-table-unavailable' })
  })
})

describe('préparation et jauge, réexportées', () => {
  it('Prêt, Limite, Trop tôt à partir du niveau recommandé', () => {
    const rec = recommendedLevel('morgott-the-omen-king/morgott-the-omen-king', ctx)
    const asNumber = { ...rec, value: rec.value?.level ?? null }
    expect(readiness(59, asNumber, false).value).toBe('ready')
    expect(readiness(51, asNumber, false).value).toBe('limit')
    expect(readiness(50, asNumber, false).value).toBe('early')
    expect(gaugeMax(40, 59)).toBe(89)
    expect(gaugeMax(70, null)).toBe(82)
  })
})
