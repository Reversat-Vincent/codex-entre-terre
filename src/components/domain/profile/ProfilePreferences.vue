<!-- Section « Préférences » : thème, navigation, réinitialisation de la disposition du tableau de bord et des vues des catalogues. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { NavRailMode, Theme } from '../../../persistence/model.ts'
import { useLayoutStore } from '../../../stores/layout.ts'
import { usePreferencesStore } from '../../../stores/preferences.ts'
import { useToastsStore } from '../../../stores/toasts.ts'
import CxButton from '../../ds/CxButton.vue'
import CxSegmented from '../../ds/CxSegmented.vue'
import type { SegmentedOption } from '../../ds/types.ts'
import ProfileSection from './ProfileSection.vue'

/**
 * Préférences d'affichage (architecture § 6, store `preferences`) : thème, mode de la navigation, et deux réinitialisations.
 * Chaque choix s'applique tout de suite. Les réinitialisations passent par les stores et se défont par « Annuler » dans la notification ;
 * pour les catalogues, le store n'a pas d'action dédiée : on le réhydrate avec son instantané dont les vues et colonnes sont vidées
 * (un catalogue sans choix retombe sur le tableau et ses colonnes par défaut).
 */
const preferences = usePreferencesStore()
const layout = useLayoutStore()
const toasts = useToastsStore()

const THEME_OPTIONS: SegmentedOption<Theme>[] = [
  { value: 'sombre', label: 'Sombre' },
  { value: 'parchemin', label: 'Parchemin' },
]
const NAV_OPTIONS: SegmentedOption<NavRailMode>[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'rail', label: 'Rail' },
  { value: 'expanded', label: 'Déployée' },
]

const theme = computed({ get: () => preferences.theme, set: (value: Theme) => preferences.setTheme(value) })
const navRail = computed({ get: () => preferences.navRail, set: (value: NavRailMode) => preferences.setNavRail(value) })

const catalogChoices = computed(() => Object.keys(preferences.catalogView).length + Object.keys(preferences.catalogColumns).length)

/** Vide les vues et colonnes choisies pour chaque catalogue ; « Annuler » rétablit l'instantané. */
function resetCatalogs(): void {
  const before = preferences.snapshot()
  preferences.hydrate({ ...before, catalogView: {}, catalogColumns: {} })
  toasts.undoable('Vues et colonnes des catalogues réinitialisées', () => preferences.hydrate(before), 'refresh')
}
</script>

<template>
  <ProfileSection
    title="Préférences"
    description="Ces choix s’appliquent immédiatement et sont conservés sur cet appareil."
  >
    <div class="v-profile-prefs">
      <div class="v-profile-pref">
        <div class="v-profile-pref-text">
          <b>Thème</b>
          <span class="cx-muted">Sombre par défaut ; Parchemin est un thème clair aux tons chauds.</span>
        </div>
        <CxSegmented
          v-model="theme"
          :options="THEME_OPTIONS"
          label="Thème"
        />
      </div>

      <div class="v-profile-pref">
        <div class="v-profile-pref-text">
          <b>Navigation</b>
          <span class="cx-muted">Sur écran large, « Automatique » replie le menu en rail quand le panneau de critères est ouvert et que la fenêtre fait moins de 1&#8239;600&nbsp;px. Sous 1&#8239;280&nbsp;px, le menu reste en rail ; sur mobile, la barre d’onglets du bas le remplace.</span>
        </div>
        <CxSegmented
          v-model="navRail"
          :options="NAV_OPTIONS"
          label="Navigation"
        />
      </div>

      <div class="v-profile-pref">
        <div class="v-profile-pref-text">
          <b>Tableau de bord</b>
          <span class="cx-muted">Remet tous les widgets affichés, dans leur ordre d’origine, avec leur état replié par défaut.</span>
        </div>
        <CxButton
          icon="refresh"
          @click="layout.reset()"
        >
          Réinitialiser la disposition
        </CxButton>
      </div>

      <div class="v-profile-pref">
        <div class="v-profile-pref-text">
          <b>Catalogues</b>
          <span class="cx-muted">
            Remet chaque catalogue en tableau, avec ses colonnes par défaut.
            {{ catalogChoices === 0 ? 'Vous n’avez rien modifié pour l’instant.' : '' }}
          </span>
        </div>
        <CxButton
          icon="refresh"
          :disabled="catalogChoices === 0"
          @click="resetCatalogs"
        >
          Réinitialiser les vues et colonnes
        </CxButton>
      </div>
    </div>
  </ProfileSection>
</template>

<style>
.v-profile-prefs { display: grid; gap: 0; }
.v-profile-pref { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0; border-top: 1px solid var(--line); }
.v-profile-pref:first-child { border-top: 0; padding-top: 0; }
.v-profile-pref-text { display: grid; gap: 2px; min-width: 0; flex: 1 1 300px; max-width: 640px; font-size: 13px; line-height: 18px; }
.v-profile-pref-text b { color: var(--ink); font-weight: 600; }
</style>
