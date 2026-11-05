<!-- Contenu de la fiche d'une cendre d'esprit chargée : en-tête, alertes, coût, effet, matériau d'amélioration, obtention, notes et patchs. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SpiritAshEntry } from '../../../../data/types/spiritAshes.ts'
import SheetAcquisition from '../SheetAcquisition.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetEffect from '../SheetEffect.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNotes from '../SheetNotes.vue'
import SheetOtherSections from '../SheetOtherSections.vue'
import { spiritAlerts, spiritFacts } from './spiritModel.ts'

/**
 * Fiche d'une cendre d'esprit (`/esprits/:id`) : coût en FP ou en PV, effet, matériau d'amélioration, obtention. Aucun calcul : valeurs du wiki,
 * absence → « Non documenté ». Les notes et les sections annexes sont celles de la page du wiki, en anglais.
 */
const props = defineProps<{
  spirit: SpiritAshEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `spirit:${props.spirit.id}` as const)
const alerts = computed(() => spiritAlerts(props.spirit))
const facts = computed(() => spiritFacts(props.spirit))
const hasEffect = computed(() => Boolean(props.spirit.effect) || (props.spirit.effect_details?.length ?? 0) > 0 || Boolean(props.spirit.description))
</script>

<template>
  <SheetHeader
    kind="spirit"
    :entity-ref="ref"
    :name="spirit.name"
    :source="spirit.source"
    :url="spirit.url"
    :category="spirit.category"
  />

  <SheetAlerts :alerts="alerts" />

  <SheetLayout>
    <template #aside>
      <SheetFacts
        title="Invocation et amélioration"
        :facts="facts"
      />
    </template>
    <template #main>
      <SheetEffect
        v-if="hasEffect"
        :effect="spirit.effect"
        :details="spirit.effect_details"
        :description="spirit.description"
        :entity-ref="ref"
      />
      <SheetAcquisition
        :entry="spirit"
        :entity-ref="ref"
      />
      <SheetNotes
        :notes="spirit.notes"
        :patches="spirit.patch_notes"
        :entity-ref="ref"
        :link-kinds="['spirit', 'boss', 'npc', 'item']"
      />
      <SheetOtherSections
        :sections="spirit.other_sections"
        :notes="spirit.notes"
        :entity-ref="ref"
      />
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="spirit.wiki_page"
    :url="spirit.url"
    :retrieved="retrieved"
  />
</template>
