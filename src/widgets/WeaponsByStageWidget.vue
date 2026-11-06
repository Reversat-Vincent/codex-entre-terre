<!-- Widget A « Armes recommandées au fil de la partie » : colonnes par étape reliées par le fil d'or, cartes d'armes, panneau « Pourquoi ? ». -->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import CxButton from '../components/ds/CxButton.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxProgressThread from '../components/ds/CxProgressThread.vue'
import CxTabs from '../components/ds/CxTabs.vue'
import { useBreakpoint } from '../composables/useBreakpoint.ts'
import type { EntityRef } from '../data/datasets.ts'
import { STAGE_IDS } from '../engine/config/stages.ts'
import type { StageId } from '../engine/config/stages.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { formatInt } from '../ui/format.ts'
import type { WidgetBodyProps } from './types.ts'
import WeaponCompareBar from './weapons/WeaponCompareBar.vue'
import WeaponStageColumn from './weapons/WeaponStageColumn.vue'
import WeaponWhyBlock from './weapons/WeaponWhyBlock.vue'
import { armesText, stageTabs, threadStages } from './weapons/weaponsModel.ts'
import { useWeaponActions } from './weapons/useWeaponActions.ts'

/**
 * Corps du widget `weapons-by-stage` (note `spec-main`, design `Main.dc.html` et `Mobile.dc.html`, brief § 5.2 A).
 * Contrat d'un corps (`types.ts`) : la propriété `mode`, aucun événement ; titre, repli et plein écran sont fournis par l'hôte.
 * - Bureau et tablette : le fil d'or (`CxProgressThread`, étape courante en halo) au-dessus de cinq colonnes, une par étape, dont la courante est mise
 *   en avant ; la carte n° 1 du widget porte `glow-gold`.
 * - Mobile (< 768 px) : un onglet par étape, l'étape courante ouverte, cartes en pleine largeur.
 * - Un seul panneau « Pourquoi ? » ou « Alternatives » à la fois, sous les colonnes ; le bandeau de comparaison (2 à 4 armes) vient après.
 * Aucun calcul ici : recommandations, étape courante, scores, alternatives et élargissements viennent du store `analysis`.
 * `mode` n'a pas d'effet : le plein écran du widget A est une vue dédiée (`WeaponsFullscreenView`).
 */
defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()
const actions = useWeaponActions()
const { isMobile } = useBreakpoint()

const columns = computed(() => analysis.recommendations.columns)
const current = computed<StageId | null>(() => analysis.stage.value)
const topRef = computed(() => analysis.recommendations.top?.candidate.ref ?? null)
const thread = threadStages()
const tabs = computed(() => stageTabs(columns.value))

/** Onglet ouvert sur mobile : l'étape courante au départ, puis elle le redevient quand elle change. */
const tab = ref<string>(current.value ?? STAGE_IDS[0])
watch(current, (stage) => {
  if (stage !== null) tab.value = stage
})
const tabColumn = computed(() => columns.value.find((c) => c.stage === tab.value))

// Panneau ouvert : une arme et un mode. Un second appui sur le même bouton le referme.
const panel = ref<{ ref: EntityRef; mode: 'why' | 'alts' } | null>(null)
const root = ref<HTMLElement | null>(null)

/**
 * Ouvre, change ou referme le panneau d'une arme.
 * @param ref Arme.
 * @param mode Mode demandé.
 */
function togglePanel(ref: EntityRef, mode: 'why' | 'alts'): void {
  panel.value = panel.value?.ref === ref && panel.value.mode === mode ? null : { ref, mode }
}

/**
 * Ferme le panneau et rend le focus au bouton « Pourquoi ? » ou « Alternatives » de la carte, pour ne pas perdre la position au clavier.
 */
async function closePanel(): Promise<void> {
  const ref = panel.value?.ref
  const mode = panel.value?.mode
  panel.value = null
  if (ref === undefined) return
  await nextTick()
  const card = root.value?.querySelector<HTMLElement>(`[data-weapon="${CSS.escape(ref)}"]`)
  card?.querySelector<HTMLElement>(mode === 'alts' ? 'button[aria-label="Voir les alternatives"]' : '.cx-btn-why')?.focus()
}

// Une arme qui sort des résultats (critères modifiés) ferme son panneau.
watch(
  () => analysis.scored,
  (scored) => {
    const open = panel.value
    if (open !== null && !scored.some((s) => s.candidate.ref === open.ref && s.hidden === null)) panel.value = null
  },
)

const shownCount = computed(() => columns.value.reduce((n, c) => n + c.weapons.length, 0))
const hiddenCount = computed(() => analysis.filtered.hiddenItems.length)
const allCount = computed(() => analysis.filtered.kept.length)
const unclassified = computed(() => analysis.recommendations.unclassified.length)
const fullscreenHref = computed(() => actions.fullscreenHref())
</script>

<template>
  <div
    ref="root"
    class="wa-root"
  >
    <template v-if="!isMobile">
      <CxProgressThread
        :stages="thread"
        :current="current"
      />
      <div class="wa-cols">
        <WeaponStageColumn
          v-for="column in columns"
          :key="column.stage"
          :column="column"
          :current="column.stage === current"
          :top-ref="topRef"
          :open-ref="panel?.ref ?? null"
          :open-mode="panel?.mode ?? 'why'"
          @panel="togglePanel"
          @fullscreen="actions.openFullscreen()"
        />
      </div>
    </template>

    <CxTabs
      v-else
      v-model="tab"
      :items="tabs"
      label="Étapes de progression"
    >
      <template #tab="{ item }">
        <CxIcon
          v-if="item.id === current"
          name="mark"
          size="xs"
        />
        {{ item.label }}<span class="cx-tab-n">{{ item.note }}</span>
        <span
          v-if="item.id === current"
          class="cx-sr"
        > (étape courante)</span>
      </template>
      <WeaponStageColumn
        v-if="tabColumn"
        :column="tabColumn"
        :current="tabColumn.stage === current"
        in-tabs
        :top-ref="topRef"
        :open-ref="panel?.ref ?? null"
        :open-mode="panel?.mode ?? 'why'"
        @panel="togglePanel"
        @fullscreen="actions.openFullscreen()"
      />
    </CxTabs>

    <WeaponWhyBlock
      v-if="panel"
      :weapon="panel.ref"
      :mode="panel.mode"
      @close="closePanel"
      @select="togglePanel"
      @open="actions.openSheet"
    />

    <WeaponCompareBar />

    <p class="wa-foot">
      <span>
        {{ formatInt(shownCount) }} {{ armesText(shownCount) }} {{ shownCount > 1 ? 'recommandées' : 'recommandée' }}<template v-if="hiddenCount > 0">, {{ formatInt(hiddenCount) }} {{ hiddenCount > 1 ? 'masquées' : 'masquée' }} par vos critères</template>.
      </span>
      <span v-if="unclassified > 0">
        {{ formatInt(unclassified) }} {{ armesText(unclassified) }} sans étape connue (« Non classé ») {{ unclassified > 1 ? 'sont' : 'est' }} visible{{ unclassified > 1 ? 's' : '' }} en plein écran.
      </span>
      <CxButton
        variant="ghost"
        size="sm"
        icon="max"
        :href="fullscreenHref"
      >
        Voir toutes les armes ({{ formatInt(allCount) }})
      </CxButton>
    </p>
  </div>
</template>

<style scoped>
/* Conteneur de requête : le nombre de colonnes dépend de la largeur du widget (panneau de critères et barre latérale la réduisent), pas de la fenêtre ; cinq colonnes dès 940 px, soit environ 180 px chacune. */
.wa-root { container: wa / inline-size; display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.wa-cols { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-3); align-items: start; }
.wa-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); color: var(--ink-3); font-size: 12px; line-height: 16px; }
@container wa (max-width: 939px) {
  .wa-cols { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
}
</style>
