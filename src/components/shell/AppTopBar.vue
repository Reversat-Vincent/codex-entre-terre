<!-- Barre supérieure : champ de recherche qui ouvre la palette (Ctrl/⌘ + K), Ma liste, thème, profil ; en-tête compact sous 768 px. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBreakpoint } from '../../composables/useBreakpoint.ts'
import { useCriteriaPanel } from '../../composables/useCriteriaPanel.ts'
import { hasCriteriaPanel } from '../../router/meta.ts'
import { usePinsStore } from '../../stores/pins.ts'
import { usePreferencesStore } from '../../stores/preferences.ts'
import { useProfilesStore } from '../../stores/profiles.ts'
import { useSearchStore } from '../../stores/search.ts'
import { formatInt } from '../../ui/format.ts'
import CxButton from '../ds/CxButton.vue'
import CxIcon from '../ds/CxIcon.vue'

/**
 * Barre supérieure (architecture § 10.1, note `spec-search`). Le champ n'est pas un vrai champ de saisie : c'est un bouton qui ouvre la palette de recherche,
 * qui se saisit ensuite en plein écran sous 768 px. Sous 768 px : marque, recherche et Ma liste (cibles de 44 px) ; sur tablette, un bouton « Critères »
 * ouvre le tiroir quand l'écran a un panneau de critères.
 */
const route = useRoute()
const search = useSearchStore()
const pins = usePinsStore()
const prefs = usePreferencesStore()
const profiles = useProfilesStore()
const { isMobile, isTablet } = useBreakpoint()
const { openOverlay } = useCriteriaPanel()

/** Touche de modification affichée : ⌘ sur macOS et iOS, Ctrl ailleurs (l'écoute accepte les deux). */
const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

const pinCount = computed(() => pins.items.length)
const themeLabel = computed(() => (prefs.theme === 'sombre' ? 'Passer au thème parchemin' : 'Passer au thème sombre'))
const profileName = computed(() => profiles.active?.name ?? 'Profil')
const showCriteriaButton = computed(() => isTablet.value && hasCriteriaPanel(route))
const listLabel = computed(() => (pinCount.value > 0 ? `Ma liste, ${formatInt(pinCount.value)} éléments` : 'Ma liste'))
</script>

<template>
  <header
    class="cx-topbar"
    :class="{ 'is-mobile': isMobile }"
  >
    <template v-if="isMobile">
      <RouterLink
        class="cx-brand cx-topbar-brand"
        to="/"
      >
        <svg
          class="cx-mark"
          aria-hidden="true"
        ><use href="#i-mark" /></svg>
        <span class="cx-brand-name">Codex</span>
      </RouterLink>
      <button
        type="button"
        class="cx-icon44"
        aria-label="Rechercher"
        aria-haspopup="dialog"
        @click="search.openPalette()"
      >
        <CxIcon
          name="search"
          size="lg"
        />
      </button>
      <RouterLink
        class="cx-icon44"
        to="/ma-liste"
        :aria-label="listLabel"
      >
        <CxIcon
          name="list"
          size="lg"
        />
        <span
          v-if="pinCount > 0"
          class="cx-dot"
          aria-hidden="true"
        >{{ formatInt(pinCount) }}</span>
      </RouterLink>
    </template>

    <template v-else>
      <button
        type="button"
        class="cx-search"
        aria-haspopup="dialog"
        @click="search.openPalette()"
      >
        <CxIcon name="search" />
        <span>Rechercher une arme, un boss, un lieu…</span>
        <span
          class="cx-kbd"
          aria-hidden="true"
        >{{ modKey }} K</span>
        <span class="cx-sr">Raccourci : {{ modKey }} + K</span>
      </button>
      <div class="cx-topbar-right">
        <CxButton
          v-if="showCriteriaButton"
          icon="sliders"
          aria-haspopup="dialog"
          @click="openOverlay()"
        >
          Critères
        </CxButton>
        <RouterLink
          class="cx-btn cx-btn-ghost"
          to="/ma-liste"
          :aria-label="listLabel"
        >
          <CxIcon name="list" />Ma liste<span
            v-if="pinCount > 0"
            class="cx-topbar-count"
            aria-hidden="true"
          >{{ formatInt(pinCount) }}</span>
        </RouterLink>
        <CxButton
          variant="ghost"
          icon-only
          :icon="prefs.theme === 'sombre' ? 'sun' : 'moon'"
          :label="themeLabel"
          @click="prefs.toggleTheme()"
        />
        <RouterLink
          class="cx-btn cx-btn-ghost"
          to="/profil"
        >
          <CxIcon name="user" />{{ profileName }}
        </RouterLink>
      </div>
    </template>
  </header>
</template>

<style>
.cx-topbar { position: sticky; top: 0; z-index: var(--z-sticky); display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); min-height: var(--size-topbar); padding: var(--space-2) var(--space-6); border-bottom: 1px solid var(--line); background: var(--bg); }
.cx-search { display: flex; align-items: center; gap: var(--space-2); flex: 1 1 280px; max-width: 520px; height: 36px; padding: 0 var(--space-2) 0 var(--space-3); border: 1px solid var(--control-border); border-radius: var(--radius-s); background: var(--surface-sunken); color: var(--ink-3); font-size: 14px; text-align: left; cursor: pointer; }
.cx-search:hover { border-color: var(--gold-line); color: var(--ink-2); }
.cx-search .cx-kbd { margin-left: auto; }
.cx-topbar-right { display: flex; align-items: center; gap: var(--space-2); margin-left: auto; }
.cx-topbar-count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: var(--radius-pill); background: var(--surface-sunken); color: var(--ink-2); font: 600 11px/18px var(--font-sans); text-align: center; font-variant-numeric: tabular-nums; }
/* En-tête mobile (Mobile.dc.html) : 56 px, marque à gauche, deux icônes de 44 px. */
.cx-topbar.is-mobile { flex-wrap: nowrap; gap: var(--space-2); height: 56px; padding: 0 var(--space-2) 0 var(--space-4); }
.cx-topbar-brand { flex: 1 1 auto; padding: 0; }
.cx-topbar.is-mobile .cx-brand-name { font-size: 20px; }
.cx-icon44, .cx a.cx-icon44 { position: relative; display: inline-grid; place-items: center; width: var(--size-cible); height: var(--size-cible); padding: 0; border: 0; border-radius: var(--radius-s); background: transparent; color: var(--ink-2); text-decoration: none; cursor: pointer; }
.cx-icon44:hover { background: var(--surface-hover); color: var(--ink); }
.cx-dot { position: absolute; top: 6px; right: 4px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: var(--radius-pill); background: var(--gold); color: var(--on-gold); font: 700 10px/16px var(--font-sans); text-align: center; }
@media (max-width: 1279px) { .cx-topbar { padding-inline: var(--space-4); } }
</style>
