<!-- En-tête commun d'une fiche : nom, badge de source, genre et catégorie, puis Épingler, Comparer, « Voir sur le wiki » et « Voir sur Fextralife ». -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityRef } from '../../../data/datasets.ts'
import { fextralifeSearchUrl, wikiUrlOf } from '../../../data/externalLinks.ts'
import { useCompareStore } from '../../../stores/compare.ts'
import { usePinsStore } from '../../../stores/pins.ts'
import { useToastsStore } from '../../../stores/toasts.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CxButton from '../../ds/CxButton.vue'
import CxEntityName from '../../ds/CxEntityName.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxWikiLink from '../../ds/CxWikiLink.vue'
import { SHEET_KINDS } from './sheetKinds.ts'
import type { SheetKind } from './sheetKinds.ts'

/**
 * Tête de fiche : `CxEntityName` en `titre-xl` avec le badge de source, une ligne de métadonnées (genre, catégorie du wiki, éléments du slot `meta`)
 * et les actions. L'épinglage passe par le store `pins`, le comparateur par le store `compare` : un refus (liste pleine, genre différent) est dit
 * dans une notification, avec le message du store. « Voir sur Fextralife » est un simple lien de recherche (architecture § 10.4, aucune requête).
 */
const props = defineProps<{
  kind: SheetKind
  /** Référence stable de l'entité (`armor:aristocrat-hat`). */
  entityRef: EntityRef
  /** Nom, en anglais, tel que dans les données. */
  name: string
  /** Champ `source` de l'entrée. */
  source: SourceName
  /** Champ `url` de l'entrée ; une adresse qui ne vise pas le wiki est ignorée. */
  url?: string | null
  /** Catégorie du wiki, affichée telle quelle. */
  category?: string | null
}>()

defineSlots<{
  /** Métadonnées propres au genre (poids, emplacement, coût…), après le genre et la catégorie. */
  meta?(): unknown
}>()

const pins = usePinsStore()
const compare = useCompareStore()
const toasts = useToastsStore()

const info = computed(() => SHEET_KINDS[props.kind])
/** La catégorie qui répète le nom du catalogue (« Talismans » pour un talisman) n'apprend rien : elle est omise. */
const showCategory = computed(() => Boolean(props.category) && props.category !== info.value.listLabel)
const wikiUrl = computed(() => wikiUrlOf({ url: props.url }))
const pinned = computed(() => pins.isPinned(props.entityRef))
const compared = computed(() => compare.has(props.entityRef))

/** Bascule le comparateur ; un refus est dit dans une notification. */
function toggleCompare(): void {
  const result = compare.toggle(props.entityRef)
  if (!result.ok) toasts.push({ message: result.message, kind: 'warning' })
}
</script>

<template>
  <header class="sh-head">
    <CxEntityName
      :name="name"
      :source="source"
      size="xl"
      as="h1"
    >
      <template #meta>
        <span class="sh-meta">
          <CxIcon
            :name="info.icon"
            size="sm"
          />{{ info.singular }}
        </span>
        <span
          v-if="showCategory"
          class="sh-meta"
        >{{ category }}</span>
        <slot name="meta" />
      </template>
    </CxEntityName>
    <div class="sh-actions">
      <CxButton
        icon="pin"
        :pressed="pinned"
        @click="pins.toggle(entityRef)"
      >
        {{ pinned ? 'Dans Ma liste' : 'Épingler dans Ma liste' }}
      </CxButton>
      <CxButton
        icon="compare"
        :pressed="compared"
        @click="toggleCompare"
      >
        {{ compared ? 'Dans le comparateur' : 'Comparer' }}
      </CxButton>
      <CxWikiLink :href="wikiUrl" />
      <CxButton
        variant="ghost"
        icon="ext"
        :href="fextralifeSearchUrl(name)"
        external
      >
        Voir sur Fextralife<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span>
      </CxButton>
    </div>
  </header>
</template>

<style>
/* Non limité : les genres posent `.sh-meta` dans le slot `meta`, qui appartient à leur propre portée. */
.sh-meta { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; }
.sh-meta b { color: var(--ink); font-weight: 600; }
</style>

<style scoped>
.sh-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--line); }
.sh-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
@media (max-width: 767px) {
  .sh-head :deep(.titre-xl) { font-size: 32px; line-height: 36px; }
}
</style>
