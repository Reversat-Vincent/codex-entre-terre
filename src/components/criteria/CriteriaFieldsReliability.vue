<!-- Champs de la section « Fiabilité » : inclure ou non les valeurs estimées. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { formatInt } from '../../ui/format.ts'
import CxToggle from '../ds/CxToggle.vue'
import { weaponCounts } from './criteriaModel.ts'
import { useCriteriaData } from './useCriteriaData.ts'

/**
 * Fiabilité (design `Main.dc.html`) : inclure les valeurs estimées (type d'amélioration absent du wiki, estimé par l'application, badge Estimation)
 * dans les recommandations. Le nombre d'armes concernées est un décompte des données chargées.
 */
const criteria = useCriteriaStore()
const { weapons } = useCriteriaData()
const estimated = computed(() => weaponCounts(weapons.value).estimated)

const include = computed({
  get: () => criteria.criteria.reliability.includeEstimates,
  set: (v: boolean) => criteria.set({ reliability: { includeEstimates: v } }),
})
</script>

<template>
  <CxToggle v-model="include">
    <span>Inclure les valeurs estimées</span>
    <span
      v-if="weapons.length > 0"
      class="cx-check-meta"
    >{{ formatInt(estimated) }} arme{{ estimated > 1 ? 's' : '' }}</span>
  </CxToggle>
  <p class="cx-muted cx-crit-note">
    Armes dont le type d’amélioration n’est pas documenté par le wiki : l’application l’estime, et le dit par un badge Estimation.
  </p>
</template>
