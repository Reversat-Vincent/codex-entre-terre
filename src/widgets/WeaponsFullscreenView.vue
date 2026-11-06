<!-- Plein écran du widget A : tableau triable et filtrable de toutes les armes compatibles avec les critères (note `spec-full`). -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SortKey } from '../catalog/sort.ts'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import type { EmptyAction } from '../components/ds/types.ts'
import { HIDDEN_REASONS } from '../engine/score.ts'
import type { HiddenReason } from '../engine/score.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { formatInt } from '../ui/format.ts'
import WeaponCompareBar from './weapons/WeaponCompareBar.vue'
import WeaponsTable from './weapons/WeaponsTable.vue'
import WeaponsToolbar from './weapons/WeaponsToolbar.vue'
import { useWeaponActions } from './weapons/useWeaponActions.ts'
import {
  DEFAULT_TABLE_FILTERS,
  HIDDEN_REASON_TEXTS,
  activeFilterTexts,
  armesText,
  categoriesOf,
  filterRows,
  hasActiveFilters,
} from './weapons/weaponsModel.ts'
import type { TableFilters } from './weapons/weaponsModel.ts'
import WidgetFullscreenFrame from './WidgetFullscreenFrame.vue'

/**
 * Plein écran du widget `weapons-by-stage`, aiguillé par `WidgetFullscreenView` (`FULLSCREEN_VIEWS`) ; les puces de critères sont déjà affichées au-dessus.
 * Le tableau montre toutes les armes compatibles avec les critères, y compris les armes « Non classé » (sans score, en dernier, D10 et D18) ; toute
 * modification des critères le recalcule. Les filtres (étape, classe, amélioration, prérequis, nom), le tri et la ligne dépliée sont l'état local de la vue.
 * Les armes exclues par un critère sont comptées (« N masquées par vos critères ») et s'affichent grisées sur demande. Sans résultat : message et
 * boutons d'élargissement (effacer les filtres, afficher les armes masquées, lever la raison de masquage la plus fréquente).
 * Aucun calcul : lignes, scores et explications viennent du store `analysis` (`scored`, `filtered`).
 */
const analysis = useAnalysisStore()
const actions = useWeaponActions()

const filters = ref<TableFilters>({ ...DEFAULT_TABLE_FILTERS })
/** Tri initial : meilleur score d'abord (les armes sans score restent en fin). */
const sort = ref<SortKey[]>([{ column: 'score', direction: 'desc' }])
const expanded = ref<string | null>(null)

const all = computed(() => analysis.scored)
const hiddenTotal = computed(() => analysis.filtered.hiddenItems.length)
const keptTotal = computed(() => analysis.filtered.kept.length)
const rows = computed(() => filterRows(all.value, filters.value))
const categories = computed(() => categoriesOf(all.value))
const total = computed(() => (filters.value.showHidden ? all.value.length : keptTotal.value))

/** Raisons de masquage, de la plus fréquente à la moins fréquente : les boutons d'élargissement les plus utiles d'abord. */
const widenings = computed(() =>
  HIDDEN_REASONS.map((reason) => ({ reason, count: analysis.filtered.hidden[reason] })).filter((w) => w.count > 0).sort((a, b) => b.count - a.count),
)

const empty = computed(() => {
  const active = hasActiveFilters(filters.value)
  const texts = activeFilterTexts(filters.value)
  const actionsList: EmptyAction[] = []
  if (active) actionsList.push({ id: 'clear', label: 'Effacer les filtres', icon: 'x' })
  if (hiddenTotal.value > 0 && !filters.value.showHidden) {
    actionsList.push({ id: 'show-hidden', label: `Afficher les ${formatInt(hiddenTotal.value)} ${armesText(hiddenTotal.value)} masquées`, icon: 'filter' })
  }
  for (const w of widenings.value.slice(0, 2)) actionsList.push({ id: w.reason, label: HIDDEN_REASON_TEXTS[w.reason].action, icon: HIDDEN_REASON_TEXTS[w.reason].icon })
  return {
    title: 'Aucune arme ne correspond à ces filtres',
    text: active
      ? `Filtres actifs : ${texts.join(', ')}.`
      : hiddenTotal.value > 0
        ? 'Vos critères masquent toutes les armes candidates.'
        : 'Aucune arme candidate ne correspond au style de jeu choisi.',
    actions: actionsList,
  }
})

/**
 * Applique un bouton d'élargissement de l'état vide.
 * @param id `clear` (effacer les filtres), `show-hidden` (afficher les armes masquées) ou une raison de masquage à lever dans les critères.
 */
function onWiden(id: string): void {
  if (id === 'clear') filters.value = { ...DEFAULT_TABLE_FILTERS, showHidden: filters.value.showHidden }
  else if (id === 'show-hidden') filters.value = { ...filters.value, showHidden: true }
  else actions.widen(id as HiddenReason)
}
</script>

<template>
  <WidgetFullscreenFrame widget-id="weapons-by-stage">
    <div class="wf-body">
      <WeaponsToolbar
        v-model="filters"
        :categories="categories"
        :shown="rows.length"
        :total="total"
        :hidden="hiddenTotal"
      />
      <p class="wf-base">
        Valeurs de base à +0 : le score ne tient compte ni du niveau d'amélioration ni des Cendres de guerre. Le score et l'étape sont calculés par l'application
        (« Pourquoi ? » sous chaque ligne).
      </p>
      <CxEmptyState
        v-if="rows.length === 0"
        :title="empty.title"
        :text="empty.text"
        :actions="empty.actions"
        @action="onWiden"
      />
      <WeaponsTable
        v-else
        v-model:sort="sort"
        v-model:expanded="expanded"
        :rows="rows"
      />
      <WeaponCompareBar />
    </div>
  </WidgetFullscreenFrame>
</template>

<style scoped>
.wf-body { display: grid; gap: var(--space-3); min-width: 0; }
.wf-base { color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
