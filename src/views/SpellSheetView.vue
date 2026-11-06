<!-- Écran « Fiche de sort » (`/sorts/:id`) : charge le fichier du genre, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SpellSheet from '../components/domain/sheet/spell/SpellSheet.vue'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'

/**
 * Fiche (sort) : la logique commune (chargement, état d'affichage, titre de la page) est celle de `useSheetEntry`, le cadre celui de `SheetPage`.
 * Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('spell', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
</script>

<template>
  <SheetPage
    kind="spell"
    :view="sheet.view.value"
    :name="entry?.derived.displayName ?? null"
    :category="entry?.category ?? null"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <SpellSheet
      v-if="entry"
      :key="entry.id"
      :spell="entry"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
