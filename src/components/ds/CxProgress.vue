<!-- Barre de progression (premier chargement des données, avancement chiffré). -->
<script setup lang="ts">
import { computed } from 'vue'

/**
 * Barre de progression `progressbar` (README du design system, composant States). Le compteur chiffré
 * (« 11 fichiers sur 18 ») est affiché à côté par l'appelant : la barre seule ne suffit pas.
 */
const props = withDefaults(
  defineProps<{
    /** Valeur atteinte. */
    value: number
    /** Valeur à atteindre (100 par défaut). */
    max?: number
    /** Nom accessible de ce qui progresse (« Chargement des données »). */
    label: string
  }>(),
  { max: 100 },
)

const percent = computed(() => (props.max > 0 ? Math.min(100, Math.max(0, (props.value / props.max) * 100)) : 0))
</script>

<template>
  <div
    class="cx-progress"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value"
  >
    <span :style="{ width: `${percent}%` }" />
  </div>
</template>

<style>
.cx-progress { height: 6px; overflow: hidden; border-radius: 3px; background: var(--surface-sunken); }
.cx-progress > span { display: block; height: 100%; border-radius: 3px; background: var(--gold); transition: width .15s ease; }
@media (prefers-reduced-motion: reduce) { .cx-progress > span { transition: none; } }
</style>
