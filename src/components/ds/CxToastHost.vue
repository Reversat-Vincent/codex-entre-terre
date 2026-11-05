<!-- Hôte des notifications : affiche la file du store `toasts` (message, icône, action « Annuler », fermeture). Monté une fois dans App.vue. -->
<script setup lang="ts">
import { watch } from 'vue'
import { useToastsStore } from '../../stores/toasts.ts'
import type { Toast } from '../../stores/toasts.ts'
import CxButton from './CxButton.vue'
import CxIcon from './CxIcon.vue'

/**
 * Notifications (README du design system, composant States ; note `spec-main`). La zone est une région `aria-live` polite : les messages sont annoncés
 * à leur arrivée, les erreurs en `alert`. L'icône dit le ton en plus du texte. La disparition automatique est gérée par le store.
 * Le compte à rebours s'arrête tant que la notification est survolée ou qu'un de ses éléments a le focus (le temps de lire ou d'atteindre « Annuler »,
 * critère WCAG 2.2.1) : `pause(id)` à la première des deux conditions, `resume(id)` seulement quand le survol et le focus sont tous deux terminés.
 * En bas à droite sur desktop, centrée au-dessus de la barre d'onglets sur mobile.
 */
const toasts = useToastsStore()

/** Conditions qui retiennent une notification : survolée, ou focus à l'intérieur. */
interface Hold {
  hover: boolean
  focus: boolean
}
/** Une entrée par notification retenue ; elle disparaît avec la notification. */
const holds = new Map<number, Hold>()

function holdOf(id: number): Hold {
  let hold = holds.get(id)
  if (hold === undefined) {
    hold = { hover: false, focus: false }
    holds.set(id, hold)
  }
  return hold
}

/**
 * Note le début du survol ou du focus d'une notification et arrête son compte à rebours.
 * @param id Identifiant de la notification.
 * @param kind Condition qui commence.
 */
function hold(id: number, kind: keyof Hold): void {
  holdOf(id)[kind] = true
  toasts.pause(id)
}

/**
 * Note la fin du survol ou du focus et reprend le compte à rebours si plus rien ne retient la notification.
 * @param id Identifiant de la notification.
 * @param kind Condition qui se termine.
 */
function release(id: number, kind: keyof Hold): void {
  const current = holdOf(id)
  current[kind] = false
  if (!current.hover && !current.focus) toasts.resume(id)
}

/**
 * Fin de focus : ignorée quand le focus passe à un autre élément de la même notification (de « Annuler » à la croix).
 * @param id Identifiant de la notification.
 * @param event Événement `focusout`.
 */
function onFocusOut(id: number, event: FocusEvent): void {
  const next = event.relatedTarget
  if (next instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(next)) return
  release(id, 'focus')
}

watch(
  () => toasts.items.map((t) => t.id),
  (ids) => {
    for (const id of [...holds.keys()]) if (!ids.includes(id)) holds.delete(id)
  },
)

const DEFAULT_ICONS: Record<Toast['kind'], string> = { info: 'info', success: 'check', warning: 'alert', error: 'alert' }

function iconOf(toast: Toast): string {
  return toast.icon ?? DEFAULT_ICONS[toast.kind]
}
</script>

<template>
  <div
    class="cx-toasts"
    role="region"
    aria-label="Notifications"
    aria-live="polite"
  >
    <TransitionGroup name="cx-toast-fx">
      <div
        v-for="toast in toasts.items"
        :key="toast.id"
        class="cx-toast"
        :class="`is-${toast.kind}`"
        :role="toast.kind === 'error' ? 'alert' : 'status'"
        @pointerenter="hold(toast.id, 'hover')"
        @pointerleave="release(toast.id, 'hover')"
        @focusin="hold(toast.id, 'focus')"
        @focusout="onFocusOut(toast.id, $event)"
      >
        <CxIcon :name="iconOf(toast)" />
        <span class="cx-toast-msg">{{ toast.message }}</span>
        <CxButton
          v-if="toast.action"
          variant="ghost"
          size="sm"
          @click="toasts.runAction(toast.id)"
        >
          {{ toast.action.label }}
        </CxButton>
        <CxButton
          variant="ghost"
          size="sm"
          icon-only
          icon="x"
          label="Fermer la notification"
          @click="toasts.dismiss(toast.id)"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
.cx-toasts { position: fixed; right: var(--space-6); bottom: var(--space-6); z-index: var(--z-toast); display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-2); max-width: min(480px, calc(100vw - 2 * var(--space-4))); pointer-events: none; }
.cx-toasts > * { pointer-events: auto; }
.cx-toast { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); box-shadow: var(--shadow-2); color: var(--ink); font-size: 13px; }
.cx-toast-msg { min-width: 0; overflow-wrap: anywhere; }
.cx-toast.is-success > .cx-i { color: var(--ready); }
.cx-toast.is-warning > .cx-i { color: var(--warn); }
.cx-toast.is-error > .cx-i { color: var(--danger); }
.cx-toast-fx-enter-active, .cx-toast-fx-leave-active { transition: opacity .15s ease, transform .15s ease; }
.cx-toast-fx-enter-from, .cx-toast-fx-leave-to { opacity: 0; transform: translateY(8px); }
/* Mobile : au-dessus de la barre d'onglets (56 px) et de la zone sûre de l'appareil. */
@media (max-width: 767px) {
  .cx-toasts { right: var(--space-4); left: var(--space-4); bottom: calc(56px + var(--space-3) + env(safe-area-inset-bottom, 0px)); align-items: stretch; max-width: none; }
}
</style>
