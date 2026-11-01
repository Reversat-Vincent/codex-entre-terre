<!-- Choix exclusif court sous forme de segments (style de jeu, étape, une main ou deux mains). -->
<script setup lang="ts" generic="T extends string | number">
import type { SegmentedOption } from './types.ts'

/**
 * Groupe de segments (README du design system, FormControls) : chaque segment est un `button` avec `aria-pressed`.
 * Le modèle est la valeur du segment actif ; chaque changement s'applique immédiatement (pas de bouton « Appliquer »).
 */
defineProps<{
  /** Segments, dans l'ordre d'affichage. */
  options: readonly SegmentedOption<T>[]
  /** Nom accessible du groupe (« Style de jeu »). */
  label: string
  /** Occupe toute la largeur disponible, segments de largeur égale. */
  full?: boolean
}>()

/** Valeur du segment actif. */
const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    class="cx-seg"
    :class="{ full }"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="option.value === model"
      :title="option.title"
      :disabled="option.disabled"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style>
.cx-seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); }
.cx-seg > button { height: 26px; padding: 0 var(--space-2); border: 0; border-radius: var(--radius-xs); background: transparent; color: var(--ink-2); font-size: 12px; font-weight: 600; cursor: pointer; }
.cx-seg > button:hover { background: var(--surface-hover); color: var(--ink); }
.cx-seg > button[aria-pressed="true"] { background: var(--gold-wash); color: var(--gold-text); box-shadow: inset 0 0 0 1px var(--gold-line); }
.cx-seg > button:disabled { background: transparent; color: var(--ink-disabled); cursor: not-allowed; }
.cx-seg.full { display: flex; }
.cx-seg.full > button { flex: 1 1 0; }
@media (max-width: 767px) { .cx-seg > button { height: calc(var(--size-cible) - 6px); } }
</style>
