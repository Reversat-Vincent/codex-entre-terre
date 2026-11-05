<!-- Mention de source et de licence d'une fiche : page du wiki, CC BY-SA 4.0, date d'extraction des données. -->
<script setup lang="ts">
import { computed } from 'vue'
import { wikiUrlOf } from '../../../data/externalLinks.ts'
import { retrievedText } from './sheetModel.ts'

/**
 * Mention CC BY-SA 4.0 : les données viennent d'eldenring.wiki.gg, sous cette licence (cahier des charges § 6). Les liens s'ouvrent dans un nouvel onglet.
 * Les noms du jeu restent en anglais.
 */
const props = defineProps<{
  /** Nom de la page du wiki (`wiki_page`). */
  pageName: string
  /** Champ `url` de l'entrée. */
  url?: string | null
  /** Date d'extraction (`metadata.retrieved`). */
  retrieved?: string | null
}>()

const href = computed(() => wikiUrlOf({ url: props.url }) ?? 'https://eldenring.wiki.gg')
const date = computed(() => retrievedText(props.retrieved))
</script>

<template>
  <p class="sh-licence cx-muted">
    Source : page « {{ pageName }} » sur
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
    >eldenring.wiki.gg<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span></a>,
    sous licence
    <a
      href="https://creativecommons.org/licenses/by-sa/4.0/"
      target="_blank"
      rel="noopener noreferrer"
    >CC BY-SA 4.0<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span></a>.
    Les noms du jeu restent en anglais.
    <template v-if="date">
      Dernière synchronisation des données : {{ date }}.
    </template>
  </p>
</template>

<style scoped>
.sh-licence { max-width: 72ch; padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: 12px; line-height: 17px; }
</style>
