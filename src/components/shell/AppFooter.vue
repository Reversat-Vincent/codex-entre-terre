<!-- Pied de page : mention de fan non officiel, source et licence des données, date d'extraction lue dans le manifeste. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '../../stores/data.ts'

/**
 * Pied de page (cahier des charges § 6, architecture § 10.1). Les deux sources sont des liens externes (nouvel onglet, `noopener`) ;
 * la date d'extraction (`retrieved`, AAAA-MM-JJ) est réécrite en JJ/MM/AAAA et n'apparaît qu'une fois le manifeste lu.
 */
const data = useDataStore()

const retrieved = computed(() => {
  const raw = data.manifest?.retrieved
  const match = raw ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) : null
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null
})
</script>

<template>
  <footer class="cx-footer">
    <span>Outil de fan non officiel — données :
      <a
        href="https://eldenring.wiki.gg"
        target="_blank"
        rel="noopener noreferrer"
      >eldenring.wiki.gg<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span></a>
      (<a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer"
      >CC BY-SA 4.0<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span></a>)</span>
    <span v-if="retrieved">Données extraites du wiki le {{ retrieved }}</span>
  </footer>
</template>

<style>
.cx-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--line); color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx .cx-footer a { color: var(--ink-2); }
@media (max-width: 1279px) { .cx-footer { padding-inline: var(--space-4); } }
</style>
