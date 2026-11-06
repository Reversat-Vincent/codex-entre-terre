<!-- Puces des critères actifs, en tête du tableau de bord et du plein écran du widget A ; sur mobile, avec le bouton « Critères ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint.ts'
import { useCriteriaPanel } from '../../composables/useCriteriaPanel.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import CxButton from '../ds/CxButton.vue'
import CxCriteriaChips from '../ds/CxCriteriaChips.vue'
import { chipViews } from './criteriaModel.ts'
import { useCriteriaData } from './useCriteriaData.ts'

/**
 * Résumé des critères actifs (note `spec-main` : « les puces résument les critères actifs : la croix retire un critère facultatif, un clic ouvre
 * le panneau »). Les puces structurées viennent du store `analysis` ; le texte est composé ici (`chipViews`). Retirer un critère applique son
 * correctif au store `criteria` ; un clic demande l'ouverture de la section correspondante. Sur mobile, un bouton « Critères » ouvre la feuille.
 */
const analysis = useAnalysisStore()
const criteria = useCriteriaStore()
const { isMobile } = useBreakpoint()
const { openOverlay, requestSection } = useCriteriaPanel()
const { entityName } = useCriteriaData()

const views = computed(() => chipViews(analysis.chips, { originName: (ref) => entityName.value(ref) }))
const chips = computed(() => views.value.map((v) => v.chip))

function open(id: string): void {
  const view = views.value.find((v) => v.chip.id === id)
  if (view) requestSection(view.section)
}
function remove(id: string): void {
  const reset = views.value.find((v) => v.chip.id === id)?.reset
  if (reset) criteria.set(reset)
}
</script>

<template>
  <div class="cx-crit-chipsbar">
    <CxCriteriaChips
      :chips="chips"
      @open="open"
      @remove="remove"
    />
    <CxButton
      v-if="isMobile"
      icon="sliders"
      aria-haspopup="dialog"
      @click="openOverlay"
    >
      Critères
    </CxButton>
  </div>
</template>

<style>
.cx-crit-chipsbar { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.cx-crit-chipsbar > .cx-criteria-chips { flex: 1 1 auto; min-width: 0; }
.cx-crit-chipsbar > .cx-btn { flex: none; }
</style>
