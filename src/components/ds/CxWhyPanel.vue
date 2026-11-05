<!-- Panneau « Pourquoi ? » : rend une `Explanation` du moteur (méthode, composantes, données utilisées, limites) derrière un bouton à divulgation. -->
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { Explanation } from '../../engine/types.ts'
import { dataValueText, describeComponent, limitText, methodText } from '../../ui/explainText.ts'
import type { EstimateConfidence } from '../../ui/labels.ts'
import CxButton from './CxButton.vue'
import CxIcon from './CxIcon.vue'
import CxReliabilityBadge from './CxReliabilityBadge.vue'
import CxValue from './CxValue.vue'

/**
 * Panneau « Pourquoi ? » (README du design system, composant WhyPanel ; calculs.md, section de la méthode de l'explication).
 * Le composant ne calcule rien : il traduit les codes de l'`Explanation` par `src/ui/explainText.ts` et affiche
 * - la méthode (titre, résumé d'une phrase qui cite la section de `calculs.md`), avec le badge Calculé et, si la valeur est estimée, le badge Estimation ;
 * - les composantes, valeur sur maximum et barre `gold` sur `surface-sunken` ; une valeur `null` s'affiche « Non documenté », jamais 0 ;
 * - les données utilisées : fichier, entrée, champ, valeur et badge de fiabilité ;
 * - les limites connues.
 * Le bouton « Pourquoi ? » est un vrai `button` à divulgation (`aria-expanded`, `aria-controls`) : il s'actionne au clic, à l'appui tactile,
 * à Entrée et à Espace, sans dépendre d'un survol. Échap ferme le panneau et rend le focus au bouton.
 * Avec `toggle` à faux, le panneau est piloté par l'appelant (tiroir, ligne dépliée) : seul `open` décide, et la croix émet `close`.
 * Les alternatives proches du design (« Armes proches ») ne sont pas dans une `Explanation` : l'appelant les place dans le slot `extra`.
 */
const props = withDefaults(
  defineProps<{
    /** Explication à rendre, telle que renvoyée par le moteur (`Calc.explanation`). */
    explanation: Explanation
    /** Objet de l'explication (« Rivers of Blood ») : le titre devient « Pourquoi Rivers of Blood ? » ; sans lui, le titre de la méthode. */
    subject?: string
    /** Confiance de l'estimation héritée (`Calc.estimate`) ; `null` ou absente = valeur non estimée. */
    estimate?: EstimateConfidence | null
    /** Affiche le bouton « Pourquoi ? » ; faux quand l'appelant ouvre le panneau lui-même. */
    toggle?: boolean
  }>(),
  { subject: undefined, estimate: null, toggle: true },
)

const emit = defineEmits<{
  /** La croix ou Échap a fermé le panneau (l'appelant qui pilote `open` le referme). */
  close: []
}>()

/** Panneau ouvert ou fermé. */
const open = defineModel<boolean>('open', { default: false })

const panelId = useId()
const toggleButton = ref<{ $el: HTMLElement } | null>(null)

const method = computed(() => methodText(props.explanation.method))
const title = computed(() => (props.subject ? `Pourquoi ${props.subject} ?` : method.value.title))
const components = computed(() => props.explanation.components.map((c) => describeComponent(c)))
const inputs = computed(() =>
  props.explanation.inputs.map((ref) => ({
    ref,
    value: dataValueText(ref.value),
    icon: ref.file === 'tables' ? 'table' : ref.file === 'config' ? 'sliders' : 'book',
  })),
)
const limits = computed(() => props.explanation.limits.map((l) => limitText(l.code, l.params)))

/** Ferme le panneau et rend le focus au bouton qui l'a ouvert, pour que le clavier ne le perde pas. */
function close(): void {
  open.value = false
  emit('close')
  toggleButton.value?.$el.focus()
}

/**
 * Échap ferme le panneau ouvert, où que soit le focus dans le composant ; sans panneau ouvert, l'événement continue vers les autres écouteurs.
 * @param event Événement clavier.
 */
function onEscape(event: KeyboardEvent): void {
  if (!open.value) return
  event.stopPropagation()
  close()
}
</script>

<template>
  <div
    class="cx-why-wrap"
    @keydown.esc="onEscape"
  >
    <CxButton
      v-if="toggle"
      ref="toggleButton"
      variant="ghost"
      size="sm"
      icon="help"
      class="cx-btn-why"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="panelId"
      @click="open = !open"
    >
      Pourquoi ?
    </CxButton>
    <section
      v-if="open"
      :id="panelId"
      class="cx-why"
      :aria-label="title"
    >
      <div class="cx-why-h">
        <h3 class="titre-s">
          {{ title }}
        </h3>
        <CxButton
          variant="ghost"
          size="sm"
          icon="x"
          icon-only
          label="Fermer"
          @click="close"
        />
      </div>
      <div class="cx-why-method">
        <div class="cx-row tight">
          <CxReliabilityBadge kind="calculated" />
          <CxReliabilityBadge
            v-if="estimate"
            kind="estimate"
            :confidence="estimate"
          />
          <span class="cx-label">{{ method.title }}</span>
        </div>
        <p class="cx-muted">
          {{ method.summary }}
        </p>
      </div>
      <div>
        <h4>Composantes</h4>
        <p
          v-if="components.length === 0"
          class="cx-muted"
        >
          Cette valeur n'a pas de composantes détaillées.
        </p>
        <div
          v-else
          class="cx-breakdown"
        >
          <div
            v-for="(comp, i) in components"
            :key="i"
            class="cx-bd-row"
          >
            <span>{{ comp.label }}</span>
            <span v-if="comp.hidden" />
            <CxValue
              v-else-if="comp.value === null"
              :value="null"
            />
            <b v-else>{{ comp.value }}<span
              v-if="comp.max !== null"
              class="cx-muted"
            > sur {{ comp.max }}</span></b>
            <span
              v-if="comp.ratio !== null"
              class="cx-bd-bar"
              aria-hidden="true"
            ><span :style="{ width: `${comp.ratio * 100}%` }" /></span>
          </div>
        </div>
      </div>
      <div>
        <h4>Données utilisées</h4>
        <p
          v-if="inputs.length === 0"
          class="cx-muted"
        >
          Aucune donnée n'est lue : le calcul ne dépend que de ses paramètres.
        </p>
        <ul
          v-else
          class="cx-why-data"
        >
          <li
            v-for="(input, i) in inputs"
            :key="i"
          >
            <CxIcon
              :name="input.icon"
              size="sm"
            />
            <span class="cx-why-ref">
              <b>{{ input.ref.file }}</b>
              <template v-if="input.ref.entry"> · {{ input.ref.entry }}</template>
              · {{ input.ref.field }}
              <template v-if="input.value !== null"> = <b>{{ input.value }}</b></template>
              <CxReliabilityBadge :kind="input.ref.reliability" />
            </span>
          </li>
        </ul>
      </div>
      <div>
        <h4>Limites</h4>
        <p
          v-if="limits.length === 0"
          class="cx-muted"
        >
          Aucune limite connue.
        </p>
        <ul
          v-else
          class="cx-why-data"
        >
          <li
            v-for="(text, i) in limits"
            :key="i"
          >
            <CxIcon
              name="info"
              size="sm"
            />
            <span>{{ text }}</span>
          </li>
        </ul>
      </div>
      <div
        v-if="$slots.extra"
        class="cx-why-extra"
      >
        <slot name="extra" />
      </div>
    </section>
  </div>
</template>

<style>
.cx-why-wrap { display: grid; gap: var(--space-3); min-width: 0; }
.cx-why { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-5); padding: var(--space-4); border: 1px solid var(--gold-line); border-radius: var(--radius-m); background: var(--surface-raised); }
.cx-why-h { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); grid-column: 1 / -1; }
.cx-why-method { display: grid; gap: var(--space-1); grid-column: 1 / -1; font-size: 12px; line-height: 16px; }
.cx-why-extra { grid-column: 1 / -1; }
.cx-why h4 { margin-bottom: var(--space-2); color: var(--ink-2); font: 600 12px/16px var(--font-sans); letter-spacing: .01em; }
.cx-why-data { display: grid; gap: 6px; color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-why-data li { display: flex; gap: 6px; align-items: flex-start; }
.cx-why-data .cx-i { margin-top: 1px; color: var(--ink-3); }
.cx-why-ref { min-width: 0; overflow-wrap: anywhere; }
.cx-why-ref b { color: var(--ink); font-weight: 600; }
.cx-why-ref .cx-rel { margin-left: 4px; }
.cx-breakdown { display: grid; gap: 8px; }
.cx-bd-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px var(--space-2); align-items: center; font-size: 12px; line-height: 16px; color: var(--ink-2); }
.cx-bd-row b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.cx-bd-bar { grid-column: 1 / -1; height: 6px; overflow: hidden; border-radius: 3px; background: var(--surface-sunken); }
.cx-bd-bar > span { display: block; height: 100%; border-radius: 3px; background: var(--gold); }
@media (max-width: 1100px) { .cx-why { grid-template-columns: minmax(0, 1fr); } }
</style>
