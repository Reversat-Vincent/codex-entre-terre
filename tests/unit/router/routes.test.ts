// Tests du routeur : toutes les routes de l'architecture § 9 existent, les chemins des actions de la palette se résolvent, titres et défilement.

import { createMemoryHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { formatPageTitle } from '../../../src/composables/usePageTitle.ts'
import { DATASETS } from '../../../src/data/datasets.ts'
import { createAppRouter, scrollBehavior } from '../../../src/router/index.ts'
import { entityRoute } from '../../../src/router/entityRoute.ts'
import { hasCriteriaPanel } from '../../../src/router/meta.ts'
import { CATALOG_ROUTE_NAMES } from '../../../src/router/routes.ts'
import { ACTIONS } from '../../../src/search/actions.ts'

const router = createAppRouter(createMemoryHistory())

describe('routes', () => {
  it('définit les routes nommées de l’architecture § 9', () => {
    const names = router.getRoutes().map((r) => r.name)
    for (const name of ['dashboard', 'widgetFullscreen', 'explore', 'mechanics', 'mechanic', 'myList', 'compare', 'profile', 'search', 'notFound']) {
      expect(names).toContain(name)
    }
    expect(new Set(names).size).toBe(names.length)
  })

  it('a un catalogue et une fiche pour chaque genre du registre des données', () => {
    for (const info of Object.values(DATASETS)) {
      // Les mécaniques ont un sommaire et un article propres, hors des routes de catalogue partagées.
      if (info.key !== 'mechanics') {
        expect(CATALOG_ROUTE_NAMES).toContain(info.routes.list)
        expect(CATALOG_ROUTE_NAMES).toContain(info.routes.sheet)
      }
      expect(router.resolve({ name: info.routes.list }).path).toBe(info.routes.path)
      expect(router.resolve({ name: info.routes.sheet, params: { id: 'x' } }).path).toBe(`${info.routes.path}/x`)
    }
  })

  it('résout chaque chemin des actions de la palette vers un écran (jamais « introuvable »)', () => {
    for (const action of ACTIONS) {
      if (action.effect.type !== 'navigate') continue
      const resolved = router.resolve(action.effect.to)
      expect(resolved.name, action.effect.to).not.toBe('notFound')
      expect(resolved.matched.length).toBeGreaterThan(0)
    }
  })

  it('envoie une adresse inconnue sur « Page introuvable »', () => {
    expect(router.resolve('/nulle-part/du-tout').name).toBe('notFound')
  })

  it('route la fiche d’une entité par son genre', () => {
    expect(router.resolve(entityRoute('weapon:moonveil')).path).toBe('/armes/moonveil')
    expect(router.resolve(entityRoute('boss:rennala-queen-of-the-full-moon')).path).toBe('/boss/rennala-queen-of-the-full-moon')
  })

  it('porte un titre sur chaque route', () => {
    for (const route of router.getRoutes()) expect(route.meta.title, String(route.name)).toBeTruthy()
  })
})

describe('titre de page', () => {
  it('suit le format « <titre> — Codex de l’Entre-terre »', () => {
    expect(formatPageTitle('Armes')).toBe("Armes — Codex de l'Entre-terre")
    expect(formatPageTitle(null)).toBe("Codex de l'Entre-terre")
  })
})

describe('panneau de critères', () => {
  it('apparaît sur le tableau de bord et sur le plein écran du widget A seulement', () => {
    expect(hasCriteriaPanel(router.resolve('/'))).toBe(true)
    expect(hasCriteriaPanel(router.resolve('/plein-ecran/weapons-by-stage'))).toBe(true)
    expect(hasCriteriaPanel(router.resolve('/plein-ecran/boss-order'))).toBe(false)
    expect(hasCriteriaPanel(router.resolve('/armes'))).toBe(false)
  })
})

/** Emplacement résolu, au type attendu par le comportement de défilement (une route résolue a le même contenu qu'une route normalisée). */
const loc = (path: string): RouteLocationNormalized => router.resolve(path) as unknown as RouteLocationNormalized

describe('défilement', () => {
  const from = loc('/armes')
  it('restaure la position au retour', () => {
    expect(scrollBehavior(loc('/boss'), from, { top: 420, left: 0 })).toEqual({ top: 420, left: 0 })
  })
  it('revient en haut sur un autre écran', () => {
    expect(scrollBehavior(loc('/boss'), from, null)).toEqual({ top: 0, left: 0 })
  })
  it('garde la position quand seule la requête change', () => {
    expect(scrollBehavior(loc('/armes?famille=melee'), from, null)).toBe(false)
  })
})
