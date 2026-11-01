<!-- Valeur de donnée : point unique des conventions d'affichage (null, estimation, incohérence, valeur calculée) et du formatage des nombres. -->
<script setup lang="ts">
import { computed } from 'vue'
import { formatDecimal, formatInt, formatPercent, formatSigned, formatWeight } from '../../ui/format.ts'
import type { EstimateConfidence } from '../../ui/labels.ts'
import CxButton from './CxButton.vue'
import CxIcon from './CxIcon.vue'
import CxReliabilityBadge from './CxReliabilityBadge.vue'

/**
 * Affiche une valeur de donnée selon les conventions du design system (README, « Conventions de données ») :
 * - `null` (ou `undefined`) : « Non documenté » avec l'icône ∅, jamais 0 ni vide ; en mode `cell`, case hachurée ;
 * - estimation : badge Estimation (avec sa confiance) à côté de la valeur ;
 * - valeur du wiki déduite ou incohérente : badge correspondant, explication en info-bulle ;
 * - valeur calculée : `gold-text`, badge Calculé (méthode en info-bulle) et bouton « Pourquoi ? » (événement `why`).
 * Les nombres sont formatés par `src/ui/format.ts`. Une valeur calculée s'affiche à côté de la valeur de base, jamais à sa place.
 * Le type `Calc<T>` du moteur n'existe pas encore : un adaptateur lui fera remplir ces propriétés.
 */
const props = withDefaults(
  defineProps<{
    /** Valeur à afficher : nombre (formaté), texte (affiché tel quel) ou `null` / `undefined` (non documenté). */
    value: number | string | null | undefined
    /** Mise en forme d'un nombre : entier (défaut), décimal, pourcentage, poids ou nombre signé. */
    format?: 'int' | 'decimal' | 'percent' | 'weight' | 'signed'
    /** Nombre maximal de décimales pour `decimal`, `percent` et `signed` (valeur par défaut de chaque fonction de `format.ts` sinon). */
    digits?: number
    /** Mode tableau : une valeur absente remplit la case de hachures. */
    cell?: boolean
    /** Valeur estimée : badge Estimation avec la confiance donnée. */
    estimate?: EstimateConfidence | null
    /** Fiabilité du wiki à signaler : `deduced` (« Wiki (déduit) ») ou `inconsistent` (« Incohérence »). */
    reliability?: 'deduced' | 'inconsistent' | null
    /** Info-bulle du badge de fiabilité : nom du champ et valeur retenue. */
    reliabilityNote?: string
    /** Valeur calculée par l'application : `gold-text`, badge Calculé et « Pourquoi ? ». */
    calculated?: boolean
    /** Méthode de calcul en une phrase, affichée dans l'info-bulle du badge Calculé. */
    method?: string
    /** Affiche le bouton « Pourquoi ? » d'une valeur calculée (vrai par défaut ; faux dans un tableau dense). */
    why?: boolean
  }>(),
  {
    format: 'int',
    digits: undefined,
    cell: false,
    estimate: null,
    reliability: null,
    reliabilityNote: undefined,
    calculated: false,
    method: undefined,
    why: true,
  },
)

const emit = defineEmits<{
  /** L'utilisateur demande le détail du calcul (ouvre le panneau « Pourquoi ? »). */
  why: []
}>()

const isNull = computed(() => props.value === null || props.value === undefined)

const text = computed(() => {
  const value = props.value
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  switch (props.format) {
    case 'decimal':
      return formatDecimal(value, props.digits)
    case 'percent':
      return formatPercent(value, props.digits)
    case 'weight':
      return formatWeight(value)
    case 'signed':
      return formatSigned(value, props.digits)
    default:
      return formatInt(value)
  }
})
</script>

<template>
  <span
    v-if="isNull"
    class="cx-null"
    :class="{ 'cx-null-cell cx-hatch': cell }"
    :title="cell ? 'Non documenté : le wiki ne donne pas cette valeur.' : undefined"
  >
    <CxIcon
      name="empty"
      size="sm"
    /> Non documenté
  </span>
  <span
    v-else
    class="cx-value"
  >
    <span
      class="cx-num"
      :class="{ 'cx-gold': calculated }"
    >{{ text }}</span>
    <CxReliabilityBadge
      v-if="reliability"
      :kind="reliability"
      :tip="reliabilityNote"
    />
    <CxReliabilityBadge
      v-if="estimate"
      kind="estimate"
      :confidence="estimate"
    />
    <CxReliabilityBadge
      v-if="calculated"
      kind="calculated"
      :tip="method"
    />
    <CxButton
      v-if="calculated && why"
      variant="ghost"
      size="sm"
      icon="help"
      @click="emit('why')"
    >Pourquoi ?</CxButton>
  </span>
</template>

<style>
.cx-value { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
</style>
