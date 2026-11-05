<!-- Puces des filtres actifs d'un catalogue, dans l'ordre d'ajout, avec une croix par puce et « Effacer ». -->
<script setup lang="ts">
import CxButton from './CxButton.vue'
import CxChip from './CxChip.vue'

/**
 * Rappel des filtres actifs au-dessus des résultats (README du design system, composant FacetFilters ; note `spec-catalog`).
 * Les libellés viennent de l'appelant (`describeFilter` de `src/catalog/facets.ts`) ; l'ordre est celui de l'ajout. Aucun état propre.
 */
defineProps<{
  /** Une puce par filtre actif, dans l'ordre d'ajout. */
  chips: readonly { facet: string; value: string; facetLabel: string; valueLabel: string }[]
}>()

const emit = defineEmits<{
  /** Retire un filtre (identifiant de facette et valeur). */
  remove: [facet: string, value: string]
  /** Efface tous les filtres. */
  clear: []
}>()
</script>

<template>
  <div
    v-if="chips.length > 0"
    class="cx-row tight"
    role="group"
    aria-label="Filtres actifs"
  >
    <CxChip
      v-for="chip in chips"
      :key="`${chip.facet}:${chip.value}`"
      active
      :remove-label="`Retirer le filtre ${chip.facetLabel} : ${chip.valueLabel}`"
      @remove="emit('remove', chip.facet, chip.value)"
    >
      {{ chip.valueLabel }}
    </CxChip>
    <CxButton
      variant="ghost"
      size="sm"
      @click="emit('clear')"
    >
      Effacer
    </CxButton>
  </div>
</template>
