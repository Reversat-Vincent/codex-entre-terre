<!-- Corps du widget « matrice des faiblesses » (D1, `weakness-matrix`) : absorption par type de dégâts et immunités des boss de la frise. -->
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import CxAbsorptionHeatmap from '../components/ds/CxAbsorptionHeatmap.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSelect from '../components/ds/CxSelect.vue'
import type { SelectOption } from '../components/ds/types.ts'
import { NEGATION_KEYS } from '../data/keys.ts'
import type { NegationKey } from '../data/keys.ts'
import { indexEncounters } from '../engine/encounters.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { useCriteriaStore } from '../stores/criteria.ts'
import { useDataStore } from '../stores/data.ts'
import { formatInt } from '../ui/format.ts'
import { DAMAGE_LABELS } from '../ui/labels.ts'
import { allRows, sortRows, timelineRows } from './misc/weaknessModel.ts'
import type { BossHref } from './misc/weaknessModel.ts'
import type { WidgetBodyProps } from './types.ts'

/**
 * Corps du widget `weakness-matrix` (D1 ; brief § 5.2 D ; calculs.md, « Frise des boss » : « seuls les nœuds dont l'absorption et les résistances
 * sont documentées peuvent l'afficher »). Contrat d'un corps : voir `src/widgets/types.ts`.
 * - `dashboard` : les boss de la frise dont l'absorption est documentée, dans l'ordre de la frise ; boss vaincus atténués ; un bandeau dit combien
 *   de boss de la frise sont affichés.
 * - `fullscreen` : toutes les rencontres de `bosses.json` qui ont des données d'absorption (dans la limite du contenu activé).
 * Le tri par type de dégâts remplace les en-têtes cliquables du prototype : `CxAbsorptionHeatmap` n'a pas de tri, un sélecteur le porte ici.
 * Aucun calcul : la frise vient de `analysis`, les lignes sont mises en forme par `misc/weaknessModel.ts`.
 */
const props = defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()
const data = useDataStore()
const criteria = useCriteriaStore()
const router = useRouter()

/** Tri choisi : l'ordre d'origine (`story`) ou un type de dégâts, du plus vulnérable au plus résistant. */
const sortBy = ref<'story' | NegationKey>('story')
const sortId = useId()

const bosses = computed(() => data.dataset('bosses')?.entries ?? null)
const index = computed(() => (bosses.value === null ? null : indexEncounters(bosses.value)))
const content = computed(() => criteria.criteria.content)

/** Adresse de la fiche d'un boss, ouverte sur la rencontre de la ligne (le routeur est en mode hash). */
const href: BossHref = (bossId, encounterId) => router.resolve({ name: 'boss', params: { id: bossId }, query: { rencontre: encounterId } }).href

const isFullscreen = computed(() => props.mode === 'fullscreen')

const dashboardRows = computed(() => {
  const timeline = analysis.timeline
  return timeline === null || index.value === null ? null : timelineRows(timeline, index.value, href)
})
const fullRows = computed(() =>
  bosses.value === null ? [] : allRows(bosses.value, new Set(criteria.criteria.progress.defeated), content.value, href),
)
const rows = computed(() => (isFullscreen.value ? fullRows.value : (dashboardRows.value?.rows ?? [])))
const sorted = computed(() => sortRows(rows.value, sortBy.value === 'story' ? null : sortBy.value))

const sortOptions = computed<SelectOption[]>(() => [
  { value: 'story', label: isFullscreen.value ? 'Ordre des données' : "Ordre de l'histoire" },
  ...NEGATION_KEYS.map((key) => ({ value: key, label: `${DAMAGE_LABELS[key]} : du plus faible au plus résistant` })),
])
/** Le sélecteur ne propose que les valeurs de `sortOptions` : la conversion rend au modèle son type étroit. */
const sortModel = computed<string>({
  get: () => sortBy.value,
  set: (value) => {
    sortBy.value = (NEGATION_KEYS as readonly string[]).includes(value) ? (value as NegationKey) : 'story'
  },
})
</script>

<template>
  <div
    class="wd-matrix"
    :data-mode="mode"
  >
    <CxEmptyState
      v-if="rows.length === 0"
      title="Aucun boss à afficher"
      text="Le wiki ne donne l'absorption d'aucun boss de la frise pour le contenu activé."
    />
    <template v-else>
      <div class="wd-matrix-tools">
        <p class="cx-muted wd-matrix-hint">
          Boss vaincus atténués. Les cases hachurées ne sont pas documentées par le wiki.
        </p>
        <span class="wd-matrix-sort">
          <label
            :for="sortId"
            class="cx-label"
          >Classer par</label>
          <CxSelect
            :id="sortId"
            v-model="sortModel"
            :options="sortOptions"
          />
        </span>
      </div>
      <CxAbsorptionHeatmap :rows="sorted" />
      <CxNote
        v-if="!isFullscreen && dashboardRows !== null"
        tone="partial"
        title="Données partielles."
      >
        {{ formatInt(dashboardRows.rows.length) }} boss de la frise sur {{ formatInt(dashboardRows.total) }} ont une absorption documentée ;
        les autres n'apparaissent pas. Le plein écran liste toutes les rencontres documentées.
      </CxNote>
      <p
        v-else-if="isFullscreen"
        class="cx-muted"
      >
        {{ formatInt(rows.length) }} rencontres avec une absorption documentée.
      </p>
    </template>
  </div>
</template>

<style scoped>
.wd-matrix { display: grid; gap: var(--space-3); min-width: 0; }
.wd-matrix-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); }
.wd-matrix-hint { margin: 0; font-size: 12px; line-height: 16px; }
.wd-matrix-sort { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
</style>
