<!-- Cadre commun d'une fiche : fil d'Ariane, puis selon l'état soit le squelette de chargement, soit l'erreur avec « Réessayer », soit « Élément introuvable », soit la fiche. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { FailedFile } from '../../../stores/data.ts'
import CxButton from '../../ds/CxButton.vue'
import CxEmptyState from '../../ds/CxEmptyState.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxNote from '../../ds/CxNote.vue'
import CxSkeleton from '../../ds/CxSkeleton.vue'
import { SHEET_KINDS } from './sheetKinds.ts'
import type { SheetKind } from './sheetKinds.ts'
import type { SheetView } from './useSheetEntry.ts'

/**
 * Page de fiche (cahier des charges : états chargement, erreur, « Élément introuvable » pour toute fiche). Le contenu de la fiche est le slot par défaut,
 * rendu seulement à l'état `ready`. Le fil d'Ariane (Explorer, catalogue du genre, catégorie, nom) est commun à tous les genres.
 */
const props = defineProps<{
  kind: SheetKind
  /** État d'affichage donné par `useSheetEntry`. */
  view: SheetView
  /** Nom de l'entité, une fois connue (dernier maillon du fil d'Ariane). */
  name?: string | null
  /** Catégorie de l'entité (donnée du wiki, affichée telle quelle) ; absente : pas de maillon. */
  category?: string | null
  /** Fichiers en échec, nommés dans le message d'erreur. */
  failed?: readonly FailedFile[]
}>()

const emit = defineEmits<{
  /** L'utilisateur demande une nouvelle lecture des fichiers en échec. */
  retry: []
}>()

defineSlots<{
  /** Contenu de la fiche (état `ready`). */
  default?(): unknown
}>()

const info = computed(() => SHEET_KINDS[props.kind])
</script>

<template>
  <article
    class="sh-page"
    :aria-busy="view === 'loading'"
  >
    <nav
      class="sh-crumb"
      aria-label="Fil d’Ariane"
    >
      <RouterLink :to="{ name: 'explore' }">
        Explorer
      </RouterLink>
      <CxIcon
        name="chev-r"
        size="xs"
      />
      <RouterLink :to="{ name: info.listRoute }">
        {{ info.listLabel }}
      </RouterLink>
      <template v-if="view === 'ready' && category && category !== info.listLabel">
        <CxIcon
          name="chev-r"
          size="xs"
        />
        <span>{{ category }}</span>
      </template>
      <template v-if="view === 'ready' && name">
        <CxIcon
          name="chev-r"
          size="xs"
        />
        <span aria-current="page">{{ name }}</span>
      </template>
    </nav>

    <div
      v-if="view === 'loading'"
      class="cx-loading sh-state"
    >
      <CxSkeleton
        width="35%"
        :height="40"
      />
      <CxSkeleton :height="16" />
      <CxSkeleton :height="220" />
      <span
        class="cx-sr"
        role="status"
      >Chargement de la fiche</span>
    </div>

    <div
      v-else-if="view === 'error'"
      class="sh-state"
    >
      <CxNote
        tone="warn"
        :title="info.errorTitle"
        role="alert"
      >
        <template v-if="failed && failed.length > 0">
          Fichier concerné : {{ failed.map((f) => f.label).join(', ') }}.
        </template>
        <CxButton
          size="sm"
          icon="refresh"
          @click="emit('retry')"
        >
          Réessayer
        </CxButton>
      </CxNote>
    </div>

    <div
      v-else-if="view === 'missing'"
      class="sh-state"
    >
      <h1 class="titre-l">
        Élément introuvable
      </h1>
      <CxEmptyState
        :title="info.missingTitle"
        text="Le lien est peut-être ancien. Le catalogue liste tout ce qui est disponible."
      />
      <RouterLink
        class="cx-btn"
        :to="{ name: info.listRoute }"
      >
        {{ info.backLabel }}
      </RouterLink>
    </div>

    <slot v-else />
  </article>
</template>

<style scoped>
.sh-page { display: grid; gap: var(--space-4); align-content: start; min-width: 0; max-width: 1440px; padding: var(--space-5) var(--space-6) var(--space-6); }
.sh-crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.sh-crumb a { color: var(--ink-3); }
.sh-state { display: grid; gap: var(--space-4); justify-items: start; max-width: 720px; }
@media (max-width: 767px) {
  .sh-page { padding: var(--space-4); }
}
</style>
