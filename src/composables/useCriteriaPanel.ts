// Composable `useCriteriaPanel` : état d'ouverture du panneau de critères quand il est superposé (tiroir sur tablette, feuille du bas sur mobile).
// État partagé à l'échelle de l'application : le bouton « Critères » (barre supérieure, tableau de bord mobile) et l'action de la palette l'ouvrent,
// `AppCriteriaHost` l'affiche. Sur desktop, le panneau est une colonne : son repli passe par la préférence `criteriaCollapsed`.
// Une puce de critère demande en plus l'ouverture d'une section précise (`requestSection`) : le panneau la lit et l'ouvre.

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { SectionId } from '../components/criteria/criteriaModel.ts'

const overlayOpen = ref(false)
/** Section demandée par une puce ; `seq` change à chaque demande pour que la même section puisse être redemandée. */
const requestedSection = ref<{ id: SectionId; seq: number } | null>(null)
let sequence = 0
/** Numéro de la dernière demande déjà traitée par le panneau : une demande ne rouvre pas la section à chaque montage. */
let handledSequence = 0

/** Valeur renvoyée par `useCriteriaPanel`. */
export interface CriteriaPanelState {
  /** Vrai quand le tiroir (tablette) ou la feuille (mobile) des critères est ouvert. */
  overlayOpen: Ref<boolean>
  /** Ouvre le tiroir ou la feuille. */
  openOverlay: () => void
  /** Ferme le tiroir ou la feuille. */
  closeOverlay: () => void
  /** Dernière section demandée par une puce de critère, ou `null`. */
  requestedSection: Ref<{ id: SectionId; seq: number } | null>
  /** Demande l'ouverture d'une section ; `AppCriteriaHost` rend alors le panneau visible (colonne dépliée, tiroir ou feuille ouverts). */
  requestSection: (id: SectionId) => void
  /** Lit la demande non encore traitée et la marque traitée ; `null` s'il n'y en a pas. La demande reste visible de l'hôte, qui rend le panneau visible. */
  takeRequestedSection: () => SectionId | null
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
    requestedSection,
    requestSection: (id) => {
      sequence += 1
      requestedSection.value = { id, seq: sequence }
    },
    takeRequestedSection: () => {
      const request = requestedSection.value
      if (request === null || request.seq <= handledSequence) return null
      handledSequence = request.seq
      return request.id
    },
  }
}
