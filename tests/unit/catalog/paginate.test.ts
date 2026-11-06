// Tests de la pagination par pages de 50 : bornes, dernière page partielle, repères « 51–100 sur 704 », numéros hors bornes, liste vide, « Tout afficher ».

import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, paginate } from '../../../src/catalog/paginate.ts'

const list = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('paginate', () => {
  it('pages de 50', () => {
    expect(PAGE_SIZE).toBe(50)
  })

  it('première page', () => {
    const p = paginate(list(704), 1)
    expect(p.items).toHaveLength(50)
    expect(p.items[0]).toBe(1)
    expect(p.items.at(-1)).toBe(50)
    expect(p).toMatchObject({ page: 1, pageCount: 15, total: 704, pageSize: 50, from: 1, to: 50 })
  })

  it('page du milieu', () => {
    const p = paginate(list(704), 2)
    expect(p).toMatchObject({ page: 2, from: 51, to: 100 })
    expect(p.items[0]).toBe(51)
  })

  it('dernière page partielle', () => {
    const p = paginate(list(704), 15)
    expect(p.items).toEqual([701, 702, 703, 704])
    expect(p).toMatchObject({ page: 15, pageCount: 15, from: 701, to: 704 })
  })

  it('exactement un multiple de 50', () => {
    const p = paginate(list(100), 2)
    expect(p).toMatchObject({ pageCount: 2, from: 51, to: 100 })
    expect(p.items).toHaveLength(50)
    expect(paginate(list(50), 1).pageCount).toBe(1)
    expect(paginate(list(51), 1).pageCount).toBe(2)
  })

  it('ramène un numéro hors bornes ou invalide dans les bornes', () => {
    expect(paginate(list(120), 99).page).toBe(3)
    expect(paginate(list(120), 0).page).toBe(1)
    expect(paginate(list(120), -4).page).toBe(1)
    expect(paginate(list(120), Number.NaN).page).toBe(1)
    expect(paginate(list(120), 2.9).page).toBe(2)
    expect(paginate(list(120), Number.POSITIVE_INFINITY).page).toBe(1)
  })

  it('liste vide : une page, aucun repère', () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, pageSize: 50, from: 0, to: 0 })
    expect(paginate([], 7).page).toBe(1)
  })

  it('après un filtre qui réduit la liste, une page trop haute revient à la dernière', () => {
    const p = paginate(list(60), 9)
    expect(p).toMatchObject({ page: 2, from: 51, to: 60 })
  })

  it('« Tout afficher » : une page unique', () => {
    const p = paginate(list(704), 3, Infinity)
    expect(p.items).toHaveLength(704)
    expect(p).toMatchObject({ page: 1, pageCount: 1, from: 1, to: 704 })
  })

  it('autre taille de page ; une taille invalide revient à 50', () => {
    expect(paginate(list(25), 2, 10)).toMatchObject({ pageCount: 3, from: 11, to: 20 })
    expect(paginate(list(120), 1, 0).pageSize).toBe(50)
    expect(paginate(list(120), 1, -5).pageSize).toBe(50)
  })

  it('ne modifie pas la liste d’entrée', () => {
    const rows = list(60)
    const p = paginate(rows, 1)
    expect(rows).toHaveLength(60)
    expect(p.items).not.toBe(rows)
  })
})
