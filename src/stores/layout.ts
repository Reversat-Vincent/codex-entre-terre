// Store de la disposition du tableau de bord : ordre, widgets retirés, widgets réduits sur bureau et sur mobile (docs/architecture.md § 6).

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_COLLAPSED_MOBILE, DEFAULT_WIDGET_ORDER, WIDGET_IDS } from '../widgets/ids.ts'
import type { WidgetId } from '../widgets/ids.ts'
import type { LayoutSlice } from '../persistence/model.ts'
import { useToastsStore } from './toasts.ts'

/**
 * Disposition par défaut.
 * @returns Une disposition neuve : tous les widgets affichés dans l'ordre par défaut, ceux de la série D réduits sur mobile.
 */
export function defaultLayout(): LayoutSlice {
  return { order: [...DEFAULT_WIDGET_ORDER], hidden: [], collapsed: [], collapsedMobile: [...DEFAULT_COLLAPSED_MOBILE] }
}

/**
 * Store de la disposition.
 * Actions : `move(id, indice)` (indice dans `order`), `add(id)` (réaffiche à la fin), `remove(id)`, `toggleCollapse(id, mobile)`, `isCollapsed(id, mobile)`,
 * `reset()` (avec « Annuler »), `snapshot()` et `hydrate(slice)` pour la persistance.
 */
export const useLayoutStore = defineStore('layout', () => {
  const initial = defaultLayout()
  const order = ref<WidgetId[]>(initial.order)
  const hidden = ref<WidgetId[]>(initial.hidden)
  const collapsed = ref<WidgetId[]>(initial.collapsed)
  const collapsedMobile = ref<WidgetId[]>(initial.collapsedMobile)

  function move(id: WidgetId, index: number): void {
    const from = order.value.indexOf(id)
    if (from < 0) return
    const to = Math.min(Math.max(0, Math.trunc(index)), order.value.length - 1)
    if (to === from) return
    const next = [...order.value]
    next.splice(from, 1)
    next.splice(to, 0, id)
    order.value = next
  }

  function add(id: WidgetId): void {
    if (!hidden.value.includes(id)) return
    hidden.value = hidden.value.filter((w) => w !== id)
    order.value = [...order.value, id]
  }

  function remove(id: WidgetId): void {
    if (!order.value.includes(id)) return
    order.value = order.value.filter((w) => w !== id)
    hidden.value = [...hidden.value, id]
  }

  function isCollapsed(id: WidgetId, mobile: boolean): boolean {
    return (mobile ? collapsedMobile.value : collapsed.value).includes(id)
  }

  function toggleCollapse(id: WidgetId, mobile: boolean): void {
    const target = mobile ? collapsedMobile : collapsed
    target.value = target.value.includes(id) ? target.value.filter((w) => w !== id) : [...target.value, id]
  }

  function snapshot(): LayoutSlice {
    return { order: [...order.value], hidden: [...hidden.value], collapsed: [...collapsed.value], collapsedMobile: [...collapsedMobile.value] }
  }

  function hydrate(slice: LayoutSlice): void {
    // Un widget ajouté depuis l'enregistrement du document n'est ni affiché ni retiré : il rejoint l'ordre à la fin.
    const known = new Set<WidgetId>([...slice.order, ...slice.hidden])
    order.value = [...slice.order, ...WIDGET_IDS.filter((id) => !known.has(id))]
    hidden.value = [...slice.hidden]
    collapsed.value = [...slice.collapsed]
    collapsedMobile.value = [...slice.collapsedMobile]
  }

  function reset(): void {
    const previous = snapshot()
    hydrate(defaultLayout())
    useToastsStore().undoable('Disposition réinitialisée', () => hydrate(previous), 'refresh')
  }

  return { order, hidden, collapsed, collapsedMobile, move, add, remove, isCollapsed, toggleCollapse, reset, snapshot, hydrate }
})
