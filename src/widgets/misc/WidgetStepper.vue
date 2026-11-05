<!-- Saisie d'un niveau entier dans un widget : boutons − et +, valeur réglable au clavier (niveau d'amélioration, niveau visé). -->
<script setup lang="ts">
import { computed } from 'vue'
import CxIcon from '../../components/ds/CxIcon.vue'
import { formatInt } from '../../ui/format.ts'

/**
 * Stepper de niveau des widgets D2 (niveaux d'amélioration `+n`) et D5 (niveau visé). Il réutilise les classes `cx-stepper-ctl` du stepper d'attribut
 * (`CxAttributeStepper` est lié aux huit attributs, et `CriteriaLevelStepper` aux bornes des critères). Les boutons avancent de `step` ;
 * au clavier, ↑ ↓ de 1 et Page ↑ ↓ de `bigStep` ; Début et Fin vont aux bornes. La valeur est un `spinbutton` focalisable : un lecteur d'écran
 * annonce sa valeur et ses bornes. Le composant ne calcule rien : il borne la saisie.
 */
const props = withDefaults(
  defineProps<{
    /** Nom accessible de la valeur (« Niveau actuel »). */
    label: string
    /** Borne basse. */
    min: number
    /** Borne haute. */
    max: number
    /** Pas des boutons − et + (1 par défaut). */
    step?: number
    /** Pas de Page ↑ et Page ↓ (5 par défaut). */
    bigStep?: number
    /** Texte écrit avant la valeur (`+` pour un niveau d'amélioration). */
    prefix?: string
    /** Désactive les trois contrôles (rien à régler). */
    disabled?: boolean
  }>(),
  { step: 1, bigStep: 5, prefix: '', disabled: false },
)

/** Valeur courante. */
const model = defineModel<number>({ required: true })

const shown = computed(() => `${props.prefix}${formatInt(model.value)}`)

/**
 * Applique `delta` en restant dans les bornes.
 * @param delta Variation à appliquer.
 */
function change(delta: number): void {
  model.value = Math.min(props.max, Math.max(props.min, model.value + delta))
}

/**
 * Réglage au clavier de la valeur.
 * @param event Événement clavier du `spinbutton`.
 */
function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowUp':
      change(1)
      break
    case 'ArrowDown':
      change(-1)
      break
    case 'PageUp':
      change(props.bigStep)
      break
    case 'PageDown':
      change(-props.bigStep)
      break
    case 'Home':
      model.value = props.min
      break
    case 'End':
      model.value = props.max
      break
    default:
      return
  }
  event.preventDefault()
}
</script>

<template>
  <span
    class="cx-stepper-ctl wd-stepper"
    :class="{ 'is-disabled': disabled }"
  >
    <button
      type="button"
      :aria-label="`Diminuer : ${label}`"
      :disabled="disabled || model <= min"
      @click="change(-step)"
    >
      <CxIcon
        name="minus"
        size="sm"
      />
    </button>
    <span
      class="cx-stepper-val wd-stepper-val"
      role="spinbutton"
      :tabindex="disabled ? -1 : 0"
      :aria-label="label"
      :aria-valuenow="model"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuetext="shown"
      :aria-disabled="disabled ? 'true' : undefined"
      @keydown="onKeydown"
    >{{ shown }}</span>
    <button
      type="button"
      :aria-label="`Augmenter : ${label}`"
      :disabled="disabled || model >= max"
      @click="change(step)"
    >
      <CxIcon
        name="plus"
        size="sm"
      />
    </button>
  </span>
</template>

<style scoped>
/* Les classes `cx-stepper-*` viennent de `CxAttributeStepper` (CSS global, chargé avec le panneau de critères) ; on ne dépend que de leur nom. */
.wd-stepper-val { min-width: 44px; padding: 0 var(--space-1); }
.wd-stepper.is-disabled { opacity: .6; }
</style>
