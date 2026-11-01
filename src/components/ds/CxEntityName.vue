<!-- Nom d'une entité (arme, boss…) : nom anglais des données, sous-titre français facultatif, badge de source, rappel des valeurs de base. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SourceName } from '../../ui/labels.ts'
import CxSourceBadge from './CxSourceBadge.vue'

/**
 * En-tête d'une entrée (README du design system, composant EntityName).
 * Le nom est une donnée en anglais, affichée telle quelle. L'emplacement du sous-titre (traduction française éventuelle)
 * est réservé mais ne s'affiche que s'il contient du texte : ni tiret ni « N/A ».
 * Slots : `name` remplace le texte du nom (pour un lien vers la fiche), `meta` ajoute classe, poids, etc. à la ligne de métadonnées,
 * `actions` accueille par exemple `CxWikiLink`.
 */
const props = withDefaults(
  defineProps<{
    /** Nom de l'entité, en anglais, tel que dans les données. */
    name: string
    /** Traduction française facultative ; vide, `null` ou absente : rien n'est affiché. */
    subtitle?: string | null
    /** Source de l'entrée ; sans elle, pas de badge. */
    source?: SourceName
    /** Rappel des valeurs brutes : `+0` pour une arme (« Valeurs de base à +0 »), `NG` pour un boss (« Valeurs NG »). */
    base?: '+0' | 'NG'
    /** `xl` : tête de fiche (`titre-xl`) ; `s` : carte, nœud ou ligne de résultat (`titre-s`). */
    size?: 'xl' | 's'
    /** Balise du nom : `h1` par défaut en `xl`, `span` en `s`. */
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  }>(),
  { subtitle: undefined, source: undefined, base: undefined, size: 's', as: undefined },
)

const tag = computed(() => props.as ?? (props.size === 'xl' ? 'h1' : 'span'))
const hasSubtitle = computed(() => Boolean(props.subtitle && props.subtitle.trim()))
const baseText = computed(() => (props.base === '+0' ? 'Valeurs de base à +0' : props.base === 'NG' ? 'Valeurs NG' : ''))
</script>

<template>
  <div class="cx-entity">
    <div class="cx-entity-line">
      <component
        :is="tag"
        :class="size === 'xl' ? 'titre-xl' : 'titre-s'"
      >
        <slot name="name">
          {{ name }}
        </slot>
      </component>
      <CxSourceBadge
        v-if="source"
        :source="source"
      />
    </div>
    <p
      v-if="hasSubtitle"
      class="sous-titre cx-entity-sub"
    >
      {{ subtitle }}
    </p>
    <div
      v-if="$slots.meta || baseText"
      class="cx-row cx-entity-meta"
    >
      <slot name="meta" />
      <span
        v-if="baseText"
        class="cx-muted"
      >{{ baseText }}</span>
    </div>
    <div
      v-if="$slots.actions"
      class="cx-row cx-entity-actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<style>
.cx-entity { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cx-entity-line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.cx-entity-sub { color: var(--ink-3); }
.cx-entity-meta { margin-top: var(--space-2); color: var(--ink-2); }
.cx-entity-actions { margin-top: var(--space-2); }
</style>
