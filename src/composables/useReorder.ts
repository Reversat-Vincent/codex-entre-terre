// Composable `useReorder` : réordonnancement par glisser avec la poignée d'un élément, aux Pointer Events (souris, tactile, stylet).
// Il ne connaît ni les widgets ni le store : l'appelant donne l'ordre courant et reçoit l'élément déplacé avec son nouvel indice.
// L'équivalent au clavier est le menu « Déplacer vers le haut / le bas » de chaque widget (README du design system, WidgetShell).

import { getCurrentScope, onScopeDispose, ref } from 'vue'
import type { Ref } from 'vue'

/** Attribut des éléments déplaçables : sa valeur est l'identifiant de l'élément. */
export const REORDER_ATTRIBUTE = 'data-reorder-id'

/** Distance (px) au bord de la fenêtre à partir de laquelle la page défile pendant un glissement. */
const SCROLL_EDGE = 72

/** Vitesse maximale du défilement automatique, en px par image. */
const SCROLL_MAX_STEP = 18

/** Rectangle d'un élément déplaçable, en coordonnées de la fenêtre. */
export interface ReorderRect {
  readonly id: string
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/**
 * Cherche l'élément sous un point.
 * @param rects Rectangles des éléments, dans l'ordre d'affichage.
 * @param x Abscisse du pointeur (fenêtre).
 * @param y Ordonnée du pointeur (fenêtre).
 * @returns L'identifiant de l'élément qui contient le point, ou `null` (point dans une gouttière ou hors de la grille).
 */
export function itemAt(rects: readonly ReorderRect[], x: number, y: number): string | null {
  const hit = rects.find((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
  return hit?.id ?? null
}

/**
 * Pas de défilement vertical pour un pointeur proche d'un bord de la fenêtre.
 * @param y Ordonnée du pointeur (fenêtre).
 * @param height Hauteur de la fenêtre.
 * @returns Un pas négatif près du haut, positif près du bas (proportionnel à la proximité du bord), 0 ailleurs.
 */
export function scrollStep(y: number, height: number): number {
  if (y < SCROLL_EDGE) return -Math.ceil(SCROLL_MAX_STEP * Math.min(1, (SCROLL_EDGE - y) / SCROLL_EDGE))
  if (y > height - SCROLL_EDGE) return Math.ceil(SCROLL_MAX_STEP * Math.min(1, (y - (height - SCROLL_EDGE)) / SCROLL_EDGE))
  return 0
}

/** Paramètres de `useReorder`. */
export interface ReorderOptions {
  /** Élément qui contient les éléments déplaçables (repérés par `data-reorder-id`). */
  container: Ref<HTMLElement | null>
  /** Ordre courant des identifiants. */
  order: () => readonly string[]
  /** Appelée au relâchement sur un autre élément : l'élément déplacé et l'indice (dans `order`) qu'il doit occuper. */
  onMove: (id: string, toIndex: number) => void
}

/** Valeur renvoyée par `useReorder`. */
export interface ReorderState {
  /** Identifiant de l'élément en cours de glissement, ou `null`. */
  draggingId: Ref<string | null>
  /** Identifiant de l'élément survolé, dont l'emplacement sera pris au relâchement, ou `null`. */
  overId: Ref<string | null>
  /** À brancher sur l'appui de la poignée (`pointerdown`) de l'élément `id`. */
  start: (id: string, event: PointerEvent) => void
  /** Abandonne le glissement en cours sans rien déplacer (Échap, perte du pointeur). */
  cancel: () => void
}

/**
 * Gère le glissement d'un élément par sa poignée.
 * Au `pointerdown`, l'écoute passe à la fenêtre : `pointermove` désigne l'élément survolé, `pointerup` déplace l'élément vers celui déjà désigné
 * (relâcher hors d'un élément ne déplace rien), Échap et `pointercancel` abandonnent. Près du haut ou du bas de la fenêtre, la page défile.
 * Les écouteurs sont retirés à la fin du glissement et à la destruction de la portée de l'appelant.
 * @param options Conteneur, ordre courant et action de déplacement.
 * @returns L'état du glissement (pour les styles) et ses deux actions.
 */
export function useReorder(options: ReorderOptions): ReorderState {
  const draggingId = ref<string | null>(null)
  const overId = ref<string | null>(null)
  let pointer = { x: 0, y: 0 }
  let frame = 0

  function rects(): ReorderRect[] {
    const root = options.container.value
    if (root === null) return []
    return Array.from(root.querySelectorAll<HTMLElement>(`[${REORDER_ATTRIBUTE}]`)).map((el) => {
      const box = el.getBoundingClientRect()
      return { id: el.getAttribute(REORDER_ATTRIBUTE) ?? '', left: box.left, top: box.top, right: box.right, bottom: box.bottom }
    })
  }

  /** Met à jour l'élément survolé ; une gouttière garde la désignation précédente pour que la cible ne clignote pas. */
  function locate(): void {
    const hit = itemAt(rects(), pointer.x, pointer.y)
    if (hit === null) return
    overId.value = hit === draggingId.value ? null : hit
  }

  function onPointerMove(event: PointerEvent): void {
    pointer = { x: event.clientX, y: event.clientY }
    locate()
  }

  /** Défilement automatique : une image à la fois tant que le glissement dure et que le pointeur reste près d'un bord. */
  function tick(): void {
    const step = scrollStep(pointer.y, window.innerHeight)
    if (step !== 0) {
      window.scrollBy(0, step)
      locate()
    }
    frame = window.requestAnimationFrame(tick)
  }

  function stop(): void {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', onKey)
    if (frame !== 0) window.cancelAnimationFrame(frame)
    frame = 0
    draggingId.value = null
    overId.value = null
  }

  function onPointerUp(): void {
    const id = draggingId.value
    const target = overId.value
    stop()
    if (id === null || target === null) return
    const to = options.order().indexOf(target)
    if (to >= 0) options.onMove(id, to)
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    event.preventDefault()
    cancel()
  }

  function cancel(): void {
    stop()
  }

  function start(id: string, event: PointerEvent): void {
    // Seul le bouton principal de la souris glisse ; un tactile ou un stylet a aussi `button` à 0.
    if (event.button !== 0 || draggingId.value !== null) return
    // Évite la sélection de texte et le glisser natif pendant le geste.
    event.preventDefault()
    pointer = { x: event.clientX, y: event.clientY }
    draggingId.value = id
    overId.value = null
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKey)
    frame = window.requestAnimationFrame(tick)
  }

  if (getCurrentScope()) onScopeDispose(stop)
  return { draggingId, overId, start, cancel }
}
