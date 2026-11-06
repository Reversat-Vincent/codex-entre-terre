<!-- Tableau du Comparateur : une colonne par élément, une ligne par critère ; la meilleure valeur de chaque ligne porte une icône et le mot « Meilleur ». -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogKey } from '../../../catalog/registry.ts'
import { entityRoute } from '../../../router/entityRoute.ts'
import { VERDICT_WORDS, judgeRow } from '../../../ui/compare.ts'
import type { CellVerdict, CompareValue } from '../../../ui/compare.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CatalogCell from '../catalog/CatalogCell.vue'
import { detailOf } from '../mylist/myListModel.ts'
import CxButton from '../../ds/CxButton.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxSkeleton from '../../ds/CxSkeleton.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWikiLink from '../../ds/CxWikiLink.vue'
import type { CompareRowSpec } from './compareModel.ts'
import type { CompareColumn } from './useCompare.ts'

/**
 * Tableau de comparaison (brief § 6 : 2 à 4 éléments du même type côte à côte, écarts mis en évidence).
 * - Meilleure valeur : icône « coche » et mot « Meilleur » (jamais la couleur seule), selon le sens de la ligne (plus haut ou plus bas) ;
 *   une ligne sans sens signale « Écart » quand les valeurs diffèrent. `null` s'affiche « Non documenté » et n'est jamais meilleur ni pire.
 * - Le jugement est celui de `judgeRow` (`src/ui/compare.ts`) ; les valeurs comparées viennent de `compareModel.ts`.
 * - Petits écrans : le tableau défile dans les deux sens dans sa zone ; l'en-tête des colonnes (noms) et la colonne des critères restent collés.
 * Les cellules sont celles du catalogue du genre (`CatalogCell`) : mêmes puces, mêmes badges, mêmes conventions de données.
 */
const props = defineProps<{
  columns: readonly CompareColumn[]
  rows: readonly CompareRowSpec[]
  /** Catalogue qui décrit le genre (cellules). */
  catalog: CatalogKey
}>()

const emit = defineEmits<{
  /** Retire une colonne. */
  remove: [ref: string]
}>()

/** Valeur comparée de la cellule d'une ligne ; `null` si l'entrée manque. */
function valueOf(spec: CompareRowSpec, column: CompareColumn): CompareValue {
  if (spec.cell === 'score') return column.score?.total ?? null
  if (spec.cell === 'stage') return column.stage === undefined ? null : column.stage.kind === 'stage' ? column.stage.text : 'Non classé'
  return column.row === null ? null : spec.rank(column.row, { requirements: column.requirements })
}

interface DisplayRow {
  readonly spec: CompareRowSpec
  readonly verdicts: readonly CellVerdict[]
  /** Vrai si la ligne diffère sans meilleure valeur : repère « Écart » sur le libellé. */
  readonly flagged: boolean
  /** Titre du groupe à écrire avant cette ligne (première ligne du groupe), sinon `null`. */
  readonly groupTitle: string | null
}

const displayRows = computed((): DisplayRow[] =>
  props.rows.map((spec, i) => {
    const { verdicts } = judgeRow(
      props.columns.map((c) => valueOf(spec, c)),
      spec.better,
    )
    const previous = props.rows[i - 1]
    return {
      spec,
      verdicts,
      flagged: verdicts.includes('different'),
      groupTitle: spec.group !== null && previous?.group !== spec.group ? spec.group : null,
    }
  }),
)

const names = computed(() => props.columns.map((c) => c.row?.derived.displayName ?? c.ref))

/** Texte pour un lecteur d'écran : le verdict d'une cellule s'ajoute à sa valeur. */
function word(verdict: CellVerdict | undefined): string | null {
  return verdict === undefined ? null : VERDICT_WORDS[verdict]
}
</script>

<template>
  <div
    class="cmp-scroller"
    tabindex="0"
    role="region"
    aria-label="Tableau de comparaison, à faire défiler"
  >
    <table
      class="cmp-table"
      :style="{ '--cols': columns.length }"
    >
      <caption class="cx-sr">
        Comparaison de {{ columns.length }} éléments
      </caption>
      <thead>
        <tr>
          <th
            scope="col"
            class="cmp-corner"
          >
            <span class="cx-sr">Critère</span>
          </th>
          <th
            v-for="(column, c) in columns"
            :key="column.ref"
            scope="col"
            class="cmp-head"
          >
            <div class="cmp-head-body">
              <template v-if="column.state === 'ready' && column.row">
                <span class="cmp-head-line">
                  <RouterLink
                    class="cmp-name"
                    :to="entityRoute(column.ref)"
                  >{{ names[c] }}</RouterLink>
                  <CxSourceBadge :source="column.row.source as SourceName" />
                </span>
                <span
                  v-if="detailOf(column.row)"
                  class="cmp-sub cx-muted"
                >{{ detailOf(column.row) }}</span>
              </template>
              <template v-else-if="column.state === 'loading'">
                <CxSkeleton
                  width="70%"
                  :height="18"
                />
                <span
                  class="cx-sr"
                  role="status"
                >Chargement de {{ column.ref }}</span>
              </template>
              <template v-else>
                <span class="cmp-name">Élément introuvable</span>
                <span class="cmp-sub cx-muted">
                  <CxIcon
                    name="alert"
                    size="sm"
                  />{{ column.state === 'error' ? 'Données illisibles : ' : 'Absent des données : ' }}<code class="cmp-ref">{{ column.ref }}</code>
                </span>
              </template>
              <span class="cmp-head-actions">
                <CxWikiLink
                  v-if="column.row"
                  :href="(column.row as unknown as { url?: string }).url"
                  size="sm"
                />
                <CxButton
                  variant="ghost"
                  size="sm"
                  icon-only
                  icon="x"
                  :label="`Retirer ${names[c]} du comparateur`"
                  @click="emit('remove', column.ref)"
                />
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="row in displayRows"
          :key="row.spec.id"
        >
          <tr
            v-if="row.groupTitle !== null"
            class="cmp-group"
          >
            <th
              scope="colgroup"
              :colspan="columns.length + 1"
            >
              {{ row.groupTitle }}
            </th>
          </tr>
          <tr>
            <th
              scope="row"
              class="cmp-label"
            >
              <span class="cmp-label-text">{{ row.spec.label }}</span>
              <span
                v-if="row.spec.note"
                class="cmp-note cx-muted"
              >{{ row.spec.note }}</span>
              <span
                v-if="row.flagged"
                class="cmp-diff"
              ><CxIcon
                name="swap"
                size="xs"
              />Écart</span>
            </th>
            <td
              v-for="(column, c) in columns"
              :key="column.ref"
              class="cmp-cell"
              :class="{ 'is-best': row.verdicts[c] === 'best' }"
            >
              <div class="cat-card cmp-cell-body">
                <CxSkeleton
                  v-if="column.state === 'loading'"
                  :height="16"
                />
                <template v-else-if="row.spec.cell === 'score'">
                  <span
                    v-if="column.score === undefined"
                    class="cx-muted"
                  >Calcul en cours…</span>
                  <span
                    v-else-if="column.score.total === null"
                    class="cx-muted"
                  >Non classé</span>
                  <span
                    v-else
                    class="cmp-score"
                  >
                    <CxValue
                      :value="column.score.total"
                      calculated
                      :why="false"
                      :estimate="column.score.estimate"
                      method="Score de recommandation de l’arme pour vos critères, sur 100."
                    /><span class="cx-muted"> / 100</span>
                  </span>
                  <span
                    v-if="column.score?.outsideStyle"
                    class="cx-muted"
                  >Hors de votre style de jeu : donné pour information</span>
                </template>
                <template v-else-if="row.spec.cell === 'stage'">
                  <span
                    v-if="column.stage === undefined"
                    class="cx-muted"
                  >Calcul en cours…</span>
                  <span v-else-if="column.stage.kind === 'stage'">{{ column.stage.text }}</span>
                  <span
                    v-else
                    class="cx-muted"
                  >Non classé</span>
                </template>
                <CatalogCell
                  v-else-if="column.row && row.spec.column"
                  :catalog="catalog"
                  :column="row.spec.column"
                  :row="column.row"
                  layout="card"
                />
                <CxValue
                  v-else
                  :value="null"
                />
                <span
                  v-if="word(row.verdicts[c])"
                  class="cmp-best"
                ><CxIcon
                  name="check"
                  size="sm"
                />{{ word(row.verdicts[c]) }}</span>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Le tableau défile dans sa zone (deux axes) : un en-tête `sticky` ne colle à la fenêtre que si son conteneur ne défile pas, d'où la hauteur bornée. */
.cmp-scroller { position: relative; max-height: max(480px, calc(100dvh - 120px)); overflow: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.cmp-scroller:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.cmp-table { width: 100%; min-width: calc(168px + var(--cols) * 220px); border-collapse: separate; border-spacing: 0; table-layout: fixed; }
.cmp-table th, .cmp-table td { padding: var(--space-3); border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; background: var(--surface); }
.cmp-corner, .cmp-label { position: sticky; left: 0; width: 168px; }
.cmp-head { position: sticky; top: 0; z-index: 2; background: var(--surface-raised); border-bottom: 1px solid var(--line-strong); font-weight: 400; }
.cmp-corner { top: 0; z-index: 3; background: var(--surface-raised); border-bottom: 1px solid var(--line-strong); }
.cmp-label { z-index: 1; border-right: 1px solid var(--line); color: var(--ink-2); font-size: 13px; font-weight: 600; }
.cmp-label-text { display: block; color: var(--ink); }
.cmp-note { display: block; margin-top: 2px; font-size: 11px; font-weight: 400; line-height: 15px; }
.cmp-diff { display: inline-flex; align-items: center; gap: 4px; margin-top: var(--space-1); padding: 0 6px; border: 1px solid var(--line-strong); border-radius: var(--radius-xs); color: var(--ink-2); font: 600 11px/18px var(--font-sans); }
.cmp-head-body { display: grid; gap: var(--space-1); }
.cmp-head-line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.cmp-name { color: var(--ink); font: 600 17px/22px var(--font-display); }
a.cmp-name { text-decoration: none; }
a.cmp-name:hover { color: var(--gold-text); text-decoration: underline; }
.cmp-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; line-height: 16px; }
.cmp-ref { font-size: 12px; overflow-wrap: anywhere; }
.cmp-head-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); margin-top: var(--space-1); margin-left: calc(-1 * var(--space-2)); }
.cmp-group th { position: sticky; left: 0; padding: var(--space-2) var(--space-3); background: var(--surface-sunken); color: var(--ink-3); font: 600 12px/16px var(--font-sans); letter-spacing: .04em; text-transform: uppercase; }
.cmp-cell-body { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1); min-width: 0; font-size: 13px; line-height: 18px; color: var(--ink); }
.cmp-cell.is-best { background: var(--gold-wash); box-shadow: inset 0 0 0 1px var(--gold-line); }
.cmp-best { display: inline-flex; align-items: center; gap: 4px; color: var(--gold-text); font: 600 12px/16px var(--font-sans); }
.cmp-score { display: inline-flex; align-items: baseline; gap: 2px; }
@media (max-width: 767px) {
  .cmp-corner, .cmp-label { width: 116px; padding: var(--space-2); }
  .cmp-table { min-width: calc(116px + var(--cols) * 190px); }
  .cmp-head { min-width: 190px; }
  .cmp-table th, .cmp-table td { padding: var(--space-2); }
}
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { a.cmp-name { padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
