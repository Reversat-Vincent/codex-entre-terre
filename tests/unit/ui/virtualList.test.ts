// Tests de src/composables/useVirtualList.ts (fonction pure `virtualWindow`) : fenêtre de rendu, espaceurs et ligne dépliée.
import { describe, expect, it } from 'vitest'
import { virtualWindow } from '../../../src/composables/useVirtualList.ts'

const H = 34

/** Hauteur rendue : lignes de la fenêtre, plus le détail s'il y tombe. */
function rendered(w: ReturnType<typeof virtualWindow>, extra: { index: number; height: number } | null): number {
  const detail = extra && extra.index >= w.start && extra.index < w.end ? extra.height : 0
  return (w.end - w.start) * H + detail
}

describe('virtualWindow', () => {
  it('rend le haut de la liste avec une marge et un espaceur final', () => {
    const w = virtualWindow(704, H, 0, 340, 6)
    expect(w.start).toBe(0)
    expect(w.end).toBe(10 + 1 + 6)
    expect(w.before).toBe(0)
    expect(w.total).toBe(704 * H)
    expect(w.before + rendered(w, null) + w.after).toBe(w.total)
  })

  it('suit le défilement', () => {
    const w = virtualWindow(704, H, 34 * 100, 340, 6)
    expect(w.start).toBe(94)
    expect(w.before).toBe(94 * H)
    expect(w.before + rendered(w, null) + w.after).toBe(w.total)
  })

  it('reste dans les bornes en bas de liste', () => {
    const w = virtualWindow(120, H, 10_000, 340, 6)
    expect(w.end).toBe(120)
    expect(w.after).toBe(0)
  })

  it('ne rend rien pour une liste vide', () => {
    expect(virtualWindow(0, H, 0, 340)).toEqual({ start: 0, end: 0, before: 0, after: 0, total: 0 })
  })

  it.each([0, 500, 1500, 4000, 9000])('garde l’égalité des hauteurs avec un détail déplié (défilement %i)', (scroll) => {
    const extra = { index: 40, height: 180 }
    const w = virtualWindow(300, H, scroll, 340, 6, extra)
    expect(w.total).toBe(300 * H + 180)
    expect(w.before + rendered(w, extra) + w.after).toBe(w.total)
  })

  it('ignore un détail dont la ligne n’existe pas', () => {
    const w = virtualWindow(10, H, 0, 340, 6, { index: 99, height: 200 })
    expect(w.total).toBe(10 * H)
  })
})
