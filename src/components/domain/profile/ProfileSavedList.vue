<!-- Section « Profils enregistrés » : liste des profils, avec charger, renommer, supprimer, profil actif et modifications non enregistrées. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { LIMITS } from '../../../persistence/model.ts'
import { useProfilesStore } from '../../../stores/profiles.ts'
import CriteriaNameDialog from '../../criteria/CriteriaNameDialog.vue'
import CxButton from '../../ds/CxButton.vue'
import CxEmptyState from '../../ds/CxEmptyState.vue'
import CxIcon from '../../ds/CxIcon.vue'
import { formatDateTime } from './profileModel.ts'
import ProfileSection from './ProfileSection.vue'

/**
 * Profils de critères enregistrés (cahier des charges § 5, architecture § 6). Chaque ligne propose « Charger », « Renommer » et « Supprimer » ;
 * le profil actif est signalé par une pastille avec texte, et ses modifications non enregistrées par une icône d'alerte et une phrase
 * (jamais la couleur seule). Charger et supprimer passent par le store `profiles`, qui affiche la notification avec « Annuler » : aucune
 * confirmation supplémentaire. La saisie d'un nom réutilise `CriteriaNameDialog` du panneau de critères. Aucun calcul ni accès au stockage ici.
 */
const profiles = useProfilesStore()

const saveAsOpen = ref(false)
const renameOpen = ref(false)
const renameId = ref<string | null>(null)

const renameInitial = computed(() => profiles.items.find((p) => p.id === renameId.value)?.name ?? '')
const full = computed(() => profiles.items.length >= LIMITS.maxProfiles)

function askRename(id: string): void {
  renameId.value = id
  renameOpen.value = true
}

function onRename(name: string): void {
  if (renameId.value !== null) profiles.rename(renameId.value, name)
}

/** Date d'enregistrement lisible, ou « Non documenté » si l'horodatage est illisible. */
function savedText(iso: string): string {
  return formatDateTime(iso) ?? 'Non documenté'
}
</script>

<template>
  <ProfileSection
    title="Profils enregistrés"
    description="Chaque profil garde un jeu complet de critères : personnage, objectif, style de jeu, progression. Ils restent sur cet appareil."
  >
    <template #actions>
      <CxButton
        v-if="profiles.active !== null"
        icon="save"
        :disabled="!profiles.dirty"
        @click="profiles.save()"
      >
        Enregistrer le profil actif
      </CxButton>
      <CxButton
        variant="primary"
        icon="plus"
        :disabled="full"
        @click="saveAsOpen = true"
      >
        Enregistrer les critères sous…
      </CxButton>
    </template>

    <p
      v-if="full"
      class="v-profile-hint"
    >
      <CxIcon name="alert" />Limite de {{ LIMITS.maxProfiles }} profils atteinte : supprimez-en un pour en ajouter.
    </p>

    <CxEmptyState
      v-if="profiles.items.length === 0"
      title="Aucun profil enregistré."
      text="Réglez vos critères sur le tableau de bord, puis enregistrez-les ici pour les retrouver d’un clic. Vos critères actuels restent actifs en attendant."
    />

    <ul
      v-else
      class="v-profile-list"
    >
      <li
        v-for="profile in profiles.items"
        :key="profile.id"
        class="v-profile-row"
        :class="{ active: profile.id === profiles.activeId }"
      >
        <div class="v-profile-row-main">
          <span class="v-profile-row-name">
            <b>{{ profile.name }}</b>
            <span
              v-if="profile.id === profiles.activeId"
              class="v-profile-active"
            ><CxIcon name="check" />Profil actif</span>
          </span>
          <span class="cx-muted v-profile-row-date">Enregistré le {{ savedText(profile.savedAt) }}</span>
          <span
            v-if="profile.id === profiles.activeId && profiles.dirty"
            class="v-profile-dirty"
            role="status"
          ><CxIcon name="alert" />Modifications non enregistrées</span>
        </div>
        <div class="v-profile-row-actions">
          <CxButton
            size="sm"
            icon="refresh"
            :label="`${profile.id === profiles.activeId ? 'Recharger' : 'Charger'} le profil ${profile.name}`"
            @click="profiles.load(profile.id)"
          >
            {{ profile.id === profiles.activeId ? 'Recharger' : 'Charger' }}
          </CxButton>
          <CxButton
            size="sm"
            icon="sliders"
            :label="`Renommer le profil ${profile.name}`"
            @click="askRename(profile.id)"
          >
            Renommer
          </CxButton>
          <CxButton
            size="sm"
            variant="ghost"
            icon="x"
            :label="`Supprimer le profil ${profile.name}`"
            @click="profiles.remove(profile.id)"
          >
            Supprimer
          </CxButton>
        </div>
      </li>
    </ul>

    <p
      v-if="profiles.items.length > 0 && profiles.active === null"
      class="cx-muted v-profile-hint"
    >
      <CxIcon name="info" />Vos critères actuels ne sont liés à aucun profil. « Charger » les remplace ; la notification propose « Annuler ».
    </p>

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
      :initial="renameInitial"
      @confirm="onRename"
    />
  </ProfileSection>
</template>

<style>
.v-profile-list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.v-profile-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-s); background: var(--surface-raised); }
.v-profile-row.active { border-color: var(--gold-line); background: var(--gold-wash); }
.v-profile-row-main { display: grid; gap: 2px; min-width: 0; flex: 1 1 260px; }
.v-profile-row-name { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); min-width: 0; overflow-wrap: anywhere; }
.v-profile-row-date { font-size: 12px; line-height: 16px; }
.v-profile-active { display: inline-flex; align-items: center; gap: var(--space-1); padding: 0 var(--space-2); border: 1px solid var(--gold-line); border-radius: var(--radius-pill); color: var(--gold-text); font-size: 12px; line-height: 18px; font-weight: 600; }
.v-profile-row-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.v-profile-dirty { display: flex; align-items: center; gap: var(--space-1); color: var(--warn); font-size: 12px; line-height: 16px; font-weight: 600; }
.v-profile-hint { display: flex; align-items: center; gap: var(--space-2); color: var(--ink-2); font-size: 12px; line-height: 17px; }
</style>
