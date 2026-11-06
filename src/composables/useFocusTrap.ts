// Composable `useFocusTrap` : garde le focus clavier dans un conteneur (feuille, tiroir, fenêtre) tant qu'il est actif,
// et le rend à l'élément qui l'avait avant l'ouverture. Ne gère pas Échap : le composant appelant décide de fermer.
import { nextTick, onScopeDispose, watch, type Ref } from 'vue'

/** Options de `useFocusTrap`. */
export interface FocusTrapOptions {
  /** Élément à focaliser à l'ouverture ; par défaut le premier élément focalisable, sinon le conteneur lui-même. */
  initialFocus?: () => HTMLElement | null | undefined
  /** Rend le focus à l'élément précédent à la fermeture (vrai par défaut). */
  returnFocus?: boolean
}

/** Sélecteur des éléments atteignables au clavier. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

/** Renvoie les éléments focalisables et visibles d'un conteneur, dans l'ordre du document. */
function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0,
  )
}

/**
 * Piège le focus dans `container` tant que `active` est vrai.
 * À l'activation : mémorise l'élément focalisé, déplace le focus dans le conteneur, boucle Tab et Maj+Tab sur ses éléments.
 * À la désactivation (ou au démontage) : rend le focus à l'élément mémorisé si `returnFocus` n'est pas faux.
 * @param container conteneur à piéger (doit être rendu quand `active` passe à vrai)
 * @param active état d'activation
 * @param options focus initial et restitution
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>, options: FocusTrapOptions = {}): void {
  let previous: HTMLElement | null = null
  let attached: HTMLElement | null = null

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !attached) return
    const items = focusableIn(attached)
    if (items.length === 0) {
      event.preventDefault()
      attached.focus()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    const current = document.activeElement
    if (event.shiftKey && (current === first || current === attached)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    } else if (!attached.contains(current)) {
      event.preventDefault()
      first.focus()
    }
  }

  const release = (): void => {
    attached?.removeEventListener('keydown', onKeydown)
    attached = null
    if (options.returnFocus !== false && previous && previous.isConnected) previous.focus()
    previous = null
  }

  watch(
    active,
    async (isActive) => {
      if (!isActive) {
        release()
        return
      }
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      const el = container.value
      if (!el || !active.value) return
      attached = el
      el.addEventListener('keydown', onKeydown)
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
      const target = options.initialFocus?.() ?? focusableIn(el)[0] ?? el
      target.focus()
    },
    { immediate: true, flush: 'post' },
  )

  onScopeDispose(release)
}
