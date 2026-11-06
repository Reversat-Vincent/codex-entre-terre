// Points de rupture de l'interface (architecture § 10.1) : constantes partagées par `useBreakpoint` et par la coquille.
// Les media queries CSS les écrivent en dur (une variable CSS ne peut pas servir dans `@media`) ; ce module reste la référence.

/** Largeur maximale (en px, incluse) du mode mobile : en dessous de 768 px. */
export const MOBILE_MAX = 767

/** Largeur maximale (en px, incluse) du mode tablette : de 768 à 1279 px. Au-delà, desktop. */
export const TABLET_MAX = 1279

/** Largeur minimale (en px) à partir de laquelle la barre latérale reste dépliée quand les critères sont ouverts. */
export const WIDE_MIN = 1600

/** Mode d'affichage : mobile (< 768 px), tablette (768 à 1279 px) ou desktop (≥ 1280 px). */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Media queries correspondant aux points de rupture, utilisables avec `window.matchMedia`. */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${MOBILE_MAX}px)`,
  tablet: `(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`,
  desktop: `(min-width: ${TABLET_MAX + 1}px)`,
  wide: `(min-width: ${WIDE_MIN}px)`,
} as const

/**
 * Donne le mode d'affichage correspondant à une largeur de fenêtre.
 * @param width largeur en pixels CSS
 * @returns `mobile` jusqu'à 767 px, `tablet` jusqu'à 1279 px, sinon `desktop`
 */
export function breakpointOf(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return 'mobile'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}
