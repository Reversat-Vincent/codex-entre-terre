// Modèle de « Ma liste » : filtre À récupérer / Récupérés / Tout, déplacement d'un élément parmi les éléments visibles, « où l'obtenir » et libellés des genres.
// Fonctions pures : ni store ni accès aux données chargées ; les entrées sont lues telles quelles, sans valeur de jeu ajoutée.
// Étape et score : mise en forme des résultats de `stageOf` et `scoreOf` (store `analysis`), partagée avec le comparateur.

import type { EntityKind } from '../../../data/datasets.ts'
import type { AcquisitionDerived } from '../../../data/types/common.ts'
import type { StageInfo } from '../../../engine/stage.ts'
import type { WeaponScore } from '../../../engine/score.ts'
import type { Calc } from '../../../engine/types.ts'
import type { PinRecord } from '../../../persistence/model.ts'
import { DLC_ZONE_LABELS, STAGE_LABELS } from '../../../ui/labels.ts'
import type { EstimateConfidence } from '../../../ui/labels.ts'

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

/** Genres dont `analysis.stageOf` donne l'étape (ceux dont les entrées ont des acquisitions) : seuls ceux-là ont une ligne « Étape » et demandent les fichiers du moteur. */
export const STAGED_KINDS: ReadonlySet<EntityKind> = new Set(['weapon', 'ash', 'armor', 'talisman', 'spell', 'spirit', 'item'])

/** Étape affichée d'une entité : libellé (« Milieu », « DLC · Entrée ») ou « Non classé ». */
export type StageView = { readonly kind: 'stage'; readonly text: string } | { readonly kind: 'unclassified' }

/**
 * Prépare l'étape d'une entité d'après le getter `stageOf` du store `analysis` (calculs.md, « Étape de progression d'une arme »).
 * @param calc Résultat de `analysis.stageOf(ref)`, ou `null` pour une entité sans acquisitions ou dont le fichier n'est pas chargé.
 * @returns L'étape à afficher, `unclassified` si aucune règle n'en donne, `null` si le getter ne couvre pas l'entité.
 */
export function stageView(calc: Calc<StageInfo> | null): StageView | null {
  if (calc === null) return null
  const info = calc.value
  if (info === null) return { kind: 'unclassified' }
  const zone = info.stage === 'dlc' && info.dlcZone !== null ? ` · ${DLC_ZONE_LABELS[info.dlcZone]}` : ''
  return { kind: 'stage', text: `${STAGE_LABELS[info.stage]}${zone}` }
}

/** Score d'une arme pour le profil : total sur 100 (`null` : « Non classé »), estimation héritée et indication « hors des recommandations ». */
export interface ScoreView {
  readonly total: number | null
  readonly estimate: EstimateConfidence | null
  /** Vrai si l'arme est hors du style de jeu des critères : le score est donné pour information (limite `weapon-outside-style`). */
  readonly outsideStyle: boolean
}

/**
 * Prépare le score d'une arme d'après le getter `scoreOf` du store `analysis`, y compris hors du style choisi ou masquée par un filtre
 * (calculs.md, « Score de recommandation d'une arme (0–100) »).
 * @param calc Résultat de `analysis.scoreOf(ref)`, ou `null` si l'arme n'est pas dans un fichier chargé.
 * @returns Le score à afficher, ou `null` sans résultat.
 */
export function scoreView(calc: Calc<WeaponScore> | null): ScoreView | null {
  if (calc === null) return null
  return {
    total: calc.value?.total ?? null,
    estimate: calc.estimate?.confidence ?? null,
    outsideStyle: calc.explanation.limits.some((l) => l.code === 'weapon-outside-style'),
  }
}
