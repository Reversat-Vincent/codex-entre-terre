<!-- Saisie rapide d'un attribut du personnage : boutons − et +, appui long ou Maj pour ±5, flèches au clavier. -->
<script setup lang="ts">
/* eslint-disable no-undef -- la configuration ESLint ne déclare pas les globaux du navigateur pour les .vue ; le compilateur TypeScript vérifie déjà les noms. À retirer quand l'outillage aura réglé `no-undef`. */
import { computed, onBeforeUnmount } from 'vue'
import { ATTRIBUTE_LABELS, type AttributeKey } from '../../ui/labels.ts'
import CxIcon from './CxIcon.vue'
import CxTooltip from './CxTooltip.vue'

/**
 * Stepper d'attribut (README du design system, composant AttributeStepper).
 * L'abréviation anglaise (VIG, STR…) est affichée ; le nom complet est dans l'info-bulle (ou à côté avec `showName`).
 * Souris et tactile : − / + pas à pas, Maj + clic ou appui long (500 ms, puis répétition) pour ±5.
 * Clavier : ↑ ↓ sur la valeur (Maj ou Page ↑ ↓ pour ±5, Début et Fin pour les bornes).
 * Le bouton − est désactivé au minimum (valeur de départ de l'origine choisie), + au maximum. Cibles de 44 px sous 768 px.
 */
const props = withDefaults(
  defineProps<{
    /** Attribut concerné. */
    attribute: AttributeKey
    /** Minimum : valeur de l'attribut pour l'origine choisie (1 par défaut). */
    min?: number
    /** Maximum (99 par défaut). */
    max?: number
    /** `target` : valeur en `gold-text` (mode build cible) ; `gap` : écart à combler en `warn`. */
    tone?: 'default' | 'target' | 'gap'
    /** Affiche aussi le nom complet à côté de l'abréviation, en plus de l'info-bulle. */
    showName?: boolean
  }>(),
  { min: 1, max: 99, tone: 'default', showName: false },
)

/** Valeur courante de l'attribut. */
const model = defineModel<number>({ required: true })

const BIG_STEP = 5
const LONG_PRESS_MS = 500
const REPEAT_MS = 200

const label = computed(() => ATTRIBUTE_LABELS[props.attribute])
const classes = computed(() => (props.tone === 'target' ? 'is-target' : props.tone === 'gap' ? 'is-gap' : ''))

let pressTimer: ReturnType<typeof setTimeout> | undefined
let repeatTimer: ReturnType<typeof setInterval> | undefined
/** Vrai quand un appui long a déjà agi : le `click` qui suit le relâchement doit être ignoré. */
let longPressFired = false

/** Applique `delta` à la valeur en la bornant ; renvoie faux si la valeur n'a pas bougé (borne atteinte). */
function change(delta: number): boolean {
  const next = Math.min(props.max, Math.max(props.min, model.value + delta))
  if (next === model.value) return false
  model.value = next
  return true
}

function stopPress(): void {
  clearTimeout(pressTimer)
  clearInterval(repeatTimer)
  pressTimer = undefined
  repeatTimer = undefined
}

/** Le pointeur sort du bouton ou le geste est annulé : aucun `click` ne suivra, l'indicateur d'appui long est donc remis à zéro. */
function cancelPress(): void {
  stopPress()
  longPressFired = false
}

function startPress(direction: 1 | -1, event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  stopPress()
  longPressFired = false
  pressTimer = setTimeout(() => {
    longPressFired = true
    const step = (): void => {
      if (!change(direction * BIG_STEP)) stopPress()
    }
    step()
    repeatTimer = setInterval(step, REPEAT_MS)
  }, LONG_PRESS_MS)
}

function onClick(direction: 1 | -1, event: MouseEvent): void {
  if (longPressFired) {
    longPressFired = false
    return
  }
  change(direction * (event.shiftKey ? BIG_STEP : 1))
}

function onValueKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? BIG_STEP : 1
  switch (event.key) {
    case 'ArrowUp':
      change(step)
      break
    case 'ArrowDown':
      change(-step)
      break
    case 'PageUp':
      change(BIG_STEP)
      break
    case 'PageDown':
      change(-BIG_STEP)
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

onBeforeUnmount(stopPress)
</script>

<template>
  <div
    class="cx-stepper"
    :class="classes"
  >
    <span class="cx-stepper-name">
      <CxTooltip
        :text="label.name"
        align="start"
      >
        <span class="cx-stepper-abbr">{{ label.abbr }}</span>
      </CxTooltip>
      <span
        v-if="showName"
        class="cx-stepper-full"
      >{{ label.name }}</span>
    </span>
    <span class="cx-stepper-ctl">
      <button
        type="button"
        :aria-label="`Diminuer ${label.name}`"
        :disabled="model <= min"
        @pointerdown="startPress(-1, $event)"
        @pointerup="stopPress"
        @pointerleave="cancelPress"
        @pointercancel="cancelPress"
        @contextmenu.prevent
        @click="onClick(-1, $event)"
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
        :aria-label="label.name"
        :aria-valuenow="model"
        :aria-valuemin="min"
        :aria-valuemax="max"
        @keydown="onValueKeydown"
      >{{ model }}</span>
      <button
        type="button"
        :aria-label="`Augmenter ${label.name}`"
        :disabled="model >= max"
        @pointerdown="startPress(1, $event)"
        @pointerup="stopPress"
        @pointerleave="cancelPress"
        @pointercancel="cancelPress"
        @contextmenu.prevent
        @click="onClick(1, $event)"
      >
        <CxIcon
          name="plus"
          size="sm"
        />
      </button>
    </span>
  </div>
</template>

<style>
.cx-stepper { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-2); min-height: 28px; }
.cx-stepper-name { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.cx-stepper-abbr { font-weight: 700; font-size: 13px; letter-spacing: .02em; }
.cx-stepper-full { color: var(--ink-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cx-stepper-ctl { display: inline-flex; align-items: center; border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); }
.cx-stepper-ctl button { display: grid; place-items: center; width: 26px; height: 26px; border: 0; background: transparent; color: var(--ink-2); cursor: pointer; touch-action: manipulation; user-select: none; }
.cx-stepper-ctl button:hover { background: var(--surface-hover); color: var(--ink); }
.cx-stepper-ctl button:disabled { background: transparent; color: var(--ink-disabled); cursor: not-allowed; }
.cx-stepper-val { min-width: 30px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.cx-stepper.is-gap .cx-stepper-val { color: var(--warn); }
.cx-stepper.is-target .cx-stepper-val { color: var(--gold-text); }
/* Cibles tactiles de 44 px sous 768 px (seuil en dur, voir src/ui/breakpoints.ts). */
@media (max-width: 767px) {
  .cx-stepper { min-height: var(--size-cible); }
  .cx-stepper-ctl button { width: var(--size-cible); height: var(--size-cible); }
  .cx-stepper-val { min-width: 36px; }
}
</style>
