<!-- Gestion des profils de critères : choisir, enregistrer, enregistrer sous, renommer, supprimer, et repère des modifications non enregistrées. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProfilesStore } from '../../stores/profiles.ts'
import CxButton from '../ds/CxButton.vue'
import CxIcon from '../ds/CxIcon.vue'
import CxMenu from '../ds/CxMenu.vue'
import CxSelect from '../ds/CxSelect.vue'
import type { MenuItem, SelectOption } from '../ds/types.ts'
import CriteriaNameDialog from './CriteriaNameDialog.vue'

/**
 * Profils enregistrés (design `Main.dc.html`, section « Profil » ; note `spec-sheet`). Une liste déroulante charge un profil (les modifications non
 * enregistrées sont écartées, la notification propose « Annuler »), un bouton enregistre, un menu propose « Enregistrer sous », « Renommer » et
 * « Supprimer » (la suppression se défait aussi). Tout passe par le store `profiles` ; ce composant ne garde que l'état de ses deux fenêtres.
 * Les modifications non enregistrées sont dites en toutes lettres (icône et texte), pas seulement par la couleur.
 */
const profiles = useProfilesStore()

const selectId = 'crit-profile'
const saveAsOpen = ref(false)
const renameOpen = ref(false)

const NONE = ''
const options = computed((): SelectOption[] => {
  const list = profiles.items.map((p) => ({ value: p.id, label: p.name }))
  if (profiles.activeId !== null) return list
  return [{ value: NONE, label: list.length === 0 ? 'Aucun profil enregistré' : 'Critères de travail (non enregistrés)' }, ...list]
})
const selected = computed({
  get: () => profiles.activeId ?? NONE,
  set: (id: string) => {
    if (id !== NONE) profiles.load(id)
  },
})

const hasActive = computed(() => profiles.active !== null)
const menuItems = computed((): MenuItem[] => [
  { id: 'save-as', label: 'Enregistrer sous…', icon: 'save' },
  { id: 'rename', label: 'Renommer…', icon: 'sliders', disabled: !hasActive.value, separatorBefore: true },
  { id: 'remove', label: 'Supprimer', icon: 'x', disabled: !hasActive.value },
])

/** « Enregistrer » met à jour le profil actif ; sans profil actif, il demande un nom. */
function save(): void {
  if (profiles.active === null) saveAsOpen.value = true
  else profiles.save()
}

defineExpose({ save })

function onMenu(id: string): void {
  if (id === 'save-as') saveAsOpen.value = true
  else if (id === 'rename') renameOpen.value = true
  else if (id === 'remove' && profiles.activeId !== null) profiles.remove(profiles.activeId)
}
</script>

<template>
  <div class="cx-crit-field">
    <label :for="selectId">Profil enregistré <small class="cx-muted">sur cet appareil</small></label>
    <div class="cx-crit-profile-row">
      <CxSelect
        :id="selectId"
        v-model="selected"
        :options="options"
        :disabled="profiles.items.length === 0"
      />
      <CxButton
        icon-only
        icon="save"
        label="Enregistrer le profil"
        @click="save"
      />
      <CxMenu
        :items="menuItems"
        label="Plus d’actions sur les profils"
        @select="onMenu"
      />
    </div>
    <p
      v-if="profiles.dirty"
      class="cx-crit-dirty"
      role="status"
    >
      <CxIcon name="alert" />Modifications non enregistrées
    </p>
  </div>

  <CriteriaNameDialog
    v-model="saveAsOpen"
    title="Enregistrer sous"
    confirm-label="Enregistrer"
    initial=""
    @confirm="(name) => profiles.saveAs(name)"
  />
  <CriteriaNameDialog
    v-model="renameOpen"
    title="Renommer le profil"
    confirm-label="Renommer"
    :initial="profiles.active?.name ?? ''"
    @confirm="(name) => profiles.activeId !== null && profiles.rename(profiles.activeId, name)"
  />
</template>

<style>
.cx-crit-profile-row { display: flex; align-items: center; gap: var(--space-2); }
.cx-crit-profile-row > .cx-select { flex: 1 1 auto; }
.cx-crit-dirty { display: flex; align-items: center; gap: var(--space-1); color: var(--warn); font-size: 12px; line-height: 16px; font-weight: 600; }
</style>
