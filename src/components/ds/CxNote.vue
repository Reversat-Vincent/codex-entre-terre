<!-- Bandeau d'information : note neutre, données partielles, résultat estimé, erreur ou valeur calculée. -->
<script setup lang="ts">
import { computed } from 'vue'
import CxIcon from './CxIcon.vue'

/**
 * Bandeau d'information (README du design system, composant States).
 * Chaque ton porte une icône et un mot en tête (`title`) : jamais la couleur seule.
 * - `partial` : combien d'entrées manquent et comment elles apparaissent ;
 * - `est` : le résultat repose sur une estimation ;
 * - `warn` : erreur ou limite (quel fichier, quoi faire ; pas d'excuses) ;
 * - `calc` : explication d'une valeur calculée.
 */
const props = withDefaults(
  defineProps<{
    /** Ton du bandeau ; sans valeur, bandeau neutre. */
    tone?: 'info' | 'partial' | 'est' | 'warn' | 'calc'
    /** Phrase d'accroche en gras (« Données partielles. »), suivie du texte du slot. */
    title?: string
    /** Nom d'une icône du sprite pour remplacer celle du ton. */
    icon?: string
    /** Rôle ARIA : `alert` pour une erreur à annoncer, `status` pour un message de fond ; aucun par défaut. */
    role?: 'alert' | 'status'
  }>(),
  { tone: 'info', title: undefined, icon: undefined, role: undefined },
)

const TONE_ICONS = { info: 'info', partial: 'empty', est: 'approx', warn: 'alert', calc: 'calc' } as const
const iconName = computed(() => props.icon ?? TONE_ICONS[props.tone])
const toneClass = computed(() => (props.tone === 'info' ? '' : props.tone))
</script>

<template>
  <div
    class="cx-note"
    :class="toneClass"
    :role="role"
  >
    <CxIcon :name="iconName" />
    <div class="cx-note-body">
      <b v-if="title">{{ title }}</b>{{ title ? ' ' : '' }}<slot />
    </div>
  </div>
</template>

<style>
.cx-note { display: flex; align-items: flex-start; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-s); background: var(--surface-raised); color: var(--ink-2); font-size: 12px; line-height: 17px; }
.cx-note .cx-i { margin-top: 1px; }
.cx-note b { color: var(--ink); font-weight: 600; }
.cx-note-body { min-width: 0; }
.cx-note.est { border-style: dashed; border-color: var(--estimate); background: var(--estimate-wash); }
.cx-note.est > .cx-i { color: var(--estimate); }
.cx-note.partial { border-style: dashed; }
.cx-note.warn { border-color: color-mix(in srgb, var(--warn) 55%, transparent); background: var(--warn-wash); }
.cx-note.warn > .cx-i { color: var(--warn); }
.cx-note.calc { border-color: var(--gold-line); background: var(--gold-wash); }
.cx-note.calc > .cx-i { color: var(--gold-text); }
</style>
