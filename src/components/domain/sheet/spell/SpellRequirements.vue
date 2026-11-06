<!-- Section « Prérequis » d'un sort : INT, FAI et ARC exigés, comparés aux attributs des critères en cours. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SpellEntry } from '../../../../data/types/spells.ts'
import { useAnalysisStore } from '../../../../stores/analysis.ts'
import { useCriteriaStore } from '../../../../stores/criteria.ts'
import { ATTRIBUTE_LABELS } from '../../../../ui/labels.ts'
import CxReliabilityBadge from '../../../ds/CxReliabilityBadge.vue'
import CxRequirementChips from '../../../ds/CxRequirementChips.vue'
import CxValue from '../../../ds/CxValue.vue'
import CxWhyPanel from '../../../ds/CxWhyPanel.vue'
import SheetSection from '../SheetSection.vue'
import { spellRequirementRows } from './spellModel.ts'

/**
 * Prérequis du sort (`requirements.int|fai|arc`, 0 = aucun) comparés au profil. La comparaison vient du moteur par le getter `requirementsOf` du store
 * `analysis` ; ce composant lit les attributs des critères en cours et affiche le résultat : atteint, ou écart « +14 INT ».
 * La comparaison est une valeur calculée : badge Calculé et « Pourquoi ? » à côté des valeurs du wiki, qui restent affichées telles quelles dans la colonne « Exigé ».
 */
const props = defineProps<{
  spell: Pick<SpellEntry, 'id' | 'requirements'>
}>()

const criteria = useCriteriaStore()
const analysis = useAnalysisStore()
const requirements = computed(() => analysis.requirementsOf(`spell:${props.spell.id}`))
const rows = computed(() => spellRequirementRows(props.spell, criteria.criteria.character.attributes, requirements.value?.value?.checks ?? []))
const anyRequired = computed(() => rows.value.some((r) => r.required > 0))
</script>

<template>
  <SheetSection
    title="Prérequis"
    subtitle="Comparés aux attributs de vos critères en cours."
  >
    <!-- Le badge est à gauche du corps : son info-bulle s'ouvre vers la droite et dépasserait l'écran étroit s'il était calé au bord droit. -->
    <p class="sh-req-calc">
      <CxReliabilityBadge
        kind="calculated"
        tip="Comparaison faite par l'application : un prérequis est atteint si l'attribut du profil est au moins égal à la valeur exigée (calculs.md, « Prérequis comparés au profil »)."
      />
      <span class="cx-muted">Comparaison calculée avec vos attributs.</span>
    </p>
    <table class="sh-req">
      <caption class="cx-sr">
        Prérequis d'attribut du sort et attributs de votre profil
      </caption>
      <thead>
        <tr>
          <th scope="col">
            Attribut
          </th>
          <th scope="col">
            Exigé
          </th>
          <th scope="col">
            Votre profil
          </th>
          <th scope="col">
            Comparaison
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.attr"
        >
          <th scope="row">
            <abbr :title="ATTRIBUTE_LABELS[r.attr].name">{{ ATTRIBUTE_LABELS[r.attr].abbr }}</abbr>
          </th>
          <td>
            <CxValue
              v-if="r.required > 0"
              :value="r.required"
            />
            <span
              v-else
              class="cx-muted"
            >Aucun</span>
          </td>
          <td><CxValue :value="r.actual" /></td>
          <td>
            <CxRequirementChips
              v-if="r.check"
              :checks="[r.check]"
            />
            <span
              v-else
              class="cx-muted"
            >Aucun prérequis</span>
          </td>
        </tr>
      </tbody>
    </table>
    <CxWhyPanel
      v-if="requirements"
      :explanation="requirements.explanation"
      subject="cette comparaison des prérequis"
    />
    <p
      v-if="!anyRequired"
      class="sh-req-none"
    >
      Ce sort n'exige aucune valeur d'attribut.
    </p>
  </SheetSection>
</template>

<style scoped>
.sh-req { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 18px; }
.sh-req th, .sh-req td { padding: var(--space-2) var(--space-3) var(--space-2) 0; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
.sh-req thead th { color: var(--ink-3); font-size: 12px; font-weight: 600; }
.sh-req tbody th { color: var(--ink); font-weight: 600; }
.sh-req abbr { text-decoration: underline dotted; text-underline-offset: 3px; cursor: help; }
.sh-req td { color: var(--ink); font-variant-numeric: tabular-nums; }
.sh-req-calc { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); font-size: 12px; }
.sh-req-none { color: var(--ink-2); font-size: 13px; }
@media (max-width: 767px) {
  .sh-req th, .sh-req td { padding-right: var(--space-2); }
}
</style>
