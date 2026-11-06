<!-- Invite de mise à jour : « Une nouvelle version est disponible », avec « Recharger » et « Plus tard ». Interface seule, pilotée par `useAppUpdate`. -->
<script setup lang="ts">
import { useAppUpdate } from '../../composables/useAppUpdate.ts'
import CxButton from '../ds/CxButton.vue'
import CxNote from '../ds/CxNote.vue'

/**
 * Invite de mise à jour (architecture § 11). Elle ne fait rien d'elle-même : l'état et l'action « Recharger » viennent de `useAppUpdate`,
 * que l'enregistrement du service worker alimente par `announceUpdate`. Les données et le manifeste étant précachés ensemble,
 * recharger donne toujours une version complète ; l'invite ne force jamais le rechargement.
 */
const { visible, reload, dismiss } = useAppUpdate()
</script>

<template>
  <div
    v-if="visible"
    class="cx-update"
  >
    <CxNote
      tone="calc"
      title="Une nouvelle version est disponible."
      icon="refresh"
      role="status"
    >
      <span class="cx-update-row">
        <span>Rechargez pour l’utiliser ; vos réglages et vos listes sont conservés.</span>
        <span class="cx-update-actions">
          <CxButton
            size="sm"
            variant="primary"
            @click="reload()"
          >Recharger</CxButton>
          <CxButton
            size="sm"
            variant="ghost"
            @click="dismiss()"
          >Plus tard</CxButton>
        </span>
      </span>
    </CxNote>
  </div>
</template>

<style>
.cx-update { padding: var(--space-3) var(--space-6) 0; }
.cx-update-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.cx-update-actions { display: inline-flex; gap: var(--space-1); }
@media (max-width: 1279px) { .cx-update { padding-inline: var(--space-4); } }
</style>
