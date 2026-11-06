<!-- Écran « Tableau de bord » : puces de critères, grille de widgets (réduire, plein écran, déplacer, retirer) et menu « Ajouter un widget ». -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import CriteriaChipsBar from '../components/criteria/CriteriaChipsBar.vue'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import { useBreakpoint } from '../composables/useBreakpoint.ts'
import { useReorder } from '../composables/useReorder.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { useLayoutStore } from '../stores/layout.ts'
import { useProfilesStore } from '../stores/profiles.ts'
import { useToastsStore } from '../stores/toasts.ts'
import { labelText } from '../ui/explainText.ts'
import { formatInt } from '../ui/format.ts'
import { STAGE_LABELS } from '../ui/labels.ts'
import type { WidgetId } from '../widgets/ids.ts'
import { WIDGETS } from '../widgets/registry.ts'
import WidgetHost from '../widgets/WidgetHost.vue'

/**
 * Tableau de bord (architecture § 9 et § 10.3 ; notes `spec-main` et `spec-mobile`). La grille est de 12 colonnes sur desktop (largeurs du registre :
 * 12, 7 ou 5), en pleine largeur sur tablette, en pile sur mobile où les widgets de la série D sont réduits au départ. Toute modification de la
 * disposition passe par le store `layout` (enregistré localement) :
 * - réduire (état distinct pour mobile), retirer (avec « Annuler » 5 s, le widget reprend sa place), ajouter (menu des widgets retirés), réinitialiser ;
 * - déplacer : « Déplacer vers le haut / bas » du menu de chaque widget (voie clavier, annoncée dans une région `aria-live`), ou glisser avec la poignée
 *   (`useReorder`, Pointer Events ; masquée sur mobile où le menu suffit) : le widget prend l'emplacement de celui sur lequel il est relâché ;
 * - plein écran : ouvre `/plein-ecran/:widgetId`.
 * Le sous-titre rappelle le niveau et l'étape courante : valeurs lues dans le store `analysis`, aucun calcul ici.
 */
const layout = useLayoutStore()
const analysis = useAnalysisStore()
const profiles = useProfilesStore()
const toasts = useToastsStore()
const router = useRouter()
const { isMobile } = useBreakpoint()

const grid = ref<HTMLElement | null>(null)
const addToggle = ref<InstanceType<typeof CxButton> | null>(null)
const addRoot = ref<HTMLElement | null>(null)
const addOpen = ref(false)
const addPanelId = useId()
/** Dernier message annoncé aux lecteurs d'écran (déplacement, retrait, ajout). */
const announcement = ref('')

const titleOf = (id: WidgetId): string => labelText(WIDGETS[id].titleCode)

const subtitle = computed(() => {
  const parts: string[] = []
  if (profiles.active !== null) parts.push(`Profil « ${profiles.active.name} »`)
  const level = analysis.level.value
  if (level !== null) parts.push(`niveau ${formatInt(level)}`)
  const stage = analysis.stage.value
  if (stage !== null) parts.push(`étape ${STAGE_LABELS[stage]}`)
  return parts.length === 0 ? 'Vos critères recalculent tous les widgets.' : `${parts.join(', ')}.`
})

/**
 * Applique un déplacement au store et l'annonce.
 * @param id Widget déplacé.
 * @param index Nouvel indice dans l'ordre d'affichage.
 */
function moveTo(id: WidgetId, index: number): void {
  layout.move(id, index)
  announcement.value = `${titleOf(id)} : position ${layout.order.indexOf(id) + 1} sur ${layout.order.length}.`
}

const reorder = useReorder({
  container: grid,
  order: () => layout.order,
  onMove: (id, index) => moveTo(id as WidgetId, index),
})

/**
 * « Déplacer vers le haut / bas » du menu d'un widget. Le déplacement réordonne les nœuds du DOM, ce qui fait perdre le focus : on le rend au
 * bouton « Plus d'actions » du widget, pour que le clavier puisse enchaîner.
 * @param id Widget.
 * @param direction Sens du déplacement.
 */
async function moveStep(id: WidgetId, direction: 'up' | 'down'): Promise<void> {
  moveTo(id, layout.order.indexOf(id) + (direction === 'up' ? -1 : 1))
  await nextTick()
  grid.value?.querySelector<HTMLElement>(`#widget-${id} [aria-haspopup="menu"]`)?.focus()
}

/**
 * Retire un widget ; « Annuler » le remet à sa place.
 * @param id Widget retiré.
 */
function removeWidget(id: WidgetId): void {
  const index = layout.order.indexOf(id)
  layout.remove(id)
  announcement.value = `${titleOf(id)} retiré du tableau de bord.`
  toasts.undoable(`Retiré : ${titleOf(id)}`, () => {
    layout.add(id)
    layout.move(id, index)
  })
  // L'élément focalisé disparaît : le focus va au bouton qui permet de le rajouter.
  void nextTick(() => addToggleElement()?.focus())
}

/**
 * Rajoute un widget retiré (à la fin) et l'amène à l'écran.
 * @param id Widget ajouté.
 */
async function addWidget(id: WidgetId): Promise<void> {
  layout.add(id)
  closeAdd(false)
  announcement.value = `${titleOf(id)} ajouté au tableau de bord.`
  await nextTick()
  document.getElementById(`widget-${id}`)?.scrollIntoView({ block: 'nearest' })
}

function openFullscreen(id: WidgetId): void {
  void router.push({ name: 'widgetFullscreen', params: { widgetId: id } })
}

function addToggleElement(): HTMLElement | null {
  return (addToggle.value?.$el as HTMLElement | undefined) ?? null
}

/**
 * Ferme le menu d'ajout.
 * @param restoreFocus Rendre le focus au bouton (Échap) ou non (clic ailleurs).
 */
function closeAdd(restoreFocus: boolean): void {
  if (!addOpen.value) return
  addOpen.value = false
  if (restoreFocus) addToggleElement()?.focus()
}

function onAddKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !addOpen.value) return
  event.stopPropagation()
  closeAdd(true)
}

function onDocumentPointerdown(event: PointerEvent): void {
  if (addRoot.value && !addRoot.value.contains(event.target as Node)) closeAdd(false)
}
watch(addOpen, (open) => {
  if (open) document.addEventListener('pointerdown', onDocumentPointerdown)
  else document.removeEventListener('pointerdown', onDocumentPointerdown)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerdown))
</script>

<template>
  <div class="v-dash">
    <div class="v-dash-head">
      <div>
        <h1 class="titre-l">
          Tableau de bord
        </h1>
        <p class="v-dash-sub">
          {{ subtitle }}
        </p>
      </div>
      <div class="cx-row">
        <div
          ref="addRoot"
          class="v-dash-add"
          @keydown="onAddKeydown"
        >
          <CxButton
            ref="addToggle"
            icon="plus"
            :aria-expanded="addOpen"
            :aria-controls="addOpen ? addPanelId : undefined"
            @click="addOpen = !addOpen"
          >
            Ajouter un widget
          </CxButton>
          <div
            v-if="addOpen"
            :id="addPanelId"
            class="v-dash-addmenu"
            role="group"
            aria-label="Widgets retirés"
          >
            <p
              v-if="layout.hidden.length === 0"
              class="v-dash-addnone cx-muted"
            >
              Tous les widgets sont affichés.
            </p>
            <ul v-else>
              <li
                v-for="id in layout.hidden"
                :key="id"
                class="v-dash-additem"
              >
                <span>
                  <b>{{ titleOf(id) }}</b>
                  <small>{{ labelText(WIDGETS[id].howCode) }}</small>
                </span>
                <CxButton
                  size="sm"
                  :aria-label="`Ajouter : ${titleOf(id)}`"
                  @click="addWidget(id)"
                >
                  Ajouter
                </CxButton>
              </li>
            </ul>
          </div>
        </div>
        <CxButton
          variant="ghost"
          icon="refresh"
          @click="layout.reset()"
        >
          Réinitialiser la disposition
        </CxButton>
      </div>
    </div>

    <CriteriaChipsBar />

    <div
      ref="grid"
      class="v-dash-grid"
      :class="{ 'is-reordering': reorder.draggingId.value !== null }"
    >
      <WidgetHost
        v-for="(id, index) in layout.order"
        :key="id"
        :widget-id="id"
        :collapsed="layout.isCollapsed(id, isMobile)"
        :can-move-up="index > 0"
        :can-move-down="index < layout.order.length - 1"
        :reorderable="!isMobile"
        :class="{ 'is-dragging': reorder.draggingId.value === id, 'is-drop-target': reorder.overId.value === id }"
        @update:collapsed="layout.toggleCollapse(id, isMobile)"
        @fullscreen="openFullscreen(id)"
        @move="moveStep(id, $event)"
        @remove="removeWidget(id)"
        @grip-pointerdown="reorder.start(id, $event)"
      />
      <CxEmptyState
        v-if="layout.order.length === 0"
        class="v-dash-empty"
        title="Aucun widget affiché"
        text="Vous avez retiré tous les widgets. Ajoutez-en un, ou revenez à la disposition d'origine."
        :actions="[{ id: 'reset', label: 'Réinitialiser la disposition', icon: 'refresh' }]"
        @action="layout.reset()"
      />
    </div>

    <p
      class="cx-sr"
      role="status"
    >
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped>
.v-dash { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; padding: var(--space-6); }
.v-dash-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.v-dash-sub { margin-top: 2px; color: var(--ink-3); font-size: 13px; line-height: 18px; }
.v-dash-add { position: relative; }
.v-dash-addmenu { position: absolute; right: 0; top: calc(100% + 4px); z-index: var(--z-popover); width: min(420px, calc(100vw - 2 * var(--space-4))); padding: 6px; border-radius: var(--radius-m); background: var(--surface-raised); box-shadow: var(--shadow-2); }
.v-dash-addmenu ul { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.v-dash-addnone { margin: 0; padding: 8px 10px; }
.v-dash-additem { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px var(--space-3); padding: 8px 10px; border-radius: var(--radius-s); }
.v-dash-additem b { display: block; color: var(--ink); font-size: 13px; font-weight: 600; }
.v-dash-additem small { display: block; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.v-dash-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--space-4); align-items: start; }
.v-dash-grid.is-reordering { cursor: grabbing; user-select: none; }
.v-dash-empty { grid-column: 1 / -1; }
@media (max-width: 767px) {
  .v-dash { padding: var(--space-4); }
  .v-dash-head h1 { font-size: 24px; line-height: 30px; }
}
</style>
