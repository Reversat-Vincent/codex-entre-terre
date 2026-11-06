// Composable `useHotkeys` : raccourcis clavier déclarés par combinaison (« mod+k », « Escape », « shift+ArrowUp »).
// `mod` désigne Ctrl sous Windows et Linux, ⌘ sous macOS. Les raccourcis sans modificateur sont ignorés dans les champs de saisie.
import { getCurrentScope, onScopeDispose, unref, watchEffect, type MaybeRef } from 'vue'

/** Combinaison décomposée : touche (en minuscules) et modificateurs exigés. */
export interface KeyCombo {
  /** Touche attendue, en minuscules (`escape`, `k`, `arrowup`, ` ` pour la barre d'espace). */
  key: string
  /** Ctrl ou ⌘ exigé. */
  mod: boolean
  /** Maj exigé. */
  shift: boolean
  /** Alt exigé. */
  alt: boolean
}

/** Options de `useHotkeys`. */
export interface HotkeysOptions {
  /** Cible de l'écoute ; `document` par défaut. */
  target?: MaybeRef<EventTarget | null | undefined>
  /** Active ou suspend l'écoute (vrai par défaut). */
  enabled?: MaybeRef<boolean>
  /** Laisse passer les raccourcis sans modificateur depuis un champ de saisie (faux par défaut, sauf pour Échap). */
  allowInInputs?: boolean
}

/** Fonction appelée quand la combinaison est reconnue ; appeler `event.preventDefault()` si besoin. */
export type HotkeyHandler = (event: KeyboardEvent) => void

/**
 * Décompose une combinaison écrite comme `mod+shift+k` ou `Escape`.
 * @param combo combinaison, modificateurs et touche séparés par `+` (la touche est comparée sans tenir compte de la casse)
 * @returns la combinaison décomposée
 */
export function parseCombo(combo: string): KeyCombo {
  const parts = combo.split('+').map((part) => part.trim().toLowerCase())
  const key = parts.pop() ?? ''
  return { key: key === 'space' ? ' ' : key, mod: parts.includes('mod'), shift: parts.includes('shift'), alt: parts.includes('alt') }
}

/**
 * Indique si un événement clavier correspond à une combinaison.
 * Les modificateurs doivent correspondre exactement : `k` ne se déclenche pas avec Ctrl enfoncé.
 * @param event événement clavier (seuls `key`, `ctrlKey`, `metaKey`, `shiftKey`, `altKey` sont lus)
 * @param combo combinaison décomposée par `parseCombo`
 * @returns vrai si l'événement correspond
 */
export function matchesCombo(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>, combo: KeyCombo): boolean {
  const mod = event.ctrlKey || event.metaKey
  return event.key.toLowerCase() === combo.key && mod === combo.mod && event.altKey === combo.alt && event.shiftKey === combo.shift
}

/** Vrai si la cible de l'événement est un champ de saisie (ou un contenu éditable). */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Déclare des raccourcis clavier tant que la portée de l'appelant est active.
 * Premier gestionnaire dont la combinaison correspond : un seul est appelé par frappe.
 * @param bindings table combinaison → gestionnaire
 * @param options cible, activation et saisie
 */
export function useHotkeys(bindings: Record<string, HotkeyHandler>, options: HotkeysOptions = {}): void {
  const entries = Object.entries(bindings).map(([combo, handler]) => ({ combo: parseCombo(combo), handler }))

  const onKeydown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || event.isComposing) return
    for (const { combo, handler } of entries) {
      if (!matchesCombo(event, combo)) continue
      const typing = isEditable(event.target)
      if (typing && !combo.mod && !options.allowInInputs && combo.key !== 'escape') continue
      handler(event)
      return
    }
  }

  const stop = watchEffect((onCleanup) => {
    if (typeof document === 'undefined' || unref(options.enabled) === false) return
    const target = unref(options.target) ?? document
    target.addEventListener('keydown', onKeydown)
    onCleanup(() => target.removeEventListener('keydown', onKeydown))
  })
  if (getCurrentScope()) onScopeDispose(stop)
}
