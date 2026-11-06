<!-- Bandeau d'état du stockage : mémoire seule (stockage indisponible) ou lecture seule (données d'une version plus récente). -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/app.ts'
import CxButton from '../ds/CxButton.vue'
import CxNote from '../ds/CxNote.vue'

/**
 * Bandeau du mode dégradé de la persistance (architecture § 7). `unavailable` : « Vos réglages ne seront pas conservés sur cet appareil » ;
 * `readonly-newer` : les données ont été écrites par une version plus récente, rien n'est écrasé. Le bandeau se masque pour la session
 * (« Masquer ») mais revient au prochain chargement : l'état du stockage ne change pas.
 */
const app = useAppStore()
const hidden = ref(false)

const message = computed(() => {
  if (app.storage === 'unavailable') {
    return { title: 'Stockage indisponible.', text: 'Vos réglages ne seront pas conservés sur cet appareil. Vous pouvez exporter vos données depuis la page Profil.' }
  }
  if (app.storage === 'readonly-newer') {
    return {
      title: 'Données d’une version plus récente.',
      text: 'Cette version du Codex les lit sans les modifier : vos changements ne seront pas enregistrés. Rechargez la page pour obtenir la dernière version.',
    }
  }
  return null
})
</script>

<template>
  <div
    v-if="message && !hidden"
    class="cx-storage"
  >
    <CxNote
      tone="warn"
      :title="message.title"
      role="status"
    >
      <span class="cx-storage-row">
        <span>{{ message.text }}</span>
        <CxButton
          size="sm"
          variant="ghost"
          @click="hidden = true"
        >Masquer</CxButton>
      </span>
    </CxNote>
  </div>
</template>

<style>
.cx-storage { padding: var(--space-3) var(--space-6) 0; }
.cx-storage-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
@media (max-width: 1279px) { .cx-storage { padding-inline: var(--space-4); } }
</style>
