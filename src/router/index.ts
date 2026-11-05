// Routeur de l'application (docs/architecture.md § 9) : historique par « hash » (GitHub Pages ne sait pas réécrire les adresses),
// titre de page posé à chaque navigation, défilement restauré au retour, haut de page à l'arrivée sur un autre écran.

import { createRouter, createWebHashHistory } from 'vue-router'
import type { Router, RouterHistory, RouterScrollBehavior } from 'vue-router'
import { formatPageTitle } from '../composables/usePageTitle.ts'
import { routes } from './routes.ts'

/**
 * Comportement de défilement : position mémorisée au retour arrière, ancre si l'adresse en porte une, sinon haut de page.
 * Un changement de la seule requête (filtre, tri, page d'un catalogue) garde la position : il ne change pas d'écran.
 * @param to Route d'arrivée.
 * @param from Route de départ.
 * @param saved Position mémorisée par le navigateur (retour arrière), ou `null`.
 * @returns La position à rejoindre, ou `false` pour ne pas défiler.
 */
export const scrollBehavior: RouterScrollBehavior = (to, from, saved) => {
  if (saved) return saved
  if (to.hash) return { el: to.hash, top: 0 }
  if (to.path === from.path) return false
  return { top: 0, left: 0 }
}

/**
 * Crée le routeur.
 * @param history Historique à utiliser ; par défaut le mode « hash » du navigateur, relatif à la page courante (donc au `base` de Vite) (les tests passent un historique en mémoire).
 * @returns Le routeur, avec le titre de page branché sur `meta.title` après chaque navigation.
 */
export function createAppRouter(history: RouterHistory = createWebHashHistory()): Router {
  const router = createRouter({ history, routes, scrollBehavior })
  router.afterEach((to) => {
    if (typeof document !== 'undefined') document.title = formatPageTitle(to.meta.title)
  })
  return router
}
