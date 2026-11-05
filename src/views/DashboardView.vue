<!-- PROVISOIRE : emplacement de l'écran « Tableau de bord » ; ce fichier sera remplacé par la tâche qui construit l'écran (docs/architecture.md § 9). -->
<script setup lang="ts">
import CriteriaChipsBar from '../components/criteria/CriteriaChipsBar.vue'
import ProvisionalScreen from '../components/shell/ProvisionalScreen.vue'
</script>

<template>
  <!-- Les puces de critères actifs vont en tête de l'écran définitif (note `spec-main`). -->
  <div class="v-dash-chips">
    <CriteriaChipsBar />
  </div>
  <ProvisionalScreen title="Tableau de bord" />
</template>

<style scoped>
.v-dash-chips { padding: var(--space-4) var(--space-6) 0; }
@media (max-width: 767px) { .v-dash-chips { padding-inline: var(--space-4); } }
</style>
