<!-- PROVISOIRE : emplacement d'un écran pas encore construit (titre de l'écran et mention). Remplacé, vue par vue, par les tâches des écrans. -->
<script setup lang="ts">
/**
 * Emplacement minimal d'un écran à venir : un titre `h1` (cible du focus à chaque changement de route) et une mention.
 * Les vues provisoires de `src/views/` l'utilisent ; chacune disparaît quand l'écran réel est écrit.
 */
defineProps<{
  /** Titre de l'écran. */
  title: string
}>()
</script>

<template>
  <section class="v-provisional">
    <h1 class="titre-l">
      {{ title }}
    </h1>
    <p class="cx-muted">
      Cet écran n’est pas encore construit.
    </p>
  </section>
</template>

<style scoped>
.v-provisional { display: grid; gap: var(--space-2); padding: var(--space-6); }
</style>
