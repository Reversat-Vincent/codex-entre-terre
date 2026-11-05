// Store des notifications : file de messages brefs, avec action facultative (« Annuler ») et disparition automatique.
// Référence : docs/architecture.md § 6 (`toasts`, non persisté). L'affichage est assuré par `CxToastHost`.

import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'

/** Durée d'une notification simple, en ms. */
export const TOAST_DURATION_MS = 4000

/** Durée d'une notification qui propose « Annuler » : 5 s (spécification du tableau de bord). */
export const UNDO_DURATION_MS = 5000

/** Nombre maximal de notifications affichées ensemble : les plus anciennes disparaissent. */
const MAX_TOASTS = 4

/** Action proposée par une notification. */
export interface ToastAction {
  /** Libellé du bouton (« Annuler »). */
  label: string
  /** Exécutée au clic ; la notification se ferme ensuite. */
  run: () => void
}

/** Notification. */
export interface Toast {
  id: number
  kind: 'info' | 'success' | 'warning' | 'error'
  message: string
  /** Nom d'icône du sprite sans le préfixe `i-` (`refresh`, `check`…), ou `null`. */
  icon: string | null
  action: ToastAction | null
  durationMs: number
}

/** Paramètres d'une nouvelle notification. */
export interface ToastInput {
  message: string
  kind?: Toast['kind']
  icon?: string | null
  action?: ToastAction | null
  durationMs?: number
}

/**
 * Store des notifications.
 * `push(input)` ajoute une notification et renvoie son identifiant ; `dismiss(id)` la ferme ; `runAction(id)` exécute son action puis la ferme ;
 * `undoable(message, undo, icon?)` raccourci pour une notification de 5 s avec « Annuler » ;
 * `pause(id)` arrête le compte à rebours (survol ou focus) et `resume(id)` le reprend avec le temps restant (sans effet si rien n'est en pause).
 */
export const useToastsStore = defineStore('toasts', () => {
  const items = ref<Toast[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  /** Instant de disparition prévu des notifications dont le compte à rebours court. */
  const deadlines = new Map<number, number>()
  /** Temps restant (ms) des notifications en pause. */
  const remaining = new Map<number, number>()
  let nextId = 1

  function arm(id: number, ms: number): void {
    deadlines.set(id, Date.now() + ms)
    timers.set(id, setTimeout(() => dismiss(id), ms))
  }

  function dismiss(id: number): void {
    const timer = timers.get(id)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(id)
    deadlines.delete(id)
    remaining.delete(id)
    items.value = items.value.filter((t) => t.id !== id)
  }

  function push(input: ToastInput): number {
    const id = nextId++
    const toast: Toast = markRaw({
      id,
      kind: input.kind ?? 'info',
      message: input.message,
      icon: input.icon ?? null,
      action: input.action ?? null,
      durationMs: input.durationMs ?? (input.action ? UNDO_DURATION_MS : TOAST_DURATION_MS),
    })
    items.value = [...items.value, toast]
    arm(id, toast.durationMs)
    while (items.value.length > MAX_TOASTS) {
      const oldest = items.value[0]
      if (oldest) dismiss(oldest.id)
    }
    return id
  }

  function pause(id: number): void {
    const timer = timers.get(id)
    const deadline = deadlines.get(id)
    if (timer === undefined || deadline === undefined) return
    clearTimeout(timer)
    timers.delete(id)
    deadlines.delete(id)
    remaining.set(id, Math.max(0, deadline - Date.now()))
  }

  function resume(id: number): void {
    const left = remaining.get(id)
    if (left === undefined) return
    remaining.delete(id)
    arm(id, left)
  }

  function runAction(id: number): void {
    const toast = items.value.find((t) => t.id === id)
    dismiss(id)
    toast?.action?.run()
  }

  function undoable(message: string, undo: () => void, icon: string | null = null): number {
    return push({ message, icon, action: { label: 'Annuler', run: undo }, durationMs: UNDO_DURATION_MS })
  }

  function clear(): void {
    for (const t of [...items.value]) dismiss(t.id)
  }

  return { items, push, dismiss, pause, resume, runAction, undoable, clear }
})
