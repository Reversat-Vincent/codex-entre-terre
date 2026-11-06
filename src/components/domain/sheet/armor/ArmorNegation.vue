<!-- Section « Absorption des dégâts » d'une armure : huit types, barres autour de 0 %, valeur écrite, mention « Dégâts amplifiés » si négative. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ArmorEntry } from '../../../../data/types/armor.ts'
import CxIcon from '../../../ds/CxIcon.vue'
import CxValue from '../../../ds/CxValue.vue'
import SheetSection from '../SheetSection.vue'
import { negationRows } from './armorModel.ts'

/**
 * Absorption de l'armure par type de dégâts (`damage_negation`, en %). Chaque barre part du 0 % (trait vertical) : à droite pour une absorption, à gauche pour
 * une valeur négative, qui amplifie les dégâts. La valeur est toujours écrite, et la mention « Dégâts amplifiés » accompagne une valeur négative : la
 * couleur ne porte jamais seule le sens. Les barres sont décoratives pour les lecteurs d'écran. `null` : « Non documenté », jamais 0.
 * L'échelle est la même pour toutes les pièces, pour qu'on les compare d'un coup d'œil.
 */
const props = defineProps<{
  armor: Pick<ArmorEntry, 'damage_negation'>
}>()

const model = computed(() => negationRows(props.armor))
</script>

<template>
  <SheetSection
    title="Absorption des dégâts"
    subtitle="Pourcentage de dégâts absorbé, par type. Valeurs du wiki."
  >
    <ul class="sh-neg">
      <li
        v-for="row in model.rows"
        :key="row.key"
      >
        <span class="sh-neg-lab"><CxIcon
          :name="row.icon"
          size="sm"
        />{{ row.label }}</span>
        <span
          class="sh-neg-track"
          aria-hidden="true"
        >
          <span
            v-if="row.value !== null"
            class="sh-neg-bar"
            :class="{ 'is-neg': row.negative }"
            :style="{ left: `${row.left}%`, width: `${row.width}%` }"
          />
          <span
            class="sh-neg-zero"
            :style="{ left: `${model.scale.zero}%` }"
          />
        </span>
        <span class="sh-neg-val">
          <CxValue
            :value="row.value"
            format="percent"
          />
          <span
            v-if="row.negative"
            class="sh-neg-tag"
          ><CxIcon
            name="alert"
            size="xs"
          />Dégâts amplifiés</span>
        </span>
      </li>
    </ul>
  </SheetSection>
</template>

<style scoped>
.sh-neg { display: grid; gap: var(--space-2); }
.sh-neg li { display: grid; grid-template-columns: 112px minmax(0, 1fr) minmax(88px, auto); gap: var(--space-3); align-items: center; font-size: 13px; line-height: 18px; }
.sh-neg-lab { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-2); }
.sh-neg-track { position: relative; height: 10px; border-radius: var(--radius-xs); background: var(--surface-sunken); }
.sh-neg-bar { position: absolute; top: 0; bottom: 0; border-radius: var(--radius-xs); background: var(--ink-3); transition: width 150ms ease, left 150ms ease; }
.sh-neg-bar.is-neg { background: var(--warn); }
.sh-neg-zero { position: absolute; top: -2px; bottom: -2px; width: 1px; background: var(--ink-2); }
.sh-neg-val { display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; color: var(--ink); font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
.sh-neg-tag { display: inline-flex; align-items: center; gap: 3px; color: var(--warn); font-size: 11px; font-weight: 600; line-height: 14px; }
@media (max-width: 767px) {
  .sh-neg li { grid-template-columns: minmax(0, 1fr) minmax(0, auto); row-gap: 4px; }
  .sh-neg-track { grid-column: 1 / -1; grid-row: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .sh-neg-bar { transition: none; }
}
</style>
