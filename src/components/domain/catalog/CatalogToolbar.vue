<!-- Barre d'outils d'un catalogue : recherche par nom, puces des filtres actifs, compteur de résultats, choix des colonnes et « Trier par ». -->
<script setup lang="ts">
import { computed, useId } from 'vue'
import type { CatalogKey } from '../../../catalog/registry.ts'
import type { SortKey } from '../../../catalog/sort.ts'
import type { FilterChip } from '../../../stores/catalogs.ts'
import { formatInt } from '../../../ui/format.ts'
import CxButton from '../../ds/CxButton.vue'
import CxFilterChips from '../../ds/CxFilterChips.vue'
import CxSelect from '../../ds/CxSelect.vue'
import CatalogColumnsMenu from './CatalogColumnsMenu.vue'
import { CATALOG_INFO, columnsOf, sortChoices } from './catalogModel.ts'

/**
 * Barre d'outils au-dessus des résultats (design `Catalogue.dc.html`, `.p-tool`). Aucun état propre : tout vient de la vue, qui applique les actions au store.
 * - Puces des filtres actifs dans l'ordre d'ajout, avec « Effacer » (qui n'efface que les filtres, ni la recherche ni les estimations).
 * - Compteur annoncé aux lecteurs d'écran ; « N masquées par vos critères » quand les estimations sont décochées.
 * - « Trier par » reprend le tri principal ; le bouton à côté inverse son sens.
 */
const props = defineProps<{
  catalog: CatalogKey
  chips: readonly FilterChip[]
  /** Recherche par nom en cours. */
  search: string
  /** Lignes qui passent la recherche et les filtres. */
  matches: number
  /** Lignes du catalogue. */
  total: number
  /** Lignes masquées parce que « Inclure les estimations » est décochée. */
  hidden: number
  /** Tri en cours, principal en premier. */
  sort: readonly SortKey[]
  /** Mode tableau : le menu « Colonnes » n'a de sens que là. */
  table: boolean
  /** Identifiants des colonnes affichées. */
  shownColumns: readonly string[]
}>()

const emit = defineEmits<{
  'update:search': [text: string]
  remove: [facet: string, value: string]
  clear: []
  /** « Trier par » : colonne choisie. */
  sort: [column: string]
  /** Inverse le sens du tri principal. */
  flip: []
  'toggle-column': [id: string]
  'reset-columns': []
}>()

const uid = useId()
const info = computed(() => CATALOG_INFO[props.catalog])
const choices = computed(() => sortChoices(props.catalog))
const primary = computed(() => props.sort[0] ?? null)
const chipRows = computed(() =>
  props.chips.map((c) => ({ facet: c.filter.facet, value: c.filter.value, facetLabel: c.facetLabel, valueLabel: c.valueLabel })),
)
const options = computed(() => choices.value.map((c) => ({ value: c.column, label: c.label })))
const sortModel = computed({
  get: () => primary.value?.column ?? 'name',
  set: (column: string) => emit('sort', column),
})
const optionalColumns = computed(() => columnsOf(props.catalog).filter((c) => c.id !== 'name'))
const direction = computed(() => (primary.value?.direction === 'desc' ? 'décroissant' : 'croissant'))

const countText = computed(() => {
  const noun = props.matches > 1 ? info.value.plural : info.value.singular
  const shown = props.matches > 1 ? 'affichés' : 'affiché'
  const agreed = info.value.feminine ? shown.replace('é', 'ée') : shown
  const base = `${formatInt(props.matches)} ${noun} ${agreed} sur ${formatInt(props.total)}`
  return props.hidden > 0 ? `${base} · ${formatInt(props.hidden)} ${props.hidden > 1 ? 'masquées' : 'masquée'} par vos critères` : base
})
</script>

<template>
  <div class="cat-toolbar">
    <CxFilterChips
      :chips="chipRows"
      @remove="(facet, value) => emit('remove', facet, value)"
      @clear="emit('clear')"
    />
    <div class="cat-tool">
      <div class="cat-search">
        <label
          class="cx-sr"
          :for="`${uid}-search`"
        >Rechercher dans ce catalogue</label>
        <input
          :id="`${uid}-search`"
          class="cx-input"
          type="search"
          autocomplete="off"
          placeholder="Rechercher par nom"
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <span
        class="cat-count"
        role="status"
      >{{ countText }}</span>
      <CatalogColumnsMenu
        v-if="table"
        :columns="optionalColumns"
        :shown="shownColumns"
        @toggle="(id) => emit('toggle-column', id)"
        @reset="emit('reset-columns')"
      />
      <label
        class="cx-label cat-sort-label"
        :for="`${uid}-sort`"
      >Trier par</label>
      <CxSelect
        :id="`${uid}-sort`"
        v-model="sortModel"
        :options="options"
      />
      <CxButton
        size="sm"
        variant="ghost"
        icon-only
        :icon="primary?.direction === 'desc' ? 'chev-d' : 'chev-u'"
        :label="`Sens du tri : ${direction}. Inverser`"
        @click="emit('flip')"
      />
    </div>
  </div>
</template>

<style>
.cat-toolbar { display: grid; gap: var(--space-2); }
.cat-tool { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.cat-search { flex: 0 1 220px; min-width: 150px; }
/* `.cx-input` n'est pas dans la copie des styles du design system : le champ reprend ses tokens (bundle.css, .cx-input). */
.cat-search .cx-input { width: 100%; height: var(--size-controle); padding: 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink); font-size: 13px; min-width: 0; }
@media (max-width: 767px) { .cat-search .cx-input { height: var(--size-cible); } }
.cat-count { margin-left: auto; color: var(--ink-3); font-size: 13px; font-variant-numeric: tabular-nums; }
.cat-sort-label { margin: 0; }
@media (max-width: 767px) {
  .cat-search { flex: 1 1 100%; }
  .cat-count { flex-basis: 100%; margin-left: 0; }
}
</style>
