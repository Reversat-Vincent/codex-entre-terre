<!-- Barre de filtres du plein écran du widget A : nom, étape, classe, amélioration, « Prérequis atteints », armes masquées, compteur. -->
<script setup lang="ts">
import { computed, useId } from 'vue'
import CxButton from '../../components/ds/CxButton.vue'
import CxSegmented from '../../components/ds/CxSegmented.vue'
import CxSelect from '../../components/ds/CxSelect.vue'
import CxToggle from '../../components/ds/CxToggle.vue'
import type { SegmentedOption } from '../../components/ds/types.ts'
import { STAGE_IDS } from '../../engine/config/stages.ts'
import { formatInt } from '../../ui/format.ts'
import { STAGE_LABELS } from '../../ui/labels.ts'
import { armesText, hasActiveFilters } from './weaponsModel.ts'
import type { MaterialFilter, StageFilter, TableFilters } from './weaponsModel.ts'

/**
 * Filtres du tableau plein écran (note `spec-full` : Étape, Classe, Amélioration, « Prérequis atteints », recherche par nom ; design `PleinEcranA.dc.html`).
 * Le composant n'a pas d'état : le modèle `filters` est celui de la vue, qui applique `filterRows`. Le compteur dit combien d'armes sont affichées
 * sur combien sont compatibles, et combien les critères masquent ; ces armes masquées s'affichent grisées sur demande (case « Les afficher »).
 */
const props = defineProps<{
  /** Classes d'armes présentes (liste de la liste déroulante). */
  categories: readonly string[]
  /** Armes affichées dans le tableau. */
  shown: number
  /** Armes compatibles avec les critères (ou, avec les masquées affichées, toutes les armes candidates). */
  total: number
  /** Armes exclues par un critère. */
  hidden: number
}>()

/** Filtres en cours. */
const filters = defineModel<TableFilters>({ required: true })

const uid = useId()

const stageOptions: SegmentedOption<StageFilter>[] = [
  { value: 'all', label: 'Toutes' },
  ...STAGE_IDS.map((id) => ({ value: id, label: STAGE_LABELS[id] })),
  { value: 'unclassified', label: 'Non classé', title: 'Armes sans étape connue : sans score, en fin de tableau' },
]
const materialOptions: SegmentedOption<MaterialFilter>[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'normal', label: 'Normales' },
  { value: 'somber', label: 'Sombres' },
]
const categoryOptions = computed(() => [{ value: '', label: 'Toutes les classes' }, ...props.categories.map((c) => ({ value: c, label: c }))])

/**
 * Change un filtre en gardant les autres.
 * @param patch Valeurs à remplacer.
 */
function update(patch: Partial<TableFilters>): void {
  filters.value = { ...filters.value, ...patch }
}

const stage = computed({ get: () => filters.value.stage, set: (v: StageFilter) => update({ stage: v }) })
const material = computed({ get: () => filters.value.material, set: (v: MaterialFilter) => update({ material: v }) })
const category = computed({ get: () => filters.value.category, set: (v: string) => update({ category: v }) })
const requirementsMet = computed({ get: () => filters.value.requirementsMet, set: (v: boolean) => update({ requirementsMet: v }) })
const showHidden = computed({ get: () => filters.value.showHidden, set: (v: boolean) => update({ showHidden: v }) })
const active = computed(() => hasActiveFilters(filters.value))
const countText = computed(() => `${formatInt(props.shown)} ${armesText(props.shown)} sur ${formatInt(props.total)}`)

/** Efface les filtres, sans toucher à l'affichage des armes masquées. */
function clear(): void {
  filters.value = { ...filters.value, query: '', stage: 'all', category: '', material: 'all', requirementsMet: false }
}
</script>

<template>
  <div
    class="wt-bar"
    role="search"
    aria-label="Filtrer le tableau"
  >
    <div class="wt-field">
      <label
        class="cx-label"
        :for="`${uid}-q`"
      >Nom</label>
      <input
        :id="`${uid}-q`"
        class="cx-input wt-q"
        type="search"
        autocomplete="off"
        placeholder="Filtrer par nom ou compétence"
        :value="filters.query"
        @input="update({ query: ($event.target as HTMLInputElement).value })"
      >
    </div>
    <div class="wt-field">
      <span class="cx-label">Étape</span>
      <CxSegmented
        v-model="stage"
        :options="stageOptions"
        label="Étape"
      />
    </div>
    <div class="wt-field">
      <label
        class="cx-label"
        :for="`${uid}-cat`"
      >Classe</label>
      <CxSelect
        :id="`${uid}-cat`"
        v-model="category"
        :options="categoryOptions"
      />
    </div>
    <div class="wt-field">
      <span class="cx-label">Amélioration</span>
      <CxSegmented
        v-model="material"
        :options="materialOptions"
        label="Type d'amélioration"
      />
    </div>
    <div class="wt-field wt-toggle">
      <span class="cx-label">Profil</span>
      <CxToggle
        v-model="requirementsMet"
        label="Prérequis atteints seulement"
      />
    </div>
    <div class="wt-meta">
      <span
        class="wt-count"
        role="status"
      >{{ countText }}</span>
      <CxButton
        v-if="active"
        variant="ghost"
        size="sm"
        icon="x"
        @click="clear"
      >
        Effacer les filtres
      </CxButton>
    </div>
    <div
      v-if="hidden > 0"
      class="wt-hidden"
    >
      <span><b>{{ formatInt(hidden) }}</b> {{ hidden > 1 ? 'masquées' : 'masquée' }} par vos critères</span>
      <CxToggle
        v-model="showHidden"
        label="Les afficher, grisées"
      />
    </div>
  </div>
</template>

<style scoped>
.wt-bar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3) var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface); }
.wt-field { display: grid; gap: 4px; min-width: 0; }
.wt-toggle { min-width: 220px; }
.wt-q { width: 220px; max-width: 100%; height: var(--size-controle); padding: 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink); font-size: 13px; min-width: 0; }
.wt-meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin-left: auto; }
.wt-count { color: var(--ink-2); font: 600 12px/16px var(--font-sans); font-variant-numeric: tabular-nums; }
.wt-hidden { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); flex: 1 1 100%; padding-top: var(--space-2); border-top: 1px solid var(--line); color: var(--ink-2); font-size: 12px; line-height: 16px; }
.wt-hidden :deep(.cx-toggle) { width: auto; }
@media (max-width: 767px) {
  .wt-q { height: var(--size-cible); }
  .wt-field, .wt-q { width: 100%; }
  .wt-meta { margin-left: 0; }
}
</style>
