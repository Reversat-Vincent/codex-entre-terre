<!-- Cadre d'une section de fiche : titre, sous-titre, zone à droite du titre (badge, contrôle) et corps. -->
<script setup lang="ts">
import { useId } from 'vue'

/**
 * Section de fiche (classes du design system : surface, filet `line-strong`, `radius-l`, `shadow-1`, titre `titre-m`).
 * Même cadre que la fiche d'arme. Le titre est un `h2` relié à la région par `aria-labelledby`.
 */
defineProps<{
  /** Titre de la section (français, ou titre d'une section du wiki, en anglais, tel quel). */
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
    class="sh-section"
    :aria-labelledby="titleId"
  >
    <div class="sh-section-head">
      <div class="sh-section-titles">
        <h2
          :id="titleId"
          class="titre-m"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="sh-section-sub"
        >
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="$slots.aside"
        class="sh-section-aside"
      >
        <slot name="aside" />
      </div>
    </div>
    <div class="sh-section-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.sh-section { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface); box-shadow: var(--shadow-1); }
.sh-section-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-3); padding: var(--space-4) var(--space-5) var(--space-3); }
.sh-section-titles { flex: 1 1 220px; min-width: 0; }
.sh-section-sub { margin-top: 2px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.sh-section-aside { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.sh-section-body { display: grid; gap: var(--space-3); min-width: 0; padding: 0 var(--space-5) var(--space-5); }
@media (max-width: 767px) {
  .sh-section-head { padding: var(--space-4) var(--space-4) var(--space-3); }
  .sh-section-body { padding: 0 var(--space-4) var(--space-4); }
}
</style>
