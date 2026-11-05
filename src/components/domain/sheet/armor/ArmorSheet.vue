<!-- Contenu de la fiche d'une armure chargée : en-tête, alertes, absorption, résistances, effet, obtention, notes et patchs. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ArmorEntry } from '../../../../data/types/armor.ts'
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
import ArmorNegation from './ArmorNegation.vue'
import ArmorResistances from './ArmorResistances.vue'
import { armorAlerts, armorFacts } from './armorModel.ts'

/**
 * Fiche d'une armure (`/armures/:id`, brief § 6, « Autres fiches »). Colonne latérale : emplacement, poids, équilibre. Colonne principale : absorption
 * par type de dégâts (8), résistances (4), effet et description, obtention, notes et patchs. Aucun calcul : valeurs du wiki, `null` → « Non documenté ».
 */
const props = defineProps<{
  armor: ArmorEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `armor:${props.armor.id}` as const)
const alerts = computed(() => armorAlerts(props.armor))
const facts = computed(() => armorFacts(props.armor))
const hasEffect = computed(() => (props.armor.effect_details?.length ?? 0) > 0 || Boolean(props.armor.description))
</script>

<template>
  <SheetHeader
    kind="armor"
    :entity-ref="ref"
    :name="armor.name"
    :source="armor.source"
    :url="armor.url"
    :category="armor.category"
  >
    <template #meta>
      <span class="sh-meta">
        <CxIcon
          name="weight"
          size="sm"
        />Poids <b class="cx-num"><CxValue
          :value="armor.weight"
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
      <div class="sh-pair">
        <ArmorNegation :armor="armor" />
        <ArmorResistances :armor="armor" />
      </div>
      <SheetEffect
        v-if="hasEffect"
        title="Effet et description"
        :details="armor.effect_details"
        details-label="Effet, selon le wiki"
        :description="armor.description"
        :entity-ref="ref"
      />
      <SheetAcquisition
        :entry="armor"
        :entity-ref="ref"
      />
      <SheetNotes
        :notes="armor.notes"
        :patches="armor.patch_notes"
        :entity-ref="ref"
        :link-kinds="['armor', 'boss']"
      />
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="armor.wiki_page"
    :url="armor.url"
    :retrieved="retrieved"
  />
</template>

<style scoped>
.sh-pair { display: grid; gap: var(--space-4); align-items: start; min-width: 0; }
@media (min-width: 1280px) {
  .sh-pair { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
}
</style>
