<!-- Section de la fiche boss : carte `surface` avec titre, sous-titre facultatif et contenu, selon l'enveloppe des widgets du design system. -->
<script setup lang="ts">
import { useId } from 'vue'

/**
 * Section d'une fiche (écran Fiche boss : classes `cx-widget`, `cx-w-head`, `cx-w-body`). Pas de repli ni de menu : ce n'est pas un widget du tableau de bord.
 * Le titre est un `h2` relié à la section par `aria-labelledby`.
 */
defineProps<{
  /** Titre de la section (français). */
  title: string
  /** Phrase d'aide sous le titre. */
  subtitle?: string
}>()

const titleId = useId()
</script>

<template>
  <section
    class="boss-sec"
    :aria-labelledby="titleId"
  >
    <header class="boss-sec-head">
      <div class="boss-sec-titles">
        <h2
          :id="titleId"
          class="titre-s"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="boss-sec-sub"
        >
          {{ subtitle }}
        </p>
      </div>
      <slot name="aside" />
    </header>
    <div class="boss-sec-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.boss-sec { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--line-strong); border-radius: var(--radius-l); background: var(--surface); box-shadow: var(--shadow-1); }
.boss-sec-head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-5) var(--space-3); }
.boss-sec-titles { flex: 1 1 auto; min-width: 0; }
.boss-sec-sub { margin-top: 2px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.boss-sec-body { min-width: 0; padding: 0 var(--space-5) var(--space-5); }
@media (max-width: 767px) {
  .boss-sec-head { padding: var(--space-3) var(--space-4) var(--space-2); }
  .boss-sec-body { padding: 0 var(--space-4) var(--space-4); }
}
</style>
