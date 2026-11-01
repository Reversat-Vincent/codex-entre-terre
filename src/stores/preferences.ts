// Store des préférences d'affichage : thème, rail de navigation, panneau de critères, vue et colonnes des catalogues (docs/architecture.md § 6).
// Le thème est écrit dans `data-theme` sur `<html>`, avant le montage de l'application (`boot()`).

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { CatalogView, NavRailMode, PreferencesSlice, Theme } from '../persistence/model.ts'

/**
 * Pose le thème sur l'élément racine ; sans effet hors navigateur (tests sous Node).
 * @param theme Thème à appliquer.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Préférences par défaut.
 * @returns Un objet neuf : thème sombre, rail automatique, critères ouverts, catalogues en tableau.
 */
export function defaultPreferences(): PreferencesSlice {
  return { theme: 'sombre', navRail: 'auto', criteriaCollapsed: false, catalogView: 'table', catalogColumns: {} }
}

const copyColumns = (columns: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(columns).map(([k, v]) => [k, [...v]]))

/**
 * Store des préférences.
 * Actions : `setTheme`, `toggleTheme`, `setNavRail`, `setCriteriaCollapsed`, `setCatalogView`, `setCatalogColumns(catalogue, colonnes)`, `snapshot()` et `hydrate(slice)` pour la persistance.
 * Tout changement de thème est reporté sur `<html data-theme>`.
 */
export const usePreferencesStore = defineStore('preferences', () => {
  const initial = defaultPreferences()
  const theme = ref<Theme>(initial.theme)
  const navRail = ref<NavRailMode>(initial.navRail)
  const criteriaCollapsed = ref(initial.criteriaCollapsed)
  const catalogView = ref<CatalogView>(initial.catalogView)
  const catalogColumns = ref<Record<string, string[]>>(initial.catalogColumns)

  watch(theme, applyTheme, { immediate: true, flush: 'sync' })

  function setTheme(value: Theme): void {
    theme.value = value
  }
  function toggleTheme(): void {
    theme.value = theme.value === 'sombre' ? 'parchemin' : 'sombre'
  }
  function setNavRail(value: NavRailMode): void {
    navRail.value = value
  }
  function setCriteriaCollapsed(value: boolean): void {
    criteriaCollapsed.value = value
  }
  function setCatalogView(value: CatalogView): void {
    catalogView.value = value
  }
  function setCatalogColumns(catalog: string, columns: readonly string[]): void {
    if (catalog === '__proto__') return
    catalogColumns.value = { ...catalogColumns.value, [catalog]: [...columns] }
  }

  function snapshot(): PreferencesSlice {
    return {
      theme: theme.value,
      navRail: navRail.value,
      criteriaCollapsed: criteriaCollapsed.value,
      catalogView: catalogView.value,
      catalogColumns: copyColumns(catalogColumns.value),
    }
  }

  function hydrate(slice: PreferencesSlice): void {
    theme.value = slice.theme
    navRail.value = slice.navRail
    criteriaCollapsed.value = slice.criteriaCollapsed
    catalogView.value = slice.catalogView
    catalogColumns.value = copyColumns(slice.catalogColumns)
  }

  return { theme, navRail, criteriaCollapsed, catalogView, catalogColumns, setTheme, toggleTheme, setNavRail, setCriteriaCollapsed, setCatalogView, setCatalogColumns, snapshot, hydrate }
})
