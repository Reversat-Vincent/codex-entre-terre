// Types partagés par les composants du design system (`Cx*`) : options des contrôles, onglets, éléments de menu, actions d'état vide.

import type { SortValue } from '../../catalog/sort.ts'
import type { NegationKey, StatusKey } from '../../data/keys.ts'

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

/** Ligne d'une `CxCoverageBar` : une donnée et la répartition de ses entrées entre documentées, estimées et absentes. */
export interface CoverageRow {
  /** Identifiant unique de la ligne. */
  id: string
  /** Libellé de la donnée (« PV des boss »). */
  label: string
  /** Nombre d'entrées documentées par le wiki. */
  documented: number
  /** Nombre d'entrées estimées (0 si la donnée n'est jamais estimée). */
  estimated: number
  /** Nombre d'entrées non documentées (`null`). */
  missing: number
}

/** Étape de `CxProgressThread`. */
export interface ThreadStage {
  /** Identifiant de l'étape (valeur de `current`). */
  id: string
  /** Libellé affiché (« Début »). */
  label: string
  /** Régions de l'étape, déjà mises en forme (« Limgrave, Weeping Peninsula ») ; absent : rien n'est affiché. */
  regions?: string
}

/** Ligne de `CxAbsorptionHeatmap` : une rencontre, son absorption par type de dégâts et ses immunités. */
export interface HeatmapRow {
  /** Identifiant unique de la ligne. */
  id: string
  /** Nom de la rencontre ou du boss, en anglais comme dans les données. */
  name: string
  /** Complément sous le nom (région). */
  subtitle?: string
  /** Adresse de la fiche ; sans elle le nom n'est pas un lien. */
  href?: string
  /** Rencontre vaincue : ligne atténuée. */
  done?: boolean
  /** Absorption en % par type ; `null` si le wiki ne la donne pas (toute la ligne est hachurée). Une valeur `null` isole un type non documenté. */
  negation: Readonly<Partial<Record<NegationKey, number | null>>> | null
  /** Statuts auxquels la rencontre est immunisée ; `null` si les résistances ne sont pas documentées. */
  immunities: readonly StatusKey[] | null
}

/** Série d'une `CxLineChart`. */
export interface ChartSeries {
  /** Identifiant unique de la série (affinité, type de dégâts). */
  id: string
  /** Libellé affiché dans la légende, en bout de ligne et dans la vue tableau. */
  label: string
  /** Valeurs, une par abscisse de `x` (même longueur) ; `null` = non documenté, la ligne s'interrompt. */
  values: readonly (number | null)[]
  /** Couleur de série `cat-1` à `cat-4`, attachée à la série (et non à son rang). Par défaut, le rang de la série (1 à 4). */
  color?: 1 | 2 | 3 | 4
}

/** Puce de `CxCriteriaChips`. */
export interface CriteriaChip {
  /** Identifiant du critère (renvoyé par les événements `open` et `remove`). */
  id: string
  /** Nom du critère (« Origine »). */
  label: string
  /** Valeur actuelle déjà formatée (« Samurai »). */
  value: string
  /** Critère facultatif : une croix le retire. Absent ou faux : critère obligatoire, pas de croix. */
  removable?: boolean
  /** Mise en avant (build cible actif). */
  active?: boolean
}

/**
 * Colonne de `CxDataTable`.
 * @typeParam R Ligne du tableau.
 */
export interface TableColumn<R> {
  /** Identifiant unique de la colonne (clé du tri, nom du slot `cell-<id>`). */
  id: string
  /** Libellé de l'en-tête (français). */
  label: string
  /** Alignement : `right` pour les nombres (chiffres tabulaires). Défaut : `left`. */
  align?: 'left' | 'right'
  /** Valeur de la case quand aucun slot `cell-<id>` n'est fourni : `null` s'affiche « Non documenté » (case hachurée). */
  value?: (row: R) => number | string | null | undefined
  /** Mise en forme d'une valeur numérique (voir `CxValue`). Défaut : `int`. */
  format?: 'int' | 'decimal' | 'percent' | 'weight' | 'signed'
  /** Décimales maximales pour `decimal`, `percent` et `signed`. */
  digits?: number
  /** Valeur de tri si elle diffère de `value` (colonne à contenu composite). */
  sortValue?: (row: R) => SortValue
  /** Colonne triable ; vrai par défaut si `value` ou `sortValue` existe. */
  sortable?: boolean
  /** Largeur CSS facultative (`120px`). */
  width?: string
}
