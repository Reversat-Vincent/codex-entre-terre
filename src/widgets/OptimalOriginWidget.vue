<!-- Corps du widget B « Configuration de départ optimale » (`optimal-origin`) : classement des origines, recommandation, détail de l'origine choisie. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxReliabilityBadge from '../components/ds/CxReliabilityBadge.vue'
import CxSourceBadge from '../components/ds/CxSourceBadge.vue'
import CxWhyPanel from '../components/ds/CxWhyPanel.vue'
import { archetypeName } from '../components/criteria/criteriaModel.ts'
import { useBreakpoint } from '../composables/useBreakpoint.ts'
import { useCriteriaPanel } from '../composables/useCriteriaPanel.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { formatInt } from '../ui/format.ts'
import OriginDetail from './origins/OriginDetail.vue'
import OriginRanking from './origins/OriginRanking.vue'
import { useOriginWidget } from './origins/useOriginWidget.ts'
import type { WidgetBodyProps } from './types.ts'

/**
 * Widget B (brief § 5.2 B, écran `Main.dc.html`, notes `spec-main` et `spec-mobile` ; calculs.md, « Origine optimale » et « Build cible »).
 * Contrat d'un corps (`src/widgets/types.ts`) : une propriété `mode`, aucun événement ; titre, repli et plein écran sont fournis par l'hôte.
 * Le corps lit le classement des origines dans le store `analysis` (limité au contenu activé) et n'en recalcule rien : il met en avant
 * la recommandation (rang 1) avec son « Pourquoi ? », liste les origines, et détaille celle que le joueur choisit (par défaut l'origine retenue).
 * Sans build cible, état vide avec un bouton qui ouvre la section Personnage des critères. Sous 768 px, le classement devient une liste.
 * Le widget n'a pas de vue plein écran : `mode` ne change pas l'affichage.
 */
defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()
const model = useOriginWidget()
const { requestSection } = useCriteriaPanel()
const { isMobile } = useBreakpoint()

const targetLabel = computed(() => {
  const id = model.target.value.archetype
  return id === null ? null : archetypeName(id)
})
</script>

<template>
  <div class="cx-oo">
    <CxEmptyState
      v-if="!model.hasTarget.value"
      title="Aucun build cible"
      text="Le classement compare les attributs de départ des origines à un build cible. Choisissez un archétype dans la section Personnage des critères."
      :actions="[{ id: 'character', label: 'Choisir un build cible', icon: 'plus' }]"
      @action="requestSection('character')"
    />

    <template v-else>
      <section
        v-if="model.top.value"
        class="cx-oo-reco"
        aria-label="Origine recommandée"
      >
        <div class="cx-oo-reco-main">
          <span class="cx-label">Origine recommandée<template v-if="targetLabel">
            pour {{ targetLabel }} au niveau {{ formatInt(model.target.value.level) }}</template></span>
          <span class="cx-oo-reco-name">
            <b>{{ model.top.value.origin.name }}</b>
            <CxSourceBadge :source="model.top.value.origin.source" />
            <span class="cx-status ready"><CxIcon name="check-c" />Recommandée</span>
          </span>
          <span class="cx-muted">
            Niveau {{ formatInt(model.top.value.rank.finalLevel) }} pour la cible,
            {{ formatInt(model.top.value.rank.wastedPoints) }} point{{ model.top.value.rank.wastedPoints > 1 ? 's' : '' }} gaspillé{{ model.top.value.rank.wastedPoints > 1 ? 's' : '' }}.
            <template v-if="analysis.pipeline.effectiveOrigin !== model.top.value.ref">
              Votre critère impose une autre origine.
            </template>
          </span>
        </div>
        <CxWhyPanel
          :explanation="model.top.value.calc.explanation"
          :subject="`l'origine ${model.top.value.origin.name}`"
        />
      </section>

      <div class="cx-oo-body">
        <div class="cx-oo-rank">
          <OriginRanking
            :rows="model.rows.value"
            :selected="model.shown.value?.ref ?? null"
            :compact="isMobile"
            @select="model.select"
          />
          <p
            v-if="model.hiddenCount.value > 0"
            class="cx-oo-hint"
          >
            {{ model.hiddenCount.value }} origine{{ model.hiddenCount.value > 1 ? 's' : '' }} du Tarnished Pack masquée{{ model.hiddenCount.value > 1 ? 's' : '' }} : contenu désactivé dans vos critères.
          </p>
        </div>
        <OriginDetail
          v-if="model.shown.value && model.startAttributes.value && model.targetAttributes.value"
          :row="model.shown.value"
          :count="model.rows.value.length"
          :start="model.startAttributes.value"
          :target="model.targetAttributes.value"
          :target-label="targetLabel"
          :derived="model.derived.value"
          :equipment="model.equipment.value"
          :early-weapons="model.earlyWeapons.value"
          :weapons-loaded="model.weaponsLoaded.value"
          :player-level="analysis.level.value"
        />
      </div>

      <p class="cx-oo-foot">
        <CxReliabilityBadge kind="calculated" />
        <span>{{ model.rows.value.length }} origines classées</span>
        <span>Égalité départagée par les attributs utiles au build et l'arme de départ</span>
      </p>
    </template>
  </div>
</template>

<style>
.cx-oo { display: grid; gap: var(--space-4); min-width: 0; }
.cx-oo-reco { display: grid; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--gold-line); border-radius: var(--radius-m); background: var(--gold-wash); }
.cx-oo-reco-main { display: grid; gap: 4px; }
.cx-oo .cx-btn-why { justify-self: start; }
.cx-oo-reco-name { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.cx-oo-reco-name b { color: var(--ink); font: 700 18px/22px var(--font-display); }
.cx-oo-body { display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 6fr); gap: var(--space-5); align-items: start; }
.cx-oo-rank { display: grid; gap: var(--space-2); min-width: 0; }
.cx-oo-hint { color: var(--ink-3); font-size: 11px; line-height: 15px; }
.cx-oo-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 12px; line-height: 16px; }
@media (max-width: 1279px) { .cx-oo-body { grid-template-columns: minmax(0, 1fr); } }
</style>
