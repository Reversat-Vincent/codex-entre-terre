<!-- Écran « Comparateur » (`/comparateur?e=<ref>,<ref>`) : 2 à 4 éléments du même genre côte à côte, écarts mis en évidence, ajout par recherche, retrait d'une colonne. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import CompareAdd from '../components/domain/compare/CompareAdd.vue'
import CompareTable from '../components/domain/compare/CompareTable.vue'
import { catalogOfKind } from '../components/domain/compare/compareModel.ts'
import { useCompare } from '../components/domain/compare/useCompare.ts'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxNote from '../components/ds/CxNote.vue'
import { usePageTitle } from '../composables/usePageTitle.ts'
import type { EntityRef } from '../data/datasets.ts'
import { COMPARE_MAX, COMPARE_MIN, useCompareStore } from '../stores/compare.ts'
import { useToastsStore } from '../stores/toasts.ts'

/**
 * « Comparateur » (brief § 6). L'adresse `?e=` et le store `compare` restent synchronisés dans les deux sens (voir `useCompare`).
 * La vue n'a pas de calcul : les valeurs viennent des données, les prérequis et le score du moteur, la meilleure valeur de `src/ui/compare.ts`.
 * Un refus d'ajout (liste pleine, genre différent) est annoncé par le message du store, en notification.
 */
const compare = useCompareStore()
const toasts = useToastsStore()
const router = useRouter()
const { kind, columns, rows, failed, retry } = useCompare()
usePageTitle('Comparateur')

const catalog = computed(() => (kind.value === null ? null : catalogOfKind(kind.value)))
const count = computed(() => columns.value.length)
const full = computed(() => count.value >= COMPARE_MAX)
const summary = computed(() => {
  if (count.value === 0) return 'Aucun élément comparé.'
  if (count.value < COMPARE_MIN) return 'Un élément : ajoutez-en au moins un autre du même genre.'
  return `${count.value} éléments comparés (de ${COMPARE_MIN} à ${COMPARE_MAX}).`
})
const usesProfile = computed(() => kind.value === 'weapon')

function add(ref: EntityRef): void {
  const result = compare.add(ref)
  if (!result.ok) toasts.push({ message: result.message, kind: 'warning', icon: 'alert' })
}

function onEmptyAction(id: string): void {
  if (id === 'explore') void router.push({ name: 'explore' })
}
</script>

<template>
  <section
    class="v-compare"
    aria-labelledby="compare-title"
  >
    <header class="v-compare-head">
      <div>
        <h1
          id="compare-title"
          class="titre-l"
        >
          Comparateur
        </h1>
        <p
          class="cx-muted v-compare-summary"
          role="status"
        >
          {{ summary }}
        </p>
      </div>
      <CxButton
        v-if="count > 0"
        icon="x"
        @click="compare.clear()"
      >
        Vider le comparateur
      </CxButton>
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

    <CompareAdd
      :kind="kind"
      :taken="compare.items"
      :full="full"
      @add="add"
    />

    <CxEmptyState
      v-if="count === 0"
      title="Rien à comparer pour l’instant."
      text="Cherchez un élément ci-dessus, ou choisissez « Comparer » sur une fiche ou une carte de catalogue. Le comparateur met de 2 à 4 éléments du même genre côte à côte."
      :actions="[{ id: 'explore', label: 'Explorer les catalogues', icon: 'explore' }]"
      @action="onEmptyAction"
    />

    <template v-else-if="catalog !== null">
      <CxNote
        v-if="usesProfile"
        tone="info"
        icon="user"
      >
        Prérequis comparés à votre profil actif (attributs et maniement des critères).
      </CxNote>
      <CompareTable
        :columns="columns"
        :rows="rows"
        :catalog="catalog"
        @remove="(ref) => compare.remove(ref as EntityRef)"
      />
      <CxNote
        v-if="count < COMPARE_MIN"
        tone="partial"
        title="Il manque un élément."
      >
        Les écarts n’apparaissent qu’à partir de deux éléments.
      </CxNote>
    </template>

    <CxNote
      v-else
      tone="warn"
      title="Ce genre ne se compare pas."
    >
      Les éléments de ce genre n’ont pas de champs à mettre côte à côte. Videz le comparateur pour comparer autre chose.
    </CxNote>
  </section>
</template>

<style scoped>
.v-compare { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; padding: var(--space-5) var(--space-5) var(--space-6); }
.v-compare-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.v-compare-summary { margin: 2px 0 0; font-size: 13px; }
@media (max-width: 767px) {
  .v-compare { padding: var(--space-4) var(--space-3) var(--space-5); }
}
</style>
