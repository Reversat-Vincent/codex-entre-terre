<!-- Écran « Fiche de PNJ » (`/pnj/:id`) : charge le fichier des PNJ, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NpcSheet from '../components/domain/sheet/npc/NpcSheet.vue'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'

/**
 * Fiche de PNJ : la logique commune (chargement, état d'affichage, titre de la page) est celle de `useSheetEntry`, le cadre celui de `SheetPage`.
 * Les liens vers les objets, boss et lieux passent par l'index de recherche, demandé par `useSheetEntry`. Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('npc', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
const role = computed(() => (typeof entry.value?.infobox.role === 'string' ? entry.value.infobox.role : null))
</script>

<template>
  <SheetPage
    kind="npc"
    :view="sheet.view.value"
    :name="entry?.derived.displayName ?? null"
    :category="role"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <NpcSheet
      v-if="entry"
      :key="entry.id"
      :npc="entry"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
