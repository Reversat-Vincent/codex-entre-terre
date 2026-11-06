// Virtualisation d'une longue liste de lignes de hauteur fixe : seules les lignes visibles (plus une marge) sont rendues, des espaceurs tiennent la place des autres.
// Utilisé par `CxDataTable` au-delà de 100 lignes (note `spec-catalog`). Aucune méthode de calculs.md : mise en page seulement.

import { onBeforeUnmount, ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

/** Ligne dépliée dont la hauteur s'ajoute à celle de la liste (détail sous une ligne). */
export interface VirtualExtra {
  /** Indice de la ligne qui porte le détail ; le détail s'insère juste après elle. */
  readonly index: number
  /** Hauteur du détail, en pixels. */
  readonly height: number
}

/** Fenêtre de rendu calculée par `virtualWindow`. */
export interface VirtualWindow {
  /** Indice de la première ligne rendue. */
  readonly start: number
  /** Indice qui suit la dernière ligne rendue. */
  readonly end: number
  /** Hauteur de l'espaceur avant les lignes rendues (lignes et détail passés). */
  readonly before: number
  /** Hauteur de l'espaceur après les lignes rendues. */
  readonly after: number
  /** Hauteur totale de la liste. */
  readonly total: number
}

/**
 * Calcule la fenêtre de lignes à rendre.
 * @param count Nombre total de lignes.
 * @param rowHeight Hauteur d'une ligne, en pixels (34 pour `CxDataTable`).
 * @param scrollTop Position de défilement du conteneur.
 * @param viewportHeight Hauteur visible du conteneur.
 * @param overscan Nombre de lignes rendues au-delà de chaque bord, pour un défilement sans blanc.
 * @param extra Détail déplié éventuel (une seule ligne à la fois) ; sa hauteur décale les lignes suivantes.
 * @returns La fenêtre `[start, end[` et les hauteurs des deux espaceurs ; `before + hauteur des lignes rendues (détail compris) + after = total`.
 */
export function virtualWindow(
  count: number,
  rowHeight: number,
  scrollTop: number,
  viewportHeight: number,
  overscan = 6,
  extra: VirtualExtra | null = null,
): VirtualWindow {
  const detail = extra && extra.index >= 0 && extra.index < count ? extra : null
  const detailHeight = detail ? detail.height : 0
  const total = count * rowHeight + detailHeight
  if (count <= 0) return { start: 0, end: 0, before: 0, after: 0, total: 0 }

  /** Hauteur du haut de la ligne `i` : le détail pousse les lignes qui le suivent. */
  const top = (i: number): number => i * rowHeight + (detail && i > detail.index ? detailHeight : 0)
  /** Indice de la ligne qui contient la position verticale `y` (dans le détail : la ligne qui le porte). */
  const rowAt = (y: number): number => {
    let adjusted = y
    if (detail) {
      const detailTop = (detail.index + 1) * rowHeight
      if (y >= detailTop) adjusted = y < detailTop + detailHeight ? detailTop - 1 : y - detailHeight
    }
    return Math.min(count - 1, Math.max(0, Math.floor(adjusted / rowHeight)))
  }

  const first = rowAt(scrollTop)
  const last = rowAt(scrollTop + Math.max(0, viewportHeight))
  const start = Math.max(0, first - overscan)
  const end = Math.min(count, last + 1 + overscan)
  return { start, end, before: top(start), after: total - top(end), total }
}

/** Valeurs et gestionnaires renvoyés par `useVirtualList`. */
export interface VirtualList {
  /** Fenêtre de rendu à jour. */
  readonly window: Ref<VirtualWindow>
  /** Conteneur défilant : à lier avec `ref` ; sa hauteur visible est suivie. */
  readonly container: Ref<HTMLElement | null>
  /** À brancher sur l'événement `scroll` du conteneur. */
  readonly onScroll: () => void
  /** Remet le défilement en haut (changement de page, de tri). */
  readonly reset: () => void
}

/**
 * Composable de virtualisation : suit le défilement et la hauteur du conteneur et tient `window` à jour.
 * Effets : un `ResizeObserver` (si disponible) observe le conteneur et est déconnecté au démontage.
 * @param count Nombre de lignes (réactif).
 * @param rowHeight Hauteur d'une ligne en pixels, fixe ou réactive (le tableau passe à 44 px sous 768 px) ; un changement recalcule la fenêtre.
 * @param extra Détail déplié (réactif) ou `null`.
 * @param overscan Lignes de marge de chaque côté.
 * @returns Le conteneur à lier, la fenêtre réactive, le gestionnaire de défilement et la remise en haut.
 */
export function useVirtualList(
  count: Ref<number>,
  rowHeight: MaybeRefOrGetter<number>,
  extra: Ref<VirtualExtra | null>,
  overscan = 6,
): VirtualList {
  const container = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)
  // Avant la première mesure, une hauteur par défaut évite une fenêtre vide.
  const viewport = ref(560)
  const result = shallowRef<VirtualWindow>(virtualWindow(count.value, toValue(rowHeight), 0, viewport.value, overscan, extra.value))

  const recompute = (): void => {
    result.value = virtualWindow(count.value, toValue(rowHeight), scrollTop.value, viewport.value, overscan, extra.value)
  }
  const measure = (): void => {
    const el = container.value
    if (!el) return
    scrollTop.value = el.scrollTop
    if (el.clientHeight > 0) viewport.value = el.clientHeight
    recompute()
  }

  let observer: ResizeObserver | null = null
  watch(
    container,
    (el) => {
      observer?.disconnect()
      observer = null
      if (el && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure)
        observer.observe(el)
      }
      measure()
    },
    { flush: 'post' },
  )
  watch([count, extra, () => toValue(rowHeight)], recompute, { deep: true })
  onBeforeUnmount(() => observer?.disconnect())

  return {
    window: result,
    container,
    onScroll: measure,
    reset: () => {
      if (container.value) container.value.scrollTop = 0
      scrollTop.value = 0
      recompute()
    },
  }
}
