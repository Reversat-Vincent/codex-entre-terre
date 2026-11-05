<!-- Contenu de la fiche d'un sort chargé : en-tête, alertes, effet, coûts, prérequis comparés au profil, vendeur, obtention, notes et patchs. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SpellEntry } from '../../../../data/types/spells.ts'
import SheetAcquisition from '../SheetAcquisition.vue'
import SheetAlerts from '../SheetAlerts.vue'
import SheetEffect from '../SheetEffect.vue'
import SheetFacts from '../SheetFacts.vue'
import SheetHeader from '../SheetHeader.vue'
import SheetLayout from '../SheetLayout.vue'
import SheetLicence from '../SheetLicence.vue'
import SheetNotes from '../SheetNotes.vue'
import SheetOtherSections from '../SheetOtherSections.vue'
import SpellCosts from './SpellCosts.vue'
import SpellRequirements from './SpellRequirements.vue'
import { spellAlerts, spellFacts } from './spellModel.ts'

/**
 * Fiche d'un sort (`/sorts/:id`) : type, école, coûts en FP et en endurance (notation « X (Y) » expliquée), emplacements de mémoire, prérequis INT, FAI
 * et ARC comparés au profil, effet, vendeur relié à la fiche du PNJ. Aucun calcul ici : la comparaison des prérequis vient du moteur.
 */
const props = defineProps<{
  spell: SpellEntry
  /** Date d'extraction du fichier. */
  retrieved: string | null
}>()

const ref = computed(() => `spell:${props.spell.id}` as const)
const alerts = computed(() => spellAlerts(props.spell))
const facts = computed(() => spellFacts(props.spell))
</script>

<template>
  <SheetHeader
    kind="spell"
    :entity-ref="ref"
    :name="spell.name"
    :source="spell.source"
    :url="spell.url"
    :category="spell.category"
  />

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
        :effect="spell.effect"
        require-effect
        :details="spell.effect_details"
        details-label="Détails du wiki"
        :description="spell.description"
        :entity-ref="ref"
        :link-kinds="['spell', 'weapon']"
      />
      <div class="sh-pair">
        <SpellCosts :spell="spell" />
        <SpellRequirements :spell="spell" />
      </div>
      <SheetAcquisition
        :entry="spell"
        :entity-ref="ref"
      />
      <SheetNotes
        :notes="spell.notes"
        :patches="spell.patch_notes"
        :entity-ref="ref"
        :link-kinds="['spell', 'weapon', 'boss', 'npc']"
      />
      <SheetOtherSections
        :sections="spell.other_sections"
        :notes="spell.notes"
        :entity-ref="ref"
        :link-kinds="['spell', 'weapon']"
      />
    </template>
  </SheetLayout>

  <SheetLicence
    :page-name="spell.wiki_page"
    :url="spell.url"
    :retrieved="retrieved"
  />
</template>

<style scoped>
.sh-pair { display: grid; gap: var(--space-4); align-items: start; min-width: 0; }
@media (min-width: 1280px) {
  .sh-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
</style>
