<!-- Barres segmentées de couverture des données : part documentée, estimée et absente, avec légende commune. -->
<script setup lang="ts">
import { computed } from 'vue'
import { formatInt } from '../../ui/format.ts'
import type { CoverageRow } from './types.ts'

/**
 * Barres de couverture (README du design system, composant CoverageBar), une par donnée.
 * Segments documenté (`ink-2`), estimé (`estimate`, plein) et non documenté (hachures) séparés par 2 px ; le chiffre clé est écrit
 * à droite et la barre porte un `aria-label` complet. La légende commune explique les trois segments : jamais la couleur seule.
 * Les effectifs viennent de l'appelant (méthode « coverage » de calculs.md) ; la largeur d'un segment n'est qu'une proportion d'affichage.
 */
const props = withDefaults(
  defineProps<{
    /** Une ligne par donnée mesurée. */
    rows: readonly CoverageRow[]
    /** Affiche la légende commune sous la liste (vrai par défaut). */
    legend?: boolean
  }>(),
  { legend: true },
)

const bars = computed(() =>
  props.rows.map((row) => {
    const total = row.documented + row.estimated + row.missing
    const pct = (n: number): string => `${total > 0 ? (n / total) * 100 : 0}%`
    const parts = [
      { cls: 'p-doc', n: row.documented },
      { cls: 'p-est', n: row.estimated },
      { cls: 'p-null', n: row.missing },
    ].filter((p) => p.n > 0)
    const aria = `${formatInt(row.documented)} documentés, ${formatInt(row.estimated)} estimés, ${formatInt(row.missing)} absents, sur ${formatInt(total)}`
    return { row, total, aria, segments: parts.map((p) => ({ cls: p.cls, width: pct(p.n) })) }
  }),
)
</script>

<template>
  <div class="cx-cov">
    <div
      v-for="bar in bars"
      :key="bar.row.id"
      class="cx-cov-row"
    >
      <span>{{ bar.row.label }}</span>
      <span><b>{{ formatInt(bar.row.documented) }}</b> sur {{ formatInt(bar.total) }} documentés</span>
      <div
        class="cx-cov-bar"
        role="img"
        :aria-label="bar.aria"
      >
        <span
          v-for="segment in bar.segments"
          :key="segment.cls"
          :class="segment.cls"
          :style="{ width: segment.width }"
        />
      </div>
    </div>
    <div
      v-if="legend"
      class="cx-legend"
    >
      <span><span class="cx-swatch p-doc" /> Documenté (wiki)</span>
      <span><span class="cx-swatch p-est" /> Estimé</span>
      <span><span class="cx-swatch p-null" /> Non documenté</span>
    </div>
  </div>
</template>

<style>
.cx-cov { display: grid; gap: var(--space-3); }
.cx-cov-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px var(--space-3); font-size: 12px; line-height: 16px; color: var(--ink-2); }
.cx-cov-row b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.cx-cov-bar { grid-column: 1 / -1; display: flex; gap: 2px; height: 8px; }
.cx-cov-bar > span { height: 100%; }
.cx-cov-bar > span:first-child { border-radius: 4px 0 0 4px; }
.cx-cov-bar > span:last-child { border-radius: 0 4px 4px 0; }
.cx-cov-bar > span:only-child { border-radius: 4px; }
.p-doc { background: var(--ink-2); }
.p-est { background: var(--estimate); }
.p-null { background: repeating-linear-gradient(135deg, var(--ink-3) 0 2px, transparent 2px 5px); box-shadow: inset 0 0 0 1px var(--line-strong); }
.cx-swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: -1px; }
.cx-legend { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); color: var(--ink-2); font-size: 12px; line-height: 16px; }
</style>
