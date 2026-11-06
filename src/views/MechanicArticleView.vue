<!-- Écran « Mécanique » : article d'un sujet du jeu (introduction, sections, tableaux) avec sommaire latéral, source et liens vers le wiki. -->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WikiTable from '../components/domain/WikiTable.vue'
import WikiText from '../components/domain/WikiText.vue'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxEntityName from '../components/ds/CxEntityName.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSkeleton from '../components/ds/CxSkeleton.vue'
import CxWikiLink from '../components/ds/CxWikiLink.vue'
import { useDatasets } from '../composables/useDatasets.ts'
import { usePageTitle } from '../composables/usePageTitle.ts'
import { useScrollSpy } from '../composables/useScrollSpy.ts'
import { fextralifeSearchUrl, wikiUrlOf } from '../data/externalLinks.ts'
import type { MechanicEntry } from '../data/types/mechanics.ts'
import { useDataStore } from '../stores/data.ts'
import { articleSections, infoboxRows, resolveSectionAnchor, topicLabel } from '../ui/mechanics.ts'

/**
 * Article d'une mécanique (`/mecaniques/:id`, `?section=<ancre>`), brief § 6 : titre avec badge de source, « Voir sur le wiki » et « Voir sur Fextralife »,
 * sommaire latéral (≥ 1280 px) ou repliable (en dessous), sections dans l'ordre du wiki avec leurs tableaux, mention de licence CC BY-SA.
 * Les textes et tableaux sont rendus par `WikiText` et `WikiTable` ; les noms d'entités cités deviennent des liens quand ils sont exacts.
 */
const route = useRoute()
const router = useRouter()
const data = useDataStore()
const { status, failed, retry } = useDatasets(['mechanics', 'search-index'])

const id = computed(() => String(route.params.id ?? ''))
const entry = computed(() => data.entity(`mechanic:${id.value}`) as MechanicEntry | null)
const ready = computed(() => data.files.mechanics.status === 'ready')
const sections = computed(() => (entry.value ? articleSections(entry.value) : []))
const infobox = computed(() => infoboxRows(entry.value?.infobox))
const requested = computed(() => resolveSectionAnchor(sections.value, route.query.section))
const wikiUrl = computed(() => (entry.value ? wikiUrlOf(entry.value) : null))

usePageTitle(() => entry.value?.title)

const elementId = (anchor: string): string => `section-${anchor}`
const spy = useScrollSpy(() => sections.value.map((s) => elementId(s.anchor)))
/** Section marquée dans le sommaire : celle du défilement, sinon celle de l'adresse, sinon la première. */
const current = computed(() => spy.active.value ?? (requested.value ? elementId(requested.value) : elementId(sections.value[0]?.anchor ?? '')))

/** Sommaire replié (mobile et tablette) ou ouvert. */
const tocOpen = ref(false)

/** Rejoint la section demandée par `?section=` dès qu'elle est dans la page (données chargées, rendu fait). */
watch(
  [requested, entry],
  async ([anchor]) => {
    if (anchor === null) return
    await nextTick()
    document.getElementById(elementId(anchor))?.scrollIntoView({ block: 'start' })
  },
  { immediate: true, flush: 'post' },
)

/**
 * Choisit une section dans le sommaire : l'adresse porte l'ancre (`replace` : pas une page de plus dans l'historique) et le sommaire se replie.
 * @param anchor Ancre de la section.
 */
function goTo(anchor: string): void {
  spy.set(elementId(anchor))
  tocOpen.value = false
  void router.replace({ name: 'mechanic', params: { id: id.value }, query: { section: anchor } })
}
</script>

<template>
  <article class="v-article">
    <RouterLink
      class="cx-btn cx-btn-ghost cx-btn-sm v-article-back"
      :to="{ name: 'mechanics' }"
    >
      <CxIcon
        name="chev-l"
        size="sm"
      />Mécaniques
    </RouterLink>

    <div
      v-if="status === 'loading' && !entry"
      class="cx-loading"
      aria-busy="true"
    >
      <CxSkeleton
        width="35%"
        :height="32"
      />
      <CxSkeleton :height="16" />
      <CxSkeleton
        width="80%"
        :height="16"
      />
      <CxSkeleton :height="120" />
    </div>

    <CxNote
      v-else-if="status === 'error' && !entry"
      tone="warn"
      title="Impossible de lire cet article."
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

    <template v-else-if="!entry && ready">
      <h1 class="titre-l">
        Élément introuvable
      </h1>
      <CxEmptyState
        title="Cette mécanique n’existe pas dans les données."
        text="Le lien est peut-être ancien. Le sommaire liste tous les sujets disponibles."
      />
      <RouterLink
        class="cx-btn v-article-back"
        :to="{ name: 'mechanics' }"
      >
        Voir toutes les mécaniques
      </RouterLink>
    </template>

    <template v-else-if="entry">
      <header class="v-article-head">
        <CxEntityName
          :name="entry.title"
          :source="entry.source"
          size="xl"
          as="h1"
        >
          <template #meta>
            <span class="cx-ink2">{{ topicLabel(entry.topic) }}</span>
          </template>
          <template #actions>
            <CxWikiLink :href="wikiUrl" />
            <CxButton
              variant="ghost"
              icon="ext"
              :href="fextralifeSearchUrl(entry.title)"
              external
            >
              Voir sur Fextralife<span class="cx-sr"> (s'ouvre dans un nouvel onglet)</span>
            </CxButton>
          </template>
        </CxEntityName>
      </header>

      <div
        class="v-article-body"
        :class="{ 'has-toc': sections.length > 1 }"
      >
        <nav
          v-if="sections.length > 1"
          class="v-toc"
          aria-label="Sommaire de l’article"
        >
          <button
            class="cx-btn v-toc-toggle"
            type="button"
            :aria-expanded="tocOpen"
            aria-controls="article-toc"
            @click="tocOpen = !tocOpen"
          >
            <span class="cx-row"><CxIcon name="list" />Sommaire ({{ sections.length }} sections)</span>
            <CxIcon :name="tocOpen ? 'chev-u' : 'chev-d'" />
          </button>
          <p class="cx-label v-toc-title">
            Sommaire
          </p>
          <ol
            id="article-toc"
            class="v-toc-list"
            :class="{ 'is-open': tocOpen }"
          >
            <li
              v-for="section in sections"
              :key="section.anchor"
            >
              <RouterLink
                class="v-toc-link"
                :to="{ name: 'mechanic', params: { id }, query: { section: section.anchor } }"
                replace
                :aria-current="current === elementId(section.anchor) ? 'location' : undefined"
                @click.prevent="goTo(section.anchor)"
              >
                {{ section.title }}
              </RouterLink>
            </li>
          </ol>
        </nav>

        <div class="v-article-content">
          <section
            v-for="section in sections"
            :id="elementId(section.anchor)"
            :key="section.anchor"
            class="v-section"
            :aria-labelledby="`${elementId(section.anchor)}-title`"
          >
            <h2
              :id="`${elementId(section.anchor)}-title`"
              class="titre-m"
            >
              {{ section.title }}
            </h2>
            <dl
              v-if="section.intro && infobox.length > 0"
              class="v-infobox"
            >
              <div
                v-for="row in infobox"
                :key="row.label"
              >
                <dt class="cx-label">
                  {{ row.label }}
                </dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>
            <WikiText
              v-if="section.text.length > 0"
              :lines="section.text"
              :skip-ref="`mechanic:${entry.id}`"
            />
            <WikiTable
              v-for="(table, t) in section.tables"
              :key="t"
              :rows="table"
              :caption="section.tables.length > 1 ? `Tableau ${t + 1} sur ${section.tables.length}` : undefined"
              :skip-ref="`mechanic:${entry.id}`"
            />
          </section>

          <footer class="v-licence cx-muted">
            Texte et tableaux repris de
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
            Les noms du jeu restent en anglais ; la mise en page est celle du Codex.
          </footer>
        </div>
      </div>
    </template>
  </article>
</template>

<style scoped>
.v-article { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); align-content: start; max-width: 1180px; padding: var(--space-6); }
.v-article-back { justify-self: start; }
.v-article-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); min-width: 0; }
.v-article-content { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-8); min-width: 0; }
.v-section { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); min-width: 0; scroll-margin-top: calc(var(--size-topbar) + var(--space-4)); }
.v-infobox { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr)); gap: var(--space-2); max-width: 72ch; margin: 0; padding: var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); }
.v-infobox dd { margin: 0; font-variant-numeric: tabular-nums; }
.v-licence { max-width: 72ch; padding-top: var(--space-4); border-top: 1px solid var(--line); font-size: 12px; line-height: 17px; }

.v-toc { min-width: 0; }
.v-toc-title { display: none; margin-bottom: var(--space-2); }
.v-toc-toggle { width: 100%; justify-content: space-between; }
.v-toc-list { display: none; gap: 2px; margin-top: var(--space-2); }
.v-toc-list.is-open { display: grid; }
.v-toc-link { display: block; padding: var(--space-2) var(--space-3); border-left: 2px solid var(--line); color: var(--ink-2); text-decoration: none; overflow-wrap: anywhere; }
.v-toc-link:hover { background: var(--surface-hover); color: var(--ink); }
.v-toc-link[aria-current='location'] { border-left-color: var(--gold); background: var(--gold-wash); color: var(--ink); font-weight: 600; }

@media (min-width: 1280px) {
  .v-article-body.has-toc { grid-template-columns: 220px minmax(0, 1fr); gap: var(--space-8); align-items: start; }
  .v-toc { position: sticky; top: calc(var(--size-topbar) + var(--space-4)); max-height: calc(100dvh - var(--size-topbar) - var(--space-8)); overflow-y: auto; }
  .v-toc-toggle { display: none; }
  .v-toc-title { display: block; }
  .v-toc-list { display: grid; margin-top: 0; }
  .v-toc-link { padding-block: 6px; }
}
@media (max-width: 767px) {
  .v-article { padding: var(--space-4); }
}
</style>
