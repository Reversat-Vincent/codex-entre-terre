<!-- Onglets accessibles (rôles ARIA tablist, tab, tabpanel) avec navigation aux flèches gauche et droite. -->
<script setup lang="ts">
/* eslint-disable no-undef -- la configuration ESLint ne déclare pas les globaux du navigateur pour les .vue ; le compilateur TypeScript vérifie déjà les noms. À retirer quand l'outillage aura réglé `no-undef`. */
import { nextTick, ref, useId } from 'vue'
import type { TabItem } from './types.ts'

/**
 * Onglets d'une fiche ou d'un widget (README du design system, composant Tabs).
 * Le modèle est l'identifiant de l'onglet actif. ← et → passent à l'onglet voisin (en boucle), Début et Fin vont aux extrémités ;
 * seul l'onglet actif est dans l'ordre de tabulation. Le slot par défaut, s'il est fourni, rend le contenu de l'onglet actif
 * dans un unique `tabpanel` relié à l'onglet par `aria-labelledby` ; le slot `tab` personnalise l'intérieur d'un onglet.
 * Un boss à une seule rencontre n'a pas d'onglets : ne pas utiliser le composant dans ce cas.
 */
const props = defineProps<{
  /** Onglets, dans l'ordre d'affichage. */
  items: readonly TabItem[]
  /** Nom accessible de la liste d'onglets (« Rencontres »). */
  label: string
}>()

/** Identifiant de l'onglet actif. */
const model = defineModel<string>({ required: true })

defineSlots<{
  /** Contenu du panneau de l'onglet actif. */
  default?(props: { item: TabItem }): unknown
  /** Intérieur d'un onglet (libellé, note, badge). */
  tab?(props: { item: TabItem; selected: boolean }): unknown
}>()

const uid = useId()
const list = ref<HTMLElement | null>(null)
const tabId = (id: string): string => `${uid}-tab-${id}`
const panelId = `${uid}-panel`

function activeItem(): TabItem | undefined {
  return props.items.find((item) => item.id === model.value)
}

/** Sélectionne l'onglet d'indice `index` (en boucle) et lui donne le focus. */
async function select(index: number): Promise<void> {
  const count = props.items.length
  const item = props.items[((index % count) + count) % count]
  if (!item) return
  model.value = item.id
  await nextTick()
  list.value?.querySelector<HTMLElement>(`[id="${tabId(item.id)}"]`)?.focus()
}

function onKeydown(event: KeyboardEvent): void {
  const current = props.items.findIndex((item) => item.id === model.value)
  const targets: Record<string, number> = {
    ArrowRight: current + 1,
    ArrowLeft: current - 1,
    Home: 0,
    End: props.items.length - 1,
  }
  const target = targets[event.key]
  if (target === undefined || props.items.length === 0) return
  event.preventDefault()
  void select(target)
}
</script>

<template>
  <div class="cx-tabset">
    <div
      ref="list"
      class="cx-tabs"
      role="tablist"
      :aria-label="label"
      @keydown="onKeydown"
    >
      <button
        v-for="item in items"
        :id="tabId(item.id)"
        :key="item.id"
        type="button"
        class="cx-tab"
        role="tab"
        :aria-selected="item.id === model"
        :aria-controls="$slots.default ? panelId : undefined"
        :tabindex="item.id === model ? 0 : -1"
        @click="model = item.id"
      >
        <slot
          name="tab"
          :item="item"
          :selected="item.id === model"
        >
          {{ item.label }}<template v-if="item.note">
            <span class="cx-tab-n">{{ item.note }}</span>
          </template>
        </slot>
      </button>
    </div>
    <div
      v-if="$slots.default && activeItem()"
      :id="panelId"
      role="tabpanel"
      tabindex="0"
      :aria-labelledby="tabId(model)"
    >
      <slot :item="activeItem()!" />
    </div>
  </div>
</template>

<style>
.cx-tabs { display: flex; flex-wrap: wrap; gap: var(--space-1); border-bottom: 1px solid var(--line-strong); }
.cx-tab { display: inline-flex; align-items: center; gap: 6px; height: 38px; margin-bottom: -1px; padding: 0 var(--space-3); border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--ink-2); font-size: 14px; font-weight: 600; cursor: pointer; }
.cx-tab:hover { color: var(--ink); }
.cx-tab[aria-selected="true"] { border-bottom-color: var(--gold); color: var(--ink); }
.cx-tab .cx-tab-n { color: var(--ink-3); font-weight: 500; font-size: 12px; }
.cx-tabset > [role="tabpanel"] { padding-top: var(--space-3); }
@media (max-width: 767px) { .cx-tab { height: var(--size-cible); } }
</style>
