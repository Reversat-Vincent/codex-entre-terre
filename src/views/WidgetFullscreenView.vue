<!-- Écran « Plein écran » d'un widget (`/plein-ecran/:widgetId`) : aiguille vers la vue dédiée du widget, ou rend son corps en mode `fullscreen`. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CriteriaChipsBar from '../components/criteria/CriteriaChipsBar.vue'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import { hasCriteriaPanel } from '../router/meta.ts'
import { FULLSCREEN_VIEWS, WIDGET_BODIES } from '../widgets/components.ts'
import { isWidgetId } from '../widgets/ids.ts'
import type { WidgetId } from '../widgets/ids.ts'
import { WIDGETS } from '../widgets/registry.ts'
import WidgetFullscreenFrame from '../widgets/WidgetFullscreenFrame.vue'

/**
 * Plein écran générique (architecture § 9 ; note `spec-full`). Seuls les widgets marqués `fullscreen` au registre ont un plein écran ; un identifiant
 * inconnu ou un widget sans plein écran affiche un état vide qui ramène au tableau de bord.
 * Aiguillage : si `FULLSCREEN_VIEWS` donne une vue dédiée au widget (A, `WeaponsFullscreenView`), elle est rendue ; sinon le corps du widget est rendu
 * en mode `fullscreen` dans `WidgetFullscreenFrame` (en-tête, « Quitter le plein écran », Échap, états de chargement).
 * Les puces de critères sont en tête pour le seul widget A, le seul à porter le panneau de critères (`hasCriteriaPanel`).
 */
const route = useRoute()

const widgetId = computed<WidgetId | null>(() => {
  const raw = route.params.widgetId
  const id = Array.isArray(raw) ? raw[0] : raw
  return isWidgetId(id) && WIDGETS[id].fullscreen ? id : null
})
const dedicated = computed(() => (widgetId.value === null ? undefined : FULLSCREEN_VIEWS[widgetId.value]))
const body = computed(() => (widgetId.value === null ? undefined : WIDGET_BODIES[widgetId.value]))
</script>

<template>
  <div class="v-full">
    <CriteriaChipsBar v-if="hasCriteriaPanel(route)" />
    <template v-if="widgetId !== null">
      <component
        :is="dedicated"
        v-if="dedicated"
      />
      <WidgetFullscreenFrame
        v-else
        :widget-id="widgetId"
      >
        <component
          :is="body"
          mode="fullscreen"
        />
      </WidgetFullscreenFrame>
    </template>
    <template v-else>
      <h1 class="titre-l">
        Plein écran
      </h1>
      <CxEmptyState
        title="Ce widget n'a pas de vue plein écran"
        text="L'adresse ne correspond à aucun widget qui s'ouvre en plein écran."
      />
      <div>
        <CxButton
          icon="dash"
          href="#/"
        >
          Retour au tableau de bord
        </CxButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.v-full { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; padding: var(--space-6); }
@media (max-width: 767px) { .v-full { padding: var(--space-4); } }
</style>
