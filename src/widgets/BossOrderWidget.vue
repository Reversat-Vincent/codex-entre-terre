<!-- Corps du widget C « Ordre des boss et préparation » (`boss-order`) : frise de l'histoire principale, voie DLC, « Vaincu » lié aux critères. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxBossTimeline from '../components/ds/CxBossTimeline.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxReadinessStatus from '../components/ds/CxReadinessStatus.vue'
import CxReliabilityBadge from '../components/ds/CxReliabilityBadge.vue'
import CxValue from '../components/ds/CxValue.vue'
import CxWhyPanel from '../components/ds/CxWhyPanel.vue'
import { useBreakpoint } from '../composables/useBreakpoint.ts'
import { formatInt } from '../ui/format.ts'
import { useBossWidget } from './bosses/useBossWidget.ts'
import type { WidgetBodyProps } from './types.ts'

/**
 * Widget C (brief § 5.2 C, écran `Main.dc.html`, notes `spec-main` et `spec-mobile` ; calculs.md, « Frise des boss » et « Niveau recommandé d'un boss
 * et préparation »). Contrat d'un corps (`src/widgets/types.ts`) : une propriété `mode`, aucun événement.
 * Le corps lit la frise et la préparation dans le store `analysis`, et pilote `CxBossTimeline` : « Vaincu » coche les clés du nœud dans les critères
 * puis passe la progression en mode « Boss vaincus » ; « Pourquoi ? » ouvre l'explication du niveau recommandé ; « Activer Shadow of the Erdtree »
 * active le DLC. La frise est complète sur tablette et desktop, compacte sous 768 px (prochain boss mis en avant, « Voir la frise complète »
 * vers le plein écran) ; en mode `fullscreen`, elle est toujours complète.
 */
const props = defineProps<WidgetBodyProps>()

const model = useBossWidget()
const { isMobile } = useBreakpoint()
const compact = computed(() => props.mode === 'dashboard' && isMobile.value)
const showNext = computed(() => !compact.value && model.next.value !== null)
const nextLevel = computed(() => model.next.value?.level?.value?.level ?? null)
const nextConfidence = computed(() => model.next.value?.level?.estimate?.confidence ?? null)
</script>

<template>
  <div class="cx-bo">
    <CxEmptyState
      v-if="model.timeline.value === null"
      title="La frise des boss n'est pas disponible"
      text="Le fichier des boss n'a pas encore été lu. Rechargez la page si le message persiste."
    />

    <template v-else>
      <div
        v-if="showNext && model.next.value"
        class="cx-bo-next"
      >
        <span class="cx-label">Prochain boss</span>
        <component
          :is="model.next.value.href ? 'a' : 'span'"
          class="cx-boss-name"
          :href="model.next.value.href"
        >
          {{ model.next.value.name }}
        </component>
        <CxReadinessStatus
          v-if="model.next.value.readiness?.value"
          :state="model.next.value.readiness.value"
        />
        <span class="cx-muted">
          Votre niveau {{ formatInt(model.playerLevel.value) }}, recommandé
          <CxValue
            :value="nextLevel"
            :estimate="nextConfidence"
            calculated
            @why="model.next.value.level && model.showWhy(model.next.value.level.explanation, nextConfidence)"
          />
        </span>
      </div>

      <CxWhyPanel
        v-if="model.why.value"
        :explanation="model.why.value"
        :estimate="model.whyEstimate.value"
        subject="ce niveau recommandé"
        :toggle="false"
        :open="true"
        @close="model.closeWhy"
      />

      <CxBossTimeline
        :timeline="model.timeline.value"
        :details="model.details.value"
        :player-level="model.playerLevel.value"
        :compact="compact"
        @defeat="model.setDefeated"
        @why="model.showWhy"
        @enable-dlc="model.enableDlc"
        @full="model.openFullscreen"
      />

      <p class="cx-bo-foot">
        <CxReliabilityBadge kind="calculated" />
        <span>Cocher « Vaincu » met à jour la progression</span>
      </p>
    </template>
  </div>
</template>

<style>
.cx-bo { display: grid; gap: var(--space-3); min-width: 0; }
.cx-bo-next { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding: var(--space-2) var(--space-3); border: 1px solid var(--gold-line); border-radius: var(--radius-m); background: var(--gold-wash); }
.cx-bo-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
