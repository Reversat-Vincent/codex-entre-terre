<!-- Écran « Fiche d'objet » (`/objets/:id`) : charge les cinq fichiers d'objets, résout l'entrée et affiche sa fiche ; états de chargement, d'erreur et « Élément introuvable ». -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ItemSheet from '../components/domain/sheet/item/ItemSheet.vue'
import { itemTrail, itemTypeOf } from '../components/domain/sheet/item/itemModel.ts'
import SheetPage from '../components/domain/sheet/SheetPage.vue'
import { useSheetEntry } from '../components/domain/sheet/useSheetEntry.ts'

/**
 * Fiche d'objet. Un identifiant d'objet ne dit pas dans lequel des cinq fichiers il se trouve : `useSheetEntry` les attend tous (l'objet déjà lu s'affiche sans
 * attendre les autres) et indique le fichier d'origine, qui donne le type d'objet. Aucun calcul ni accès au stockage ici.
 */
const route = useRoute()
const sheet = useSheetEntry('item', () => String(route.params.id ?? ''))
const entry = computed(() => sheet.entry.value)
const type = computed(() => itemTypeOf(sheet.datasetKey.value))
const trail = computed(() => (entry.value && type.value ? itemTrail(type.value, entry.value.category) : undefined))
</script>

<template>
  <SheetPage
    kind="item"
    :view="sheet.view.value"
    :name="entry?.derived.displayName ?? null"
    :category="entry?.category ?? null"
    :trail="trail"
    :failed="sheet.failed.value"
    @retry="sheet.retry()"
  >
    <ItemSheet
      v-if="entry && type"
      :key="entry.id"
      :entry="entry"
      :type="type"
      :retrieved="sheet.retrieved.value"
    />
  </SheetPage>
</template>
