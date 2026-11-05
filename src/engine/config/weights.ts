// Pondérations et seuils du moteur : valeurs du prototype (`docs/design/Main.dc.html`), regroupées ici et décrites dans `docs/design/ds/calculs.md`.
// Toute modification d'une valeur se reporte dans calculs.md (docs/architecture.md § 5.3). Aucune valeur de ce fichier n'est un fait du jeu.

import type { Grade } from '../../data/keys.ts'

/** Plafond de chacune des quatre composantes du score (calculs.md, « Score de recommandation d'une arme », « Quatre composantes de 0 à 25 »). */
export const SCORE_COMPONENT_MAX = 25

/** Composante 1, adéquation au build (calculs.md, « Score de recommandation d'une arme », point 1). */
export const FIT_WEIGHTS = {
  /** Valeur de chaque lettre de scaling à +0 en affinité Standard ; pondération du score, pas un coefficient du jeu. */
  grade: { S: 1, A: 0.85, B: 0.7, C: 0.55, D: 0.4, E: 0.25 } satisfies Readonly<Record<Grade, number>>,
  /** Moyenne pondérée qui vaut le plafond de 25 (« une moyenne de 0,5 vaut 25 »), soit un facteur 50. */
  meanForMax: 0.5,
  /** Pénalité par attribut hors build dont le prérequis dépasse `requirementThresholdLow` (10). */
  requirementPenaltyLow: 4,
  requirementThresholdLow: 10,
  /** Pénalité par attribut hors build dont le prérequis dépasse `requirementThresholdHigh` (20), à la place de la précédente. */
  requirementPenaltyHigh: 7,
  requirementThresholdHigh: 20,
  /** Bonus si l'effet passif correspond au statut privilégié. */
  passiveStatusBonus: 4,
  /** Bonus si la classe est préférée ; malus si une préférence existe et que la classe n'en fait pas partie. */
  preferredClassBonus: 2,
  otherClassPenalty: 2,
} as const

/** Composante 2, puissance et scaling (calculs.md, « Score de recommandation d'une arme », point 2). */
export const POWER_WEIGHTS = {
  /** Part de la puissance à +0 (70 %). */
  baseShare: 0.7,
  /** Part de la somme des lettres de scaling (30 %). */
  scalingShare: 0.3,
  /** Plafond de la somme des valeurs de lettres. */
  scalingSumCap: 1.6,
  /** Plafond de l'attaque de base totale à +0 (armes de mêlée, à distance, boucliers). */
  attackCap: 200,
  /** Malus si l'arme dépasse le budget de poids. Plafonds des catalyseurs : calculés au chargement, maximum observé dans data/. */
  overweightPenalty: 4,
} as const

/** Composante 3, accessibilité (calculs.md, « Score de recommandation d'une arme », point 3). */
export const ACCESS_WEIGHTS = {
  /** Valeur de départ. */
  base: 25,
  /** Malus par étape d'avance sur l'étape du joueur. */
  perStageAhead: 4,
  /** Malus par point d'attribut manquant, et son plafond. */
  perMissingPoint: 0.6,
  missingPointsCap: 9,
  /** Malus d'un échange de Remembrance. */
  remembrancePenalty: 4,
  /** Malus d'un butin de PNJ envahisseur. */
  invaderPenalty: 1,
  /** Bonus de l'équipement de départ de l'origine choisie. */
  startingEquipmentBonus: 2,
} as const

/** Composante 4, coût d'amélioration (calculs.md, « Score de recommandation d'une arme », point 4). */
export const UPGRADE_COST_WEIGHTS = {
  /** Pierres sombres (+10, une pierre par niveau). */
  somber: 20,
  /** Pierres normales (+25). */
  normal: 16,
  /** Préférence de pierres : bonus pour le type préféré, malus pour l'autre. */
  preferredStoneBonus: 5,
  otherStonePenalty: 6,
  /** Malus quand le type d'amélioration est une estimation. */
  estimatePenalty: 2,
  /** Type non documenté et sans estimation, sans préférence de pierres. */
  undocumented: 14,
  /** Arme non améliorable (`"Not upgradeable"`). */
  notUpgradeable: 8,
} as const

/** Préparation face à un boss (calculs.md, « Préparation et jauge ») : Limite si niveau ≥ recommandé − `limitMargin`. */
export const READINESS = {
  limitMargin: 8,
} as const

/** Échelle de la jauge niveau / recommandé (calculs.md, « Préparation et jauge ») : `max(recommandé + 30, niveau + 12, 60)`. */
export const GAUGE = {
  aboveRecommended: 30,
  abovePlayer: 12,
  minimum: 60,
} as const

/** Charges visées par le joueur, dans l'ordre du sélecteur ; source unique, reprise par les critères (`persistence/model.ts`, D32). */
export const LOAD_TARGETS = ['light', 'mid', 'heavy'] as const

/** Charge visée par le joueur : légère, moyenne, lourde. */
export type LoadTarget = (typeof LOAD_TARGETS)[number]

/**
 * Budget de poids d'une arme (calculs.md, « Score de recommandation d'une arme », « Budget de charge ») :
 * `arrondi(charge × ratio × part, 1 décimale)`, prototype `Main.dc.html` (docs/architecture.md § 5.3).
 */
export const LOAD_BUDGET = {
  /** Ratio de la charge maximale visé selon la charge choisie. */
  ratios: { light: 0.3, mid: 0.7, heavy: 1 } satisfies Readonly<Record<LoadTarget, number>>,
  /** Part de la charge retenue pour l'arme. */
  weaponShare: 0.25,
} as const

/**
 * Adéquation précoce du classement des origines (calculs.md, « Origine optimale », « Tri ») : somme des attributs de départ pondérés par
 * les poids du build (D39, S6 ; le prototype les additionnait sans poids), plus ce bonus si l'équipement de départ contient une arme
 * recommandée. Valeur du bonus : prototype (`rankOrigins`).
 */
export const ORIGIN_RANKING = {
  recommendedWeaponBonus: 5,
} as const

/**
 * Armes efficaces contre une rencontre (fiche boss ; calculs.md, « Armes efficaces contre une rencontre ») [conception] : types de dégâts
 * les moins absorbés retenus (`bestTypes`, autant que les faiblesses affichées par un nœud de la frise) et nombre d'armes proposées (`max`,
 * comme une colonne du widget A).
 */
export const WEAKNESS_WEAPONS = {
  bestTypes: 2,
  max: 5,
} as const

/**
 * Recommandations du widget A (calculs.md, « Score de recommandation d'une arme », « Recommandations par étape ») : 3 à 5 armes par étape,
 * alternatives prises à une étape d'écart au plus, valeurs du prototype.
 */
export const RECOMMENDATIONS = {
  /** Armes affichées par colonne d'étape, au plus. */
  perStageMax: 5,
  /** En dessous de ce nombre, la colonne propose un élargissement. */
  perStageMin: 3,
  /** Alternatives proposées pour une arme. */
  alternatives: 4,
  /** Écart d'étapes maximal d'une alternative. */
  alternativesStageSpan: 1,
} as const

/**
 * Rendement des attributs (calculs.md, « Rendement des attributs ») [conception] : `window` est la fenêtre des gains moyens affichés
 * autour de chaque palier publié (config/softCaps.ts). Détection de contrôle des paliers dans les tables : un point où le gain moyen des
 * `window` points suivants tombe à `dropRatio` fois celui des `window` points précédents ou moins, et baisse d'au moins deux pas
 * d'arrondi de la table divisés par `window` (pour ignorer l'alternance des arrondis) ; dans une suite de points consécutifs, celui de
 * plus forte baisse. Depuis D39, les paliers affichés sont ceux du wiki ; la détection ne sert plus que de contrôle (tests).
 */
export const ATTRIBUTE_YIELD = {
  window: 5,
  dropRatio: 0.75,
  roundingSteps: 2,
} as const
