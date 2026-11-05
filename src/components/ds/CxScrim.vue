<!-- Voile assombri derrière une surcouche (feuille, tiroir, palette) : un clic dessus demande la fermeture. -->
<script setup lang="ts">
/**
 * Voile des surcouches. Seule définition de `.cx-scrim` : `CxSheet` et `CxCommandPalette` l'utilisent au lieu de la redéfinir.
 * Il n'est pas focalisable : la fermeture au clavier passe par Échap, géré par la surcouche.
 */
const emit = defineEmits<{
  /** Clic sur le voile. */
  close: []
}>()
</script>

<template>
  <div
    class="cx-scrim"
    @click="emit('close')"
  />
</template>

<style>
.cx-scrim { position: absolute; inset: 0; background: var(--scrim); }
</style>
