<!-- Progression du chargement des données, fichier par fichier ; échec du manifeste avec « Réessayer ». -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FILE_KEYS } from '../../data/datasets.ts'
import { useDataStore } from '../../stores/data.ts'
import CxNote from '../ds/CxNote.vue'
import CxButton from '../ds/CxButton.vue'
import CxProgress from '../ds/CxProgress.vue'

/**
 * Bandeau de progression (note `spec-main`, « Premier chargement : progression par fichier »). Il compte les fichiers demandés par les écrans
 * (états `loading` et `ready` du store `data`) et ne s'affiche qu'après un court délai : un chargement instantané, depuis le cache, ne fait pas clignoter la page.
 * Un échec du manifeste est signalé ici avec « Réessayer » ; un fichier illisible est signalé dans les widgets et écrans qui en dépendent.
 */
const SHOW_DELAY_MS = 300

const data = useDataStore()

const counts = computed(() => {
  let ready = 0
  let loading = 0
  for (const key of FILE_KEYS) {
    const status = data.files[key].status
    if (status === 'ready') ready++
    else if (status === 'loading') loading++
  }
  return { ready, loading, total: ready + loading }
})

const busy = computed(() => data.manifestStatus === 'loading' || counts.value.loading > 0)
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  busy,
  (isBusy) => {
    clearTimeout(timer)
    if (isBusy) timer = setTimeout(() => (visible.value = true), SHOW_DELAY_MS)
    else visible.value = false
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))

const manifestFailed = computed(() => data.manifestStatus === 'error')
</script>

<template>
  <div class="cx-load">
    <CxNote
      v-if="manifestFailed"
      tone="warn"
      title="Données indisponibles."
      role="alert"
    >
      <span class="cx-load-row">
        <span>{{ data.manifestError?.message ?? 'Le manifeste des données n’a pas pu être lu.' }}</span>
        <CxButton
          size="sm"
          icon="refresh"
          @click="data.retry('manifest')"
        >Réessayer</CxButton>
      </span>
    </CxNote>
    <div
      v-else-if="visible"
      class="cx-load-box"
      role="status"
    >
      <span>
        Chargement des données —
        {{ counts.total > 0 ? `${counts.ready} fichier${counts.ready > 1 ? 's' : ''} sur ${counts.total}` : 'lecture du manifeste' }}
      </span>
      <CxProgress
        :value="counts.ready"
        :max="Math.max(counts.total, 1)"
        label="Chargement des données"
      />
    </div>
  </div>
</template>

<style>
.cx-load:not(:empty) { padding: var(--space-3) var(--space-6) 0; }
.cx-load:empty { display: none; }
.cx-load-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.cx-load-box { display: grid; gap: var(--space-2); padding: var(--space-3) var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); font-size: 13px; }
@media (max-width: 1279px) { .cx-load:not(:empty) { padding-inline: var(--space-4); } }
</style>
