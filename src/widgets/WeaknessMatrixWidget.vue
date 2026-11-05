<!-- PROVISOIRE : corps du widget « matrice des faiblesses » (`weakness-matrix`) ; ce fichier sera remplacé, seul, par la tâche qui construit le widget. -->
<script setup lang="ts">
import type { WidgetBodyProps } from './types.ts'

/**
 * Corps provisoire du widget `weakness-matrix`. Contrat d'un corps (voir `src/widgets/types.ts`) : une seule propriété `mode`
 * (`dashboard` ou `fullscreen`), aucun événement ; les données viennent des stores, et le corps n'est monté que lorsque ses fichiers requis sont lus.
 */
defineProps<WidgetBodyProps>()
</script>

<template>
  <p
    class="cx-muted"
    :data-mode="mode"
  >
    Le contenu de ce widget est en cours de construction.
  </p>
</template>
