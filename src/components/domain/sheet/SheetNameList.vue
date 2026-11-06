<!-- Liste de noms du wiki en colonnes (ingrédients, butin, sites de grâce, équipement de départ) : un lien vers la fiche quand le nom en a une, avec la quantité. -->
<script setup lang="ts">
import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import WikiInline from '../WikiInline.vue'
import type { NameEntry } from './sheetModel.ts'

/**
 * Liste de noms d'entités rendue par interpolation. Un nom devient un lien vers sa fiche seulement si c'est exactement le nom d'une entité
 * (`WikiInline`, `resolveName`) ; `plain` désactive les liens pour des noms qui ne sont pas des entités du jeu de données (sites de grâce, ennemis),
 * pour qu'un homonyme ne produise jamais un faux lien. Les colonnes s'adaptent à la largeur disponible.
 */
withDefaults(
  defineProps<{
    entries: readonly NameEntry[]
    /** Genres préférés pour relier un nom partagé par plusieurs entités. */
    linkKinds?: readonly EntityKind[]
    /** Aucun lien : les noms restent du texte. */
    plain?: boolean
    /** Entité décrite par la page : jamais liée à elle-même. */
    skipRef?: EntityRef | null
    /** Nom accessible de la liste. */
    label?: string
  }>(),
  { linkKinds: () => [], plain: false, skipRef: null, label: undefined },
)
</script>

<template>
  <ul
    class="sh-names"
    :aria-label="label"
  >
    <li
      v-for="(entry, i) in entries"
      :key="i"
    >
      <span v-if="plain">{{ entry.name }}</span>
      <WikiInline
        v-else
        :text="entry.name"
        :preferred-kinds="linkKinds"
        :skip-ref="skipRef"
      />
      <span
        v-if="entry.count !== null"
        class="sh-names-count"
      > × {{ entry.count }}</span>
    </li>
  </ul>
</template>

<style scoped>
.sh-names { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: var(--space-1) var(--space-4); font-size: 13px; line-height: 19px; color: var(--ink); }
.sh-names li { min-width: 0; overflow-wrap: anywhere; }
.sh-names-count { color: var(--ink-3); font-variant-numeric: tabular-nums; }
</style>
