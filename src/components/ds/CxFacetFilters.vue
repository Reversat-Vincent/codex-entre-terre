<!-- Filtres à facettes d'un catalogue : options à cocher avec compteurs, estimations, puces des filtres actifs. -->
<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { ActiveFilter, FacetOptionState, FacetState } from '../../catalog/facets.ts'
import { formatInt } from '../../ui/format.ts'
import CxCheckbox from './CxCheckbox.vue'
import CxFilterChips from './CxFilterChips.vue'
import CxReliabilityBadge from './CxReliabilityBadge.vue'
import CxToggle from './CxToggle.vue'

/**
 * Colonne de filtres d'un catalogue (README du design system, composant FacetFilters ; note `spec-catalog`).
 * Elle affiche la sortie de `computeCatalog` (`src/catalog/facets.ts`) : chaque option a son compteur, une option à 0 reste visible et
 * désactivée (sauf si elle est cochée, pour rester décochable). Plus de cinq options : les cinq plus fréquentes (`total`) et celles qui sont
 * cochées, puis « Voir les N autres ». Les estimations ont leur case « Inclure les estimations » avec le badge Estimation et leur nombre.
 * Les puces des filtres actifs (ordre d'ajout, croix, « Effacer ») s'affichent en tête, ou séparément avec `CxFilterChips` (`showChips` faux).
 * Aucun état de filtre ici : le composant émet, l'appelant applique `toggleFilter` et recalcule.
 */
const props = withDefaults(
  defineProps<{
    /** Facettes avec leurs options et compteurs (`CatalogState.facets`). */
    facets: readonly FacetState[]
    /** Filtres actifs, dans l'ordre d'ajout. */
    filters: readonly ActiveFilter[]
    /** Option « Inclure les estimations » (`CatalogState.estimates`) ; `null` si le catalogue n'a pas d'estimation. */
    estimates?: { readonly count: number; readonly included: boolean } | null
    /** Nombre d'options montrées avant « Voir les N autres » (5). */
    visibleOptions?: number
    /** Affiche les puces des filtres actifs en tête de la colonne. */
    showChips?: boolean
  }>(),
  { estimates: null, visibleOptions: 5, showChips: true },
)

const emit = defineEmits<{
  /** Coche ou décoche une option (identifiant de facette, valeur). */
  toggle: [facet: string, value: string]
  /** Change la case « Inclure les estimations ». */
  'update:includeEstimates': [value: boolean]
  /** Retire un filtre actif depuis sa puce. */
  remove: [facet: string, value: string]
  /** Efface tous les filtres. */
  clear: []
}>()

/** Facettes dont la liste complète est dépliée. */
const unfolded = reactive(new Set<string>())

const chips = computed(() =>
  props.filters.map((f) => {
    const facet = props.facets.find((x) => x.id === f.facet)
    const option = facet?.options.find((o) => o.value === f.value)
    return { facet: f.facet, value: f.value, facetLabel: facet?.label ?? f.facet, valueLabel: option?.label ?? f.value }
  }),
)

const groups = computed(() =>
  props.facets.map((facet) => {
    const limit = props.visibleOptions
    const folded = facet.presentation === 'options' && facet.options.length > limit && !unfolded.has(facet.id)
    let shown: readonly FacetOptionState[] = facet.options
    if (folded) {
      // Les plus fréquentes par `total` (ordre stable des options), plus celles qui sont cochées ; l'ordre d'affichage reste celui des options.
      const keep = new Set(
        facet.options
          .map((o, index) => ({ o, index }))
          .sort((a, b) => b.o.total - a.o.total || a.index - b.index)
          .slice(0, limit)
          .map((x) => x.o.value),
      )
      shown = facet.options.filter((o) => keep.has(o.value) || o.selected)
    }
    return { facet, shown, hidden: facet.options.length - shown.length, canFold: facet.presentation === 'options' && facet.options.length > limit }
  }),
)

/**
 * Libellé du bouton qui déplie les options masquées d'une facette, accordé en nombre.
 * @param hidden Nombre d'options masquées (au moins 1).
 * @returns « Voir l'autre » pour une option, « Voir les N autres » au-delà.
 */
function moreLabel(hidden: number): string {
  return hidden === 1 ? "Voir l'autre" : `Voir les ${hidden} autres`
}

function toggleUnfold(id: string): void {
  if (unfolded.has(id)) unfolded.delete(id)
  else unfolded.add(id)
}
</script>

<template>
  <div class="cx-facets-col">
    <CxFilterChips
      v-if="showChips"
      :chips="chips"
      @remove="(facet, value) => emit('remove', facet, value)"
      @clear="emit('clear')"
    />
    <div class="cx-facets">
      <div
        v-for="group in groups"
        :key="group.facet.id"
        class="cx-facet"
      >
        <template v-if="group.facet.presentation === 'toggle'">
          <CxToggle
            v-for="option in group.facet.options"
            :key="option.value"
            :model-value="option.selected"
            @update:model-value="emit('toggle', group.facet.id, option.value)"
          >
            {{ option.label }}
            <span class="cx-check-meta">{{ formatInt(option.count) }}</span>
          </CxToggle>
        </template>
        <template v-else>
          <div
            :id="`facet-${group.facet.id}`"
            class="cx-facet-h"
          >
            {{ group.facet.label }}
            <span
              v-if="group.facet.selectedCount > 0"
              class="cx-muted"
            >{{ group.facet.selectedCount }} sur {{ group.facet.options.length }}</span>
          </div>
          <CxCheckbox
            v-for="option in group.shown"
            :key="option.value"
            :model-value="option.selected"
            :label="option.label"
            :meta="option.count"
            :disabled="option.disabled"
            @update:model-value="emit('toggle', group.facet.id, option.value)"
          />
          <button
            v-if="group.canFold && (group.hidden > 0 || unfolded.has(group.facet.id))"
            type="button"
            class="cx-facet-more"
            :aria-expanded="unfolded.has(group.facet.id)"
            @click="toggleUnfold(group.facet.id)"
          >
            {{ unfolded.has(group.facet.id) ? 'Voir moins' : moreLabel(group.hidden) }}
          </button>
        </template>
      </div>
      <div
        v-if="estimates"
        class="cx-facet"
      >
        <label class="cx-check">
          <input
            type="checkbox"
            :checked="estimates.included"
            @change="emit('update:includeEstimates', ($event.target as HTMLInputElement).checked)"
          >
          <span>Inclure les estimations</span>
          <span class="cx-check-meta"><CxReliabilityBadge kind="estimate" /> {{ formatInt(estimates.count) }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style>
.cx-facets-col { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.cx-facets { display: flex; flex-direction: column; gap: var(--space-3); }
.cx-facet { display: grid; gap: 2px; padding-top: var(--space-3); border-top: 1px solid var(--line); }
.cx-facet:first-child { border-top: 0; padding-top: 0; }
.cx-facet-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.cx-facet-more { padding: 0; border: 0; background: transparent; color: var(--gold-text); font-size: 12px; font-weight: 600; text-align: left; cursor: pointer; }
</style>
