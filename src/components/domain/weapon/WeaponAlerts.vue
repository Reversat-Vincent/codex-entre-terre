<!-- Alertes de qualité des données en tête de fiche : type d'amélioration déduit ou estimé, champs non documentés, incohérences du wiki avec leur raison. -->
<script setup lang="ts">
import CxNote from '../../ds/CxNote.vue'
import type { WeaponAlert } from './weaponModel.ts'

/**
 * Liste d'alertes (`CxNote`, une par constat). Chaque bandeau porte une icône et un mot en tête : jamais la couleur seule.
 * Le texte d'une raison (`detail`) est une donnée du wiki : il reste en anglais, tel quel.
 */
defineProps<{
  /** Alertes à afficher (produites par `weaponAlerts`) ; vide : rien n'est rendu. */
  alerts: readonly WeaponAlert[]
}>()
</script>

<template>
  <ul
    v-if="alerts.length > 0"
    class="wp-alerts"
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
          class="wp-alert-detail"
        >{{ a.detail }}</span>
      </CxNote>
    </li>
  </ul>
</template>

<style scoped>
.wp-alerts { display: grid; gap: 6px; }
.wp-alert-detail { display: block; margin-top: 2px; color: var(--ink-3); font-style: italic; overflow-wrap: anywhere; }
</style>
