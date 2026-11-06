// Store de « Ma liste » : éléments épinglés, cochés « fait » et ordonnés à la main (docs/architecture.md § 6).
// Épingler notifie « Épinglé à Ma liste » avec « Annuler » pendant 5 s (spécification du tableau de bord).

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { EntityRef } from '../data/datasets.ts'
import { LIMITS } from '../persistence/model.ts'
import type { PinRecord } from '../persistence/model.ts'
import { useToastsStore } from './toasts.ts'

/** Issue d'un épinglage : ajouté, déjà présent, ou liste pleine. */
export type PinResult = 'added' | 'exists' | 'full'

/**
 * Store de Ma liste.
 * Actions : `pin(ref)` (notification avec « Annuler »), `unpin(ref)` (notification avec « Annuler » qui rétablit l'élément à sa place),
 * `toggle(ref)`, `toggleDone(ref)`, `reorder(de, vers)` (indices), `snapshot()` et `hydrate(slice)` pour la persistance.
 * Le getter `isPinned(ref)` sert aux boutons « Épingler ».
 */
export const usePinsStore = defineStore('pins', () => {
  const items = ref<PinRecord[]>([])
  const refs = computed(() => new Set<string>(items.value.map((p) => p.ref)))
  const isPinned = computed(() => (entity: EntityRef): boolean => refs.value.has(entity))

  function add(entity: EntityRef, index: number | null, extra?: Pick<PinRecord, 'addedAt' | 'done'>): void {
    const record: PinRecord = { ref: entity, addedAt: extra?.addedAt ?? new Date().toISOString(), done: extra?.done ?? false }
    const next = [...items.value]
    next.splice(index === null ? next.length : Math.min(index, next.length), 0, record)
    items.value = next
  }

  function unpinQuietly(entity: EntityRef): void {
    items.value = items.value.filter((p) => p.ref !== entity)
  }

  function pin(entity: EntityRef): PinResult {
    if (refs.value.has(entity)) return 'exists'
    const toasts = useToastsStore()
    if (items.value.length >= LIMITS.maxPins) {
      toasts.push({ message: `Ma liste est pleine (${LIMITS.maxPins} éléments au plus).`, kind: 'warning' })
      return 'full'
    }
    add(entity, null)
    toasts.undoable('Épinglé à Ma liste', () => unpinQuietly(entity), 'pin')
    return 'added'
  }

  function unpin(entity: EntityRef): boolean {
    const index = items.value.findIndex((p) => p.ref === entity)
    const record = items.value[index]
    if (!record) return false
    unpinQuietly(entity)
    useToastsStore().undoable(
      'Retiré de Ma liste',
      () => {
        if (!refs.value.has(entity) && items.value.length < LIMITS.maxPins) add(entity, index, record)
      },
      'pin',
    )
    return true
  }

  function toggle(entity: EntityRef): void {
    if (refs.value.has(entity)) unpin(entity)
    else pin(entity)
  }

  function toggleDone(entity: EntityRef): void {
    items.value = items.value.map((p) => (p.ref === entity ? { ...p, done: !p.done } : p))
  }

  function reorder(from: number, to: number): void {
    const size = items.value.length
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= size || to < 0 || to >= size || from === to) return
    const next = [...items.value]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(to, 0, moved)
    items.value = next
  }

  function snapshot(): PinRecord[] {
    return items.value.map((p) => ({ ref: p.ref, addedAt: p.addedAt, done: p.done }))
  }

  function hydrate(slice: PinRecord[]): void {
    items.value = slice.map((p) => ({ ref: p.ref, addedAt: p.addedAt, done: p.done }))
  }

  return { items, isPinned, pin, unpin, toggle, toggleDone, reorder, snapshot, hydrate }
})
