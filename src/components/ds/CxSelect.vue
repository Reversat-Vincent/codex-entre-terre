<!-- Liste déroulante native (plus de cinq options : origine, archétype, profil). -->
<script setup lang="ts">
import type { SelectOption } from './types.ts'

/**
 * Liste déroulante (README du design system, FormControls) : l'élément racine est le `select` natif.
 * L'étiquette est fournie par l'appelant : un `<label for>` relié à l'attribut `id` passé au composant, ou un `aria-label`.
 */
defineProps<{
  /** Options, dans l'ordre d'affichage. */
  options: readonly SelectOption[]
}>()

/** Valeur de l'option choisie. */
const model = defineModel<string>({ required: true })
</script>

<template>
  <select
    v-model="model"
    class="cx-select"
  >
    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<style>
.cx-select { height: var(--size-controle); padding: 0 var(--space-2); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink); font-size: 13px; font-weight: 600; min-width: 0; }
@media (max-width: 767px) { .cx-select { height: var(--size-cible); } }
</style>
