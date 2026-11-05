<!-- Tableau dense des catalogues : tri multicolonne, en-tête collant, pagination par 50, virtualisation au-delà de 100 lignes, ligne dépliable. -->
<script setup lang="ts" generic="R">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { PAGE_SIZE, paginate } from '../../catalog/paginate.ts'
import { sortRank, sortRows, toggleSort, type SortAccessors, type SortKey } from '../../catalog/sort.ts'
import { useVirtualList, type VirtualExtra } from '../../composables/useVirtualList.ts'
import { formatInt } from '../../ui/format.ts'
import CxButton from './CxButton.vue'
import CxIcon from './CxIcon.vue'
import CxValue from './CxValue.vue'
import type { TableColumn } from './types.ts'

/**
 * Tableau de données (README du design system, composant DataTable ; notes `spec-full` et `spec-catalog`). Lignes de 34 px, chiffres tabulaires.
 * - Tri : clic = tri principal, Maj + clic = tri secondaire ; le rang s'affiche dans `.cx-sort-rank` dès qu'il y a plusieurs critères ;
 *   `aria-sort` sur l'en-tête. Le tri et les `null` en dernier (quel que soit le sens) sont ceux de `src/catalog/sort.ts`.
 * - Cases : `CxValue` en mode cellule (`null` = « Non documenté », case hachurée) sauf si le slot `cell-<id>` fournit le contenu.
 * - Pagination par 50 (`PAGE_SIZE`) avec « Tout afficher » ; au-delà de 100 lignes affichées, virtualisation (`useVirtualList`).
 * - Ligne dépliable (`expandable`) : le slot `detail` se place sous la ligne, une seule ligne ouverte à la fois ; le bouton de dépliage
 *   porte `aria-expanded`, un clic ailleurs sur la ligne (hors lien et bouton) déplie aussi.
 * Le filtrage et les compteurs de facettes restent à l'appelant ; le composant ne lit aucun store.
 */
const props = withDefaults(
  defineProps<{
    /** Lignes déjà filtrées, dans leur ordre d'origine (le tri est appliqué ici). */
    rows: readonly R[]
    /** Colonnes dans l'ordre d'affichage. */
    columns: readonly TableColumn<R>[]
    /** Identifiant stable d'une ligne (sélection, dépliage, clé de rendu). */
    rowKey: (row: R) => string
    /** Titre du tableau, lu par les lecteurs d'écran (« Armes de mêlée »). */
    caption: string
    /** Taille d'une page ; `PAGE_SIZE` (50) par défaut. */
    pageSize?: number
    /** Nombre de lignes affichées au-delà duquel la liste est virtualisée (100). */
    virtualizeAbove?: number
    /** Hauteur d'une ligne en pixels (34). */
    rowHeight?: number
    /** Hauteur maximale de la zone défilante (en-tête collant dedans) ; valeur CSS. */
    maxHeight?: string
    /** Active le dépliage d'une ligne et le slot `detail`. */
    expandable?: boolean
    /** Clés des lignes sélectionnées (`.is-selected`) : comparateur, panneau « Pourquoi ? » ouvert. */
    selectedKeys?: readonly string[]
    /** Nom accessible du bouton de dépliage d'une ligne (« Détail de Moonveil »). */
    rowLabel?: (row: R) => string
    /** Singulier et pluriel du compteur (« résultat » / « résultats »). */
    countNoun?: readonly [string, string]
  }>(),
  {
    pageSize: PAGE_SIZE,
    virtualizeAbove: 100,
    rowHeight: 34,
    maxHeight: '70vh',
    expandable: false,
    selectedKeys: () => [],
    rowLabel: () => 'Afficher le détail',
    countNoun: () => ['résultat', 'résultats'],
  },
)

defineSlots<{
  /** Contenu d'une case ; remplace `CxValue`. */
  [name: `cell-${string}`]: (props: { row: R }) => unknown
  /** Détail sous la ligne dépliée. */
  detail?: (props: { row: R }) => unknown
  /** Contenu quand aucune ligne ne correspond. */
  empty?: () => unknown
}>()

/** Critères de tri, principal en premier. */
const sort = defineModel<SortKey[]>('sort', { default: () => [] })
/** Clé de la ligne dépliée, `null` si aucune. */
const expanded = defineModel<string | null>('expanded', { default: null })
/** Page affichée (à partir de 1). */
const page = defineModel<number>('page', { default: 1 })

const uid = useId()
const showAll = ref(false)
const detailEl = ref<HTMLElement | null>(null)
const detailHeight = ref(120)

const accessors = computed<SortAccessors<R>>(() => {
  const out: Record<string, (row: R) => ReturnType<NonNullable<TableColumn<R>['sortValue']>>> = {}
  for (const col of props.columns) {
    const get = col.sortValue ?? col.value
    if (get && col.sortable !== false) out[col.id] = get
  }
  return out
})
const sortedRows = computed(() => sortRows(props.rows, sort.value, accessors.value))
const pageInfo = computed(() => paginate(sortedRows.value, page.value, showAll.value ? Infinity : props.pageSize))
const shown = computed(() => pageInfo.value.items)
const virtual = computed(() => shown.value.length > props.virtualizeAbove)

const expandedIndex = computed(() => (expanded.value === null ? -1 : shown.value.findIndex((r) => props.rowKey(r) === expanded.value)))
const extra = computed<VirtualExtra | null>(() => (expandedIndex.value < 0 ? null : { index: expandedIndex.value, height: detailHeight.value }))
const count = computed(() => shown.value.length)
const list = useVirtualList(count, props.rowHeight, extra)

const windowStart = computed(() => (virtual.value ? list.window.value.start : 0))
const visibleRows = computed(() => (virtual.value ? shown.value.slice(list.window.value.start, list.window.value.end) : shown.value))
const colspan = computed(() => props.columns.length + (props.expandable ? 1 : 0))

const selected = computed(() => new Set(props.selectedKeys))
const noun = computed(() => (pageInfo.value.total === 1 ? props.countNoun[0] : props.countNoun[1]))

// Un nouveau tri ou une nouvelle liste ramène en haut : la page courante n'a plus de sens.
watch(sort, () => {
  page.value = 1
  list.reset()
})
watch(page, () => list.reset())

// Le détail déplié a une hauteur libre : on la mesure pour que l'espaceur de la liste virtualisée reste juste.
watch(
  [expanded, () => list.window.value.start, virtual],
  async () => {
    await nextTick()
    const h = detailEl.value?.offsetHeight
    if (h && h !== detailHeight.value) detailHeight.value = h
  },
  { flush: 'post' },
)

/** Mémorise la cellule de détail ; une fonction, car un `ref` posé dans un `v-for` serait un tableau. */
function setDetail(el: unknown): void {
  detailEl.value = el instanceof HTMLElement ? el : null
}
function isSortable(col: TableColumn<R>): boolean {
  return col.id in accessors.value
}
function ariaSort(col: TableColumn<R>): 'ascending' | 'descending' | undefined {
  const key = sort.value.find((k) => k.column === col.id)
  return key ? (key.direction === 'asc' ? 'ascending' : 'descending') : undefined
}
function rankOf(col: TableColumn<R>): number | null {
  return sort.value.length > 1 ? sortRank(sort.value, col.id) : null
}
function onSort(col: TableColumn<R>, event: MouseEvent): void {
  sort.value = toggleSort(sort.value, col.id, event.shiftKey)
}
function toggleRow(row: R): void {
  const key = props.rowKey(row)
  expanded.value = expanded.value === key ? null : key
}
function onRowClick(event: MouseEvent, row: R): void {
  if (!props.expandable) return
  // Un clic sur un lien, un bouton ou une case garde son propre effet.
  if ((event.target as HTMLElement).closest('a, button, input, select, label')) return
  toggleRow(row)
}
function goTo(next: number): void {
  page.value = next
}
</script>

<template>
  <div class="cx-dtable">
    <div
      :ref="(el) => (list.container.value = el as HTMLElement | null)"
      class="cx-tbl-wrap"
      :style="{ maxHeight }"
      @scroll.passive="virtual ? list.onScroll() : undefined"
    >
      <table
        class="cx-tbl is-fixed"
        :aria-rowcount="virtual ? pageInfo.total + 1 : undefined"
      >
        <caption class="cx-sr">
          {{ caption }}
        </caption>
        <thead>
          <tr>
            <th
              v-if="expandable"
              scope="col"
              class="cx-tbl-x"
            >
              <span class="cx-sr">Détail</span>
            </th>
            <th
              v-for="col in columns"
              :key="col.id"
              scope="col"
              :class="{ num: col.align === 'right' }"
              :style="col.width ? { width: col.width } : undefined"
              :aria-sort="ariaSort(col)"
            >
              <button
                v-if="isSortable(col)"
                type="button"
                class="cx-th-btn"
                :title="`Trier par ${col.label}. Maj + clic : ajouter un tri secondaire`"
                @click="onSort(col, $event)"
              >
                {{ col.label }}
                <CxIcon
                  v-if="ariaSort(col)"
                  :name="ariaSort(col) === 'ascending' ? 'chev-u' : 'chev-d'"
                  size="xs"
                />
                <span
                  v-if="rankOf(col) !== null"
                  class="cx-sort-rank"
                >{{ rankOf(col) }}</span>
              </button>
              <template v-else>
                {{ col.label }}
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="virtual && list.window.value.before > 0"
            class="cx-tbl-spacer"
            aria-hidden="true"
            :style="{ height: `${list.window.value.before}px` }"
          >
            <td :colspan="colspan" />
          </tr>
          <template
            v-for="(row, i) in visibleRows"
            :key="rowKey(row)"
          >
            <tr
              :class="{ 'is-selected': selected.has(rowKey(row)), 'is-open': expanded === rowKey(row), 'is-clickable': expandable }"
              :style="{ height: `${rowHeight}px` }"
              :aria-rowindex="virtual ? pageInfo.from + windowStart + i + 1 : undefined"
              @click="onRowClick($event, row)"
            >
              <td
                v-if="expandable"
                class="cx-tbl-x"
              >
                <button
                  type="button"
                  class="cx-tbl-toggle"
                  :aria-expanded="expanded === rowKey(row)"
                  :aria-controls="`${uid}-detail`"
                  :aria-label="rowLabel(row)"
                  @click="toggleRow(row)"
                >
                  <CxIcon
                    :name="expanded === rowKey(row) ? 'chev-d' : 'chev-r'"
                    size="sm"
                  />
                </button>
              </td>
              <td
                v-for="col in columns"
                :key="col.id"
                :class="{ num: col.align === 'right' }"
              >
                <slot
                  :name="`cell-${col.id}`"
                  :row="row"
                >
                  <CxValue
                    :value="col.value ? (col.value(row) ?? null) : null"
                    :format="col.format"
                    :digits="col.digits"
                    cell
                    :why="false"
                  />
                </slot>
              </td>
            </tr>
            <tr
              v-if="expandable && expanded === rowKey(row)"
              :id="`${uid}-detail`"
              class="cx-tbl-detail"
            >
              <td
                :ref="setDetail"
                :colspan="colspan"
              >
                <slot
                  name="detail"
                  :row="row"
                />
              </td>
            </tr>
          </template>
          <tr
            v-if="virtual && list.window.value.after > 0"
            class="cx-tbl-spacer"
            aria-hidden="true"
            :style="{ height: `${list.window.value.after}px` }"
          >
            <td :colspan="colspan" />
          </tr>
          <tr v-if="pageInfo.total === 0">
            <td
              :colspan="colspan"
              class="cx-tbl-empty"
            >
              <slot name="empty">
                Aucun résultat.
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="cx-tbl-foot">
      <span
        class="cx-num"
        aria-live="polite"
      >
        <template v-if="pageInfo.total > 0 && pageInfo.pageCount > 1">{{ formatInt(pageInfo.from) }}–{{ formatInt(pageInfo.to) }} sur </template>{{ formatInt(pageInfo.total) }} {{ noun }}
      </span>
      <span
        v-if="pageInfo.pageCount > 1 || showAll"
        class="cx-row tight"
      >
        <template v-if="!showAll">
          <CxButton
            size="sm"
            variant="ghost"
            icon="chev-l"
            :disabled="pageInfo.page <= 1"
            @click="goTo(pageInfo.page - 1)"
          >Précédent</CxButton>
          <span class="cx-num cx-muted">Page {{ pageInfo.page }} sur {{ pageInfo.pageCount }}</span>
          <CxButton
            size="sm"
            variant="ghost"
            icon="chev-r"
            :disabled="pageInfo.page >= pageInfo.pageCount"
            @click="goTo(pageInfo.page + 1)"
          >Suivant</CxButton>
        </template>
        <CxButton
          size="sm"
          variant="ghost"
          @click="showAll = !showAll; list.reset()"
        >{{ showAll ? 'Afficher par pages' : 'Tout afficher' }}</CxButton>
      </span>
    </div>
  </div>
</template>

<style>
.cx-dtable { display: grid; gap: var(--space-2); min-width: 0; }
.cx-tbl-wrap { overflow: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.cx-tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; line-height: 18px; }
.cx-tbl th { position: sticky; top: 0; z-index: var(--z-sticky); padding: 8px 10px; border-bottom: 1px solid var(--line-strong); background: var(--surface-raised); color: var(--ink-2); font: 600 12px/16px var(--font-sans); text-align: left; white-space: nowrap; vertical-align: bottom; }
.cx-tbl th.num { text-align: right; }
.cx-th-btn { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.cx-th-btn:hover { color: var(--ink); }
.cx-tbl th[aria-sort="ascending"], .cx-tbl th[aria-sort="descending"] { color: var(--gold-text); }
.cx-sort-rank { display: inline-grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; background: var(--gold-wash); color: var(--gold-text); font-size: 10px; line-height: 1; }
.cx-tbl td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
/* Lignes de 34 px : hauteur fixe indispensable à la virtualisation, contenu sur une ligne. */
.cx-tbl.is-fixed tbody tr:not(.cx-tbl-detail):not(.cx-tbl-spacer) td { height: 34px; padding-block: 0; vertical-align: middle; white-space: nowrap; }
.cx-tbl tbody tr:last-child td { border-bottom: 0; }
.cx-tbl tbody tr:hover td { background: var(--surface-hover); }
.cx-tbl tr.is-clickable { cursor: pointer; }
.cx-tbl tr.is-selected td, .cx-tbl tr.is-open td { background: var(--gold-wash); }
.cx-tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.cx-tbl .cx-cell-name, .cx a.cx-cell-name { color: var(--ink); font-weight: 600; text-decoration: none; }
.cx a.cx-cell-name:hover { color: var(--gold-text); text-decoration: underline; }
.cx-tbl-dim td { color: var(--ink-3); }
.cx-tbl .cx-tbl-x { width: 32px; padding-inline: 4px; text-align: center; }
.cx-tbl-toggle { display: inline-grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--radius-xs); background: transparent; color: var(--ink-2); cursor: pointer; }
.cx-tbl-toggle:hover { background: var(--surface-hover); color: var(--ink); }
.cx-tbl tr.cx-tbl-detail td { padding: var(--space-3) var(--space-4); background: var(--surface-sunken); white-space: normal; }
.cx-tbl tr.cx-tbl-spacer td, .cx-tbl tr.cx-tbl-spacer:hover td { height: inherit; padding: 0; border: 0; background: transparent; }
.cx-tbl-empty { padding: var(--space-4); color: var(--ink-2); }
.cx-tbl-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
