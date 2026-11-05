<!-- Adaptateur d'une valeur calculée du moteur (`Calc<T>`) vers `CxValue` : valeur, estimation héritée, badge Calculé et « Pourquoi ? ». -->
<script setup lang="ts" generic="T extends number | string">
import { computed } from 'vue'
import type { Calc, Explanation } from '../../engine/types.ts'
import CxValue from './CxValue.vue'

/**
 * Affiche une valeur calculée par le moteur selon les conventions du design system (README, « Conventions de données ») :
 * `gold-text`, badge Calculé, estimation héritée (`Calc.estimate`) en badge Estimation, bouton « Pourquoi ? ». Une valeur `null` du moteur
 * s'affiche « Non documenté » (jamais 0). À placer à côté de la valeur de base, jamais à sa place.
 * Le composant ne calcule rien : il traduit les champs de `Calc` en propriétés de `CxValue`. L'événement `why` porte l'`Explanation`
 * à rendre par `CxWhyPanel`.
 */
const props = withDefaults(
  defineProps<{
    /** Valeur calculée du moteur. */
    calc: Calc<T>
    /** Mise en forme d'un nombre (voir `CxValue`). */
    format?: 'int' | 'decimal' | 'percent' | 'weight' | 'signed'
    /** Décimales maximales. */
    digits?: number
    /** Mode tableau : une valeur absente remplit la case de hachures. */
    cell?: boolean
    /** Méthode de calcul en une phrase, pour l'info-bulle du badge Calculé (texte rédigé par l'appelant). */
    method?: string
    /** Affiche le bouton « Pourquoi ? » (faux dans un tableau dense). */
    why?: boolean
  }>(),
  { format: 'int', digits: undefined, cell: false, method: undefined, why: true },
)

const emit = defineEmits<{
  /** L'utilisateur demande le détail du calcul : explication à afficher dans le panneau « Pourquoi ? ». */
  why: [explanation: Explanation]
}>()

const estimate = computed(() => props.calc.estimate?.confidence ?? null)
</script>

<template>
  <CxValue
    :value="calc.value"
    :format="format"
    :digits="digits"
    :cell="cell"
    :estimate="estimate"
    :method="method"
    :why="why"
    calculated
    @why="emit('why', calc.explanation)"
  />
</template>
