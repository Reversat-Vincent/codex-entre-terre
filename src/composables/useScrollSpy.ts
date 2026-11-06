// Composable `useScrollSpy` : repère la section visible d'un article long pour surligner son entrée dans le sommaire.

import { onBeforeUnmount, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

/** Marge du repère : une section est « courante » quand son titre passe sous la barre du haut, jusqu'aux 60 % supérieurs de l'écran. */
const ROOT_MARGIN = '-72px 0px -60% 0px'

/**
 * Suit, pendant le défilement, la dernière section dont le haut a dépassé le repère.
 * Sans `IntersectionObserver` (anciens navigateurs, rendu serveur des tests), `active` ne change que par `set`.
 * @param elementIds Identifiants des éléments de section, dans l'ordre de la page (valeur ou fonction : relue quand l'article change).
 * @returns `active` : l'identifiant de la section courante (`null` avant tout défilement) ; `set` : fixe la section courante (clic dans le sommaire).
 */
export function useScrollSpy(elementIds: MaybeRefOrGetter<readonly string[]>): { active: Ref<string | null>; set: (id: string | null) => void } {
  const active = ref<string | null>(null)
  let observer: IntersectionObserver | null = null

  function stop(): void {
    observer?.disconnect()
    observer = null
  }

  watch(
    () => toValue(elementIds),
    (ids) => {
      stop()
      if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') return
      // Les sections sont dans le DOM après le rendu qui suit ce changement : on les lit au prochain tour.
      queueMicrotask(() => {
        const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)
        if (elements.length === 0) return
        const above = new Set<string>()
        observer = new IntersectionObserver(
          (records) => {
            for (const record of records) {
              // Une section est « passée » quand elle est entrée dans la zone repère ou l'a dépassée par le haut.
              if (record.isIntersecting || record.boundingClientRect.top < 0) above.add(record.target.id)
              else above.delete(record.target.id)
            }
            const last = [...ids].reverse().find((id) => above.has(id))
            active.value = last ?? null
          },
          { rootMargin: ROOT_MARGIN },
        )
        for (const el of elements) observer.observe(el)
      })
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(stop)
  return { active, set: (id) => { active.value = id } }
}
