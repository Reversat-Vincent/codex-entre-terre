<!-- Menu d'actions : bouton-icône qui ouvre une liste d'éléments, entièrement utilisable au clavier. -->
<script setup lang="ts">
/* eslint-disable no-undef -- la configuration ESLint ne déclare pas les globaux du navigateur pour les .vue ; le compilateur TypeScript vérifie déjà les noms. À retirer quand l'outillage aura réglé `no-undef`. */
import { nextTick, onBeforeUnmount, ref, useId, watch, type ComponentPublicInstance } from 'vue'
import CxButton from './CxButton.vue'
import CxIcon from './CxIcon.vue'
import type { MenuItem } from './types.ts'

/**
 * Menu d'actions (hors design system, styles `cx-menu` du bundle). Le déclencheur est un bouton-icône avec `aria-haspopup="menu"`.
 * Clavier : Entrée, Espace ou ↓ ouvrent sur le premier élément, ↑ sur le dernier ; ↑ ↓ naviguent en boucle (éléments inactifs ignorés),
 * Début et Fin vont aux extrémités, Échap ferme et rend le focus au déclencheur, Tab ferme. Un appui hors du menu le ferme.
 */
const props = withDefaults(
  defineProps<{
    /** Éléments du menu. */
    items: readonly MenuItem[]
    /** Nom accessible du bouton déclencheur et du menu (« Plus d'actions »). */
    label: string
    /** Icône du déclencheur (`more` par défaut). */
    icon?: string
    /** Bord auquel le menu s'aligne : `end` (à droite, défaut) ou `start`. */
    align?: 'start' | 'end'
  }>(),
  { icon: 'more', align: 'end' },
)

const emit = defineEmits<{
  /** Un élément est choisi (son identifiant) ; le menu se ferme. */
  select: [id: string]
}>()

const open = ref(false)
const menuId = useId()
const root = ref<HTMLElement | null>(null)
const trigger = ref<ComponentPublicInstance | null>(null)
const menu = ref<HTMLElement | null>(null)

function triggerElement(): HTMLElement | null {
  return (trigger.value?.$el as HTMLElement | undefined) ?? null
}

/** Éléments actifs du menu, dans l'ordre. */
function enabledButtons(): HTMLButtonElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
}

async function openMenu(focus: 'first' | 'last'): Promise<void> {
  open.value = true
  await nextTick()
  const buttons = enabledButtons()
  ;(focus === 'first' ? buttons[0] : buttons[buttons.length - 1])?.focus()
}

function close(restoreFocus: boolean): void {
  if (!open.value) return
  open.value = false
  if (restoreFocus) triggerElement()?.focus()
}

function onTriggerClick(): void {
  if (open.value) close(false)
  else void openMenu('first')
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void openMenu('first')
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    void openMenu('last')
  }
}

function onMenuKeydown(event: KeyboardEvent): void {
  const buttons = enabledButtons()
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  switch (event.key) {
    case 'ArrowDown':
      buttons[(index + 1) % buttons.length]?.focus()
      break
    case 'ArrowUp':
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus()
      break
    case 'Home':
      buttons[0]?.focus()
      break
    case 'End':
      buttons[buttons.length - 1]?.focus()
      break
    case 'Escape':
      close(true)
      break
    case 'Tab':
      close(false)
      return
    default:
      return
  }
  event.preventDefault()
}

function choose(item: MenuItem): void {
  close(true)
  emit('select', item.id)
}

function onDocumentPointerdown(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) close(false)
}
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onDocumentPointerdown)
  else document.removeEventListener('pointerdown', onDocumentPointerdown)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerdown))
</script>

<template>
  <span
    ref="root"
    class="cx-menu-wrap"
  >
    <CxButton
      ref="trigger"
      variant="ghost"
      size="sm"
      icon-only
      :icon="props.icon"
      :label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    />
    <div
      v-if="open"
      :id="menuId"
      ref="menu"
      class="cx-menu"
      :class="align"
      role="menu"
      :aria-label="label"
      @keydown="onMenuKeydown"
    >
      <template
        v-for="item in items"
        :key="item.id"
      >
        <hr
          v-if="item.separatorBefore"
          role="separator"
        >
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          :disabled="item.disabled"
          @click="choose(item)"
        >
          <CxIcon
            v-if="item.icon"
            :name="item.icon"
          />
          {{ item.label }}
        </button>
      </template>
    </div>
  </span>
</template>

<style>
.cx-menu-wrap { position: relative; display: inline-flex; }
.cx-menu { position: absolute; right: var(--space-4); top: 52px; z-index: var(--z-popover); display: flex; flex-direction: column; min-width: 200px; padding: 4px; border-radius: var(--radius-m); background: var(--surface-raised); box-shadow: var(--shadow-2); }
.cx-menu-wrap > .cx-menu { top: calc(100% + 4px); right: 0; }
.cx-menu-wrap > .cx-menu.start { left: 0; right: auto; }
.cx-menu button, .cx a.cx-menu-item { display: flex; align-items: center; gap: var(--space-2); height: 32px; padding: 0 var(--space-2); border: 0; border-radius: var(--radius-s); background: transparent; color: var(--ink); font-size: 13px; text-align: left; text-decoration: none; cursor: pointer; }
.cx-menu button:hover, .cx a.cx-menu-item:hover { background: var(--surface-hover); }
.cx-menu button:disabled { color: var(--ink-disabled); cursor: not-allowed; background: transparent; }
.cx-menu hr { width: 100%; height: 1px; margin: 4px 0; border: 0; background: var(--line); }
@media (max-width: 767px) { .cx-menu button, .cx a.cx-menu-item { height: var(--size-cible); } }
</style>
