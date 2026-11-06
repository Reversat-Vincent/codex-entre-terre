<!-- Écran « Fiche d'armure » (`/armures/:id`) : charge le fichier du genre, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ArmorSheet from '../components/domain/sheet/armor/ArmorSheet.vue'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'
import { armorSlotLabel } from '../ui/armorSlots.ts'

/**
 * Fiche (armure) : la logique commune (chargement, état d'affichage, titre de la page) est celle de `useSheetEntry`, le cadre celui de `SheetPage`.
 * Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('armor', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
</script>

<template>
  <SheetPage
    kind="armor"
    :view="sheet.view.value"
    :name="entry?.derived.displayName ?? null"
    :category="entry ? armorSlotLabel(entry.category) : null"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <ArmorSheet
      v-if="entry"
      :key="entry.id"
      :armor="entry"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
