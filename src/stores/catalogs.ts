// Store des catalogues (docs/architecture.md § 6) : par catalogue, filtres actifs (ordre d'ajout), « Inclure les estimations », recherche par nom, tri et page.
// État non persisté : il survit à la navigation, pas au rechargement. La logique de filtrage, de tri et de pagination est dans `src/catalog/` ;
// le store la branche sur les données (`data`) et sur le profil actif (`criteria`) pour « Prérequis atteints ».

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { CATALOG_SPECS, filterByName } from '../catalog/registry.ts'
import type { CatalogKey, CatalogRow, CatalogSpec, ProfileContext } from '../catalog/registry.ts'
import { computeCatalog, describeFilter, relaxations, toggleFilter as toggleActiveFilter } from '../catalog/facets.ts'
import type { ActiveFilter, CatalogDef, CatalogState, FacetState } from '../catalog/facets.ts'
import { paginate } from '../catalog/paginate.ts'
import type { Page } from '../catalog/paginate.ts'
import { sortRows, toggleSort } from '../catalog/sort.ts'
import type { SortKey } from '../catalog/sort.ts'
import type { FileKey } from '../data/datasets.ts'
import { useCriteriaStore } from './criteria.ts'
import { useDataStore } from './data.ts'

export { CATALOG_KEYS, catalogKeyOfRoute } from '../catalog/registry.ts'
export type { CatalogKey } from '../catalog/registry.ts'

/** Longueur maximale de la recherche par nom (même borne que les chaînes persistées, docs/architecture.md § 7). */
export const SEARCH_MAX_LENGTH = 200

/** État d'interface d'un catalogue. */
export interface CatalogUiState {
  /** Filtres actifs, dans l'ordre d'ajout. */
  readonly filters: readonly ActiveFilter[]
  /** Case « Inclure les estimations » (cochée par défaut). */
  readonly includeEstimates: boolean
  /** Recherche par nom dans le catalogue, telle que saisie. */
  readonly search: string
  /** Critères de tri : principal en premier, puis secondaires. */
  readonly sort: readonly SortKey[]
  /** Page demandée, à partir de 1 (ramenée dans les bornes à la lecture). */
  readonly page: number
}

/** Tri d'un catalogue neuf : par nom, croissant. */
export const DEFAULT_SORT: readonly SortKey[] = [{ column: 'name', direction: 'asc' }]

/** État d'un catalogue qui n'a pas encore été touché. */
function defaultState(): CatalogUiState {
  return { filters: [], includeEstimates: true, search: '', sort: DEFAULT_SORT, page: 1 }
}

/** Puce d'un filtre actif : le filtre et ses libellés français. */
export interface FilterChip {
  readonly filter: ActiveFilter
  /** Libellé de la facette (« Effet passif »). */
  readonly facetLabel: string
  /** Libellé de la valeur (« Saignement »). */
  readonly valueLabel: string
}

/** Suggestion d'élargissement quand rien ne correspond : ce qu'il faut retirer et le nombre de lignes obtenues. */
export type Widening =
  | { readonly kind: 'filter'; readonly chip: FilterChip; readonly count: number }
  | { readonly kind: 'search'; readonly count: number }
  | { readonly kind: 'estimates'; readonly count: number }

/** Étapes calculées d'un catalogue, chacune mémoïsée : un changement de tri ou de page ne refiltre pas. */
interface Pipeline {
  readonly def: CatalogDef<CatalogRow>
  readonly all: ComputedRef<readonly CatalogRow[]>
  readonly searched: ComputedRef<readonly CatalogRow[]>
  readonly filtered: ComputedRef<CatalogState<CatalogRow>>
  readonly sorted: ComputedRef<readonly CatalogRow[]>
  readonly paged: ComputedRef<Page<CatalogRow>>
  readonly suggestions: ComputedRef<readonly Widening[]>
}

/**
 * Store des catalogues.
 * État : un `CatalogUiState` par catalogue (`stateOf(clé)`).
 * Actions : `toggleFilter(clé, facette, valeur)`, `removeFilter(clé, facette, valeur)`, `clearFilters(clé)`, `setIncludeEstimates(clé, oui)`, `setSearch(clé, texte)`,
 * `sortBy(clé, colonne, additif)` (clic ou Maj + clic), `setSort(clé, critères)` (liste émise par un tableau ou « Trier par »), `resetSort(clé)`, `setPage(clé, page)`, `reset(clé)`, `ensure(clé)` (charge les fichiers du catalogue).
 * Tout changement de filtre, de recherche, de tri ou d'estimations ramène à la page 1.
 * Getters (fonctions de la clé) : `status`, `total`, `matches`, `rows` (filtrées et triées), `page` (filtrées, triées, paginées), `facets` (avec compteurs),
 * `estimates`, `hidden`, `chips`, `suggestions`.
 * Prédicats : « Prérequis atteints » applique `checkRequirements` (armes) ou la comparaison INT/FAI/ARC (sorts) aux attributs et à la posture de `criteria` ;
 * « Inclure les estimations » lit `derived.upgrade.reliability === 'estimate'`.
 */
export const useCatalogsStore = defineStore('catalogs', () => {
  const data = useDataStore()
  const criteriaStore = useCriteriaStore()
  const states = ref<Partial<Record<CatalogKey, CatalogUiState>>>({})

  /** Profil lu à la demande par les prédicats : seuls les catalogues qui s'en servent dépendent des attributs et de la posture. */
  function profile(): ProfileContext {
    const c = criteriaStore.criteria
    return { attributes: c.character.attributes, hands: c.style.hands === 2 ? 'two' : 'one' }
  }

  function stateOf(key: CatalogKey): CatalogUiState {
    return states.value[key] ?? defaultState()
  }

  function patch(key: CatalogKey, change: Partial<CatalogUiState>, keepPage = false): void {
    const next = { ...stateOf(key), ...change }
    states.value = { ...states.value, [key]: keepPage ? next : { ...next, page: 1 } }
  }

  // --- Étapes calculées -------------------------------------------------------------------

  const pipelines = new Map<CatalogKey, Pipeline>()

  function pipeline(key: CatalogKey): Pipeline {
    const existing = pipelines.get(key)
    if (existing) return existing
    const spec: CatalogSpec = CATALOG_SPECS[key]
    const def = spec.def(profile)
    const query = () => {
      const s = stateOf(key)
      return { filters: s.filters, includeEstimates: s.includeEstimates }
    }
    const all = computed<readonly CatalogRow[]>(() => spec.datasets.flatMap((d) => (data.dataset(d)?.entries ?? []) as readonly CatalogRow[]))
    const searched = computed(() => filterByName(all.value, stateOf(key).search))
    const filtered = computed(() => computeCatalog(def, searched.value, query()))
    const sorted = computed(() => sortRows(filtered.value.rows, stateOf(key).sort, spec.columns))
    const paged = computed(() => paginate(sorted.value, stateOf(key).page))
    // Évaluées seulement quand l'interface les lit, c'est-à-dire quand rien ne correspond.
    const suggestions = computed<readonly Widening[]>(() => {
      const q = query()
      const out: Widening[] = relaxations(def, searched.value, q).map(({ filter, count }) => ({ kind: 'filter', chip: chipOf(def, filter), count }))
      if (stateOf(key).search.trim() !== '') {
        const count = computeCatalog(def, all.value, q).rows.length
        if (count > 0) out.push({ kind: 'search', count })
      }
      if (def.isEstimate && !q.includeEstimates) {
        const count = computeCatalog(def, searched.value, { ...q, includeEstimates: true }).rows.length
        if (count > 0) out.push({ kind: 'estimates', count })
      }
      return out.sort((a, b) => b.count - a.count)
    })
    const built: Pipeline = { def, all, searched, filtered, sorted, paged, suggestions }
    pipelines.set(key, built)
    return built
  }

  function chipOf(def: CatalogDef<CatalogRow>, filter: ActiveFilter): FilterChip {
    const label = describeFilter(def, filter)
    return { filter, facetLabel: label.facet, valueLabel: label.value }
  }

  // --- Actions ----------------------------------------------------------------------------

  /** Charge les fichiers du catalogue (idempotent, voir `data.ensure`). */
  function ensure(key: CatalogKey): Promise<void> {
    return data.ensure(CATALOG_SPECS[key].datasets)
  }

  /** Une facette inconnue du catalogue est ignorée : seules celles de la définition peuvent filtrer. */
  function knows(key: CatalogKey, facet: string): boolean {
    return pipeline(key).def.facets.some((f) => f.id === facet)
  }

  /**
   * Ajoute le filtre s'il est absent (en fin de liste, pour l'ordre des puces), le retire sinon.
   * @param key Catalogue.
   * @param facet Identifiant de facette.
   * @param value Valeur de l'option.
   */
  function toggleFilter(key: CatalogKey, facet: string, value: string): void {
    if (!knows(key, facet)) return
    patch(key, { filters: toggleActiveFilter(stateOf(key).filters, facet, value) })
  }

  /** Retire un filtre actif (croix d'une puce) ; sans effet s'il n'est pas actif. */
  function removeFilter(key: CatalogKey, facet: string, value: string): void {
    const filters = stateOf(key).filters
    if (!filters.some((f) => f.facet === facet && f.value === value)) return
    patch(key, { filters: filters.filter((f) => !(f.facet === facet && f.value === value)) })
  }

  /** « Effacer » : retire tous les filtres ; la recherche par nom et la case des estimations restent. */
  function clearFilters(key: CatalogKey): void {
    if (stateOf(key).filters.length > 0) patch(key, { filters: [] })
  }

  /** Coche ou décoche « Inclure les estimations ». */
  function setIncludeEstimates(key: CatalogKey, include: boolean): void {
    patch(key, { includeEstimates: include })
  }

  /** Règle la recherche par nom (coupée à `SEARCH_MAX_LENGTH`) ; une saisie vide l'efface. */
  function setSearch(key: CatalogKey, text: string): void {
    patch(key, { search: text.slice(0, SEARCH_MAX_LENGTH) })
  }

  /**
   * Clic sur un en-tête de colonne (`toggleSort`) : tri principal, ou tri secondaire avec Maj. Une colonne inconnue du catalogue est ignorée.
   * @param key Catalogue.
   * @param column Identifiant de colonne (clé de `CATALOG_SPECS[clé].columns`).
   * @param additive Vrai si Maj était enfoncée.
   */
  function sortBy(key: CatalogKey, column: string, additive = false): void {
    if (!Object.hasOwn(CATALOG_SPECS[key].columns, column)) return
    patch(key, { sort: toggleSort(stateOf(key).sort, column, additive) })
  }

  /**
   * Remplace tous les critères de tri (tri émis par `CxDataTable`, choix de « Trier par » avec son sens). Les critères sur une colonne inconnue
   * du catalogue, de sens invalide ou en double (le premier compte) sont écartés ; une liste vide après ce tri revient au tri par défaut,
   * pour que le catalogue garde un ordre stable plutôt que l'ordre des fichiers.
   * @param key Catalogue.
   * @param keys Critères, principal en premier.
   */
  function setSort(key: CatalogKey, keys: readonly SortKey[]): void {
    const columns = CATALOG_SPECS[key].columns
    const seen = new Set<string>()
    const valid: SortKey[] = []
    for (const k of keys) {
      if (!Object.hasOwn(columns, k.column) || (k.direction !== 'asc' && k.direction !== 'desc') || seen.has(k.column)) continue
      seen.add(k.column)
      valid.push({ column: k.column, direction: k.direction })
    }
    patch(key, { sort: valid.length === 0 ? DEFAULT_SORT : valid })
  }

  /** Revient au tri par défaut (nom, croissant). */
  function resetSort(key: CatalogKey): void {
    patch(key, { sort: DEFAULT_SORT })
  }

  /** Change de page ; un nombre non fini ou inférieur à 1 donne la page 1, un excès est ramené à la dernière page à la lecture. */
  function setPage(key: CatalogKey, page: number): void {
    patch(key, { page: Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1 }, true)
  }

  /** Remet le catalogue à son état initial (filtres, recherche, tri, estimations, page). */
  function reset(key: CatalogKey): void {
    const rest = { ...states.value }
    delete rest[key]
    states.value = rest
  }

  // --- Getters ----------------------------------------------------------------------------

  /** État de chargement des fichiers du catalogue. */
  function status(key: CatalogKey): 'loading' | 'ready' | 'error' {
    return data.statusOf(CATALOG_SPECS[key].datasets as readonly FileKey[])
  }

  /** Nombre de lignes du catalogue, avant recherche et filtres. */
  function total(key: CatalogKey): number {
    return pipeline(key).all.value.length
  }

  /** Nombre de lignes qui passent la recherche, les filtres et la case des estimations. */
  function matches(key: CatalogKey): number {
    return pipeline(key).filtered.value.rows.length
  }

  /** Lignes retenues, triées, sans pagination (« Tout afficher »). */
  function rows(key: CatalogKey): readonly CatalogRow[] {
    return pipeline(key).sorted.value
  }

  /** Page courante des lignes retenues et triées, avec ses repères (« 51–100 sur 704 »). */
  function page(key: CatalogKey): Page<CatalogRow> {
    return pipeline(key).paged.value
  }

  /** Facettes avec leurs compteurs (ceux d'une facette ignorent sa propre sélection) ; la recherche par nom s'applique à tous. */
  function facets(key: CatalogKey): readonly FacetState[] {
    return pipeline(key).filtered.value.facets
  }

  /** Option « Inclure les estimations » : lignes estimées parmi celles qui passent les filtres ; `null` si le catalogue n'a pas cette option. */
  function estimates(key: CatalogKey): CatalogState<CatalogRow>['estimates'] {
    return pipeline(key).filtered.value.estimates
  }

  /** Nombre de lignes masquées parce que « Inclure les estimations » est décochée (0 si cochée ou sans estimations). */
  function hidden(key: CatalogKey): number {
    const e = pipeline(key).filtered.value.estimates
    return e && !e.included ? e.count : 0
  }

  /** Puces des filtres actifs, dans l'ordre d'ajout. */
  function chips(key: CatalogKey): readonly FilterChip[] {
    const { def } = pipeline(key)
    return stateOf(key).filters.map((f) => chipOf(def, f))
  }

  /** Suggestions d'élargissement, de la plus fructueuse à la moins fructueuse ; vide s'il y a des résultats. */
  function suggestions(key: CatalogKey): readonly Widening[] {
    const p = pipeline(key)
    return p.filtered.value.rows.length > 0 ? [] : p.suggestions.value
  }

  return {
    states,
    stateOf,
    ensure,
    toggleFilter,
    removeFilter,
    clearFilters,
    setIncludeEstimates,
    setSearch,
    sortBy,
    setSort,
    resetSort,
    setPage,
    reset,
    status,
    total,
    matches,
    rows,
    page,
    facets,
    estimates,
    hidden,
    chips,
    suggestions,
  }
})
