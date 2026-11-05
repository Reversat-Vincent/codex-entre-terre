<!-- Ajout d'un élément au Comparateur : champ de recherche limité au genre comparé (ou choix du genre quand le comparateur est vide) et liste de résultats. -->
<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { ENTITY_KINDS } from '../../../data/datasets.ts'
import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import { search } from '../../../search/search.ts'
import { useDataStore } from '../../../stores/data.ts'
import type { SourceName } from '../../../ui/labels.ts'
import CxIcon from '../../ds/CxIcon.vue'
import CxSelect from '../../ds/CxSelect.vue'
import CxSourceBadge from '../../ds/CxSourceBadge.vue'
import { catalogOfKind, KIND_PLURALS } from './compareModel.ts'

/**
 * Recherche d'ajout du Comparateur. Le genre est celui des éléments déjà comparés : la recherche ne propose que lui, puisque le comparateur
 * ne mélange pas les genres. Quand le comparateur est vide, une liste déroulante laisse choisir le genre avant de chercher.
 * La recherche est celle de la palette (`search`, index `search-index`) restreinte au groupe du genre ; les éléments déjà comparés sont écartés.
 * Le composant émet `add` ; le refus éventuel (liste pleine…) est annoncé par la vue.
 */
const props = defineProps<{
  /** Genre des éléments comparés, `null` si le comparateur est vide. */
  kind: EntityKind | null
  /** Éléments déjà comparés. */
  taken: readonly EntityRef[]
  /** Comparateur plein : le champ est inactif et dit pourquoi. */
  full: boolean
}>()

const emit = defineEmits<{
  /** Un résultat est choisi. */
  add: [ref: EntityRef]
}>()

const uid = useId()
const data = useDataStore()
const query = ref('')

/** Genres comparables : tous ceux qui ont un catalogue. */
const comparableKinds = ENTITY_KINDS.filter((k) => catalogOfKind(k) !== null)
const chosenKind = ref<EntityKind>('weapon')
const activeKind = computed<EntityKind>(() => props.kind ?? chosenKind.value)
const kindOptions = comparableKinds.map((k) => ({ value: k, label: KIND_PLURALS[k][0]?.toUpperCase() + KIND_PLURALS[k].slice(1) }))
const kindModel = computed({
  get: () => chosenKind.value,
  set: (v: string) => {
    chosenKind.value = v as EntityKind
    query.value = ''
  },
})

const index = computed(() => data.file('search-index'))
const results = computed(() => {
  const file = index.value
  if (file === null || query.value.trim() === '') return []
  const response = search(file, query.value, { groups: [activeKind.value], perGroup: 40 })
  return (response.groups[0]?.hits ?? []).filter((h) => !props.taken.includes(h.doc.ref)).slice(0, 8)
})

watch(
  () => props.kind,
  () => {
    query.value = ''
  },
)

/** Choisit un résultat : le champ est vidé pour enchaîner un autre ajout. */
function choose(ref: EntityRef): void {
  emit('add', ref)
  query.value = ''
}
</script>

<template>
  <div class="cmp-add">
    <div class="cmp-add-row">
      <template v-if="kind === null">
        <label
          class="cx-label"
          :for="`${uid}-kind`"
        >Genre</label>
        <CxSelect
          :id="`${uid}-kind`"
          v-model="kindModel"
          :options="kindOptions"
        />
      </template>
      <div class="cmp-add-search">
        <label
          class="cx-sr"
          :for="`${uid}-q`"
        >Ajouter à la comparaison : rechercher parmi les {{ KIND_PLURALS[activeKind] }}</label>
        <CxIcon
          name="search"
          size="sm"
        />
        <input
          :id="`${uid}-q`"
          v-model="query"
          class="cmp-add-input"
          type="search"
          autocomplete="off"
          :disabled="full"
          :placeholder="full ? 'Comparateur plein : retirez une colonne' : `Ajouter parmi les ${KIND_PLURALS[activeKind]}`"
        >
      </div>
    </div>

    <p
      v-if="full"
      class="cmp-add-hint cx-muted"
    >
      Quatre éléments au plus : retirez une colonne pour en ajouter un autre.
    </p>

    <ul
      v-if="results.length > 0"
      class="cmp-add-results"
      :aria-label="`Résultats parmi les ${KIND_PLURALS[activeKind]}`"
    >
      <li
        v-for="hit in results"
        :key="hit.doc.ref"
      >
        <button
          type="button"
          class="cmp-add-hit"
          @click="choose(hit.doc.ref)"
        >
          <CxIcon
            name="plus"
            size="sm"
          />
          <span class="cmp-add-name">{{ hit.doc.name }}</span>
          <CxSourceBadge
            v-if="hit.doc.source"
            :source="hit.doc.source as SourceName"
          />
          <span
            v-if="hit.doc.ctx.length > 0"
            class="cx-muted cmp-add-ctx"
          >{{ hit.doc.ctx.join(' · ') }}</span>
        </button>
      </li>
    </ul>
    <p
      v-else-if="query.trim() !== '' && !full"
      class="cmp-add-hint cx-muted"
      role="status"
    >
      <template v-if="index === null">
        Chargement de la recherche…
      </template>
      <template v-else>
        Aucun résultat parmi les {{ KIND_PLURALS[activeKind] }}.
      </template>
    </p>
  </div>
</template>

<style scoped>
.cmp-add { display: grid; gap: var(--space-2); max-width: 560px; }
.cmp-add-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.cmp-add-search { position: relative; flex: 1 1 260px; display: flex; align-items: center; min-width: 0; color: var(--ink-3); }
.cmp-add-search .cx-i { position: absolute; left: var(--space-2); pointer-events: none; }
.cmp-add-input { width: 100%; height: var(--size-controle); padding: 0 var(--space-3) 0 var(--space-6); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink); font-size: 13px; min-width: 0; }
.cmp-add-input:disabled { color: var(--ink-disabled); cursor: not-allowed; }
.cmp-add-hint { margin: 0; font-size: 12px; }
.cmp-add-results { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); overflow: hidden; }
.cmp-add-results li + li { border-top: 1px solid var(--line); }
.cmp-add-hit { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); width: 100%; min-height: var(--size-controle); padding: var(--space-1) var(--space-3); border: 0; background: transparent; color: var(--ink); font-size: 13px; text-align: left; cursor: pointer; }
.cmp-add-hit:hover { background: var(--surface-hover); }
.cmp-add-name { font-weight: 600; }
.cmp-add-ctx { font-size: 12px; }
@media (max-width: 767px) {
  .cmp-add-input { height: var(--size-cible); }
  .cmp-add-hit { min-height: var(--size-cible); }
}
</style>
