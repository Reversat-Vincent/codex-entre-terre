// Actions d'une arme recommandée, communes au widget et à son plein écran : épingler, comparer, ouvrir la fiche, élargir les critères.
// Aucune logique propre : ce composable relie les boutons aux stores `pins`, `compare`, `criteria` et `toasts` et au routeur.

import { useRouter } from 'vue-router'
import type { EntityRef } from '../../data/datasets.ts'
import { entityRoute } from '../../router/entityRoute.ts'
import { useCompareStore } from '../../stores/compare.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { usePinsStore } from '../../stores/pins.ts'
import { useToastsStore } from '../../stores/toasts.ts'
import type { HiddenReason } from '../../engine/score.ts'
import { wideningPatch } from './weaponsModel.ts'

/** Valeur renvoyée par `useWeaponActions`. */
export interface WeaponActions {
  /** Épingle l'arme à Ma liste (notification « Épinglé à Ma liste » avec « Annuler » pendant 5 s) ou la retire si elle y est. */
  togglePin: (ref: EntityRef) => void
  /** Ajoute l'arme à la comparaison (2 à 4 armes) ou la retire ; un refus motivé du store s'affiche en notification. */
  toggleCompare: (ref: EntityRef) => void
  /** Ouvre la fiche de l'arme. */
  openSheet: (ref: EntityRef) => void
  /** Adresse de la fiche, pour que le nom reste un vrai lien (ouverture dans un nouvel onglet, copie). */
  sheetHref: (ref: EntityRef) => string
  /** Adresse du plein écran du widget A. */
  fullscreenHref: () => string
  /** Ouvre le plein écran du widget A. */
  openFullscreen: () => void
  /** Ouvre le comparateur avec les armes choisies. */
  openComparator: () => void
  /** Lève une raison de masquage dans les critères (un bouton d'élargissement). */
  widen: (reason: HiddenReason | 'style') => void
}

/**
 * Donne accès aux actions d'une arme.
 * Effets : modifie `pins`, `compare` et `criteria`, pose des notifications, navigue.
 * @returns Les actions.
 */
export function useWeaponActions(): WeaponActions {
  const router = useRouter()
  const pins = usePinsStore()
  const compare = useCompareStore()
  const criteria = useCriteriaStore()
  const toasts = useToastsStore()

  return {
    togglePin: (ref) => pins.toggle(ref),
    toggleCompare: (ref) => {
      const result = compare.toggle(ref)
      if (!result.ok) toasts.push({ message: result.message, kind: 'warning', icon: 'alert' })
    },
    openSheet: (ref) => {
      void router.push(entityRoute(ref))
    },
    sheetHref: (ref) => router.resolve(entityRoute(ref)).href,
    fullscreenHref: () => router.resolve({ name: 'widgetFullscreen', params: { widgetId: 'weapons-by-stage' } }).href,
    openFullscreen: () => {
      void router.push({ name: 'widgetFullscreen', params: { widgetId: 'weapons-by-stage' } })
    },
    openComparator: () => {
      void router.push({ name: 'compare', query: { e: compare.items.join(',') } })
    },
    widen: (reason) => criteria.set(wideningPatch(reason)),
  }
}
