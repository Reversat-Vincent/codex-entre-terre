<!-- Ressources externes du rail de navigation : un seul bouton qui ouvre la liste des liens (cartes, guides), au lieu d'une icône par lien. -->
<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import CxIcon from '../ds/CxIcon.vue'
import type { ResourceLink } from './AppSideNav.vue'

/**
 * Menu des ressources en mode rail (vérification, tour 1 : sept icônes identiques ne disent rien de leur destination).
 * Motif de « divulgation » : un bouton `aria-expanded` dont le panneau contient de vrais liens `a` (ordre de tabulation naturel, pas de rôle `menu`).
 * Échap ferme et rend le focus au bouton ; un appui hors du composant, la sortie du focus, un défilement ou un redimensionnement ferment aussi.
 * Le panneau est en `position: fixed`, placé d'après le bouton à l'ouverture : la barre latérale défile (`overflow-y: auto`) et rognerait un panneau absolu.
 */
defineProps<{
  /** Liens externes, déjà libellés ; chacun s'ouvre dans un nouvel onglet. */
  resources: readonly ResourceLink[]
}>()

const open = ref(false)
const panelId = useId()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

/** Place le panneau à droite du bouton, son bord bas aligné sur celui du bouton, sans sortir de la fenêtre par le haut. */
function place(): void {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  panelStyle.value = {
    left: `${Math.round(rect.right + 8)}px`,
    bottom: `${Math.max(8, Math.round(window.innerHeight - rect.bottom))}px`,
    maxHeight: `${Math.round(window.innerHeight - 16)}px`,
  }
}

/**
 * Ferme le panneau.
 * @param restoreFocus Rend le focus au bouton (Échap) ; faux quand le focus part ailleurs de lui-même.
 */
function close(restoreFocus: boolean): void {
  if (!open.value) return
  open.value = false
  if (restoreFocus) trigger.value?.focus()
}

/** Ouvre ou ferme le panneau ; à l'ouverture, le focus reste sur le bouton (les liens suivent dans l'ordre de tabulation). */
function toggle(): void {
  if (open.value) {
    close(false)
    return
  }
  place()
  open.value = true
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close(true)
  }
}

function onFocusout(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next && root.value?.contains(next)) return
  close(false)
}

function onDocumentPointerdown(event: Event): void {
  if (root.value && !root.value.contains(event.target as Node)) close(false)
}

const onAway = (): void => close(false)

watch(open, (isOpen) => {
  const action = isOpen ? 'addEventListener' : 'removeEventListener'
  document[action]('pointerdown', onDocumentPointerdown)
  document[action]('scroll', onAway, true)
  window[action]('resize', onAway)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerdown)
  document.removeEventListener('scroll', onAway, true)
  window.removeEventListener('resize', onAway)
})
</script>

<template>
  <div
    ref="root"
    class="cx-res"
    @keydown="onKeydown"
    @focusout="onFocusout"
  >
    <button
      ref="trigger"
      type="button"
      class="cx-nav-item cx-nav-btn"
      title="Ressources externes"
      :aria-expanded="open"
      :aria-controls="open ? panelId : undefined"
      @click="toggle"
    >
      <CxIcon name="ext" />
      <span class="cx-nav-text">Ressources</span>
    </button>
    <div
      v-if="open"
      :id="panelId"
      class="cx-res-pop"
      role="group"
      aria-label="Ressources externes"
      :style="panelStyle"
    >
      <a
        v-for="link in resources"
        :key="link.href"
        class="cx-res-link"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        @click="close(false)"
      >
        <span>{{ link.label }}</span>
        <CxIcon
          name="ext"
          size="sm"
        />
        <span class="cx-sr">(s'ouvre dans un nouvel onglet)</span>
      </a>
    </div>
  </div>
</template>

<style>
.cx-res { display: flex; justify-content: center; width: 100%; }
.cx-res-pop { position: fixed; z-index: var(--z-popover); display: flex; flex-direction: column; width: 280px; padding: 4px; overflow-y: auto; border-radius: var(--radius-m); background: var(--surface-raised); box-shadow: var(--shadow-2); }
.cx a.cx-res-link { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 36px; padding: 6px var(--space-2); border-radius: var(--radius-s); color: var(--ink); font-size: 13px; line-height: 18px; text-decoration: none; }
.cx a.cx-res-link:hover { background: var(--surface-hover); }
.cx-res-link .cx-i { color: var(--ink-3); }
</style>
