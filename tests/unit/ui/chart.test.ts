// Tests de src/ui/chart.ts : graduations rondes, tracés interrompus par les null, étiquettes de bout de ligne espacées, abscisse la plus proche.
import { describe, expect, it } from 'vitest'
import { buildGeometry, nearestIndex, niceTicks, placeMarkers, spreadLabels, xTickIndices, type ChartLayout } from '../../../src/ui/chart.ts'

const LAYOUT: ChartLayout = { width: 600, height: 220, left: 44, right: 96, top: 14, bottom: 30 }

describe('niceTicks', () => {
  it('donne des graduations rondes qui couvrent l’intervalle', () => {
    const t = niceTicks(0, 246)
    expect(t.ticks).toEqual([0, 100, 200, 300])
    expect(t.min).toBe(0)
    expect(t.max).toBe(300)
  })
  it('gère de petites étendues sans erreur d’arrondi', () => {
    expect(niceTicks(0, 1).ticks).toEqual([0, 0.5, 1])
  })
  it('donne un intervalle non nul quand toutes les valeurs sont égales', () => {
    const t = niceTicks(5, 5)
    expect(t.max).toBeGreaterThan(t.min)
    expect(t.ticks.length).toBeGreaterThanOrEqual(2)
  })
})

describe('spreadLabels', () => {
  it('laisse en place des étiquettes déjà espacées', () => {
    expect(spreadLabels([10, 40, 80], 13, 0, 100)).toEqual([10, 40, 80])
  })
  it('écarte des étiquettes qui se chevauchent et garde l’ordre d’entrée', () => {
    const out = spreadLabels([50, 52, 51], 13, 0, 200)
    const sorted = [...out].sort((a, b) => a - b)
    expect(sorted[1]! - sorted[0]!).toBeGreaterThanOrEqual(13)
    expect(sorted[2]! - sorted[1]!).toBeGreaterThanOrEqual(13)
    expect(out[0]).toBeLessThan(out[2]!)
    expect(out[2]).toBeLessThan(out[1]!)
  })
  it('reste dans la zone quand les étiquettes touchent le bas', () => {
    const out = spreadLabels([98, 99, 100], 13, 0, 100)
    expect(Math.max(...out)).toBeLessThanOrEqual(100)
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0)
  })
})

describe('nearestIndex et xTickIndices', () => {
  it('retient l’abscisse la plus proche', () => {
    expect(nearestIndex(5, [0, 10, 20])).toBe(0)
    expect(nearestIndex(16, [0, 10, 20])).toBe(2)
    expect(nearestIndex(3, [])).toBe(-1)
  })
  it('limite le nombre de graduations en gardant la première et la dernière', () => {
    expect(xTickIndices(4)).toEqual([0, 1, 2, 3])
    const t = xTickIndices(26)
    expect(t[0]).toBe(0)
    expect(t[t.length - 1]).toBe(25)
    expect(t.length).toBeLessThanOrEqual(8)
  })
})

describe('buildGeometry', () => {
  const xs = [0, 1, 2, 3, 4]

  it('place les abscisses proportionnellement et ancre l’axe à zéro', () => {
    const g = buildGeometry(xs, [[100, 150, 200, 250, 300]], LAYOUT)
    expect(g.xs[0]).toBe(LAYOUT.left)
    expect(g.xs[4]).toBe(LAYOUT.width - LAYOUT.right)
    expect(g.yMin).toBe(0)
    expect(g.yAt(g.yMin)).toBe(g.plot.y1)
    expect(g.yAt(g.yMax)).toBeCloseTo(g.plot.y0)
  })

  it('interrompt la ligne à chaque null, sans jamais l’interpoler ni l’écrire 0', () => {
    const g = buildGeometry(xs, [[10, 20, null, 40, 50]], LAYOUT)
    expect(g.paths[0]).toHaveLength(2)
    expect(g.paths[0]![0]).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/)
  })

  it('trace un point isolé entre deux null', () => {
    const g = buildGeometry(xs, [[null, 20, null, null, null]], LAYOUT)
    expect(g.paths[0]).toHaveLength(1)
    expect(g.paths[0]![0]).toMatch(/ l0 0$/)
  })

  it('n’écrit aucune étiquette de bout de ligne pour une série sans valeur', () => {
    const g = buildGeometry(xs, [[1, 2, 3, 4, 5], [null, null, null, null, null]], LAYOUT)
    expect(g.endLabels.map((e) => e.seriesIndex)).toEqual([0])
  })

  it('espace les étiquettes de séries qui finissent à la même valeur', () => {
    const g = buildGeometry(xs, [[1, 2, 3, 4, 100], [1, 2, 3, 4, 100], [1, 2, 3, 4, 100]], LAYOUT)
    const ys = g.endLabels.map((e) => e.y).sort((a, b) => a - b)
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(13)
    expect(ys[2]! - ys[1]!).toBeGreaterThanOrEqual(13)
  })

  it('reste valide sans aucune donnée', () => {
    const g = buildGeometry([], [], LAYOUT)
    expect(g.paths).toEqual([])
    expect(g.yTicks.length).toBeGreaterThan(1)
  })
})

describe('xAt et repères', () => {
  const geometry = buildGeometry([0, 50, 100], [[1, 2, 3]], LAYOUT)
  const range = { first: 0, last: 100 }

  it('donne la position d’une abscisse, interpolée entre la première et la dernière', () => {
    expect(geometry.xAt(0)).toBe(geometry.plot.x0)
    expect(geometry.xAt(100)).toBe(geometry.plot.x1)
    expect(geometry.xAt(25)).toBeCloseTo((geometry.plot.x0 + geometry.xs[1]!) / 2)
  })
  it('place chaque repère sur sa colonne, centré, et écarte ceux hors de l’étendue', () => {
    const placed = placeMarkers([{ x: 50, label: 'Palier 50' }, { x: 120, label: 'Hors' }, { x: -1, label: 'Avant' }], geometry.xAt, range, LAYOUT.width)
    expect(placed).toHaveLength(1)
    expect(placed[0]).toMatchObject({ x: geometry.xs[1], anchor: 'middle', row: 0 })
  })
  it('monte d’une rangée l’étiquette qui chevaucherait la précédente', () => {
    const placed = placeMarkers([{ x: 50, label: 'Palier 50' }, { x: 55, label: 'Palier 55' }, { x: 99, label: 'Palier 99' }], geometry.xAt, range, LAYOUT.width)
    expect(placed.map((p) => p.row)).toEqual([0, 1, 0])
  })
  it('cale l’étiquette qui sortirait du dessin et trie les repères par abscisse', () => {
    const placed = placeMarkers([{ x: 100, label: 'Palier 100' }, { x: 0, label: 'Palier 0' }], geometry.xAt, range, LAYOUT.width)
    expect(placed.map((p) => p.marker.x)).toEqual([0, 100])
    expect(placed[0]?.anchor).toBe('middle')
    const narrow = placeMarkers([{ x: 0, label: 'Palier 0' }, { x: 100, label: 'Palier 100' }], (v) => v * 0.9 + 5, range, 100)
    expect(narrow.map((p) => p.anchor)).toEqual(['start', 'end'])
  })
  it('ne dépasse pas le nombre de rangées permis', () => {
    const labels = Array.from({ length: 6 }, (_, i) => ({ x: 50 + i, label: `Palier ${50 + i}` }))
    const placed = placeMarkers(labels, geometry.xAt, range, LAYOUT.width, 6.6, 3)
    expect(Math.max(...placed.map((p) => p.row))).toBe(2)
  })
})
