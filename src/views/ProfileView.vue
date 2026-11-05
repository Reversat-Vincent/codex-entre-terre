<!-- Écran « Mon profil » (/profil, non dessiné) : profils enregistrés, préférences, stockage, sauvegarde, versions, licences. -->
<script setup lang="ts">
import ProfileBackup from '../components/domain/profile/ProfileBackup.vue'
import ProfileLicenses from '../components/domain/profile/ProfileLicenses.vue'
import ProfilePreferences from '../components/domain/profile/ProfilePreferences.vue'
import ProfileSavedList from '../components/domain/profile/ProfileSavedList.vue'
import ProfileStorage from '../components/domain/profile/ProfileStorage.vue'
import ProfileVersions from '../components/domain/profile/ProfileVersions.vue'

/**
 * Page Profil (cahier des charges § 5 et § 9, architecture § 6, § 7 et § 9). L'écran n'est pas dessiné : il assemble les composants du design system
 * en sections empilées (`ProfileSection`). Toute la logique passe par les stores ; la vue ne fait que la mise en page, sur une colonne en dessous
 * de 1 280 px et sur deux colonnes (profils, sauvegarde et licences à gauche ; préférences, stockage et versions à droite) au-dessus.
 */
</script>

<template>
  <section
    class="v-profile"
    aria-labelledby="profile-title"
  >
    <header class="v-profile-head">
      <h1
        id="profile-title"
        class="titre-l"
      >
        Mon profil
      </h1>
      <p class="cx-ink2">
        Vos profils de critères, vos préférences et votre sauvegarde. Tout reste dans ce navigateur : aucun compte, aucun serveur.
      </p>
    </header>

    <div class="v-profile-grid">
      <div class="v-profile-col">
        <ProfileSavedList class="v-profile-o1" />
        <ProfileBackup class="v-profile-o4" />
        <ProfileLicenses class="v-profile-o6" />
      </div>
      <div class="v-profile-col">
        <ProfilePreferences class="v-profile-o2" />
        <ProfileStorage class="v-profile-o3" />
        <ProfileVersions class="v-profile-o5" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.v-profile { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); max-width: 1280px; padding: var(--space-6); }
.v-profile-head { display: grid; gap: var(--space-2); }
.v-profile-head h1 { width: fit-content; }
.v-profile-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); align-items: start; }
.v-profile-col { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); min-width: 0; }
@media (min-width: 1280px) { .v-profile-grid { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); } }
/* Sous 1 280 px une seule colonne : les deux colonnes s'effacent et l'ordre de lecture est celui du parcours (profils, réglages, stockage, sauvegarde, versions, licences). */
@media (max-width: 1279px) {
  .v-profile-col { display: contents; }
  .v-profile-grid { display: grid; }
  .v-profile-o1 { order: 1; }
  .v-profile-o2 { order: 2; }
  .v-profile-o3 { order: 3; }
  .v-profile-o4 { order: 4; }
  .v-profile-o5 { order: 5; }
  .v-profile-o6 { order: 6; }
}
@media (max-width: 767px) { .v-profile { padding: var(--space-4); gap: var(--space-4); } }
</style>
