<!-- Barre d'onglets du bas, sous 768 px : Accueil, Explorer, Ma liste, Mécaniques, Profil. -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import CxIcon from '../ds/CxIcon.vue'
import { TAB_ENTRIES } from './navModel.ts'

/**
 * Navigation mobile (architecture § 10.1, note `spec-mobile`). L'onglet actif vient de `meta.tab` de la route : « Explorer » reste allumé
 * sur un catalogue, une fiche, le comparateur et la recherche. Cibles de 56 px de haut (44 px au minimum).
 */
const route = useRoute()
</script>

<template>
  <nav
    class="cx-tabbar"
    aria-label="Navigation principale"
  >
    <RouterLink
      v-for="tab in TAB_ENTRIES"
      :key="tab.id"
      class="cx-tabbar-item"
      :class="{ 'is-active': route.meta.tab === tab.id }"
      :to="tab.to"
      :aria-current="route.meta.tab === tab.id ? 'page' : undefined"
    >
      <CxIcon
        :name="tab.icon"
        size="lg"
      />{{ tab.label }}
    </RouterLink>
  </nav>
</template>

<style>
.cx-tabbar { position: sticky; bottom: 0; z-index: var(--z-sticky); display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-top: 1px solid var(--line-strong); background: var(--surface); }
.cx a.cx-tabbar-item, .cx-tabbar-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 56px; color: var(--ink-3); font-size: 11px; line-height: 14px; font-weight: 600; text-decoration: none; }
.cx a.cx-tabbar-item.is-active, .cx-tabbar-item.is-active { color: var(--gold-text); }
</style>
