<!-- Facettes d'un catalogue branchées sur le store des catalogues : colonne latérale (tablette, desktop) ou contenu de la feuille (mobile). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogKey } from '../../../catalog/registry.ts'
import { useCatalogsStore } from '../../../stores/catalogs.ts'
import CxFacetFilters from '../../ds/CxFacetFilters.vue'

/**
 * Facettes du catalogue : options à cocher avec compteurs, « Inclure les estimations » et « Prérequis atteints ».
 * Les facettes, leurs compteurs et les estimations sont ceux du store (`facets`, `estimates`) ; chaque action lui est renvoyée telle quelle.
 * Les puces des filtres actifs sont dans la barre d'outils des résultats, pas ici.
 */
const props = defineProps<{ catalog: CatalogKey }>()

const store = useCatalogsStore()
const state = computed(() => store.stateOf(props.catalog))
</script>

<template>
  <CxFacetFilters
    :facets="store.facets(catalog)"
    :filters="state.filters"
    :estimates="store.estimates(catalog)"
    :show-chips="false"
    @toggle="(facet, value) => store.toggleFilter(catalog, facet, value)"
    @update:include-estimates="(include) => store.setIncludeEstimates(catalog, include)"
  />
</template>
