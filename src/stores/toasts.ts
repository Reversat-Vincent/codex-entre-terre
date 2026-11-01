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
 * `undoable(message, undo, icon?)` raccourci pour une notification de 5 s avec « Annuler ».
 */
export const useToastsStore = defineStore('toasts', () => {
  const items = ref<Toast[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 1

  function dismiss(id: number): void {
    const timer = timers.get(id)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(id)
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
    timers.set(id, setTimeout(() => dismiss(id), toast.durationMs))
    while (items.value.length > MAX_TOASTS) {
      const oldest = items.value[0]
      if (oldest) dismiss(oldest.id)
    }
    return id
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

  return { items, push, dismiss, runAction, undoable, clear }
})
