// Identifiants des widgets du tableau de bord et leur ordre par défaut (docs/architecture.md § 10.3).
// Module sans dépendance : la persistance valide la disposition avec ces listes et le registre `registry.ts` les réutilisera.

/** Identifiants des widgets, dans l'ordre d'affichage par défaut. */
export const WIDGET_IDS = [
  'weapons-by-stage',
  'optimal-origin',
  'boss-order',
  'weakness-matrix',
  'upgrade-plan',
  'rune-calculator',
  'attribute-yield',
  'data-coverage',
] as const

/** Identifiant d'un widget. */
export type WidgetId = (typeof WIDGET_IDS)[number]

/**
 * Ordre par défaut : celui du prototype (A, B, C, D1, D2, D5, D8) avec `attribute-yield` inséré pour compléter les rangées de 12 colonnes
 * (plan d'amélioration 7 + calculateur de runes 5, puis rendement 7 + couverture 5).
 */
export const DEFAULT_WIDGET_ORDER: readonly WidgetId[] = WIDGET_IDS

/** Widgets réduits par défaut sur mobile : tous ceux de la série D (architecture § 6, `collapsedMobile`). */
export const DEFAULT_COLLAPSED_MOBILE: readonly WidgetId[] = [
  'weakness-matrix',
  'upgrade-plan',
  'rune-calculator',
  'attribute-yield',
  'data-coverage',
]

/**
 * Indique si une valeur est un identifiant de widget.
 * @param value Valeur à tester.
 * @returns Vrai pour un identifiant connu.
 */
export function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === 'string' && (WIDGET_IDS as readonly string[]).includes(value)
}
