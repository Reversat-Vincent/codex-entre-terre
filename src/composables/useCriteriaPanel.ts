// Composable `useCriteriaPanel` : état d'ouverture du panneau de critères quand il est superposé (tiroir sur tablette, feuille du bas sur mobile).
// État partagé à l'échelle de l'application : le bouton « Critères » (barre supérieure, tableau de bord mobile) et l'action de la palette l'ouvrent,
// `AppCriteriaHost` l'affiche. Sur desktop, le panneau est une colonne : son repli passe par la préférence `criteriaCollapsed`.

import { ref } from 'vue'
import type { Ref } from 'vue'

const overlayOpen = ref(false)

/** Valeur renvoyée par `useCriteriaPanel`. */
export interface CriteriaPanelState {
  /** Vrai quand le tiroir (tablette) ou la feuille (mobile) des critères est ouvert. */
  overlayOpen: Ref<boolean>
  /** Ouvre le tiroir ou la feuille. */
  openOverlay: () => void
  /** Ferme le tiroir ou la feuille. */
  closeOverlay: () => void
}

/**
 * Donne accès à l'état du tiroir ou de la feuille des critères.
 * @returns L'état partagé et ses deux actions.
 */
export function useCriteriaPanel(): CriteriaPanelState {
  return {
    overlayOpen,
    openOverlay: () => {
      overlayOpen.value = true
    },
    closeOverlay: () => {
      overlayOpen.value = false
    },
  }
}
