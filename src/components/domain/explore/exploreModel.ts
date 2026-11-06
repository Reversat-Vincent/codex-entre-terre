// Modèle de l'écran « Explorer » : catalogues groupés (armes, équipement, objets, monde), compteurs lus dans le manifeste et liens de la section « Ressources ».
// Fonctions et constantes pures, sans routeur ni store : les libellés et les routes viennent du registre `src/data/datasets.ts`.

import type { RouteLocationRaw } from 'vue-router'
import { DATASETS } from '../../../data/datasets.ts'
import type { DatasetKey } from '../../../data/datasets.ts'
import { GUIDE_LINKS, INTERACTIVE_MAPS } from '../../../data/externalLinks.ts'
import type { ExternalLink } from '../../../data/externalLinks.ts'
import type { DataManifest } from '../../../data/types/manifest.ts'
import { labelText } from '../../../ui/explainText.ts'

/** Catalogue proposé par l'écran Explorer : un jeu de données, sa route et son icône. */
export interface ExploreEntry {
  /** Jeu de données dont le manifeste donne le nombre d'entrées. */
  readonly dataset: DatasetKey
  /** Libellé français (registre des jeux de données). */
  readonly label: string
  /** Icône du sprite, sans le préfixe `i-`. */
  readonly icon: string
  /** Route du catalogue, avec son filtre de famille ou de type quand le catalogue est partagé. */
  readonly to: RouteLocationRaw
}

/** Groupe de catalogues de l'écran Explorer. */
export interface ExploreGroup {
  /** Identifiant stable (ancre, clé de liste). */
  readonly id: string
  /** Libellé français du groupe. */
  readonly label: string
  readonly entries: readonly ExploreEntry[]
}

/**
 * Construit l'entrée d'un catalogue d'après le registre des jeux de données.
 * @param dataset Clé du jeu de données.
 * @param icon Icône du sprite.
 * @returns L'entrée, dont la route porte le filtre de famille ou de type s'il existe.
 */
function entry(dataset: DatasetKey, icon: string): ExploreEntry {
  const { label, routes } = DATASETS[dataset]
  const to: RouteLocationRaw = routes.query
    ? { name: routes.list, query: { [routes.query.name]: routes.query.value } }
    : { name: routes.list }
  return { dataset, label, icon, to }
}

/** Les quatre groupes de catalogues (brief § 4) : Armes, Équipement, Objets, Monde. */
export const EXPLORE_GROUPS: readonly ExploreGroup[] = [
  {
    id: 'weapons',
    label: 'Armes',
    entries: [entry('melee_armaments', 'c-greatsword'), entry('ranged_weapons_catalysts', 'c-bow'), entry('shields_torches', 'c-shield')],
  },
  {
    id: 'equipment',
    label: 'Équipement',
    entries: [entry('ashes_of_war', 'skill'), entry('armor', 'shield'), entry('talismans', 'rune'), entry('spells', 'd-magic'), entry('spirit_ashes', 'd-holy')],
  },
  {
    id: 'items',
    label: 'Objets',
    entries: [entry('tools', 'layers'), entry('upgrade_materials', 'stone'), entry('key_items', 'key'), entry('crafting_materials', 'drop'), entry('ammunition', 'c-straight')],
  },
  {
    id: 'world',
    label: 'Monde',
    entries: [entry('bosses', 'boss'), entry('locations', 'map'), entry('npcs', 'npc'), entry('origins', 'origin')],
  },
]

/** Accès aux Mécaniques (sommaire des règles du jeu) : hors des quatre groupes, il a sa propre section. */
export const MECHANICS_ENTRY: ExploreEntry = entry('mechanics', 'book')

/**
 * Nombre d'entrées d'un jeu de données, lu dans le manifeste (docs/architecture.md § 3.6).
 * @param manifest Manifeste chargé, ou `null` tant qu'il ne l'est pas.
 * @param dataset Jeu de données.
 * @returns Le nombre d'entrées, ou `null` si le manifeste n'est pas encore là (rien n'est affiché plutôt qu'un zéro trompeur).
 */
export function entryCount(manifest: DataManifest | null, dataset: DatasetKey): number | null {
  return manifest ? manifest.files[dataset].entries : null
}

/**
 * Nombre d'entrées d'un groupe de catalogues.
 * @param manifest Manifeste chargé, ou `null`.
 * @param group Groupe de catalogues.
 * @returns La somme des entrées du groupe, ou `null` si le manifeste n'est pas chargé.
 */
export function groupCount(manifest: DataManifest | null, group: ExploreGroup): number | null {
  if (!manifest) return null
  return group.entries.reduce((sum, e) => sum + manifest.files[e.dataset].entries, 0)
}

/** Lien externe affiché dans la section « Ressources ». */
export interface ResourceItem {
  readonly id: string
  /** Libellé français, avec le nom du site. */
  readonly label: string
  /** Adresse externe (s'ouvre dans un nouvel onglet). */
  readonly href: string
}

/** Liste de liens externes sous un intitulé. */
export interface ResourceGroup {
  readonly id: string
  readonly label: string
  readonly links: readonly ResourceItem[]
}

/**
 * Convertit des liens externes fixes en éléments affichables.
 * @param links Liens de `src/data/externalLinks.ts`.
 * @returns Les éléments, libellés par `labelText`.
 */
function toItems(links: readonly ExternalLink[]): ResourceItem[] {
  return links.map((l) => ({ id: l.id, label: labelText(l.labelCode), href: l.url }))
}

/** Section « Ressources » : cartes interactives puis guides, en liens externes (D25, D29). */
export const RESOURCE_GROUPS: readonly ResourceGroup[] = [
  { id: 'maps', label: 'Cartes interactives', links: toItems(INTERACTIVE_MAPS) },
  { id: 'guides', label: 'Guides et progression', links: toItems(GUIDE_LINKS) },
]
