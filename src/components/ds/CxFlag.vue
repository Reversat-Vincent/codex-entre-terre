<!-- Drapeau d'une entrée : petit repère en texte et icône (Remembrance, butin aléatoire, quête, Grande Rune), à risque ou neutre. -->
<script setup lang="ts">
import CxIcon from './CxIcon.vue'

/**
 * Drapeau (classe `cx-flag` de `bundle.css`, README du design system, composants WeaponCard et BossTimeline).
 * Un drapeau « à risque » (`alert`) signale un coût caché : échange de Remembrance, butin aléatoire, quête manquable.
 * Le mot et l'icône disent le sens : la couleur ne le porte jamais seule. L'explication longue va dans `title`.
 */
defineProps<{
  /** Libellé affiché (« Remembrance »). */
  label: string
  /** Nom d'une icône du sprite, sans le préfixe `i-` (`trade`, `dice`, `quest`, `rune`). */
  icon: string
  /** Drapeau à risque : fond et bordure `warn`. */
  alert?: boolean
  /** Explication en une phrase, en info-bulle native. */
  title?: string
}>()
</script>

<template>
  <span
    class="cx-flag"
    :class="{ 'is-alert': alert }"
    :title="title"
  ><CxIcon :name="icon" />{{ label }}</span>
</template>

<style>
.cx-flag { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px; border: 1px solid var(--line-strong); border-radius: var(--radius-xs); background: var(--surface); color: var(--ink-2); font: 600 11px/14px var(--font-sans); white-space: nowrap; }
.cx-flag .cx-i { width: 12px; height: 12px; vertical-align: 0; }
.cx-flag.is-alert { border-color: color-mix(in srgb, var(--warn) 55%, transparent); color: var(--warn); background: var(--warn-wash); }
</style>
