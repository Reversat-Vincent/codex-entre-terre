<!-- Contenu de la fiche d'un talisman chargé : en-tête, alertes, effet et valeurs exactes, poids, obtention, notes et patchs. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { TalismanEntry } from '../../../../data/types/talismans.ts'
import CxIcon from '../../../ds/CxIcon.vue'
import CxValue from '../../../ds/CxValue.vue'
import SheetAcquisition from '../SheetAcquisition.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetEffect from '../SheetEffect.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNotes from '../SheetNotes.vue'
import { acquisitionAlert, acquisitionViews, missingFieldsAlert, presentAlerts } from '../sheetModel.ts'
import type { SheetFact } from '../sheetModel.ts'

/**
 * Fiche d'un talisman (`/talismans/:id`). L'effet est la ligne de l'infobox ; les valeurs exactes sont les `effect_details` du wiki (« Raises maximum HP by +10% »),
 * affichées telles quelles, sans conversion. Aucun calcul : `null` ou absence → « Non documenté ».
 */
const props = defineProps<{
  talisman: TalismanEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `talisman:${props.talisman.id}` as const)
const alerts = computed(() =>
  presentAlerts([
    missingFieldsAlert([{ label: 'Valeurs exactes de l’effet', missing: (props.talisman.effect_details?.length ?? 0) === 0 }]),
    acquisitionAlert(acquisitionViews(props.talisman)),
  ]),
)
const facts = computed((): SheetFact[] => [
  { id: 'weight', label: 'Poids', value: props.talisman.weight, format: 'weight' },
  { id: 'type', label: 'Type', value: props.talisman.type },
  { id: 'sell', label: 'Prix de revente', value: props.talisman.infobox.sell_price ?? null, unit: 'runes' },
])
</script>

<template>
  <SheetHeader
    kind="talisman"
    :entity-ref="ref"
    :name="talisman.name"
    :source="talisman.source"
    :url="talisman.url"
    :category="talisman.category"
  >
    <template #meta>
      <span class="sh-meta">
        <CxIcon
          name="weight"
          size="sm"
        />Poids <b class="cx-num"><CxValue
          :value="talisman.weight"
          format="weight"
        /></b>
      </span>
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
        :effect="talisman.effect"
        require-effect
        :details="talisman.effect_details"
        details-label="Valeurs exactes"
        require-details
        :description="talisman.description"
        :entity-ref="ref"
        :link-kinds="['talisman', 'item']"
      />
      <SheetAcquisition
        :entry="talisman"
        :entity-ref="ref"
      />
      <SheetNotes
        :notes="talisman.notes"
        :patches="talisman.patch_notes"
        :entity-ref="ref"
        :link-kinds="['talisman', 'boss', 'item']"
      />
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="talisman.wiki_page"
    :url="talisman.url"
    :retrieved="retrieved"
  />
</template>
