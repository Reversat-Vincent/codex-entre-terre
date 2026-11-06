<!-- Section « Versions » : application, données du jeu (version et date d'extraction) et schéma de sauvegarde. -->
<script setup lang="ts">
import { computed } from 'vue'
import { CURRENT_SCHEMA } from '../../../persistence/schema.ts'
import { useAppStore } from '../../../stores/app.ts'
import { useDataStore } from '../../../stores/data.ts'
import { formatDate } from '../../../ui/format.ts'
import CxValue from '../../ds/CxValue.vue'
import ProfileSection from './ProfileSection.vue'

/**
 * Versions utiles pour un signalement ou une restauration : version de l'application (`app.appVersion`), empreinte et date d'extraction des données
 * (manifeste du store `data`), version du schéma des sauvegardes (`CURRENT_SCHEMA`, constante du module de persistance). Tant que le manifeste
 * n'est pas lu, « Chargement » ; s'il a échoué, « Indisponible » : jamais une valeur inventée.
 */
const app = useAppStore()
const data = useDataStore()

const manifest = computed(() => data.manifest)
const dataState = computed(() => (data.manifestStatus === 'error' ? 'Indisponible' : 'Chargement…'))
const extraction = computed(() => formatDate(manifest.value?.retrieved, 'long'))
</script>

<template>
  <ProfileSection title="Versions">
    <dl class="v-profile-versions">
      <div>
        <dt>Application</dt>
        <dd>{{ app.appVersion }}</dd>
      </div>
      <div>
        <dt>Données du jeu</dt>
        <dd v-if="manifest">
          <code>{{ manifest.dataVersion }}</code>
          <span class="cx-muted">empreinte des fichiers de données</span>
        </dd>
        <dd v-else>
          {{ dataState }}
        </dd>
      </div>
      <div>
        <dt>Extraction du wiki</dt>
        <dd v-if="manifest">
          <CxValue :value="extraction" />
          <span
            v-if="extraction"
            class="cx-muted"
          >source : eldenring.wiki.gg</span>
        </dd>
        <dd v-else>
          {{ dataState }}
        </dd>
      </div>
      <div>
        <dt>Schéma de sauvegarde</dt>
        <dd>
          {{ CURRENT_SCHEMA }}
          <span class="cx-muted">version du format des fichiers d’export et d’import</span>
        </dd>
      </div>
    </dl>
  </ProfileSection>
</template>

<style>
.v-profile-versions { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-3); margin: 0; }
.v-profile-versions > div { display: grid; align-content: start; gap: 2px; padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-s); background: var(--surface-raised); }
.v-profile-versions dt { color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.v-profile-versions dd { display: grid; gap: 2px; margin: 0; min-width: 0; color: var(--ink); font-size: 16px; line-height: 22px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.v-profile-versions dd .cx-muted { font-size: 12px; line-height: 16px; font-weight: 400; }
.v-profile-versions code { font-family: var(--font-sans); font-variant-numeric: tabular-nums; }
</style>
