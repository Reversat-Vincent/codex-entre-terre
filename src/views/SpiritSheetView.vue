<!-- Écran « Fiche de cendre d'esprit » (`/esprits/:id`) : charge le fichier du genre, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SpiritSheet from '../components/domain/sheet/spirit/SpiritSheet.vue'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'

/**
 * Fiche (cendre d'esprit) : la logique commune (chargement, état d'affichage, titre de la page) est celle de `useSheetEntry`, le cadre celui de `SheetPage`.
 * Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('spirit', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
</script>

<template>
  <SheetPage
    kind="spirit"
    :view="sheet.view.value"
    :name="entry?.derived.displayName ?? null"
    :category="entry?.category ?? null"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <SpiritSheet
      v-if="entry"
      :key="entry.id"
      :spirit="entry"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
