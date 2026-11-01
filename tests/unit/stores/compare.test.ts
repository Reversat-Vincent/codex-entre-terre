// Tests du comparateur : 2 à 4 éléments du même genre, refus motivés, lecture de l'adresse `?e=`.
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { kindOfRef, useCompareStore } from '../../../src/stores/compare.ts'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('add', () => {
  it('accepte jusqu’à 4 éléments du même genre', () => {
    const c = useCompareStore()
    for (const id of ['a', 'b', 'c', 'd'] as const) expect(c.add(`weapon:${id}`)).toEqual({ ok: true })
    expect(c.items).toHaveLength(4)
    expect(c.kind).toBe('weapon')
  })

  it('refuse le cinquième avec un motif', () => {
    const c = useCompareStore()
    for (const id of ['a', 'b', 'c', 'd'] as const) c.add(`weapon:${id}`)
    const r = c.add('weapon:e')
    expect(r).toMatchObject({ ok: false, reason: 'full' })
    expect(r.ok === false && r.message).toContain('4')
    expect(c.items).toHaveLength(4)
  })

  it('refuse un autre genre', () => {
    const c = useCompareStore()
    c.add('weapon:a')
    const r = c.add('boss:margit-the-fell-omen')
    expect(r).toMatchObject({ ok: false, reason: 'kind-mismatch' })
    expect(c.items).toEqual(['weapon:a'])
  })

  it('refuse un doublon et une référence mal formée', () => {
    const c = useCompareStore()
    c.add('weapon:a')
    expect(c.add('weapon:a')).toMatchObject({ ok: false, reason: 'duplicate' })
    expect(c.add('gadget:x' as never)).toMatchObject({ ok: false, reason: 'invalid' })
    expect(c.add('weapon:' as never)).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('autorise un autre genre une fois vidé', () => {
    const c = useCompareStore()
    c.add('weapon:a')
    c.clear()
    expect(c.kind).toBeNull()
    expect(c.add('boss:x')).toEqual({ ok: true })
  })
})

describe('canCompare, remove, toggle', () => {
  it('le comparateur s’ouvre à partir de 2 éléments', () => {
    const c = useCompareStore()
    c.add('weapon:a')
    expect(c.canCompare).toBe(false)
    c.add('weapon:b')
    expect(c.canCompare).toBe(true)
    c.remove('weapon:a')
    expect(c.canCompare).toBe(false)
  })

  it('toggle ajoute ou retire', () => {
    const c = useCompareStore()
    c.toggle('weapon:a')
    expect(c.has('weapon:a')).toBe(true)
    c.toggle('weapon:a')
    expect(c.has('weapon:a')).toBe(false)
  })
})

describe('replace (adresse ?e=)', () => {
  it('garde les références valides du genre du premier, sans doublon, 4 au plus', () => {
    const c = useCompareStore()
    c.replace(['weapon:a', 'weapon:a', 'boss:x', 'bidon', 'weapon:b', 'weapon:c', 'weapon:d', 'weapon:e'])
    expect(c.items).toEqual(['weapon:a', 'weapon:b', 'weapon:c', 'weapon:d'])
  })

  it('une liste vide vide le comparateur', () => {
    const c = useCompareStore()
    c.add('weapon:a')
    c.replace([])
    expect(c.items).toEqual([])
  })
})

describe('kindOfRef', () => {
  it('lit le genre ou renvoie null', () => {
    expect(kindOfRef('spirit:mimic-tear')).toBe('spirit')
    expect(kindOfRef('spirit')).toBeNull()
    expect(kindOfRef(':x')).toBeNull()
    expect(kindOfRef('toString:x')).toBeNull()
  })
})
