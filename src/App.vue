<!-- Coquille de l'application : navigation, barre supérieure, bandeaux, contenu routé, pied de page, palette de recherche et notifications. -->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppCriteriaHost from './components/shell/AppCriteriaHost.vue'
import AppFooter from './components/shell/AppFooter.vue'
import AppLoadProgress from './components/shell/AppLoadProgress.vue'
import AppSideNav from './components/shell/AppSideNav.vue'
import type { ResourceLink } from './components/shell/AppSideNav.vue'
import AppStorageBanner from './components/shell/AppStorageBanner.vue'
import AppTabBar from './components/shell/AppTabBar.vue'
import AppTopBar from './components/shell/AppTopBar.vue'
import AppUpdatePrompt from './components/shell/AppUpdatePrompt.vue'
import CxCommandPalette from './components/ds/CxCommandPalette.vue'
import IconSprite from './components/ds/IconSprite.vue'
import CxToastHost from './components/ds/CxToastHost.vue'
import { useBreakpoint } from './composables/useBreakpoint.ts'
import { GUIDE_LINKS, INTERACTIVE_MAPS, wikiSearchUrl } from './data/externalLinks.ts'
import { hasCriteriaPanel } from './router/meta.ts'
import { labelText } from './ui/explainText.ts'

/**
 * Racine de l'application (architecture § 10.1). Elle assemble les repères de page (`header`, `nav`, `main`, `footer`), réserve l'emplacement
 * du panneau de critères sur les écrans qui en ont un, et monte une fois le sprite d'icônes, la palette de recherche et les notifications.
 * À chaque changement de chemin, le focus passe au titre `h1` du nouvel écran (sinon à `main`) : un lecteur d'écran annonce ainsi la page,
 * et un utilisateur du clavier repart du haut du contenu. Un changement de la seule requête (filtre, tri) ne déplace pas le focus.
 */
const route = useRoute()
const { isMobile } = useBreakpoint()

/**
 * Liens de la section « Ressources » : cartes interactives (eldenring.wiki.gg, Fextralife) puis pages de guides, d'après `src/data/externalLinks.ts`.
 * Constante : les adresses sont fixes et le libellé vient de `labelText` ; `AppSideNav` les ouvre dans un nouvel onglet (`rel="noopener noreferrer"`).
 */
const resources: readonly ResourceLink[] = [...INTERACTIVE_MAPS, ...GUIDE_LINKS].map((link) => ({ label: labelText(link.labelCode), href: link.url }))

const content = ref<HTMLElement | null>(null)

/** Donne le focus au titre de l'écran, ou au conteneur du contenu à défaut, sans faire défiler la page. */
function focusTitle(): void {
  const main = content.value
  if (!main) return
  const target = main.querySelector<HTMLElement>('h1') ?? main
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

watch(
  () => route.path,
  async () => {
    await nextTick()
    focusTitle()
  },
)
</script>

<template>
  <IconSprite />
  <!-- Le lien d'évitement ne change pas l'adresse (le routeur lit le « hash ») : il donne le focus au contenu. -->
  <a
    class="cx-skip"
    href="#main"
    @click.prevent="focusTitle"
  >Aller au contenu</a>

  <div class="cx-app">
    <AppSideNav
      v-if="!isMobile"
      :resources="resources"
    />
    <div class="cx-main">
      <AppTopBar />
      <AppUpdatePrompt />
      <AppStorageBanner />
      <AppLoadProgress />
      <div class="cx-body">
        <AppCriteriaHost v-if="hasCriteriaPanel(route)" />
        <main
          id="main"
          ref="content"
          class="cx-content"
          tabindex="-1"
        >
          <RouterView />
        </main>
      </div>
      <AppFooter />
    </div>
    <AppTabBar v-if="isMobile" />
  </div>

  <CxCommandPalette :wiki-search-url="wikiSearchUrl" />
  <CxToastHost />
</template>

<style>
.cx-app { display: flex; align-items: stretch; min-height: 100vh; min-height: 100dvh; background: var(--bg); }
.cx-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; }
.cx-body { flex: 1 1 auto; display: flex; align-items: stretch; min-width: 0; }
.cx-content { flex: 1 1 0; min-width: 0; }
.cx-content:focus { outline: none; }
@media (max-width: 767px) {
  .cx-app { flex-direction: column; }
  .cx-main { flex: 1 1 auto; }
}
/* Lien d'évitement : hors écran jusqu'au focus clavier, puis en haut à gauche au-dessus de tout. */
.cx a.cx-skip { position: fixed; top: var(--space-2); left: var(--space-2); z-index: var(--z-toast); padding: var(--space-2) var(--space-3); border-radius: var(--radius-s); background: var(--gold); color: var(--on-gold); font-weight: 600; text-decoration: none; transform: translateY(-200%); }
.cx a.cx-skip:focus { transform: none; }
</style>
