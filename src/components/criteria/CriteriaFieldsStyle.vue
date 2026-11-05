<!-- Champs de la section « Style de jeu » : style, classes préférées, une ou deux mains, statut privilégié, charge d'équipement. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { LOAD_BUDGET } from '../../engine/config/weights.ts'
import { STATUS_KEYS, STATUS_ICON } from '../../data/keys.ts'
import type { StatusKey } from '../../data/keys.ts'
import { STYLE_MODES } from '../../persistence/model.ts'
import type { Load, StyleMode } from '../../persistence/model.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { formatDecimal, formatPercent } from '../../ui/format.ts'
import { LOAD_KEYS, LOAD_LABELS, STATUS_BY_DATA_KEY, STATUS_LABELS } from '../../ui/labels.ts'
import CxChip from '../ds/CxChip.vue'
import CxIcon from '../ds/CxIcon.vue'
import CxReliabilityBadge from '../ds/CxReliabilityBadge.vue'
import CxSegmented from '../ds/CxSegmented.vue'
import type { SegmentedOption } from '../ds/types.ts'
import { STYLE_LABELS, visibleClasses, weaponClasses } from './criteriaModel.ts'
import { useCriteriaData } from './useCriteriaData.ts'

/**
 * Style de jeu (design `Main.dc.html`) : mêlée, distance, magie ou hybride ; classes d'armes préférées (multi-sélection, catégories lues dans les
 * données d'armes) ; une ou deux mains ; effet de statut privilégié ; limite de charge avec la charge maximale et le budget par arme (Calculé,
 * `calculs.md` « Budget de charge »). Chaque choix s'écrit aussitôt dans le store `criteria`.
 */
const criteria = useCriteriaStore()
const analysis = useAnalysisStore()
const { weapons } = useCriteriaData()

const c = computed(() => criteria.criteria)
const expanded = ref(false)

const styleOptions: SegmentedOption<StyleMode>[] = STYLE_MODES.map((value) => ({ value, label: STYLE_LABELS[value] }))
const handsOptions: SegmentedOption<1 | 2>[] = [
  { value: 1, label: 'Une main' },
  { value: 2, label: 'Deux mains' },
]
const loadOptions: SegmentedOption<Load>[] = LOAD_KEYS.map((value) => ({ value, label: LOAD_LABELS[value] }))

const mode = computed({ get: () => c.value.style.mode, set: (v: StyleMode) => criteria.set({ style: { mode: v } }) })
const hands = computed({ get: () => c.value.style.hands, set: (v: 1 | 2) => criteria.set({ style: { hands: v } }) })
const load = computed({ get: () => c.value.style.load, set: (v: Load) => criteria.set({ style: { load: v } }) })

const allClasses = computed(() => weaponClasses(weapons.value))
const shownClasses = computed(() => visibleClasses(allClasses.value, c.value.style.classes, expanded.value))

/** Ajoute ou retire une classe des classes préférées. */
function toggleClass(name: string): void {
  const current = c.value.style.classes
  criteria.set({ style: { classes: current.includes(name) ? current.filter((n) => n !== name) : [...current, name] } })
}
function setStatus(status: StatusKey | null): void {
  criteria.set({ style: { status } })
}

/** Icône du sprite d'un statut, sans le préfixe `i-`. */
function statusIcon(key: StatusKey): string {
  return STATUS_ICON[key].replace(/^i-/, '')
}

const budget = computed(() => analysis.budget)
const equipLoad = computed(() => analysis.derived?.value?.equipLoad ?? null)
const ratioText = computed(() => formatPercent(LOAD_BUDGET.ratios[c.value.style.load] * 100))
</script>

<template>
  <CxSegmented
    v-model="mode"
    :options="styleOptions"
    label="Style de jeu"
    full
  />
  <div class="cx-crit-field">
    <span id="crit-classes-label">Classes d’armes préférées</span>
    <div
      class="cx-row tight"
      role="group"
      aria-labelledby="crit-classes-label"
    >
      <CxChip
        v-for="cls in shownClasses"
        :key="cls.name"
        :pressed="c.style.classes.includes(cls.name)"
        @open="toggleClass(cls.name)"
      >
        {{ cls.name }}
      </CxChip>
      <span
        v-if="allClasses.length === 0"
        class="cx-muted"
      >Chargement des classes…</span>
    </div>
    <button
      v-if="allClasses.length > shownClasses.length || expanded"
      type="button"
      class="cx-crit-more"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Réduire la liste' : `Voir les ${allClasses.length} classes` }}
    </button>
  </div>
  <CxSegmented
    v-model="hands"
    :options="handsOptions"
    label="Prise en main"
    full
  />
  <div class="cx-crit-field">
    <span id="crit-status-label">Effet de statut privilégié</span>
    <div
      class="cx-row tight"
      role="group"
      aria-labelledby="crit-status-label"
    >
      <CxChip
        :pressed="c.style.status === null"
        @open="setStatus(null)"
      >
        Aucun
      </CxChip>
      <CxChip
        v-for="key in STATUS_KEYS"
        :key="key"
        :pressed="c.style.status === key"
        @open="setStatus(key)"
      >
        <CxIcon
          :name="statusIcon(key)"
          size="sm"
        />{{ STATUS_LABELS[STATUS_BY_DATA_KEY[key]] }}
      </CxChip>
    </div>
  </div>
  <div class="cx-crit-field">
    <span>Limite de charge d’équipement</span>
    <CxSegmented
      v-model="load"
      :options="loadOptions"
      label="Limite de charge"
      full
    />
    <div class="cx-crit-derived">
      <span>Charge max <b>{{ equipLoad === null ? 'Non documenté' : formatDecimal(equipLoad) }}</b></span>
      <span>seuil <b>{{ ratioText }}</b></span>
      <span>budget par arme <b>{{ budget.value === null ? 'Non documenté' : formatDecimal(budget.value) }}</b></span>
      <CxReliabilityBadge kind="calculated" />
    </div>
  </div>
</template>

<style>
.cx-crit-more { justify-self: start; padding: 0; border: 0; background: transparent; color: var(--gold-text); font-size: 12px; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
@media (max-width: 767px) { .cx-crit-more { min-height: var(--size-cible); } }
</style>
