<!-- Corps du widget « rendement des attributs » (D23, `attribute-yield`) : valeur des PV, FP, endurance et charge par niveau d'attribut, gain du point suivant et paliers. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxReliabilityBadge from '../components/ds/CxReliabilityBadge.vue'
import CxSegmented from '../components/ds/CxSegmented.vue'
import CxWhyPanel from '../components/ds/CxWhyPanel.vue'
import type { SegmentedOption } from '../components/ds/types.ts'
import type { YieldStat } from '../engine/attributeYield.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import type { WidgetBodyProps } from './types.ts'
import YieldStatPanel from './yield/YieldStatPanel.vue'
import { STAT_META } from './yield/yieldModel.ts'

/**
 * Corps du widget `attribute-yield` (D23 ; calculs.md, « Rendement des attributs »). Contrat d'un corps : voir `src/widgets/types.ts`.
 * - `dashboard` : une statistique à la fois (PV, FP, endurance, charge), choisie par un sélecteur.
 * - `fullscreen` : les quatre statistiques, un panneau chacune. Le store ne fournit pas d'échelle normalisée (PV, FP, endurance et charge n'ont ni la
 *   même unité ni le même ordre de grandeur) : un graphique par statistique plutôt qu'un graphique commun.
 * Les courbes, gains et paliers viennent de `analysis.attributeYield` ; le widget n'en calcule aucun. « Pourquoi ? » ouvre l'explication du moteur
 * (elle couvre les quatre statistiques, le moteur produit un seul `Calc`).
 */
const props = defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()

const result = computed(() => analysis.attributeYield)
const curves = computed(() => result.value?.value ?? [])
const isFullscreen = computed(() => props.mode === 'fullscreen')

const stat = ref<YieldStat>('hp')
const options: SegmentedOption<YieldStat>[] = STAT_META.map((m) => ({ value: m.stat, label: m.label, title: m.name }))
const selected = computed(() => curves.value.find((c) => c.stat === stat.value) ?? curves.value[0] ?? null)

const whyOpen = ref(false)
</script>

<template>
  <div
    class="wd-yield"
    :data-mode="mode"
  >
    <CxEmptyState
      v-if="result === null || curves.length === 0"
      title="Rendement des attributs indisponible"
      text="Les tables de calcul (PV, FP, endurance, charge) ne sont pas lues."
    />
    <template v-else>
      <CxSegmented
        v-if="!isFullscreen"
        v-model="stat"
        :options="options"
        label="Statistique affichée"
      />

      <YieldStatPanel
        v-if="!isFullscreen && selected !== null"
        :key="selected.stat"
        :curve="selected"
        @why="whyOpen = true"
      />
      <div
        v-else-if="isFullscreen"
        class="wd-yield-grid"
      >
        <YieldStatPanel
          v-for="curve in curves"
          :key="curve.stat"
          :curve="curve"
          heading
          @why="whyOpen = true"
        />
      </div>

      <div class="wd-yield-foot">
        <CxReliabilityBadge kind="calculated" />
        <span class="cx-muted">Valeurs de base des tables du wiki : ni talismans, ni armure, ni Great Runes.</span>
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
      <div class="wd-yield-why">
        <CxWhyPanel
          v-model:open="whyOpen"
          :explanation="result.explanation"
          :toggle="false"
          subject="ces gains"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.wd-yield { display: grid; gap: var(--space-3); min-width: 0; }
.wd-yield-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--space-5) var(--space-6); min-width: 0; }
.wd-yield-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: 12px; line-height: 16px; }
.wd-yield-why :deep(.cx-why) { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: var(--space-3); }
</style>
