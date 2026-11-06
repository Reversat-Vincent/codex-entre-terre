<!-- Catalogue sans résultat : rappel des filtres, suggestions chiffrées pour élargir (« Retirer « Saignement » : 1 arme »), puis « Effacer tous les filtres ». -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogKey } from '../../../catalog/registry.ts'
import type { FilterChip, Widening } from '../../../stores/catalogs.ts'
import { formatInt } from '../../../ui/format.ts'
import CxEmptyState from '../../ds/CxEmptyState.vue'
import type { EmptyAction } from '../../ds/types.ts'
import { CATALOG_INFO } from './catalogModel.ts'

/**
 * État vide d'un catalogue (design `Catalogue.dc.html`, note `spec-catalog`). Les suggestions et leurs nombres viennent du store (`suggestions`) ;
 * ce composant les met en phrases et renvoie le choix de l'utilisateur. La première suggestion, la plus fructueuse, est mise en avant.
 */
const props = defineProps<{
  catalog: CatalogKey
  /** Puces des filtres actifs, dans l'ordre d'ajout. */
  chips: readonly FilterChip[]
  /** Recherche par nom en cours. */
  search: string
  /** Vrai si « Inclure les estimations » est décochée. */
  estimatesOff: boolean
  /** Suggestions du store, de la plus fructueuse à la moins fructueuse. */
  suggestions: readonly Widening[]
}>()

const emit = defineEmits<{
  /** L'utilisateur choisit une suggestion. */
  widen: [widening: Widening]
  /** « Effacer tous les filtres ». */
  clear: []
}>()

const info = computed(() => CATALOG_INFO[props.catalog])
const searching = computed(() => props.search.trim() !== '')

const title = computed(() => {
  const none = info.value.feminine ? 'Aucune' : 'Aucun'
  const reason = props.chips.length > 0 ? 'à ces filtres' : searching.value ? 'à cette recherche' : 'à vos critères'
  return `${none} ${info.value.singular} ne correspond ${reason}`
})

const text = computed(() => {
  const parts: string[] = []
  if (props.chips.length > 0) parts.push(`Filtres actifs : ${props.chips.map((c) => c.valueLabel).join(', ')}`)
  if (searching.value) parts.push(`Recherche : « ${props.search.trim()} »`)
  if (props.estimatesOff) parts.push('Estimations exclues')
  return `${parts.join('. ')}. Retirez un critère pour élargir la liste.`
})

function count(n: number): string {
  return `${formatInt(n)} ${n > 1 ? info.value.plural : info.value.singular}`
}

function label(w: Widening): string {
  if (w.kind === 'filter') return `Retirer « ${w.chip.valueLabel} » : ${count(w.count)}`
  if (w.kind === 'search') return `Effacer la recherche : ${count(w.count)}`
  return `Inclure les estimations : ${count(w.count)}`
}

const actions = computed<EmptyAction[]>(() => {
  const list: EmptyAction[] = props.suggestions.map((w, i) => ({ id: `widen-${i}`, label: label(w), icon: 'x' }))
  if (props.chips.length > 0) list.push({ id: 'clear', label: 'Effacer tous les filtres' })
  return list
})

function onAction(id: string): void {
  if (id === 'clear') {
    emit('clear')
    return
  }
  const widening = props.suggestions[Number(id.slice('widen-'.length))]
  if (widening) emit('widen', widening)
}
</script>

<template>
  <CxEmptyState
    :title="title"
    :text="text"
    :actions="actions"
    @action="onAction"
  />
</template>
