// Tests du store de Ma liste : épinglage avec notification « Annuler » pendant 5 s, doublons, limite, ordre, retrait annulable.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { LIMITS } from '../../../src/persistence/model.ts'
import { usePinsStore } from '../../../src/stores/pins.ts'
import { useToastsStore } from '../../../src/stores/toasts.ts'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.useRealTimers()
})

describe('pin', () => {
  it('épingle et notifie « Épinglé à Ma liste » avec Annuler pendant 5 s', () => {
    const pins = usePinsStore()
    const toasts = useToastsStore()
    expect(pins.pin('weapon:moonveil')).toBe('added')
    expect(pins.isPinned('weapon:moonveil')).toBe(true)
    expect(toasts.items).toHaveLength(1)
    expect(toasts.items[0]).toMatchObject({ message: 'Épinglé à Ma liste', durationMs: 5000, action: { label: 'Annuler' } })
    vi.advanceTimersByTime(4999)
    expect(toasts.items).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.items).toHaveLength(0)
    expect(pins.isPinned('weapon:moonveil')).toBe(true)
  })

  it('Annuler retire l’élément et ferme la notification', () => {
    const pins = usePinsStore()
    const toasts = useToastsStore()
    pins.pin('weapon:moonveil')
    toasts.runAction(toasts.items[0]!.id)
    expect(pins.items).toHaveLength(0)
    expect(toasts.items).toHaveLength(0)
  })

  it('ne duplique pas un élément déjà épinglé', () => {
    const pins = usePinsStore()
    pins.pin('weapon:moonveil')
    expect(pins.pin('weapon:moonveil')).toBe('exists')
    expect(pins.items).toHaveLength(1)
    expect(useToastsStore().items).toHaveLength(1)
  })

  it(`refuse au-delà de ${LIMITS.maxPins} éléments`, () => {
    const pins = usePinsStore()
    pins.hydrate(Array.from({ length: LIMITS.maxPins }, (_, i) => ({ ref: `item:objet-${i}` as const, addedAt: '2026-11-01T10:00:00.000Z', done: false })))
    expect(pins.pin('weapon:moonveil')).toBe('full')
    expect(pins.items).toHaveLength(LIMITS.maxPins)
    expect(useToastsStore().items[0]?.kind).toBe('warning')
  })
})

describe('unpin, done, reorder', () => {
  it('unpin propose Annuler qui rétablit l’élément à sa place avec son état « fait »', () => {
    const pins = usePinsStore()
    pins.pin('weapon:a')
    pins.pin('weapon:b')
    pins.pin('weapon:c')
    pins.toggleDone('weapon:b')
    pins.unpin('weapon:b')
    expect(pins.items.map((p) => p.ref)).toEqual(['weapon:a', 'weapon:c'])
    const toasts = useToastsStore()
    const undo = toasts.items.find((t) => t.message === 'Retiré de Ma liste')!
    toasts.runAction(undo.id)
    expect(pins.items.map((p) => p.ref)).toEqual(['weapon:a', 'weapon:b', 'weapon:c'])
    expect(pins.items[1]?.done).toBe(true)
  })

  it('unpin d’un élément absent ne fait rien', () => {
    expect(usePinsStore().unpin('weapon:absent')).toBe(false)
  })

  it('toggleDone bascule uniquement l’élément visé', () => {
    const pins = usePinsStore()
    pins.pin('weapon:a')
    pins.pin('weapon:b')
    pins.toggleDone('weapon:a')
    expect(pins.items.map((p) => p.done)).toEqual([true, false])
  })

  it('reorder déplace et ignore les indices invalides', () => {
    const pins = usePinsStore()
    for (const r of ['weapon:a', 'weapon:b', 'weapon:c'] as const) pins.pin(r)
    pins.reorder(0, 2)
    expect(pins.items.map((p) => p.ref)).toEqual(['weapon:b', 'weapon:c', 'weapon:a'])
    pins.reorder(5, 0)
    pins.reorder(0, -1)
    pins.reorder(1.5, 0)
    expect(pins.items.map((p) => p.ref)).toEqual(['weapon:b', 'weapon:c', 'weapon:a'])
  })

  it('snapshot est une copie : la modifier ne touche pas le store', () => {
    const pins = usePinsStore()
    pins.pin('weapon:a')
    const snap = pins.snapshot()
    snap[0]!.done = true
    snap.push({ ref: 'weapon:z', addedAt: 'x', done: false })
    expect(pins.items).toHaveLength(1)
    expect(pins.items[0]?.done).toBe(false)
  })
})
