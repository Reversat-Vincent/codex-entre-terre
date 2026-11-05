<!-- Barres d'absorption d'une rencontre : huit types de dégâts, barres divergentes autour de 0 %, valeur écrite, mention « Faiblesse ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { ABSORPTION_BANDS } from '../../engine/weakness.ts'
import type { AbsorptionBand } from '../../engine/weakness.ts'
import { formatPercent, MINUS } from '../../ui/format.ts'
import { DAMAGE_LABELS } from '../../ui/labels.ts'
import CxDamageChip from '../ds/CxDamageChip.vue'
import CxIcon from '../ds/CxIcon.vue'
import CxValue from '../ds/CxValue.vue'
import { absorptionBars, absorptionScale } from './absorptionLayout.ts'
import type { NegationInput } from './absorptionLayout.ts'

/**
 * Absorption par type de dégâts d'une rencontre (écran Fiche boss, note `spec-boss` : « barres divergentes autour de 0 %, échelle commune avec la matrice
 * des faiblesses, valeur écrite, mention Faiblesse »). Les bandes de couleur viennent de `engine/weakness.ts`, comme dans `CxAbsorptionHeatmap`.
 * Une barre part du 0 % : à gauche pour une faiblesse (dégâts amplifiés), à droite pour une résistance. La valeur est toujours écrite et la mention
 * « Faiblesse » accompagne une absorption négative : la couleur ne porte jamais seule le sens. Les barres sont décoratives pour les lecteurs d'écran,
 * qui lisent la valeur et sa bande. `null` : état « Non documenté » (jamais 0).
 */
const props = defineProps<{
  /** Absorption en % par type de dégâts ; `null` si le wiki ne donne aucune absorption pour la rencontre. */
  negation: NegationInput | null
}>()

/** Mot lu pour chaque bande de couleur. */
const BAND_WORDS: Record<AbsorptionBand, string> = {
  w2: 'forte faiblesse',
  w1: 'absorption faible',
  n: 'neutre',
  r1: 'résistance',
  r2: 'forte résistance',
  r3: 'très forte résistance',
  null: 'non documenté',
}

const scale = computed(() => absorptionScale(props.negation === null ? [] : Object.values(props.negation)))

const rows = computed(() =>
  absorptionBars(props.negation ?? {}, scale.value).map((bar) => ({
    ...bar,
    label: DAMAGE_LABELS[bar.key],
    text: bar.value === null ? '' : formatPercent(bar.value),
    word: BAND_WORDS[bar.band],
  })),
)

const signed = (n: number): string => (n < 0 ? `${MINUS}${Math.abs(n)}` : String(n))

/** Légende de l'échelle : bornes tirées de `ABSORPTION_BANDS`, pour ne jamais les dupliquer ici. */
const legend = computed(() => {
  const out: { band: AbsorptionBand; text: string }[] = ABSORPTION_BANDS.map((b, i) => {
    const previous = ABSORPTION_BANDS[i - 1]
    return { band: b.band, text: previous ? `${signed(previous.max + 1)} à ${signed(b.max)}` : `≤ ${signed(b.max)}` }
  })
  const last = ABSORPTION_BANDS[ABSORPTION_BANDS.length - 1]
  out.push({ band: 'r3', text: `> ${last ? last.max : 50}` })
  return out
})
</script>

<template>
  <div
    v-if="negation !== null"
    class="abs"
  >
    <div
      class="abs-table"
      role="table"
      aria-label="Absorption par type de dégâts, en pourcentage"
    >
      <div
        v-for="row in rows"
        :key="row.key"
        class="abs-row"
        role="row"
      >
        <span
          class="abs-lab"
          role="rowheader"
        >
          <CxDamageChip
            :damage="row.key"
            label=""
          />{{ row.label }}
        </span>
        <span
          class="abs-track"
          :class="{ 'is-null': row.value === null }"
          role="cell"
          aria-hidden="true"
        >
          <span
            class="abs-zero"
            :style="{ left: `${scale.zero}%` }"
          />
          <span
            v-if="row.value !== null"
            class="abs-bar"
            :class="`abs-${row.band}`"
            :style="{ left: `${row.left}%`, width: `${row.width}%` }"
          />
        </span>
        <span
          class="abs-val"
          role="cell"
        >
          <CxValue
            v-if="row.value === null"
            :value="null"
          />
          <template v-else>
            <span aria-hidden="true">{{ row.text }}</span>
            <span class="cx-sr">{{ row.label }} : {{ row.text }}, {{ row.weak ? 'faiblesse' : row.word }}</span>
          </template>
        </span>
        <span
          class="abs-tag"
          role="cell"
        >
          <span
            v-if="row.weak"
            class="abs-weak"
          ><CxIcon
            name="chev-d"
            size="xs"
          />Faiblesse</span>
        </span>
      </div>
      <div
        class="abs-axis-row"
        aria-hidden="true"
      >
        <span class="abs-axis">
          <span
            v-for="tick in scale.ticks"
            :key="tick.value"
            :style="{ left: `${tick.left}%` }"
          >{{ signed(tick.value) }}&nbsp;%</span>
        </span>
      </div>
    </div>
    <div class="abs-legend">
      <span>Échelle partagée avec la matrice des faiblesses</span>
      <span
        class="abs-scale"
        aria-hidden="true"
      >
        <span
          v-for="step in legend"
          :key="step.band"
          :class="`abs-${step.band}`"
        >{{ step.text }}</span>
      </span>
      <span>Barre à gauche du 0 % : dégâts amplifiés</span>
    </div>
  </div>
  <div
    v-else
    class="cx-empty"
  >
    <span class="cx-rel cx-rel-nodata"><CxIcon name="empty" />Non documenté</span>
    <span class="cx-empty-title">Absorptions absentes du wiki</span>
    <span>Le wiki ne donne ni faiblesses ni absorptions pour cette rencontre. Le Codex n'affiche pas de 0 à la place : la matrice des faiblesses montre une ligne hachurée.</span>
  </div>
</template>

<style scoped>
.abs { display: grid; gap: var(--space-3); min-width: 0; }
.abs-table { display: grid; gap: 6px; min-width: 0; --abs-lab: 132px; --abs-val: 72px; --abs-tag: 92px; }
.abs-row, .abs-axis-row { display: grid; grid-template-columns: var(--abs-lab) minmax(0, 1fr) var(--abs-val) var(--abs-tag); align-items: center; gap: 6px 12px; }
.abs-axis-row { grid-template-columns: var(--abs-lab) minmax(0, 1fr) var(--abs-val) var(--abs-tag); }
.abs-axis-row > .abs-axis { grid-column: 2; }
.abs-lab { display: inline-flex; align-items: center; gap: 8px; color: var(--ink); font-size: 13px; }
.abs-lab :deep(.cx-dt) { padding: 0 4px; }
.abs-track { position: relative; height: 18px; border-radius: var(--radius-xs); background: var(--surface-sunken); }
.abs-track.is-null { background: repeating-linear-gradient(135deg, var(--hatch) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 1px var(--line); }
.abs-zero { position: absolute; top: -4px; bottom: -4px; width: 1px; background: var(--ink-3); }
.abs-bar { position: absolute; top: 2px; bottom: 2px; min-width: 3px; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--line-strong); transition: width 0.15s ease, left 0.15s ease; }
.abs-val { color: var(--ink); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.abs-weak { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px; border: 1px solid var(--abs-w2); border-radius: var(--radius-xs); color: var(--gold-text); font-size: 11px; font-weight: 600; white-space: nowrap; }
.abs-axis { position: relative; display: block; height: 16px; color: var(--ink-3); font-size: 11px; line-height: 14px; font-variant-numeric: tabular-nums; }
.abs-axis > span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.abs-w2 { background: var(--abs-w2); color: var(--on-abs-w2); }
.abs-w1 { background: var(--abs-w1); color: var(--on-abs-w1); }
.abs-n { background: var(--abs-n); color: var(--ink); }
.abs-r1 { background: var(--abs-r1); color: var(--ink); }
.abs-r2 { background: var(--abs-r2); color: var(--ink); }
.abs-r3 { background: var(--abs-r3); color: var(--on-abs-r3); }
.abs-legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 11px; line-height: 14px; }
.abs-scale { display: inline-flex; gap: 2px; }
.abs-scale > span { display: grid; place-items: center; min-width: 34px; height: 18px; padding: 0 4px; border-radius: var(--radius-xs); font-weight: 600; font-variant-numeric: tabular-nums; }

/* Mobile : le type et la valeur sur une ligne, la piste en dessous, la mention « Faiblesse » à côté de la valeur. */
@media (max-width: 767px) {
  .abs-table { gap: var(--space-3); }
  .abs-row { grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: 'lab val tag' 'track track track'; gap: 4px 8px; }
  .abs-axis-row { grid-template-columns: minmax(0, 1fr); }
  .abs-axis-row > .abs-axis { grid-column: 1; }
  .abs-lab { grid-area: lab; }
  .abs-val { grid-area: val; }
  .abs-tag { grid-area: tag; min-width: 76px; }
  .abs-track { grid-area: track; }
}

@media (prefers-reduced-motion: reduce) {
  .abs-bar { transition: none; }
}
</style>
