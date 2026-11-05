<!-- Menu « Colonnes » d'un catalogue : cases à cocher dans un menu, « Colonnes par défaut », entièrement utilisable au clavier. -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import CxButton from '../../ds/CxButton.vue'
import CxIcon from '../../ds/CxIcon.vue'
import type { CatalogColumn } from './catalogModel.ts'

/**
 * Choix des colonnes affichées (design `Catalogue.dc.html`, menu « Colonnes », `role="menuitemcheckbox"`). Le nom est toujours affiché et n'est pas proposé.
 * `CxMenu` ne convient pas : son déclencheur est un bouton-icône et ses éléments des actions, alors qu'ici le libellé affiche « 8 sur 9 » et chaque élément se coche.
 * Clavier : Entrée, Espace ou ↓ ouvrent sur le premier élément ; ↑ ↓ naviguent en boucle, Début et Fin vont aux extrémités, Échap ferme et rend le focus, Tab ferme.
 * Icône `table` : le sprite n'a pas `i-cols` du design (à ajouter à `IconSprite`). Le menu reste ouvert quand on coche un élément, pour en cocher plusieurs ; un appui hors du menu le ferme.
 */
const props = defineProps<{
  /** Colonnes proposées (sans le nom), dans l'ordre du catalogue. */
  columns: readonly CatalogColumn[]
  /** Identifiants des colonnes affichées. */
  shown: readonly string[]
}>()

const emit = defineEmits<{
  /** Une colonne est cochée ou décochée. */
  toggle: [id: string]
  /** « Colonnes par défaut ». */
  reset: []
}>()

const open = ref(false)
const menuId = useId()
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const trigger = ref<{ $el: HTMLElement } | null>(null)

const shownSet = computed(() => new Set(props.shown))
/** Colonnes affichées sur le total (le nom compte). */
const summary = computed(() => `${props.columns.filter((c) => shownSet.value.has(c.id)).length + 1} sur ${props.columns.length + 1}`)

function items(): HTMLButtonElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])
}

async function openMenu(focus: 'first' | 'last'): Promise<void> {
  open.value = true
  await nextTick()
  const list = items()
  ;(focus === 'first' ? list[0] : list[list.length - 1])?.focus()
}

function close(restoreFocus: boolean): void {
  if (!open.value) return
  open.value = false
  if (restoreFocus) trigger.value?.$el.focus()
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
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLButtonElement)
  switch (event.key) {
    case 'ArrowDown':
      list[(index + 1) % list.length]?.focus()
      break
    case 'ArrowUp':
      list[(index - 1 + list.length) % list.length]?.focus()
      break
    case 'Home':
      list[0]?.focus()
      break
    case 'End':
      list[list.length - 1]?.focus()
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
      size="sm"
      icon="table"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="open ? close(false) : openMenu('first')"
      @keydown="onTriggerKeydown"
    >
      Colonnes <span class="cx-muted">{{ summary }}</span>
    </CxButton>
    <div
      v-if="open"
      :id="menuId"
      ref="menu"
      class="cx-menu cat-colmenu"
      role="menu"
      aria-label="Colonnes affichées"
      @keydown="onMenuKeydown"
    >
      <button
        v-for="column in columns"
        :key="column.id"
        type="button"
        role="menuitemcheckbox"
        tabindex="-1"
        :aria-checked="shownSet.has(column.id)"
        @click="emit('toggle', column.id)"
      >
        <CxIcon
          name="check"
          :class="{ 'cat-off': !shownSet.has(column.id) }"
        />
        {{ column.menuLabel ?? column.label }}
      </button>
      <hr role="separator">
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        @click="emit('reset')"
      >
        <CxIcon name="refresh" />
        Colonnes par défaut
      </button>
    </div>
  </span>
</template>

<style>
/* La coche reste dans la mise en page, décochée : les libellés ne bougent pas. */
.cat-colmenu { min-width: 220px; max-height: min(420px, 70vh); overflow-y: auto; }
.cat-colmenu .cat-off { visibility: hidden; }
</style>
