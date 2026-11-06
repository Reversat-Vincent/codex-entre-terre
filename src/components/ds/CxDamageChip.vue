<!-- Puce d'un type de dégâts ou d'un statut : icône teintée, libellé et valeur en encre, immunité barrée. -->
<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_ICON, type StatusKey } from '../../data/keys.ts'
import { formatInt, formatPercent } from '../../ui/format.ts'
import { DAMAGE_ICONS, DAMAGE_LABELS, STATUS_BY_DATA_KEY, STATUS_LABELS, type DamageLabelKey } from '../../ui/labels.ts'
import CxIcon from './CxIcon.vue'

/**
 * Puce de type de dégâts ou de statut (README du design system, composant DamageStatusChip).
 * Donner `damage` ou `status` (clés de `src/data/keys.ts`). L'icône porte la teinte (`dmg-*`, `st-*` via `--dt`) ; libellé et valeur restent en encres.
 * Immunité : icône barrée, bordure pointillée et « Immunisé : » dans l'info-bulle et pour les lecteurs d'écran.
 */
const props = withDefaults(
  defineProps<{
    /** Type de dégâts (arme ou absorption de boss). */
    damage?: DamageLabelKey
    /** Effet de statut (clé de données : `blood_loss`, `frostbite`…). */
    status?: StatusKey
    /** Libellé court à la place du libellé complet (colonnes étroites) ; le libellé complet passe en info-bulle. */
    label?: string
    /** Valeur à côté du libellé : absorption (%), accumulation… `null` = non documenté ; absent = pas de valeur. */
    value?: number | null
    /** Mise en forme de la valeur : pourcentage signé (« −10 % », défaut) ou entier (accumulation d'un statut). */
    format?: 'percent' | 'int'
    /** Immunité au statut : icône barrée, bordure pointillée. */
    immune?: boolean
  }>(),
  { damage: undefined, status: undefined, label: undefined, value: undefined, format: 'percent', immune: false },
)

const fullLabel = computed(() => {
  if (props.status) return STATUS_LABELS[STATUS_BY_DATA_KEY[props.status]]
  return props.damage ? DAMAGE_LABELS[props.damage] : ''
})
const shownLabel = computed(() => props.label ?? fullLabel.value)
/** Classe de teinte : `dt-*` pour un type de dégâts, `st-*` pour un statut. Le total physique n'a ni teinte ni icône dans le design system. */
const tint = computed(() => {
  if (props.status) return `st-${STATUS_BY_DATA_KEY[props.status]}`
  return props.damage && props.damage !== 'physical' ? `dt-${props.damage}` : ''
})
const icon = computed(() => {
  if (props.status) return STATUS_ICON[props.status].replace(/^i-/, '')
  return props.damage ? DAMAGE_ICONS[props.damage] : undefined
})
const valueText = computed(() => {
  if (props.value === null || props.value === undefined) return ''
  return props.format === 'int' ? formatInt(props.value) : formatPercent(props.value)
})
const tip = computed(() => {
  const base = props.immune ? `Immunisé : ${fullLabel.value}` : fullLabel.value
  return props.value === null ? `${base} (non documenté)` : base
})
</script>

<template>
  <span
    class="cx-dt"
    :class="[tint, { 'is-immune': immune }]"
    :title="tip"
  >
    <span
      v-if="icon"
      class="cx-dt-ic"
    ><CxIcon :name="icon" /></span>
    <span
      v-if="immune"
      class="cx-sr"
    >Immunisé : </span>{{ shownLabel }}
    <span
      v-if="valueText"
      class="cx-dt-val"
    >{{ valueText }}</span>
    <span
      v-else-if="value === null"
      class="cx-dt-val"
    >
      <CxIcon
        name="empty"
        size="xs"
      /><span class="cx-sr">Non documenté</span>
    </span>
  </span>
</template>

<style>
.cx-dt { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 7px 0 5px; border: 1px solid var(--line-strong); border-radius: var(--radius-s); background: var(--surface-raised); color: var(--ink); font: 600 11px/14px var(--font-sans); white-space: nowrap; vertical-align: middle; }
.cx-dt-ic { position: relative; display: inline-grid; color: var(--dt, var(--ink-2)); }
.cx-dt-ic .cx-i { width: 14px; height: 14px; vertical-align: 0; }
.cx-dt-val { color: var(--ink-2); font-variant-numeric: tabular-nums; }
.cx-dt.is-immune { border-style: dashed; background: transparent; color: var(--ink-2); }
.cx-dt.is-immune .cx-dt-ic::after { content: ""; position: absolute; left: -2px; right: -2px; top: 50%; height: 1.5px; margin-top: -1px; background: var(--ink); transform: rotate(-45deg); }
.dt-standard { --dt: var(--dmg-standard); } .dt-strike { --dt: var(--dmg-strike); } .dt-slash { --dt: var(--dmg-slash); } .dt-pierce { --dt: var(--dmg-pierce); }
.dt-magic { --dt: var(--dmg-magic); } .dt-fire { --dt: var(--dmg-fire); } .dt-lightning { --dt: var(--dmg-lightning); } .dt-holy { --dt: var(--dmg-holy); }
.st-bleed { --dt: var(--st-bleed); } .st-frost { --dt: var(--st-frost); } .st-poison { --dt: var(--st-poison); } .st-rot { --dt: var(--st-rot); }
.st-sleep { --dt: var(--st-sleep); } .st-madness { --dt: var(--st-madness); } .st-death { --dt: var(--st-death); }
</style>
