<!-- Écran « Mécaniques » : sommaire des sujets du jeu (attributs, statuts, dégâts, armes, combat, progression), groupés par thème, avec recherche locale. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import CxSourceBadge from '../components/ds/CxSourceBadge.vue'
import { useDatasets } from '../composables/useDatasets.ts'
import { useDataStore } from '../stores/data.ts'
import { groupMechanics } from '../ui/mechanics.ts'

/**
 * Sommaire des Mécaniques (brief § 6, docs/architecture.md § 9) : les sujets de `mechanics.json` groupés par thème, chacun avec son badge de source
 * et un lien vers son article. La recherche locale filtre sur le titre et le thème (sans accents ni casse) ; elle ne touche pas à la recherche globale.
 */
const data = useDataStore()
const { status, failed, retry } = useDatasets(['mechanics'])

const query = ref('')
const entries = computed(() => data.dataset('mechanics')?.entries ?? [])
const groups = computed(() => groupMechanics(entries.value, query.value))
const total = computed(() => entries.value.length)
const shown = computed(() => groups.value.reduce((sum, g) => sum + g.entries.length, 0))
</script>

<template>
  <section
    class="v-mechanics"
    aria-labelledby="mechanics-title"
  >
    <header class="v-mechanics-head">
      <h1
        id="mechanics-title"
        class="titre-l"
      >
        Mécaniques
      </h1>
      <p class="cx-ink2">
        Les règles du jeu en un coup d’œil : attributs, effets de statut, types de dégâts, armes et amélioration, combat, progression.
      </p>
      <div
        v-if="status === 'ready'"
        class="v-mechanics-search"
      >
        <label
          class="cx-label"
          for="mechanics-search"
        >Rechercher un sujet</label>
        <input
          id="mechanics-search"
          v-model="query"
          class="v-mechanics-input"
          type="search"
          autocomplete="off"
          placeholder="Vigor, Poison, Smithing Stones…"
        >
        <p
          class="cx-muted v-mechanics-count"
          role="status"
        >
          {{ query.trim() === '' ? `${total} sujets` : `${shown} sujet${shown > 1 ? 's' : ''} sur ${total}` }}
        </p>
      </div>
    </header>

    <div
      v-if="status === 'loading'"
      class="cx-loading"
      aria-busy="true"
    >
      <CxSkeleton
        width="40%"
        :height="22"
      />
      <CxSkeleton :height="48" />
      <CxSkeleton :height="48" />
      <CxSkeleton
        width="70%"
        :height="48"
      />
    </div>

    <CxNote
      v-else-if="status === 'error'"
      tone="warn"
      title="Impossible de lire les mécaniques."
      role="alert"
    >
      <template v-if="failed.length > 0">
        Fichier concerné : {{ failed.map((f) => f.label).join(', ') }}.
      </template>
      <CxButton
        size="sm"
        icon="refresh"
        @click="retry()"
      >
        Réessayer
      </CxButton>
    </CxNote>

    <CxEmptyState
      v-else-if="groups.length === 0"
      title="Aucun sujet ne correspond à cette recherche."
      text="La recherche porte sur les titres et les thèmes. Essayez un nom plus court, en anglais comme dans le jeu."
      :actions="[{ id: 'clear', label: 'Effacer la recherche', icon: 'x' }]"
      @action="query = ''"
    />

    <template v-else>
      <section
        v-for="group in groups"
        :key="group.topic"
        class="v-mechanics-group"
        :aria-labelledby="`topic-${group.topic}`"
      >
        <h2
          :id="`topic-${group.topic}`"
          class="titre-m"
        >
          {{ group.label }}
          <span class="cx-muted v-mechanics-n">{{ group.entries.length }}</span>
        </h2>
        <ul class="v-mechanics-list">
          <li
            v-for="entry in group.entries"
            :key="entry.id"
          >
            <RouterLink
              class="v-mechanics-card"
              :to="{ name: 'mechanic', params: { id: entry.id } }"
            >
              <span class="v-mechanics-card-title"><CxIcon name="book" />{{ entry.title }}</span>
              <CxSourceBadge :source="entry.source" />
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
.v-mechanics { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); max-width: 1100px; padding: var(--space-6); }
.v-mechanics-head { display: grid; gap: var(--space-2); }
.v-mechanics-search { display: grid; gap: var(--space-1); max-width: 420px; margin-top: var(--space-2); }
.v-mechanics-head h1 { width: fit-content; }
/* `.cx-input` n'est pas dans la copie des styles du design system : le champ reprend ses tokens (bundle.css, .cx-input). */
.v-mechanics-input { height: var(--size-controle); padding: 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink); min-width: 0; }
.v-mechanics-input::placeholder { color: var(--ink-3); }
.v-mechanics-count { font-size: 12px; line-height: 16px; }
.v-mechanics-group { display: grid; gap: var(--space-3); }
.v-mechanics-n { margin-left: var(--space-1); font: 600 13px/18px var(--font-sans); font-variant-numeric: tabular-nums; }
.v-mechanics-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-2); }
.v-mechanics-card { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-height: var(--size-cible); padding: var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); color: var(--ink); text-decoration: none; }
.v-mechanics-card:hover { background: var(--surface-hover); border-color: var(--gold-line); }
.v-mechanics-card-title { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.v-mechanics-card-title .cx-i { flex: none; color: var(--ink-3); }
@media (max-width: 767px) {
  .v-mechanics { padding: var(--space-4); }
  .v-mechanics-list { grid-template-columns: 1fr; }
  .v-mechanics-input { height: var(--size-cible); }
}
</style>
