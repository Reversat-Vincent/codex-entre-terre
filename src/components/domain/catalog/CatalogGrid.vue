<!-- Mode grille d'un catalogue : une carte légère par entité, pages de 50, pied de page « 1–50 sur 704 » avec Précédent et Suivant. -->
<script setup lang="ts">
import type { Page } from '../../../catalog/paginate.ts'
import type { CatalogKey, CatalogRow } from '../../../catalog/registry.ts'
import { entityRef } from '../../../data/datasets.ts'
import { useCompareStore } from '../../../stores/compare.ts'
import { usePinsStore } from '../../../stores/pins.ts'
import { useToastsStore } from '../../../stores/toasts.ts'
import { formatInt } from '../../../ui/format.ts'
import CxButton from '../../ds/CxButton.vue'
import CatalogCard from './CatalogCard.vue'
import { CATALOG_INFO } from './catalogModel.ts'

/**
 * Grille de cartes d'un catalogue. La page (50 cartes) vient du store des catalogues ; ce composant ne filtre ni ne trie.
 * Épingler passe par le store `pins` (qui annonce l'ajout avec « Annuler »), comparer par le store `compare` (un refus motivé devient une notification).
 * Pas de « Tout afficher » en grille : seul le tableau est virtualisé, une grille de 700 cartes ne le serait pas.
 */
const props = defineProps<{
  catalog: CatalogKey
  /** Page courante, avec ses repères (`store.page`). */
  page: Page<CatalogRow>
}>()

const emit = defineEmits<{
  /** Demande une autre page (à partir de 1). */
  'update:page': [page: number]
}>()

const pins = usePinsStore()
const compare = useCompareStore()
const toasts = useToastsStore()

function refOf(row: CatalogRow): ReturnType<typeof entityRef> {
  return entityRef(CATALOG_INFO[props.catalog].kind, row.id)
}

function togglePin(row: CatalogRow): void {
  pins.toggle(refOf(row))
}

function toggleCompare(row: CatalogRow): void {
  const result = compare.toggle(refOf(row))
  if (!result.ok) toasts.push({ message: result.message, kind: 'warning' })
}
</script>

<template>
  <div class="cat-grid-wrap">
    <div class="cat-grid">
      <CatalogCard
        v-for="row in page.items"
        :key="row.id"
        :catalog="catalog"
        :row="row"
        :pinned="pins.isPinned(refOf(row))"
        :compared="compare.has(refOf(row))"
        @pin="togglePin(row)"
        @compare="toggleCompare(row)"
      />
    </div>
    <div class="cat-grid-foot">
      <span
        class="cx-num"
        aria-live="polite"
      >
        <template v-if="page.pageCount > 1">{{ formatInt(page.from) }}–{{ formatInt(page.to) }} sur </template>{{ formatInt(page.total) }}
        {{ page.total === 1 ? CATALOG_INFO[catalog].singular : CATALOG_INFO[catalog].plural }}
      </span>
      <span
        v-if="page.pageCount > 1"
        class="cx-row tight"
      >
        <CxButton
          size="sm"
          variant="ghost"
          icon="chev-l"
          :disabled="page.page <= 1"
          @click="emit('update:page', page.page - 1)"
        >Précédent</CxButton>
        <span class="cx-num cx-muted">Page {{ page.page }} sur {{ page.pageCount }}</span>
        <CxButton
          size="sm"
          variant="ghost"
          icon="chev-r"
          :disabled="page.page >= page.pageCount"
          @click="emit('update:page', page.page + 1)"
        >Suivant</CxButton>
      </span>
    </div>
  </div>
</template>

<style>
.cat-grid-wrap { display: grid; gap: var(--space-3); min-width: 0; }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: var(--space-3); }
.cat-grid-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
