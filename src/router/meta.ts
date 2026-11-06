// Métadonnées de route (titre, onglet mobile, panneau de critères) et leur déclaration de type pour Vue Router.
// Lues par le routeur (titre de page) et par la coquille (onglet actif, présence du panneau de critères).

import type { RouteMeta } from 'vue-router'

/** Onglet de la barre mobile qui reste actif sur une route (architecture § 10.1). */
export type TabId = 'home' | 'explore' | 'list' | 'mechanics' | 'profile'

declare module 'vue-router' {
  interface RouteMeta {
    /** Titre de la page, sans le suffixe « — Codex de l'Entre-terre » ; une fiche le remplace par le nom de l'entité (`usePageTitle`). */
    title?: string
    /** Onglet de la barre mobile (et entrée de navigation) mis en avant sur cette route. */
    tab?: TabId
    /** Vrai si l'écran affiche le panneau de critères (tableau de bord). */
    criteria?: boolean
    /** Nom de la route du catalogue, pour la vue partagée `CatalogView`. */
    catalog?: string
  }
}

/** Widget dont le plein écran affiche aussi le panneau de critères : A, « armes par étape » (architecture § 9). */
const FULLSCREEN_WITH_CRITERIA = 'weapons-by-stage'

/**
 * Indique si la route courante affiche le panneau de critères : tableau de bord et plein écran du widget A.
 * @param route Route courante.
 * @returns Vrai si la coquille doit réserver l'emplacement du panneau (colonne, tiroir ou feuille).
 */
export function hasCriteriaPanel(route: { readonly meta: RouteMeta; readonly name?: string | symbol | null; readonly params: Record<string, string | string[]> }): boolean {
  if (route.meta.criteria === true) return true
  return route.name === 'widgetFullscreen' && route.params.widgetId === FULLSCREEN_WITH_CRITERIA
}
