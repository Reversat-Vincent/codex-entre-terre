<!-- Écran « Ma liste » (`/ma-liste`) : éléments épinglés à récupérer, cochables « Récupéré », filtrés, réordonnables au clavier, retirables avec Annuler. -->
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSegmented from '../components/ds/CxSegmented.vue'
import MyListItem from '../components/domain/mylist/MyListItem.vue'
import { countPins, filterPins, moveTarget } from '../components/domain/mylist/myListModel.ts'
import type { ListFilter } from '../components/domain/mylist/myListModel.ts'
import { useMyList } from '../components/domain/mylist/useMyList.ts'
import { usePageTitle } from '../composables/usePageTitle.ts'
import { usePinsStore } from '../stores/pins.ts'
import { formatInt } from '../ui/format.ts'
import type { SegmentedOption } from '../components/ds/types.ts'

/**
 * « Ma liste » (brief § 4) : réunit les éléments épinglés à récupérer.
 * Le store `pins` porte l'ordre, l'état « Récupéré » et le retrait avec « Annuler » ; l'étape d'une arme vient du moteur par le store d'analyse.
 * Le déplacement se fait par les boutons « Monter » et « Descendre » de chaque ligne (donc au clavier) ; avec un filtre actif, l'élément passe devant
 * son voisin visible et les éléments masqués gardent leur place.
 */
const pins = usePinsStore()
const router = useRouter()
const { rows, failed, retry } = useMyList()
usePageTitle('Ma liste')

const filter = ref<ListFilter>('todo')
const counts = computed(() => countPins(pins.items))
const filterOptions = computed((): SegmentedOption<ListFilter>[] => [
  { value: 'todo', label: `À récupérer (${formatInt(counts.value.todo)})` },
  { value: 'done', label: `Récupérés (${formatInt(counts.value.done)})` },
  { value: 'all', label: `Tout (${formatInt(counts.value.all)})` },
])
const visibleRefs = computed(() => new Set(filterPins(pins.items, filter.value).map((p) => p.ref)))
const visibleRows = computed(() => rows.value.filter((r) => visibleRefs.value.has(r.pin.ref)))

const summary = computed(() => {
  const { todo, done, all } = counts.value
  if (all === 0) return 'Aucun élément épinglé.'
  return `${formatInt(todo)} ${todo > 1 ? 'éléments à récupérer' : 'élément à récupérer'} · ${formatInt(done)} ${done > 1 ? 'récupérés' : 'récupéré'}`
})

const emptyText = computed(() => {
  if (filter.value === 'todo') return { title: 'Tout est récupéré.', text: 'Aucun élément ne reste à récupérer. Choisissez « Récupérés » ou « Tout » pour les revoir.' }
  return { title: 'Aucun élément récupéré.', text: 'Cochez « Récupéré » sur un élément pour le retrouver ici.' }
})

const listEl = ref<HTMLElement | null>(null)
const announcement = ref('')

/**
 * Déplace un élément d'un cran parmi les éléments visibles, annonce sa nouvelle place et garde le focus sur le bouton utilisé.
 * Si le bouton devient inactif (l'élément est au bout), le focus passe à l'autre bouton : un bouton désactivé perdrait le focus.
 * @param ref Référence de l'élément.
 * @param direction `-1` vers le haut, `1` vers le bas.
 */
async function move(ref: string, direction: -1 | 1): Promise<void> {
  const target = moveTarget(pins.items, filterPins(pins.items, filter.value), ref, direction)
  if (target === null) return
  pins.reorder(target.from, target.to)
  const visible = filterPins(pins.items, filter.value)
  const position = visible.findIndex((p) => p.ref === ref) + 1
  announcement.value = `Élément déplacé en position ${position} sur ${visible.length}.`
  await nextTick()
  const li = listEl.value?.querySelector(`[data-ref="${CSS.escape(ref)}"]`)
  const same = li?.querySelector<HTMLButtonElement>(direction === -1 ? '.ml-up' : '.ml-down')
  const other = li?.querySelector<HTMLButtonElement>(direction === -1 ? '.ml-down' : '.ml-up')
  ;(same && !same.disabled ? same : other)?.focus()
}

/** Ouvre l'exploration des catalogues depuis l'état vide. */
function onEmptyAction(id: string): void {
  if (id === 'explore') void router.push({ name: 'explore' })
}
</script>

<template>
  <section
    class="v-mylist"
    aria-labelledby="mylist-title"
  >
    <header class="v-mylist-head">
      <div>
        <h1
          id="mylist-title"
          class="titre-l"
        >
          Ma liste
        </h1>
        <p
          class="cx-muted v-mylist-summary"
          role="status"
        >
          {{ summary }}
        </p>
      </div>
      <CxSegmented
        v-if="counts.all > 0"
        v-model="filter"
        :options="filterOptions"
        label="Filtrer la liste"
      />
    </header>

    <CxNote
      v-if="failed.length > 0"
      tone="warn"
      title="Certaines données n’ont pas pu être lues."
      role="alert"
    >
      Fichier concerné : {{ failed.map((f) => f.label).join(', ') }}.
      <CxButton
        size="sm"
        icon="refresh"
        @click="retry()"
      >
        Réessayer
      </CxButton>
    </CxNote>

    <CxEmptyState
      v-if="counts.all === 0"
      title="Ma liste est vide."
      text="Pour épingler un élément, ouvrez sa fiche ou une carte de catalogue et choisissez « Épingler dans Ma liste ». Il apparaît ici avec l’endroit où l’obtenir, et vous le cochez « Récupéré » une fois en poche."
      :actions="[{ id: 'explore', label: 'Explorer les catalogues', icon: 'explore' }]"
      @action="onEmptyAction"
    />

    <CxEmptyState
      v-else-if="visibleRows.length === 0"
      :title="emptyText.title"
      :text="emptyText.text"
    />

    <ul
      v-else
      ref="listEl"
      class="v-mylist-list"
      aria-label="Éléments de Ma liste"
    >
      <MyListItem
        v-for="(row, index) in visibleRows"
        :key="row.pin.ref"
        :data-ref="row.pin.ref"
        :row="row"
        :first="index === 0"
        :last="index === visibleRows.length - 1"
        @toggle="pins.toggleDone(row.pin.ref)"
        @move="(direction) => move(row.pin.ref, direction)"
        @remove="pins.unpin(row.pin.ref)"
      />
    </ul>

    <p
      class="cx-sr"
      role="status"
      aria-live="polite"
    >
      {{ announcement }}
    </p>
  </section>
</template>

<style scoped>
.v-mylist { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; max-width: 960px; padding: var(--space-5) var(--space-5) var(--space-6); }
.v-mylist-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.v-mylist-summary { margin: 2px 0 0; font-size: 13px; }
.v-mylist-list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
@media (max-width: 767px) {
  .v-mylist { padding: var(--space-4) var(--space-3) var(--space-5); }
}
</style>
