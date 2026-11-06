// Registre des widgets du tableau de bord : textes (codes), largeur, fichiers requis et facultatifs, plein écran, état réduit sur mobile.
// Référence : docs/architecture.md § 4 (`requires`, `enhancedBy`) et § 10.3. Aucun composant Vue ici : l'interface fait la correspondance
// identifiant → composant, ce qui garde le registre utilisable par la logique et les tests sous Node.

import type { FileKey } from '../data/datasets.ts'
import type { LabelCode } from '../engine/codes.ts'
import type { PlayStyle } from '../engine/config/weaponPools.ts'
import { weaponFilesFor } from '../engine/score.ts'
import { WIDGET_IDS } from './ids.ts'
import type { WidgetId } from './ids.ts'

/** Critères lus pour déterminer les fichiers d'un widget. */
export interface WidgetCriteria {
  readonly style: { readonly mode: PlayStyle; readonly classes: readonly string[] }
}

/** Liste de fichiers, fixe ou fonction des critères. */
export type FileRequirement = readonly FileKey[] | ((criteria: WidgetCriteria) => readonly FileKey[])

/** Description d'un widget. */
export interface WidgetDef {
  readonly id: WidgetId
  /** Code du titre et de la ligne « comment c'est calculé » (textes dans `src/ui/explainText.ts`). */
  readonly titleCode: LabelCode
  readonly howCode: LabelCode
  /** Largeur dans la grille de 12 colonnes. */
  readonly span: 5 | 7 | 12
  /** Double hauteur (plan d'amélioration). */
  readonly tall: boolean
  /** Fichiers sans lesquels le widget ne peut rien afficher. */
  readonly requires: FileRequirement
  /** Fichiers qui complètent le widget : section partielle tant qu'ils manquent. */
  readonly enhancedBy: FileRequirement
  /** Vue plein écran disponible. */
  readonly fullscreen: boolean
  /** Réduit par défaut sous 768 px. */
  readonly collapsedOnMobile: boolean
}

/** Les trois fichiers d'armes. */
const WEAPON_FILES: readonly FileKey[] = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches']

/**
 * Définitions des widgets (architecture § 4 et § 10.3). Écarts signalés : `tables` est requis par le widget A (budget de charge) et
 * par la frise (méthode M2, coût des niveaux, et table de bénédiction des boss du DLC, `tables.scadutreeBlessing`).
 */
export const WIDGETS: Readonly<Record<WidgetId, WidgetDef>> = {
  'weapons-by-stage': {
    id: 'weapons-by-stage',
    titleCode: 'widget-title-weapons-by-stage',
    howCode: 'widget-how-weapons-by-stage',
    span: 12,
    tall: false,
    // Candidats selon le style (D7) ; `bosses` pour l'étape des Remembrances et la progression par boss ; `tables` pour le budget de charge.
    requires: (c) => ['origins', 'bosses', 'tables', ...weaponFilesFor(c.style)],
    enhancedBy: [],
    fullscreen: true,
    collapsedOnMobile: false,
  },
  'optimal-origin': {
    id: 'optimal-origin',
    titleCode: 'widget-title-optimal-origin',
    howCode: 'widget-how-optimal-origin',
    span: 12,
    tall: false,
    requires: ['origins', 'tables'],
    // Les armes recommandées départagent les origines (adéquation précoce, § 5.4).
    enhancedBy: (c) => ['bosses', ...weaponFilesFor(c.style)],
    fullscreen: false,
    collapsedOnMobile: false,
  },
  'boss-order': {
    id: 'boss-order',
    titleCode: 'widget-title-boss-order',
    howCode: 'widget-how-boss-order',
    span: 12,
    tall: false,
    requires: ['bosses', 'tables'],
    enhancedBy: [],
    fullscreen: true,
    collapsedOnMobile: false,
  },
  'weakness-matrix': {
    id: 'weakness-matrix',
    titleCode: 'widget-title-weakness-matrix',
    howCode: 'widget-how-weakness-matrix',
    span: 12,
    tall: false,
    requires: ['bosses'],
    enhancedBy: [],
    fullscreen: true,
    collapsedOnMobile: true,
  },
  'upgrade-plan': {
    id: 'upgrade-plan',
    titleCode: 'widget-title-upgrade-plan',
    howCode: 'widget-how-upgrade-plan',
    span: 7,
    tall: true,
    requires: [...WEAPON_FILES, 'key_items'],
    enhancedBy: [],
    fullscreen: false,
    collapsedOnMobile: true,
  },
  'rune-calculator': {
    id: 'rune-calculator',
    titleCode: 'widget-title-rune-calculator',
    howCode: 'widget-how-rune-calculator',
    span: 5,
    tall: false,
    requires: ['tables'],
    // Mode « Prochain boss » : niveau recommandé du prochain boss de la frise.
    enhancedBy: ['bosses'],
    fullscreen: false,
    collapsedOnMobile: true,
  },
  'attribute-yield': {
    id: 'attribute-yield',
    titleCode: 'widget-title-attribute-yield',
    howCode: 'widget-how-attribute-yield',
    span: 7,
    tall: false,
    requires: ['tables'],
    enhancedBy: [],
    fullscreen: true,
    collapsedOnMobile: true,
  },
  'data-coverage': {
    id: 'data-coverage',
    titleCode: 'widget-title-data-coverage',
    howCode: 'widget-how-data-coverage',
    span: 5,
    tall: false,
    requires: [...WEAPON_FILES, 'bosses'],
    enhancedBy: [],
    fullscreen: false,
    collapsedOnMobile: true,
  },
}

/**
 * Résout une liste de fichiers, fixe ou fonction des critères.
 * @param req Liste ou fonction.
 * @param criteria Critères.
 * @returns Les fichiers, sans doublon.
 */
function resolve(req: FileRequirement, criteria: WidgetCriteria): FileKey[] {
  return [...new Set(typeof req === 'function' ? req(criteria) : req)]
}

/**
 * Fichiers requis par un widget pour les critères courants.
 * @param id Widget.
 * @param criteria Critères (style et classes préférées).
 * @returns Les clés de fichiers à charger avant d'afficher le widget.
 */
export function requiredFiles(id: WidgetId, criteria: WidgetCriteria): FileKey[] {
  return resolve(WIDGETS[id].requires, criteria)
}

/**
 * Fichiers qui complètent un widget pour les critères courants.
 * @param id Widget.
 * @param criteria Critères.
 * @returns Les clés de fichiers facultatifs.
 */
export function enhancingFiles(id: WidgetId, criteria: WidgetCriteria): FileKey[] {
  return resolve(WIDGETS[id].enhancedBy, criteria).filter((k) => !requiredFiles(id, criteria).includes(k))
}

/** Liste des définitions, dans l'ordre par défaut des widgets. */
export const WIDGET_LIST: readonly WidgetDef[] = WIDGET_IDS.map((id) => WIDGETS[id])
