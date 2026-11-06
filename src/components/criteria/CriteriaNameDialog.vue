<!-- Fenêtre de saisie du nom d'un profil : « Enregistrer sous » et « Renommer ». -->
<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { LIMITS } from '../../persistence/model.ts'
import CxButton from '../ds/CxButton.vue'
import CxDialog from '../ds/CxDialog.vue'

/**
 * Dialogue de nom de profil (`CxDialog`). Le champ reprend `initial` à chaque ouverture ; Entrée ou le bouton de confirmation émet `confirm`
 * avec le nom saisi (le store `profiles` le normalise : espaces retirés, longueur bornée, nom par défaut si vide). Le composant n'écrit rien.
 */
const props = defineProps<{
  /** Titre de la fenêtre. */
  title: string
  /** Libellé du bouton de confirmation (verbe d'action). */
  confirmLabel: string
  /** Nom proposé à l'ouverture. */
  initial: string
}>()

const emit = defineEmits<{
  /** Nom saisi, à enregistrer. */
  confirm: [name: string]
}>()

/** Ouverte ou fermée. */
const open = defineModel<boolean>({ default: false })

const draft = ref(props.initial)
const fieldId = useId()

watch(open, (isOpen) => {
  if (isOpen) draft.value = props.initial
})

function submit(): void {
  emit('confirm', draft.value)
  open.value = false
}
</script>

<template>
  <CxDialog
    v-model="open"
    :title="title"
  >
    <form
      class="cx-crit-name"
      @submit.prevent="submit"
    >
      <label :for="fieldId">Nom du profil</label>
      <input
        :id="fieldId"
        v-model="draft"
        class="cx-input"
        type="text"
        autocomplete="off"
        :maxlength="LIMITS.maxString"
        autofocus
      >
    </form>
    <template #footer>
      <CxButton @click="open = false">
        Annuler
      </CxButton>
      <CxButton
        variant="primary"
        @click="submit"
      >
        {{ confirmLabel }}
      </CxButton>
    </template>
  </CxDialog>
</template>

<style>
.cx-crit-name { display: grid; gap: var(--space-1); }
.cx-crit-name > label { color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
</style>
