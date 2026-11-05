<!-- Pied d'un corps de widget : badge Calculé et la phrase qui dit sur quoi repose le résultat. -->
<script setup lang="ts">
import CxReliabilityBadge from '../../components/ds/CxReliabilityBadge.vue'

/**
 * Pied des widgets D2 et D5 (design `Main.dc.html`, `.cx-w-foot`). `WidgetHost` ne transmet pas le slot `foot` de `CxWidgetShell` : le corps
 * dessine donc son propre pied, sous le contenu. Le texte (slot par défaut) est écrit par le widget.
 */
</script>

<template>
  <p class="wd-foot">
    <CxReliabilityBadge kind="calculated" />
    <span><slot /></span>
  </p>
</template>

<style scoped>
.wd-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); margin: 0; padding-top: var(--space-3); border-top: 1px solid var(--line); color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
