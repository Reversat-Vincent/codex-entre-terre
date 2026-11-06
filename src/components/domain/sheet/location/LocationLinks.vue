<!-- Liste de lieux rattachés à un lieu (sous-régions, donjons, points de repère) : un lien vers la fiche quand le lieu est dans les données, avec son type. -->
<script setup lang="ts">
import type { LocationLink } from './locationModel.ts'

/**
 * Lieux cités par une fiche de lieu. Le lien vient de l'index des lieux (nom exact, ou nom avant la parenthèse du wiki), pas de la recherche globale :
 * un nom qui n'est pas une page de lieu (point de repère sans page) reste du texte. Le type du lieu est écrit à côté du lien : jamais la couleur seule.
 */
defineProps<{
  links: readonly LocationLink[]
  /** Nom accessible de la liste. */
  label?: string
}>()
</script>

<template>
  <ul
    class="sh-loclinks"
    :aria-label="label"
  >
    <li
      v-for="(l, i) in links"
      :key="i"
    >
      <RouterLink
        v-if="l.to"
        class="wiki-ref"
        :to="l.to"
      >
        {{ l.name }}
      </RouterLink>
      <span v-else>{{ l.name }}</span>
      <span
        v-if="l.kind"
        class="sh-loclinks-kind"
      > · {{ l.kind }}</span>
      <span
        v-if="l.note"
        class="sh-loclinks-note"
      >{{ l.note }}</span>
    </li>
  </ul>
</template>

<style scoped>
.sh-loclinks { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: var(--space-1) var(--space-4); font-size: 13px; line-height: 19px; color: var(--ink); }
.sh-loclinks li { min-width: 0; overflow-wrap: anywhere; }
.sh-loclinks-note { display: block; color: var(--ink-3); font-size: 12px; line-height: 17px; }
.sh-loclinks-kind { color: var(--ink-3); font-size: 12px; }
/* Mobile : chaque ligne fait 44 px (`--size-cible`) et son lien en remplit la hauteur. */
@media (max-width: 767px) {
  .sh-loclinks { row-gap: 0; }
  .sh-loclinks li { padding-block: calc((var(--size-cible) - 1lh) / 2); }
  .sh-loclinks a { padding-block: calc((var(--size-cible) - 1lh) / 2); }
}
</style>
