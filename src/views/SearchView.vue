<!-- Écran « Recherche » : tous les résultats d'une saisie, par type, avec filtres, pagination, recherches récentes, suggestions et recherche sur le wiki. -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildEmptySections, buildFilterChips, buildIdleSections } from '../components/ds/commandPaletteModel.ts'
import type { PaletteFilter, PaletteRow, PaletteSection } from '../components/ds/commandPaletteModel.ts'
import SearchPager from '../components/domain/search/SearchPager.vue'
import SearchResultSection from '../components/domain/search/SearchResultSection.vue'
import { buildResultsPage, effectiveFilter, parseFilter } from '../components/domain/search/searchPageModel.ts'
import CxButton from '../components/ds/CxButton.vue'
import CxChip from '../components/ds/CxChip.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import { useDatasets } from '../composables/useDatasets.ts'
import { usePageTitle } from '../composables/usePageTitle.ts'
import { usePaletteActions } from '../composables/usePaletteActions.ts'
import { wikiSearchUrl } from '../data/externalLinks.ts'
import { searchActions } from '../search/actions.ts'
import type { ActionGroupResult } from '../search/actions.ts'
import { search } from '../search/search.ts'
import type { SearchResponse } from '../search/search.ts'
import { useDataStore } from '../stores/data.ts'
import { useSearchStore } from '../stores/search.ts'
import { formatInt } from '../ui/format.ts'

/**
 * Page « Voir les N » de la palette (note `spec-search`, docs/architecture.md § 8 et § 9) : `/recherche?q=&groupe=`.
 * L'adresse est la source de vérité : `q` est la saisie, `groupe` le filtre de type. Le champ garde une copie locale pour ne pas attendre le routeur
 * à chaque frappe ; l'adresse est mise à jour (`replace`, sans encombrer l'historique) après une courte pause, et relue si elle change ailleurs
 * (retour arrière, nouvelle recherche depuis la palette). Les résultats viennent de `src/search/` sur l'index chargé par le store `data` ;
 * la page n'en calcule rien d'autre que l'affichage (modèle `searchPageModel.ts`).
 * La saisie validée (Entrée, ou choix d'un résultat) entre dans les recherches récentes (`commit`).
 */
const route = useRoute()
const router = useRouter()
const data = useDataStore()
const searchStore = useSearchStore()
const paletteActions = usePaletteActions()
const { status, retry } = useDatasets(['search-index'])

/** Pause entre la dernière frappe et la mise à jour de l'adresse. */
const URL_DELAY_MS = 250
/** Actions proposées par la saisie vide. */
const IDLE_ACTIONS = 6
const NO_ACTIONS: ActionGroupResult = { total: 0, hits: [] }
const EMPTY_RESPONSE: SearchResponse = { query: '', groups: [], counts: {}, total: 0, fuzzy: false, suggestions: [] }

function queryOfRoute(): string {
  const raw = route.query.q
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value : ''
}

const text = ref(queryOfRoute())
const trimmed = computed(() => text.value.trim())
const page = ref(1)
const input = ref<HTMLInputElement | null>(null)
const top = ref<HTMLElement | null>(null)

// ---------- Synchronisation avec l'adresse ----------

/** Dernière saisie écrite dans l'adresse : sa relecture par le routeur ne doit pas écraser une frappe plus récente. */
let lastWritten = queryOfRoute()
let timer: number | undefined

/**
 * Écrit la saisie dans l'adresse (`q`), en gardant le filtre.
 * @param push Vrai pour ajouter une entrée d'historique (changement de filtre), faux pour remplacer l'entrée courante (frappe).
 * @param groupe Filtre à écrire ; celui de l'adresse par défaut.
 */
function writeRoute(push: boolean, groupe: PaletteFilter = requested.value): void {
  window.clearTimeout(timer)
  lastWritten = text.value
  const query: Record<string, string> = {}
  if (trimmed.value !== '') query.q = trimmed.value
  if (groupe !== 'all') query.groupe = groupe
  const target = { name: 'search', query }
  void (push ? router.push(target) : router.replace(target))
}

watch(text, () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => writeRoute(false), URL_DELAY_MS)
})

watch(
  () => route.query.q,
  () => {
    const q = queryOfRoute()
    if (q === lastWritten || q === text.value) return
    lastWritten = q
    text.value = q
  },
)

/**
 * Remplace la saisie et met l'adresse à jour sans attendre (suggestion, recherche récente).
 * @param value Nouvelle saisie.
 */
function setText(value: string): void {
  text.value = value
  writeRoute(false)
  void nextTick(() => input.value?.focus())
}

onBeforeUnmount(() => window.clearTimeout(timer))

// ---------- Résultats ----------

const index = computed(() => data.file('search-index'))
const requested = computed(() => parseFilter(route.query.groupe))

/** Tous les résultats de tous les groupes : sert aux compteurs des filtres et à la liste. */
const response = computed(() => (index.value && trimmed.value !== '' ? search(index.value, text.value, { perGroup: Infinity }) : null))
const found = computed(() => (trimmed.value !== '' ? searchActions(text.value, Infinity) : NO_ACTIONS))

const chips = computed(() => buildFilterChips(response.value ?? EMPTY_RESPONSE, found.value))
const filter = computed(() => effectiveFilter(requested.value, chips.value))

const results = computed(() => (response.value ? buildResultsPage(response.value, found.value, text.value, filter.value, page.value) : null))

/** Vrai quand l'index est lu et que la saisie ne correspond à aucun élément du jeu. */
const noDocResults = computed(() => response.value !== null && response.value.total === 0)

/** Saisie vide : recherches récentes et premières actions. */
const idleSections = computed<PaletteSection[]>(() => buildIdleSections(searchStore.recent, [], searchActions('', IDLE_ACTIONS)))
/** Aucun résultat : suggestions du glossaire et recherche sur le wiki. */
const emptySections = computed<PaletteSection[]>(() => buildEmptySections(response.value ?? EMPTY_RESPONSE, text.value, wikiSearchUrl))

const announcement = computed(() => {
  if (trimmed.value === '') return ''
  if (!response.value) return status.value === 'error' ? '' : 'Chargement de l’index de recherche'
  const total = response.value.total + found.value.total
  return total === 0 ? 'Aucun résultat' : `${formatInt(total)} résultat${total > 1 ? 's' : ''}`
})

watch([text, filter], () => {
  page.value = 1
})

// ---------- Actions de l'utilisateur ----------

/** Choisir un type : nouvelle entrée d'historique, pour que « Retour » revienne à la vue précédente. */
function chooseFilter(id: PaletteFilter): void {
  writeRoute(true, id)
}

/** Validation par Entrée : mémorise la recherche et met l'adresse à jour sans attendre la pause. */
function onSubmit(): void {
  searchStore.commit(text.value)
  writeRoute(false)
}

/**
 * Choix d'une ligne : mémorise la saisie pour un résultat (`remember`), relance une requête, ou exécute une action.
 * Les lignes qui sont des liens (fiche, écran, wiki) naviguent d'elles-mêmes.
 */
async function onPick(row: PaletteRow): Promise<void> {
  if (row.remember) searchStore.commit(text.value)
  const target = row.target
  if (target.type === 'query') setText(target.query)
  else if (target.type === 'action') await paletteActions.run(target.effect)
}

/** Change de page et remet le haut des résultats à l'écran. */
async function goTo(next: number): Promise<void> {
  page.value = next
  await nextTick()
  top.value?.scrollIntoView({ block: 'start' })
}

usePageTitle(() => (trimmed.value === '' ? 'Recherche' : `Recherche : ${trimmed.value}`))
</script>

<template>
  <section
    class="v-search"
    aria-labelledby="search-title"
  >
    <header class="v-search-head">
      <h1
        id="search-title"
        class="titre-l"
      >
        Recherche
      </h1>
      <form
        class="v-search-form"
        role="search"
        @submit.prevent="onSubmit"
      >
        <label
          class="cx-label"
          for="search-q"
        >Rechercher dans le Codex</label>
        <div class="v-search-field">
          <CxIcon
            name="search"
            size="lg"
          />
          <input
            id="search-q"
            ref="input"
            v-model="text"
            class="v-search-input"
            type="search"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="search"
            placeholder="Arme, boss, lieu, compétence, origine…"
          >
        </div>
      </form>
    </header>

    <div
      class="cx-sr"
      role="status"
    >
      {{ announcement }}
    </div>

    <!-- Saisie vide. -->
    <div
      v-if="trimmed === ''"
      class="v-search-body"
    >
      <SearchResultSection
        v-for="section in idleSections"
        :key="section.id"
        :section="section"
        @pick="onPick"
      />
      <div
        v-if="searchStore.recent.length > 0"
        class="v-search-clear"
      >
        <CxButton
          variant="ghost"
          size="sm"
          icon="x"
          @click="searchStore.clearRecent()"
        >
          Effacer les recherches récentes
        </CxButton>
      </div>
      <p class="cx-muted v-search-hint">
        Les noms restent en anglais, comme dans le jeu : cherchez le nom anglais d’un objet, d’un boss ou d’un lieu, ou un mot de son nom.
      </p>
    </div>

    <!-- Index illisible ou en cours de lecture. -->
    <CxNote
      v-else-if="status === 'error'"
      tone="warn"
      title="Index de recherche illisible."
      role="alert"
    >
      <CxButton
        size="sm"
        icon="refresh"
        @click="retry()"
      >
        Réessayer
      </CxButton>
    </CxNote>
    <div
      v-else-if="!response"
      class="cx-loading v-search-body"
      aria-busy="true"
    >
      <CxSkeleton
        width="30%"
        :height="16"
      />
      <CxSkeleton :height="44" />
      <CxSkeleton :height="44" />
      <CxSkeleton
        width="70%"
        :height="44"
      />
    </div>

    <!-- Résultats. -->
    <div
      v-else
      ref="top"
      class="v-search-body"
    >
      <div
        v-if="chips.length > 1"
        class="v-search-filters"
        role="group"
        aria-label="Filtrer par type"
      >
        <CxChip
          v-for="chip in chips"
          :key="chip.id"
          :pressed="chip.id === filter"
          @open="chooseFilter(chip.id)"
        >
          {{ chip.label }} <span class="cx-muted">{{ formatInt(chip.count) }}</span>
        </CxChip>
      </div>

      <p
        v-if="response.fuzzy"
        class="cx-muted v-search-hint"
      >
        Aucun nom exact : voici des résultats approchants.
      </p>

      <template v-if="results">
        <SearchResultSection
          v-for="section in results.sections"
          :key="section.id"
          :section="section"
          @pick="onPick"
        />
        <SearchPager
          v-if="results.pageCount > 1"
          :page="results.page"
          :page-count="results.pageCount"
          :first="results.first"
          :last="results.last"
          :total="results.total"
          @go="goTo"
        />
      </template>

      <div
        v-if="noDocResults"
        class="v-search-empty"
      >
        <p class="v-search-empty-t">
          Aucun résultat pour « {{ trimmed }} ».
        </p>
        <p class="cx-ink2">
          Les noms restent en anglais, comme dans le jeu : cherchez le nom anglais d’un objet, d’un boss ou d’un lieu, ou un mot de son nom.
        </p>
      </div>
      <template v-if="noDocResults">
        <SearchResultSection
          v-for="section in emptySections"
          :key="section.id"
          :section="section"
          @pick="onPick"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.v-search { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); max-width: 860px; padding: var(--space-6); }
.v-search-head { display: grid; gap: var(--space-3); }
.v-search-head h1 { width: fit-content; }
.v-search-form { display: grid; gap: var(--space-1); }
.v-search-field { display: flex; align-items: center; gap: var(--space-3); height: 48px; padding: 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-m); background: var(--surface-sunken); color: var(--ink-3); }
.v-search-field:focus-within { border-color: var(--focus); box-shadow: inset 0 -2px 0 var(--focus); }
.v-search-input { flex: 1 1 auto; min-width: 0; height: 100%; border: 0; background: transparent; color: var(--ink); font-size: 18px; }
.v-search-input::placeholder { color: var(--ink-3); }
/* L'anneau de focus est celui du cadre (`:focus-within`) : pas de second contour autour du champ. */
.v-search-input:focus-visible { outline: none; }
.v-search-body { display: grid; gap: var(--space-4); min-width: 0; }
.v-search-filters { display: flex; flex-wrap: wrap; gap: 6px; }
.v-search-hint { font-size: 12px; line-height: 16px; }
.v-search-clear { display: flex; padding: 0 var(--space-2); }
.v-search-empty { display: grid; gap: var(--space-1); padding: var(--space-4); border: 1px dashed var(--line-strong); border-radius: var(--radius-m); font-size: 13px; line-height: 18px; }
.v-search-empty-t { color: var(--ink); font: 600 17px/22px var(--font-display); }
@media (max-width: 767px) {
  .v-search { padding: var(--space-4); }
  .v-search-field { height: var(--size-cible); }
  /* Les filtres défilent dans leur cadre plutôt que de s'empiler sur plusieurs lignes ; la page ne défile pas horizontalement. */
  .v-search-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: var(--space-1); }
}
</style>
