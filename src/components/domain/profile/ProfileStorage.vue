<!-- Section « Stockage » : où sont enregistrés les réglages, et ce que l'état du stockage implique. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../../../stores/app.ts'
import CxNote from '../../ds/CxNote.vue'
import { describeStorage } from './profileModel.ts'
import ProfileSection from './ProfileSection.vue'

/**
 * État du stockage (architecture § 7, mode dégradé) lu dans le store `app` : en clair, avec une icône et une phrase (jamais la couleur seule),
 * puis la liste de ce que cet état implique. Le texte vient de `describeStorage` ; ce composant n'accède pas au stockage lui-même.
 */
const app = useAppStore()
const report = computed(() => describeStorage(app.storage))
</script>

<template>
  <ProfileSection title="Stockage">
    <CxNote
      :tone="report.tone"
      :icon="report.icon"
      :title="report.title"
      role="status"
    >
      <ul class="v-profile-storage-list">
        <li
          v-for="line in report.implications"
          :key="line"
        >
          {{ line }}
        </li>
      </ul>
    </CxNote>
  </ProfileSection>
</template>

<style>
.v-profile-storage-list { display: grid; gap: var(--space-1); margin: var(--space-2) 0 0; padding-left: var(--space-4); list-style: disc; }
</style>
