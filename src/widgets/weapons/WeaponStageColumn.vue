<!-- Colonne d'une étape du widget A : cartes d'armes recommandées, état vide avec élargissement, armes masquées. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxButton from '../../components/ds/CxButton.vue'
import CxEmptyState from '../../components/ds/CxEmptyState.vue'
import CxWeaponCard from '../../components/ds/CxWeaponCard.vue'
import type { EntityRef } from '../../data/datasets.ts'
import { isRemembranceWeapon } from '../../engine/score.ts'
import type { HiddenReason, StageColumn } from '../../engine/score.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { usePinsStore } from '../../stores/pins.ts'
import { STAGE_LABELS } from '../../ui/labels.ts'
import { HIDDEN_REASON_TEXTS, columnEmpty, dlcHeading, hiddenText, isProfileConfigured } from './weaponsModel.ts'
import { useWeaponActions } from './useWeaponActions.ts'

/**
 * Colonne d'une étape (note `spec-main` ; design `Main.dc.html`, widget A). Elle affiche les armes de `StageColumn` (3 à 5, déjà classées par le moteur ;
 * en DLC, groupées par sous-zone), la recommandation n°1 du widget avec `glow-gold`, et les actions de chaque carte.
 * Colonne vide : `CxEmptyState` avec l'élargissement le plus efficace (`analysis.widen`) ; DLC désactivé : état vide avec « Activer ».
 * Aucun calcul : étapes, scores, suggestions et explications viennent du store `analysis`. Les actions passent par `useWeaponActions`.
 */
const props = defineProps<{
  /** Colonne du store `analysis`. */
  column: StageColumn
  /** Étape courante du joueur : la colonne est mise en avant. */
  current: boolean
  /** Arme n°1 du widget (une seule carte `glow-gold`). */
  topRef: EntityRef | null
  /** Référence de l'arme dont le panneau « Pourquoi ? » ou « Alternatives » est ouvert. */
  openRef: EntityRef | null
  /** Mode du panneau ouvert. */
  openMode: 'why' | 'alts'
}>()

const emit = defineEmits<{
  /** Ouvre ou ferme le panneau de l'arme dans le mode demandé. */
  panel: [ref: EntityRef, mode: 'why' | 'alts']
  /** Ouvre le plein écran (« Voir toutes les armes »). */
  fullscreen: []
}>()

const analysis = useAnalysisStore()
const criteriaStore = useCriteriaStore()
const pins = usePinsStore()
const actions = useWeaponActions()

const label = computed(() => STAGE_LABELS[props.column.stage])
const widen = computed(() => analysis.widen(props.column.stage))
const empty = computed(() => (props.column.weapons.length === 0 ? columnEmpty(props.column, widen.value, criteriaStore.criteria.content.sote) : null))
const configured = computed(() => isProfileConfigured(criteriaStore.criteria.character.attributes))
/** Colonne de 1 ou 2 armes : l'élargissement le plus efficace reste proposé sous les cartes. */
const topWidening = computed(() => (props.column.weapons.length > 0 ? (widen.value[0] ?? null) : null))

/**
 * Applique l'action d'un état vide : « Voir toutes les armes » ouvre le plein écran, les autres lèvent une raison de masquage.
 * @param id Identifiant de l'action (`all` ou une raison).
 */
function onAction(id: string): void {
  if (id === 'all') emit('fullscreen')
  else actions.widen(id as HiddenReason | 'style')
}
</script>

<template>
  <div
    class="wa-col"
    :class="{ 'is-current': current }"
    role="group"
    :aria-label="`Étape ${label}`"
  >
    <p
      v-if="current"
      class="wa-now"
    >
      Étape courante
    </p>
    <template
      v-for="(item, index) in column.weapons"
      :key="item.candidate.ref"
    >
      <h4
        v-if="column.stage === 'dlc' && dlcHeading(column.weapons, index) !== null"
        class="wa-zone"
      >
        {{ dlcHeading(column.weapons, index) }}
      </h4>
      <div
        class="wa-card"
        :data-weapon="item.candidate.ref"
      >
        <CxWeaponCard
          :weapon="item.candidate.weapon"
          :score="item.score"
          :top="item.candidate.ref === topRef"
          :pinned="pins.isPinned(item.candidate.ref)"
          :href="actions.sheetHref(item.candidate.ref)"
          :profile-configured="configured"
          :remembrance="isRemembranceWeapon(item.candidate)"
          :why-open="openRef === item.candidate.ref && openMode === 'why'"
          @pin="actions.togglePin(item.candidate.ref)"
          @compare="actions.toggleCompare(item.candidate.ref)"
          @open="actions.openSheet(item.candidate.ref)"
          @alternatives="emit('panel', item.candidate.ref, 'alts')"
          @why="emit('panel', item.candidate.ref, 'why')"
        />
      </div>
    </template>

    <CxEmptyState
      v-if="empty"
      :title="empty.title"
      :text="empty.text"
      :actions="empty.actions"
      @action="onAction"
    />
    <template v-else>
      <p
        v-if="column.hiddenCount > 0"
        class="wa-hidden"
      >
        {{ hiddenText(column.hiddenCount) }}
      </p>
      <CxButton
        v-if="topWidening"
        variant="ghost"
        size="sm"
        :icon="HIDDEN_REASON_TEXTS[topWidening.reason].icon"
        @click="actions.widen(topWidening.reason)"
      >
        {{ HIDDEN_REASON_TEXTS[topWidening.reason].action }}
      </CxButton>
    </template>
  </div>
</template>

<style scoped>
.wa-col { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.wa-col.is-current { padding-top: var(--space-2); border-top: 2px solid var(--gold); }
.wa-now { color: var(--gold-text); font: 600 12px/16px var(--font-sans); }
.wa-zone { color: var(--ink-3); font: 600 12px/16px var(--font-sans); letter-spacing: .02em; }
.wa-card { min-width: 0; }
.wa-hidden { color: var(--ink-3); font-size: 11px; line-height: 15px; }
</style>
