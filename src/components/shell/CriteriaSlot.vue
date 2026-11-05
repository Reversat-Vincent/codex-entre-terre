<!-- PROVISOIRE : contenu du panneau de critères (en-tête et repli seulement). Remplacé par `components/criteria/CriteriaPanel.vue` dans `AppCriteriaHost`. -->
<script setup lang="ts">
import CxButton from '../ds/CxButton.vue'
import CxIcon from '../ds/CxIcon.vue'

/**
 * Emplacement du panneau de critères, le temps que la tâche « critères » écrive `CriteriaPanel`. Il reproduit l'en-tête du design
 * (titre « Critères » et bouton de repli de la colonne) pour que la coquille soit vérifiable ; il n'a ni état ni donnée.
 */
defineProps<{
  /** Colonne repliée à 52 px (desktop seulement). */
  collapsed: boolean
  /** `inline` : colonne du desktop, repliable ; `overlay` : tiroir ou feuille, fermés par leur propre bouton. */
  mode: 'inline' | 'overlay'
}>()

defineEmits<{
  /** Demande de replier ou de déplier la colonne. */
  toggle: []
}>()
</script>

<template>
  <div class="v-crit-slot">
    <div
      v-if="mode === 'inline'"
      class="v-crit-head"
    >
      <span
        v-if="!collapsed"
        class="v-crit-title"
      ><CxIcon name="sliders" />Critères</span>
      <CxButton
        variant="ghost"
        size="sm"
        icon-only
        :icon="collapsed ? 'sliders' : 'chev-l'"
        :label="collapsed ? 'Déplier le panneau de critères' : 'Replier le panneau de critères'"
        :aria-expanded="!collapsed"
        @click="$emit('toggle')"
      />
    </div>
    <p
      v-if="!collapsed"
      class="v-crit-note cx-muted"
    >
      Le panneau de critères arrive avec l’écran suivant.
    </p>
  </div>
</template>

<style scoped>
.v-crit-slot { display: flex; flex-direction: column; min-width: 0; }
.v-crit-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-4) var(--space-4) var(--space-3); border-bottom: 1px solid var(--line); }
.v-crit-title { display: flex; align-items: center; gap: var(--space-2); color: var(--ink); font: 600 16px/20px var(--font-display); }
.v-crit-note { padding: var(--space-4); }
</style>
