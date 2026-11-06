<!-- Pagination de la page Recherche : plage affichée, page précédente et suivante. -->
<script setup lang="ts">
import { formatInt } from '../../../ui/format.ts'
import CxButton from '../../ds/CxButton.vue'

/**
 * Commandes de pagination au-delà de 100 résultats. Le composant n'a pas d'état : il émet la page demandée, la vue la garde.
 */
defineProps<{
  /** Page affichée, à partir de 1. */
  page: number
  /** Nombre de pages. */
  pageCount: number
  /** Rang du premier résultat de la page. */
  first: number
  /** Rang du dernier résultat de la page. */
  last: number
  /** Nombre total de résultats. */
  total: number
}>()

const emit = defineEmits<{
  /** Page demandée. */
  go: [page: number]
}>()
</script>

<template>
  <nav
    class="s-pager"
    aria-label="Pages de résultats"
  >
    <CxButton
      icon="chev-l"
      :disabled="page <= 1"
      @click="emit('go', page - 1)"
    >
      Précédent
    </CxButton>
    <span class="cx-ink2 s-pager-n">
      Résultats {{ formatInt(first) }} à {{ formatInt(last) }} sur {{ formatInt(total) }} · page {{ page }} sur {{ pageCount }}
    </span>
    <CxButton
      icon="chev-r"
      :disabled="page >= pageCount"
      @click="emit('go', page + 1)"
    >
      Suivant
    </CxButton>
  </nav>
</template>

<style scoped>
.s-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--line); }
.s-pager-n { font-size: 13px; line-height: 18px; font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
  .s-pager-n { order: -1; flex: 1 0 100%; }
  .s-pager > .cx-btn { flex: 1 1 0; justify-content: center; }
}
</style>
