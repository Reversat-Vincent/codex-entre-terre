// Tests du modèle de navigation et de la palette : entrées actives, onglets mobiles, filtres, sections, « Voir les N », saisie vide, aucun résultat.

import { describe, expect, it } from 'vitest'
import {
  buildEmptySections,
  buildFilterChips,
  buildIdleSections,
  buildResultSections,
  flattenRows,
} from '../../../src/components/ds/commandPaletteModel.ts'
import { NAV_EXPLORE, NAV_TOOLS, TAB_ENTRIES, isEntryActive } from '../../../src/components/shell/navModel.ts'
import { searchActions } from '../../../src/search/actions.ts'
import { search } from '../../../src/search/search.ts'
import { realIndex } from '../search/helpers.ts'

const index = realIndex()
const noActions = { total: 0, hits: [] }

describe('navModel', () => {
  it('allume le tableau de bord seulement sur « / » et les catalogues sur leurs fiches', () => {
    expect(isEntryActive('/', '/')).toBe(true)
    expect(isEntryActive('/', '/armes')).toBe(false)
    expect(isEntryActive('/armes', '/armes/moonveil')).toBe(true)
    expect(isEntryActive('/armes', '/armures')).toBe(false)
  })

  it('propose les cinq onglets mobiles de l’architecture et des chemins uniques', () => {
    expect(TAB_ENTRIES.map((t) => t.label)).toEqual(['Accueil', 'Explorer', 'Ma liste', 'Mécaniques', 'Profil'])
    const paths = [...NAV_EXPLORE, ...NAV_TOOLS].map((e) => e.to)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('commandPaletteModel', () => {
  it('construit les puces de filtre : Tout, seulement les types qui ont des résultats, Actions en dernier', () => {
    const response = search(index, 'moon')
    const chips = buildFilterChips(response, searchActions('moon'))
    expect(chips[0]).toMatchObject({ id: 'all', label: 'Tout' })
    expect(chips.slice(1).map((c) => c.id)).toEqual(response.groups.map((g) => g.group))
    expect(buildFilterChips(search(index, 'zzzzqqqq'), noActions)).toEqual([])
  })

  it('surligne le nom, ajoute « Voir les N » quand un groupe dépasse 4 et cible la page de résultats', () => {
    const response = search(index, 'a')
    const sections = buildResultSections(response, noActions, 'a', 'all')
    const crowded = response.groups.find((g) => g.total > g.hits.length)
    expect(crowded).toBeDefined()
    const section = sections.find((s) => s.id === `g-${crowded?.group}`)
    const last = section?.rows[section.rows.length - 1]
    expect(last?.parts[0]?.text).toMatch(/^Voir les /)
    expect(last?.target).toEqual({ type: 'route', to: { name: 'search', query: { q: 'a', groupe: crowded?.group } } })
    expect(section?.rows[0]?.parts.some((p) => p.match)).toBe(true)
  })

  it('cible la fiche de l’entité pour un résultat', () => {
    const response = search(index, 'moonveil')
    const rows = flattenRows(buildResultSections(response, noActions, 'moonveil', 'all'))
    expect(rows[0]?.target).toEqual({ type: 'route', to: { name: 'weapon', params: { id: 'moonveil' } } })
    expect(rows[0]?.remember).toBe(true)
  })

  it('filtre sur les actions seules', () => {
    const sections = buildResultSections(search(index, 'arm'), searchActions('arm'), 'arm', 'action')
    expect(sections.map((s) => s.id)).toEqual(['g-actions'])
  })

  it('propose récentes, éléments de Ma liste et actions pour une saisie vide', () => {
    const sections = buildIdleSections(['moon'], [{ ref: 'weapon:moonveil', doc: null }], searchActions(''))
    expect(sections.map((s) => s.id)).toEqual(['g-recent', 'g-pinned', 'g-actions'])
    expect(sections[0]?.rows[0]?.target).toEqual({ type: 'query', query: 'moon' })
    expect(sections[1]?.rows[0]?.parts[0]?.text).toBe('moonveil')
  })

  it('suggère l’équivalent anglais et le lien du wiki quand rien ne correspond', () => {
    const response = search(index, 'lune')
    expect(response.total).toBe(0)
    const sections = buildEmptySections(response, 'lune', (q) => `https://exemple.invalid/?search=${encodeURIComponent(q)}`)
    expect(sections.find((s) => s.id === 'g-suggestions')?.rows[0]?.target).toEqual({ type: 'query', query: 'moon' })
    expect(sections.find((s) => s.id === 'g-wiki')?.rows[0]?.target).toEqual({ type: 'external', href: 'https://exemple.invalid/?search=lune' })
    expect(buildEmptySections(response, 'lune').some((s) => s.id === 'g-wiki')).toBe(false)
  })
})
