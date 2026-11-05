<!-- Cadre d'une section de la fiche d'arme : titre, sous-titre, zone d'accueil à droite du titre (badge, contrôle) et corps. -->
<script setup lang="ts">
import { useId } from 'vue'

/**
 * Section de fiche (classes du design system : widget `surface`, filet `line-strong`, `radius-l`, `shadow-1`, titre `titre-m`).
 * Le cadre est propre à la fiche : le widget du tableau de bord (`CxWidgetShell`) porte des actions de tableau de bord (réduire, plein écran) inutiles ici.
 * Le titre est un `h2` relié à la région par `aria-labelledby`.
 */
defineProps<{
  /** Titre de la section. */
  title: string
  /** Précision sous le titre (d'où viennent les valeurs). */
  subtitle?: string
}>()

defineSlots<{
  /** Badge ou contrôle à droite du titre. */
  aside?(): unknown
  /** Corps de la section. */
  default?(): unknown
}>()

const titleId = useId()
</script>

<template>
  <section
    class="wp-section"
    :aria-labelledby="titleId"
  >
    <div class="wp-section-head">
      <div class="wp-section-titles">
        <h2
          :id="titleId"
          class="titre-m"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="wp-section-sub"
        >
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="$slots.aside"
        class="wp-section-aside"
      >
        <slot name="aside" />
      </div>
    </div>
    <div class="wp-section-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wp-section { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface); box-shadow: var(--shadow-1); }
.wp-section-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-3); padding: var(--space-4) var(--space-5) var(--space-3); }
.wp-section-titles { flex: 1 1 220px; min-width: 0; }
.wp-section-sub { margin-top: 2px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wp-section-aside { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.wp-section-body { display: grid; gap: var(--space-3); min-width: 0; padding: 0 var(--space-5) var(--space-5); }
@media (max-width: 767px) {
  .wp-section-head { padding: var(--space-4) var(--space-4) var(--space-3); }
  .wp-section-body { padding: 0 var(--space-4) var(--space-4); }
}
</style>
