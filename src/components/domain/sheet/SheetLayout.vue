<!-- Mise en page d'une fiche : colonne principale et colonne latérale (valeurs clés), côte à côte dès 1100 px, empilées en dessous. -->
<script setup lang="ts">
/**
 * Grille commune des fiches : sur desktop et tablette large, la colonne latérale (340 px, collante sous la barre du haut) porte les valeurs clés ;
 * en dessous de 1100 px, tout s'empile, la colonne latérale d'abord pour que les chiffres restent en haut sur mobile.
 */
defineSlots<{
  /** Contenu principal : effet, description, obtention, notes. */
  main?(): unknown
  /** Colonne latérale : valeurs clés, source. */
  aside?(): unknown
}>()
</script>

<template>
  <div class="sh-cols">
    <aside
      v-if="$slots.aside"
      class="sh-side"
      aria-label="Valeurs clés"
    >
      <slot name="aside" />
    </aside>
    <div class="sh-main">
      <slot name="main" />
    </div>
  </div>
</template>

<style scoped>
.sh-cols { display: grid; gap: var(--space-5); align-items: start; min-width: 0; }
.sh-main, .sh-side { display: grid; gap: var(--space-4); min-width: 0; }
@media (min-width: 1100px) {
  .sh-cols { grid-template-columns: minmax(0, 1fr) 340px; }
  .sh-side { order: 2; position: sticky; top: calc(var(--size-topbar) + var(--space-4)); }
  .sh-main { order: 1; }
}
</style>
