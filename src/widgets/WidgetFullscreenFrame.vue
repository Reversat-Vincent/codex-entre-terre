<!-- Cadre du plein écran d'un widget : titre, « comment c'est calculé », « Quitter le plein écran », états de chargement, puis le corps en slot. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import CxButton from '../components/ds/CxButton.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import { useHotkeys } from '../composables/useHotkeys.ts'
import { useWidgetData } from '../composables/useWidgetData.ts'
import { labelText } from '../ui/explainText.ts'
import type { WidgetId } from './ids.ts'
import { WIDGETS } from './registry.ts'

/**
 * Cadre commun des plein écrans (note `spec-full` : « Échap ou « Quitter le plein écran » revient au tableau de bord, à la même position »).
 * Le corps (slot par défaut) n'est monté que lorsque les fichiers requis du widget sont lus ; un fichier facultatif manquant affiche le bandeau
 * « Données partielles ». Retour : si l'écran précédent est le tableau de bord, l'historique recule, et le routeur restitue la position de défilement
 * enregistrée ; sinon (adresse ouverte directement), le tableau de bord s'ouvre au niveau du widget (ancre `#widget-<id>`).
 * Échap quitte, sauf si un menu, un panneau ou une boîte de dialogue a déjà traité la touche ou est ouvert.
 */
const props = defineProps<{
  /** Widget affiché. */
  widgetId: WidgetId
}>()

const router = useRouter()
const def = computed(() => WIDGETS[props.widgetId])
const title = computed(() => labelText(def.value.titleCode))
const how = computed(() => labelText(def.value.howCode))
const { state, errorFile, partialText, retry } = useWidgetData(() => props.widgetId)

/** Revient au tableau de bord, à la position qu'il avait avant l'ouverture. */
function quit(): void {
  if (router.options.history.state.back === '/') router.back()
  else void router.push({ name: 'dashboard', hash: `#widget-${props.widgetId}` })
}

useHotkeys({
  Escape: (event) => {
    if (event.defaultPrevented || document.querySelector('[aria-modal="true"]') !== null) return
    quit()
  },
})
</script>

<template>
  <section
    class="cx-wfs"
    :aria-labelledby="`wfs-title-${widgetId}`"
    :aria-busy="state === 'loading' ? 'true' : undefined"
  >
    <header class="cx-wfs-head">
      <div class="cx-wfs-titles">
        <h1
          :id="`wfs-title-${widgetId}`"
          class="titre-l"
        >
          {{ title }}
        </h1>
        <p class="cx-wfs-how">
          <CxIcon
            name="calc"
            size="sm"
          />{{ how }}
        </p>
      </div>
      <CxButton
        icon="min"
        @click="quit"
      >
        Quitter le plein écran
      </CxButton>
    </header>

    <div
      v-if="state === 'loading'"
      class="cx-loading"
    >
      <CxSkeleton
        width="40%"
        :height="18"
      />
      <CxSkeleton
        width="70%"
        :height="12"
      />
      <CxSkeleton
        width="55%"
        :height="12"
      />
      <span
        class="cx-sr"
        role="status"
      >Chargement en cours</span>
    </div>
    <CxNote
      v-else-if="state === 'error'"
      tone="warn"
      role="alert"
      :title="errorFile ? `Impossible de lire ${errorFile}.` : 'Impossible de charger les données de ce widget.'"
    >
      <span>Réessayez. Si l'erreur persiste, le fichier est peut-être incomplet : réinstallez les données.</span>
      <div class="cx-row cx-wfs-retry">
        <CxButton
          size="sm"
          icon="refresh"
          @click="retry"
        >
          Réessayer
        </CxButton>
      </div>
    </CxNote>
    <template v-else>
      <CxNote
        v-if="state === 'partial'"
        tone="partial"
        title="Données partielles."
      >
        {{ partialText }}
      </CxNote>
      <slot />
    </template>
  </section>
</template>

<style>
.cx-wfs { display: grid; gap: var(--space-4); min-width: 0; }
.cx-wfs-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.cx-wfs-titles { min-width: 0; }
.cx-wfs-how { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 2px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-wfs-retry { margin-top: var(--space-2); }
</style>
