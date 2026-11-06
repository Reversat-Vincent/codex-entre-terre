<!-- Icône du sprite (`IconSprite`) : SVG au trait qui hérite de `currentColor`, aux tailles du design system. -->
<script setup lang="ts">
import { computed } from 'vue'

/**
 * Icône du sprite du design system.
 * Décorative par défaut (masquée aux lecteurs d'écran) ; avec `label`, elle devient une image nommée.
 * Le sprite `IconSprite` doit être présent une fois dans la page.
 */
const props = withDefaults(
  defineProps<{
    /** Nom du symbole sans le préfixe `i-` (`search`, `chev-d`, `s-sote`, `d-fire`…). */
    name: string
    /** Taille : `xs` 12 px, `sm` 14 px, `md` 16 px (défaut), `lg` 20 px, `xl` 24 px. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    /** Remplit le tracé avec `currentColor` (icônes pleines). */
    filled?: boolean
    /** Nom accessible quand l'icône porte seule un sens ; sinon elle est décorative. */
    label?: string
  }>(),
  { size: 'md', filled: false, label: undefined },
)

const classes = computed(() => ['cx-i', props.size === 'md' ? '' : props.size, props.filled ? 'fill' : ''])
</script>

<template>
  <svg
    :class="classes"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <use :href="`#i-${name}`" />
  </svg>
</template>

<style>
.cx-i { width: 16px; height: 16px; flex: none; stroke: currentColor; stroke-width: 1.6; fill: none; stroke-linecap: round; stroke-linejoin: round; vertical-align: -3px; }
.cx-i.sm { width: 14px; height: 14px; vertical-align: -2px; }
.cx-i.xs { width: 12px; height: 12px; vertical-align: -1px; }
.cx-i.lg { width: 20px; height: 20px; }
.cx-i.xl { width: 24px; height: 24px; }
.cx-i.fill { fill: currentColor; }
</style>
