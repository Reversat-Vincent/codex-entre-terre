<!-- Tableau du wiki : lignes en objets ou en listes, en-têtes à un ou deux niveaux (`A / B`), en-tête collant, chiffres tabulaires. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityKind, EntityRef } from '../../data/datasets.ts'
import type { NameIndex } from '../../data/links.ts'
import { buildWikiTable } from '../../ui/wikiTable.ts'
import type { RawWikiRow } from '../../ui/wikiTable.ts'
import CxValue from '../ds/CxValue.vue'
import WikiInline from './WikiInline.vue'

/**
 * Rend un tableau du wiki (docs/architecture.md § 10.5). La forme du tableau vient de `buildWikiTable` (src/ui/wikiTable.ts) ; ce composant ne fait
 * que l'afficher : `null` → « Non documenté » par `CxValue` (case hachurée), nombres à la française, textes par interpolation avec liens vers
 * les entités citées (nom exact seulement).
 * Le conteneur défile (horizontalement sur petit écran, verticalement au-delà de 14 lignes) pour que l'en-tête reste collé ; il est focalisable
 * au clavier pour que ce défilement soit atteignable sans souris.
 */
const props = withDefaults(
  defineProps<{
    /** Lignes du tableau, telles que dans data/ (objets colonne → valeur, ou listes de cellules). */
    rows: readonly RawWikiRow[]
    /** Légende : nom du tableau pour les lecteurs d'écran, affichée au-dessus. */
    caption?: string
    /** Index des noms ; absent : celui du fichier `search-index` chargé ; `null` : aucun lien. */
    names?: NameIndex | null
    /** Genres préférés pour départager un nom partagé par plusieurs entités. */
    preferredKinds?: readonly EntityKind[]
    /** Entité décrite par la page : jamais liée à elle-même. */
    skipRef?: EntityRef | null
  }>(),
  { caption: undefined, names: undefined, preferredKinds: () => [], skipRef: null },
)

/** Au-delà de ce nombre de lignes, le conteneur défile verticalement. */
const SCROLL_ROWS = 14

const model = computed(() => buildWikiTable(props.rows))
const scrolls = computed(() => props.rows.length > SCROLL_ROWS)
</script>

<template>
  <div
    class="wiki-table-wrap"
    :class="{ 'is-scroll': scrolls }"
    role="region"
    tabindex="0"
    :aria-label="caption ?? 'Tableau du wiki'"
  >
    <table
      class="wiki-table"
      :class="{ 'is-two-level': model.head.length === 2 }"
    >
      <caption
        v-if="caption"
        class="wiki-caption"
      >
        {{ caption }}
      </caption>
      <thead v-if="model.head.length > 0">
        <tr
          v-for="(headRow, r) in model.head"
          :key="r"
          :class="r === 1 ? 'wiki-head-2' : undefined"
        >
          <th
            v-for="(cell, c) in headRow"
            :key="c"
            :scope="cell.group ? 'colgroup' : 'col'"
            :colspan="cell.colspan"
            :rowspan="cell.rowspan"
            :class="{ 'is-group': cell.group, 'is-num': !cell.group && model.numeric[cell.column] }"
          >
            {{ cell.text }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, r) in model.rows"
          :key="r"
        >
          <template
            v-for="(cell, c) in row"
            :key="c"
          >
            <th
              v-if="model.rowHeader && c === 0 && cell.kind === 'text'"
              scope="row"
            >
              <WikiInline
                :text="cell.text"
                :names="names"
                :preferred-kinds="preferredKinds"
                :skip-ref="skipRef"
              />
            </th>
            <td
              v-else
              :class="{ 'is-num cx-num': model.numeric[c], 'is-null': cell.kind === 'null' }"
            >
              <CxValue
                v-if="cell.kind === 'null'"
                :value="null"
                cell
              />
              <template v-else-if="cell.kind === 'number'">
                {{ cell.text }}
              </template>
              <WikiInline
                v-else-if="cell.kind === 'text'"
                :text="cell.text"
                :names="names"
                :preferred-kinds="preferredKinds"
                :skip-ref="skipRef"
              />
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
.wiki-table-wrap { position: relative; --wt-head-h: 32px; max-width: 100%; overflow-x: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.wiki-table-wrap.is-scroll { max-height: min(70vh, 36rem); overflow-y: auto; }
.wiki-table { width: 100%; border-collapse: separate; border-spacing: 0; font: 400 13px/18px var(--font-sans); font-variant-numeric: tabular-nums; }
.wiki-table .wiki-caption { padding: var(--space-2) var(--space-3); text-align: left; color: var(--ink-3); font: 600 12px/16px var(--font-sans); letter-spacing: .01em; }
.wiki-table th, .wiki-table td { padding: 6px var(--space-3); text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
.wiki-table tbody tr:last-child > * { border-bottom: 0; }
.wiki-table thead th { position: sticky; top: 0; z-index: 1; height: var(--wt-head-h); padding-block: 0; background: var(--surface-raised); color: var(--ink-2); font: 600 12px/16px var(--font-sans); letter-spacing: .01em; white-space: nowrap; vertical-align: middle; border-bottom: 1px solid var(--line-strong); }
.wiki-table thead th.is-group { text-align: center; border-inline: 1px solid var(--line); }
.wiki-table .wiki-head-2 th { top: var(--wt-head-h); }
.wiki-table tbody th { color: var(--ink); font-weight: 600; }
.wiki-table tbody tr:hover > * { background: var(--surface-hover); }
.wiki-table td.is-num, .wiki-table thead th.is-num { text-align: right; }
.wiki-table td.is-null { padding: 4px var(--space-2); }
.wiki-table td { white-space: pre-line; }
/* `break-word` (et non `anywhere`) : la largeur minimale d'une colonne reste celle de son plus long mot ; sur mobile le conteneur défile au lieu d'écraser les colonnes. */
.wiki-table td, .wiki-table tbody th { min-width: 7rem; overflow-wrap: break-word; }
.wiki-table td.is-num { min-width: 4rem; }
</style>
