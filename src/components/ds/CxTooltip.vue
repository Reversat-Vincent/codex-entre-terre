<!-- Info-bulle accessible : s'ouvre au survol (souris), au focus clavier et à l'appui (tactile) ; Échap la ferme. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

/** Marge minimale entre la bulle et le bord de la fenêtre, en pixels. */
const VIEWPORT_MARGIN = 8

/**
 * Info-bulle autour d'un déclencheur focalisable (README du design system, composant Tooltip).
 * Le contenu de la bulle vient de `text` ou du slot `content` (une phrase en gras qui répond, une phrase qui explique) ; 280 px au plus.
 * Le déclencheur est un vrai `button` relié à la bulle par `aria-describedby`, la bulle porte `role="tooltip"`.
 * Ne jamais y mettre un autre élément interactif (pas de bouton dans le slot par défaut).
 * La bulle reste dans la fenêtre : à l'ouverture, elle est décalée horizontalement si son alignement la ferait déborder (déclencheur près d'un bord).
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
const bubble = ref<HTMLElement | null>(null)
/** Décalage horizontal, en pixels, qui ramène la bulle dans la fenêtre (0 si elle y tient). */
const shift = ref(0)
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

/**
 * Recale la bulle dans la fenêtre. La position naturelle (sans décalage) est déduite de la mesure en retranchant le décalage déjà appliqué :
 * la mesure reste juste même quand elle est refaite à l'ouverture suivante ou au redimensionnement. Une bulle plus large que la fenêtre
 * (rare : sa largeur est bornée par la fenêtre dans le CSS) est calée à gauche.
 */
function fitInViewport(): void {
  const el = bubble.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const viewport = document.documentElement.clientWidth
  const left = rect.left - shift.value
  const right = rect.right - shift.value
  if (left < VIEWPORT_MARGIN) shift.value = VIEWPORT_MARGIN - left
  else if (right > viewport - VIEWPORT_MARGIN) shift.value = Math.max(viewport - VIEWPORT_MARGIN - right, VIEWPORT_MARGIN - left)
  else shift.value = 0
}

// Les écouteurs globaux n'existent que pendant que la bulle est ouverte.
// `flush: 'post'` : la mesure se fait une fois le DOM à jour, avant l'affichage, donc sans saut visible.
watch(
  visible,
  (isVisible) => {
    if (isVisible) {
      document.addEventListener('keydown', onDocumentKeydown)
      document.addEventListener('pointerdown', onDocumentPointerdown)
      window.addEventListener('resize', fitInViewport)
      fitInViewport()
    } else {
      document.removeEventListener('keydown', onDocumentKeydown)
      document.removeEventListener('pointerdown', onDocumentPointerdown)
      window.removeEventListener('resize', fitInViewport)
    }
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerdown)
  window.removeEventListener('resize', fitInViewport)
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
      ref="bubble"
      class="cx-tip-body"
      :class="bubbleClasses"
      :style="shift === 0 ? undefined : { '--cx-tip-shift': `${shift}px` }"
      role="tooltip"
    >
      <slot name="content">{{ text }}</slot>
    </span>
  </span>
</template>

<style>
.cx-tip { position: relative; display: inline-flex; }
.cx-tip-body { position: absolute; left: 50%; bottom: calc(100% + 8px); z-index: var(--z-popover); width: max-content; max-width: min(280px, calc(100vw - 2 * 8px)); padding: var(--space-2) var(--space-3); border-radius: var(--radius-s); background: var(--surface-raised); box-shadow: var(--shadow-2); color: var(--ink); font: 400 12px/17px var(--font-sans); text-align: left; white-space: normal; letter-spacing: 0; opacity: 0; visibility: hidden; pointer-events: none; transform: translateX(calc(-50% + var(--cx-tip-shift, 0px))); transition: opacity .12s ease; }
.cx-tip-body b { font-weight: 600; }
.cx-tip-body.below { top: calc(100% + 8px); bottom: auto; }
.cx-tip-body.start { left: 0; transform: translateX(var(--cx-tip-shift, 0px)); }
.cx-tip-body.end { left: auto; right: 0; transform: translateX(var(--cx-tip-shift, 0px)); }
/* L'ouverture est pilotée par le composant (survol, focus clavier, appui, Échap) : pas de règle :hover ici, sinon Échap serait sans effet. */
.cx-tip-body.is-open { opacity: 1; visibility: visible; }
.cx-tip-trigger { display: inline-flex; align-items: center; padding: 0; border: 0; background: transparent; color: inherit; cursor: help; }
@media (prefers-reduced-motion: reduce) { .cx-tip-body { transition: none; } }
</style>
