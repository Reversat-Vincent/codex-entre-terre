// Modèle de « Ma liste » : filtre À récupérer / Récupérés / Tout, déplacement d'un élément parmi les éléments visibles, « où l'obtenir » et libellés des genres.
// Fonctions pures : ni store ni accès aux données chargées ; les entrées sont lues telles quelles, sans valeur de jeu ajoutée.

import type { EntityKind } from '../../../data/datasets.ts'
import type { AcquisitionDerived } from '../../../data/types/common.ts'
import type { PinRecord } from '../../../persistence/model.ts'

/** Filtre de la liste. */
export type ListFilter = 'todo' | 'done' | 'all'

/** Nom de chaque genre au singulier (affiché sur la ligne de l'élément). */
export const KIND_SINGULARS: Readonly<Record<EntityKind, string>> = {
  weapon: 'Arme',
  ash: 'Cendre de guerre',
  armor: 'Armure',
  talisman: 'Talisman',
  spell: 'Sort',
  spirit: 'Cendre d’esprit',
  item: 'Objet',
  boss: 'Boss',
  location: 'Lieu',
  npc: 'PNJ',
  origin: 'Origine',
  mechanic: 'Mécanique',
}

/** Icône du sprite de chaque genre. */
export const KIND_ICONS: Readonly<Record<EntityKind, string>> = {
  weapon: 'c-straight',
  ash: 'skill',
  armor: 'shield',
  talisman: 'heart',
  spell: 'book',
  spirit: 'npc',
  item: 'key',
  boss: 'boss',
  location: 'map',
  npc: 'npc',
  origin: 'origin',
  mechanic: 'book',
}

/**
 * Éléments qui passent le filtre.
 * @param items Éléments épinglés, dans l'ordre de la liste.
 * @param filter `todo` : à récupérer ; `done` : récupérés ; `all` : tous.
 * @returns Les éléments visibles, dans le même ordre.
 */
export function filterPins(items: readonly PinRecord[], filter: ListFilter): PinRecord[] {
  return items.filter((p) => filter === 'all' || (filter === 'done') === p.done)
}

/** Effectifs de chaque filtre. */
export interface PinCounts {
  readonly todo: number
  readonly done: number
  readonly all: number
}

/**
 * Compte les éléments de chaque filtre.
 * @param items Éléments épinglés.
 * @returns Les effectifs.
 */
export function countPins(items: readonly PinRecord[]): PinCounts {
  const done = items.filter((p) => p.done).length
  return { todo: items.length - done, done, all: items.length }
}

/**
 * Indice où `pins.reorder` doit placer un élément pour qu'il passe devant ou derrière son voisin visible.
 * Avec un filtre actif, le voisin visible n'est pas le voisin de la liste complète : l'élément prend la place du voisin visible, les éléments masqués restent en place.
 * @param items Liste complète, dans l'ordre.
 * @param visible Éléments visibles (sous-liste de `items`), dans l'ordre.
 * @param ref Référence de l'élément à déplacer.
 * @param direction `-1` vers le haut, `1` vers le bas.
 * @returns `{ from, to }` pour `pins.reorder`, ou `null` si l'élément est déjà au bout ou introuvable.
 */
export function moveTarget(
  items: readonly PinRecord[],
  visible: readonly PinRecord[],
  ref: string,
  direction: -1 | 1,
): { from: number; to: number } | null {
  const at = visible.findIndex((p) => p.ref === ref)
  const neighbour = visible[at + direction]
  if (at < 0 || neighbour === undefined) return null
  const from = items.findIndex((p) => p.ref === ref)
  const to = items.findIndex((p) => p.ref === neighbour.ref)
  return from < 0 || to < 0 ? null : { from, to }
}

/** Une façon d'obtenir un élément : méthode, lieu et région tels que dans les données (`null` : non documenté). */
export interface WhereRow {
  readonly method: string | null
  readonly location: string | null
  readonly region: string | null
}

/** « Où l'obtenir » d'un élément : lignes retenues et nombre de lignes omises. */
export interface WhereToGet {
  readonly rows: readonly WhereRow[]
  readonly more: number
}

/** Nombre de lignes « où l'obtenir » affichées par élément. */
export const WHERE_LIMIT = 3

/** Lecture souple d'une entrée : chaque genre en porte une partie ; les champs absents sont ignorés. */
interface LooseEntry {
  readonly acquisition?: readonly { method: string | null; location: string | null; region: string | null }[]
  readonly derived?: Partial<AcquisitionDerived>
  readonly encounters?: readonly { location: string | null; regions: readonly string[] }[]
  readonly region?: string | null
  readonly listed_region?: string | null
}

/**
 * Où obtenir un élément, selon ce que son genre documente :
 * acquisitions (armes, équipements, objets, sorts), lieux et régions des rencontres (boss), région (lieux, PNJ).
 * La région d'une acquisition est celle du wiki, ou à défaut la région déduite par la préparation des données (architecture § 3.2, `derived.regions`).
 * @param entry Entrée de `data/`.
 * @returns Au plus `WHERE_LIMIT` lignes sans doublon et le nombre de lignes omises ; aucune ligne si le genre ne documente rien.
 */
export function whereToGet(entry: unknown): WhereToGet {
  const e = entry as LooseEntry
  const rows: WhereRow[] = []
  if (e.acquisition !== undefined) {
    e.acquisition.forEach((a, index) => {
      const deduced = e.derived?.regions?.acquisitions?.find((r) => r.index === index && !r.starting)?.values.map((v) => v.value) ?? []
      rows.push({ method: a.method, location: a.location, region: a.region ?? (deduced.length > 0 ? deduced.join(', ') : null) })
    })
  } else if (e.encounters !== undefined) {
    for (const enc of e.encounters) rows.push({ method: null, location: enc.location, region: enc.regions.length > 0 ? enc.regions.join(', ') : null })
  } else if (e.region !== undefined || e.listed_region !== undefined) {
    rows.push({ method: null, location: null, region: e.region ?? e.listed_region ?? null })
  }
  const useful = rows.filter((r) => r.method !== null || r.location !== null || r.region !== null)
  const unique = useful.filter((r, i) => useful.findIndex((o) => o.method === r.method && o.location === r.location && o.region === r.region) === i)
  return { rows: unique.slice(0, WHERE_LIMIT), more: Math.max(0, unique.length - WHERE_LIMIT) }
}

/**
 * Précision du genre affichée sous le nom : classe d'une arme, type d'un équipement, rang d'un boss…
 * @param entry Entrée de `data/`.
 * @returns Le texte tel que dans les données, ou `null`.
 */
export function detailOf(entry: unknown): string | null {
  const e = entry as { category?: unknown; tier?: unknown; kind?: unknown }
  if (typeof e.category === 'string' && e.category !== '') return e.category
  if (Array.isArray(e.tier) && e.tier.length > 0) return e.tier.join(', ')
  if (typeof e.kind === 'string' && e.kind !== '') return e.kind
  return null
}
