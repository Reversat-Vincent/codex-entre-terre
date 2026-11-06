// Tests des modèles des écrans Explorer et Recherche : filtre lu dans l'adresse, pagination à 100, titres de section, compteurs du manifeste.

import { describe, expect, it } from 'vitest'
import { EXPLORE_GROUPS, entryCount, groupCount } from '../../../src/components/domain/explore/exploreModel.ts'
import { PAGE_SIZE, buildResultsPage, effectiveFilter, parseFilter } from '../../../src/components/domain/search/searchPageModel.ts'
import { buildFilterChips } from '../../../src/components/ds/commandPaletteModel.ts'
import type { DataManifest } from '../../../src/data/types/manifest.ts'
import { searchActions } from '../../../src/search/actions.ts'
import { search } from '../../../src/search/search.ts'
import { doc, realIndex } from '../search/helpers.ts'

const NO_ACTIONS = { total: 0, hits: [] }

describe('parseFilter', () => {
  it('accepte un groupe, « action », et retombe sur « all » sinon', () => {
    expect(parseFilter('boss')).toBe('boss')
    expect(parseFilter(['npc', 'boss'])).toBe('npc')
    expect(parseFilter('action')).toBe('action')
    expect(parseFilter('inconnu')).toBe('all')
    expect(parseFilter(undefined)).toBe('all')
  })

  it('ignore un filtre sans résultat', () => {
    const response = search(realIndex(), 'jolan', { perGroup: Infinity })
    const chips = buildFilterChips(response, NO_ACTIONS)
    expect(effectiveFilter('npc', chips)).toBe('npc')
    expect(effectiveFilter('weapon', chips)).toBe('all')
  })
})

describe('buildResultsPage', () => {
  const docs = Array.from({ length: 230 }, (_, i) => doc(`Sword ${String(i).padStart(3, '0')}`, 'item'))
  const response = search(docs, 'sword', { perGroup: Infinity })

  it('découpe en pages de 100 et garde le total du groupe sur le titre', () => {
    const p1 = buildResultsPage(response, NO_ACTIONS, 'sword', 'all', 1)
    expect(p1.pageCount).toBe(3)
    expect(p1.sections).toHaveLength(1)
    expect(p1.sections[0]?.rows).toHaveLength(PAGE_SIZE)
    expect(p1.sections[0]?.count).toBe(230)
    expect([p1.first, p1.last, p1.total]).toEqual([1, 100, 230])
    const p3 = buildResultsPage(response, NO_ACTIONS, 'sword', 'all', 3)
    expect(p3.sections[0]?.rows).toHaveLength(30)
    expect([p3.first, p3.last]).toEqual([201, 230])
  })

  it('ramène la page dans les bornes et ne produit aucune ligne « Voir les N »', () => {
    const page = buildResultsPage(response, NO_ACTIONS, 'sword', 'all', 99)
    expect(page.page).toBe(3)
    expect(page.sections.flatMap((s) => s.rows).some((r) => r.key.startsWith('more:'))).toBe(false)
  })

  it('un filtre de groupe ne montre que ce groupe, sans les actions', () => {
    const mixed = search([...docs.slice(0, 3), doc('Sword Boss', 'boss')], 'sword', { perGroup: Infinity })
    const page = buildResultsPage(mixed, searchActions('sword', Infinity), 'sword', 'boss', 1)
    expect(page.sections.map((s) => s.id)).toEqual(['g-boss'])
  })
})

describe('Explorer', () => {
  const manifest = { files: { melee_armaments: { entries: 10 }, ranged_weapons_catalysts: { entries: 5 }, shields_torches: { entries: 2 } } } as unknown as DataManifest

  it('lit les compteurs du manifeste, et rien tant qu’il manque', () => {
    expect(entryCount(manifest, 'melee_armaments')).toBe(10)
    expect(entryCount(null, 'melee_armaments')).toBeNull()
    const weapons = EXPLORE_GROUPS[0]
    expect(weapons && groupCount(manifest, weapons)).toBe(17)
    expect(weapons && groupCount(null, weapons)).toBeNull()
  })

  it('couvre les 17 catalogues des quatre groupes', () => {
    expect(EXPLORE_GROUPS.map((g) => g.entries.length)).toEqual([3, 5, 5, 4])
  })
})
