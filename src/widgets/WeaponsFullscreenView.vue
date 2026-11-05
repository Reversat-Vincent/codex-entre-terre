<!-- PROVISOIRE : plein écran dédié du widget A (note `spec-full`) ; ce fichier sera remplacé, seul, par la tâche qui construit cette vue. -->
<script setup lang="ts">
import WeaponsByStageWidget from './WeaponsByStageWidget.vue'
import WidgetFullscreenFrame from './WidgetFullscreenFrame.vue'

/**
 * Plein écran du widget `weapons-by-stage`, aiguillé par `WidgetFullscreenView` (`FULLSCREEN_VIEWS`). Les puces de critères sont déjà
 * affichées au-dessus par la vue générique. Provisoire : le cadre commun (en-tête, « Quitter le plein écran », Échap, états) autour du corps provisoire.
 */
</script>

<template>
  <WidgetFullscreenFrame widget-id="weapons-by-stage">
    <WeaponsByStageWidget mode="fullscreen" />
  </WidgetFullscreenFrame>
</template>
