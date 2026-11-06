<!-- Écran « Fiche de lieu » (`/lieux/:id`) : charge le fichier des lieux, résout l'entrée et affiche sa fiche avec son fil d'Ariane de région ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LocationSheet from '../components/domain/sheet/location/LocationSheet.vue'
import { buildLocationIndex, locationKindLabel, locationTrail } from '../components/domain/sheet/location/locationModel.ts'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'
import { useDataStore } from '../stores/data.ts'

/**
 * Fiche de lieu. Le fil d'Ariane remonte la hiérarchie de régions de `locations.json` (champ `region`) ; il faut donc tous les lieux, que le fichier
 * contient déjà. Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const data = useDataStore()
const sheet = useSheetEntry('location', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
const all = computed(() => data.dataset('locations')?.entries ?? [])
const trail = computed(() => (entry.value ? locationTrail(entry.value, buildLocationIndex(all.value)) : undefined))
</script>

<template>
  <SheetPage
    kind="location"
    :view="sheet.view.value"
    :name="entry?.derived.displayName ?? null"
    :category="locationKindLabel(entry?.kind ?? null)"
    :trail="trail"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <LocationSheet
      v-if="entry"
      :key="entry.id"
      :entry="entry"
      :all="all"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
