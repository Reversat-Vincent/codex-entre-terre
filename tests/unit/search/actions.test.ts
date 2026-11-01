// Tests des actions de la palette : libellés cherchés sans accent ni casse, rangs, synonymes, saisie vide, intégrité de la liste.

import { describe, expect, it } from 'vitest'
import { normalizeText } from '../../../src/data/slug.ts'
import { ACTIONS, searchActions } from '../../../src/search/actions.ts'

const ids = (q: string, n = 4) => searchActions(q, n).hits.map((h) => h.action.id)

describe('ACTIONS', () => {
  it('a des identifiants et des libellés uniques, et des chemins de routeur valides', () => {
    expect(new Set(ACTIONS.map((a) => a.id)).size).toBe(ACTIONS.length)
    expect(new Set(ACTIONS.map((a) => normalizeText(a.label))).size).toBe(ACTIONS.length)
    const paths = ACTIONS.flatMap((a) => (a.effect.type === 'navigate' ? [a.effect.to] : []))
    expect(new Set(paths).size).toBe(paths.length)
    for (const p of paths) expect(p).toMatch(/^\/[a-z-]*$/)
  })

  it('couvre les écrans, les critères, le thème, l’export et l’import', () => {
    const types = new Set(ACTIONS.map((a) => a.effect.type))
    expect(types).toEqual(new Set(['navigate', 'open-criteria', 'toggle-theme', 'export-state', 'import-state']))
    expect(ACTIONS.find((a) => a.id === 'go-weapons')?.effect).toEqual({ type: 'navigate', to: '/armes' })
  })
})

describe('searchActions', () => {
  it('sans saisie, propose les premières actions dans l’ordre de la liste', () => {
    const r = searchActions('')
    expect(r.total).toBe(ACTIONS.length)
    expect(r.hits.map((h) => h.action.id)).toEqual(ACTIONS.slice(0, 4).map((a) => a.id))
  })

  it('cherche sans accent ni casse', () => {
    expect(ids('theme')[0]).toBe('toggle-theme')
    expect(ids('THÈME')[0]).toBe('toggle-theme')
    expect(ids('exporter')[0]).toBe('export-state')
    expect(ids('mécaniques')[0]).toBe('go-mechanics')
  })

  it('classe le début du libellé avant les débuts de mots, puis les sous-chaînes', () => {
    const r = searchActions('ex', 10)
    expect(r.hits[0]).toMatchObject({ rank: 0 })
    expect(r.hits[0]?.action.id).toBe('export-state')
    const armes = searchActions('arm', 10).hits
    expect(armes.map((h) => [h.action.id, h.rank])).toEqual([
      ['go-weapons', 1],
      ['go-armors', 1],
    ])
  })

  it('trouve une action par synonyme, au rang 3 et après les libellés', () => {
    const r = searchActions('sauvegarde', 10)
    expect(r.hits.map((h) => [h.action.id, h.rank])).toEqual([
      ['export-state', 3],
      ['import-state', 3],
    ])
    expect(searchActions('favoris').hits[0]?.action.id).toBe('go-my-list')
  })

  it('exige tous les mots et tronque en gardant le total', () => {
    expect(searchActions('aller armes').hits[0]?.action.id).toBe('go-weapons')
    expect(searchActions('aller zzzz').total).toBe(0)
    const all = searchActions('aller', 4)
    expect(all.hits).toHaveLength(4)
    expect(all.total).toBeGreaterThan(10)
  })

  it('ne trouve rien pour une saisie sans correspondance', () => {
    expect(searchActions('xyzzy')).toEqual({ total: 0, hits: [] })
  })
})
