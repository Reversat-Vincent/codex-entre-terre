// Types communs aux corps de widgets : le mode d'affichage et les propriétés que `WidgetHost` et la vue plein écran leur transmettent.

/** Mode d'affichage d'un corps de widget : dans la grille du tableau de bord, ou en plein écran (`/plein-ecran/:widgetId`). */
export type WidgetMode = 'dashboard' | 'fullscreen'

/**
 * Propriétés d'un corps de widget (`src/widgets/<Nom>Widget.vue`). C'est la seule propriété transmise : le corps lit ses données dans les stores
 * (`analysis`, `criteria`, `data`…) et gère lui-même ses états vides. Il n'émet aucun événement.
 */
export interface WidgetBodyProps {
  /** `dashboard` : version compacte de la grille ; `fullscreen` : version détaillée (seulement pour les widgets du registre marqués `fullscreen`). */
  mode: WidgetMode
}
