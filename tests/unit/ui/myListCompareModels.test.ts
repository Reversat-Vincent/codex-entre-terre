// Tests des modèles de « Ma liste » (filtre, déplacement parmi les éléments visibles, où l'obtenir) et du Comparateur (lignes par genre, sens des lignes).
import { describe, expect, it } from 'vitest'
import { catalogOfKind, compareRows } from '../../../src/components/domain/compare/compareModel.ts'
import { countPins, filterPins, moveTarget, whereToGet, WHERE_LIMIT } from '../../../src/components/domain/mylist/myListModel.ts'
import type { PinRecord } from '../../../src/persistence/model.ts'

const pin = (ref: string, done = false): PinRecord => ({ ref: ref as PinRecord['ref'], addedAt: '2026-01-01T00:00:00.000Z', done })
const items = [pin('weapon:a'), pin('weapon:b', true), pin('armor:c'), pin('talisman:d', true), pin('spell:e')]

describe('filterPins et countPins', () => {
  it('sépare à récupérer et récupérés sans changer l’ordre', () => {
    expect(filterPins(items, 'todo').map((p) => p.ref)).toEqual(['weapon:a', 'armor:c', 'spell:e'])
    expect(filterPins(items, 'done').map((p) => p.ref)).toEqual(['weapon:b', 'talisman:d'])
    expect(filterPins(items, 'all')).toHaveLength(5)
  })
  it('compte chaque filtre', () => {
    expect(countPins(items)).toEqual({ todo: 3, done: 2, all: 5 })
  })
})

describe('moveTarget', () => {
  it('déplace dans la liste complète quand tout est visible', () => {
    expect(moveTarget(items, items, 'armor:c', -1)).toEqual({ from: 2, to: 1 })
    expect(moveTarget(items, items, 'armor:c', 1)).toEqual({ from: 2, to: 3 })
  })
  it('passe devant le voisin visible, par-dessus les éléments masqués', () => {
    const visible = filterPins(items, 'todo')
    expect(moveTarget(items, visible, 'armor:c', -1)).toEqual({ from: 2, to: 0 })
    expect(moveTarget(items, visible, 'armor:c', 1)).toEqual({ from: 2, to: 4 })
  })
  it('refuse au bout de la liste visible et pour une référence inconnue', () => {
    const visible = filterPins(items, 'todo')
    expect(moveTarget(items, visible, 'weapon:a', -1)).toBeNull()
    expect(moveTarget(items, visible, 'spell:e', 1)).toBeNull()
    expect(moveTarget(items, visible, 'weapon:zzz', 1)).toBeNull()
  })
})

describe('whereToGet', () => {
  it('lit méthode, lieu et région d’une acquisition, avec la région déduite à défaut', () => {
    const entry = {
      acquisition: [
        { method: 'Purchase', location: 'Roundtable Hold', region: null },
        { method: 'Drop', location: null, region: 'Limgrave' },
      ],
      derived: { regions: { acquisitions: [{ index: 0, starting: false, values: [{ value: 'Roundtable Hold' }] }] } },
    }
    expect(whereToGet(entry).rows).toEqual([
      { method: 'Purchase', location: 'Roundtable Hold', region: 'Roundtable Hold' },
      { method: 'Drop', location: null, region: 'Limgrave' },
    ])
  })
  it('ignore la région déduite d’un équipement de départ', () => {
    const entry = {
      acquisition: [{ method: 'Starting equipment', location: 'Vagabond', region: null }],
      derived: { regions: { acquisitions: [{ index: 0, starting: true, values: [{ value: 'Chapel of Anticipation' }] }] } },
    }
    expect(whereToGet(entry).rows[0]?.region).toBeNull()
  })
  it('limite les lignes, retire les doublons et compte les lignes omises', () => {
    const acquisition = Array.from({ length: 6 }, (_, i) => ({ method: 'Loot', location: `Lieu ${i % 5}`, region: null }))
    const result = whereToGet({ acquisition, derived: { regions: { acquisitions: [] } } })
    expect(result.rows).toHaveLength(WHERE_LIMIT)
    expect(result.more).toBe(2)
  })
  it('lit les rencontres d’un boss et la région d’un lieu ; rien sinon', () => {
    expect(whereToGet({ encounters: [{ location: 'Stormveil Castle', regions: ['Limgrave'] }] }).rows).toEqual([
      { method: null, location: 'Stormveil Castle', region: 'Limgrave' },
    ])
    expect(whereToGet({ region: 'Liurnia' }).rows).toEqual([{ method: null, location: null, region: 'Liurnia' }])
    expect(whereToGet({ name: 'Origine' })).toEqual({ rows: [], more: 0 })
  })
})

describe('compareRows', () => {
  it('ne propose pas de lignes pour les mécaniques', () => {
    expect(catalogOfKind('mechanic')).toBeNull()
    expect(compareRows('mechanic')).toEqual([])
  })
  it('donne le sens des lignes d’une arme : attaque plus haut, poids et prérequis plus bas', () => {
    const rows = Object.fromEntries(compareRows('weapon', { withScore: true }).map((r) => [r.id, r.better]))
    expect(rows).toMatchObject({ attack: 'higher', weight: 'lower', requirements: 'lower', score: 'higher', scaling: 'none', upgrade: 'none' })
  })
  it('n’ajoute la ligne de score que si un score existe', () => {
    expect(compareRows('weapon').some((r) => r.id === 'score')).toBe(false)
  })
  it('groupe les absorptions et les résistances d’une armure', () => {
    const rows = compareRows('armor')
    expect(rows.filter((r) => r.group === 'Absorption')).toHaveLength(8)
    expect(rows.filter((r) => r.group === 'Résistances')).toHaveLength(4)
    expect(rows.find((r) => r.id === 'weight')?.better).toBe('lower')
    expect(rows.find((r) => r.id === 'poise')?.better).toBe('higher')
    expect(rows.find((r) => r.id === 'physical')?.better).toBe('higher')
  })
  it('reprend les champs principaux des autres genres, sans le nom', () => {
    const spells = compareRows('spell')
    expect(spells.some((r) => r.id === 'name')).toBe(false)
    expect(spells.find((r) => r.id === 'fp')?.better).toBe('lower')
    expect(compareRows('boss').length).toBeGreaterThan(0)
  })
})
