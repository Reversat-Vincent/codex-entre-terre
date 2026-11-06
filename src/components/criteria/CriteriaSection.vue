<!-- Section du panneau de critères : titre fixe sur desktop, rubrique repliable (accordéon) dans le tiroir et la feuille. -->
<script setup lang="ts">
import { useId } from 'vue'
import CxIcon from '../ds/CxIcon.vue'
import type { SectionId } from './criteriaModel.ts'

/**
 * Section du panneau de critères (design `Main.dc.html` pour la colonne, `MobileCriteres.dc.html` pour la feuille).
 * Non repliable : titre `h3` et mention discrète. Repliable : le titre est un bouton `aria-expanded` relié à son contenu, avec un résumé d'une ligne
 * (le critère reste lisible section fermée). Le contenu est dans le slot par défaut ; l'état d'ouverture est tenu par le panneau (une seule section ouverte).
 */
defineProps<{
  /** Identifiant de la section (ancre `crit-sec-<id>` utilisée par les puces de critères). */
  id: SectionId
  /** Titre de la section. */
  title: string
  /** Section repliable (tiroir, feuille) ou fixe (colonne du desktop). */
  collapsible: boolean
  /** Section ouverte ; ignoré si elle n'est pas repliable. */
  open: boolean
  /** Résumé d'une ligne, sous le titre d'une section repliable. */
  summary?: string
  /** Mention discrète à droite du titre d'une section fixe. */
  hint?: string
}>()

defineEmits<{
  /** Demande d'ouverture ou de fermeture (section repliable). */
  toggle: []
}>()

const bodyId = useId()
</script>

<template>
  <section
    :id="`crit-sec-${id}`"
    class="cx-crit-sec"
    :class="{ 'is-collapsible': collapsible }"
  >
    <h3 v-if="!collapsible">
      {{ title }}<small v-if="hint">{{ hint }}</small>
    </h3>
    <h3
      v-else
      class="cx-crit-acc-h"
    >
      <button
        type="button"
        class="cx-crit-acc"
        :aria-expanded="open"
        :aria-controls="bodyId"
        @click="$emit('toggle')"
      >
        <span>
          <b>{{ title }}</b>
          <small v-if="summary">{{ summary }}</small>
        </span>
        <CxIcon :name="open ? 'chev-u' : 'chev-d'" />
      </button>
    </h3>
    <div
      v-if="!collapsible || open"
      :id="bodyId"
      class="cx-crit-body"
    >
      <slot />
    </div>
  </section>
</template>

<style>
.cx-crit-sec { display: grid; gap: 10px; padding: 14px var(--space-4); border-bottom: 1px solid var(--line); }
.cx-crit-sec > h3 { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); color: var(--ink); font: 600 13px/18px var(--font-sans); }
.cx-crit-sec > h3 small { color: var(--ink-3); font-weight: 400; font-size: 12px; }
.cx-crit-body { display: grid; gap: 10px; min-width: 0; }
/* Accordéon : en-tête de 56 px (44 px au minimum sous 768 px), résumé sur une ligne. */
.cx-crit-sec.is-collapsible { gap: 0; padding-block: 0; }
.cx-crit-sec.is-collapsible > .cx-crit-acc-h { display: block; }
.cx-crit-acc { display: flex; align-items: center; gap: var(--space-2); width: 100%; min-height: 56px; padding: 0; border: 0; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.cx-crit-acc b { display: block; font: 600 15px/20px var(--font-sans); }
.cx-crit-acc small { display: block; color: var(--ink-3); font-size: 12px; line-height: 16px; font-weight: 400; overflow-wrap: anywhere; }
.cx-crit-acc > .cx-i { margin-left: auto; }
.cx-crit-sec.is-collapsible > .cx-crit-body { padding-bottom: var(--space-4); }
/* Le panneau « Pourquoi ? » tient en une colonne : celle des critères fait 304 px, loin des trois colonnes prévues pour un widget. */
.cx-crit-sec .cx-why { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
.cx-crit-sec .cx-why-wrap { justify-items: start; }
.cx-crit-sec .cx-why-wrap > .cx-why { justify-self: stretch; }
</style>
