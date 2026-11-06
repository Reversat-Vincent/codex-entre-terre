// Correspondance identifiant de widget → composant Vue : corps des widgets et vues plein écran dédiées, chargés à la demande.
// Le registre `registry.ts` reste sans Vue (utilisable sous Node) ; l'interface fait ici la liaison (docs/architecture.md § 10.3).

import { defineAsyncComponent, h } from 'vue'
import type { Component } from 'vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import type { WidgetId } from './ids.ts'

/** Affiché pendant le chargement du code d'un corps (quelques ms en ligne, plus après une mise à jour hors ligne). */
const BodyLoading: Component = {
  name: 'WidgetBodyLoading',
  render: () => h(CxSkeleton, { width: '60%', height: 14 }),
}

/** Affiché si le code d'un corps ne se charge pas (hors ligne avant le premier chargement, par exemple). */
const BodyFailed: Component = {
  name: 'WidgetBodyFailed',
  render: () =>
    h(CxNote, { tone: 'warn', role: 'alert', title: 'Ce widget n’a pas pu être chargé.' }, () => 'Vérifiez votre connexion, puis rechargez la page.'),
}

/**
 * Enveloppe un chargeur de composant : un fichier JavaScript par widget, un squelette puis un message en cas d'échec.
 * @param loader Import dynamique du fichier `.vue`.
 * @returns Le composant asynchrone.
 */
function lazy(loader: () => Promise<{ default: Component }>): Component {
  return defineAsyncComponent({ loader, loadingComponent: BodyLoading, errorComponent: BodyFailed, delay: 150 })
}

/**
 * Corps de chaque widget. Contrat : une propriété `mode` (`WidgetMode`), aucun événement ; monté par `WidgetHost` ou par la vue plein écran
 * seulement quand les fichiers `requires` du registre sont lus. Chaque fichier est remplacé par la tâche qui construit le widget.
 */
export const WIDGET_BODIES: Readonly<Record<WidgetId, Component>> = {
  'weapons-by-stage': lazy(() => import('./WeaponsByStageWidget.vue')),
  'optimal-origin': lazy(() => import('./OptimalOriginWidget.vue')),
  'boss-order': lazy(() => import('./BossOrderWidget.vue')),
  'weakness-matrix': lazy(() => import('./WeaknessMatrixWidget.vue')),
  'upgrade-plan': lazy(() => import('./UpgradePlanWidget.vue')),
  'rune-calculator': lazy(() => import('./RuneCalculatorWidget.vue')),
  'attribute-yield': lazy(() => import('./AttributeYieldWidget.vue')),
  'data-coverage': lazy(() => import('./DataCoverageWidget.vue')),
}

/**
 * Vues plein écran dédiées, pour les widgets dont le plein écran n'est pas le simple corps en mode `fullscreen` (aiguillage de `WidgetFullscreenView`).
 * Seul le widget A en a une (`WeaponsFullscreenView`, note `spec-full`). Une vue dédiée se place dans la page sous les puces de critères, que la vue
 * générique affiche déjà ; elle utilise `WidgetFullscreenFrame` pour l'en-tête, « Quitter le plein écran », Échap et les états de chargement.
 */
export const FULLSCREEN_VIEWS: Readonly<Partial<Record<WidgetId, Component>>> = {
  'weapons-by-stage': lazy(() => import('./WeaponsFullscreenView.vue')),
}
