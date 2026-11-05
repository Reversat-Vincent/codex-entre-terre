<!-- Saisie du niveau cible : boutons − et + par pas de 5, valeur réglable au clavier. -->
<script setup lang="ts">
import { LIMITS } from '../../persistence/model.ts'
import CxIcon from '../ds/CxIcon.vue'

/**
 * Stepper du niveau cible du build (design `Main.dc.html`, `.cx-stepper.is-target`). Il réutilise les classes du stepper d'attribut
 * (`CxAttributeStepper` est lié aux huit attributs) : boutons − et + par pas de 5, flèches ↑ ↓ de la valeur par pas de 1, Page ↑ ↓ par pas de 5.
 * Les bornes sont celles de la validation des critères (`LIMITS`) ; le store les applique aussi.
 */
const model = defineModel<number>({ required: true })

const STEP = 5

/** Applique `delta` en restant dans les bornes. */
function change(delta: number): void {
  model.value = Math.min(LIMITS.levelMax, Math.max(LIMITS.levelMin, model.value + delta))
}

function onKeydown(event: KeyboardEvent): void {
  const keys: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: STEP, PageDown: -STEP }
  const delta = keys[event.key]
  if (delta === undefined) return
  change(delta)
  event.preventDefault()
}
</script>

<template>
  <div class="cx-stepper is-target">
    <span class="cx-stepper-name"><span class="cx-stepper-abbr">Niveau cible</span></span>
    <span class="cx-stepper-ctl">
      <button
        type="button"
        aria-label="Diminuer le niveau cible"
        :disabled="model <= LIMITS.levelMin"
        @click="change(-STEP)"
      >
        <CxIcon
          name="minus"
          size="sm"
        />
      </button>
      <span
        class="cx-stepper-val"
        role="spinbutton"
        tabindex="0"
        aria-label="Niveau cible"
        :aria-valuenow="model"
        :aria-valuemin="LIMITS.levelMin"
        :aria-valuemax="LIMITS.levelMax"
        @keydown="onKeydown"
      >{{ model }}</span>
      <button
        type="button"
        aria-label="Augmenter le niveau cible"
        :disabled="model >= LIMITS.levelMax"
        @click="change(STEP)"
      >
        <CxIcon
          name="plus"
          size="sm"
        />
      </button>
    </span>
  </div>
</template>
