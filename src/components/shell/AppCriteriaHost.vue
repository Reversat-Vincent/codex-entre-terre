<!-- Emplacement du panneau de critères : colonne de 304 px (repliable à 52 px) sur desktop, tiroir à gauche sur tablette, feuille du bas sur mobile. -->
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint.ts'
import { useCriteriaPanel } from '../../composables/useCriteriaPanel.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { usePreferencesStore } from '../../stores/preferences.ts'
import { formatInt } from '../../ui/format.ts'
import CriteriaPanel from '../criteria/CriteriaPanel.vue'
import { recommendedCount } from '../criteria/criteriaModel.ts'
import CxButton from '../ds/CxButton.vue'
import CxSheet from '../ds/CxSheet.vue'

/**
 * Hôte du panneau de critères (architecture § 10.1), monté seulement sur les écrans qui en ont un (`hasCriteriaPanel`).
 * Un seul des trois habillages est monté à la fois, pour qu'il n'existe qu'une instance du panneau :
 * - desktop : `aside` de 304 px dans la page, replié à 52 px selon la préférence `criteriaCollapsed` ;
 * - tablette : tiroir latéral (`CxSheet`) ouvert par le bouton « Critères » de la barre supérieure ;
 * - mobile : feuille du bas à 88 % ouverte par le bouton « Critères » du tableau de bord ; son pied annonce « Voir N armes » et ferme la feuille.
 * « Réinitialiser » est dans l'en-tête de la feuille ou du tiroir (note `spec-sheet`), dans le pied du panneau sur desktop.
 * Une puce de critère demande l'ouverture d'une section (`requestSection`) : l'hôte rend alors le panneau visible.
 */
const prefs = usePreferencesStore()
const criteria = useCriteriaStore()
const analysis = useAnalysisStore()
const { isMobile, isTablet } = useBreakpoint()
const { overlayOpen, closeOverlay, requestedSection } = useCriteriaPanel()

watch(requestedSection, (request) => {
  if (request === null) return
  if (isMobile.value || isTablet.value) overlayOpen.value = true
  else prefs.setCriteriaCollapsed(false)
})

/** Nombre d'armes recommandées, annoncé par le bouton du pied de la feuille (le recalcul est immédiat). */
const armsCount = computed(() => recommendedCount(analysis.recommendations))
const seeLabel = computed(() => `Voir ${formatInt(armsCount.value)} arme${armsCount.value > 1 ? 's' : ''}`)
</script>

<template>
  <CxSheet
    v-if="isMobile"
    v-model="overlayOpen"
    title="Critères"
  >
    <template #head-actions>
      <CxButton
        variant="ghost"
        icon="refresh"
        @click="criteria.reset()"
      >
        Réinitialiser
      </CxButton>
    </template>
    <CriteriaPanel
      mode="overlay"
      :collapsed="false"
    />
    <template #footer>
      <CxButton
        class="cx-criteria-see"
        variant="primary"
        @click="closeOverlay"
      >
        {{ seeLabel }}
      </CxButton>
    </template>
  </CxSheet>
  <CxSheet
    v-else-if="isTablet"
    v-model="overlayOpen"
    title="Critères"
    side="left"
  >
    <template #head-actions>
      <CxButton
        variant="ghost"
        size="sm"
        icon="refresh"
        @click="criteria.reset()"
      >
        Réinitialiser
      </CxButton>
    </template>
    <CriteriaPanel
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
      <CriteriaPanel
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
.cx-criteria-see { flex: 1 1 auto; height: 48px; }
</style>
