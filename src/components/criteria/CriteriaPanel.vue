<!-- Panneau de critères : profils, six sections (Contenu, Personnage, Style de jeu, Progression, Contraintes, Fiabilité), « Réinitialiser » et « Enregistrer ». -->
<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { useCriteriaPanel } from '../../composables/useCriteriaPanel.ts'
import { useDatasets } from '../../composables/useDatasets.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { formatInt } from '../../ui/format.ts'
import CxButton from '../ds/CxButton.vue'
import CxIcon from '../ds/CxIcon.vue'
import CriteriaFieldsCharacter from './CriteriaFieldsCharacter.vue'
import CriteriaFieldsConstraints from './CriteriaFieldsConstraints.vue'
import CriteriaFieldsContent from './CriteriaFieldsContent.vue'
import CriteriaFieldsProgress from './CriteriaFieldsProgress.vue'
import CriteriaFieldsReliability from './CriteriaFieldsReliability.vue'
import CriteriaFieldsStyle from './CriteriaFieldsStyle.vue'
import CriteriaProfiles from './CriteriaProfiles.vue'
import CriteriaSection from './CriteriaSection.vue'
import { DEFAULT_OPEN_SECTION, SECTION_IDS, SECTION_TITLES, sectionSummary } from './criteriaModel.ts'
import type { SectionId } from './criteriaModel.ts'
import { CRITERIA_FILES, useCriteriaData } from './useCriteriaData.ts'

/**
 * Panneau de critères (architecture § 10.1 ; notes `spec-main` et `spec-sheet`). Il se monte sous trois habillages (`mode`) :
 * `inline` (colonne du desktop, repliable à 52 px, sections toujours ouvertes, pied « Réinitialiser » et « Enregistrer le profil »),
 * `overlay` (tiroir de la tablette, feuille du mobile : sections repliables, une seule ouverte, « Personnage » d'abord).
 * Chaque champ écrit dans le store `criteria` et tous les widgets se recalculent aussitôt : il n'y a pas de bouton « Appliquer ».
 * Le panneau demande les fichiers de données dont ses listes ont besoin (armes, origines, boss) ; il ne calcule rien lui-même.
 */
const props = defineProps<{
  /** `inline` : colonne du desktop ; `overlay` : tiroir ou feuille, fermés par leur propre bouton. */
  mode: 'inline' | 'overlay'
  /** Colonne repliée à 52 px (desktop seulement). */
  collapsed: boolean
}>()

defineEmits<{
  /** Demande de replier ou de déplier la colonne. */
  toggle: []
}>()

const criteria = useCriteriaStore()
const analysis = useAnalysisStore()
const { origins } = useCriteriaData()
const { takeRequestedSection, requestedSection } = useCriteriaPanel()

useDatasets(CRITERIA_FILES)

const profilesPart = useTemplateRef('profilesPart')

const openId = ref<SectionId | null>(DEFAULT_OPEN_SECTION)

function toggleSection(id: SectionId): void {
  openId.value = openId.value === id ? null : id
}

/** Ouvre la section demandée par une puce de critère et la montre. */
watch(
  requestedSection,
  async () => {
    const id = takeRequestedSection()
    if (id === null) return
    openId.value = id
    await nextTick()
    const el = document.getElementById(`crit-sec-${id}`)
    el?.scrollIntoView({ block: 'nearest' })
    el?.querySelector<HTMLElement>('button, input, select')?.focus({ preventScroll: true })
  },
  { immediate: true },
)

/** Résumé d'une section repliable (le nom de l'origine vient des données ; en mode automatique, le résumé le dit). */
function summaryOf(id: SectionId): string {
  const chosen = criteria.criteria.character.origin
  const name = chosen === 'auto' ? null : (origins.value.find((o) => o.id === chosen)?.name ?? null)
  return sectionSummary(id, criteria.criteria, analysis.level.value, name)
}

/** Mention discrète de la colonne du desktop : le niveau à côté du titre « Personnage ». */
function hintOf(id: SectionId): string | undefined {
  if (id === 'character') return analysis.level.value === null ? undefined : `niveau ${formatInt(analysis.level.value)}`
  return undefined
}

const fields = {
  content: CriteriaFieldsContent,
  character: CriteriaFieldsCharacter,
  style: CriteriaFieldsStyle,
  progress: CriteriaFieldsProgress,
  constraints: CriteriaFieldsConstraints,
  reliability: CriteriaFieldsReliability,
} as const
</script>

<template>
  <div
    class="cx-crit-panel"
    :class="{ 'is-collapsed': props.collapsed }"
  >
    <div
      v-if="mode === 'inline'"
      class="cx-crit-head"
    >
      <span
        v-if="!collapsed"
        class="cx-crit-title"
      ><CxIcon name="sliders" />Critères</span>
      <CxButton
        variant="ghost"
        size="sm"
        icon-only
        :icon="collapsed ? 'sliders' : 'chev-l'"
        :label="collapsed ? 'Déplier le panneau de critères' : 'Replier le panneau de critères'"
        :aria-expanded="!collapsed"
        @click="$emit('toggle')"
      />
    </div>
    <template v-if="!collapsed">
      <div class="cx-crit-sec cx-crit-profiles">
        <CriteriaProfiles ref="profilesPart" />
      </div>
      <CriteriaSection
        v-for="id in SECTION_IDS"
        :id="id"
        :key="id"
        :title="SECTION_TITLES[id]"
        :collapsible="mode === 'overlay'"
        :open="openId === id"
        :summary="summaryOf(id)"
        :hint="hintOf(id)"
        @toggle="toggleSection(id)"
      >
        <component :is="fields[id]" />
      </CriteriaSection>
      <div
        v-if="mode === 'inline'"
        class="cx-crit-foot"
      >
        <CxButton
          variant="ghost"
          icon="refresh"
          @click="criteria.reset()"
        >
          Réinitialiser
        </CxButton>
        <CxButton
          variant="primary"
          icon="save"
          @click="profilesPart?.save()"
        >
          Enregistrer le profil
        </CxButton>
      </div>
    </template>
  </div>
</template>

<style>
.cx-crit-panel { display: flex; flex-direction: column; min-width: 0; }
.cx-crit-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-4) var(--space-4) var(--space-3); border-bottom: 1px solid var(--line); }
.cx-crit-panel.is-collapsed > .cx-crit-head { justify-content: center; padding-inline: 0; border-bottom: 0; }
.cx-crit-title { display: flex; align-items: center; gap: var(--space-2); color: var(--ink); font: 600 16px/20px var(--font-display); }
/* Champs, grille d'attributs et lignes de valeurs calculées partagés par les six sections (bundle.css du design system). */
.cx-crit-grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6px 14px; }
.cx-crit-field { display: grid; gap: 4px; min-width: 0; }
.cx-crit-field > label, .cx-crit-field > span:not(.cx-crit-note) { color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.cx-crit-note { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-crit-note b { color: var(--ink); }
.cx-crit-derived { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-crit-derived b { color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums; }
.cx-crit-hr { width: 100%; height: 0; margin: 0; border: 0; border-top: 1px solid var(--line); }
.cx-crit-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-4); }
</style>
