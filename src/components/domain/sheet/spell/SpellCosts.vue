<!-- Section « Coûts » d'un sort : FP et endurance (notation du wiki « X (Y) » expliquée) et emplacements de mémoire. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SpellEntry } from '../../../../data/types/spells.ts'
import CxNote from '../../../ds/CxNote.vue'
import CxValue from '../../../ds/CxValue.vue'
import SheetSection from '../SheetSection.vue'
import { parseCastCost } from '../sheetModel.ts'
import type { CastCost } from '../sheetModel.ts'

/**
 * Coûts d'un sort. Le wiki écrit un coût variable « X (Y) » : X est le coût par lancement, Y le coût par tick quand le sort est maintenu
 * (docs/contenu/verification-socle.md, Rock Blaster `22 (4)`). La notation brute reste visible à côté de sa lecture ; une notation inconnue
 * est affichée telle quelle, sans interprétation. Une valeur absente s'affiche « Non documenté », jamais 0.
 */
const props = defineProps<{
  spell: Pick<SpellEntry, 'fp_cost' | 'stamina_cost' | 'slots_used'>
}>()

/** Ligne de coût prête à afficher. */
interface CostLine {
  readonly id: 'fp' | 'stamina'
  readonly label: string
  readonly cost: CastCost
}

const lines = computed((): CostLine[] => [
  { id: 'fp', label: 'Coût en FP', cost: parseCastCost(props.spell.fp_cost) },
  { id: 'stamina', label: 'Coût en endurance', cost: parseCastCost(props.spell.stamina_cost) },
])
const hasChannel = computed(() => lines.value.some((l) => l.cost.kind === 'channel'))
</script>

<template>
  <SheetSection
    title="Coûts"
    subtitle="Par lancement, selon le wiki."
  >
    <dl class="sh-costs">
      <div
        v-for="l in lines"
        :key="l.id"
        class="sh-cost"
      >
        <dt>{{ l.label }}</dt>
        <dd>
          <template v-if="l.cost.kind === 'none'">
            <CxValue :value="null" />
          </template>
          <template v-else-if="l.cost.kind === 'plain'">
            <span><CxValue :value="l.cost.cast" /><span class="sh-cost-sub">par lancement</span></span>
          </template>
          <template v-else-if="l.cost.kind === 'channel'">
            <span><CxValue :value="l.cost.cast" /><span class="sh-cost-sub">par lancement</span></span>
            <span class="sh-cost-chan"><CxValue :value="l.cost.tick" /><span class="sh-cost-sub">par tick en maintenant le sort</span></span>
            <span class="sh-cost-raw">Notation du wiki : <code>{{ l.cost.raw }}</code></span>
          </template>
          <template v-else>
            <span class="cx-num">{{ l.cost.raw }}</span>
            <span class="sh-cost-raw">Notation du wiki, gardée telle quelle.</span>
          </template>
        </dd>
      </div>
      <div class="sh-cost">
        <dt>Emplacements de mémoire</dt>
        <dd><CxValue :value="spell.slots_used" /></dd>
      </div>
    </dl>
    <CxNote
      v-if="hasChannel"
      title="Lire « X (Y) »."
    >
      Le wiki note un coût variable « X (Y) » : X est le coût d’un lancement, Y le coût de chaque tick quand le sort est maintenu.
      Exemple : « 22 (4) » coûte 22 FP au lancement, puis 4 FP par tick.
    </CxNote>
  </SheetSection>
</template>

<style scoped>
.sh-costs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: var(--space-4); }
.sh-cost { display: grid; gap: 4px; min-width: 0; }
.sh-cost dt { color: var(--ink-3); font-size: 12px; line-height: 17px; }
.sh-cost dd { display: grid; gap: 2px; min-width: 0; color: var(--ink); font: 600 20px/26px var(--font-sans); font-variant-numeric: tabular-nums; }
.sh-cost-sub { margin-left: 6px; color: var(--ink-3); font: 400 12px/17px var(--font-sans); }
.sh-cost-chan { font-size: 15px; line-height: 20px; }
.sh-cost-raw { color: var(--ink-3); font: 400 12px/17px var(--font-sans); }
.sh-cost-raw code { padding: 0 4px; border-radius: var(--radius-xs); background: var(--surface-sunken); color: var(--ink-2); font: 600 12px/17px var(--font-sans); }
</style>
