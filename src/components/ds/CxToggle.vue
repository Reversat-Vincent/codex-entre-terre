<!-- Interrupteur : option binaire appliquée immédiatement (contraintes, fiabilité). -->
<script setup lang="ts">
/**
 * Interrupteur sous forme de `button` avec `aria-pressed` (README du design system, FormControls).
 * L'état se lit par la position du bouton et par `aria-pressed`, pas par la couleur seule. Le libellé vient du slot ou de `label`.
 */
defineProps<{
  /** Libellé de l'option, si le slot par défaut n'est pas utilisé. */
  label?: string
}>()

/** État de l'option : actif ou non. */
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    class="cx-toggle"
    :aria-pressed="model"
    @click="model = !model"
  >
    <span class="cx-toggle-track"><span class="cx-toggle-thumb" /></span>
    <slot>{{ label }}</slot>
  </button>
</template>

<style>
.cx-toggle { display: flex; align-items: center; gap: var(--space-2); width: 100%; min-height: 28px; padding: 0; border: 0; background: transparent; color: var(--ink); font-size: 13px; text-align: left; cursor: pointer; }
.cx-toggle-track { position: relative; width: 30px; height: 18px; flex: none; border: 1px solid var(--control-border); border-radius: var(--radius-pill); background: var(--surface-sunken); }
.cx-toggle-thumb { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--ink-3); transition: transform .15s ease; }
.cx-toggle[aria-pressed="true"] .cx-toggle-track { border-color: var(--gold); background: var(--gold-wash); }
.cx-toggle[aria-pressed="true"] .cx-toggle-thumb { transform: translateX(12px); background: var(--gold); }
@media (max-width: 767px) { .cx-toggle { min-height: var(--size-cible); } }
@media (prefers-reduced-motion: reduce) { .cx-toggle-thumb { transition: none; } }
</style>
