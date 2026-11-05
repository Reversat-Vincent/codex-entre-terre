<!-- Résumé des critères actifs en haut du tableau de bord : lecture en un coup d'œil, retrait en un clic. -->
<script setup lang="ts">
import CxChip from './CxChip.vue'
import type { CriteriaChip } from './types.ts'

/**
 * Puces de critères (README du design system, composant CriteriaChips). Une puce par critère actif : nom discret puis valeur.
 * Un critère facultatif (`removable`) a une croix ; les critères obligatoires (contenu, niveau) n'en ont pas. Un clic sur la puce demande
 * l'ouverture de la section correspondante du panneau de critères. Le composant n'émet que des événements : il ne modifie aucun critère.
 * Sur mobile, la rangée défile horizontalement.
 */
defineProps<{
  /** Critères actifs, dans l'ordre d'affichage. */
  chips: readonly CriteriaChip[]
}>()

const emit = defineEmits<{
  /** L'utilisateur clique une puce : ouvrir la section du critère (identifiant du critère). */
  open: [id: string]
  /** L'utilisateur retire un critère facultatif (identifiant du critère). */
  remove: [id: string]
}>()
</script>

<template>
  <div
    class="cx-row cx-criteria-chips"
    role="group"
    aria-label="Critères actifs"
  >
    <CxChip
      v-for="chip in chips"
      :key="chip.id"
      :label="chip.label"
      :active="chip.active"
      interactive
      :open-label="`${chip.label} : ${chip.value}. Modifier ce critère`"
      :remove-label="chip.removable ? `Retirer : ${chip.label}` : undefined"
      @open="emit('open', chip.id)"
      @remove="emit('remove', chip.id)"
    >
      {{ chip.value }}
    </CxChip>
  </div>
</template>

<style>
@media (max-width: 767px) {
  .cx-criteria-chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: var(--space-1); }
  .cx-criteria-chips > .cx-chip { flex: none; }
}
</style>
