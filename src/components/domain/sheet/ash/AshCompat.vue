<!-- Section « Compatibilité » d'une cendre de guerre : classes d'armes et affinités sur lesquelles elle s'applique. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { AshOfWarEntry } from '../../../../data/types/ashesOfWar.ts'
import CxChip from '../../../ds/CxChip.vue'
import CxIcon from '../../../ds/CxIcon.vue'
import CxValue from '../../../ds/CxValue.vue'
import SheetSection from '../SheetSection.vue'
import { compatClasses } from './ashModel.ts'

/**
 * Classes d'armes et affinités compatibles (`compatible_weapon_classes`, `compatible_affinities`). Les noms sont ceux du wiki (anglais, tels quels) ;
 * l'icône de classe est un repère de plus, jamais le seul porteur du sens. L'affinité propre à la cendre est mise en avant. Liste vide : « Non documenté ».
 */
const props = defineProps<{
  ash: Pick<AshOfWarEntry, 'compatible_weapon_classes' | 'compatible_affinities' | 'affinity'>
}>()

const classes = computed(() => compatClasses(props.ash))
</script>

<template>
  <SheetSection
    title="Compatibilité"
    subtitle="Armes et affinités sur lesquelles cette cendre peut être posée, selon le wiki."
  >
    <div class="sh-compat">
      <h3 class="cx-label">
        Classes d’armes ({{ classes.length }})
      </h3>
      <ul
        v-if="classes.length > 0"
        class="sh-chips"
      >
        <li
          v-for="c in classes"
          :key="c.name"
        >
          <CxChip>
            <CxIcon
              v-if="c.icon"
              :name="c.icon"
              size="sm"
            />{{ c.name }}
          </CxChip>
        </li>
      </ul>
      <p v-else>
        <CxValue :value="null" />
      </p>
    </div>
    <div class="sh-compat">
      <h3 class="cx-label">
        Affinités ({{ ash.compatible_affinities.length }})
      </h3>
      <ul
        v-if="ash.compatible_affinities.length > 0"
        class="sh-chips"
      >
        <li
          v-for="a in ash.compatible_affinities"
          :key="a"
        >
          <CxChip :active="a === ash.affinity">
            {{ a }}<span
              v-if="a === ash.affinity"
              class="cx-sr"
            > (affinité de cette cendre)</span>
          </CxChip>
        </li>
      </ul>
      <p v-else>
        <CxValue :value="null" />
      </p>
    </div>
  </SheetSection>
</template>

<style scoped>
.sh-compat { display: grid; gap: var(--space-2); min-width: 0; }
.sh-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
</style>
