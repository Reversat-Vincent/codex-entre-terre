<!-- Palette de recherche globale (Ctrl/⌘ + K) : combobox accessible, résultats groupés, filtres par type, saisie vide et aucun résultat. Surcouche montée une fois dans App.vue. -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFocusTrap } from '../../composables/useFocusTrap.ts'
import { useHotkeys } from '../../composables/useHotkeys.ts'
import { usePaletteActions } from '../../composables/usePaletteActions.ts'
import { searchActions } from '../../search/actions.ts'
import { search } from '../../search/search.ts'
import type { SearchResponse } from '../../search/search.ts'
import { useDataStore } from '../../stores/data.ts'
import { usePinsStore } from '../../stores/pins.ts'
import { useSearchStore } from '../../stores/search.ts'
import { formatInt } from '../../ui/format.ts'
import {
  FILTERED_PER_GROUP,
  buildEmptySections,
  buildFilterChips,
  buildIdleSections,
  buildResultSections,
  flattenRows,
} from './commandPaletteModel.ts'
import type { PaletteFilter, PaletteRow, PaletteSection } from './commandPaletteModel.ts'
import CxButton from './CxButton.vue'
import CxIcon from './CxIcon.vue'
import CxNote from './CxNote.vue'
import CxSourceBadge from './CxSourceBadge.vue'

/**
 * Palette de recherche globale (README du design system, composant CommandPalette ; note `spec-search`).
 * L'état (ouverte, saisie, récentes) est dans le store `search` ; les résultats viennent de `src/search/`, sur l'index chargé par `ensure(['search-index'])`
 * à la première ouverture ou au repos après le démarrage. Le composant ne calcule rien : il affiche les sections de `commandPaletteModel.ts`.
 *
 * Accessibilité : le champ est une combobox (`aria-activedescendant` annonce la ligne active), la liste un `listbox` de groupes d'options ;
 * ↑ ↓ naviguent, Entrée ouvre, Tab (Maj + Tab) change de filtre de type, Échap ou le voile ferment et rendent le focus.
 * Sous 768 px la palette occupe tout l'écran et un bouton « Fermer » remplace la touche Échap.
 */
const props = defineProps<{
  /**
   * Fabrique l'adresse de recherche sur le wiki pour l'état « aucun résultat » (`src/data/externalLinks.ts`, écrit par la logique).
   * Absent : le lien n'est pas proposé.
   */
  wikiSearchUrl?: (query: string) => string
}>()

const IDLE_DELAY_MS = 2500
const PINNED_SHOWN = 5

const router = useRouter()
const searchStore = useSearchStore()
const data = useDataStore()
const pins = usePinsStore()
const actions = usePaletteActions()

const uid = useId()
const listboxId = `${uid}-list`
const optionId = (index: number): string => `${uid}-opt-${index}`

const open = computed(() => searchStore.open)
const panel = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const filter = ref<PaletteFilter>('all')
const active = ref(0)

const query = computed({
  get: () => searchStore.query,
  set: (value: string) => {
    searchStore.query = value
  },
})
const trimmed = computed(() => query.value.trim())

// ---------- Index de recherche ----------

const index = computed(() => data.file('search-index'))
const indexStatus = computed(() => data.files['search-index'].status)

/** Charge l'index (idempotent) : à la première ouverture, ou au repos après le démarrage. */
function loadIndex(): void {
  void data.ensure(['search-index'])
}

let idleHandle: number | undefined
onMounted(() => {
  if (typeof window.requestIdleCallback === 'function') idleHandle = window.requestIdleCallback(loadIndex, { timeout: IDLE_DELAY_MS * 2 })
  else idleHandle = window.setTimeout(loadIndex, IDLE_DELAY_MS)
})

// ---------- Résultats ----------

const EMPTY_RESPONSE: SearchResponse = { query: '', groups: [], counts: {}, total: 0, fuzzy: false, suggestions: [] }

/** Tous les groupes, 4 résultats chacun : sert aux compteurs des filtres et à la vue « Tout ». */
const base = computed(() => (index.value && trimmed.value !== '' ? search(index.value, query.value) : null))
const baseActions = computed(() => (trimmed.value !== '' ? searchActions(query.value) : null))

const chips = computed(() => buildFilterChips(base.value ?? EMPTY_RESPONSE, baseActions.value ?? { total: 0, hits: [] }))

/** Un filtre dont le type n'a plus de résultat après une nouvelle saisie retombe sur « Tout ». */
const activeFilter = computed<PaletteFilter>(() => (chips.value.some((c) => c.id === filter.value) ? filter.value : 'all'))

const shown = computed<SearchResponse | null>(() => {
  const f = activeFilter.value
  if (!index.value || !base.value) return null
  if (f === 'all' || f === 'action') return base.value
  return search(index.value, query.value, { groups: [f], perGroup: FILTERED_PER_GROUP })
})

const shownActions = computed(() => {
  if (trimmed.value === '') return searchActions('')
  return activeFilter.value === 'action' ? searchActions(query.value, FILTERED_PER_GROUP) : (baseActions.value ?? { total: 0, hits: [] })
})

/** Vrai quand l'index est lu et que la saisie ne correspond à aucun élément du jeu. */
const noDocResults = computed(() => trimmed.value !== '' && index.value !== null && (base.value?.total ?? 0) === 0)

const sections = computed<PaletteSection[]>(() => {
  if (trimmed.value === '') {
    const docs = index.value?.docs ?? []
    const pinned = pins.items.slice(0, PINNED_SHOWN).map((p) => ({
      ref: p.ref,
      // Un document « compétence » partage la référence de son arme ou de sa cendre : on préfère le document de l'élément lui-même.
      doc: docs.find((d) => d.ref === p.ref && d.group !== 'skill') ?? null,
    }))
    return buildIdleSections(searchStore.recent, pinned, shownActions.value)
  }
  const found = buildResultSections(shown.value ?? EMPTY_RESPONSE, shownActions.value, query.value, activeFilter.value)
  if (!noDocResults.value) return found
  return [...found, ...buildEmptySections(base.value ?? EMPTY_RESPONSE, query.value, props.wikiSearchUrl)]
})

const rows = computed<PaletteRow[]>(() => flattenRows(sections.value))
const activeIndex = computed(() => (rows.value.length > 0 ? Math.min(active.value, rows.value.length - 1) : -1))

/** Sections avec l'indice de chaque ligne dans la liste aplatie (identifiant ARIA et ligne active). */
const view = computed(() => {
  let n = 0
  return sections.value.map((section) => ({
    ...section,
    items: section.rows.map((row) => ({ row, index: n++ })),
  }))
})

/** Résumé annoncé par la région `status` à chaque nouvelle saisie. */
const announcement = computed(() => {
  if (trimmed.value === '') return ''
  if (indexStatus.value === 'loading' || (index.value === null && indexStatus.value !== 'error')) return 'Chargement de l’index de recherche'
  const total = (base.value?.total ?? 0) + (baseActions.value?.total ?? 0)
  return total === 0 ? 'Aucun résultat' : `${formatInt(total)} résultat${total > 1 ? 's' : ''}`
})

const hrefOf = (row: PaletteRow): string | undefined => {
  const t = row.target
  if (t.type === 'route') return router.resolve(t.to).href
  if (t.type === 'external') return t.href
  return undefined
}
const isExternal = (row: PaletteRow): boolean => row.target.type === 'external'

// ---------- Actions ----------

function close(): void {
  searchStore.close()
}

async function choose(row: PaletteRow): Promise<void> {
  const target = row.target
  if (row.remember) searchStore.commit(query.value)
  switch (target.type) {
    case 'query':
      query.value = target.query
      await nextTick()
      input.value?.focus()
      return
    case 'external':
      window.open(target.href, '_blank', 'noopener,noreferrer')
      close()
      return
    case 'route':
      close()
      await router.push(target.to)
      return
    case 'action':
      close()
      await actions.run(target.effect)
      return
  }
}

/** Clic : un clic simple navigue dans l'application ; Ctrl/⌘/Maj/molette gardent le comportement du lien (nouvel onglet). */
function onRowClick(event: MouseEvent, row: PaletteRow): void {
  const plainClick = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
  if (hrefOf(row) && !plainClick) return
  if (isExternal(row)) {
    close()
    return
  }
  event.preventDefault()
  void choose(row)
}

function moveActive(delta: number): void {
  const count = rows.value.length
  if (count === 0) return
  active.value = (activeIndex.value + delta + count) % count
}

function cycleFilter(delta: number): boolean {
  const list = chips.value
  if (list.length < 2) return false
  const at = list.findIndex((c) => c.id === activeFilter.value)
  const next = list[(at + delta + list.length) % list.length]
  if (next) filter.value = next.id
  return true
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Enter': {
      const row = rows.value[activeIndex.value]
      if (row) {
        event.preventDefault()
        void choose(row)
      }
      break
    }
    case 'Tab':
      // Tab choisit le filtre de type suivant (Maj + Tab le précédent). La propagation est coupée pour que le piège à focus ne la reprenne pas.
      if (cycleFilter(event.shiftKey ? -1 : 1)) {
        event.preventDefault()
        event.stopPropagation()
      }
      break
  }
}

// ---------- Ouverture, fermeture, focus ----------

// Ctrl/⌘ + K ouvre la palette de n'importe quel écran (même depuis un champ de saisie) et la referme si elle est ouverte ; Échap la ferme.
useHotkeys({
  'mod+k': (event) => {
    event.preventDefault()
    if (searchStore.open) close()
    else searchStore.openPalette()
  },
})
useHotkeys({ Escape: close }, { enabled: open })

useFocusTrap(panel, open, { initialFocus: () => input.value })

// La page derrière ne défile pas pendant l'ouverture (même précaution que `CxSheet`).
let previousOverflow: string | null = null
function unlockScroll(): void {
  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow
    previousOverflow = null
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    filter.value = 'all'
    active.value = 0
    loadIndex()
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    unlockScroll()
  }
})
watch([query, activeFilter], () => {
  active.value = 0
})
watch(activeIndex, async (value) => {
  if (value < 0) return
  await nextTick()
  document.getElementById(optionId(value))?.scrollIntoView({ block: 'nearest' })
})

onBeforeUnmount(() => {
  unlockScroll()
  if (idleHandle !== undefined) {
    if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle)
    window.clearTimeout(idleHandle)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="cx-palette-root"
    >
      <div
        class="cx-scrim"
        @click="close"
      />
      <div
        ref="panel"
        class="cx-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
        tabindex="-1"
      >
        <div class="cx-palette-in">
          <CxIcon
            name="search"
            size="lg"
          />
          <input
            ref="input"
            v-model="query"
            type="text"
            role="combobox"
            aria-label="Rechercher"
            aria-autocomplete="list"
            aria-expanded="true"
            :aria-controls="listboxId"
            :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
            placeholder="Rechercher une arme, un boss, un lieu…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="search"
            @keydown="onKeydown"
          >
          <span
            class="cx-kbd cx-palette-esc"
            aria-hidden="true"
          >Échap</span>
          <CxButton
            class="cx-palette-close"
            variant="ghost"
            icon-only
            icon="x"
            label="Fermer la recherche"
            @click="close"
          />
        </div>

        <div
          v-if="chips.length > 1"
          class="cx-palette-filters"
          role="group"
          aria-label="Filtrer par type"
        >
          <button
            v-for="chip in chips"
            :key="chip.id"
            type="button"
            class="cx-chip"
            :aria-pressed="chip.id === activeFilter"
            @click="filter = chip.id"
          >
            {{ chip.label }} <span class="cx-muted">{{ formatInt(chip.count) }}</span>
          </button>
        </div>

        <div
          class="cx-palette-body"
        >
          <div
            v-if="trimmed !== '' && indexStatus === 'error'"
            class="cx-palette-note"
          >
            <CxNote
              tone="warn"
              title="Index de recherche illisible."
              role="alert"
            >
              <span class="cx-palette-note-row">
                <span>Seules les actions sont disponibles.</span>
                <CxButton
                  size="sm"
                  icon="refresh"
                  @click="data.retry('search-index')"
                >Réessayer</CxButton>
              </span>
            </CxNote>
          </div>
          <p
            v-else-if="trimmed !== '' && index === null"
            class="cx-palette-hint"
          >
            Chargement de l’index de recherche…
          </p>
          <p
            v-else-if="base?.fuzzy"
            class="cx-palette-hint"
          >
            Aucun nom exact : voici des résultats approchants.
          </p>

          <div
            :id="listboxId"
            role="listbox"
            aria-label="Résultats"
          >
            <div
              v-for="section in view"
              :key="section.id"
              role="group"
              :aria-labelledby="`${uid}-${section.id}`"
            >
              <div
                :id="`${uid}-${section.id}`"
                class="cx-palette-group"
              >
                <span>{{ section.label }}</span>
                <span v-if="section.count !== null">{{ formatInt(section.count) }}</span>
              </div>
              <component
                :is="hrefOf(item.row) ? 'a' : 'div'"
                v-for="item in section.items"
                :id="optionId(item.index)"
                :key="item.row.key"
                class="cx-palette-item"
                :class="{ 'is-active': item.index === activeIndex }"
                role="option"
                :aria-selected="item.index === activeIndex"
                :href="hrefOf(item.row)"
                :target="isExternal(item.row) ? '_blank' : undefined"
                :rel="isExternal(item.row) ? 'noopener noreferrer' : undefined"
                :tabindex="hrefOf(item.row) ? -1 : undefined"
                @click="onRowClick($event, item.row)"
                @mousemove="active = item.index"
              >
                <span class="cx-palette-ic"><CxIcon :name="item.row.icon" /></span>
                <span class="cx-palette-text">
                  <span class="cx-palette-t"><template
                    v-for="(part, i) in item.row.parts"
                    :key="i"
                  ><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
                  <CxSourceBadge
                    v-if="item.row.source"
                    :source="item.row.source"
                  />
                  <span
                    v-if="item.row.sub"
                    class="cx-palette-s"
                  >{{ item.row.sub }}</span>
                </span>
                <span
                  v-if="item.index === activeIndex"
                  class="cx-kbd cx-palette-enter"
                  aria-hidden="true"
                >↵</span>
                <span v-else />
              </component>
            </div>
          </div>

          <div
            v-if="noDocResults"
            class="cx-palette-empty"
          >
            <b>Aucun résultat pour « {{ trimmed }} ».</b>
            <span>Les noms restent en anglais, comme dans le jeu : cherchez le nom anglais d’un objet, d’un boss ou d’un lieu, ou un mot de son nom.</span>
          </div>
        </div>

        <div
          class="cx-palette-foot"
          aria-hidden="true"
        >
          <span><span class="cx-kbd">↑</span> <span class="cx-kbd">↓</span> naviguer</span>
          <span><span class="cx-kbd">↵</span> ouvrir</span>
          <span><span class="cx-kbd">Tab</span> filtrer par type</span>
        </div>

        <div
          class="cx-sr"
          role="status"
        >
          {{ announcement }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Règles du design system (bundle.css, « Recherche globale »), complétées pour la surcouche : placement, plein écran mobile, filtres. */
.cx-palette-root { position: fixed; inset: 0; z-index: var(--z-overlay); display: flex; justify-content: center; align-items: flex-start; padding: 10vh var(--space-4) var(--space-4); }
.cx-scrim { position: absolute; inset: 0; background: var(--scrim); }
.cx-palette { position: relative; display: flex; flex-direction: column; width: 720px; max-width: 100%; max-height: 100%; overflow: hidden; border-radius: var(--radius-l); background: var(--surface-raised); box-shadow: var(--shadow-3); }
.cx-palette:focus { outline: none; }
.cx-palette-in { flex: none; display: flex; align-items: center; gap: var(--space-3); height: 58px; padding: 0 var(--space-4); border-bottom: 1px solid var(--line); }
.cx-palette-in input { flex: 1 1 auto; min-width: 0; height: 40px; border: 0; background: transparent; color: var(--ink); font-size: 18px; }
/* L'anneau de focus de la ligne de saisie est le filet doré de `.cx-palette-in:focus-within` : pas de second contour autour du champ. */
.cx .cx-palette-in input:focus-visible { outline: none; }
.cx-palette-in input::placeholder { color: var(--ink-3); }
.cx-palette-in:focus-within { box-shadow: inset 0 -2px 0 var(--focus); }
.cx-palette-close { display: none; }
.cx-palette-filters { flex: none; display: flex; flex-wrap: wrap; gap: 6px; padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--line); }
.cx-palette-body { flex: 1 1 auto; min-height: 0; max-height: 520px; overflow-y: auto; overscroll-behavior: contain; padding: 4px 0 var(--space-2); }
.cx-palette-group { padding: var(--space-2) var(--space-4) 4px; color: var(--ink-3); font: 600 12px/16px var(--font-sans); display: flex; justify-content: space-between; }
.cx a.cx-palette-item, .cx-palette-item { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); min-height: 44px; padding: 7px var(--space-4); color: var(--ink); text-decoration: none; cursor: pointer; }
.cx-palette-item:hover, .cx-palette-item.is-active { background: var(--gold-wash); }
.cx-palette-item.is-active { box-shadow: inset 0 0 0 1px var(--gold-line); }
.cx-palette-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius-s); background: var(--surface); color: var(--ink-2); }
.cx-palette-text { min-width: 0; }
.cx-palette-text .cx-badge { margin-left: 6px; }
.cx-palette-t { font-weight: 600; overflow-wrap: anywhere; }
.cx-palette-t mark { background: transparent; color: var(--gold-text); font-weight: 700; }
.cx-palette-s { display: block; color: var(--ink-3); font-size: 12px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cx-palette-foot { flex: none; display: flex; flex-wrap: wrap; gap: var(--space-4); padding: var(--space-2) var(--space-4); border-top: 1px solid var(--line); color: var(--ink-3); font-size: 12px; }
.cx-palette-hint { padding: var(--space-2) var(--space-4); color: var(--ink-3); font-size: 12px; }
.cx-palette-note { padding: var(--space-2) var(--space-4); }
.cx-palette-note-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.cx-palette-empty { display: grid; gap: var(--space-1); padding: var(--space-3) var(--space-4); color: var(--ink-2); font-size: 13px; line-height: 18px; }
.cx-palette-empty b { color: var(--ink); font-weight: 600; }
/* Touche de clavier et puce de filtre : mêmes règles que le design system (bundle.css). */
.cx-kbd { display: inline-flex; align-items: center; height: 20px; padding: 0 5px; border: 1px solid var(--line-strong); border-bottom-width: 2px; border-radius: var(--radius-s); background: var(--surface-raised); color: var(--ink-2); font: 600 11px/14px var(--font-sans); }
.cx-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-pill); background: var(--surface); color: var(--ink); font-size: 12px; line-height: 16px; font-weight: 600; white-space: nowrap; }
button.cx-chip { cursor: pointer; }
button.cx-chip:hover { border-color: var(--control-border); background: var(--surface-hover); }
.cx-chip[aria-pressed="true"] { border-color: var(--gold-line); background: var(--gold-wash); color: var(--gold-text); }
/* Mobile : plein écran, cibles de 44 px, bouton « Fermer » à la place de la touche Échap. */
@media (max-width: 767px) {
  .cx-palette-root { padding: 0; }
  .cx-palette { width: 100%; height: 100%; border-radius: 0; box-shadow: none; }
  .cx-palette-body { max-height: none; }
  .cx-palette-esc, .cx-palette-enter, .cx-palette-foot { display: none; }
  .cx-palette-close { display: inline-flex; }
  .cx-palette-in { padding-right: var(--space-2); }
  .cx-palette-filters { flex-wrap: nowrap; overflow-x: auto; }
  .cx-chip { height: var(--size-cible); }
}
</style>
