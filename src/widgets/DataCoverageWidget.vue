<!-- Corps du widget « couverture des données » (D8, `data-coverage`) : part documentée, estimée et non documentée de chaque sujet. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import CxButton from '../components/ds/CxButton.vue'
import CxCoverageBar from '../components/ds/CxCoverageBar.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxReliabilityBadge from '../components/ds/CxReliabilityBadge.vue'
import CxWhyPanel from '../components/ds/CxWhyPanel.vue'
import { useAnalysisStore } from '../stores/analysis.ts'
import { coverageLines, countsText } from './misc/coverageModel.ts'
import type { WidgetBodyProps } from './types.ts'

/**
 * Corps du widget `data-coverage` (D8 ; calculs.md, « Couverture des données » ; brief § 5.2 D.8). Contrat d'un corps : voir `src/widgets/types.ts`.
 * Une barre par sujet, dans l'ordre du moteur : type d'amélioration par famille d'armes, PV, runes et absorption des rencontres de la frise,
 * PV et absorption de toutes les rencontres. Le décompte vient de `analysis.coverage` ; le widget n'en refait aucun. La barre dit « N sur M documentés » :
 * l'exemple du brief (type d'amélioration des armes de mêlée) s'y lit directement. « Ce que compte chaque barre » explique la règle de chaque ligne,
 * et « Pourquoi ? » ouvre l'explication du moteur (méthode, composantes, données lues).
 */
defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()
const whyOpen = ref(false)

const result = computed(() => analysis.coverage)
const lines = computed(() => coverageLines(result.value.value ?? []))
const bars = computed(() => lines.value.map((l) => l.bar))
</script>

<template>
  <div class="wd-cov">
    <CxEmptyState
      v-if="lines.length === 0"
      title="Aucune donnée à décompter"
      text="Les fichiers d'armes et de boss ne sont pas lus."
    />
    <template v-else>
      <CxCoverageBar :rows="bars" />

      <details class="wd-cov-details">
        <summary>Ce que compte chaque barre</summary>
        <dl class="wd-cov-list">
          <div
            v-for="line in lines"
            :key="line.bar.id"
          >
            <dt>{{ line.bar.label }}</dt>
            <dd>{{ countsText(line) }}</dd>
            <dd class="cx-muted">
              {{ line.explanation }}
            </dd>
          </div>
        </dl>
      </details>

      <div class="wd-cov-foot">
        <CxReliabilityBadge kind="calculated" />
        <span class="cx-muted">Décompte des données chargées, sans pondération.</span>
        <CxButton
          variant="ghost"
          size="sm"
          icon="help"
          :aria-expanded="whyOpen ? 'true' : 'false'"
          @click="whyOpen = !whyOpen"
        >
          Pourquoi ?
        </CxButton>
      </div>
      <div class="wd-cov-why">
        <CxWhyPanel
          v-model:open="whyOpen"
          :explanation="result.explanation"
          :toggle="false"
          subject="cette couverture"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.wd-cov { display: grid; gap: var(--space-3); min-width: 0; }
.wd-cov-details { color: var(--ink-2); font-size: 12px; line-height: 16px; }
.wd-cov-details summary { cursor: pointer; color: var(--ink-2); font-weight: 600; }
.wd-cov-list { display: grid; gap: var(--space-3); margin: var(--space-2) 0 0; }
.wd-cov-list dt { color: var(--ink); font-weight: 600; }
.wd-cov-list dd { margin: 0; }
.wd-cov-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: 12px; line-height: 16px; }
.wd-cov-why :deep(.cx-why) { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: var(--space-3); }
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { .wd-cov-details summary { padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
