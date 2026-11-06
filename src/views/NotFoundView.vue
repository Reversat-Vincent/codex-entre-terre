<!-- Écran « Page introuvable » : adresse inconnue du routeur, avec retour au tableau de bord et à l'exploration. -->
<script setup lang="ts">
import CxEmptyState from '../components/ds/CxEmptyState.vue'

/**
 * Écran « Page introuvable » (route de repli du routeur) : titre, état vide explicatif et deux liens de sortie, vers le tableau de bord
 * et vers l'exploration. Aucun état ni donnée.
 */
</script>

<template>
  <section class="v-notfound">
    <h1 class="titre-l">
      Page introuvable
    </h1>
    <CxEmptyState
      title="Cette adresse ne mène à aucun écran du Codex."
      text="Le lien est peut-être ancien ou mal recopié. Revenez au tableau de bord ou parcourez les catalogues."
    />
    <div class="cx-row">
      <RouterLink
        class="cx-btn cx-btn-primary"
        to="/"
      >
        Aller au tableau de bord
      </RouterLink>
      <RouterLink
        class="cx-btn"
        to="/explorer"
      >
        Explorer les catalogues
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.v-notfound { display: grid; gap: var(--space-4); justify-items: start; max-width: 640px; padding: var(--space-6); }
</style>
