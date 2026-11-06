<!-- Pastille d'état de préparation : mot et icône (Prêt, Limite, Trop tôt, Vaincu, Non estimé), sans la jauge. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ReadinessId } from '../../engine/readiness.ts'
import CxIcon from './CxIcon.vue'

/**
 * Pastille d'état (classe `cx-status` de `bundle.css`, README du design system, composant ReadinessGauge).
 * Le mot et l'icône vont toujours ensemble : la couleur ne porte jamais seule le sens. L'état vient du moteur (`readiness`, calculs.md,
 * « Préparation et jauge ») ; le composant ne le recalcule pas. Sert aux lignes de la frise compacte et aux nœuds vaincus.
 */
const props = defineProps<{
  /** État de préparation calculé par le moteur. */
  state: ReadinessId
}>()

/** Mot, icône et classe de chaque état (README : Prêt, Limite, Trop tôt, Vaincu, Non estimé). */
const STATES: Record<ReadinessId, { label: string; icon: string }> = {
  ready: { label: 'Prêt', icon: 'check-c' },
  limit: { label: 'Limite', icon: 'alert' },
  early: { label: 'Trop tôt', icon: 'clock' },
  defeated: { label: 'Vaincu', icon: 'check' },
  unknown: { label: 'Non estimé', icon: 'empty' },
}
/** Classe de style de chaque état (`done` pour Vaincu, `unknown` pour Non estimé). */
const CLASSES: Record<ReadinessId, string> = { ready: 'ready', limit: 'limit', early: 'early', defeated: 'done', unknown: 'unknown' }

const info = computed(() => STATES[props.state])
</script>

<template>
  <span
    class="cx-status"
    :class="CLASSES[state]"
  ><CxIcon :name="info.icon" />{{ info.label }}</span>
</template>

<style>
.cx-status { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 7px 0 5px; border-radius: var(--radius-s); font: 600 12px/16px var(--font-sans); white-space: nowrap; justify-self: start; }
.cx-status .cx-i { width: 14px; height: 14px; vertical-align: 0; }
.cx-status.ready { background: var(--ready-wash); color: var(--ready); }
.cx-status.limit { background: var(--warn-wash); color: var(--warn); }
.cx-status.early { background: var(--danger-wash); color: var(--danger); }
.cx-status.done { background: var(--surface-hover); color: var(--ink-2); }
.cx-status.unknown { background: transparent; border: 1px dashed var(--line-strong); color: var(--ink-2); }
</style>
