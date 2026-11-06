<!-- Écran des catalogues : une seule vue pour les 17 catalogues, pilotée par la route (armes par famille, objets par type, un catalogue pour chaque autre genre). -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATALOG_SPECS } from '../catalog/registry.ts'
import type { CatalogKey, CatalogRow } from '../catalog/registry.ts'
import type { SortKey } from '../catalog/sort.ts'
import CatalogCell from '../components/domain/catalog/CatalogCell.vue'
import CatalogEmpty from '../components/domain/catalog/CatalogEmpty.vue'
import CatalogFacets from '../components/domain/catalog/CatalogFacets.vue'
import CatalogGrid from '../components/domain/catalog/CatalogGrid.vue'
import CatalogToolbar from '../components/domain/catalog/CatalogToolbar.vue'
import {
  CATALOG_INFO,
  catalogIntro,
  catalogRoute,
  columnsOf,
  defaultColumnIds,
  familyOf,
  rowHeightOf,
  sortChoices,
  visibleColumns,
} from '../components/domain/catalog/catalogModel.ts'
import CxButton from '../components/ds/CxButton.vue'
import CxDataTable from '../components/ds/CxDataTable.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSegmented from '../components/ds/CxSegmented.vue'
import CxSheet from '../components/ds/CxSheet.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import CxTabs from '../components/ds/CxTabs.vue'
import type { SegmentedOption, TabItem, TableColumn } from '../components/ds/types.ts'
import { useBreakpoint } from '../composables/useBreakpoint.ts'
import { useDatasets } from '../composables/useDatasets.ts'
import { usePageTitle } from '../composables/usePageTitle.ts'
import { catalogKeyOfRoute, useCatalogsStore } from '../stores/catalogs.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { useDataStore } from '../stores/data.ts'
import { usePreferencesStore } from '../stores/preferences.ts'
import { useProfilesStore } from '../stores/profiles.ts'
import { formatInt } from '../ui/format.ts'

/**
 * Catalogue d'un genre d'entité (brief § 6, docs/architecture.md § 9, écran `Catalogue.dc.html`, note `spec-catalog`).
 * La clé du catalogue vient de la route (`catalogKeyOfRoute`) ; filtres, recherche, tri et page sont dans le store `catalogs`, l'affichage (tableau ou grille)
 * et les colonnes choisies dans `preferences`, par catalogue. Cette vue relie ces états aux composants : elle ne filtre, ne trie ni ne pagine elle-même
 * (`CxDataTable` applique le tri et la pagination du tableau avec les mêmes fonctions que le store, voir `tableSort`).
 */
const route = useRoute()
const router = useRouter()
const store = useCatalogsStore()
const prefs = usePreferencesStore()
const profiles = useProfilesStore()
const analysis = useAnalysisStore()
const data = useDataStore()
const { isMobile } = useBreakpoint()

const key = computed<CatalogKey>(() => {
  const query = route.query.famille ?? route.query.type
  return catalogKeyOfRoute(String(route.name), typeof query === 'string' ? query : null) ?? 'weapons:melee'
})
const info = computed(() => CATALOG_INFO[key.value])
const state = computed(() => store.stateOf(key.value))
const { status, failed, retry } = useDatasets(() => CATALOG_SPECS[key.value].datasets)
usePageTitle(() => info.value.title)

// Les onglets de la famille affichent le nombre d'entités de chaque catalogue : leurs fichiers sont demandés aussi.
const family = computed(() => familyOf(key.value))
watch(
  family,
  (keys) => {
    for (const k of keys) void store.ensure(k)
  },
  { immediate: true },
)

// --- Profil : les prérequis sont comparés par `analysis.requirementsOf`, que lisent les cellules -----------------------
const comparesProfile = computed(() => info.value.family === 'weapons' || key.value === 'spells')
const profileLine = computed(() => {
  const level = analysis.level.value
  const name = profiles.active?.name
  const who = name ? `profil « ${name} »` : 'vos critères'
  return `Prérequis comparés à ${who}${level === null ? '' : ` (niveau ${formatInt(level)})`}`
})

// --- Titre et onglets ---------------------------------------------------------------------------------------------
const intro = computed(() => {
  const dataset = data.dataset(CATALOG_SPECS[key.value].datasets[0] as never) as { meta?: { counts_by_source?: unknown } } | null
  return status.value === 'ready' ? catalogIntro(key.value, store.total(key.value), dataset?.meta?.counts_by_source) : ''
})
const tabs = computed<TabItem[]>(() =>
  family.value.map((k) => ({ id: k, label: CATALOG_INFO[k].tab ?? CATALOG_INFO[k].title, note: store.status(k) === 'ready' ? formatInt(store.total(k)) : undefined })),
)
const tab = computed({
  get: (): string => key.value,
  set: (next: string) => void router.push(catalogRoute(next as CatalogKey)),
})

// --- Affichage et colonnes ----------------------------------------------------------------------------------------
const viewOptions: readonly SegmentedOption<'table' | 'grid'>[] = [
  { value: 'table', label: 'Tableau' },
  { value: 'grid', label: 'Grille' },
]
const view = computed({
  get: () => prefs.viewOf(key.value),
  set: (next: 'table' | 'grid') => prefs.setCatalogView(key.value, next),
})
const chosenColumns = computed(() => (Object.hasOwn(prefs.catalogColumns, key.value) ? prefs.catalogColumns[key.value] : undefined))
const shown = computed(() => visibleColumns(key.value, chosenColumns.value))
const shownIds = computed(() => shown.value.map((c) => c.id))

function toggleColumn(id: string): void {
  const current = new Set(chosenColumns.value ?? defaultColumnIds(key.value))
  if (!current.delete(id)) current.add(id)
  prefs.setCatalogColumns(
    key.value,
    columnsOf(key.value).filter((c) => current.has(c.id)).map((c) => c.id),
  )
}

const tableColumns = computed<TableColumn<CatalogRow>[]>(() => {
  const accessors = CATALOG_SPECS[key.value].columns
  return shown.value.map((c) => {
    const sortValue = Object.hasOwn(accessors, c.id) ? accessors[c.id] : undefined
    return { id: c.id, label: c.label, align: c.align, sortValue, sortable: sortValue !== undefined }
  })
})

// --- Tri -----------------------------------------------------------------------------------------------------------
// Le store trie déjà les lignes (tri complet, y compris sur une colonne masquée ou « Classe ») ; `CxDataTable` les trie encore avec ses colonnes.
// Il ne reçoit donc les critères que s'il connaît toutes leurs colonnes : sinon il ignorerait les autres et réordonnerait différemment du store.
const tableSort = computed<SortKey[]>(() => {
  const known = new Set(tableColumns.value.filter((c) => c.sortable).map((c) => c.id))
  return state.value.sort.every((k) => known.has(k.column)) ? [...state.value.sort] : []
})

/** Le tableau émet la liste complète des critères (clic, Maj + clic) : le store la remplace telle quelle. */
function onTableSort(next: SortKey[]): void {
  store.setSort(key.value, next)
}

/** « Trier par » : la colonne devient le tri principal, dans son premier sens (croissant pour un texte, décroissant pour un nombre). */
function sortByChoice(column: string): void {
  const first = sortChoices(key.value).find((c) => c.column === column)?.first ?? 'asc'
  store.setSort(key.value, [{ column, direction: first }])
}

/** Inverse le sens du tri principal ; les critères suivants sont conservés. */
function flipSort(): void {
  const [primary, ...rest] = state.value.sort
  if (primary) store.setSort(key.value, [{ column: primary.column, direction: primary.direction === 'asc' ? 'desc' : 'asc' }, ...rest])
}

// --- Résultats -----------------------------------------------------------------------------------------------------
const matches = computed(() => store.matches(key.value))
const filtersOpen = ref(false)
const activeCount = computed(() => state.value.filters.length)
const activeText = computed(() => (activeCount.value === 0 ? 'Aucun actif' : `${activeCount.value} ${activeCount.value > 1 ? 'actifs' : 'actif'}`))
</script>

<template>
  <section
    class="v-catalog"
    :aria-labelledby="'catalog-title'"
  >
    <header class="v-catalog-head">
      <p class="v-catalog-crumb">
        <RouterLink :to="{ name: 'explore' }">
          Explorer
        </RouterLink>
        <CxIcon
          name="chev-r"
          size="xs"
        />
        <span>{{ info.group }}</span>
      </p>
      <div class="v-catalog-title">
        <div>
          <h1
            id="catalog-title"
            class="titre-l"
          >
            {{ info.title }}
          </h1>
          <p
            v-if="intro"
            class="cx-muted v-catalog-intro"
          >
            {{ intro }}
          </p>
          <p
            v-if="comparesProfile && status === 'ready'"
            class="cx-muted v-catalog-profile"
          >
            <CxIcon
              name="user"
              size="sm"
            />{{ profileLine }}
          </p>
        </div>
        <CxSegmented
          v-model="view"
          :options="viewOptions"
          label="Affichage"
        />
      </div>
      <CxTabs
        v-if="tabs.length > 0"
        v-model="tab"
        :items="tabs"
        :label="info.family === 'weapons' ? 'Familles d’armes' : 'Types d’objets'"
      />
    </header>

    <div
      v-if="status === 'loading'"
      class="v-catalog-loading"
      aria-busy="true"
    >
      <CxSkeleton
        width="40%"
        :height="22"
      />
      <CxSkeleton :height="34" />
      <CxSkeleton :height="34" />
      <CxSkeleton
        width="70%"
        :height="34"
      />
    </div>

    <CxNote
      v-else-if="status === 'error'"
      tone="warn"
      title="Impossible de lire ce catalogue."
      role="alert"
    >
      <template v-if="failed.length > 0">
        Fichier concerné : {{ failed.map((f) => f.label).join(', ') }}.
      </template>
      <CxButton
        size="sm"
        icon="refresh"
        @click="retry()"
      >
        Réessayer
      </CxButton>
    </CxNote>

    <div
      v-else
      class="v-catalog-layout"
    >
      <aside
        v-if="!isMobile"
        class="v-catalog-facets"
        aria-label="Filtres"
      >
        <div class="v-catalog-fhead">
          <span><CxIcon
            name="filter"
            size="sm"
          />Filtres</span>
          <span class="cx-muted">{{ activeText }}</span>
        </div>
        <CatalogFacets :catalog="key" />
      </aside>

      <div
        class="v-catalog-results"
        role="region"
        aria-label="Résultats"
      >
        <CxButton
          v-if="isMobile"
          icon="filter"
          :pressed="false"
          aria-haspopup="dialog"
          @click="filtersOpen = true"
        >
          Filtres <span class="cx-muted">{{ activeText }}</span>
        </CxButton>

        <CatalogToolbar
          :catalog="key"
          :chips="store.chips(key)"
          :search="state.search"
          :matches="matches"
          :total="store.total(key)"
          :hidden="store.hidden(key)"
          :sort="state.sort"
          :table="view === 'table'"
          :shown-columns="shownIds"
          @update:search="(text) => store.setSearch(key, text)"
          @remove="(facet, value) => store.removeFilter(key, facet, value)"
          @clear="store.clearFilters(key)"
          @sort="sortByChoice"
          @flip="flipSort"
          @toggle-column="toggleColumn"
          @reset-columns="prefs.setCatalogColumns(key, defaultColumnIds(key))"
        />

        <CatalogEmpty
          v-if="matches === 0"
          :catalog="key"
          :chips="store.chips(key)"
          :search="state.search"
          :estimates-off="!state.includeEstimates"
          :suggestions="store.suggestions(key)"
          @widen="(w) => w.kind === 'filter' ? store.removeFilter(key, w.chip.filter.facet, w.chip.filter.value) : w.kind === 'search' ? store.setSearch(key, '') : store.setIncludeEstimates(key, true)"
          @clear="store.clearFilters(key)"
        />

        <CxDataTable
          v-else-if="view === 'table'"
          :key="key"
          :rows="store.rows(key)"
          :columns="tableColumns"
          :row-key="(row: CatalogRow) => row.id"
          :caption="`${info.title}, ${info.family === 'weapons' ? 'valeurs à +0' : 'valeurs du wiki'}`"
          :row-height="rowHeightOf(key)"
          :sort="tableSort"
          :page="state.page"
          :count-noun="[info.singular, info.plural]"
          @update:sort="onTableSort"
          @update:page="(page) => store.setPage(key, page)"
        >
          <template
            v-for="column in shown"
            :key="column.id"
            #[`cell-${column.id}`]="{ row }"
          >
            <CatalogCell
              :catalog="key"
              :column="column"
              :row="row"
            />
          </template>
        </CxDataTable>

        <CatalogGrid
          v-else
          :key="key"
          :catalog="key"
          :page="store.page(key)"
          @update:page="(page) => store.setPage(key, page)"
        />
      </div>
    </div>

    <CxSheet
      v-if="isMobile"
      v-model="filtersOpen"
      title="Filtres"
    >
      <CatalogFacets :catalog="key" />
      <template #footer>
        <CxButton
          variant="primary"
          @click="filtersOpen = false"
        >
          Voir {{ formatInt(matches) }} {{ matches > 1 ? info.plural : info.singular }}
        </CxButton>
      </template>
    </CxSheet>
  </section>
</template>

<style scoped>
.v-catalog { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; padding: var(--space-5) var(--space-5) var(--space-6); }
.v-catalog-head { display: grid; gap: var(--space-2); }
.v-catalog-crumb { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.v-catalog-title { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.v-catalog-intro { margin: 2px 0 0; font-size: 13px; }
.v-catalog-profile { display: flex; align-items: center; gap: 6px; margin: var(--space-1) 0 0; font-size: 12px; }
.v-catalog-loading { display: grid; gap: var(--space-2); }
.v-catalog-layout { display: flex; align-items: flex-start; gap: var(--space-4); min-width: 0; }
.v-catalog-facets { flex: 0 0 216px; box-sizing: border-box; max-height: calc(100vh - 2 * var(--space-4)); overflow-y: auto; position: sticky; top: var(--space-4); padding: var(--space-3) var(--space-3) var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface); }
.v-catalog-fhead { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-3); color: var(--ink); font-size: 14px; font-weight: 600; }
.v-catalog-fhead > span { display: inline-flex; align-items: center; gap: 6px; }
.v-catalog-fhead .cx-muted { font-size: 12px; font-weight: 400; }
.v-catalog-results { flex: 1 1 0; display: grid; gap: var(--space-3); min-width: 0; }
@media (max-width: 767px) {
  .v-catalog { padding: var(--space-4) var(--space-3) var(--space-5); }
}
</style>
