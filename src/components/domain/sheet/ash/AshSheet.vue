<!-- Contenu de la fiche d'une cendre de guerre chargée : en-tête, alertes, affinité et coût, effet, compatibilité, obtention et notes. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { AshOfWarEntry } from '../../../../data/types/ashesOfWar.ts'
import SheetAcquisition from '../SheetAcquisition.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetEffect from '../SheetEffect.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNotes from '../SheetNotes.vue'
import SheetOtherSections from '../SheetOtherSections.vue'
import AshCompat from './AshCompat.vue'
import { ashAlerts, ashFacts } from './ashModel.ts'

/**
 * Fiche d'une cendre de guerre (`/cendres-de-guerre/:id`) : affinité, coût en FP (notation du wiki expliquée), compétence, classes d'armes et affinités
 * compatibles, obtention. Aucun calcul : valeurs du wiki, `null` → « Non documenté ». La ligne `effect` des données vaut « Ash » (type d'objet), elle n'est pas affichée.
 */
const props = defineProps<{
  ash: AshOfWarEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `ash:${props.ash.id}` as const)
const alerts = computed(() => ashAlerts(props.ash))
const facts = computed(() => ashFacts(props.ash))
</script>

<template>
  <SheetHeader
    kind="ash"
    :entity-ref="ref"
    :name="ash.name"
    :source="ash.source"
    :url="ash.url"
    :category="ash.category"
  />

  <SheetAlerts :alerts="alerts" />

  <SheetLayout>
    <template #aside>
      <SheetFacts
        title="Affinité et coût"
        :facts="facts"
      />
    </template>
    <template #main>
      <SheetEffect
        title="Compétence et effet"
        :details="ash.effect_details"
        details-label="Détails du wiki"
        :description="ash.description"
        :entity-ref="ref"
        :link-kinds="['weapon']"
      />
      <AshCompat :ash="ash" />
      <SheetAcquisition
        :entry="ash"
        :entity-ref="ref"
      />
      <SheetNotes
        :notes="ash.notes"
        :with-patches="false"
        :entity-ref="ref"
        :link-kinds="['ash', 'weapon', 'boss']"
      />
      <SheetOtherSections
        :sections="ash.other_sections"
        :notes="ash.notes"
        :entity-ref="ref"
      />
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="ash.wiki_page"
    :url="ash.url"
    :retrieved="retrieved"
  />
</template>
