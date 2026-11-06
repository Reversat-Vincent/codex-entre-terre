<!-- Carte d'un catalogue de l'écran Explorer : icône, libellé, nombre d'entrées et lien vers le catalogue. -->
<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { formatInt } from '../../../ui/format.ts'
import CxIcon from '../../ds/CxIcon.vue'

/**
 * Lien-carte vers un catalogue. Le nombre d'entrées est lu dans le manifeste par la vue ; `null` (manifeste pas encore chargé) n'affiche rien.
 * Toute la carte est le lien (cible ≥ 44 px sous 768 px) ; le nombre est lu à la suite du libellé par les lecteurs d'écran.
 */
defineProps<{
  /** Libellé du catalogue. */
  label: string
  /** Icône du sprite, sans le préfixe `i-`. */
  icon: string
  /** Route du catalogue. */
  to: RouteLocationRaw
  /** Nombre d'entrées, ou `null` s'il n'est pas encore connu. */
  count: number | null
}>()
</script>

<template>
  <RouterLink
    class="x-card"
    :to="to"
  >
    <span class="x-card-ic"><CxIcon :name="icon" /></span>
    <span class="x-card-label">{{ label }}</span>
    <span
      v-if="count !== null"
      class="x-card-count cx-muted"
    >{{ formatInt(count) }}<span class="cx-sr"> entrées</span></span>
    <CxIcon
      class="x-card-go"
      name="chev-r"
    />
  </RouterLink>
</template>

<style scoped>
.x-card { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto auto; align-items: center; gap: var(--space-3); min-height: var(--size-cible); padding: var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); color: var(--ink); text-decoration: none; }
.x-card:hover { background: var(--surface-hover); border-color: var(--gold-line); }
.x-card-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink-2); }
.x-card-label { min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.x-card-count { font: 600 13px/18px var(--font-sans); font-variant-numeric: tabular-nums; }
.x-card-go { color: var(--ink-3); }
</style>
