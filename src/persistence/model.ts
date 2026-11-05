// Modèle de l'état de l'utilisateur tel qu'il est enregistré, exporté et importé (docs/architecture.md § 6 et § 7).
// Types et listes d'énumérations seulement : aucune logique, aucune dépendance à Vue ; les stores et la validation s'y réfèrent.

import type { EntityRef } from '../data/datasets.ts'
import type { AttributeKey, StatusKey } from '../data/keys.ts'
import type { WidgetId } from '../widgets/ids.ts'
import { STAGE_IDS } from '../engine/config/stages.ts'
import type { StageId } from '../engine/config/stages.ts'
import { LOAD_TARGETS } from '../engine/config/weights.ts'
import type { LoadTarget } from '../engine/config/weights.ts'

// Étapes et charges sont définies une seule fois, dans la configuration du moteur (D32) ; la persistance les valide avec ces listes.
export { STAGE_IDS }
export type { StageId }

/** Identifiant d'origine (`origins[].id`, slug) ou `auto` (rang 1 du classement). Un identifiant absent des données est toléré. */
export type OriginId = string

/** Identifiant d'archétype de build (`config/archetypes.ts`) ; une valeur inconnue du moteur est traitée comme « aucun ». */
export type ArchetypeId = string

/** Clé de rencontre `bossId/encounterId`, ou `bossId` seul. */
export type EncounterKey = string

/** Modes de style de jeu. */
export const STYLE_MODES = ['melee', 'ranged', 'magic', 'hybrid'] as const
/** Mode de style de jeu. */
export type StyleMode = (typeof STYLE_MODES)[number]

/** Charges d'équipement visées (`LOAD_TARGETS` du moteur). */
export const LOADS = LOAD_TARGETS
/** Charge d'équipement visée. */
export type Load = LoadTarget

/** Modes de saisie de la progression. */
export const PROGRESS_MODES = ['stage', 'boss', 'region'] as const
/** Mode de saisie de la progression. */
export type ProgressMode = (typeof PROGRESS_MODES)[number]

/** Préférences de pierres d'amélioration. */
export const STONE_PREFERENCES = ['none', 'normal', 'somber'] as const
/** Préférence de pierres d'amélioration. */
export type StonePreference = (typeof STONE_PREFERENCES)[number]

/** Attributs du personnage, niveau exclu (il est calculé : Σ − 79). */
export type Attributes = Record<AttributeKey, number>

/** Critères de travail (docs/architecture.md § 6). */
export interface Criteria {
  content: { base: true; sote: boolean; tp: boolean }
  character: { origin: OriginId | 'auto'; attributes: Attributes }
  target: { archetype: ArchetypeId | null; level: number }
  style: { mode: StyleMode; classes: string[]; hands: 1 | 2; status: StatusKey | null; load: Load }
  progress: { mode: ProgressMode; stage: StageId; regions: string[]; defeated: EncounterKey[] }
  constraints: { excludeRemembrance: boolean; excludeRandomDrop: boolean; excludeQuest: boolean; stonePreference: StonePreference }
  reliability: { includeEstimates: boolean }
}

/** Profil de critères enregistré. */
export interface ProfileRecord {
  id: string
  name: string
  criteria: Criteria
  /** Date d'enregistrement, ISO 8601. */
  savedAt: string
}

/** Tranche « profils » de l'état persisté. */
export interface ProfilesSlice {
  items: ProfileRecord[]
  activeId: string | null
}

/** Élément de Ma liste. */
export interface PinRecord {
  ref: EntityRef
  /** Date d'ajout, ISO 8601. */
  addedAt: string
  done: boolean
}

/** Tranche « disposition » : widgets affichés dans l'ordre, retirés, réduits (bureau) et réduits (mobile). */
export interface LayoutSlice {
  order: WidgetId[]
  hidden: WidgetId[]
  collapsed: WidgetId[]
  collapsedMobile: WidgetId[]
}

/** Thèmes. */
export const THEMES = ['sombre', 'parchemin'] as const
/** Thème. */
export type Theme = (typeof THEMES)[number]

/** États du rail de navigation : `auto` = replié sous 1600 px quand les critères sont ouverts. */
export const NAV_RAIL_MODES = ['auto', 'rail', 'expanded'] as const
/** État du rail de navigation. */
export type NavRailMode = (typeof NAV_RAIL_MODES)[number]

/** Affichages des catalogues. */
export const CATALOG_VIEWS = ['table', 'grid'] as const
/** Affichage des catalogues. */
export type CatalogView = (typeof CATALOG_VIEWS)[number]

/** Tranche « préférences ». */
export interface PreferencesSlice {
  theme: Theme
  navRail: NavRailMode
  criteriaCollapsed: boolean
  /** Affichage choisi par catalogue (clé de catalogue → tableau ou grille) ; un catalogue absent s'affiche en tableau (D32). */
  catalogView: Record<string, CatalogView>
  /** Colonnes choisies par catalogue (clé de catalogue → identifiants de colonnes). */
  catalogColumns: Record<string, string[]>
}

/** État complet persisté, exporté et importé (clés de `state` dans le document). */
export interface PersistedState {
  criteria: Criteria
  profiles: ProfilesSlice
  pins: PinRecord[]
  layout: LayoutSlice
  preferences: PreferencesSlice
  recentSearches: string[]
}

/** Résultat d'une opération qui peut échouer sans exception. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

/** Écart relevé par la validation : chemin dans le document et explication en français. */
export interface ValidationIssue {
  path: string
  message: string
}

/** Bornes de la validation (docs/architecture.md § 7). */
export const LIMITS = {
  attributeMin: 1,
  attributeMax: 99,
  levelMin: 1,
  levelMax: 713,
  maxProfiles: 50,
  maxPins: 2000,
  maxString: 200,
  maxRecentSearches: 8,
  /** Listes de chaînes dans les critères (classes, régions, boss vaincus). */
  maxCriteriaList: 1000,
  /** Colonnes par catalogue et nombre de catalogues. */
  maxCatalogColumns: 100,
  maxCatalogs: 50,
  /** Taille maximale d'un fichier importé, en octets. */
  maxImportBytes: 1024 * 1024,
} as const
