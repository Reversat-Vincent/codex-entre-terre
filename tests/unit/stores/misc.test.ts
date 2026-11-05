// Tests des stores à règle simple : recherches récentes, disposition, préférences, notifications.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_COLLAPSED_MOBILE, WIDGET_IDS } from '../../../src/widgets/ids.ts'
import { defaultLayout, useLayoutStore } from '../../../src/stores/layout.ts'
import { usePreferencesStore } from '../../../src/stores/preferences.ts'
import { useSearchStore } from '../../../src/stores/search.ts'
import { useToastsStore } from '../../../src/stores/toasts.ts'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.useRealTimers()
})

describe('search', () => {
  it('garde 8 recherches récentes, la plus récente en tête, sans doublon à la casse et aux accents près', () => {
    const s = useSearchStore()
    for (let i = 1; i <= 10; i++) s.commit(`recherche ${i}`)
    expect(s.recent).toHaveLength(8)
    expect(s.recent[0]).toBe('recherche 10')
    s.commit('RECHERCHE 5')
    expect(s.recent[0]).toBe('RECHERCHE 5')
    expect(s.recent.filter((r) => r.toLowerCase() === 'recherche 5')).toHaveLength(1)
    s.commit('Jolán')
    s.commit('jolan')
    expect(s.recent.filter((r) => r.toLowerCase().startsWith('jol'))).toEqual(['jolan'])
  })

  it('ignore une saisie trop courte et borne la longueur', () => {
    const s = useSearchStore()
    s.commit(' a ')
    s.commit('x'.repeat(500))
    expect(s.recent).toHaveLength(1)
    expect(s.recent[0]).toHaveLength(200)
  })

  it('close vide la requête ; hydrate borne à 8', () => {
    const s = useSearchStore()
    s.openPalette()
    s.query = 'moon'
    s.close()
    expect(s.open).toBe(false)
    expect(s.query).toBe('')
    s.hydrate(Array.from({ length: 12 }, (_, i) => `r${i}`))
    expect(s.recent).toHaveLength(8)
  })
})

describe('layout', () => {
  it('ordre par défaut : les huit widgets, attribute-yield compris', () => {
    const l = useLayoutStore()
    expect(l.order).toEqual([...WIDGET_IDS])
    expect(l.order).toContain('attribute-yield')
    expect(l.collapsedMobile).toEqual([...DEFAULT_COLLAPSED_MOBILE])
  })

  it('move, remove, add, toggleCollapse', () => {
    const l = useLayoutStore()
    l.move('boss-order', 0)
    expect(l.order[0]).toBe('boss-order')
    l.move('boss-order', 99)
    expect(l.order.at(-1)).toBe('boss-order')
    l.remove('optimal-origin')
    expect(l.order).not.toContain('optimal-origin')
    expect(l.hidden).toEqual(['optimal-origin'])
    l.add('optimal-origin')
    expect(l.order.at(-1)).toBe('optimal-origin')
    expect(l.hidden).toEqual([])
    l.toggleCollapse('boss-order', false)
    expect(l.isCollapsed('boss-order', false)).toBe(true)
    expect(l.isCollapsed('boss-order', true)).toBe(false)
    l.toggleCollapse('boss-order', false)
    expect(l.isCollapsed('boss-order', false)).toBe(false)
  })

  it('reset restaure la disposition par défaut, Annuler la rend', () => {
    const l = useLayoutStore()
    l.remove('data-coverage')
    l.move('boss-order', 0)
    l.reset()
    expect(l.snapshot()).toEqual(defaultLayout())
    const toasts = useToastsStore()
    toasts.runAction(toasts.items.at(-1)!.id)
    expect(l.hidden).toEqual(['data-coverage'])
    expect(l.order[0]).toBe('boss-order')
  })

  it('hydrate ajoute à la fin un widget absent du document', () => {
    const l = useLayoutStore()
    l.hydrate({ order: ['boss-order'], hidden: ['data-coverage'], collapsed: [], collapsedMobile: [] })
    expect(l.order).toEqual(['boss-order', ...WIDGET_IDS.filter((w) => w !== 'boss-order' && w !== 'data-coverage')])
    expect(l.hidden).toEqual(['data-coverage'])
  })
})

describe('preferences', () => {
  it('toggleTheme bascule entre sombre et parchemin et snapshot suit', () => {
    const p = usePreferencesStore()
    expect(p.theme).toBe('sombre')
    p.toggleTheme()
    expect(p.snapshot().theme).toBe('parchemin')
    p.toggleTheme()
    expect(p.theme).toBe('sombre')
  })

  it('catalogColumns : copie défensive et clé __proto__ refusée', () => {
    const p = usePreferencesStore()
    const cols = ['name', 'weight']
    p.setCatalogColumns('weapons', cols)
    cols.push('x')
    expect(p.snapshot().catalogColumns.weapons).toEqual(['name', 'weight'])
    p.setCatalogColumns('__proto__', ['polluted'])
    expect(Object.keys(p.catalogColumns)).toEqual(['weapons'])
  })

  it('catalogView : mémorisé par catalogue, tableau par défaut (D32)', () => {
    const p = usePreferencesStore()
    expect(p.viewOf('weapons')).toBe('table')
    p.setCatalogView('weapons', 'grid')
    expect(p.viewOf('weapons')).toBe('grid')
    expect(p.viewOf('armors')).toBe('table')
    expect(p.viewOf('toString')).toBe('table')
    p.setCatalogView('__proto__', 'grid')
    expect(p.snapshot().catalogView).toEqual({ weapons: 'grid' })
    p.hydrate({ ...p.snapshot(), catalogView: { spells: 'grid' } })
    expect(p.viewOf('weapons')).toBe('table')
    expect(p.viewOf('spells')).toBe('grid')
  })
})

describe('toasts', () => {
  it('disparaît seul après sa durée, limite à 4 notifications', () => {
    const t = useToastsStore()
    t.push({ message: 'un' })
    vi.advanceTimersByTime(3999)
    expect(t.items).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(t.items).toHaveLength(0)
    for (let i = 0; i < 6; i++) t.push({ message: `m${i}` })
    expect(t.items.map((x) => x.message)).toEqual(['m2', 'm3', 'm4', 'm5'])
  })

  it('l’action est exécutée une fois puis la notification se ferme', () => {
    const t = useToastsStore()
    const run = vi.fn()
    const id = t.push({ message: 'x', action: { label: 'Annuler', run } })
    t.runAction(id)
    t.runAction(id)
    expect(run).toHaveBeenCalledTimes(1)
    expect(t.items).toHaveLength(0)
  })
})
