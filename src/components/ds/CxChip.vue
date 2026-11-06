<!-- Puce : libellé facultatif, valeur, ouverture au clic et croix de retrait facultatives (critères actifs, filtres actifs). -->
<script setup lang="ts">
import CxIcon from './CxIcon.vue'

/**
 * Puce arrondie du design system (`.cx-chip`, README CriteriaChips). Le contenu est la valeur ; `label` ajoute le nom du critère en discret.
 * Avec `interactive`, le corps de la puce est un vrai `button` (événement `open`) ; avec `removeLabel`, une croix distincte, `button` à part
 * (un bouton ne contient pas un autre bouton), émet `remove`. Mise en avant `active` : fond et filet or.
 */
withDefaults(defineProps<{
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
  /**
   * Mode « bascule » (filtre, choix multiple) : la puce entière est un `button` avec `aria-pressed`, qui émet `open` au clic.
   * Absent : la puce n'est pas une bascule. Sans croix dans ce mode.
   */
  pressed?: boolean
}>(), {
  label: undefined,
  active: false,
  interactive: false,
  removeLabel: undefined,
  openLabel: undefined,
  // Sans valeur par défaut explicite, Vue ferait de l'absence d'un booléen « faux » : le mode bascule serait toujours actif.
  pressed: undefined,
})

const emit = defineEmits<{
  /** Clic sur le corps de la puce (`interactive`). */
  open: []
  /** Clic sur la croix. */
  remove: []
}>()
</script>

<template>
  <button
    v-if="pressed !== undefined"
    type="button"
    class="cx-chip is-toggle"
    :aria-pressed="pressed"
    @click="emit('open')"
  >
    <slot />
  </button>
  <span
    v-else
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
button.cx-chip { cursor: pointer; }
button.cx-chip:hover { border-color: var(--control-border); background: var(--surface-hover); }
.cx-chip[aria-pressed="true"] { border-color: var(--gold-line); background: var(--gold-wash); color: var(--gold-text); }
.cx-chip.is-on { border-color: var(--gold-line); background: var(--gold-wash); color: var(--gold-text); }
.cx-chip-x { display: grid; place-items: center; width: 18px; height: 18px; margin-right: -6px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--ink-3); cursor: pointer; }
.cx-chip-x:hover { background: var(--surface-hover); color: var(--ink); }
/* Cible tactile de 44 px sous 768 px pour une puce-bascule (seuil en dur, voir src/ui/breakpoints.ts). */
@media (max-width: 767px) {
  .cx-chip.is-toggle { height: var(--size-cible); }
  /* Une puce de critère (bouton principal + croix) : le bouton principal prend toute la hauteur de la puce, 44 px au moins. */
  .cx-chip:has(> .cx-chip-main) { height: calc(var(--size-cible) + 2px); }
  .cx-chip-main { align-self: stretch; }
  .cx-chip-x { position: relative; }
  .cx-chip-x::after { content: ''; position: absolute; top: 50%; left: 50%; width: var(--size-cible); height: var(--size-cible); transform: translate(-50%, -50%); }
}
</style>
