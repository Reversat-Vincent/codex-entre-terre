// Codes renvoyés par le moteur dans ses explications (composantes et limites) : jamais de texte d'interface ici.
// `src/ui/explainText.ts` traduit chaque code ; un test côté interface vérifiera que chaque code de ces listes a son texte (docs/architecture.md § 5.1).

/** Codes des composantes d'une explication (« Pourquoi ? »), regroupés par méthode de `docs/design/ds/calculs.md`. */
export const COMPONENT_CODES = [
  // Origine optimale : niveau d'un jeu d'attributs.
  'attribute-sum',
  'level-offset',
  'level',
  // Coût en runes d'un niveau.
  'rune-cost',
  'runes-total',
  'level-from',
  'level-to',
  // Statistiques dérivées.
  'hp',
  'fp',
  'stamina',
  'equip-load',
  // Prérequis comparés au profil.
  'requirement',
  'effective-strength',
  // Plan d'amélioration.
  'stones',
  'ancient-stones',
  'total-stones',
  'bell-bearing',
  // Origine optimale : classement.
  'final-level',
  'wasted-points',
  'early-fit',
  'starting-weapon-bonus',
  'rank',
  // Puissance d'attaque calculée.
  'base',
  'coef',
  'curve',
  'scaling-bonus',
  'requirement-penalty',
  'attack-type',
  'attack-total',
  // Préparation et jauge.
  'player-level',
  'recommended-level',
  'limit-margin',
  'gauge-max',
] as const

/** Code d'une composante d'explication. */
export type ComponentCode = (typeof COMPONENT_CODES)[number]

/** Codes des limites d'une explication (hypothèses, données manquantes, approximations). */
export const LIMIT_CODES = [
  // Communs.
  'attribute-out-of-range',
  'level-out-of-range',
  'input-estimated',
  // Coût en runes d'un niveau.
  'level-out-of-table',
  'invalid-range',
  'max-level-unconfirmed',
  // Statistiques dérivées.
  'table-row-missing',
  'base-values-only',
  // Prérequis à deux mains.
  'two-hand-no-stance',
  'two-hand-always',
  'two-hand-bonus-exception',
  // Plan d'amélioration.
  'upgrade-type-undocumented',
  'not-upgradeable',
  'upgrade-type-estimated',
  'upgrade-type-deduced',
  'material-unknown',
  'prices-not-in-data',
  'ancient-stones-not-purchasable',
  // Origine optimale.
  'target-out-of-range',
  'wasted-points-not-tiebreak',
  'early-fit-uses-recommended-weapons',
  // Puissance d'attaque calculée.
  'estimate-method',
  'generic-curve',
  'curve-below-10',
  'curve-above-99',
  'base-interpolated',
  'coef-interpolated',
  'scaling-coef-missing',
  'scaling-missing-at-level',
  'elemental-scaling-undocumented',
  'scaling-attribute-ignored',
  'requirement-not-met',
  'requirement-effect-undocumented',
  'penalty-exception',
  'table-inconsistent',
  'attack-value-unparsed',
  'attack-type-missing',
  'infobox-base',
  // Préparation et jauge.
  'boss-not-estimated',
] as const

/** Code d'une limite d'explication. */
export type LimitCode = (typeof LIMIT_CODES)[number]
