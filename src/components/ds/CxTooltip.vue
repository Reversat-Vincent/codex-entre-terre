<!-- Info-bulle accessible : s'ouvre au survol (souris), au focus clavier et à l'appui (tactile) ; Échap la ferme. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

/**
 * Info-bulle autour d'un déclencheur focalisable (README du design system, composant Tooltip).
 * Le contenu de la bulle vient de `text` ou du slot `content` (une phrase en gras qui répond, une phrase qui explique) ; 280 px au plus.
 * Le déclencheur est un vrai `button` relié à la bulle par `aria-describedby`, la bulle porte `role="tooltip"`.
 * Ne jamais y mettre un autre élément interactif (pas de bouton dans le slot par défaut).
 */
const props = withDefaults(
  defineProps<{
    /** Texte simple de la bulle ; pour un contenu mis en forme, utiliser le slot `content`. */
    text?: string
    /** Côté d'ouverture : au-dessus (défaut) ou en dessous du déclencheur. */
    side?: 'top' | 'bottom'
    /** Alignement horizontal : centré (défaut), calé à gauche (`start`) ou à droite (`end`) du déclencheur, près des bords. */
    align?: 'center' | 'start' | 'end'
  }>(),
  { text: undefined, side: 'top', align: 'center' },
)

const bubbleId = useId()
const root = ref<HTMLElement | null>(null)
const hovered = ref(false)
const keyboardFocused = ref(false)
const pinned = ref(false)
const dismissed = ref(false)

/** Visible tant qu'une des trois intentions (survol, focus clavier, appui) est active et que l'utilisateur n'a pas fermé avec Échap. */
const visible = computed(() => !dismissed.value && (hovered.value || keyboardFocused.value || pinned.value))
const bubbleClasses = computed(() => [
  props.side === 'bottom' ? 'below' : '',
  props.align === 'center' ? '' : props.align,
  visible.value ? 'is-open' : '',
])

/** Après Échap, la bulle reste fermée jusqu'à ce que toutes les intentions soient retombées. */
function settle(): void {
  if (!hovered.value && !keyboardFocused.value && !pinned.value) dismissed.value = false
}

function onPointerEnter(event: PointerEvent): void {
  // Le tactile n'a pas de survol : il passe par l'appui (`click`).
  if (event.pointerType === 'touch') return
  hovered.value = true
}
function onPointerLeave(): void {
  hovered.value = false
  settle()
}
function onFocus(event: FocusEvent): void {
  // Seul le focus au clavier ouvre la bulle : un clic donne aussi le focus et passerait pour un survol persistant.
  keyboardFocused.value = (event.target as HTMLElement).matches(':focus-visible')
}
function onBlur(): void {
  keyboardFocused.value = false
  pinned.value = false
  settle()
}
function onClick(): void {
  dismissed.value = false
  pinned.value = !pinned.value
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  dismissed.value = true
  pinned.value = false
}
function onDocumentPointerdown(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    pinned.value = false
    settle()
  }
}

// Les écouteurs globaux n'existent que pendant que la bulle est ouverte.
watch(visible, (isVisible) => {
  if (isVisible) {
    document.addEventListener('keydown', onDocumentKeydown)
    document.addEventListener('pointerdown', onDocumentPointerdown)
  } else {
    document.removeEventListener('keydown', onDocumentKeydown)
    document.removeEventListener('pointerdown', onDocumentPointerdown)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerdown)
})
</script>

<template>
  <span
    ref="root"
    class="cx-tip"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <button
      type="button"
      class="cx-tip-trigger"
      :aria-describedby="bubbleId"
      @focus="onFocus"
      @blur="onBlur"
      @click="onClick"
    >
      <slot />
    </button>
    <span
      :id="bubbleId"
      class="cx-tip-body"
      :class="bubbleClasses"
      role="tooltip"
    >
      <slot name="content">{{ text }}</slot>
    </span>
  </span>
</template>

<style>
.cx-tip { position: relative; display: inline-flex; }
.cx-tip-body { position: absolute; left: 50%; bottom: calc(100% + 8px); z-index: var(--z-popover); width: max-content; max-width: 280px; padding: var(--space-2) var(--space-3); border-radius: var(--radius-s); background: var(--surface-raised); box-shadow: var(--shadow-2); color: var(--ink); font: 400 12px/17px var(--font-sans); text-align: left; white-space: normal; letter-spacing: 0; opacity: 0; visibility: hidden; pointer-events: none; transform: translateX(-50%); transition: opacity .12s ease; }
.cx-tip-body b { font-weight: 600; }
.cx-tip-body.below { top: calc(100% + 8px); bottom: auto; }
.cx-tip-body.start { left: 0; transform: none; }
.cx-tip-body.end { left: auto; right: 0; transform: none; }
/* L'ouverture est pilotée par le composant (survol, focus clavier, appui, Échap) : pas de règle :hover ici, sinon Échap serait sans effet. */
.cx-tip-body.is-open { opacity: 1; visibility: visible; }
.cx-tip-trigger { display: inline-flex; align-items: center; padding: 0; border: 0; background: transparent; color: inherit; cursor: help; }
@media (prefers-reduced-motion: reduce) { .cx-tip-body { transition: none; } }
</style>
