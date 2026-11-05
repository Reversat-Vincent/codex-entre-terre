<!-- Alertes de qualité des données en tête de fiche : champs non documentés, obtention absente, incohérences du wiki avec leur raison. -->
<script setup lang="ts">
import CxNote from '../../ds/CxNote.vue'
import type { SheetAlert } from './sheetModel.ts'

/**
 * Liste d'alertes (`CxNote`, une par constat). Chaque bandeau porte une icône et un mot en tête : jamais la couleur seule.
 * Le texte d'une raison (`detail`) est une donnée du wiki : il reste en anglais, tel quel.
 */
defineProps<{
  /** Alertes à afficher (produites par le modèle de chaque genre) ; vide : rien n'est rendu. */
  alerts: readonly SheetAlert[]
}>()
</script>

<template>
  <ul
    v-if="alerts.length > 0"
    class="sh-alerts"
    aria-label="Alertes de qualité des données"
  >
    <li
      v-for="a in alerts"
      :key="a.id"
    >
      <CxNote
        :tone="a.tone"
        :title="a.title"
      >
        {{ a.text }}
        <span
          v-if="a.detail"
          class="sh-alert-detail"
        >{{ a.detail }}</span>
      </CxNote>
    </li>
  </ul>
</template>

<style scoped>
.sh-alerts { display: grid; gap: 6px; }
.sh-alert-detail { display: block; margin-top: 2px; color: var(--ink-3); font-style: italic; overflow-wrap: anywhere; }
</style>
