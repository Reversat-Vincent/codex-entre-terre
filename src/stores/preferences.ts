// Store des préférences d'affichage : thème, rail de navigation, panneau de critères, vue et colonnes des catalogues (docs/architecture.md § 6).
// Le thème est écrit dans `data-theme` sur `<html>`, avant le montage de l'application (`boot()`).

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { CatalogView, NavRailMode, PreferencesSlice, Theme } from '../persistence/model.ts'

/**
 * Pose le thème sur l'élément racine ; sans effet hors navigateur (tests sous Node).
 * @param theme Thème à appliquer.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme)
}

/** Affichage d'un catalogue sans choix enregistré. */
export const DEFAULT_CATALOG_VIEW: CatalogView = 'table'

/**
 * Préférences par défaut.
 * @returns Un objet neuf : thème sombre, rail automatique, critères ouverts, aucun affichage ni colonnes choisis (catalogues en tableau).
 */
export function defaultPreferences(): PreferencesSlice {
  return { theme: 'sombre', navRail: 'auto', criteriaCollapsed: false, catalogView: {}, catalogColumns: {} }
}

const copyColumns = (columns: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(columns).map(([k, v]) => [k, [...v]]))

/**
 * Store des préférences.
 * Actions : `setTheme`, `toggleTheme`, `setNavRail`, `setCriteriaCollapsed`, `setCatalogView(catalogue, vue)`, `setCatalogColumns(catalogue, colonnes)`,
 * `resetCatalogs()`, `snapshot()` et `hydrate(slice)` pour la persistance. Getter `viewOf(catalogue)` : affichage mémorisé du catalogue, tableau par défaut (D32).
 * Tout changement de thème est reporté sur `<html data-theme>`.
 */
export const usePreferencesStore = defineStore('preferences', () => {
  const initial = defaultPreferences()
  const theme = ref<Theme>(initial.theme)
  const navRail = ref<NavRailMode>(initial.navRail)
  const criteriaCollapsed = ref(initial.criteriaCollapsed)
  const catalogView = ref<Record<string, CatalogView>>(initial.catalogView)
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
  function setCatalogView(catalog: string, value: CatalogView): void {
    if (catalog === '__proto__') return
    catalogView.value = { ...catalogView.value, [catalog]: value }
  }
  const viewOf = computed(() => (catalog: string): CatalogView => (Object.hasOwn(catalogView.value, catalog) ? catalogView.value[catalog] : undefined) ?? DEFAULT_CATALOG_VIEW)
  function setCatalogColumns(catalog: string, columns: readonly string[]): void {
    if (catalog === '__proto__') return
    catalogColumns.value = { ...catalogColumns.value, [catalog]: [...columns] }
  }
  /**
   * Oublie l'affichage et les colonnes choisis pour tous les catalogues : chacun revient à ses valeurs par défaut (tableau, colonnes par défaut
   * du registre). Le thème, le rail et le panneau de critères ne changent pas ; la persistance enregistre l'état vidé comme tout autre changement.
   */
  function resetCatalogs(): void {
    catalogView.value = {}
    catalogColumns.value = {}
  }

  function snapshot(): PreferencesSlice {
    return {
      theme: theme.value,
      navRail: navRail.value,
      criteriaCollapsed: criteriaCollapsed.value,
      catalogView: { ...catalogView.value },
      catalogColumns: copyColumns(catalogColumns.value),
    }
  }

  function hydrate(slice: PreferencesSlice): void {
    theme.value = slice.theme
    navRail.value = slice.navRail
    criteriaCollapsed.value = slice.criteriaCollapsed
    catalogView.value = { ...slice.catalogView }
    catalogColumns.value = copyColumns(slice.catalogColumns)
  }

  return { theme, navRail, criteriaCollapsed, catalogView, catalogColumns, viewOf, setTheme, toggleTheme, setNavRail, setCriteriaCollapsed, setCatalogView, setCatalogColumns, resetCatalogs, snapshot, hydrate }
})
