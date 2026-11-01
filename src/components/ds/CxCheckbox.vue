<!-- Case à cocher native avec son libellé et un compteur facultatif à droite (sélections multiples : contenus, classes d'armes). -->
<script setup lang="ts">
import { computed } from 'vue'
import { formatInt } from '../../ui/format.ts'

/**
 * Case à cocher (README du design system, FormControls) : un vrai `input` dans son `label`.
 * Le compteur d'un nombre est formaté par `format.ts`.
 */
const props = defineProps<{
  /** Libellé de la case, si le slot par défaut n'est pas utilisé. */
  label?: string
  /** Compteur affiché à droite (nombre d'entrées concernées) : un nombre est formaté, un texte est repris tel quel. */
  meta?: number | string
  /** Case inactive. */
  disabled?: boolean
}>()

/** État coché ou non. */
const model = defineModel<boolean>({ required: true })

const metaText = computed(() => (typeof props.meta === 'number' ? formatInt(props.meta) : props.meta))
</script>

<template>
  <label class="cx-check">
    <input
      v-model="model"
      type="checkbox"
      :disabled="disabled"
    >
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="metaText !== undefined"
      class="cx-check-meta"
    >{{ metaText }}</span>
  </label>
</template>

<style>
.cx-check { display: flex; align-items: center; gap: var(--space-2); min-height: 26px; color: var(--ink); font-size: 13px; cursor: pointer; }
.cx-check input { width: 15px; height: 15px; margin: 0; flex: none; cursor: pointer; }
.cx-check-meta { margin-left: auto; color: var(--ink-3); font-size: 12px; font-variant-numeric: tabular-nums; }
@media (max-width: 767px) { .cx-check { min-height: var(--size-cible); } .cx-check input { width: 20px; height: 20px; } }
</style>
