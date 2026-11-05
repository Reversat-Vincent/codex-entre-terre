<!-- PROVISOIRE : emplacement de l'écran « Plein écran » ; ce fichier sera remplacé par la tâche qui construit l'écran (docs/architecture.md § 9). -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import CriteriaChipsBar from '../components/criteria/CriteriaChipsBar.vue'
import ProvisionalScreen from '../components/shell/ProvisionalScreen.vue'
import { hasCriteriaPanel } from '../router/meta.ts'

const route = useRoute()
</script>

<template>
  <!-- Les puces de critères accompagnent le plein écran du widget A (note `spec-full`), seul à porter le panneau de critères. -->
  <div
    v-if="hasCriteriaPanel(route)"
    class="v-full-chips"
  >
    <CriteriaChipsBar />
  </div>
  <ProvisionalScreen title="Plein écran" />
</template>

<style scoped>
.v-full-chips { padding: var(--space-4) var(--space-6) 0; }
@media (max-width: 767px) { .v-full-chips { padding-inline: var(--space-4); } }
</style>
