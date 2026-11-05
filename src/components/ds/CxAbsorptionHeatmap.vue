<!-- Matrice des faiblesses : absorption de chaque type de dégâts par rencontre (%), avec les immunités aux statuts. -->
<script setup lang="ts">
import { computed } from 'vue'
import { NEGATION_KEYS } from '../../data/keys.ts'
import { ABSORPTION_BANDS, absorptionBand, type AbsorptionBand } from '../../engine/weakness.ts'
import { formatDecimal, formatPercent, MINUS } from '../../ui/format.ts'
import { DAMAGE_ICONS, DAMAGE_LABELS, DAMAGE_SHORT_LABELS, STATUS_SHORT_LABELS, STATUS_BY_DATA_KEY } from '../../ui/labels.ts'
import CxDamageChip from './CxDamageChip.vue'
import CxIcon from './CxIcon.vue'
import CxValue from './CxValue.vue'
import type { HeatmapRow } from './types.ts'

/**
 * Matrice des faiblesses (README du design system, composant AbsorptionHeatmap) : un vrai `table`, qui sert aussi de vue tableau.
 * Bandes de couleur de `src/engine/weakness.ts` (`absorptionBand`) ; la valeur est écrite dans chaque case et un mot de bande
 * (« faiblesse », « résistance »…) est lu par les lecteurs d'écran : jamais la couleur seule.
 * `null` : case hachurée « — » avec « Non documenté par le wiki » ; une ligne entièrement hachurée reste dans la matrice.
 * Immunités : puces de statut barrées à bordure pointillée. Rencontres vaincues atténuées (`is-done`) ; les masquer relève de l'appelant.
 */
const props = withDefaults(
  defineProps<{
    /** Une ligne par rencontre, dans l'ordre de l'histoire. */
    rows: readonly HeatmapRow[]
    /** Affiche la légende de l'échelle sous la matrice (vrai par défaut). */
    legend?: boolean
  }>(),
  { legend: true },
)

/** Mot lu pour chaque bande ; la bande `n` (6 à 15 %) est neutre. */
const BAND_WORDS: Record<AbsorptionBand, string> = {
  w2: 'forte faiblesse',
  w1: 'faiblesse',
  n: 'neutre',
  r1: 'résistance',
  r2: 'forte résistance',
  r3: 'très forte résistance',
  null: 'non documenté',
}

const columns = NEGATION_KEYS.map((key) => ({
  key,
  label: DAMAGE_LABELS[key],
  short: DAMAGE_SHORT_LABELS[key],
  icon: DAMAGE_ICONS[key],
}))

const body = computed(() =>
  props.rows.map((row) => ({
    row,
    cells: columns.map((col) => {
      const value = row.negation?.[col.key] ?? null
      const band = absorptionBand(value)
      const text = value === null ? '' : formatPercent(value)
      return {
        key: col.key,
        band,
        shown: value === null ? '—' : formatDecimal(value),
        word: BAND_WORDS[band],
        title: value === null ? 'Non documenté par le wiki' : `${row.name} — ${col.label} : ${text} (${BAND_WORDS[band]})`,
      }
    }),
  })),
)

/** Légende de l'échelle : bornes tirées de `ABSORPTION_BANDS`, pour ne jamais les dupliquer ici. */
const scale = computed(() => {
  const out: { band: AbsorptionBand; text: string }[] = []
  ABSORPTION_BANDS.forEach((b, i) => {
    const previous = ABSORPTION_BANDS[i - 1]
    const signed = (n: number): string => (n < 0 ? `${MINUS}${Math.abs(n)}` : String(n))
    out.push({ band: b.band, text: previous ? `${signed(previous.max + 1)} à ${signed(b.max)}` : `≤ ${signed(b.max)}` })
  })
  const last = ABSORPTION_BANDS[ABSORPTION_BANDS.length - 1]
  out.push({ band: 'r3', text: `> ${last ? last.max : 50}` })
  out.push({ band: 'null', text: '—' })
  return out
})
</script>

<template>
  <div class="cx-heat-box">
    <div class="cx-heat-wrap">
      <table class="cx-heat">
        <caption class="cx-sr">
          Absorption par type de dégâts, en pourcentage, et immunités aux statuts
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="first"
            >
              Boss
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :title="col.label"
            >
              <span
                class="cx-heat-col"
                :class="`dt-${col.key}`"
              >
                <CxIcon
                  v-if="col.icon"
                  :name="col.icon"
                />
                <span aria-hidden="true">{{ col.short }}</span>
                <span class="cx-sr">{{ col.label }}</span>
              </span>
            </th>
            <th
              scope="col"
              class="first"
            >
              Immunités
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="line in body"
            :key="line.row.id"
            :class="{ 'is-done': line.row.done }"
          >
            <th
              class="row-h"
              scope="row"
            >
              <a
                v-if="line.row.href"
                :href="line.row.href"
              >{{ line.row.name }}</a>
              <template v-else>
                {{ line.row.name }}
              </template>
              <small v-if="line.row.subtitle">{{ line.row.subtitle }}</small>
            </th>
            <td
              v-for="cell in line.cells"
              :key="cell.key"
              class="cell"
              :class="`h-${cell.band}`"
              :title="cell.title"
            >
              <span :aria-hidden="cell.band === 'null' ? 'true' : undefined">{{ cell.shown }}</span>
              <span class="cx-sr"> {{ cell.word }}</span>
            </td>
            <td class="imm">
              <CxValue
                v-if="line.row.immunities === null"
                :value="null"
              />
              <span
                v-else-if="line.row.immunities.length === 0"
                class="cx-muted"
              >Aucune</span>
              <template v-else>
                <CxDamageChip
                  v-for="status in line.row.immunities"
                  :key="status"
                  :status="status"
                  :label="STATUS_SHORT_LABELS[STATUS_BY_DATA_KEY[status]]"
                  immune
                />
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="legend"
      class="cx-heat-legend"
    >
      <span>Absorption en %</span>
      <span class="cx-heat-scale">
        <span
          v-for="step in scale"
          :key="step.band"
          :class="`h-${step.band}`"
        >{{ step.text }}</span>
      </span>
      <span>Faiblesse ← → résistance ; hachures : non documenté</span>
    </div>
  </div>
</template>

<style>
.cx-heat-box { display: grid; gap: var(--space-3); }
.cx-heat-wrap { overflow-x: auto; }
.cx-heat { width: 100%; border-collapse: separate; border-spacing: 2px; font-size: 12px; line-height: 16px; }
.cx-heat th { padding: 4px; color: var(--ink-2); font: 600 11px/14px var(--font-sans); text-align: center; vertical-align: bottom; }
.cx-heat th.first { text-align: left; }
.cx-heat th.row-h { text-align: left; font: 700 13px/16px var(--font-display); color: var(--ink); white-space: nowrap; padding-right: var(--space-2); }
.cx-heat th.row-h a { color: var(--ink); text-decoration: none; }
.cx-heat th.row-h a:hover { color: var(--gold-text); text-decoration: underline; }
.cx-heat th.row-h small { display: block; color: var(--ink-3); font: 400 11px/14px var(--font-sans); }
.cx-heat-col { display: grid; justify-items: center; gap: 2px; }
.cx-heat-col .cx-i { width: 15px; height: 15px; color: var(--dt); }
.cx-heat td.cell { height: 30px; min-width: 38px; padding: 0 2px; border-radius: var(--radius-xs); text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
.h-w2 { background: var(--abs-w2); color: var(--on-abs-w2); }
.h-w1 { background: var(--abs-w1); color: var(--on-abs-w1); }
.h-n { background: var(--abs-n); color: var(--ink); }
.h-r1 { background: var(--abs-r1); color: var(--ink); }
.h-r2 { background: var(--abs-r2); color: var(--ink); }
.h-r3 { background: var(--abs-r3); color: var(--on-abs-r3); }
.h-null { background: repeating-linear-gradient(135deg, var(--hatch) 0 3px, transparent 3px 7px); color: var(--ink-3); box-shadow: inset 0 0 0 1px var(--line); }
.cx-heat tr.is-done th.row-h, .cx-heat tr.is-done td.cell { opacity: .55; }
.cx-heat td.imm { padding-left: var(--space-2); white-space: nowrap; }
.cx-heat td.imm .cx-dt + .cx-dt { margin-left: var(--space-1); }
.cx-heat-legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 11px; line-height: 14px; }
.cx-heat-scale { display: inline-flex; gap: 2px; }
.cx-heat-scale > span { display: grid; place-items: center; min-width: 34px; height: 18px; padding: 0 3px; border-radius: var(--radius-xs); font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
