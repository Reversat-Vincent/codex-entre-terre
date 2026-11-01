<!-- Feuille superposée : feuille du bas (mobile) ou tiroir latéral (tablette), avec voile, poignée, Échap et focus piégé. -->
<script setup lang="ts">
/* eslint-disable no-undef -- la configuration ESLint ne déclare pas les globaux du navigateur pour les .vue ; le compilateur TypeScript vérifie déjà les noms. À retirer quand l'outillage aura réglé `no-undef`. */
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useFocusTrap } from '../../composables/useFocusTrap.ts'
import { useHotkeys } from '../../composables/useHotkeys.ts'
import CxButton from './CxButton.vue'

/**
 * Feuille modale (hors design system ; architecture § 10.1) : feuille du bas à 88 % de la hauteur sur mobile
 * (critères, « Voir N armes »), tiroir latéral sur tablette. Le voile, Échap et le bouton « Fermer » ferment ;
 * le focus reste dans la feuille tant qu'elle est ouverte et revient au déclencheur à la fermeture ;
 * le défilement de la page est bloqué pendant l'ouverture. Rendue dans `<body>` (qui porte la classe `cx`).
 * Slots : par défaut (corps défilant), `footer` (actions collées en bas).
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Titre, relié à la feuille par `aria-labelledby`. */
    title: string
    /** `bottom` (défaut) : feuille du bas ; `left` ou `right` : tiroir latéral. */
    side?: 'bottom' | 'left' | 'right'
    /** Libellé accessible du bouton de fermeture. */
    closeLabel?: string
  }>(),
  { side: 'bottom', closeLabel: 'Fermer' },
)

/** Ouverte ou fermée. */
const open = defineModel<boolean>({ default: false })

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const panelClass = computed(() => props.side)

function close(): void {
  open.value = false
}

useFocusTrap(panel, open)
useHotkeys({ Escape: close }, { enabled: open })

// La page derrière ne défile pas tant que la feuille est ouverte ; l'état précédent est rétabli à la fermeture.
let previousOverflow: string | null = null
function unlockScroll(): void {
  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow
    previousOverflow = null
  }
}
watch(open, (isOpen) => {
  if (isOpen) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    unlockScroll()
  }
})
onBeforeUnmount(unlockScroll)
</script>

<template>
  <Teleport to="body">
    <Transition name="cx-sheet-fx">
      <div
        v-if="open"
        class="cx-sheet-root"
        v-bind="$attrs"
      >
        <div
          class="cx-scrim"
          @click="close"
        />
        <div
          ref="panel"
          class="cx-sheet"
          :class="panelClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <div
            v-if="side === 'bottom'"
            class="cx-sheet-grab"
            aria-hidden="true"
          />
          <div class="cx-sheet-head">
            <h2
              :id="titleId"
              class="titre-m"
            >
              {{ title }}
            </h2>
            <CxButton
              variant="ghost"
              size="sm"
              icon-only
              icon="x"
              :label="closeLabel"
              @click="close"
            />
          </div>
          <div class="cx-sheet-body">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="cx-sheet-foot"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.cx-sheet-root { position: fixed; inset: 0; z-index: var(--z-overlay); }
.cx-scrim { position: absolute; inset: 0; background: var(--scrim); }
.cx-sheet { position: absolute; left: 0; right: 0; bottom: 0; z-index: var(--z-overlay); display: flex; flex-direction: column; max-height: 88vh; max-height: 88dvh; border-radius: 14px 14px 0 0; background: var(--surface); box-shadow: var(--shadow-3); }
.cx-sheet.left, .cx-sheet.right { top: 0; width: min(360px, 90vw); max-height: none; border-radius: 0; }
.cx-sheet.left { right: auto; border-radius: 0 14px 14px 0; }
.cx-sheet.right { left: auto; border-radius: 14px 0 0 14px; }
.cx-sheet-grab { flex: none; width: 40px; height: 4px; margin: 8px auto 4px; border-radius: 2px; background: var(--line-strong); }
.cx-sheet-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--line); }
.cx-sheet-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.cx-sheet-foot { flex: none; display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 1px solid var(--line); }
.cx-sheet:focus { outline: none; }
/* Entrée et sortie sobres de 150 ms ; supprimées par la règle globale de prefers-reduced-motion (base.css). */
.cx-sheet-fx-enter-active, .cx-sheet-fx-leave-active { transition: opacity .15s ease; }
.cx-sheet-fx-enter-active .cx-sheet, .cx-sheet-fx-leave-active .cx-sheet { transition: transform .15s ease; }
.cx-sheet-fx-enter-from, .cx-sheet-fx-leave-to { opacity: 0; }
.cx-sheet-fx-enter-from .cx-sheet.bottom, .cx-sheet-fx-leave-to .cx-sheet.bottom { transform: translateY(100%); }
.cx-sheet-fx-enter-from .cx-sheet.left, .cx-sheet-fx-leave-to .cx-sheet.left { transform: translateX(-100%); }
.cx-sheet-fx-enter-from .cx-sheet.right, .cx-sheet-fx-leave-to .cx-sheet.right { transform: translateX(100%); }
</style>
