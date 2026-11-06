<!-- Section « Attaque » d'un objet : puissance par type de dégâts, critique, accumulation de statut et effets passifs (munitions, pots). -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ItemEntry } from '../useSheetEntry.ts'
import CxDamageChip from '../../../ds/CxDamageChip.vue'
import CxValue from '../../../ds/CxValue.vue'
import SheetSection from '../SheetSection.vue'
import { itemAttack } from './itemModel.ts'

/**
 * Attaque d'une munition (`attack_power`, `critical`) ou d'un pot (champs `*_power` de l'infobox). Valeurs du wiki, sans conversion :
 * une puissance `null` s'affiche « Non documenté », un vrai 0 reste 0. Le physique est le total physique de l'objet.
 */
const props = defineProps<{
  entry: ItemEntry
}>()

const attack = computed(() => itemAttack(props.entry))
</script>

<template>
  <SheetSection
    v-if="attack"
    title="Attaque"
    subtitle="Puissance d’attaque indiquée par le wiki."
  >
    <ul
      class="sh-atk"
      aria-label="Puissance par type de dégâts"
    >
      <li
        v-for="d in attack.damages"
        :key="d.key"
      >
        <CxDamageChip
          :damage="d.key"
          :value="d.value"
          format="int"
        />
      </li>
    </ul>
    <dl
      v-if="attack.critical !== undefined"
      class="sh-atk-extra"
    >
      <dt>Critique</dt>
      <dd><CxValue :value="attack.critical" /></dd>
    </dl>
    <div
      v-if="attack.statuses.length > 0"
      class="sh-atk-block"
    >
      <h3 class="cx-label">
        Accumulation de statut
      </h3>
      <ul class="sh-atk">
        <li
          v-for="s in attack.statuses"
          :key="s.key"
        >
          <CxDamageChip
            :status="s.key"
            :value="s.value"
            format="int"
          />
        </li>
      </ul>
    </div>
    <p
      v-if="attack.passive"
      class="sh-atk-passive"
    >
      {{ attack.passive }}
    </p>
  </SheetSection>
</template>

<style scoped>
.sh-atk { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.sh-atk-extra { display: flex; gap: var(--space-3); align-items: baseline; font-size: 14px; }
.sh-atk-extra dt { color: var(--ink-3); font-size: 12px; }
.sh-atk-extra dd { color: var(--ink); font-weight: 600; }
.sh-atk-block { display: grid; gap: var(--space-2); }
.sh-atk-passive { color: var(--ink-2); font-size: 13px; line-height: 19px; overflow-wrap: anywhere; }
</style>
