// Modèle de la page « Recherche » : filtre de type lu dans l'adresse, découpage des résultats en pages de 100 et sections prêtes à afficher.
// Fonctions pures. Les lignes (icône, titre surligné, contexte, cible) sont celles de la palette (`commandPaletteModel.ts`) : aucune présentation n'est dupliquée.

import { buildResultSections } from '../../ds/commandPaletteModel.ts'
import type { FilterChip, PaletteFilter, PaletteSection } from '../../ds/commandPaletteModel.ts'
import type { ActionGroupResult } from '../../../search/actions.ts'
import { GROUP_ORDER } from '../../../search/search.ts'
import type { SearchGroupResult, SearchResponse } from '../../../search/search.ts'

/** Nombre de résultats par page : au-delà, la liste est paginée (cahier de la recherche, « plus de 100 résultats »). */
export const PAGE_SIZE = 100

/**
 * Lit le paramètre `groupe` de l'adresse.
 * @param raw Valeur brute de `route.query.groupe` (chaîne, liste ou absente).
 * @returns Le filtre demandé : un groupe de résultats ou `action` ; `all` si la valeur est absente ou inconnue.
 */
export function parseFilter(raw: unknown): PaletteFilter {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'action') return 'action'
  return (GROUP_ORDER as readonly unknown[]).includes(value) ? (value as PaletteFilter) : 'all'
}

/**
 * Filtre effectif : celui de l'adresse s'il a des résultats (il figure parmi les puces), sinon « Tout ».
 * @param requested Filtre demandé par l'adresse.
 * @param chips Puces de filtre de la saisie en cours.
 * @returns Le filtre à appliquer.
 */
export function effectiveFilter(requested: PaletteFilter, chips: readonly FilterChip[]): PaletteFilter {
  return chips.some((c) => c.id === requested) ? requested : 'all'
}

/** Une page de résultats prête à afficher. */
export interface ResultsPage {
  /** Sections de la page : un groupe de résultats par type, puis les actions. */
  readonly sections: readonly PaletteSection[]
  /** Nombre total de résultats du filtre (toutes pages). */
  readonly total: number
  /** Page affichée, à partir de 1 (ramenée dans les bornes). */
  readonly page: number
  /** Nombre de pages. */
  readonly pageCount: number
  /** Rang (à partir de 1) du premier résultat de la page. */
  readonly first: number
  /** Rang du dernier résultat de la page. */
  readonly last: number
}

/**
 * Découpe les résultats d'un filtre en pages et construit les sections de la page demandée.
 * Les résultats sont aplatis dans l'ordre d'affichage (groupes dans l'ordre de `GROUP_ORDER`, puis actions pour « Tout » et « Actions »),
 * tranchés par `PAGE_SIZE`, puis regroupés : un groupe coupé entre deux pages garde son titre sur chacune, avec son total complet.
 * @param response Réponse de `search` avec tous les résultats de chaque groupe (`perGroup: Infinity`).
 * @param actions Actions trouvées, toutes (`searchActions(q, Infinity)`).
 * @param query Saisie brute, pour le surlignage.
 * @param filter Filtre effectif.
 * @param page Page demandée, à partir de 1.
 * @returns La page.
 */
export function buildResultsPage(response: SearchResponse, actions: ActionGroupResult, query: string, filter: PaletteFilter, page: number): ResultsPage {
  const groups: readonly SearchGroupResult[] = filter === 'all' ? response.groups : response.groups.filter((g) => g.group === filter)
  const withActions = filter === 'all' || filter === 'action'
  const shownActions = withActions ? actions.hits : []

  const total = groups.reduce((sum, g) => sum + g.hits.length, 0) + shownActions.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (current - 1) * PAGE_SIZE
  const end = Math.min(total, start + PAGE_SIZE)

  // Tranche chaque groupe selon sa place dans la liste aplatie.
  const sliced: SearchGroupResult[] = []
  const totals = new Map<string, number>()
  let offset = 0
  for (const g of groups) {
    const from = Math.max(0, start - offset)
    const to = Math.min(g.hits.length, end - offset)
    if (to > from) {
      // `total` = longueur de la tranche : la palette n'ajoute ainsi aucune ligne « Voir les N » ; le vrai total est remis sur le titre ensuite.
      const hits = g.hits.slice(from, to)
      sliced.push({ ...g, total: hits.length, hits })
      totals.set(`g-${g.group}`, g.total)
    }
    offset += g.hits.length
  }
  const actionFrom = Math.max(0, start - offset)
  const actionTo = Math.min(shownActions.length, end - offset)
  const pageActions: ActionGroupResult = { total: actions.total, hits: actionTo > actionFrom ? shownActions.slice(actionFrom, actionTo) : [] }

  const sections = buildResultSections({ ...response, groups: sliced }, pageActions, query, filter).map((s) =>
    totals.has(s.id) ? { ...s, count: totals.get(s.id) ?? s.count } : s,
  )
  return { sections, total, page: current, pageCount, first: total === 0 ? 0 : start + 1, last: end }
}
