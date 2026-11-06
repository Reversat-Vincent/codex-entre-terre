<!-- État vide : dit ce qui manque, pourquoi, et propose d'élargir les critères. -->
<script setup lang="ts">
import CxButton from './CxButton.vue'
import type { EmptyAction } from './types.ts'

/**
 * État vide commun aux widgets, catalogues et fiches (README du design system, composant States).
 * Un titre qui dit ce qui manque, une phrase qui dit pourquoi, puis les actions d'élargissement, la plus efficace d'abord.
 */
defineProps<{
  /** Ce qui manque (« Aucune arme de fin de jeu ne correspond à vos critères »). */
  title: string
  /** Pourquoi (« Vos exclusions retirent les 2 armes de cette étape. »). */
  text?: string
  /** Actions d'élargissement ; la première est mise en avant, les suivantes sont discrètes. */
  actions?: readonly EmptyAction[]
}>()

const emit = defineEmits<{
  /** L'utilisateur choisit une action d'élargissement (identifiant de l'action). */
  action: [id: string]
}>()
</script>

<template>
  <div class="cx-empty">
    <span class="cx-empty-title">{{ title }}</span>
    <span v-if="text">{{ text }}</span>
    <div
      v-if="actions && actions.length > 0"
      class="cx-row"
    >
      <CxButton
        v-for="(action, index) in actions"
        :key="action.id"
        size="sm"
        :variant="index === 0 ? 'secondary' : 'ghost'"
        :icon="action.icon"
        @click="emit('action', action.id)"
      >
        {{ action.label }}
      </CxButton>
    </div>
  </div>
</template>

<style>
.cx-empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); padding: var(--space-4); border: 1px dashed var(--line-strong); border-radius: var(--radius-m); color: var(--ink-2); font-size: 13px; line-height: 18px; }
.cx-empty-title { color: var(--ink); font: 600 17px/22px var(--font-display); }
</style>
