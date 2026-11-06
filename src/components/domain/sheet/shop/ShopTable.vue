<!-- Inventaire de boutique : objet (en lien), prix, stock et condition, avec « Non documenté » pour une valeur que le wiki ne donne pas. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityKind, EntityRef } from '../../../../data/datasets.ts'
import type { RawWikiRow } from '../../../../ui/wikiTable.ts'
import CxValue from '../../../ds/CxValue.vue'
import WikiInline from '../../WikiInline.vue'
// Import pour effet de bord : les classes `.wiki-table*` (tableau, en-tête collant, défilement) sont définies, non limitées, dans le style de WikiTable.
import '../../WikiTable.vue'
import { shopTable } from './shopModel.ts'

/**
 * Tableau d'inventaire d'un marchand ou d'une Bell Bearing. Les colonnes du wiki, qui varient d'un tableau à l'autre, sont rangées sous quatre rôles
 * par `shopTable` ; ce composant n'affiche que le résultat. L'objet est un lien vers sa fiche quand c'est exactement le nom d'une entité ;
 * prix et stock viennent du wiki, tels quels (« ∞ », « 20 / ∞ ») ; une valeur absente s'affiche « Non documenté », jamais 0.
 * La colonne « Condition » n'apparaît que si une ligne en a une ; une ligne sans condition dit « Aucune ». Le conteneur défile horizontalement
 * sur petit écran et est focalisable au clavier pour que ce défilement soit atteignable sans souris.
 */
const props = withDefaults(
  defineProps<{
    /** Lignes du tableau, telles que dans data/. */
    rows: readonly RawWikiRow[]
    /** Légende : nom du tableau pour les lecteurs d'écran, affichée au-dessus. */
    caption: string
    /** Entité décrite par la page : jamais liée à elle-même. */
    skipRef?: EntityRef | null
  }>(),
  { skipRef: null },
)

/** Genres préférés pour relier un objet vendu : objets d'abord, puis les équipements et sorts que les marchands vendent aussi. */
const SOLD_KINDS: readonly EntityKind[] = ['item', 'weapon', 'armor', 'talisman', 'spell', 'ash', 'spirit']

const model = computed(() => shopTable(props.rows))
// Compteur de lignes : sans tableau, aucune ligne, donc pas de défilement.
const scrolls = computed(() => (model.value?.rows.length ?? 0) > 14)
</script>

<template>
  <div
    v-if="model"
    class="wiki-table-wrap"
    :class="{ 'is-scroll': scrolls }"
    role="region"
    tabindex="0"
    :aria-label="caption"
  >
    <table class="wiki-table sh-shop">
      <caption class="wiki-caption">
        {{ caption }}
      </caption>
      <thead>
        <tr>
          <th scope="col">
            Objet
          </th>
          <th
            scope="col"
            class="is-num"
          >
            Prix ({{ model.currency }})
          </th>
          <th
            scope="col"
            class="is-num"
          >
            Stock
          </th>
          <th
            v-if="model.hasCondition"
            scope="col"
          >
            Condition
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in model.rows"
          :key="i"
        >
          <th scope="row">
            <WikiInline
              :text="row.item"
              :preferred-kinds="SOLD_KINDS"
              :skip-ref="skipRef"
            />
          </th>
          <td
            class="is-num cx-num"
            :class="{ 'is-null': row.price === null }"
          >
            <CxValue
              :value="row.price"
              cell
            />
          </td>
          <td
            class="is-num cx-num"
            :class="{ 'is-null': row.stock === null }"
          >
            <CxValue
              :value="row.stock"
              cell
            />
          </td>
          <td v-if="model.hasCondition">
            <template v-if="row.condition !== null">
              <span
                v-if="row.remembrance"
                class="sh-shop-lead"
              >Remembrance à rapporter : </span>
              <WikiInline
                :text="row.condition"
                :preferred-kinds="row.remembrance ? ['item'] : []"
                :skip-ref="skipRef"
              />
            </template>
            <span
              v-else
              class="cx-muted"
            >Aucune</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sh-shop-lead { color: var(--ink-3); }
</style>
