// Tests des facettes : compteurs qui ignorent leur propre sélection, options à 0 conservées, estimations, prédicats fournis, tranches et définitions par catalogue.
// Les armes et les boss viennent des fixtures réelles de tests/fixtures ; les armures, sorts et lieux, de lignes écrites à la main.

import { describe, expect, it } from 'vitest'
import {
  BANDS,
  NONE_VALUE,
  TOGGLE_VALUE,
  armorCatalog,
  bandOf,
  bossCatalog,
  computeCatalog,
  describeFilter,
  dominantScaling,
  filterRows,
  genericCatalog,
  locationCatalog,
  relaxations,
  spellCatalog,
  spellFpCost,
  toggleFilter,
  weaponCatalog,
} from '../../../src/catalog/facets.ts'
import type { ActiveFilter, ArmorRow, CatalogQuery, SpellRow, WeaponRow } from '../../../src/catalog/facets.ts'
import { bosses, option, values, weapons } from './helpers.ts'

const rows = weapons()
const byName = (n: string) => rows.find((r) => r.name === n) as (typeof rows)[number]

const all: CatalogQuery = { filters: [], includeEstimates: true }
const q = (filters: ActiveFilter[], includeEstimates = true): CatalogQuery => ({ filters, includeEstimates })

/** Profil fictif : atteint les prérequis de la Dagger, du Longsword et de Moonveil seulement. */
const reached = new Set<WeaponRow>(['Dagger', 'Longsword', 'Moonveil'].map(byName))
const catalog = weaponCatalog({ meetsRequirements: (r) => reached.has(r) })

describe('compteurs des facettes d’armes', () => {
  it('sans filtre, compte toutes les lignes', () => {
    const s = computeCatalog(catalog, rows, all)
    expect(s.rows).toHaveLength(14)
    expect(option(s.facets, 'class', 'Daggers').count).toBe(3)
    expect(option(s.facets, 'class', 'Light Greatswords').count).toBe(2)
    expect(option(s.facets, 'content', 'Base game').count).toBe(10)
    expect(option(s.facets, 'content', 'Shadow of the Erdtree').count).toBe(3)
    expect(option(s.facets, 'content', 'Tarnished Pack').count).toBe(1)
  })

  it('une facette ignore sa propre sélection et applique celles des autres', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'class', value: 'Daggers' }]))
    expect(s.rows.map((r) => (r as (typeof rows)[number]).name)).toEqual(['Dagger', "Fire Knight's Shortsword", "Scorpion's Stinger"])
    // Sa propre facette : toutes les classes restent comptées.
    expect(option(s.facets, 'class', 'Daggers').count).toBe(3)
    expect(option(s.facets, 'class', 'Straight Swords').count).toBe(1)
    expect(option(s.facets, 'class', 'Katanas').count).toBe(1)
    // Les autres facettes : seulement les dagues.
    expect(option(s.facets, 'content', 'Base game').count).toBe(2)
    expect(option(s.facets, 'content', 'Shadow of the Erdtree').count).toBe(1)
    expect(option(s.facets, 'content', 'Tarnished Pack').count).toBe(0)
  })

  it('deux facettes sélectionnées se filtrent mutuellement, chacune sans sa propre sélection', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'class', value: 'Daggers' }, { facet: 'content', value: 'Shadow of the Erdtree' }]))
    expect(s.rows.map((r) => (r as (typeof rows)[number]).name)).toEqual(["Fire Knight's Shortsword"])
    // Contenu : filtré par la classe seule.
    expect(option(s.facets, 'content', 'Base game').count).toBe(2)
    expect(option(s.facets, 'content', 'Shadow of the Erdtree').count).toBe(1)
    // Classe : filtrée par le contenu seul.
    expect(option(s.facets, 'class', 'Daggers').count).toBe(1)
    expect(option(s.facets, 'class', 'Throwing Blades').count).toBe(1)
    expect(option(s.facets, 'class', 'Light Greatswords').count).toBe(1)
    expect(option(s.facets, 'class', 'Katanas').count).toBe(0)
  })

  it('plusieurs valeurs d’une même facette s’additionnent', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'class', value: 'Daggers' }, { facet: 'class', value: 'Katanas' }]))
    expect(s.rows).toHaveLength(4)
    expect(option(s.facets, 'class', 'Daggers').selected).toBe(true)
    expect(s.facets.find((f) => f.id === 'class')?.selectedCount).toBe(2)
  })

  it('garde une option à 0 : visible, marquée vide et désactivée', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'class', value: 'Daggers' }]))
    const tp = option(s.facets, 'content', 'Tarnished Pack')
    expect(tp).toMatchObject({ count: 0, total: 1, empty: true, disabled: true, selected: false })
    const bow = option(s.facets, 'class', 'Light Bows')
    expect(bow).toMatchObject({ count: 1, empty: false, disabled: false })
  })

  it('une option cochée à 0 reste décochable', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'content', value: 'Tarnished Pack' }, { facet: 'class', value: 'Daggers' }]))
    expect(s.rows).toHaveLength(0)
    expect(option(s.facets, 'content', 'Tarnished Pack')).toMatchObject({ count: 0, empty: true, selected: true, disabled: false })
  })

  it('un filtre dont la valeur n’existe plus reste listé pour pouvoir être retiré', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'region', value: 'Nulle part' }]))
    expect(option(s.facets, 'region', 'Nulle part')).toMatchObject({ count: 0, selected: true, disabled: false })
    expect(s.rows).toHaveLength(0)
  })

  it('les options déduites des lignes vont de la plus fréquente à la moins fréquente, « Non documenté » en dernier', () => {
    const s = computeCatalog(catalog, rows, all)
    const regions = values(s.facets, 'region')
    expect(regions.slice(0, 4)).toEqual(['Caelid', 'Liurnia of the Lakes', 'Roundtable Hold', 'Weeping Peninsula'])
    expect(regions.at(-1)).toBe(NONE_VALUE)
    expect(option(s.facets, 'region', NONE_VALUE)).toMatchObject({ label: 'Non documenté', count: 1 })
    const totals = s.facets.find((f) => f.id === 'region')?.options.map((o) => o.total) ?? []
    expect(totals.slice(0, -1)).toEqual([...totals.slice(0, -1)].sort((a, b) => b - a))
  })

  it('l’ordre des options ne bouge pas quand les filtres changent', () => {
    const before = values(computeCatalog(catalog, rows, all).facets, 'region')
    const after = values(computeCatalog(catalog, rows, q([{ facet: 'class', value: 'Daggers' }])).facets, 'region')
    expect(after).toEqual(before)
  })

  it('« Aucun » n’apparaît que si une ligne en a besoin', () => {
    const s = computeCatalog(catalog, rows, all)
    expect(values(s.facets, 'scaling')).toEqual(['str', 'dex', 'int', 'fai', 'arc'])
    const scalingless = { ...byName('Dagger'), scaling: { str: null, dex: null, int: null, fai: null, arc: null } }
    const t = computeCatalog(catalog, [scalingless], all)
    expect(option(t.facets, 'scaling', NONE_VALUE)).toMatchObject({ label: 'Aucun scaling', count: 1 })
  })
})

describe('facettes d’armes : valeurs', () => {
  it('scaling dominant à +0 : la meilleure lettre, tous les ex æquo', () => {
    expect(dominantScaling(byName('Dagger').scaling)).toEqual(['dex'])
    expect(dominantScaling(byName('Longsword').scaling)).toEqual(['str', 'dex'])
    expect(dominantScaling(byName('Meteorite Staff').scaling)).toEqual(['int'])
    expect(dominantScaling(byName('Moonveil').scaling)).toEqual(['int'])
    expect(dominantScaling({ str: null, dex: null, int: null, fai: null, arc: null })).toEqual([NONE_VALUE])
  })

  it('type d’amélioration : matériau, non améliorable, non documenté', () => {
    const s = computeCatalog(catalog, rows, all)
    expect(option(s.facets, 'upgrade', 'Smithing Stones').count).toBe(7)
    expect(option(s.facets, 'upgrade', 'Somber Smithing Stones').count).toBe(4)
    expect(option(s.facets, 'upgrade', 'not-upgradeable')).toMatchObject({ label: 'Non améliorable', count: 1 })
    expect(option(s.facets, 'upgrade', NONE_VALUE)).toMatchObject({ label: 'Non documenté', count: 2 })
  })

  it('effet passif : statut d’après status_buildup, autre effet, aucun', () => {
    const s = computeCatalog(catalog, rows, all)
    expect(option(s.facets, 'passive', 'blood_loss')).toMatchObject({ label: 'Saignement', count: 1 })
    expect(option(s.facets, 'passive', 'scarlet_rot')).toMatchObject({ label: 'Putréfaction écarlate', count: 1 })
    expect(option(s.facets, 'passive', 'frostbite').count).toBe(0)
    expect(option(s.facets, 'passive', 'other')).toMatchObject({ label: 'Autre effet passif', count: 2 })
    expect(option(s.facets, 'passive', NONE_VALUE)).toMatchObject({ label: 'Aucun effet passif', count: 10 })
  })

  it('contenu : une source double compte pour ses deux moitiés', () => {
    const both = { ...byName('Dagger'), source: 'Base game + Shadow of the Erdtree' as const }
    const s = computeCatalog(catalog, [both], all)
    expect(option(s.facets, 'content', 'Base game').count).toBe(1)
    expect(option(s.facets, 'content', 'Shadow of the Erdtree').count).toBe(1)
    expect(option(s.facets, 'content', 'Tarnished Pack').count).toBe(0)
  })
})

describe('« Prérequis atteints » : prédicat en paramètre', () => {
  it('est une case dont le compteur applique les autres facettes', () => {
    const s = computeCatalog(catalog, rows, all)
    expect(s.facets.find((f) => f.id === 'requirements')?.presentation).toBe('toggle')
    expect(option(s.facets, 'requirements', TOGGLE_VALUE).count).toBe(3)
    const daggers = computeCatalog(catalog, rows, q([{ facet: 'class', value: 'Daggers' }]))
    expect(option(daggers.facets, 'requirements', TOGGLE_VALUE).count).toBe(1)
  })

  it('cochée, ne garde que les lignes que le prédicat accepte', () => {
    const on = filterRows(catalog, rows, q([{ facet: 'requirements', value: TOGGLE_VALUE }]))
    expect(on.map((r) => r.name)).toEqual(['Dagger', 'Longsword', 'Moonveil'])
    const s = computeCatalog(catalog, rows, q([{ facet: 'requirements', value: TOGGLE_VALUE }]))
    // Les autres facettes ne comptent que les armes atteintes.
    expect(option(s.facets, 'class', 'Daggers').count).toBe(1)
    expect(option(s.facets, 'class', 'Katanas').count).toBe(1)
    expect(option(s.facets, 'class', 'Hammers').count).toBe(0)
    // Sa propre case ignore sa propre sélection.
    expect(option(s.facets, 'requirements', TOGGLE_VALUE).count).toBe(3)
  })

  it('suit le prédicat reçu : un autre profil, d’autres lignes', () => {
    const none = weaponCatalog({ meetsRequirements: () => false })
    expect(filterRows(none, rows, q([{ facet: 'requirements', value: TOGGLE_VALUE }]))).toEqual([])
    const everyone = weaponCatalog({ meetsRequirements: () => true })
    expect(filterRows(everyone, rows, q([{ facet: 'requirements', value: TOGGLE_VALUE }]))).toHaveLength(14)
  })
})

describe('« Inclure les estimations » : prédicat en paramètre', () => {
  it('compte les estimations et les retire de tout quand la case est décochée', () => {
    const on = computeCatalog(catalog, rows, all)
    expect(on.estimates).toEqual({ count: 5, included: true })
    expect(on.rows).toHaveLength(14)
    const off = computeCatalog(catalog, rows, q([], false))
    expect(off.estimates).toEqual({ count: 5, included: false })
    expect(off.rows).toHaveLength(9)
    expect(off.rows.some((r) => r.derived.upgrade.reliability === 'estimate')).toBe(false)
    expect(option(off.facets, 'class', 'Katanas').count).toBe(0)
    expect(option(off.facets, 'class', 'Katanas').total).toBe(1)
    expect(option(off.facets, 'upgrade', 'Somber Smithing Stones').count).toBe(1)
    expect(option(off.facets, 'upgrade', 'Somber Smithing Stones').total).toBe(4)
  })

  it('le nombre d’estimations suit les filtres, case ignorée', () => {
    const s = computeCatalog(catalog, rows, q([{ facet: 'content', value: 'Shadow of the Erdtree' }], false))
    expect(s.estimates).toEqual({ count: 2, included: false })
    expect(s.rows).toHaveLength(1)
  })

  it('utilise le prédicat reçu plutôt que la fiabilité des données', () => {
    const custom = weaponCatalog({ meetsRequirements: () => true, isEstimate: (r) => r.category === 'Daggers' })
    const s = computeCatalog(custom, rows, q([], false))
    expect(s.estimates?.count).toBe(3)
    expect(s.rows).toHaveLength(11)
  })

  it('les catalogues sans prédicat n’ont pas cette option', () => {
    expect(computeCatalog(bossCatalog(), bosses(), all).estimates).toBeNull()
    expect(computeCatalog(bossCatalog(), bosses(), q([], false)).rows).toHaveLength(7)
  })
})

describe('suggestions chiffrées d’un catalogue sans résultat', () => {
  it('propose le retrait de chaque filtre qui rendrait des lignes', () => {
    const filters = [
      { facet: 'passive', value: 'blood_loss' },
      { facet: 'class', value: 'Daggers' },
    ]
    expect(filterRows(catalog, rows, q(filters))).toEqual([])
    const r = relaxations(catalog, rows, q(filters))
    expect(r).toEqual([
      { filter: filters[0], count: 3 },
      { filter: filters[1], count: 1 },
    ])
    const labels = describeFilter(catalog, filters[0] as ActiveFilter)
    expect(labels).toEqual({ facet: 'Effet passif', value: 'Saignement' })
  })

  it('n’inclut pas un retrait qui ne change rien', () => {
    const filters = [
      { facet: 'content', value: 'Tarnished Pack' },
      { facet: 'class', value: 'Katanas' },
    ]
    expect(relaxations(catalog, rows, q(filters))).toEqual([
      { filter: filters[0], count: 1 },
      { filter: filters[1], count: 1 },
    ])
    expect(relaxations(catalog, rows, q([]))).toEqual([])
  })
})

describe('filtres actifs', () => {
  it('ajoute à la fin, retire au second appel, sans modifier la liste d’origine', () => {
    const a = toggleFilter([], 'class', 'Daggers')
    const b = toggleFilter(a, 'content', 'Base game')
    const c = toggleFilter(b, 'class', 'Katanas')
    expect(c.map((f) => f.value)).toEqual(['Daggers', 'Base game', 'Katanas'])
    expect(toggleFilter(c, 'content', 'Base game').map((f) => f.value)).toEqual(['Daggers', 'Katanas'])
    expect(a).toHaveLength(1)
  })

  it('décrit un filtre inconnu par sa valeur brute', () => {
    expect(describeFilter(catalog, { facet: 'zzz', value: 'v' })).toEqual({ facet: 'zzz', value: 'v' })
    expect(describeFilter(catalog, { facet: 'content', value: 'Tarnished Pack' }).value).toBe('Tarnished Pack (DLC)')
    expect(describeFilter(catalog, { facet: 'region', value: NONE_VALUE }).value).toBe('Non documenté')
  })
})

describe('boss', () => {
  const cat = bossCatalog()
  const s = computeCatalog(cat, bosses(), all)

  it('rang : toujours les six rangs, du plus élevé au moins élevé', () => {
    expect(values(s.facets, 'tier')).toEqual(['Gods', 'Demigods', 'Legends', 'Great Enemies', 'Enemies', 'Invaders and other minibosses'])
    expect(option(s.facets, 'tier', 'Gods').count).toBe(2)
    expect(option(s.facets, 'tier', 'Legends')).toMatchObject({ count: 0, empty: true })
  })

  it('obligatoire et Remembrance d’après les indicateurs', () => {
    expect(option(s.facets, 'mandatory', 'yes').count).toBe(4)
    expect(option(s.facets, 'mandatory', 'no').count).toBe(3)
    expect(option(s.facets, 'remembrance', 'yes').count).toBe(4)
    expect(option(s.facets, 'remembrance', 'no').count).toBe(3)
  })

  it('région : union des rencontres, sans doubler une région répétée', () => {
    expect(option(s.facets, 'region', 'Enir-Ilim').count).toBe(1)
    expect(option(s.facets, 'region', 'Altus Plateau').count).toBe(3)
    const f = computeCatalog(cat, bosses(), q([{ facet: 'mandatory', value: 'yes' }, { facet: 'remembrance', value: 'yes' }]))
    expect(f.rows.map((b) => b.name)).toEqual(['Elden Beast', 'Promised Consort Radahn'])
    expect(option(f.facets, 'region', 'Altus Plateau').count).toBe(1)
  })
})

describe('armures', () => {
  const armor = (slot: string, weight: number | null, poise: number, physical: number | null): ArmorRow => ({
    slot,
    weight,
    poise,
    damage_negation: { physical },
  })
  const pieces = [armor('Head', 2.9, 2, 2.9), armor('Head', 3, 3, 3), armor('Chest', 10.9, 10, 7.9), armor('Legs', 11, 21, 12), armor('Arms', null, 0, null)]
  const s = computeCatalog(armorCatalog(), pieces, all)

  it('tranches : bornes basses incluses, hautes exclues, valeur absente à part', () => {
    expect(bandOf(BANDS.armorWeight, 2.9)).toBe('w0')
    expect(bandOf(BANDS.armorWeight, 3)).toBe('w1')
    expect(bandOf(BANDS.armorWeight, 11)).toBe('w4')
    expect(bandOf(BANDS.armorWeight, null)).toBe(NONE_VALUE)
    expect(bandOf(BANDS.armorWeight, -1)).toBe(NONE_VALUE)
    expect(bandOf(BANDS.armorAbsorption, -5.8)).toBe('a0')
    expect(bandOf(BANDS.armorWeight, Number.NaN)).toBe(NONE_VALUE)
  })

  it('emplacement, poids, équilibre, absorption', () => {
    expect(values(s.facets, 'slot')).toEqual(['Head', 'Chest', 'Arms', 'Legs'])
    expect(option(s.facets, 'slot', 'Head')).toMatchObject({ label: 'Tête', count: 2 })
    expect(option(s.facets, 'weight', 'w0').count).toBe(1)
    expect(option(s.facets, 'weight', 'w1').count).toBe(1)
    expect(option(s.facets, 'weight', 'w3').count).toBe(1)
    expect(option(s.facets, 'weight', 'w4').count).toBe(1)
    expect(option(s.facets, 'weight', NONE_VALUE).count).toBe(1)
    expect(option(s.facets, 'poise', 'p0').count).toBe(2)
    expect(option(s.facets, 'poise', 'p2').count).toBe(1)
    expect(option(s.facets, 'poise', 'p4').count).toBe(1)
    expect(option(s.facets, 'absorption', 'a2').count).toBe(1)
    expect(option(s.facets, 'absorption', 'a4').count).toBe(1)
    expect(option(s.facets, 'absorption', NONE_VALUE).count).toBe(1)
  })

  it('l’absorption absente n’est pas comptée comme 0', () => {
    const withNegative = [...pieces, armor('Legs', 5, 5, -2)]
    const light = filterRows(armorCatalog(), withNegative, q([{ facet: 'absorption', value: 'a0' }]))
    expect(light.map((p) => p.damage_negation.physical)).toEqual([2.9, -2])
  })
})

describe('sorts', () => {
  const spell = (type: string, sub: string | undefined, fp: number | string, req: Partial<SpellRow['requirements']>): SpellRow => ({
    type,
    sub_type: sub,
    fp_cost: fp,
    requirements: { int: 0, fai: 0, arc: 0, ...req },
  })
  const spells = [
    spell('Sorcery', 'Glintstone', 9, { int: 12 }),
    spell('Sorcery', 'Carian', '22 (4)', { int: 40 }),
    spell('Incantation', undefined, 30, { fai: 20, arc: 10 }),
    spell('Incantation', 'Dragon', 'variable', {}),
  ]
  const reached = new Set([spells[0]])
  const cat = spellCatalog({ meetsRequirements: (r) => reached.has(r) })
  const s = computeCatalog(cat, spells, all)

  it('premier nombre du coût en PF', () => {
    expect(spellFpCost('22 (4)')).toBe(22)
    expect(spellFpCost('1,5')).toBe(1.5)
    expect(spellFpCost(12)).toBe(12)
    expect(spellFpCost('variable')).toBeNull()
  })

  it('type, école, attribut requis, coût', () => {
    expect(option(s.facets, 'type', 'Sorcery').count).toBe(2)
    expect(option(s.facets, 'school', 'Carian').count).toBe(1)
    expect(option(s.facets, 'school', NONE_VALUE).count).toBe(1)
    expect(option(s.facets, 'attribute', 'int').count).toBe(2)
    expect(option(s.facets, 'attribute', 'arc').count).toBe(1)
    expect(option(s.facets, 'attribute', NONE_VALUE)).toMatchObject({ label: 'Aucun prérequis', count: 1 })
    expect(option(s.facets, 'fp', 'f0').count).toBe(1)
    expect(option(s.facets, 'fp', 'f2').count).toBe(1)
    expect(option(s.facets, 'fp', 'f3').count).toBe(1)
    expect(option(s.facets, 'fp', NONE_VALUE).count).toBe(1)
  })

  it('prérequis atteints : prédicat reçu', () => {
    expect(option(s.facets, 'requirements', TOGGLE_VALUE).count).toBe(1)
    expect(filterRows(cat, spells, q([{ facet: 'requirements', value: TOGGLE_VALUE }]))).toEqual([spells[0]])
  })
})

describe('lieux et autres catalogues', () => {
  it('lieux : type et région, valeurs absentes à part', () => {
    const places = [
      { kind: 'Dungeon', region: 'Limgrave', source: 'Base game' },
      { kind: 'Dungeon', region: 'Caelid', source: 'Base game' },
      { kind: 'Region', region: null, source: 'Base game' },
      { kind: null, region: 'Limgrave', source: 'Base game' },
    ]
    const s = computeCatalog(locationCatalog(), places, all)
    expect(values(s.facets, 'kind')).toEqual(['Dungeon', 'Region', NONE_VALUE])
    expect(option(s.facets, 'region', 'Limgrave').count).toBe(2)
    expect(option(s.facets, 'region', NONE_VALUE).count).toBe(1)
  })

  it('autres catalogues : source et catégorie', () => {
    const items = [
      { source: 'Base game', category: 'Key Items' },
      { source: 'Shadow of the Erdtree', category: 'Key Items' },
      { source: 'Shadow of the Erdtree', category: 'Tools' },
    ]
    const s = computeCatalog(genericCatalog(), items, all)
    expect(s.facets.map((f) => f.id)).toEqual(['content', 'category'])
    expect(values(s.facets, 'category')).toEqual(['Key Items', 'Tools'])
    expect(option(s.facets, 'content', 'Tarnished Pack')).toMatchObject({ count: 0, empty: true })
    expect(computeCatalog(genericCatalog(false), items, all).facets.map((f) => f.id)).toEqual(['content'])
  })
})
