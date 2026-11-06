<!-- Écran « Explorer » : champ qui ouvre la recherche, catalogues groupés avec leur nombre d'entrées, Mécaniques et ressources externes. -->
<script setup lang="ts">
import { onMounted } from 'vue'
import ExploreCard from '../components/domain/explore/ExploreCard.vue'
import { EXPLORE_GROUPS, MECHANICS_ENTRY, RESOURCE_GROUPS, entryCount, groupCount } from '../components/domain/explore/exploreModel.ts'
import CxIcon from '../components/ds/CxIcon.vue'
import { useDataStore } from '../stores/data.ts'
import { useSearchStore } from '../stores/search.ts'
import { formatInt } from '../ui/format.ts'

/**
 * Écran « Explorer » (brief § 4, docs/architecture.md § 9) : onglet mobile et accès desktop à tous les catalogues.
 * Les nombres d'entrées viennent du manifeste (store `data`), sans charger aucun jeu de données. Le champ de recherche n'est pas un champ de saisie :
 * comme celui de la barre supérieure, c'est un bouton qui ouvre la palette (plein écran sous 768 px). Les ressources sont des liens externes.
 */
const data = useDataStore()
const search = useSearchStore()

onMounted(() => {
  void data.loadManifest()
})
</script>

<template>
  <section
    class="v-explore"
    aria-labelledby="explore-title"
  >
    <header class="v-explore-head">
      <h1
        id="explore-title"
        class="titre-l"
      >
        Explorer
      </h1>
      <p class="cx-ink2">
        Les catalogues du jeu, par famille. Chaque lien ouvre le catalogue, ses filtres et ses fiches.
      </p>
      <button
        type="button"
        class="v-explore-search"
        aria-haspopup="dialog"
        @click="search.openPalette()"
      >
        <CxIcon name="search" />
        <span>Rechercher une arme, un boss, un lieu…</span>
      </button>
    </header>

    <section
      v-for="group in EXPLORE_GROUPS"
      :key="group.id"
      class="v-explore-group"
      :aria-labelledby="`explore-${group.id}`"
    >
      <h2
        :id="`explore-${group.id}`"
        class="titre-m"
      >
        {{ group.label }}
        <span
          v-if="groupCount(data.manifest, group) !== null"
          class="cx-muted v-explore-n"
        >{{ formatInt(groupCount(data.manifest, group) ?? 0) }}</span>
      </h2>
      <ul class="v-explore-list">
        <li
          v-for="item in group.entries"
          :key="item.dataset"
        >
          <ExploreCard
            :label="item.label"
            :icon="item.icon"
            :to="item.to"
            :count="entryCount(data.manifest, item.dataset)"
          />
        </li>
      </ul>
    </section>

    <section
      class="v-explore-group"
      aria-labelledby="explore-mechanics"
    >
      <h2
        id="explore-mechanics"
        class="titre-m"
      >
        Mécaniques
      </h2>
      <p class="cx-ink2">
        Attributs, effets de statut, types de dégâts, amélioration, combat, progression.
      </p>
      <ul class="v-explore-list">
        <li>
          <ExploreCard
            :label="MECHANICS_ENTRY.label"
            :icon="MECHANICS_ENTRY.icon"
            :to="MECHANICS_ENTRY.to"
            :count="entryCount(data.manifest, MECHANICS_ENTRY.dataset)"
          />
        </li>
      </ul>
    </section>

    <section
      class="v-explore-group"
      aria-labelledby="explore-resources"
    >
      <h2
        id="explore-resources"
        class="titre-m"
      >
        Ressources
      </h2>
      <p class="cx-ink2">
        Ces liens quittent le Codex et s’ouvrent dans un nouvel onglet.
      </p>
      <div
        v-for="resource in RESOURCE_GROUPS"
        :key="resource.id"
        class="v-explore-res"
      >
        <h3 class="cx-label">
          {{ resource.label }}
        </h3>
        <ul class="v-explore-list">
          <li
            v-for="link in resource.links"
            :key="link.id"
          >
            <a
              class="v-explore-link"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{{ link.label }}<span class="cx-sr"> (s’ouvre dans un nouvel onglet)</span></span>
              <CxIcon name="ext" />
            </a>
          </li>
        </ul>
      </div>
    </section>
  </section>
</template>

<style scoped>
.v-explore { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); max-width: 1100px; padding: var(--space-6); }
.v-explore-head { display: grid; gap: var(--space-2); }
.v-explore-head h1 { width: fit-content; }
.v-explore-search { display: flex; align-items: center; gap: var(--space-2); max-width: 520px; min-height: var(--size-controle); margin-top: var(--space-2); padding: 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink-3); font-size: 14px; text-align: left; cursor: pointer; }
.v-explore-search:hover { border-color: var(--gold-line); color: var(--ink-2); }
.v-explore-group { display: grid; gap: var(--space-3); }
.v-explore-n { margin-left: var(--space-1); font: 600 13px/18px var(--font-sans); font-variant-numeric: tabular-nums; }
.v-explore-res { display: grid; gap: var(--space-2); }
.v-explore-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-2); }
.v-explore-link { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-height: var(--size-cible); padding: var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); color: var(--ink); font-weight: 600; text-decoration: none; overflow-wrap: anywhere; }
.v-explore-link:hover { background: var(--surface-hover); border-color: var(--gold-line); }
.v-explore-link .cx-i { color: var(--ink-3); }
@media (max-width: 767px) {
  .v-explore { padding: var(--space-4); }
  .v-explore-list { grid-template-columns: 1fr; }
  .v-explore-search { min-height: var(--size-cible); max-width: none; }
}
</style>
