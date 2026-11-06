<!-- Champs de la section « Contraintes d'obtention » : exclusions et préférence de pierres de forge. -->
<script setup lang="ts">
import { computed } from 'vue'
import { STONE_PREFERENCES } from '../../persistence/model.ts'
import type { StonePreference } from '../../persistence/model.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import CxSegmented from '../ds/CxSegmented.vue'
import CxToggle from '../ds/CxToggle.vue'
import type { SegmentedOption } from '../ds/types.ts'
import { EXCLUSION_LABELS, STONE_LABELS } from './criteriaModel.ts'

/**
 * Contraintes d'obtention (design `Main.dc.html`) : exclure les échanges de Remembrance, les butins aléatoires à farmer et les objets de quêtes de PNJ,
 * et préférer les pierres de forge normales ou sombres. Chaque choix s'écrit aussitôt dans le store `criteria`.
 */
const criteria = useCriteriaStore()
const c = computed(() => criteria.criteria.constraints)

const remembrance = computed({ get: () => c.value.excludeRemembrance, set: (v: boolean) => criteria.set({ constraints: { excludeRemembrance: v } }) })
const randomDrop = computed({ get: () => c.value.excludeRandomDrop, set: (v: boolean) => criteria.set({ constraints: { excludeRandomDrop: v } }) })
const quest = computed({ get: () => c.value.excludeQuest, set: (v: boolean) => criteria.set({ constraints: { excludeQuest: v } }) })
const stones = computed({ get: () => c.value.stonePreference, set: (v: StonePreference) => criteria.set({ constraints: { stonePreference: v } }) })

const stoneOptions: SegmentedOption<StonePreference>[] = STONE_PREFERENCES.map((value) => ({ value, label: STONE_LABELS[value] }))
</script>

<template>
  <div>
    <CxToggle
      v-model="remembrance"
      :label="EXCLUSION_LABELS.remembrance"
    />
    <CxToggle
      v-model="randomDrop"
      :label="EXCLUSION_LABELS['random-drop']"
    />
    <CxToggle
      v-model="quest"
      :label="EXCLUSION_LABELS.quest"
    />
  </div>
  <div class="cx-crit-field">
    <span>Pierres de forge préférées</span>
    <CxSegmented
      v-model="stones"
      :options="stoneOptions"
      label="Pierres préférées"
      full
    />
  </div>
</template>
