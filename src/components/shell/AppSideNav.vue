<!-- Barre latérale de navigation : 232 px, ou rail d'icônes de 64 px ; masquée sous 768 px où la barre d'onglets prend le relais. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBreakpoint } from '../../composables/useBreakpoint.ts'
import { hasCriteriaPanel } from '../../router/meta.ts'
import { useCompareStore } from '../../stores/compare.ts'
import { useDataStore } from '../../stores/data.ts'
import { usePinsStore } from '../../stores/pins.ts'
import { usePreferencesStore } from '../../stores/preferences.ts'
import { formatInt } from '../../ui/format.ts'
import CxIcon from '../ds/CxIcon.vue'
import AppResourcesMenu from './AppResourcesMenu.vue'
import { NAV_EXPLORE, NAV_HOME, NAV_TOOLS, isEntryActive } from './navModel.ts'
import type { NavCount, NavEntry } from './navModel.ts'

/** Lien externe de la section « Ressources » (carte interactive, guides). */
export interface ResourceLink {
  /** Libellé complet (info-bulle de la barre dépliée, liste du rail). */
  label: string
  /** Libellé court de la barre dépliée, qui tient sur une ligne ou deux ; `label` à défaut. */
  short?: string
  /** Adresse complète ; s'ouvre dans un nouvel onglet. */
  href: string
}

/**
 * Barre latérale (architecture § 10.1, notes `spec-main`). Préférence `navRail` :
 * `expanded` garde la barre dépliée, `rail` la replie, `auto` la replie sous 1600 px quand le panneau de critères est ouvert.
 * Sous 1280 px la barre est toujours un rail. Les compteurs viennent du manifeste des données et des stores (Ma liste, Comparateur).
 * La section « Ressources » reste absente tant que `resources` est vide : la logique des liens externes (`src/data/externalLinks.ts`) la remplira.
 * Dans le rail, les liens externes sont regroupés derrière un seul bouton (`AppResourcesMenu`) ; dépliée, la barre les liste avec leur libellé court.
 */
const props = withDefaults(
  defineProps<{
    /** Liens de la section « Ressources » (cartes interactives, guides). */
    resources?: readonly ResourceLink[]
  }>(),
  { resources: () => [] },
)

/** Sections de la barre, après « Tableau de bord ». */
const SECTIONS = [
  { title: 'Explorer', entries: NAV_EXPLORE },
  { title: 'Outils', entries: NAV_TOOLS },
] as const

const route = useRoute()
const prefs = usePreferencesStore()
const data = useDataStore()
const pins = usePinsStore()
const compare = useCompareStore()
const { isTablet, isWide } = useBreakpoint()

const isRail = computed(() => {
  if (isTablet.value || prefs.navRail === 'rail') return true
  if (prefs.navRail === 'expanded') return false
  return !isWide.value && hasCriteriaPanel(route) && !prefs.criteriaCollapsed
})

const toggleLabel = computed(() => (isRail.value ? 'Déplier le menu' : 'Replier le menu'))
const toggleIcon = computed(() => (isRail.value ? 'chev-r' : 'chev-l'))

function toggle(): void {
  prefs.setNavRail(isRail.value ? 'expanded' : 'rail')
}

/** Compteur affiché à droite d'une entrée ; `null` quand il n'y en a pas (ou pas encore : manifeste non lu). */
function countOf(count: NavCount): string | null {
  switch (count.kind) {
    case 'files': {
      const manifest = data.manifest
      if (!manifest) return null
      return formatInt(count.files.reduce((sum, key) => sum + manifest.files[key].entries, 0))
    }
    case 'pins':
      return pins.items.length > 0 ? formatInt(pins.items.length) : null
    case 'compare':
      return compare.items.length > 0 ? formatInt(compare.items.length) : null
    default:
      return null
  }
}

function active(entry: NavEntry): boolean {
  return isEntryActive(entry.to, route.path)
}
</script>

<template>
  <nav
    class="cx-nav"
    :class="{ 'is-rail': isRail }"
    aria-label="Navigation principale"
  >
    <RouterLink
      class="cx-brand"
      to="/"
      title="Codex de l'Entre-terre"
    >
      <svg
        class="cx-i cx-mark"
        aria-hidden="true"
        focusable="false"
      ><use href="#i-mark" /></svg>
      <span class="cx-brand-name cx-nav-text">Codex de l'Entre-terre</span>
    </RouterLink>

    <RouterLink
      class="cx-nav-item"
      :class="{ 'is-active': active(NAV_HOME) }"
      :to="NAV_HOME.to"
      :aria-current="active(NAV_HOME) ? 'page' : undefined"
      :title="NAV_HOME.label"
    >
      <CxIcon :name="NAV_HOME.icon" />
      <span class="cx-nav-text">{{ NAV_HOME.label }}</span>
    </RouterLink>

    <template
      v-for="section in SECTIONS"
      :key="section.title"
    >
      <div
        class="cx-nav-label cx-nav-text"
        aria-hidden="true"
      >
        {{ section.title }}
      </div>
      <RouterLink
        v-for="entry in section.entries"
        :key="entry.to"
        class="cx-nav-item"
        :class="{ 'is-active': active(entry) }"
        :to="entry.to"
        :aria-current="active(entry) ? 'page' : undefined"
        :title="entry.label"
      >
        <CxIcon :name="entry.icon" />
        <span class="cx-nav-text">{{ entry.label }}</span>
        <span
          v-if="countOf(entry.count)"
          class="cx-nav-count cx-nav-text"
        >{{ countOf(entry.count) }}</span>
      </RouterLink>
    </template>

    <template v-if="props.resources.length > 0">
      <div
        class="cx-nav-label cx-nav-text"
        aria-hidden="true"
      >
        Ressources
      </div>
      <AppResourcesMenu
        v-if="isRail"
        :resources="props.resources"
      />
      <template v-else>
        <a
          v-for="link in props.resources"
          :key="link.href"
          class="cx-nav-item cx-nav-res"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          :title="`${link.label} (s'ouvre dans un nouvel onglet)`"
        >
          <CxIcon name="ext" />
          <span class="cx-nav-text">{{ link.short ?? link.label }}</span>
          <span class="cx-sr">(s'ouvre dans un nouvel onglet)</span>
        </a>
      </template>
    </template>

    <div
      v-if="!isTablet"
      class="cx-nav-foot"
    >
      <button
        type="button"
        class="cx-nav-item cx-nav-btn"
        :aria-expanded="!isRail"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        @click="toggle"
      >
        <CxIcon :name="toggleIcon" />
        <span class="cx-nav-text">Replier le menu</span>
      </button>
    </div>
  </nav>
</template>

<style>
/* `z-index` de la barre : le menu des ressources du rail (position fixe) doit passer au-dessus du panneau de critères, sinon il reste dans le contexte d'empilement de la barre, plus bas. */
/* Règles du design system (bundle.css, « Coquille d'application ») ; les règles du rail sont reprises du prototype Main.dc.html. */
.cx-nav { position: sticky; top: 0; z-index: var(--z-popover); align-self: flex-start; height: 100vh; height: 100dvh; overflow-y: auto; flex: 0 0 var(--size-nav); width: var(--size-nav); display: flex; flex-direction: column; gap: 2px; padding: var(--space-4) var(--space-3); background: var(--surface); border-right: 1px solid var(--line); }
.cx-nav.is-rail { flex-basis: var(--size-rail); width: var(--size-rail); align-items: center; padding-inline: var(--space-2); }
.cx-brand { display: flex; align-items: center; gap: var(--space-2); padding: 2px var(--space-2) var(--space-4); color: var(--ink); text-decoration: none; }
.cx a.cx-brand { color: var(--ink); text-decoration: none; }
/* 18 px (19 px au design) : « Codex de l'Entre-terre » (157 px) tient alors sur une ligne dans les 160 px que laisse la barre de 232 px ; à 19 px il passait à la ligne. */
.cx-brand-name { font: 600 18px/22px var(--font-display); white-space: nowrap; }
/* Marque : tracé du design system (losange au trait, 1,6 px, en or). Sans `cx-i`, le SVG était rempli de noir, invisible en thème sombre. `.cx-i.cx-mark` : la taille de 24 px l'emporte sur celle de `.cx-i` (16 px). */
.cx-i.cx-mark { width: 24px; height: 24px; flex: none; color: var(--gold); fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; vertical-align: baseline; }
.cx-nav-label { padding: var(--space-3) var(--space-2) var(--space-1); color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.cx a.cx-nav-item, .cx-nav-item { position: relative; display: flex; align-items: center; gap: var(--space-3); min-height: 34px; padding: 7px var(--space-2); border-radius: var(--radius-s); line-height: 20px; color: var(--ink-2); text-decoration: none; font-weight: 600; font-size: 14px; }
.cx-nav-item:hover { background: var(--surface-hover); color: var(--ink); }
.cx a.cx-nav-item.is-active, .cx-nav-item.is-active { background: var(--gold-wash); color: var(--gold-text); }
.cx-nav-item.is-active::after { content: ""; width: 6px; height: 6px; margin-left: auto; background: var(--gold); transform: rotate(45deg); flex: none; }
.cx-nav-count { margin-left: auto; color: var(--ink-3); font: 600 11px/14px var(--font-sans); font-variant-numeric: tabular-nums; }
.cx-nav-foot { margin-top: auto; padding-top: var(--space-3); border-top: 1px solid var(--line); width: 100%; }
.cx-nav-btn { width: 100%; border: 0; background: transparent; font: inherit; font-weight: 600; cursor: pointer; }
/* Liens de ressources : le libellé peut passer sur deux lignes, l'icône reste en tête de la première. */
.cx-nav-res { align-items: flex-start; }
.cx-nav-res .cx-i { margin-top: 2px; }
/* Dans le rail, les libellés restent lisibles par les lecteurs d'écran (nom accessible des liens) : masqués visuellement, pas retirés. */
.cx-nav.is-rail .cx-nav-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.cx-nav.is-rail .cx-nav-item { width: 40px; justify-content: center; padding: 7px 0; }
.cx-nav.is-rail .cx-nav-item.is-active::after { position: absolute; right: 3px; top: 50%; margin: -3px 0 0; }
.cx-nav.is-rail .cx-nav-foot { display: flex; justify-content: center; }
</style>
