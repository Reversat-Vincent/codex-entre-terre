// Types partagés par les composants du design system (`Cx*`) : options des contrôles, onglets, éléments de menu, actions d'état vide.

/** Option d'un groupe de segments (`CxSegmented`). */
export interface SegmentedOption<T extends string | number = string> {
  /** Valeur renvoyée à la sélection. */
  value: T
  /** Libellé affiché (français). */
  label: string
  /** Info-bulle native facultative, pour un libellé abrégé. */
  title?: string
  /** Segment inactif. */
  disabled?: boolean
}

/** Option d'une liste déroulante (`CxSelect`). */
export interface SelectOption {
  /** Valeur renvoyée à la sélection. */
  value: string
  /** Libellé affiché. */
  label: string
  /** Option inactive. */
  disabled?: boolean
}

/** Onglet de `CxTabs`. */
export interface TabItem {
  /** Identifiant unique de l'onglet (valeur du modèle). */
  id: string
  /** Libellé principal. */
  label: string
  /** Complément discret après le libellé (région, compteur) : classe `cx-tab-n`. */
  note?: string
}

/** Élément d'un menu (`CxMenu`). */
export interface MenuItem {
  /** Identifiant renvoyé par l'événement `select`. */
  id: string
  /** Libellé affiché (verbe d'action). */
  label: string
  /** Nom d'une icône du sprite (sans le préfixe `i-`). */
  icon?: string
  /** Élément inactif : ignoré par la navigation au clavier. */
  disabled?: boolean
  /** Trace un filet de séparation avant l'élément. */
  separatorBefore?: boolean
}

/** Action proposée par un état vide (`CxEmptyState`) pour élargir les critères. */
export interface EmptyAction {
  /** Identifiant renvoyé par l'événement `action`. */
  id: string
  /** Libellé du bouton (verbe d'action). */
  label: string
  /** Nom d'une icône du sprite (sans le préfixe `i-`). */
  icon?: string
}

/** États d'un widget (`CxWidgetShell`). */
export type WidgetState = 'ready' | 'loading' | 'empty' | 'partial' | 'error'
