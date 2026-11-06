<!-- Squelette de chargement : une barre aux dimensions du contenu final, figée si l'utilisateur réduit les animations. -->
<script setup lang="ts">
import { computed } from 'vue'

/**
 * Barre de squelette (README du design system, composant States). Décorative : le conteneur qui en rassemble plusieurs
 * porte `aria-busy="true"` (voir `CxWidgetShell`). Dimensions aux mesures du contenu final pour éviter tout saut de mise en page.
 */
const props = withDefaults(
  defineProps<{
    /** Largeur : nombre de pixels ou dimension CSS (`40%`). 100 % par défaut. */
    width?: number | string
    /** Hauteur : nombre de pixels ou dimension CSS. 14 px par défaut. */
    height?: number | string
  }>(),
  { width: '100%', height: 14 },
)

const toCss = (value: number | string): string => (typeof value === 'number' ? `${value}px` : value)
const style = computed(() => ({ width: toCss(props.width), height: toCss(props.height) }))
</script>

<template>
  <span
    class="cx-skel"
    :style="style"
    aria-hidden="true"
  />
</template>

<style>
.cx-skel { display: block; border-radius: var(--radius-xs); background: linear-gradient(90deg, var(--surface-raised) 0%, var(--surface-hover) 50%, var(--surface-raised) 100%); background-size: 200% 100%; animation: cx-shimmer 1.4s linear infinite; }
@keyframes cx-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.cx-loading { display: grid; gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); }
@media (prefers-reduced-motion: reduce) { .cx-skel { animation: none; } }
</style>
