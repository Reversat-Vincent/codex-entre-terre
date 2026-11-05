<!-- Sections « Défense et absorption » et « Résistances » de départ d'une origine, en deux tableaux du wiki. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { OriginEntry } from '../../../../data/types/origins.ts'
import WikiTable from '../../WikiTable.vue'
import SheetSection from '../SheetSection.vue'
import { originDefenseRows, originResistanceRows } from './originModel.ts'

/**
 * Défense, absorption et résistances de l'origine au départ, avec son équipement (`defense`, `damage_negation`, `resistance`). Valeurs du wiki, telles quelles :
 * aucune n'est recalculée. Rendu par `WikiTable` (défilement horizontal sur petit écran, `null` → « Non documenté » en case hachurée, jamais 0).
 */
const props = defineProps<{
  origin: OriginEntry
}>()

const defense = computed(() =>
  originDefenseRows(props.origin).map((r) => ({ 'Type de dégâts': r.label, Défense: r.defense, 'Absorption (%)': r.negation })),
)
const resistances = computed(() =>
  originResistanceRows(props.origin).map((r) => ({
    Résistance: r.label,
    Base: r.base ?? null,
    Équipement: r.equipment ?? null,
    Total: r.total ?? null,
  })),
)
</script>

<template>
  <SheetSection
    title="Défense et absorption"
    subtitle="Au départ, équipement de départ porté."
  >
    <WikiTable
      :rows="defense"
      caption="Défense et absorption par type de dégâts"
      :names="null"
    />
  </SheetSection>

  <SheetSection
    title="Résistances"
    subtitle="Résistance aux altérations d’état : base, équipement de départ et total."
  >
    <WikiTable
      :rows="resistances"
      caption="Résistances aux altérations d’état"
      :names="null"
    />
  </SheetSection>
</template>
