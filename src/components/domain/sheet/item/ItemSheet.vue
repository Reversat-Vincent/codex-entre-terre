<!-- Contenu de la fiche d'un objet chargé (outil, matériau d'amélioration, objet clé, matériau d'artisanat, munition) : effet, attaque, tableaux, fabrication, obtention, notes. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { WikiTableData } from '../../../../data/types/common.ts'
import WikiTable from '../../WikiTable.vue'
import WikiText from '../../WikiText.vue'
import SheetAcquisition from '../SheetAcquisition.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetEffect from '../SheetEffect.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNameList from '../SheetNameList.vue'
import SheetNotes from '../SheetNotes.vue'
import SheetOtherSections from '../SheetOtherSections.vue'
import SheetSection from '../SheetSection.vue'
import ShopTable from '../shop/ShopTable.vue'
import { isShopTable } from '../shop/shopModel.ts'
import type { ItemEntry } from '../useSheetEntry.ts'
import ItemAttack from './ItemAttack.vue'
import { craftingExtra, hasItemEffect, isBellBearing, itemAlerts, itemFacts, itemIngredients, summaryParagraphs } from './itemModel.ts'
import type { ItemTypeInfo } from './itemModel.ts'

/**
 * Fiche d'un objet (`/objets/:id`, brief § 6, « Autres fiches »). Les cinq fichiers d'objets ont la même forme de base ; ce qui est propre à un type
 * apparaît seulement quand la page du wiki le donne : attaque d'une munition, tableaux d'un matériau (Golden Seed), articles débloqués par une Bell Bearing,
 * recette et usage en fabrication. Aucun calcul : valeurs du wiki, `null` → « Non documenté ».
 */
const props = defineProps<{
  entry: ItemEntry
  type: ItemTypeInfo
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `item:${props.entry.id}` as const)
const alerts = computed(() => itemAlerts(props.entry))
const facts = computed(() => itemFacts(props.entry))
const hasEffect = computed(() => hasItemEffect(props.entry))
const summary = computed(() => summaryParagraphs(props.entry.summary))
const bell = computed(() => isBellBearing(props.entry))

const details = computed(() => props.entry.effect_details)
const tables = computed((): readonly WikiTableData[] => ('effect_tables' in props.entry ? (props.entry.effect_tables ?? []) : []))
const shopTables = computed(() => tables.value.filter((t) => isShopTable(t)))
const otherTables = computed(() => tables.value.filter((t) => !isShopTable(t)))

const ingredients = computed(() => itemIngredients(props.entry))
const crafting = computed(() => ('crafting' in props.entry ? props.entry.crafting : undefined))
const craftingText = computed(() => craftingExtra(props.entry, ingredients.value))
const craftingTables = computed(() => crafting.value?.tables ?? [])
const usedIn = computed(() => ('used_in_crafting' in props.entry ? props.entry.used_in_crafting : undefined))
const usedInTables = computed(() => usedIn.value?.tables ?? [])

const notes = computed(() => ('notes' in props.entry ? props.entry.notes : undefined))
const patches = computed(() => ('patch_notes' in props.entry ? props.entry.patch_notes : undefined))
/** Seul le fichier des objets clés prévoit un historique de patchs. */
const withPatches = computed(() => props.type.type === 'key')
const sections = computed(() => props.entry.other_sections)
const description = computed(() => props.entry.description)
const hasCraftingBlock = computed(
  () => ingredients.value.length > 0 || craftingText.value.length > 0 || craftingTables.value.length > 0,
)
</script>

<template>
  <SheetHeader
    kind="item"
    :entity-ref="ref"
    :name="entry.name"
    :source="entry.source"
    :url="entry.url"
    :category="entry.category"
  >
    <template #meta>
      <span class="sh-meta">{{ type.label }}</span>
    </template>
  </SheetHeader>

  <SheetAlerts :alerts="alerts" />

  <SheetLayout>
    <template #aside>
      <SheetFacts
        title="Caractéristiques"
        :facts="facts"
      />
    </template>
    <template #main>
      <SheetEffect
        :title="type.effectTitle"
        :effect="entry.effect"
        :require-effect="!hasEffect"
        :details="details"
        details-label="Détails du wiki"
        :description="description"
        :entity-ref="ref"
        :link-kinds="['item', 'weapon', 'npc']"
      />

      <SheetSection
        v-if="summary.length > 0"
        title="Résumé du wiki"
      >
        <WikiText
          :lines="summary"
          :preferred-kinds="['item', 'weapon', 'npc']"
          :skip-ref="ref"
        />
      </SheetSection>

      <ItemAttack :entry="entry" />

      <SheetSection
        v-if="shopTables.length > 0"
        :title="bell ? 'Ce qu’elle débloque' : 'Articles proposés'"
        :subtitle="bell ? 'Articles ajoutés à l’inventaire du marchand quand la Bell Bearing lui est remise.' : undefined"
      >
        <ShopTable
          v-for="(t, i) in shopTables"
          :key="i"
          :rows="t"
          :caption="bell ? 'Articles débloqués' : 'Articles proposés'"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="otherTables.length > 0"
        title="Tableaux du wiki"
      >
        <WikiTable
          v-for="(t, i) in otherTables"
          :key="i"
          :rows="t"
          :caption="`${entry.name}, tableau ${i + 1}`"
          :preferred-kinds="['item', 'weapon']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="hasCraftingBlock"
        title="Fabrication"
        subtitle="Ingrédients et recette, selon le wiki."
      >
        <SheetNameList
          v-if="ingredients.length > 0"
          label="Ingrédients"
          :entries="ingredients"
          :link-kinds="['item']"
          :skip-ref="ref"
        />
        <WikiText
          v-if="craftingText.length > 0"
          :lines="craftingText"
          :preferred-kinds="['item']"
          :skip-ref="ref"
        />
        <WikiTable
          v-for="(t, i) in craftingTables"
          :key="i"
          :rows="t"
          :caption="`Fabrication, tableau ${i + 1}`"
          :preferred-kinds="['item']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetSection
        v-if="usedIn && (usedIn.text.length > 0 || usedInTables.length > 0)"
        title="Sert à fabriquer"
        subtitle="Objets dont la recette demande celui-ci."
      >
        <WikiText
          v-if="usedIn.text.length > 0"
          :lines="usedIn.text"
          mode="list"
          :preferred-kinds="['item', 'weapon']"
          :skip-ref="ref"
        />
        <WikiTable
          v-for="(t, i) in usedInTables"
          :key="i"
          :rows="t"
          :caption="`Sert à fabriquer, tableau ${i + 1}`"
          :preferred-kinds="['item', 'weapon']"
          :skip-ref="ref"
        />
      </SheetSection>

      <SheetAcquisition
        :entry="entry"
        :entity-ref="ref"
      />
      <SheetNotes
        :notes="notes"
        :patches="patches"
        :with-patches="withPatches"
        :entity-ref="ref"
        :link-kinds="['item', 'weapon', 'boss', 'npc', 'location']"
      />
      <SheetOtherSections
        :sections="sections"
        :notes="notes"
        :entity-ref="ref"
        :link-kinds="['item', 'weapon']"
      />
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="entry.wiki_page"
    :url="entry.url"
    :retrieved="retrieved"
  />
</template>
