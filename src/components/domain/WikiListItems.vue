<!-- Liste à puces imbriquées d'un texte du wiki (récursive : chaque puce peut porter ses sous-puces). Brique interne de `WikiText`. -->
<script setup lang="ts">
import type { EntityKind, EntityRef } from '../../data/datasets.ts'
import type { NameIndex } from '../../data/links.ts'
import type { WikiListItem } from '../../data/wikiText.ts'
import WikiInline from './WikiInline.vue'

/** Rend les éléments d'une liste, et récursivement leurs enfants, par interpolation. Les propriétés de lien sont transmises à `WikiInline`. */
defineProps<{
  /** Éléments de la liste, avec leurs sous-éléments. */
  items: readonly WikiListItem[]
  /** Index des noms (voir `WikiInline`). */
  names?: NameIndex | null
  /** Genres préférés pour départager un nom partagé. */
  preferredKinds?: readonly EntityKind[]
  /** Entité décrite par la page, jamais liée à elle-même. */
  skipRef?: EntityRef | null
}>()
</script>

<template>
  <ul class="wiki-list">
    <li
      v-for="(item, i) in items"
      :key="i"
    >
      <WikiInline
        :text="item.text"
        :names="names"
        :preferred-kinds="preferredKinds"
        :skip-ref="skipRef"
      />
      <WikiListItems
        v-if="item.children.length > 0"
        :items="item.children"
        :names="names"
        :preferred-kinds="preferredKinds"
        :skip-ref="skipRef"
      />
    </li>
  </ul>
</template>
