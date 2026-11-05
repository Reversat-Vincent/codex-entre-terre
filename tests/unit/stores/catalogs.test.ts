// Tests du store des catalogues sur les fixtures (armes, boss, origines) servies par un faux réseau : filtres dans l'ordre d'ajout, compteurs,
// recherche par nom, tri multi-colonnes, pagination, prédicats « Prérequis atteints » et estimations, suggestions d'élargissement, état par catalogue.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CATALOG_KEYS, CATALOG_SPECS, catalogKeyOfRoute } from '../../../src/catalog/registry.ts'
import { DATASETS, FILE_KEYS } from '../../../src/data/datasets.ts'
import type { FileKey } from '../../../src/data/datasets.ts'
import type { FetchFn } from '../../../src/data/loader.ts'
import type { DataManifest } from '../../../src/data/types/index.ts'
import { useCatalogsStore } from '../../../src/stores/catalogs.ts'
import { useCriteriaStore } from '../../../src/stores/criteria.ts'
import { useDataStore } from '../../../src/stores/data.ts'
import { option } from '../catalog/helpers.ts'

const encoder = new TextEncoder()
const FIXTURES: readonly FileKey[] = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches', 'bosses', 'origins']

/** Contenu servi : la fixture réelle, ou un fichier vide pour les autres jeux de données. */
function content(key: FileKey): string {
  if (FIXTURES.includes(key)) return readFileSync(join(process.cwd(), 'tests', 'fixtures', `${key}.json`), 'utf-8')
  return JSON.stringify({ schema: 1, key, entries: [] })
}

const texts = new Map<FileKey, string>(FILE_KEYS.map((k) => [k, content(k)]))

function manifest(): DataManifest {
  const files = Object.fromEntries(
    FILE_KEYS.map((k) => {
      const text = texts.get(k) as string
      const entries = (JSON.parse(text) as { entries?: unknown[] }).entries?.length ?? 0
      return [k, { path: `${k}.0123456789.json`, bytes: encoder.encode(text).length, sha256: 'a', entries, label: k }]
    }),
  ) as DataManifest['files']
  return { schema: 1, dataVersion: '0123456789abcdef', retrieved: '2026-10-31', files }
}

const fetchFn: FetchFn = async (url) => {
  if (url.endsWith('manifest.json')) return Response.json(manifest())
  const key = url.split('/').pop()!.split('.')[0] as FileKey
  return new Response(texts.get(key)!)
}

async function setup() {
  const data = useDataStore()
  data.configure({ base: '/', fetchFn })
  const catalogs = useCatalogsStore()
  await Promise.all([catalogs.ensure('weapons:melee'), catalogs.ensure('weapons:distance'), catalogs.ensure('weapons:boucliers'), catalogs.ensure('bosses'), catalogs.ensure('origins')])
  return { catalogs, criteria: useCriteriaStore() }
}

const names = (catalogs: ReturnType<typeof useCatalogsStore>, key: Parameters<ReturnType<typeof useCatalogsStore>['rows']>[0]): string[] =>
  catalogs.rows(key).map((r) => r.derived.displayName)

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('registre des catalogues', () => {
  it('chaque catalogue a des jeux de données connus, des facettes et un tri par nom', () => {
    for (const key of CATALOG_KEYS) {
      const spec = CATALOG_SPECS[key]
      expect(spec.key).toBe(key)
      expect(spec.datasets.every((d) => d in DATASETS)).toBe(true)
      expect(Object.hasOwn(spec.columns, 'name')).toBe(true)
      expect(spec.def(() => { throw new Error('profil lu à la construction') }).facets.length).toBeGreaterThan(0)
    }
  })

  it('retrouve le catalogue d’une route, famille et type inconnus ramenés au premier', () => {
    expect(catalogKeyOfRoute('weapons', 'boucliers')).toBe('weapons:boucliers')
    expect(catalogKeyOfRoute('weapons', 'inconnu')).toBe('weapons:melee')
    expect(catalogKeyOfRoute('weapons')).toBe('weapons:melee')
    expect(catalogKeyOfRoute('weapons', '__proto__')).toBe('weapons:melee')
    expect(catalogKeyOfRoute('items', 'cles')).toBe('items:cles')
    expect(catalogKeyOfRoute('items', null)).toBe('items:outils')
    expect(catalogKeyOfRoute('armors')).toBe('armors')
    expect(catalogKeyOfRoute('dashboard')).toBeNull()
    expect(catalogKeyOfRoute('weapons:melee')).toBeNull()
  })
})

describe('état et lecture de base', () => {
  it('un catalogue neuf : tout, trié par nom, estimations incluses, page 1', async () => {
    const { catalogs } = await setup()
    expect(catalogs.stateOf('weapons:melee')).toMatchObject({ filters: [], includeEstimates: true, search: '', page: 1, sort: [{ column: 'name', direction: 'asc' }] })
    expect(catalogs.status('weapons:melee')).toBe('ready')
    expect(catalogs.total('weapons:melee')).toBe(10)
    expect(catalogs.matches('weapons:melee')).toBe(10)
    const list = names(catalogs, 'weapons:melee')
    expect(list[0]).toBe('Blasphemous Blade')
    expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b, 'en')))
    expect(catalogs.page('weapons:melee')).toMatchObject({ page: 1, pageCount: 1, total: 10, from: 1, to: 10 })
    expect(catalogs.chips('weapons:melee')).toEqual([])
    expect(catalogs.suggestions('weapons:melee')).toEqual([])
  })

  it('signale le chargement tant que les fichiers ne sont pas lus', () => {
    const catalogs = useCatalogsStore()
    useDataStore().configure({ base: '/', fetchFn })
    expect(catalogs.status('bosses')).toBe('loading')
    expect(catalogs.total('bosses')).toBe(0)
    expect(catalogs.page('bosses')).toMatchObject({ total: 0, pageCount: 1, from: 0, to: 0 })
  })

  it('garde un état par catalogue, qui survit à la relecture du store mais pas à un nouveau Pinia', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    catalogs.setSearch('bosses', 'godrick')
    expect(useCatalogsStore().stateOf('weapons:melee').filters).toEqual([{ facet: 'class', value: 'Katanas' }])
    expect(catalogs.stateOf('weapons:boucliers').filters).toEqual([])
    expect(catalogs.stateOf('bosses').search).toBe('godrick')
    catalogs.reset('weapons:melee')
    expect(catalogs.stateOf('weapons:melee').filters).toEqual([])
    expect(catalogs.stateOf('bosses').search).toBe('godrick')
    setActivePinia(createPinia())
    expect(useCatalogsStore().stateOf('bosses').search).toBe('')
  })
})

describe('filtres', () => {
  it('garde l’ordre d’ajout, cumule entre facettes et additionne dans une facette', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    catalogs.toggleFilter('weapons:melee', 'content', 'Shadow of the Erdtree')
    catalogs.toggleFilter('weapons:melee', 'class', 'Daggers')
    expect(catalogs.chips('weapons:melee').map((c) => c.filter)).toEqual([
      { facet: 'class', value: 'Katanas' },
      { facet: 'content', value: 'Shadow of the Erdtree' },
      { facet: 'class', value: 'Daggers' },
    ])
    expect(catalogs.chips('weapons:melee')[1]).toMatchObject({ facetLabel: 'Contenu', valueLabel: 'Shadow of the Erdtree (DLC)' })
    for (const r of catalogs.rows('weapons:melee')) {
      expect(['Katanas', 'Daggers']).toContain((r as unknown as { category: string }).category)
      expect(r.source).toMatch(/Shadow of the Erdtree/)
    }
  })

  it('bascule un filtre déjà actif, le retire par sa puce, efface tout', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    expect(catalogs.matches('weapons:melee')).toBe(1)
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    expect(catalogs.matches('weapons:melee')).toBe(10)
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    catalogs.toggleFilter('weapons:melee', 'class', 'Daggers')
    catalogs.removeFilter('weapons:melee', 'class', 'Katanas')
    expect(catalogs.stateOf('weapons:melee').filters).toEqual([{ facet: 'class', value: 'Daggers' }])
    catalogs.removeFilter('weapons:melee', 'class', 'Katanas')
    expect(catalogs.stateOf('weapons:melee').filters).toHaveLength(1)
    catalogs.setSearch('weapons:melee', 'sword')
    catalogs.clearFilters('weapons:melee')
    expect(catalogs.stateOf('weapons:melee').filters).toEqual([])
    expect(catalogs.stateOf('weapons:melee').search).toBe('sword')
  })

  it('ignore une facette inconnue du catalogue', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('bosses', 'class', 'Katanas')
    catalogs.toggleFilter('bosses', '__proto__', 'x')
    expect(catalogs.stateOf('bosses').filters).toEqual([])
  })

  it('compteurs : une facette ignore sa propre sélection et applique celle des autres', async () => {
    const { catalogs } = await setup()
    const all = catalogs.rows('bosses') as unknown as { tier: string[]; flags: string[] }[]
    const remembrance = (b: { flags: string[] }): boolean => b.flags.some((f) => f.startsWith('remembrance_'))
    catalogs.toggleFilter('bosses', 'tier', 'Gods')
    expect(option(catalogs.facets('bosses'), 'tier', 'Gods')).toMatchObject({ count: 2, selected: true })
    // Les rangs non cochés comptent leurs boss : la sélection de « Rang » n'entre pas dans leurs compteurs.
    expect(option(catalogs.facets('bosses'), 'tier', 'Demigods')).toMatchObject({ count: 2, selected: false })
    expect(catalogs.matches('bosses')).toBe(2)
    catalogs.toggleFilter('bosses', 'remembrance', 'yes')
    const facets = catalogs.facets('bosses')
    expect(catalogs.matches('bosses')).toBe(all.filter((b) => b.tier.includes('Gods') && remembrance(b)).length)
    expect(option(facets, 'tier', 'Demigods').count).toBe(all.filter((b) => b.tier.includes('Demigods') && remembrance(b)).length)
    expect(option(facets, 'remembrance', 'no').count).toBe(all.filter((b) => b.tier.includes('Gods') && !remembrance(b)).length)
  })

  it('un changement de filtre ramène à la première page', async () => {
    const { catalogs } = await setup()
    catalogs.setPage('weapons:melee', 4)
    expect(catalogs.stateOf('weapons:melee').page).toBe(4)
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    expect(catalogs.stateOf('weapons:melee').page).toBe(1)
  })
})

describe('recherche par nom', () => {
  it('ignore casse, accents, apostrophes et ponctuation, et exige tous les mots', async () => {
    const { catalogs } = await setup()
    catalogs.setSearch('bosses', 'LORD  blasphemy')
    expect(names(catalogs, 'bosses')).toEqual(['Rykard, Lord of Blasphemy'])
    catalogs.setSearch('weapons:melee', 'fire knights short')
    expect(names(catalogs, 'weapons:melee')).toEqual(["Fire Knight's Shortsword"])
    catalogs.setSearch('weapons:melee', 'fire zzz')
    expect(catalogs.matches('weapons:melee')).toBe(0)
    catalogs.setSearch('weapons:melee', '   ')
    expect(catalogs.matches('weapons:melee')).toBe(10)
  })

  it('restreint aussi les compteurs de facettes', async () => {
    const { catalogs } = await setup()
    catalogs.setSearch('weapons:melee', 'sword')
    // Les classes sont déduites des lignes retenues : une classe sans arme « sword » n'est plus proposée.
    expect(catalogs.facets('weapons:melee').find((f) => f.id === 'class')?.options.map((o) => o.value)).not.toContain('Katanas')
    expect(option(catalogs.facets('weapons:melee'), 'class', 'Daggers').count).toBe(1)
  })

  it('borne la longueur de la saisie', async () => {
    const { catalogs } = await setup()
    catalogs.setSearch('bosses', 'a'.repeat(500))
    expect(catalogs.stateOf('bosses').search).toHaveLength(200)
  })
})

describe('tri', () => {
  it('clic : tri principal, deuxième clic : sens inversé ; Maj + clic : tri secondaire', async () => {
    const { catalogs } = await setup()
    catalogs.sortBy('weapons:melee', 'weight')
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([{ column: 'weight', direction: 'asc' }])
    const weights = catalogs.rows('weapons:melee').map((r) => (r as unknown as { weight: number }).weight)
    expect(weights).toEqual([...weights].sort((a, b) => a - b))
    catalogs.sortBy('weapons:melee', 'weight')
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([{ column: 'weight', direction: 'desc' }])
    catalogs.sortBy('weapons:melee', 'name', true)
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([
      { column: 'weight', direction: 'desc' },
      { column: 'name', direction: 'asc' },
    ])
    catalogs.resetSort('weapons:melee')
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([{ column: 'name', direction: 'asc' }])
  })

  it('setSort : remplace les critères ; colonnes inconnues, sens invalides et doublons écartés ; liste vide → tri par défaut ; page 1', async () => {
    const { catalogs } = await setup()
    catalogs.setPage('weapons:melee', 3)
    catalogs.setSort('weapons:melee', [
      { column: 'weight', direction: 'desc' },
      { column: 'inconnue', direction: 'asc' },
      { column: 'name', direction: 'sideways' as 'asc' },
      { column: 'weight', direction: 'asc' },
      { column: 'name', direction: 'asc' },
    ])
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([
      { column: 'weight', direction: 'desc' },
      { column: 'name', direction: 'asc' },
    ])
    expect(catalogs.stateOf('weapons:melee').page).toBe(1)
    const weights = catalogs.rows('weapons:melee').map((r) => (r as unknown as { weight: number }).weight)
    expect(weights).toEqual([...weights].sort((a, b) => b - a))
    catalogs.setSort('weapons:melee', [{ column: 'inconnue', direction: 'asc' }])
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([{ column: 'name', direction: 'asc' }])
  })

  it('trie sur les prérequis, les lettres de scaling et le rang des boss', async () => {
    const { catalogs } = await setup()
    catalogs.sortBy('weapons:melee', 'req-int')
    catalogs.sortBy('weapons:melee', 'req-int')
    expect(names(catalogs, 'weapons:melee')[0]).toBe('Moonveil')
    catalogs.sortBy('bosses', 'tier')
    const tiers = catalogs.rows('bosses').map((r) => (r as unknown as { tier: string[] }).tier[0])
    expect(tiers[0]).toBe('Gods')
    expect(tiers.at(-1)).toBe('Enemies')
  })

  it('met les valeurs non documentées en dernier quel que soit le sens', async () => {
    const { catalogs } = await setup()
    const missing = (r: unknown): boolean => (r as { skill: { name: string | null } }).skill.name === null
    const rows = catalogs.rows('weapons:melee')
    if (!rows.some(missing)) return
    for (let i = 0; i < 2; i++) {
      catalogs.sortBy('weapons:melee', 'skill')
      const list = catalogs.rows('weapons:melee').map(missing)
      expect(list).toEqual([...list].sort((a, b) => Number(a) - Number(b)))
    }
  })

  it('ignore une colonne inconnue et revient à la page 1 après un tri', async () => {
    const { catalogs } = await setup()
    catalogs.sortBy('weapons:melee', 'inconnue')
    catalogs.sortBy('weapons:melee', '__proto__')
    expect(catalogs.stateOf('weapons:melee').sort).toEqual([{ column: 'name', direction: 'asc' }])
    catalogs.setPage('weapons:melee', 3)
    catalogs.sortBy('weapons:melee', 'weight')
    expect(catalogs.stateOf('weapons:melee').page).toBe(1)
  })
})

describe('pagination', () => {
  it('ramène une page hors bornes dans les bornes sans perdre la demande', async () => {
    const { catalogs } = await setup()
    catalogs.setPage('weapons:melee', 9)
    expect(catalogs.page('weapons:melee')).toMatchObject({ page: 1, pageCount: 1, total: 10 })
    catalogs.setPage('weapons:melee', -2)
    expect(catalogs.stateOf('weapons:melee').page).toBe(1)
    catalogs.setPage('weapons:melee', Number.NaN)
    expect(catalogs.stateOf('weapons:melee').page).toBe(1)
    catalogs.setPage('weapons:melee', 2.9)
    expect(catalogs.stateOf('weapons:melee').page).toBe(2)
  })

  it('« Tout afficher » : rows donne la liste filtrée et triée entière', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('weapons:melee', 'class', 'Daggers')
    expect(catalogs.rows('weapons:melee')).toHaveLength(3)
    expect(catalogs.page('weapons:melee').items).toEqual(catalogs.rows('weapons:melee'))
  })
})

describe('estimations', () => {
  it('les décocher masque les armes estimées et compte celles qui sont masquées', async () => {
    const { catalogs } = await setup()
    expect(catalogs.estimates('weapons:melee')).toEqual({ count: 2, included: true })
    expect(catalogs.hidden('weapons:melee')).toBe(0)
    catalogs.setIncludeEstimates('weapons:melee', false)
    expect(catalogs.hidden('weapons:melee')).toBe(2)
    expect(catalogs.matches('weapons:melee')).toBe(8)
    expect(names(catalogs, 'weapons:melee')).not.toContain("Leontiel's Greatsword")
    expect(option(catalogs.facets('weapons:melee'), 'class', 'Greatswords').count).toBe(1)
  })

  it('le nombre masqué suit les filtres', async () => {
    const { catalogs } = await setup()
    catalogs.setIncludeEstimates('weapons:melee', false)
    catalogs.toggleFilter('weapons:melee', 'class', 'Daggers')
    expect(catalogs.hidden('weapons:melee')).toBe(0)
    catalogs.toggleFilter('weapons:melee', 'class', 'Greatswords')
    expect(catalogs.hidden('weapons:melee')).toBe(1)
  })

  it('un catalogue sans estimations n’a pas l’option', async () => {
    const { catalogs } = await setup()
    expect(catalogs.estimates('bosses')).toBeNull()
    expect(catalogs.hidden('bosses')).toBe(0)
    catalogs.setIncludeEstimates('bosses', false)
    expect(catalogs.matches('bosses')).toBe(7)
  })
})

describe('« Prérequis atteints »', () => {
  it('applique les prérequis aux attributs du profil et suit leurs changements', async () => {
    const { catalogs, criteria } = await setup()
    catalogs.toggleFilter('weapons:melee', 'requirements', 'yes')
    expect(names(catalogs, 'weapons:melee')).toEqual(['Club', 'Dagger', 'Longsword'])
    criteria.setAttribute('dex', 15)
    criteria.setAttribute('str', 12)
    expect(new Set(names(catalogs, 'weapons:melee'))).toEqual(new Set(['Club', 'Dagger', 'Idus Sword', 'Longsword', 'Reverse-Bladed Sword', "Scorpion's Stinger"]))
    expect(option(catalogs.facets('weapons:melee'), 'requirements', 'yes').count).toBe(6)
  })

  it('tient compte de la posture : le bonus de Force à deux mains', async () => {
    const { catalogs, criteria } = await setup()
    criteria.setAttribute('str', 7)
    catalogs.toggleFilter('weapons:melee', 'requirements', 'yes')
    expect(names(catalogs, 'weapons:melee')).not.toContain('Longsword')
    criteria.set({ style: { hands: 2 } })
    expect(names(catalogs, 'weapons:melee')).toContain('Longsword')
  })

  it('s’applique aussi aux armes à distance', async () => {
    const { catalogs, criteria } = await setup()
    catalogs.toggleFilter('weapons:distance', 'requirements', 'yes')
    expect(catalogs.matches('weapons:distance')).toBe(0)
    criteria.setAttribute('int', 18)
    criteria.setAttribute('str', 10)
    expect(names(catalogs, 'weapons:distance')).toEqual(['Meteorite Staff'])
  })
})

describe('suggestions d’élargissement', () => {
  it('chiffre le résultat de chaque filtre retiré, du plus fructueux au moins fructueux', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('weapons:melee', 'class', 'Katanas')
    catalogs.toggleFilter('weapons:melee', 'class', 'Daggers')
    catalogs.toggleFilter('weapons:melee', 'requirements', 'yes')
    catalogs.toggleFilter('weapons:melee', 'region', 'Zzz')
    expect(catalogs.matches('weapons:melee')).toBe(0)
    const s = catalogs.suggestions('weapons:melee')
    expect(s.length).toBeGreaterThan(0)
    expect(s[0]).toMatchObject({ kind: 'filter', chip: { filter: { facet: 'region', value: 'Zzz' }, facetLabel: 'Région', valueLabel: 'Zzz' } })
    const counts = s.map((x) => x.count)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(counts.every((c) => c > 0)).toBe(true)
  })

  it('propose de vider la recherche et de réinclure les estimations', async () => {
    const { catalogs } = await setup()
    catalogs.toggleFilter('weapons:melee', 'class', 'Backhand Blades')
    catalogs.setIncludeEstimates('weapons:melee', false)
    expect(catalogs.matches('weapons:melee')).toBe(0)
    expect(catalogs.suggestions('weapons:melee')).toContainEqual({ kind: 'estimates', count: 1 })
    catalogs.setIncludeEstimates('weapons:melee', true)
    catalogs.setSearch('weapons:melee', 'zzz')
    catalogs.toggleFilter('weapons:melee', 'class', 'Backhand Blades')
    expect(catalogs.suggestions('weapons:melee')).toContainEqual({ kind: 'search', count: 10 })
    catalogs.reset('weapons:melee')
    expect(catalogs.suggestions('weapons:melee')).toEqual([])
  })
})

describe('autres catalogues', () => {
  it('origines : source seule, sans facette de catégorie, tri par niveau', async () => {
    const { catalogs } = await setup()
    expect(catalogs.facets('origins').map((f) => f.id)).toEqual(['content'])
    expect(catalogs.total('origins')).toBe(12)
    catalogs.sortBy('origins', 'level')
    const levels = catalogs.rows('origins').map((r) => (r as unknown as { level: number }).level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('un catalogue dont le fichier n’est pas chargé est vide sans erreur', async () => {
    const { catalogs } = await setup()
    expect(catalogs.total('armors')).toBe(0)
    expect(catalogs.page('armors')).toMatchObject({ total: 0, items: [] })
    expect(catalogs.facets('armors').map((f) => f.id)).toEqual(['slot', 'weight', 'poise', 'absorption'])
  })
})
