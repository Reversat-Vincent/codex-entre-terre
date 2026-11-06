<!-- Texte du wiki : sous-titres `[Titre]`, paragraphes et listes à puces imbriquées, rendus par interpolation, avec liens vers les entités citées. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityKind, EntityRef } from '../../data/datasets.ts'
import type { NameIndex } from '../../data/links.ts'
import { parseWikiLines } from '../../data/wikiText.ts'
import type { WikiTextMode } from '../../data/wikiText.ts'
import WikiInline from './WikiInline.vue'
import WikiListItems from './WikiListItems.vue'

/**
 * Rend des lignes de texte du wiki (docs/architecture.md § 10.5) : `parseWikiLines` les range en blocs, le composant les affiche par interpolation
 * (aucun `v-html`) ; `white-space: pre-line` garde les retours à la ligne du wiki.
 * Un nom devient un lien vers sa fiche seulement s'il correspond exactement à une entité (`resolveName`) ; sinon il reste du texte.
 * Réutilisé par toutes les fiches (description, notes, séquence de quête…).
 */
const props = withDefaults(
  defineProps<{
    /** Lignes de texte, telles que dans data/ (`[Titre]`, puces préfixées par `→`). */
    lines: readonly string[]
    /** `paragraphs` (défaut) : une ligne simple est un paragraphe, les `→` sont des puces ; `list` : chaque ligne est une puce. */
    mode?: WikiTextMode
    /** Niveau des sous-titres `[Titre]` : 3 (défaut, sous un titre de section `h2`) ou 4. */
    headingLevel?: 3 | 4
    /** Index des noms ; absent : celui du fichier `search-index` chargé ; `null` : aucun lien. */
    names?: NameIndex | null
    /** Genres préférés pour départager un nom partagé par plusieurs entités. */
    preferredKinds?: readonly EntityKind[]
    /** Entité décrite par la page : jamais liée à elle-même. */
    skipRef?: EntityRef | null
  }>(),
  { mode: 'paragraphs', headingLevel: 3, names: undefined, preferredKinds: () => [], skipRef: null },
)

const blocks = computed(() => parseWikiLines(props.lines, props.mode))
</script>

<template>
  <div class="wiki-text">
    <template
      v-for="(block, i) in blocks"
      :key="i"
    >
      <component
        :is="`h${headingLevel}`"
        v-if="block.kind === 'heading'"
        class="wiki-heading"
        :class="`wiki-h${headingLevel}`"
      >
        {{ block.text }}
      </component>
      <WikiListItems
        v-else-if="block.kind === 'list'"
        :items="block.items"
        :names="names"
        :preferred-kinds="preferredKinds"
        :skip-ref="skipRef"
      />
      <p
        v-else
        class="wiki-p"
      >
        <WikiInline
          :text="block.text"
          :names="names"
          :preferred-kinds="preferredKinds"
          :skip-ref="skipRef"
        />
      </p>
    </template>
  </div>
</template>

<style>
.wiki-text { display: grid; gap: var(--space-3); max-width: 72ch; font: 400 15px/23px var(--font-sans); color: var(--ink); overflow-wrap: anywhere; }
.wiki-text .wiki-p { white-space: pre-line; }
.wiki-text .wiki-heading { margin-top: var(--space-2); color: var(--ink); text-wrap: balance; }
.wiki-text .wiki-h3 { font: 600 20px/26px var(--font-display); }
.wiki-text .wiki-h4 { font: 600 15px/22px var(--font-sans); color: var(--ink-2); }
.cx .wiki-list { display: grid; gap: var(--space-1); padding-left: var(--space-5); list-style: disc; }
.cx .wiki-list > li { white-space: pre-line; }
.cx .wiki-list .wiki-list { margin-top: var(--space-1); list-style: circle; }
.cx .wiki-list > li::marker { color: var(--ink-3); }
.cx a.wiki-ref { color: var(--gold-text); text-decoration: underline dotted; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.cx a.wiki-ref:hover { text-decoration-style: solid; }
/* Mobile : un lien qui forme à lui seul une puce ou un paragraphe fait 44 px (`--size-cible`) ; un lien au milieu d'une phrase reste dans la ligne (cas « en ligne » de WCAG 2.5.8). */
@media (max-width: 767px) { .cx a.wiki-ref:only-child { display: inline-block; min-width: var(--size-cible); min-height: var(--size-cible); line-height: var(--size-cible); } }
</style>
