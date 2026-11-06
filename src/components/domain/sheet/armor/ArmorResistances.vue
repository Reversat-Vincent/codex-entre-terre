<!-- Section « Résistances » d'une armure : Immunity, Robustness, Focus, Vitality, avec les statuts que chacune gouverne. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ArmorEntry } from '../../../../data/types/armor.ts'
import CxValue from '../../../ds/CxValue.vue'
import SheetSection from '../SheetSection.vue'
import { resistanceRows } from './armorModel.ts'

/**
 * Résistances de l'armure aux statuts (`resistance`). Les noms sont ceux du jeu (anglais) ; les statuts gouvernés viennent du sujet « Status Effects »
 * de `mechanics.json`. Barres décoratives sur une échelle commune ; la valeur est toujours écrite.
 */
const props = defineProps<{
  armor: Pick<ArmorEntry, 'resistance'>
}>()

const rows = computed(() => resistanceRows(props.armor))
</script>

<template>
  <SheetSection
    title="Résistances"
    subtitle="Résistance aux altérations d'état, valeurs du wiki."
  >
    <ul class="sh-res">
      <li
        v-for="row in rows"
        :key="row.key"
      >
        <span class="sh-res-lab">
          <b>{{ row.label }}</b>
          <span class="sh-res-st">{{ row.statuses }}</span>
        </span>
        <span
          class="sh-res-track"
          aria-hidden="true"
        ><span
          class="sh-res-bar"
          :style="{ width: `${row.width}%` }"
        /></span>
        <span class="sh-res-val"><CxValue :value="row.value" /></span>
      </li>
    </ul>
  </SheetSection>
</template>

<style scoped>
.sh-res { display: grid; gap: var(--space-3); }
.sh-res li { display: grid; grid-template-columns: minmax(0, 150px) minmax(0, 1fr) 48px; gap: var(--space-3); align-items: center; font-size: 13px; line-height: 18px; }
.sh-res-lab { display: grid; min-width: 0; color: var(--ink-2); }
.sh-res-lab b { color: var(--ink); font-weight: 600; }
.sh-res-st { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.sh-res-track { height: 10px; border-radius: var(--radius-xs); background: var(--surface-sunken); overflow: hidden; }
.sh-res-bar { display: block; height: 100%; border-radius: var(--radius-xs); background: var(--ink-3); transition: width 150ms ease; }
.sh-res-val { color: var(--ink); font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
@media (max-width: 767px) {
  .sh-res li { grid-template-columns: minmax(0, 1fr) 48px; row-gap: 4px; }
  .sh-res-track { grid-column: 1 / -1; grid-row: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .sh-res-bar { transition: none; }
}
</style>
