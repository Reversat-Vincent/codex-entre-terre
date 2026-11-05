<!-- Tableau plein écran du widget A : toutes les armes compatibles, tri multicolonne, virtualisation, « Pourquoi ? » sous la ligne. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SortKey } from '../../catalog/sort.ts'
import CatalogCell from '../../components/domain/catalog/CatalogCell.vue'
import { columnsOf } from '../../components/domain/catalog/catalogModel.ts'
import type { CatalogColumn } from '../../components/domain/catalog/catalogModel.ts'
import CxButton from '../../components/ds/CxButton.vue'
import CxDataTable from '../../components/ds/CxDataTable.vue'
import CxNote from '../../components/ds/CxNote.vue'
import CxReliabilityBadge from '../../components/ds/CxReliabilityBadge.vue'
import CxRequirementChips from '../../components/ds/CxRequirementChips.vue'
import CxValue from '../../components/ds/CxValue.vue'
import CxWhyPanel from '../../components/ds/CxWhyPanel.vue'
import type { TableColumn } from '../../components/ds/types.ts'
import type { ProfileContext } from '../../catalog/registry.ts'
import { stageIndex } from '../../engine/config/stages.ts'
import type { ScoredWeapon } from '../../engine/score.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCompareStore } from '../../stores/compare.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { usePinsStore } from '../../stores/pins.ts'
import { formatInt } from '../../ui/format.ts'
import { DLC_ZONE_LABELS, STAGE_LABELS } from '../../ui/labels.ts'
import { useWeaponActions } from './useWeaponActions.ts'
import {
  HIDDEN_REASON_TEXTS,
  attackSortValue,
  isProfileConfigured,
  missingSortValue,
  passiveSortValue,
  scoreSortValue,
  stageSortValue,
} from './weaponsModel.ts'

/**
 * Tableau des armes du plein écran (note `spec-full`, design `PleinEcranA.dc.html`).
 * - Tri par en-tête, Maj + clic pour un tri secondaire dont le rang s'affiche ; les `null` passent toujours en dernier (`CxDataTable`, `src/catalog/sort.ts`),
 *   donc les armes « Non classé » (sans score, D18) en fin de tableau quel que soit le sens.
 * - Au-delà de 100 lignes, `CxDataTable` virtualise (lignes de 52 px : le nom porte la classe en dessous) ; l'en-tête est collant, le compteur s'affiche dessous.
 * - Un clic sur une ligne déplie le « Pourquoi ? » du score et celui de l'étape sous la ligne ; une seule ligne est ouverte (`expanded`).
 * - Score et étape portent le badge Calculé ; les estimations sont badgées dans la colonne Amélioration (cellule du catalogue `CatalogCell`).
 * - Une arme exclue par un critère est grisée, signalée « Masquée » et motivée dans son détail.
 * Aucun calcul : score, étape, prérequis et explications viennent du store `analysis` ; le tri n'utilise que les valeurs de `weaponsModel.ts`.
 */
const props = defineProps<{
  /** Lignes déjà filtrées (`filterRows`). */
  rows: readonly ScoredWeapon[]
}>()

/** Critères de tri, principal en premier. */
const sort = defineModel<SortKey[]>('sort', { required: true })
/** Référence de la ligne dépliée, `null` si aucune. */
const expanded = defineModel<string | null>('expanded', { required: true })

const analysis = useAnalysisStore()
const criteria = useCriteriaStore()
const pins = usePinsStore()
const compare = useCompareStore()
const actions = useWeaponActions()

const profile = computed<ProfileContext>(() => ({
  attributes: criteria.criteria.character.attributes,
  hands: criteria.criteria.style.hands === 2 ? 'two' : 'one',
}))
const configured = computed(() => isProfileConfigured(criteria.criteria.character.attributes))
const currentStage = computed(() => analysis.stage.value)

/** Colonnes de cellules du catalogue des armes, réutilisées telles quelles (attaque, scaling, passif, amélioration, obtention, nom). */
const CELLS: Readonly<Record<string, CatalogColumn>> = Object.fromEntries(columnsOf('weapons:melee').map((c) => [c.id, c]))

/**
 * Colonne de cellule du catalogue.
 * @param id Identifiant de la colonne (`name`, `attack`…).
 * @returns La colonne ; une erreur si le catalogue ne la définit plus.
 */
function cell(id: string): CatalogColumn {
  const column = CELLS[id]
  if (column === undefined) throw new Error(`Colonne « ${id} » absente du catalogue des armes.`)
  return column
}

const columns: readonly TableColumn<ScoredWeapon>[] = [
  { id: 'score', label: 'Score', align: 'right', sortValue: scoreSortValue, width: '110px' },
  { id: 'name', label: 'Arme', sortValue: (r) => r.candidate.weapon.derived.displayName, width: '230px' },
  { id: 'stage', label: 'Étape', sortValue: stageSortValue, width: '150px' },
  { id: 'weight', label: 'Poids', align: 'right', format: 'weight', value: (r) => r.candidate.weapon.weight, width: '80px' },
  { id: 'attack', label: 'Attaque +0', sortValue: attackSortValue },
  { id: 'scaling', label: 'Scaling', sortable: false },
  { id: 'requirements', label: 'Prérequis', sortValue: missingSortValue },
  { id: 'passive', label: 'Effet passif', sortValue: passiveSortValue },
  { id: 'upgrade', label: 'Amélioration', sortable: false },
  { id: 'obtention', label: 'Obtention', sortable: false },
  { id: 'actions', label: 'Actions', sortable: false },
]

/**
 * Total du score d'une ligne.
 * @param row Arme évaluée.
 * @returns Le total, ou `null` (arme sans score).
 */
function totalOf(row: ScoredWeapon): number | null {
  return row.score.value?.total ?? null
}

/**
 * État de l'étape d'une arme par rapport à l'étape courante (losange plein pour une étape passée ou courante, creux pour une étape à venir).
 * @param row Arme évaluée.
 * @returns `past`, `now` ou `todo` ; `todo` sans étape courante ou sans étape connue.
 */
function stateOf(row: ScoredWeapon): 'past' | 'now' | 'todo' {
  const stage = row.stage.value?.stage
  const now = currentStage.value
  if (stage === undefined || now === null) return 'todo'
  return stageIndex(stage) < stageIndex(now) ? 'past' : stage === now ? 'now' : 'todo'
}

/**
 * Libellé de l'étape d'une arme : l'étape, et la sous-zone en DLC (D11).
 * @param row Arme évaluée.
 * @returns Par exemple « DLC · Entrée » ; `null` pour une arme « Non classé ».
 */
function stageText(row: ScoredWeapon): string | null {
  const info = row.stage.value
  if (info === null) return null
  return info.stage === 'dlc' && info.dlcZone !== null ? `${STAGE_LABELS.dlc} · ${DLC_ZONE_LABELS[info.dlcZone]}` : STAGE_LABELS[info.stage]
}

/**
 * Texte de la raison de masquage d'une arme.
 * @param row Arme évaluée.
 * @returns La raison, ou `null` si l'arme est visible.
 */
function reasonOf(row: ScoredWeapon): string | null {
  return row.hidden === null ? null : HIDDEN_REASON_TEXTS[row.hidden].reason
}

/**
 * Ouvre ou ferme le détail d'une ligne depuis son bouton « Pourquoi ? ».
 * @param row Arme évaluée.
 */
function toggleDetail(row: ScoredWeapon): void {
  expanded.value = expanded.value === row.candidate.ref ? null : row.candidate.ref
}

// Le détail d'une ligne est plus large que l'écran quand le tableau défile à l'horizontale : sa largeur suit celle de la zone visible,
// mesurée ici et transmise en variable CSS (`--wt-w`), et il reste collé au bord gauche.
const root = ref<HTMLElement | null>(null)
const viewWidth = ref(0)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (root.value === null || typeof ResizeObserver === 'undefined') return
  viewWidth.value = root.value.clientWidth
  observer = new ResizeObserver(() => {
    viewWidth.value = root.value?.clientWidth ?? 0
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

const selected = computed(() => [...compare.items])
const rowCount = computed(() => formatInt(props.rows.length))
</script>

<template>
  <div
    ref="root"
    class="wt-root"
    :style="viewWidth > 0 ? { '--wt-w': `${viewWidth}px` } : undefined"
  >
    <CxDataTable
      v-model:sort="sort"
      v-model:expanded="expanded"
      :rows="rows"
      :columns="columns"
      :row-key="(row: ScoredWeapon) => row.candidate.ref"
      :caption="`Armes compatibles avec vos critères, valeurs de base à +0 (${rowCount})`"
      :page-size="Number.POSITIVE_INFINITY"
      :row-height="52"
      max-height="72vh"
      expandable
      :selected-keys="selected"
      :row-label="(row: ScoredWeapon) => `Pourquoi ${row.candidate.weapon.name} ?`"
      :count-noun="['arme', 'armes']"
    >
      <template #cell-score="{ row }">
        <div
          class="wt-cell wt-score"
          :class="{ 'is-dim': row.hidden !== null }"
        >
          <template v-if="totalOf(row) !== null">
            <span class="cx-score-num">{{ formatInt(totalOf(row) ?? 0) }}<span class="cx-sr"> sur 100</span></span>
            <CxReliabilityBadge
              v-if="row.hidden === null"
              kind="calculated"
            />
            <span
              v-else
              class="wt-masked"
              :title="reasonOf(row) ?? undefined"
            >Masquée</span>
          </template>
          <template v-else>
            <CxValue
              v-if="row.stage.value !== null"
              :value="null"
              cell
            />
            <span
              v-else
              class="cx-null"
            >Non classé</span>
            <span
              v-if="row.hidden !== null"
              class="wt-masked"
              :title="reasonOf(row) ?? undefined"
            >Masquée</span>
            <CxReliabilityBadge
              v-else
              kind="null"
            />
          </template>
        </div>
      </template>

      <template #cell-name="{ row }">
        <div
          class="wt-cell"
          :class="{ 'is-dim': row.hidden !== null }"
        >
          <CatalogCell
            catalog="weapons:melee"
            :column="cell('name')"
            :row="row.candidate.weapon"
            :profile="profile"
          />
        </div>
      </template>

      <template #cell-stage="{ row }">
        <div
          class="wt-cell wt-stage-cell"
          :class="{ 'is-dim': row.hidden !== null }"
        >
          <template v-if="stageText(row) !== null">
            <span
              class="wt-stage"
              :class="`is-${stateOf(row)}`"
            >
              <i aria-hidden="true" />{{ stageText(row) }}
              <span
                v-if="stateOf(row) === 'now'"
                class="cx-sr"
              > (étape courante)</span>
            </span>
            <CxReliabilityBadge kind="calculated" />
          </template>
          <template v-else>
            <span class="cx-null">Non classé</span>
            <CxReliabilityBadge kind="null" />
          </template>
        </div>
      </template>

      <template #cell-weight="{ row }">
        <div
          class="wt-cell"
          :class="{ 'is-dim': row.hidden !== null }"
        >
          <CxValue
            :value="row.candidate.weapon.weight"
            format="weight"
            cell
          />
        </div>
      </template>

      <template
        v-for="id in ['attack', 'scaling', 'passive', 'upgrade', 'obtention']"
        :key="id"
        #[`cell-${id}`]="{ row }"
      >
        <div
          class="wt-cell"
          :class="{ 'is-dim': row.hidden !== null }"
        >
          <CatalogCell
            catalog="weapons:melee"
            :column="cell(id)"
            :row="row.candidate.weapon"
            :profile="profile"
          />
        </div>
      </template>

      <template #cell-requirements="{ row }">
        <div
          class="wt-cell"
          :class="{ 'is-dim': row.hidden !== null }"
        >
          <CxRequirementChips
            :checks="row.score.value?.requirements ?? []"
            :profile-configured="configured"
          />
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="wt-acts">
          <CxButton
            variant="ghost"
            size="sm"
            icon="pin"
            icon-only
            :label="pins.isPinned(row.candidate.ref) ? 'Retirer de Ma liste' : 'Épingler à Ma liste'"
            :pressed="pins.isPinned(row.candidate.ref)"
            @click="actions.togglePin(row.candidate.ref)"
          />
          <CxButton
            variant="ghost"
            size="sm"
            icon="compare"
            icon-only
            :label="compare.has(row.candidate.ref) ? 'Retirer de la comparaison' : 'Comparer'"
            :pressed="compare.has(row.candidate.ref)"
            @click="actions.toggleCompare(row.candidate.ref)"
          />
          <CxButton
            variant="ghost"
            size="sm"
            icon="help"
            :aria-expanded="expanded === row.candidate.ref ? 'true' : 'false'"
            @click="toggleDetail(row)"
          >
            Pourquoi ?
          </CxButton>
        </div>
      </template>

      <template #detail="{ row }">
        <div class="wt-detail">
          <CxNote
            v-if="reasonOf(row) !== null"
            tone="warn"
            title="Masquée par vos critères."
          >
            {{ reasonOf(row) }}. Elle n'entre pas dans les recommandations tant que ce critère reste actif.
          </CxNote>
          <div class="cx-row">
            <CxButton
              size="sm"
              variant="ghost"
              icon="book"
              :href="actions.sheetHref(row.candidate.ref)"
            >
              Voir la fiche
            </CxButton>
          </div>
          <CxWhyPanel
            :explanation="row.score.explanation"
            :subject="row.candidate.weapon.name"
            :estimate="row.score.estimate?.confidence ?? null"
            :toggle="false"
            :open="true"
            @close="expanded = null"
          />
          <CxWhyPanel
            :explanation="row.stage.explanation"
            :estimate="row.stage.estimate?.confidence ?? null"
            :toggle="false"
            :open="true"
            @close="expanded = null"
          />
        </div>
      </template>
    </CxDataTable>
  </div>
</template>

<style scoped>
.wt-root { min-width: 0; }
.wt-cell { display: inline-flex; align-items: center; gap: var(--space-1); }
.wt-cell.is-dim { opacity: .55; }
.wt-score { flex-direction: column; align-items: flex-end; gap: 2px; width: 100%; }
.wt-stage-cell { flex-direction: column; align-items: flex-start; gap: 2px; }
.wt-stage { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.wt-stage i { display: inline-block; width: 8px; height: 8px; transform: rotate(45deg); border: 1.5px solid var(--control-border); background: var(--surface); }
.wt-stage.is-past i, .wt-stage.is-now i { border-color: var(--gold); background: var(--gold); }
.wt-stage.is-now { color: var(--gold-text); font-weight: 600; }
.wt-masked { padding: 0 var(--space-1); border: 1px solid var(--line-strong); border-radius: var(--radius-xs); color: var(--ink-2); font-size: 11px; line-height: 16px; }
.wt-acts { display: flex; flex-wrap: nowrap; align-items: center; gap: 2px; }
.wt-detail { position: sticky; left: var(--space-4); display: grid; gap: var(--space-3); width: calc(var(--wt-w, 100%) - 2 * var(--space-4) - 2px); max-width: 100%; white-space: normal; }
</style>
