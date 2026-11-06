<!-- Section de la page Recherche : titre (libellé et total) puis liste de lignes. -->
<script setup lang="ts">
import { useId } from 'vue'
import { formatInt } from '../../../ui/format.ts'
import type { PaletteRow, PaletteSection } from '../../ds/commandPaletteModel.ts'
import SearchResultRow from './SearchResultRow.vue'

/**
 * Groupe de lignes sous un titre `h2` (résultats d'un type, actions, recherches récentes, suggestions…). Le composant relaie le choix d'une ligne ;
 * il ne calcule rien.
 */
defineProps<{
  /** Section construite par `commandPaletteModel.ts` ou `searchPageModel.ts`. */
  section: PaletteSection
}>()

const emit = defineEmits<{
  /** Une ligne est choisie. */
  pick: [row: PaletteRow]
}>()

const uid = useId()
</script>

<template>
  <section
    class="s-sec"
    :aria-labelledby="`${uid}-h`"
  >
    <h2
      :id="`${uid}-h`"
      class="s-sec-h"
    >
      <span>{{ section.label }}</span>
      <span
        v-if="section.count !== null"
        class="cx-muted s-sec-n"
      >{{ formatInt(section.count) }}</span>
    </h2>
    <ul class="s-sec-list">
      <li
        v-for="row in section.rows"
        :key="row.key"
      >
        <SearchResultRow
          :row="row"
          @pick="emit('pick', $event)"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.s-sec { display: grid; gap: var(--space-1); }
.s-sec-h { display: flex; align-items: baseline; gap: var(--space-2); padding: 0 var(--space-3); color: var(--ink-3); font: 600 12px/16px var(--font-sans); letter-spacing: .01em; }
.s-sec-n { font-variant-numeric: tabular-nums; }
.s-sec-list { display: grid; gap: 2px; }
</style>
