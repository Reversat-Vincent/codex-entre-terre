<!-- Champs de la section « Progression » : saisie par étape, par boss vaincus ou par régions atteintes, et étape retenue. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDatasets } from '../../composables/useDatasets.ts'
import { PROGRESS_MODES } from '../../persistence/model.ts'
import type { ProgressMode, StageId } from '../../persistence/model.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { STAGE_LABELS } from '../../ui/labels.ts'
import CxCheckbox from '../ds/CxCheckbox.vue'
import CxReliabilityBadge from '../ds/CxReliabilityBadge.vue'
import CxSegmented from '../ds/CxSegmented.vue'
import type { SegmentedOption } from '../ds/types.ts'
import { PROGRESS_MODE_LABELS, STAGE_OPTIONS, bossChecklist, keysToToggle, regionChecklist } from './criteriaModel.ts'
import type { BossCheck } from './criteriaModel.ts'
import { useCriteriaData } from './useCriteriaData.ts'

/**
 * Progression (design `Main.dc.html`) : trois façons de dire où en est le joueur. « Étape » : cinq segments ; « Boss » : liste à cocher des boss de
 * la frise (cocher bascule la progression en mode « boss vaincus ») ; « Régions » : régions des données atteintes. L'étape retenue est Calculée par
 * le store `analysis` (`calculs.md`, « Étape courante »). Les lieux ne sont chargés que pour le mode « Régions ».
 */
const criteria = useCriteriaStore()
const analysis = useAnalysisStore()
const { bossName, locations } = useCriteriaData()

const c = computed(() => criteria.criteria)
const modeOptions: SegmentedOption<ProgressMode>[] = PROGRESS_MODES.map((value) => ({ value, label: PROGRESS_MODE_LABELS[value] }))
const mode = computed({ get: () => c.value.progress.mode, set: (v: ProgressMode) => criteria.set({ progress: { mode: v } }) })
const stage = computed({ get: () => c.value.progress.stage, set: (v: StageId) => criteria.set({ progress: { stage: v } }) })

const locationsState = useDatasets(() => (c.value.progress.mode === 'region' ? ['locations'] : []))

const bosses = computed(() => (analysis.timeline === null ? null : bossChecklist(analysis.timeline, bossName.value, c.value.content.sote)))
const regions = computed(() => regionChecklist(locations.value, c.value.progress.regions, c.value.content.sote))

/** Coche ou décoche un boss : une bascule du store par rencontre concernée (le mode passe à « boss »). */
function toggleBoss(item: BossCheck): void {
  for (const key of keysToToggle(item, c.value.progress.defeated)) criteria.toggleDefeated(key)
}
function toggleRegion(name: string): void {
  const current = c.value.progress.regions
  criteria.set({ progress: { regions: current.includes(name) ? current.filter((r) => r !== name) : [...current, name] } })
}

const stageName = computed(() => (analysis.stage.value === null ? 'Non calculée' : STAGE_LABELS[analysis.stage.value]))
const stageWhy = computed(() => {
  if (c.value.progress.mode === 'stage') return 'choisie'
  if (c.value.progress.mode === 'region') return 'd’après les régions atteintes'
  const next = analysis.nextBoss
  return next === null ? 'histoire terminée' : `prochain boss : ${bossName.value(next.node.boss) ?? next.node.boss}`
})
</script>

<template>
  <CxSegmented
    v-model="mode"
    :options="modeOptions"
    label="Mode de progression"
    full
  />
  <CxSegmented
    v-if="c.progress.mode === 'stage'"
    v-model="stage"
    :options="STAGE_OPTIONS"
    label="Étape actuelle"
    full
  />
  <template v-else-if="c.progress.mode === 'boss'">
    <div
      v-if="bosses"
      class="cx-crit-checks"
      role="group"
      aria-label="Boss vaincus"
    >
      <CxCheckbox
        v-for="item in bosses"
        :key="item.id"
        :model-value="item.checked"
        :label="item.label"
        @update:model-value="toggleBoss(item)"
      />
    </div>
    <p
      v-else
      class="cx-muted"
    >
      Chargement des boss…
    </p>
  </template>
  <template v-else>
    <div
      v-if="regions.length > 0"
      class="cx-crit-checks"
      role="group"
      aria-label="Régions atteintes"
    >
      <CxCheckbox
        v-for="region in regions"
        :key="region.name"
        :model-value="region.checked"
        :label="region.name"
        :meta="STAGE_LABELS[region.stage]"
        @update:model-value="toggleRegion(region.name)"
      />
    </div>
    <p
      v-else
      class="cx-muted"
    >
      {{ locationsState.status.value === 'error' ? 'Les régions n’ont pas pu être chargées.' : 'Chargement des régions…' }}
    </p>
  </template>
  <div class="cx-crit-derived">
    Étape retenue <b>{{ stageName }}</b>
    <CxReliabilityBadge kind="calculated" />
    <span class="cx-muted">{{ stageWhy }}</span>
  </div>
</template>

<style>
.cx-crit-checks { display: grid; grid-template-columns: minmax(0, 1fr); }
</style>
