<!-- Écran « Fiche d'origine » (`/origines/:id`) : charge le fichier des origines, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OriginSheet from '../components/domain/sheet/origin/OriginSheet.vue'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'

/**
 * Fiche d'origine : la logique commune (chargement, état d'affichage, titre de la page) est celle de `useSheetEntry`, le cadre celui de `SheetPage`.
 * Les liens vers les armes et armures de départ passent par l'index de recherche. Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('origin', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
</script>

<template>
  <SheetPage
    kind="origin"
    :view="sheet.view.value"
    :name="entry?.name ?? null"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <OriginSheet
      v-if="entry"
      :key="entry.id"
      :origin="entry"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
