// Modèle de la navigation : entrées de la barre latérale, onglets mobiles, fichiers dont le manifeste donne le compteur, et règle d'entrée active.
// Données statiques et fonctions pures ; les composants `AppSideNav` et `AppTabBar` les affichent.

import type { FileKey } from '../../data/datasets.ts'
import type { TabId } from '../../router/meta.ts'

/** Compteur d'une entrée : nombre d'entrées des fichiers du manifeste, ou taille d'un store. */
export type NavCount = { kind: 'files'; files: readonly FileKey[] } | { kind: 'pins' } | { kind: 'compare' } | { kind: 'none' }

/** Entrée de la barre latérale. */
export interface NavEntry {
  /** Libellé affiché. */
  label: string
  /** Chemin du routeur. */
  to: string
  /** Icône du sprite, sans le préfixe `i-`. */
  icon: string
  /** Origine du compteur affiché à droite. */
  count: NavCount
}

const files = (...keys: FileKey[]): NavCount => ({ kind: 'files', files: keys })
const NONE: NavCount = { kind: 'none' }

/** Entrée « Tableau de bord » (en tête de la barre latérale). */
export const NAV_HOME: NavEntry = { label: 'Tableau de bord', to: '/', icon: 'dash', count: NONE }

/** Section « Explorer » : un catalogue par entrée (Main.dc.html). */
export const NAV_EXPLORE: readonly NavEntry[] = [
  { label: 'Armes', to: '/armes', icon: 'c-greatsword', count: files('melee_armaments', 'ranged_weapons_catalysts', 'shields_torches') },
  { label: 'Cendres de guerre', to: '/cendres-de-guerre', icon: 'skill', count: files('ashes_of_war') },
  { label: 'Armures', to: '/armures', icon: 'shield', count: files('armor') },
  { label: 'Talismans', to: '/talismans', icon: 'rune', count: files('talismans') },
  { label: 'Sorts', to: '/sorts', icon: 'd-magic', count: files('spells') },
  { label: 'Esprits', to: '/esprits', icon: 'd-holy', count: files('spirit_ashes') },
  { label: 'Objets', to: '/objets', icon: 'key', count: files('tools', 'upgrade_materials', 'key_items', 'crafting_materials', 'ammunition') },
  { label: 'Boss', to: '/boss', icon: 'boss', count: files('bosses') },
  { label: 'Lieux', to: '/lieux', icon: 'map', count: files('locations') },
  { label: 'PNJ', to: '/pnj', icon: 'npc', count: files('npcs') },
  { label: 'Origines', to: '/origines', icon: 'origin', count: files('origins') },
]

/** Section « Outils ». */
export const NAV_TOOLS: readonly NavEntry[] = [
  { label: 'Comparateur', to: '/comparateur', icon: 'compare', count: { kind: 'compare' } },
  { label: 'Mécaniques', to: '/mecaniques', icon: 'book', count: files('mechanics') },
  { label: 'Ma liste', to: '/ma-liste', icon: 'list', count: { kind: 'pins' } },
  { label: 'Profil', to: '/profil', icon: 'user', count: NONE },
]

/** Onglet de la barre mobile. */
export interface TabEntry {
  id: TabId
  label: string
  to: string
  icon: string
}

/** Barre d'onglets mobile : Accueil, Explorer, Ma liste, Mécaniques, Profil (architecture § 10.1). */
export const TAB_ENTRIES: readonly TabEntry[] = [
  { id: 'home', label: 'Accueil', to: '/', icon: 'dash' },
  { id: 'explore', label: 'Explorer', to: '/explorer', icon: 'explore' },
  { id: 'list', label: 'Ma liste', to: '/ma-liste', icon: 'list' },
  { id: 'mechanics', label: 'Mécaniques', to: '/mecaniques', icon: 'book' },
  { id: 'profile', label: 'Profil', to: '/profil', icon: 'user' },
]

/**
 * Indique si une entrée de navigation correspond à la page courante.
 * Le tableau de bord n'est actif que sur `/` ; les autres le sont aussi sur leurs sous-chemins (une fiche garde son catalogue allumé).
 * @param entryPath Chemin de l'entrée.
 * @param currentPath Chemin courant du routeur.
 * @returns Vrai si l'entrée est la page courante ou son parent.
 */
export function isEntryActive(entryPath: string, currentPath: string): boolean {
  if (entryPath === '/') return currentPath === '/'
  return currentPath === entryPath || currentPath.startsWith(`${entryPath}/`)
}
