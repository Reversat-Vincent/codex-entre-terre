// Tests des fonctions pures du réordonnancement par glisser : élément sous le pointeur et pas de défilement automatique.

import { describe, expect, it } from 'vitest'
import { itemAt, scrollStep } from '../../../src/composables/useReorder.ts'

const rects = [
  { id: 'a', left: 0, top: 0, right: 100, bottom: 50 },
  { id: 'b', left: 0, top: 66, right: 60, bottom: 120 },
  { id: 'c', left: 76, top: 66, right: 100, bottom: 120 },
]

describe('itemAt', () => {
  it("renvoie l'élément qui contient le point", () => {
    expect(itemAt(rects, 10, 10)).toBe('a')
    expect(itemAt(rects, 80, 100)).toBe('c')
  })

  it('renvoie null dans une gouttière ou hors de la grille', () => {
    expect(itemAt(rects, 10, 58)).toBeNull()
    expect(itemAt(rects, 68, 100)).toBeNull()
    expect(itemAt(rects, 500, 500)).toBeNull()
    expect(itemAt([], 0, 0)).toBeNull()
  })
})

describe('scrollStep', () => {
  it('ne défile pas au milieu de la fenêtre', () => {
    expect(scrollStep(400, 800)).toBe(0)
  })

  it('défile vers le haut près du bord haut et vers le bas près du bord bas, plus vite au bord', () => {
    expect(scrollStep(10, 800)).toBeLessThan(0)
    expect(scrollStep(790, 800)).toBeGreaterThan(0)
    expect(Math.abs(scrollStep(0, 800))).toBeGreaterThan(Math.abs(scrollStep(60, 800)))
  })
})
