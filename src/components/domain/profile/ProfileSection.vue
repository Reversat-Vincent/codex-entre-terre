<!-- Section de la page Profil : carte avec titre de niveau 2, chapeau facultatif et contenu libre. -->
<script setup lang="ts">
import { useId } from 'vue'

/**
 * Carte d'une section de la page Profil (profils, préférences, stockage, sauvegarde, versions, licences).
 * Le titre relie la section à son nom accessible (`aria-labelledby`) ; `description` est le chapeau en une phrase.
 * Slot par défaut : contenu ; slot `actions` : boutons alignés à droite du titre (sous le titre sur mobile).
 */
defineProps<{
  /** Titre de la section. */
  title: string
  /** Phrase d'introduction sous le titre. */
  description?: string
}>()

const titleId = useId()
</script>

<template>
  <section
    class="v-profile-section"
    :aria-labelledby="titleId"
  >
    <header class="v-profile-section-head">
      <div class="v-profile-section-titles">
        <h2
          :id="titleId"
          class="titre-m"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="cx-ink2"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="v-profile-section-actions"
      >
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<style>
.v-profile-section { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); padding: var(--space-5); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.v-profile-section-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.v-profile-section-titles { display: grid; gap: var(--space-1); min-width: 0; flex: 1 1 280px; }
.v-profile-section-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
@media (max-width: 767px) { .v-profile-section { padding: var(--space-4); } }
</style>
