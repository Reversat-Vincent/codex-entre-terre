// Composable `useBreakpoint` : mode d'affichage courant (mobile, tablette, desktop) tenu à jour par `matchMedia`.
// Les seuils viennent de `src/ui/breakpoints.ts`. Sans fenêtre (tests, prérendu), le mode desktop est supposé.
import { computed, getCurrentScope, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { MEDIA_QUERIES, type Breakpoint } from '../ui/breakpoints.ts'

/** Valeur renvoyée par `useBreakpoint`. */
export interface BreakpointState {
  /** Mode courant : `mobile` (< 768 px), `tablet` (768 à 1279 px) ou `desktop` (≥ 1280 px). */
  breakpoint: ComputedRef<Breakpoint>
  /** Vrai sous 768 px. */
  isMobile: ComputedRef<boolean>
  /** Vrai de 768 à 1279 px. */
  isTablet: ComputedRef<boolean>
  /** Vrai à partir de 1280 px. */
  isDesktop: ComputedRef<boolean>
  /** Vrai à partir de 1600 px (la barre latérale reste dépliée quand les critères sont ouverts). */
  isWide: Ref<boolean>
}

/**
 * Suit les points de rupture de l'interface.
 * Écoute les `MediaQueryList` correspondantes tant que la portée de l'appelant (composant ou effet) est active.
 * @returns des valeurs réactives du mode courant ; elles se mettent à jour au redimensionnement
 */
export function useBreakpoint(): BreakpointState {
  const hasWindow = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isWide = ref(false)

  if (hasWindow) {
    const bind = (query: string, target: Ref<boolean>): void => {
      const list = window.matchMedia(query)
      target.value = list.matches
      const onChange = (event: MediaQueryListEvent): void => {
        target.value = event.matches
      }
      list.addEventListener('change', onChange)
      if (getCurrentScope()) onScopeDispose(() => list.removeEventListener('change', onChange))
    }
    bind(MEDIA_QUERIES.mobile, isMobile)
    bind(MEDIA_QUERIES.tablet, isTablet)
    bind(MEDIA_QUERIES.wide, isWide)
  }

  const breakpoint = computed<Breakpoint>(() => (isMobile.value ? 'mobile' : isTablet.value ? 'tablet' : 'desktop'))
  return {
    breakpoint,
    isMobile: computed(() => breakpoint.value === 'mobile'),
    isTablet: computed(() => breakpoint.value === 'tablet'),
    isDesktop: computed(() => breakpoint.value === 'desktop'),
    isWide,
  }
}
