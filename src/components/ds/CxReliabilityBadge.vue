<!-- Badge de fiabilité : dit d'où vient une valeur (wiki, déduit, estimation, non documenté, incohérence, calculé). -->
<script setup lang="ts">
import { computed } from 'vue'
import {
  ESTIMATE_CONFIDENCE_LABELS,
  RELIABILITY_LABELS,
  type EstimateConfidence,
  type ReliabilityKey,
} from '../../ui/labels.ts'
import CxIcon from './CxIcon.vue'
import CxTooltip from './CxTooltip.vue'

/**
 * Badge de fiabilité d'une valeur (README du design system, composant ReliabilityBadge).
 * À placer immédiatement après la valeur qu'il qualifie, sur la même ligne. Forme, icône et mot : jamais la couleur seule.
 * Avec `tip`, le badge devient le déclencheur d'une info-bulle (méthode d'un calcul, champ et valeur retenue d'une incohérence).
 */
const props = defineProps<{
  /** Niveau de fiabilité à annoncer. */
  kind: ReliabilityKey
  /** Confiance d'une estimation (`high`, `medium`), affichée entre parenthèses ; ignorée pour les autres niveaux. */
  confidence?: EstimateConfidence | null
  /** Texte de l'info-bulle ; sans lui, le badge n'est pas interactif. */
  tip?: string
}>()

/** Classe de style et icône de chaque niveau (README : tableau des variantes). */
const STYLES: Record<ReliabilityKey, { cls: string; icon: string }> = {
  wiki: { cls: 'cx-rel-wiki', icon: 'book' },
  deduced: { cls: 'cx-rel-wiki', icon: 'book' },
  estimate: { cls: 'cx-rel-est', icon: 'approx' },
  null: { cls: 'cx-rel-nodata', icon: 'empty' },
  inconsistent: { cls: 'cx-rel-incoh', icon: 'alert' },
  calculated: { cls: 'cx-rel-calc', icon: 'calc' },
}

const style = computed(() => STYLES[props.kind])
const text = computed(() => {
  const base = RELIABILITY_LABELS[props.kind]
  return props.kind === 'estimate' && props.confidence ? `${base} (${ESTIMATE_CONFIDENCE_LABELS[props.confidence]})` : base
})
</script>

<template>
  <CxTooltip
    v-if="tip"
    :text="tip"
    align="start"
  >
    <span
      class="cx-rel"
      :class="style.cls"
    ><CxIcon :name="style.icon" />{{ text }}</span>
  </CxTooltip>
  <span
    v-else
    class="cx-rel"
    :class="style.cls"
  ><CxIcon :name="style.icon" />{{ text }}</span>
</template>

<style>
.cx-rel { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px; border: 1px solid; border-radius: var(--radius-xs); font: 600 11px/14px var(--font-sans); white-space: nowrap; vertical-align: middle; }
.cx-rel .cx-i { width: 12px; height: 12px; vertical-align: 0; }
.cx-rel-wiki { border-color: var(--line-strong); background: transparent; color: var(--ink-2); }
.cx-rel-est { border-style: dashed; border-color: var(--estimate); background: var(--estimate-wash); color: var(--estimate); }
.cx-rel-nodata { border-style: dashed; border-color: var(--line-strong); background: repeating-linear-gradient(135deg, var(--hatch) 0 3px, transparent 3px 7px); color: var(--ink-2); }
.cx-rel-incoh { border-color: color-mix(in srgb, var(--warn) 55%, transparent); background: var(--warn-wash); color: var(--warn); }
.cx-rel-calc { border-color: var(--gold-line); background: var(--gold-wash); color: var(--gold-text); }
</style>
