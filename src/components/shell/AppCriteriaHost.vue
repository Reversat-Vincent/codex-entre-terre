<!-- Emplacement du panneau de critères : colonne de 304 px (repliable à 52 px) sur desktop, tiroir à gauche sur tablette, feuille du bas sur mobile. -->
<script setup lang="ts">
import { useBreakpoint } from '../../composables/useBreakpoint.ts'
import { useCriteriaPanel } from '../../composables/useCriteriaPanel.ts'
import { usePreferencesStore } from '../../stores/preferences.ts'
import CxSheet from '../ds/CxSheet.vue'
import CriteriaSlot from './CriteriaSlot.vue'

/**
 * Hôte du panneau de critères (architecture § 10.1), monté seulement sur les écrans qui en ont un (`hasCriteriaPanel`).
 * Un seul des trois habillages est monté à la fois, pour qu'il n'existe qu'une instance du panneau :
 * - desktop : `aside` de 304 px dans la page, replié à 52 px selon la préférence `criteriaCollapsed` ;
 * - tablette : tiroir latéral (`CxSheet`) ouvert par le bouton « Critères » de la barre supérieure ;
 * - mobile : feuille du bas à 88 % ouverte par le bouton « Critères » du tableau de bord.
 * `CriteriaSlot` est provisoire : la tâche des critères y branchera `CriteriaPanel` (et son pied « Voir N armes » sur mobile).
 */
const prefs = usePreferencesStore()
const { isMobile, isTablet } = useBreakpoint()
const { overlayOpen } = useCriteriaPanel()
</script>

<template>
  <CxSheet
    v-if="isMobile"
    v-model="overlayOpen"
    title="Critères"
  >
    <CriteriaSlot
      mode="overlay"
      :collapsed="false"
    />
  </CxSheet>
  <CxSheet
    v-else-if="isTablet"
    v-model="overlayOpen"
    title="Critères"
    side="left"
  >
    <CriteriaSlot
      mode="overlay"
      :collapsed="false"
    />
  </CxSheet>
  <aside
    v-else
    class="cx-criteria"
    :class="{ 'is-collapsed': prefs.criteriaCollapsed }"
    aria-label="Critères du tableau de bord"
  >
    <div class="cx-criteria-inner">
      <CriteriaSlot
        mode="inline"
        :collapsed="prefs.criteriaCollapsed"
        @toggle="prefs.setCriteriaCollapsed(!prefs.criteriaCollapsed)"
      />
    </div>
  </aside>
</template>

<style>
.cx-criteria { flex: 0 0 var(--size-criteres); min-width: 0; border-right: 1px solid var(--line); background: var(--surface); }
.cx-criteria.is-collapsed { flex-basis: 52px; }
/* Le contenu reste collé sous la barre supérieure et défile seul quand le panneau dépasse la fenêtre ; la colonne, elle, couvre toute la hauteur de la page. */
.cx-criteria-inner { position: sticky; top: var(--size-topbar); max-height: calc(100vh - var(--size-topbar)); max-height: calc(100dvh - var(--size-topbar)); overflow-y: auto; }
</style>
