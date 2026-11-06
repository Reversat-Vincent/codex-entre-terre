<!-- Curseur natif pour une valeur continue, avec sa valeur lisible à côté. -->
<script setup lang="ts">
/**
 * Curseur (README du design system, FormControls) : un `input type="range"` suivi de sa valeur lisible.
 * L'étiquette est fournie par l'appelant (`<label for>` relié à `id`, ou `aria-label`) ; les attributs non déclarés vont à l'`input`.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  /** Valeur minimale. */
  min: number
  /** Valeur maximale. */
  max: number
  /** Pas du curseur (1 par défaut). */
  step?: number
  /** Valeur lisible déjà formatée (par exemple `formatPercent(70)`) : affichée à côté et lue par les lecteurs d'écran. */
  valueText?: string
}>()

/** Valeur courante. */
const model = defineModel<number>({ required: true })
</script>

<template>
  <span class="cx-range-field">
    <input
      v-bind="$attrs"
      v-model.number="model"
      class="cx-range"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :aria-valuetext="valueText"
    >
    <span
      v-if="valueText"
      class="cx-num cx-range-value"
    >{{ valueText }}</span>
  </span>
</template>

<style>
.cx-range { width: 100%; margin: 0; }
.cx-range-field { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.cx-range-field > .cx-range { flex: 1 1 auto; min-width: 0; }
.cx-range-value { flex: none; }
/* Mobile : le curseur occupe 44 px de haut (cible tactile) ; la glissière reste centrée. */
@media (max-width: 767px) { .cx-range { height: var(--size-cible); } }
</style>
