<!-- Hôte d'un widget du tableau de bord : enveloppe `CxWidgetShell`, état de chargement des fichiers, corps monté quand ils sont prêts. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxWidgetShell from '../components/ds/CxWidgetShell.vue'
import { useWidgetData } from '../composables/useWidgetData.ts'
import { labelText } from '../ui/explainText.ts'
import { WIDGET_BODIES } from './components.ts'
import type { WidgetId } from './ids.ts'
import { WIDGETS } from './registry.ts'
import { REORDER_ATTRIBUTE } from '../composables/useReorder.ts'

/**
 * Hôte commun des widgets (note `spec-main`, README du design system WidgetShell ; architecture § 4 et § 10.3).
 * Il donne au widget son titre et sa ligne « comment c'est calculé » (`labelText` des codes du registre), ses actions (réduire, plein écran, déplacer,
 * retirer) et son état tiré des fichiers de données : squelette tant qu'un fichier requis manque, erreur avec le fichier fautif et « Réessayer »,
 * bandeau « Données partielles » si un fichier facultatif manque. Le corps (`WIDGET_BODIES`) n'est monté que dans les états `ready` et `partial` ;
 * un widget réduit ne demande aucun fichier (économie de données sur mobile, où les widgets de la série D sont réduits au départ).
 * L'hôte ne touche pas au store de disposition : il émet les demandes, la vue du tableau de bord les applique.
 * Le placement dans la grille de 12 colonnes (classes `cx-wh-span-*`) est ici ; la grille elle-même est dans `DashboardView`.
 */
const props = defineProps<{
  /** Widget à afficher. */
  widgetId: WidgetId
  /** Réduit : seul l'en-tête reste. */
  collapsed: boolean
  /** « Déplacer vers le haut » possible. */
  canMoveUp: boolean
  /** « Déplacer vers le bas » possible. */
  canMoveDown: boolean
  /** Affiche la poignée de glisser-déposer. */
  reorderable: boolean
}>()

const emit = defineEmits<{
  /** Demande de repli ou de dépliage (nouvelle valeur). */
  'update:collapsed': [value: boolean]
  /** Ouverture du plein écran. */
  fullscreen: []
  /** Déplacement d'un cran. */
  move: [direction: 'up' | 'down']
  /** Retrait du tableau de bord. */
  remove: []
  /** Appui sur la poignée : le module de réordonnancement s'y accroche. */
  gripPointerdown: [event: PointerEvent]
}>()

const def = computed(() => WIDGETS[props.widgetId])
const title = computed(() => labelText(def.value.titleCode))
const how = computed(() => labelText(def.value.howCode))
const { state, errorFile, partialText, retry } = useWidgetData(
  () => props.widgetId,
  { active: () => !props.collapsed },
)
const body = computed(() => WIDGET_BODIES[props.widgetId])
const attrs = computed(() => ({ [REORDER_ATTRIBUTE]: props.widgetId }))
</script>

<template>
  <CxWidgetShell
    :id="`widget-${widgetId}`"
    v-bind="attrs"
    class="cx-wh"
    :class="`cx-wh-span-${def.span}`"
    :title="title"
    :how="how"
    :state="state"
    :collapsed="collapsed"
    :fullscreen="def.fullscreen"
    :reorderable="reorderable"
    :can-move-up="canMoveUp"
    :can-move-down="canMoveDown"
    :error-file="errorFile"
    :partial-text="partialText"
    @update:collapsed="emit('update:collapsed', $event)"
    @fullscreen="emit('fullscreen')"
    @move="emit('move', $event)"
    @remove="emit('remove')"
    @retry="retry"
    @grip-pointerdown="emit('gripPointerdown', $event)"
  >
    <component
      :is="body"
      mode="dashboard"
    />
  </CxWidgetShell>
</template>

<style>
/* Grille de 12 colonnes (≥ 1280 px) ; en dessous, pleine largeur (tablette) puis empilement (mobile). */
.cx-wh { grid-column: 1 / -1; }
@media (min-width: 1280px) {
  .cx-wh-span-7 { grid-column: span 7; }
  .cx-wh-span-5 { grid-column: span 5; }
}
/* Pendant un glissement : l'élément déplacé s'estompe, celui dont il prendra la place porte un contour pointillé (la forme dit la cible, pas la couleur seule). */
.cx-wh.is-dragging { opacity: .55; }
.cx-wh.is-drop-target { outline: 2px dashed var(--gold); outline-offset: 2px; }
/* Ancre `#widget-<id>` : le défilement s'arrête sous la barre supérieure collante. */
.cx-wh { scroll-margin-top: calc(var(--size-topbar) + var(--space-3)); }
</style>
