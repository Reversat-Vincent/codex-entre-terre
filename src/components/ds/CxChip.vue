<!-- Puce : libellé facultatif, valeur, ouverture au clic et croix de retrait facultatives (critères actifs, filtres actifs). -->
<script setup lang="ts">
import CxIcon from './CxIcon.vue'

/**
 * Puce arrondie du design system (`.cx-chip`, README CriteriaChips). Le contenu est la valeur ; `label` ajoute le nom du critère en discret.
 * Avec `interactive`, le corps de la puce est un vrai `button` (événement `open`) ; avec `removeLabel`, une croix distincte, `button` à part
 * (un bouton ne contient pas un autre bouton), émet `remove`. Mise en avant `active` : fond et filet or.
 */
defineProps<{
  /** Nom du critère (« Origine »), affiché avant la valeur. */
  label?: string
  /** Met la puce en avant (`.is-on`). */
  active?: boolean
  /** Le corps de la puce est un bouton (ouvre la section correspondante). */
  interactive?: boolean
  /** Nom accessible de la croix de retrait ; sans lui, pas de croix. */
  removeLabel?: string
  /** Nom accessible du corps quand il est un bouton, si le texte visible ne suffit pas. */
  openLabel?: string
}>()

const emit = defineEmits<{
  /** Clic sur le corps de la puce (`interactive`). */
  open: []
  /** Clic sur la croix. */
  remove: []
}>()
</script>

<template>
  <span
    class="cx-chip"
    :class="{ 'is-on': active, 'is-interactive': interactive }"
  >
    <button
      v-if="interactive"
      type="button"
      class="cx-chip-main"
      :aria-label="openLabel"
      @click="emit('open')"
    >
      <span
        v-if="label"
        class="k"
      >{{ label }}</span><slot />
    </button>
    <span
      v-else
      class="cx-chip-main"
    >
      <span
        v-if="label"
        class="k"
      >{{ label }}</span><slot />
    </span>
    <button
      v-if="removeLabel"
      type="button"
      class="cx-chip-x"
      :aria-label="removeLabel"
      @click="emit('remove')"
    ><CxIcon
      name="x"
      size="xs"
    /></button>
  </span>
</template>

<style>
.cx-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-pill); background: var(--surface); color: var(--ink); font-size: 12px; line-height: 16px; font-weight: 600; white-space: nowrap; }
.cx-chip-main { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; }
button.cx-chip-main { cursor: pointer; }
.cx-chip .k { color: var(--ink-3); font-weight: 600; }
.cx-chip.is-interactive:hover { border-color: var(--control-border); background: var(--surface-hover); }
.cx-chip.is-on { border-color: var(--gold-line); background: var(--gold-wash); color: var(--gold-text); }
.cx-chip-x { display: grid; place-items: center; width: 18px; height: 18px; margin-right: -6px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ink-3); cursor: pointer; }
.cx-chip-x:hover { background: var(--surface-hover); color: var(--ink); }
</style>
