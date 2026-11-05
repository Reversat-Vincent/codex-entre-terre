<!-- Écran « Fiche de boss » (`/boss/:id`, `?rencontre=`) : en-tête, onglets de rencontre, tuiles, absorption, statuts, butin, notes et profil. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BossEncounterPanel from '../components/domain/boss/BossEncounterPanel.vue'
import { bossFlags, bossRank, encounterModels, pickEncounter } from '../components/domain/boss/bossSheetModel.ts'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxEntityName from '../components/ds/CxEntityName.vue'
import CxFlag from '../components/ds/CxFlag.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import CxSourceBadge from '../components/ds/CxSourceBadge.vue'
import CxTabs from '../components/ds/CxTabs.vue'
import type { TabItem } from '../components/ds/types.ts'
import CxWikiLink from '../components/ds/CxWikiLink.vue'
import { useDatasets } from '../composables/useDatasets.ts'
import { usePageTitle } from '../composables/usePageTitle.ts'
import { fextralifeSearchUrl, wikiUrlOf } from '../data/externalLinks.ts'
import type { BossEntry } from '../data/types/bosses.ts'
import { useDataStore } from '../stores/data.ts'
import { usePinsStore } from '../stores/pins.ts'
import type { SourceName } from '../ui/labels.ts'

/**
 * Fiche d'un boss (brief § 6, écran `FicheBoss`, note `spec-boss`). Une page de boss peut avoir plusieurs rencontres : un onglet par rencontre
 * (lieu et complément), choisi aux flèches ou au clic et reflété dans `?rencontre=` ; pas d'onglets pour une rencontre unique.
 * En-tête commun : nom, rang, badge de source de la page (double « Base + SotE » si besoin), indicateurs, « Voir sur le wiki » et « Voir sur Fextralife ».
 * Le contenu d'une rencontre est rendu par `BossEncounterPanel`. Aucun calcul ici : lecture des données et des stores seulement.
 */
const route = useRoute()
const router = useRouter()
const data = useDataStore()
const pins = usePinsStore()
const { status, failed, retry } = useDatasets(['bosses', 'tables', 'search-index'])

const id = computed(() => String(route.params.id ?? ''))
const boss = computed(() => data.entity(`boss:${id.value}`) as BossEntry | null)
const ready = computed(() => data.files.bosses.status === 'ready')
const models = computed(() => (boss.value ? encounterModels(boss.value) : []))
const selected = computed(() => pickEncounter(models.value, route.query.rencontre))
const flags = computed(() => (boss.value ? bossFlags(boss.value) : []))
const wikiUrl = computed(() => (boss.value ? wikiUrlOf(boss.value) : null))
const pinned = computed(() => pins.isPinned(`boss:${id.value}`))

usePageTitle(() => boss.value?.name)

/** Onglets : « Rencontre N : lieu », avec le complément qui distingue deux rencontres d'un même lieu. */
const tabs = computed((): TabItem[] =>
  models.value.map((m, i) => ({
    id: m.id,
    label: `Rencontre ${i + 1} : ${m.location ?? 'lieu non précisé'}`,
    ...(m.note === null ? {} : { note: m.note }),
  })),
)

/** Source propre à chaque rencontre, par identifiant d'onglet : chaque rencontre garde sa propre étiquette. */
const sourceById = computed((): Record<string, SourceName> => Object.fromEntries(models.value.map((m) => [m.id, m.source])))

/** Onglet actif ; le choisir met à jour l'adresse (`replace` : un onglet n'est pas une page de plus dans l'historique). */
const activeTab = computed({
  get: () => selected.value?.id ?? '',
  set: (value: string) => {
    void router.replace({ query: { ...route.query, rencontre: value } })
  },
})

/** Résumé des lieux sous le nom : lieu unique, ou nombre de rencontres et lieux. */
const placesText = computed(() => {
  const list = models.value
  if (list.length === 0) return null
  const places = [...new Set(list.map((m) => m.location).filter((p): p is string => p !== null))]
  return list.length > 1 ? `${list.length} rencontres : ${places.join(', ')}` : (places[0] ?? null)
})
</script>

<template>
  <article class="v-boss">
    <nav
      class="v-crumb"
      aria-label="Fil d’Ariane"
    >
      <RouterLink :to="{ name: 'explore' }">
        Explorer
      </RouterLink>
      <CxIcon
        name="chev-r"
        size="xs"
      />
      <RouterLink :to="{ name: 'bosses' }">
        Boss
      </RouterLink>
      <template v-if="boss">
        <CxIcon
          name="chev-r"
          size="xs"
        />
        <span aria-current="page">{{ boss.name }}</span>
      </template>
    </nav>

    <div
      v-if="status === 'loading' && !boss"
      class="cx-loading"
      aria-busy="true"
    >
      <CxSkeleton
        width="35%"
        :height="32"
      />
      <CxSkeleton :height="72" />
      <CxSkeleton :height="240" />
    </div>

    <CxNote
      v-else-if="status === 'error' && !boss"
      tone="warn"
      title="Impossible de lire cette fiche."
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

    <template v-else-if="!boss && ready">
      <h1 class="titre-l">
        Élément introuvable
      </h1>
      <CxEmptyState
        title="Ce boss n’existe pas dans les données."
        text="Le lien est peut-être ancien. Le catalogue liste tous les boss disponibles."
      />
      <RouterLink
        class="cx-btn v-back"
        :to="{ name: 'bosses' }"
      >
        Voir tous les boss
      </RouterLink>
    </template>

    <template v-else-if="boss">
      <header class="v-head">
        <div class="v-head-main">
          <div
            class="v-head-icon"
            aria-hidden="true"
          >
            <CxIcon name="boss" />
          </div>
          <CxEntityName
            :name="boss.name"
            :source="boss.source"
            base="NG"
            size="xl"
            as="h1"
          >
            <template #meta>
              <span v-if="bossRank(boss)">{{ bossRank(boss) }}</span>
              <CxFlag
                v-for="flag in flags"
                :key="flag.id"
                :label="flag.label"
                :icon="flag.icon"
                :title="flag.title"
              />
              <span
                v-if="flags.length === 0"
                class="cx-muted"
              >Aucun indicateur (ni Grande Rune, ni Remembrance)</span>
              <span
                v-if="placesText"
                class="v-places"
              ><CxIcon
                name="map"
                size="sm"
              />{{ placesText }}</span>
            </template>
          </CxEntityName>
        </div>
        <div class="cx-row v-acts">
          <CxButton
            icon="pin"
            :pressed="pinned"
            @click="pins.toggle(`boss:${id}`)"
          >
            {{ pinned ? 'Dans Ma liste' : 'Épingler dans Ma liste' }}
          </CxButton>
          <CxWikiLink :href="wikiUrl" />
          <CxButton
            variant="ghost"
            icon="ext"
            :href="fextralifeSearchUrl(boss.name)"
            external
          >
            Voir sur Fextralife<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span>
          </CxButton>
        </div>
      </header>

      <CxNote
        v-if="models.length > 1"
        title="Plusieurs rencontres."
      >
        Les valeurs changent selon la rencontre : choisissez-la dans les onglets. Chaque rencontre garde sa propre étiquette de source.
      </CxNote>

      <CxTabs
        v-if="models.length > 1"
        v-model="activeTab"
        :items="tabs"
        label="Rencontres"
      >
        <template #tab="{ item }">
          <span class="v-tab">
            <span>{{ item.label }}<span
              v-if="item.note"
              class="cx-tab-n"
            > {{ item.note }}</span></span>
            <CxSourceBadge
              v-if="sourceById[item.id]"
              :source="sourceById[item.id] ?? 'Base game'"
            />
          </span>
        </template>
        <template #default>
          <BossEncounterPanel
            v-if="selected"
            :key="selected.key"
            :boss="boss"
            :model="selected"
          />
        </template>
      </CxTabs>
      <BossEncounterPanel
        v-else-if="selected"
        :key="selected.key"
        :boss="boss"
        :model="selected"
      />
      <CxNote
        v-else
        tone="partial"
        title="Aucune rencontre."
      >
        Le wiki ne décrit aucune rencontre pour ce boss.
      </CxNote>

      <p class="v-licence cx-muted">
        Source : page « {{ boss.name }} » sur
        <a
          :href="wikiUrl ?? 'https://eldenring.wiki.gg'"
          target="_blank"
          rel="noopener noreferrer"
        >eldenring.wiki.gg<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span></a>,
        sous licence
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >CC BY-SA 4.0<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span></a>.
        Les noms du jeu restent en anglais ; valeurs de nouvelle partie (NG).
      </p>
    </template>
  </article>
</template>

<style scoped>
.v-boss { display: grid; gap: var(--space-4); align-content: start; max-width: 1360px; min-width: 0; padding: var(--space-5) var(--space-6) var(--space-6); }
.v-crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.v-crumb a { color: var(--ink-3); }
.v-back { justify-self: start; }
.v-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); }
.v-head-main { display: flex; align-items: center; gap: var(--space-4); min-width: 0; }
.v-head-icon { display: grid; place-items: center; flex: none; width: 64px; height: 64px; border: 1px solid var(--gold-line); border-radius: var(--radius-l); background: var(--gold-wash); color: var(--gold-text); }
.v-head-icon :deep(.cx-i) { width: 34px; height: 34px; stroke-width: 1.4; }
.v-places { display: inline-flex; align-items: center; gap: 6px; }
.v-tab :deep(.cx-tab-n) { margin-left: 6px; }
/* Un onglet peut passer sur deux lignes (lieu, complément, badge de source) : la hauteur fixe de `CxTabs` casserait la mise en page. */
.v-boss :deep(.cx-tabs .cx-tab) { height: auto; min-height: 38px; padding-block: 6px; text-align: left; }
@media (max-width: 767px) {
  .v-boss :deep(.cx-tabs .cx-tab) { min-height: var(--size-cible); }
}
.v-tab { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; text-align: left; }
.v-licence { max-width: 72ch; padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: 12px; line-height: 17px; }
@media (max-width: 767px) {
  .v-boss { padding: var(--space-4); }
  .v-head-icon { width: 48px; height: 48px; }
  .v-head-icon :deep(.cx-i) { width: 26px; height: 26px; }
}
</style>
