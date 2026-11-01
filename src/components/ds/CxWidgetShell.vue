<!-- Enveloppe commune des widgets du tableau de bord : titre, ligne « comment c'est calculé », actions, corps selon l'état, pied. -->
<script setup lang="ts">
import { computed, useId } from 'vue'
import CxButton from './CxButton.vue'
import CxEmptyState from './CxEmptyState.vue'
import CxIcon from './CxIcon.vue'
import CxMenu from './CxMenu.vue'
import CxNote from './CxNote.vue'
import CxSkeleton from './CxSkeleton.vue'
import type { EmptyAction, MenuItem, WidgetState } from './types.ts'

/**
 * Enveloppe d'un widget (README du design system, composant WidgetShell). Aucun store : l'état, le repli et les
 * possibilités de déplacement viennent des propriétés, les demandes de l'utilisateur sortent par événements.
 * États : `ready` (contenu), `loading` (squelettes), `empty` (état vide avec actions d'élargissement),
 * `partial` (contenu précédé d'un bandeau « Données partielles »), `error` (fichier fautif nommé et « Réessayer »).
 * Actions : Réduire / Déplier, Plein écran (si le widget a une vue détaillée), et le menu « Plus d'actions »
 * (déplacer vers le haut ou le bas, retirer) qui est aussi la voie clavier du réordonnancement.
 * Slots : par défaut (contenu), `foot` (pied : badge Calculé, fréquence de recalcul…).
 */
const props = withDefaults(
  defineProps<{
    /** Titre du widget (français). */
    title: string
    /** Comment c'est calculé, en une phrase, sous le titre. */
    how?: string
    /** État du widget. */
    state?: WidgetState
    /** Réduit : seul l'en-tête reste. */
    collapsed?: boolean
    /** Le widget a une vue plein écran : affiche le bouton « Plein écran ». */
    fullscreen?: boolean
    /** Affiche la poignée de réordonnancement (glisser-déposer au pointeur). */
    reorderable?: boolean
    /** « Déplacer vers le haut » possible (faux pour le premier widget). */
    canMoveUp?: boolean
    /** « Déplacer vers le bas » possible (faux pour le dernier widget). */
    canMoveDown?: boolean
    /** Titre de l'état vide (ce qui manque). */
    emptyTitle?: string
    /** Explication de l'état vide (pourquoi). */
    emptyText?: string
    /** Actions d'élargissement de l'état vide. */
    emptyActions?: readonly EmptyAction[]
    /** Texte du bandeau de l'état partiel : combien d'entrées manquent et comment elles apparaissent. */
    partialText?: string
    /** Nom du fichier de données fautif, affiché dans l'état d'erreur (`bosses.json`). */
    errorFile?: string
  }>(),
  {
    how: undefined,
    state: 'ready',
    collapsed: false,
    fullscreen: false,
    reorderable: true,
    canMoveUp: true,
    canMoveDown: true,
    emptyTitle: 'Aucun résultat pour vos critères',
    emptyText: undefined,
    emptyActions: undefined,
    partialText: undefined,
    errorFile: undefined,
  },
)

const emit = defineEmits<{
  /** Demande de repli ou de dépliage (nouvelle valeur de `collapsed`). */
  'update:collapsed': [value: boolean]
  /** Ouverture de la vue plein écran. */
  fullscreen: []
  /** Demande de déplacement d'un cran. */
  move: [direction: 'up' | 'down']
  /** Retrait du widget du tableau de bord. */
  remove: []
  /** Nouvelle tentative après une erreur de chargement. */
  retry: []
  /** Action d'élargissement choisie dans l'état vide (identifiant de l'action). */
  emptyAction: [id: string]
  /** Début d'un appui sur la poignée : le module de réordonnancement s'y accroche. */
  gripPointerdown: [event: PointerEvent]
}>()

const titleId = useId()
const menuItems = computed<MenuItem[]>(() => [
  { id: 'move-up', label: 'Déplacer vers le haut', icon: 'chev-u', disabled: !props.canMoveUp },
  { id: 'move-down', label: 'Déplacer vers le bas', icon: 'chev-d', disabled: !props.canMoveDown },
  { id: 'remove', label: 'Retirer du tableau de bord', icon: 'x', separatorBefore: true },
])

function onMenuSelect(id: string): void {
  if (id === 'move-up') emit('move', 'up')
  else if (id === 'move-down') emit('move', 'down')
  else if (id === 'remove') emit('remove')
}
</script>

<template>
  <section
    class="cx-widget"
    :aria-labelledby="titleId"
    :aria-busy="state === 'loading' ? 'true' : undefined"
  >
    <div class="cx-w-head">
      <span
        v-if="reorderable"
        class="cx-w-grip"
        title="Glisser pour réordonner"
        @pointerdown="emit('gripPointerdown', $event)"
      >
        <CxIcon name="grip" />
      </span>
      <div class="cx-w-titles">
        <h2
          :id="titleId"
          class="cx-w-title"
        >
          {{ title }}
        </h2>
        <p
          v-if="how"
          class="cx-w-how"
        >
          <CxIcon
            name="calc"
            size="sm"
          />{{ how }}
        </p>
      </div>
      <div class="cx-w-actions">
        <CxButton
          variant="ghost"
          size="sm"
          icon-only
          :icon="collapsed ? 'chev-d' : 'chev-u'"
          :label="collapsed ? 'Déplier' : 'Réduire'"
          :aria-expanded="!collapsed"
          @click="emit('update:collapsed', !collapsed)"
        />
        <CxButton
          v-if="fullscreen"
          variant="ghost"
          size="sm"
          icon-only
          icon="max"
          label="Plein écran"
          @click="emit('fullscreen')"
        />
        <CxMenu
          :items="menuItems"
          label="Plus d'actions"
          @select="onMenuSelect"
        />
      </div>
    </div>

    <template v-if="!collapsed">
      <div
        v-if="state === 'loading'"
        class="cx-w-body"
      >
        <div
          class="cx-loading"
          aria-hidden="true"
        >
          <CxSkeleton
            width="40%"
            :height="18"
          />
          <CxSkeleton
            width="70%"
            :height="12"
          />
          <CxSkeleton
            width="55%"
            :height="12"
          />
        </div>
        <span
          class="cx-sr"
          role="status"
        >Chargement en cours</span>
      </div>

      <div
        v-else-if="state === 'empty'"
        class="cx-w-body"
      >
        <CxEmptyState
          :title="emptyTitle"
          :text="emptyText"
          :actions="emptyActions"
          @action="emit('emptyAction', $event)"
        />
      </div>

      <div
        v-else-if="state === 'error'"
        class="cx-w-body"
      >
        <CxNote
          tone="warn"
          role="alert"
          :title="errorFile ? `Impossible de lire ${errorFile}.` : 'Impossible de charger les données de ce widget.'"
        >
          <span>Réessayez. Si l'erreur persiste, le fichier est peut-être incomplet : réinstallez les données.</span>
          <div class="cx-row cx-w-retry">
            <CxButton
              size="sm"
              icon="refresh"
              @click="emit('retry')"
            >
              Réessayer
            </CxButton>
          </div>
        </CxNote>
      </div>

      <div
        v-else
        class="cx-w-body"
      >
        <CxNote
          v-if="state === 'partial'"
          tone="partial"
          title="Données partielles."
        >
          {{ partialText }}
        </CxNote>
        <slot />
      </div>

      <div
        v-if="$slots.foot"
        class="cx-w-foot"
      >
        <slot name="foot" />
      </div>
    </template>
  </section>
</template>

<style>
.cx-widget { position: relative; display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface); box-shadow: var(--shadow-1); }
.cx-w-head { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4) var(--space-5) var(--space-3); }
.cx-w-grip { margin-top: 5px; color: var(--ink-3); cursor: grab; touch-action: none; }
.cx-w-titles { flex: 1 1 auto; min-width: 0; }
.cx-w-title { margin: 0; color: var(--ink); font: 600 22px/28px var(--font-display); }
.cx-w-how { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 2px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-w-actions { display: flex; align-items: center; gap: 2px; flex: none; }
.cx-w-body { min-width: 0; padding: 0 var(--space-5) var(--space-5); }
.cx-w-body > .cx-note { margin-bottom: var(--space-3); }
.cx-w-foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-5); border-top: 1px solid var(--line); color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-w-retry { margin-top: var(--space-2); }
</style>
