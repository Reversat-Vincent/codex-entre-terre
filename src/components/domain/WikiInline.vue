<!-- Texte en ligne du wiki : le texte tel quel, avec un lien vers la fiche pour chaque morceau qui est exactement un nom d'entité. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityKind, EntityRef } from '../../data/datasets.ts'
import { resolveName } from '../../data/links.ts'
import type { NameIndex } from '../../data/links.ts'
import { useNameIndex } from '../../composables/useNameIndex.ts'
import { entityRoute } from '../../router/entityRoute.ts'
import { segmentWikiText } from '../../ui/wikiSegments.ts'

/**
 * Rend un texte par interpolation (jamais en HTML). Les liens sont posés par `segmentWikiText` : nom exact résolu par `resolveName`, sinon texte simple.
 * Brique commune de `WikiText` et `WikiTable`.
 */
const props = withDefaults(
  defineProps<{
    /** Texte brut, tel que dans data/. */
    text: string
    /** Index des noms ; absent : celui du fichier `search-index` chargé (aucun lien tant qu'il ne l'est pas) ; `null` : aucun lien. */
    names?: NameIndex | null
    /** Genres préférés pour départager un nom partagé par plusieurs entités. */
    preferredKinds?: readonly EntityKind[]
    /** Entité décrite par la page : jamais liée à elle-même. */
    skipRef?: EntityRef | null
  }>(),
  { names: undefined, preferredKinds: () => [], skipRef: null },
)

const shared = useNameIndex()
const index = computed(() => (props.names === undefined ? shared.value : props.names))
const segments = computed(() => {
  const current = index.value
  const kinds = props.preferredKinds
  const skip = props.skipRef
  const resolve = current === null ? null : (name: string): EntityRef | null => {
    const ref = resolveName(current, name, kinds)
    return ref === skip ? null : ref
  }
  return segmentWikiText(props.text, resolve)
})
</script>

<template>
  <template
    v-for="(segment, i) in segments"
    :key="i"
  >
    <RouterLink
      v-if="segment.ref"
      class="wiki-ref"
      :to="entityRoute(segment.ref)"
    >{{ segment.text }}</RouterLink>
    <span v-else>{{ segment.text }}</span>
  </template>
</template>
