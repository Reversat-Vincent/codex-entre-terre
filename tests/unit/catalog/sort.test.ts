// Tests du tri multicolonne : `null` toujours en dernier, tri secondaire, stabilité, ordre naturel, clic et Maj + clic.
// Les lignes viennent des armes des fixtures (poids, attaque physique) et de lignes écrites à la main pour les cas limites.

import { describe, expect, it } from 'vitest'
import { sortRank, sortRows, toggleSort } from '../../../src/catalog/sort.ts'
import type { SortAccessors, SortKey } from '../../../src/catalog/sort.ts'
import { weapons } from './helpers.ts'

interface Row {
  readonly name: string
  readonly weight: number | null
  readonly cls?: string | null
}

const accessors: SortAccessors<Row> = {
  name: (r) => r.name,
  weight: (r) => r.weight,
  cls: (r) => r.cls,
}

const asc = (column: string): SortKey => ({ column, direction: 'asc' })
const desc = (column: string): SortKey => ({ column, direction: 'desc' })
const order = (rows: readonly Row[]) => rows.map((r) => r.name)

const rows: Row[] = [
  { name: 'b', weight: 2 },
  { name: 'a', weight: null },
  { name: 'c', weight: 0 },
  { name: 'd', weight: 2 },
  { name: 'e', weight: null },
  { name: 'f', weight: 10 },
]

describe('sortRows : null toujours en dernier', () => {
  it('croissant', () => {
    expect(order(sortRows(rows, [asc('weight')], accessors))).toEqual(['c', 'b', 'd', 'f', 'a', 'e'])
  })

  it('décroissant : les null restent en dernier', () => {
    expect(order(sortRows(rows, [desc('weight')], accessors))).toEqual(['f', 'b', 'd', 'c', 'a', 'e'])
  })

  it('un null n’est jamais traité comme 0', () => {
    const sorted = sortRows(rows, [asc('weight')], accessors)
    expect(sorted[0]?.name).toBe('c')
    expect(sortRows(rows, [desc('weight')], accessors).at(-1)?.weight).toBeNull()
  })

  it('undefined et NaN comptent comme absents', () => {
    const r: Row[] = [
      { name: 'x', weight: Number.NaN },
      { name: 'y', weight: 1, cls: undefined },
      { name: 'z', weight: 3 },
    ]
    expect(order(sortRows(r, [desc('weight')], accessors))).toEqual(['z', 'y', 'x'])
    expect(order(sortRows(r, [asc('cls')], accessors))).toEqual(['x', 'y', 'z'])
  })

  it('avec les armes des fixtures : poids et attaque, sens inversé', () => {
    const w = weapons()
    const acc: SortAccessors<(typeof w)[number]> = { weight: (e) => e.weight, name: (e) => e.name }
    const up = sortRows(w, [asc('weight')], acc).map((e) => e.weight)
    expect(up).toEqual([...up].sort((a, b) => a - b))
    const down = sortRows(w, [desc('weight')], acc).map((e) => e.weight)
    expect(down).toEqual([...up].reverse())
  })
})

describe('sortRows : tri secondaire et stabilité', () => {
  it('départage les ex æquo par le tri secondaire, dans son sens', () => {
    expect(order(sortRows(rows, [asc('weight'), desc('name')], accessors))).toEqual(['c', 'd', 'b', 'f', 'e', 'a'])
    expect(order(sortRows(rows, [desc('weight'), asc('name')], accessors))).toEqual(['f', 'b', 'd', 'c', 'a', 'e'])
  })

  it('un null à égalité avec un null laisse la main au critère suivant', () => {
    const r: Row[] = [
      { name: 'q', weight: null, cls: 'B' },
      { name: 'p', weight: null, cls: 'A' },
      { name: 'o', weight: 1, cls: 'C' },
    ]
    expect(order(sortRows(r, [asc('weight'), asc('cls')], accessors))).toEqual(['o', 'p', 'q'])
    expect(order(sortRows(r, [desc('weight'), desc('cls')], accessors))).toEqual(['o', 'q', 'p'])
  })

  it('un null du critère secondaire passe après les valeurs', () => {
    const r: Row[] = [
      { name: 'n', weight: 5, cls: null },
      { name: 'm', weight: 5, cls: 'Z' },
    ]
    expect(order(sortRows(r, [asc('weight'), asc('cls')], accessors))).toEqual(['m', 'n'])
    expect(order(sortRows(r, [asc('weight'), desc('cls')], accessors))).toEqual(['m', 'n'])
  })

  it('est stable : l’ordre d’entrée est gardé à égalité complète', () => {
    expect(order(sortRows(rows, [asc('weight')], accessors)).filter((n) => n === 'b' || n === 'd')).toEqual(['b', 'd'])
    expect(order(sortRows(rows, [desc('weight')], accessors)).filter((n) => n === 'b' || n === 'd')).toEqual(['b', 'd'])
    expect(order(sortRows(rows, [desc('weight')], accessors)).filter((n) => n === 'a' || n === 'e')).toEqual(['a', 'e'])
  })

  it('ne modifie pas la liste d’entrée', () => {
    const copy = [...rows]
    sortRows(rows, [desc('weight')], accessors)
    expect(rows).toEqual(copy)
  })

  it('sans critère ou sur une colonne inconnue, garde l’ordre d’entrée', () => {
    expect(order(sortRows(rows, [], accessors))).toEqual(order(rows))
    expect(order(sortRows(rows, [asc('inconnue')], accessors))).toEqual(order(rows))
    expect(order(sortRows(rows, [asc('inconnue'), asc('weight')], accessors))).toEqual(['c', 'b', 'd', 'f', 'a', 'e'])
  })
})

describe('sortRows : textes', () => {
  it('ordre alphabétique sans tenir compte de la casse, nombres en ordre naturel', () => {
    const r: Row[] = [
      { name: 'Smithing Stone [10]', weight: 1 },
      { name: 'smithing stone [2]', weight: 1 },
      { name: 'Axe', weight: 1 },
    ]
    expect(order(sortRows(r, [asc('name')], accessors))).toEqual(['Axe', 'smithing stone [2]', 'Smithing Stone [10]'])
    expect(order(sortRows(r, [desc('name')], accessors))).toEqual(['Smithing Stone [10]', 'smithing stone [2]', 'Axe'])
  })

  it('une chaîne vide est une valeur, pas une absence', () => {
    const r: Row[] = [
      { name: 'k', weight: 1, cls: null },
      { name: 'j', weight: 1, cls: '' },
      { name: 'i', weight: 1, cls: 'A' },
    ]
    expect(order(sortRows(r, [asc('cls')], accessors))).toEqual(['j', 'i', 'k'])
  })
})

describe('toggleSort : clic et Maj + clic', () => {
  it('clic : devient l’unique tri croissant, puis alterne', () => {
    const a = toggleSort([], 'name', false)
    expect(a).toEqual([asc('name')])
    const b = toggleSort(a, 'name', false)
    expect(b).toEqual([desc('name')])
    expect(toggleSort(b, 'name', false)).toEqual([asc('name')])
  })

  it('clic sur une autre colonne : remplace tout, y compris les tris secondaires', () => {
    expect(toggleSort([asc('name'), desc('weight')], 'cls', false)).toEqual([asc('cls')])
    expect(toggleSort([asc('name'), desc('weight')], 'name', false)).toEqual([asc('name')])
  })

  it('Maj + clic : ajoute un tri secondaire croissant, puis décroissant, puis le retire', () => {
    const base = [asc('name')]
    const a = toggleSort(base, 'weight', true)
    expect(a).toEqual([asc('name'), asc('weight')])
    const b = toggleSort(a, 'weight', true)
    expect(b).toEqual([asc('name'), desc('weight')])
    expect(toggleSort(b, 'weight', true)).toEqual([asc('name')])
    expect(base).toEqual([asc('name')])
  })

  it('Maj + clic sur le tri principal change son sens sans toucher aux autres', () => {
    expect(toggleSort([asc('name'), asc('weight')], 'name', true)).toEqual([desc('name'), asc('weight')])
  })

  it('numérote les tris : 1 pour le principal, null hors tri', () => {
    const keys = [asc('name'), desc('weight')]
    expect(sortRank(keys, 'name')).toBe(1)
    expect(sortRank(keys, 'weight')).toBe(2)
    expect(sortRank(keys, 'cls')).toBeNull()
  })
})
