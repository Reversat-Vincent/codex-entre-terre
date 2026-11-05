<!-- Écran « Fiche de cendre de guerre » (`/cendres-de-guerre/:id`) : charge le fichier du genre, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AshSheet from '../components/domain/sheet/ash/AshSheet.vue'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'

/**
 * Fiche (cendre de guerre) : la logique commune (chargement, état d'affichage, titre de la page) est celle de `useSheetEntry`, le cadre celui de `SheetPage`.
 * Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('ash', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
</script>

<template>
  <SheetPage
    kind="ash"
    :view="sheet.view.value"
    :name="entry?.name ?? null"
    :category="entry?.category ?? null"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <AshSheet
      v-if="entry"
      :key="entry.id"
      :ash="entry"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
