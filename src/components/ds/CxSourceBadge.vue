<!-- Badge de provenance d'une entrée : jeu de base, extension, Tarnished Pack, ou badge double pour un boss présent dans les deux contenus. -->
<script setup lang="ts">
import { computed } from 'vue'
import { SOURCE_BOTH_LABEL, SOURCE_LABELS, type SourceName } from '../../ui/labels.ts'
import CxIcon from './CxIcon.vue'

/**
 * Badge de source, à placer juste après le nom de l'entité (README du design system, composant SourceBadge).
 * La source se distingue par la forme de l'icône et par le mot, jamais par la couleur seule.
 */
const props = defineProps<{
  /** Valeur du champ `source` de l'entrée ou de la rencontre, telle qu'elle figure dans les données. */
  source: SourceName
}>()

const single = computed(() => (props.source === 'Base game + Shadow of the Erdtree' ? null : SOURCE_LABELS[props.source]))
const classes = computed(() => {
  switch (props.source) {
    case 'Base game':
      return 'cx-src-base'
    case 'Shadow of the Erdtree':
      return 'cx-src-sote'
    case 'Tarnished Pack':
      return 'cx-src-tp'
    default:
      return 'cx-src-both'
  }
})
</script>

<template>
  <span
    v-if="single"
    class="cx-badge"
    :class="classes"
    :title="single.title"
    :aria-label="single.aria"
  >
    <CxIcon :name="single.icon" />{{ single.short }}
  </span>
  <span
    v-else
    class="cx-badge cx-src-both"
    :title="SOURCE_BOTH_LABEL.title"
    :aria-label="SOURCE_BOTH_LABEL.aria"
  >
    <span><CxIcon :name="SOURCE_LABELS['Base game'].icon" />{{ SOURCE_LABELS['Base game'].short }}</span>
    <span><CxIcon :name="SOURCE_LABELS['Shadow of the Erdtree'].icon" />{{ SOURCE_LABELS['Shadow of the Erdtree'].short }}</span>
  </span>
</template>

<style>
.cx-badge { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px; border: 1px solid transparent; border-radius: var(--radius-xs); font: 600 11px/14px var(--font-sans); letter-spacing: .02em; white-space: nowrap; vertical-align: middle; }
.cx-badge .cx-i { width: 11px; height: 11px; vertical-align: 0; }
.cx-src-base { background: var(--src-base-wash); color: var(--src-base); border-color: var(--line-strong); }
.cx-src-sote { background: var(--src-sote-wash); color: var(--src-sote); border-color: color-mix(in srgb, var(--src-sote) 45%, transparent); }
.cx-src-tp { background: var(--src-tp-wash); color: var(--src-tp); border-color: color-mix(in srgb, var(--src-tp) 45%, transparent); }
.cx-src-both { padding: 0; overflow: hidden; border-color: var(--line-strong); }
.cx-src-both > span { display: inline-flex; align-items: center; gap: 4px; height: 100%; padding: 0 6px; }
.cx-src-both > span:first-child { background: var(--src-base-wash); color: var(--src-base); }
.cx-src-both > span:last-child { background: var(--src-sote-wash); color: var(--src-sote); }
</style>
