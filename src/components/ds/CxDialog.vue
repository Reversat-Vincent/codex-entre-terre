<!-- Fenêtre modale fondée sur l'élément natif <dialog> : focus piégé par le navigateur, Échap pour fermer, focus rendu à la fermeture. -->
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import CxButton from './CxButton.vue'

/**
 * Fenêtre modale (hors design system : confirmations, import, aide). Utilise `showModal()` du `<dialog>` natif, qui rend le reste
 * de la page inerte et gère Échap ; le composant ajoute la fermeture au clic sur le voile et rend le focus à l'élément
 * qui l'avait avant l'ouverture. Le contenu n'est monté que pendant l'ouverture.
 * Slots : par défaut (corps), `footer` (actions, le bouton principal en dernier).
 */
const props = withDefaults(
  defineProps<{
    /** Titre, relié au dialogue par `aria-labelledby`. */
    title: string
    /** Libellé accessible du bouton de fermeture. */
    closeLabel?: string
    /** Ferme au clic sur le voile (vrai par défaut ; faux pour une confirmation qui exige un choix explicite). */
    closeOnBackdrop?: boolean
  }>(),
  { closeLabel: 'Fermer', closeOnBackdrop: true },
)

/** Ouverte ou fermée. */
const open = defineModel<boolean>({ default: false })

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
let previousFocus: HTMLElement | null = null

function sync(): void {
  const el = dialog.value
  if (!el) return
  if (open.value && !el.open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    el.showModal()
  } else if (!open.value && el.open) {
    el.close()
  }
}

// `post` : le contenu doit être monté avant `showModal()` pour que le navigateur place le focus dans la fenêtre.
watch(open, () => void nextTick(sync), { flush: 'post' })
onMounted(sync)

/** Fermeture native (Échap ou `close()`) : on aligne le modèle et on rend le focus. */
function onClose(): void {
  open.value = false
  if (previousFocus?.isConnected) previousFocus.focus()
  previousFocus = null
}

/** Le voile est le <dialog> lui-même (sans marge interne) : un clic dont la cible est le dialogue est un clic à l'extérieur du contenu. */
function onClick(event: MouseEvent): void {
  if (props.closeOnBackdrop && event.target === dialog.value) dialog.value?.close()
}

onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="cx-dialog"
    :aria-labelledby="titleId"
    @close="onClose"
    @click="onClick"
  >
    <div
      v-if="open"
      class="cx-dialog-box"
    >
      <div class="cx-dialog-head">
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
          @click="open = false"
        />
      </div>
      <div class="cx-dialog-body">
        <slot />
      </div>
      <div
        v-if="$slots.footer"
        class="cx-dialog-foot"
      >
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>

<style>
.cx-dialog { width: min(560px, calc(100vw - 2 * var(--space-4))); max-height: calc(100vh - 2 * var(--space-6)); max-height: calc(100dvh - 2 * var(--space-6)); padding: 0; border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface-raised); color: var(--ink); box-shadow: var(--shadow-3); overflow: hidden; }
.cx-dialog[open] { display: flex; }
.cx-dialog::backdrop { background: var(--scrim); }
.cx-dialog-box { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; }
.cx-dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-5) var(--space-3); }
.cx-dialog-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 var(--space-5) var(--space-4); color: var(--ink-2); font-size: 14px; line-height: 20px; }
.cx-dialog-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-5); border-top: 1px solid var(--line); }
</style>
