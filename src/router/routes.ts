// Table des routes de l'application (docs/architecture.md § 9) : chemins français, noms en camelCase, vues chargées à la demande.
// Les catalogues partagent `CatalogView` (la route porte `meta.catalog`) ; chaque genre d'entité a sa fiche, nommée comme le genre.

import type { RouteRecordRaw } from 'vue-router'
import type { TabId } from './meta.ts'

/** Description d'un catalogue et de sa fiche. */
interface CatalogRoute {
  /** Chemin du catalogue ; la fiche est `<chemin>/:id`. */
  path: string
  /** Nom de la route du catalogue. */
  list: string
  /** Nom de la route de la fiche (= genre d'entité). */
  sheet: string
  /** Titre du catalogue. */
  title: string
  /** Titre générique d'une fiche, avant que la vue ne pose le nom de l'entité. */
  sheetTitle: string
  /** Chargeur de la vue de la fiche. */
  view: () => Promise<{ default: object }>
}

const CATALOGS: readonly CatalogRoute[] = [
  { path: '/armes', list: 'weapons', sheet: 'weapon', title: 'Armes', sheetTitle: 'Fiche d’arme', view: () => import('../views/WeaponSheetView.vue') },
  { path: '/boss', list: 'bosses', sheet: 'boss', title: 'Boss', sheetTitle: 'Fiche de boss', view: () => import('../views/BossSheetView.vue') },
  { path: '/cendres-de-guerre', list: 'ashes', sheet: 'ash', title: 'Cendres de guerre', sheetTitle: 'Fiche de cendre de guerre', view: () => import('../views/AshSheetView.vue') },
  { path: '/armures', list: 'armors', sheet: 'armor', title: 'Armures', sheetTitle: 'Fiche d’armure', view: () => import('../views/ArmorSheetView.vue') },
  { path: '/talismans', list: 'talismans', sheet: 'talisman', title: 'Talismans', sheetTitle: 'Fiche de talisman', view: () => import('../views/TalismanSheetView.vue') },
  { path: '/sorts', list: 'spells', sheet: 'spell', title: 'Sorts', sheetTitle: 'Fiche de sort', view: () => import('../views/SpellSheetView.vue') },
  { path: '/esprits', list: 'spirits', sheet: 'spirit', title: 'Cendres d’esprit', sheetTitle: 'Fiche de cendre d’esprit', view: () => import('../views/SpiritSheetView.vue') },
  { path: '/lieux', list: 'locations', sheet: 'location', title: 'Lieux', sheetTitle: 'Fiche de lieu', view: () => import('../views/LocationSheetView.vue') },
  { path: '/pnj', list: 'npcs', sheet: 'npc', title: 'PNJ', sheetTitle: 'Fiche de PNJ', view: () => import('../views/NpcSheetView.vue') },
  { path: '/origines', list: 'origins', sheet: 'origin', title: 'Origines', sheetTitle: 'Fiche d’origine', view: () => import('../views/OriginSheetView.vue') },
  { path: '/objets', list: 'items', sheet: 'item', title: 'Objets', sheetTitle: 'Fiche d’objet', view: () => import('../views/ItemSheetView.vue') },
]

const EXPLORE: TabId = 'explore'

const catalogRoutes: RouteRecordRaw[] = CATALOGS.flatMap((c): RouteRecordRaw[] => [
  { path: c.path, name: c.list, component: () => import('../views/CatalogView.vue'), meta: { title: c.title, tab: EXPLORE, catalog: c.list } },
  { path: `${c.path}/:id`, name: c.sheet, component: c.view, meta: { title: c.sheetTitle, tab: EXPLORE } },
])

/** Noms des routes de catalogue et de fiche, pour les tests et la navigation. */
export const CATALOG_ROUTE_NAMES: readonly string[] = CATALOGS.flatMap((c) => [c.list, c.sheet])

/** Routes de l'application. Chaque vue est un `import()` : un fichier JavaScript par écran. */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Tableau de bord', tab: 'home', criteria: true } },
  { path: '/plein-ecran/:widgetId', name: 'widgetFullscreen', component: () => import('../views/WidgetFullscreenView.vue'), meta: { title: 'Plein écran', tab: 'home' } },
  { path: '/explorer', name: 'explore', component: () => import('../views/ExploreView.vue'), meta: { title: 'Explorer', tab: EXPLORE } },
  ...catalogRoutes,
  { path: '/mecaniques', name: 'mechanics', component: () => import('../views/MechanicsView.vue'), meta: { title: 'Mécaniques', tab: 'mechanics' } },
  { path: '/mecaniques/:id', name: 'mechanic', component: () => import('../views/MechanicArticleView.vue'), meta: { title: 'Mécanique', tab: 'mechanics' } },
  { path: '/ma-liste', name: 'myList', component: () => import('../views/MyListView.vue'), meta: { title: 'Ma liste', tab: 'list' } },
  { path: '/comparateur', name: 'compare', component: () => import('../views/CompareView.vue'), meta: { title: 'Comparateur', tab: EXPLORE } },
  { path: '/profil', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { title: 'Mon profil', tab: 'profile' } },
  { path: '/recherche', name: 'search', component: () => import('../views/SearchView.vue'), meta: { title: 'Recherche', tab: EXPLORE } },
  { path: '/:pathMatch(.*)*', name: 'notFound', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Page introuvable' } },
]
