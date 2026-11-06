<!-- Jauge de préparation : niveau du joueur face au niveau recommandé d'un boss, avec l'état en mot et en icône. -->
<script setup lang="ts">
import { computed } from 'vue'
import { gaugeMax, type ReadinessId } from '../../engine/readiness.ts'
import { formatInt } from '../../ui/format.ts'
import CxReadinessStatus from './CxReadinessStatus.vue'

/**
 * Jauge de préparation (README du design system, composant ReadinessGauge ; calculs.md, « Préparation et jauge »).
 * L'état (`ReadinessId`) et le niveau recommandé viennent du moteur ; le composant ne les recalcule pas.
 * Piste `surface-sunken`, remplissage jusqu'au niveau du joueur, repère `ink` au niveau recommandé, légende chiffrée.
 * Le mot de l'état est toujours affiché avec son icône. L'échelle (0 à `gaugeMax`) n'est qu'une mise à l'échelle d'affichage.
 * Le niveau recommandé est une valeur calculée : l'appelant ajoute le badge Calculé / « Pourquoi ? » à côté (slot `extra`).
 */
const props = withDefaults(
  defineProps<{
    /** État de préparation calculé par le moteur. */
    state: ReadinessId
    /** Niveau du joueur (profil actif). */
    level: number
    /** Niveau recommandé ; `null` = non estimé (boss sans données de combat). */
    recommended: number | null
    /** Maximum de l'échelle ; par défaut `gaugeMax(level, recommended)` du moteur. */
    max?: number
    /** Affiche la pastille d'état au-dessus de la piste (vrai par défaut). */
    showStatus?: boolean
  }>(),
  { max: undefined, showStatus: true },
)

/**
 * Mot et classe de couleur de la piste, par état (README : Prêt, Limite, Trop tôt, Vaincu, Non estimé). L'icône et la pastille sont ceux de
 * `CxReadinessStatus`, qui porte seul la règle `.cx-status` : pas de seconde définition à tenir d'accord.
 */
const STATES: Record<ReadinessId, { label: string; cls: string }> = {
  ready: { label: 'Prêt', cls: 'ready' },
  limit: { label: 'Limite', cls: 'limit' },
  early: { label: 'Trop tôt', cls: 'early' },
  defeated: { label: 'Vaincu', cls: 'done' },
  unknown: { label: 'Non estimé', cls: 'unknown' },
}

const info = computed(() => STATES[props.state])
const scaleMax = computed(() => props.max ?? gaugeMax(props.level, props.recommended))
const clampPct = (n: number): number => (scaleMax.value > 0 ? Math.min(100, Math.max(0, (n / scaleMax.value) * 100)) : 0)
const fillPct = computed(() => clampPct(props.level))
const tickPct = computed(() => (props.recommended === null ? null : clampPct(props.recommended)))
const summary = computed(() =>
  props.recommended === null
    ? `Niveau ${formatInt(props.level)}, niveau recommandé non estimé : ${info.value.label}`
    : `Niveau ${formatInt(props.level)}, recommandé ${formatInt(props.recommended)} : ${info.value.label}`,
)
</script>

<template>
  <div
    class="cx-gauge"
    :class="info.cls"
  >
    <CxReadinessStatus
      v-if="showStatus"
      :state="state"
    />
    <template v-if="recommended !== null">
      <div
        class="cx-gauge-track"
        role="img"
        :aria-label="summary"
      >
        <span
          class="cx-gauge-fill"
          :style="{ width: `${fillPct}%` }"
        />
        <span
          class="cx-gauge-tick"
          :style="{ left: `${tickPct}%` }"
          :title="`Niveau recommandé ${formatInt(recommended)}`"
        />
      </div>
      <div class="cx-gauge-legend">
        <span>Niv. <b>{{ formatInt(level) }}</b> / recommandé <b>{{ formatInt(recommended) }}</b></span>
        <slot name="extra" />
      </div>
    </template>
    <p
      v-else
      class="cx-muted cx-gauge-none"
    >
      Aucune donnée de combat : pas de recommandation. Niv. <b>{{ formatInt(level) }}</b>
    </p>
  </div>
</template>

<style>
.cx-gauge { display: grid; gap: 4px; min-width: 0; }
.cx-gauge-track { position: relative; height: 8px; margin-block: 4px; border-radius: 4px; background: var(--surface-sunken); box-shadow: inset 0 0 0 1px var(--line); }
.cx-gauge-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--g, var(--gold)); transition: width .15s ease; }
.cx-gauge.ready { --g: var(--ready); } .cx-gauge.limit { --g: var(--warn); } .cx-gauge.early { --g: var(--danger); } .cx-gauge.done { --g: var(--ink-3); }
.cx-gauge-tick { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--ink); transition: left .15s ease; }
.cx-gauge-legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); color: var(--ink-3); font-size: 11px; line-height: 14px; font-variant-numeric: tabular-nums; }
.cx-gauge-legend b, .cx-gauge-none b { color: var(--ink-2); font-weight: 600; }
.cx-gauge-none { font-size: 12px; line-height: 16px; }
@media (prefers-reduced-motion: reduce) { .cx-gauge-fill, .cx-gauge-tick { transition: none; } }
</style>
