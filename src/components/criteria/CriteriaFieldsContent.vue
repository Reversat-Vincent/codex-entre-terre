<!-- Champs de la section « Contenu » : jeu de base (toujours actif), Shadow of the Erdtree et Tarnished Pack. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { formatInt } from '../../ui/format.ts'
import CxCheckbox from '../ds/CxCheckbox.vue'
import CxSourceBadge from '../ds/CxSourceBadge.vue'
import { weaponCounts } from './criteriaModel.ts'
import { useCriteriaData } from './useCriteriaData.ts'

/**
 * Cases à cocher des contenus (design `Main.dc.html`, section « Contenu ») avec leur badge de source et le nombre d'armes de chaque contenu.
 * Le jeu de base reste coché (le store l'impose) ; chaque changement s'écrit aussitôt dans les critères.
 */
const criteria = useCriteriaStore()
const { weapons } = useCriteriaData()
const counts = computed(() => weaponCounts(weapons.value))

/** Texte du compteur d'un contenu ; absent tant que les armes ne sont pas lues. */
function countText(n: number): string | undefined {
  return weapons.value.length === 0 ? undefined : `${formatInt(n)} arme${n > 1 ? 's' : ''}`
}

const sote = computed({
  get: () => criteria.criteria.content.sote,
  set: (v: boolean) => criteria.set({ content: { sote: v } }),
})
const tp = computed({
  get: () => criteria.criteria.content.tp,
  set: (v: boolean) => criteria.set({ content: { tp: v } }),
})
</script>

<template>
  <CxCheckbox
    :model-value="true"
    disabled
    :meta="countText(counts.base)"
  >
    <CxSourceBadge source="Base game" /> Jeu de base
  </CxCheckbox>
  <CxCheckbox
    v-model="sote"
    :meta="countText(counts.sote)"
  >
    <CxSourceBadge source="Shadow of the Erdtree" /> Shadow of the Erdtree
  </CxCheckbox>
  <CxCheckbox
    v-model="tp"
    :meta="countText(counts.tp)"
  >
    <CxSourceBadge source="Tarnished Pack" /> Tarnished Pack
  </CxCheckbox>
</template>
