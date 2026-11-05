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
  // Étape de progression.
  'stage-index',
  // Niveau recommandé d'un boss (M1, M2, M3, DLC, bénédiction).
  'zone-tier',
  'm1',
  'runes',
  'rune-anchor',
  'm2',
  'm3',
  'dlc-entry-source',
  'dlc-entry-level',
  'blessing-fragments',
  'blessing-level',
  'blessing-max-level',
  // Build cible.
  'target-level',
  'target-attribute',
  // Budget de charge.
  'load-ratio',
  'weapon-share',
  'load-budget',
  // Score de recommandation : composantes et détail.
  'score-fit',
  'scaling-mean',
  'off-build-penalty',
  'status-bonus',
  'class-bonus',
  'score-power',
  'base-power',
  'scaling-sum',
  'overweight-penalty',
  'score-access',
  'stages-ahead',
  'missing-points',
  'remembrance-penalty',
  'invader-penalty',
  'starting-bonus',
  'score-upgrade',
  'upgrade-base',
  'stone-preference',
  'estimate-penalty',
  'score-total',
  // Armes efficaces contre une rencontre (faiblesses).
  'weakness-absorption',
  // Couverture des données.
  'coverage-documented',
  // Rendement des attributs.
  'yield-next-gain',
  'yield-soft-cap',
  // Priorités de montée de niveau (D42) : une composante par priorité, dont le code est la raison.
  'priority-weapon-requirement',
  'priority-vigor-soft-cap',
  'priority-build-target',
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
  'curve-non-physical',
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
  // Étape de progression.
  'encounter-missing',
  'stage-unclassified',
  'stage-from-regions-mentioned',
  'stage-override',
  'remembrance-encounter-unavailable',
  'remembrance-encounter-missing',
  'dlc-unlocated',
  'region-unknown',
  'no-region-reached',
  'timeline-unavailable',
  'stage-from-next-boss',
  'story-complete',
  'next-boss-stage-unknown',
  // Niveau recommandé d'un boss.
  'tier-missing',
  'runes-missing',
  'runes-excluded',
  'runes-beyond-table',
  'hp-not-used',
  'dlc-entry-level-used',
  'blessing-table-unavailable',
  // Build cible.
  'no-archetype',
  'template-design-choice',
  'target-capped',
  'target-below-current',
  // Score de recommandation.
  'score-base-values',
  'load-budget-unavailable',
  'spell-power-missing',
  // Armes efficaces contre une rencontre (faiblesses).
  'absorption-undocumented',
  'weakness-weapons-base-values',
  // Rendement des attributs.
  'soft-caps-published',
  // Score d'une arme hors des critères (getter `scoreOf`) : raison qui la masque ou l'écarte du widget A.
  'weapon-hidden-content-sote',
  'weapon-hidden-content-tp',
  'weapon-hidden-remembrance',
  'weapon-hidden-random-drop',
  'weapon-hidden-quest',
  'weapon-hidden-estimate',
  'weapon-outside-style',
  // Priorités de montée de niveau (D42).
  'priorities-no-weapon',
  'priorities-no-target',
  'priorities-two-handed-strength',
  'priorities-survival-weight',
  'priorities-truncated',
  'priorities-design-method',
] as const

/** Code d'une limite d'explication. */
export type LimitCode = (typeof LIMIT_CODES)[number]

/**
 * Codes de libellés renvoyés par la configuration et les modules sans `Explanation` : étapes et prérequis de la frise, lignes de couverture,
 * titres et descriptions des widgets, liens externes. Leurs textes sont dans `src/ui/explainText.ts`, comme ceux des explications.
 */
export const LABEL_CODES = [
  // Frise des boss (config/timeline.ts).
  'timeline-step-shardbearers',
  'timeline-step-leyndell-access',
  'timeline-step-place',
  'timeline-step-erdtree',
  'prereq-radahn-jerren',
  'prereq-rykard-tanith-or-godskin-noble',
  'prereq-mohg-varre-or-snowfield',
  'prereq-messmers-kindling',
  // Couverture des données (coverage.ts).
  'coverage-upgrade-melee',
  'coverage-upgrade-ranged',
  'coverage-upgrade-shields',
  'coverage-timeline-hp',
  'coverage-timeline-runes',
  'coverage-timeline-negation',
  'coverage-encounters-hp',
  'coverage-encounters-negation',
  // Widgets (src/widgets/registry.ts) : titre et ligne « comment c'est calculé ».
  'widget-title-weapons-by-stage',
  'widget-how-weapons-by-stage',
  'widget-title-optimal-origin',
  'widget-how-optimal-origin',
  'widget-title-boss-order',
  'widget-how-boss-order',
  'widget-title-weakness-matrix',
  'widget-how-weakness-matrix',
  'widget-title-upgrade-plan',
  'widget-how-upgrade-plan',
  'widget-title-rune-calculator',
  'widget-how-rune-calculator',
  'widget-title-attribute-yield',
  'widget-how-attribute-yield',
  'widget-title-data-coverage',
  'widget-how-data-coverage',
  // Liens externes (src/data/externalLinks.ts).
  'link-wiki',
  'link-fextralife-search',
  'link-map-wiki-gg',
  'link-map-fextralife',
  'link-guide-elden-ring-guide',
  'link-guide-recommended-level',
  'link-guide-walkthrough-wiki-gg',
  'link-guide-progress-route',
  'link-guide-walkthrough-fextralife',
  'link-wiki-search',
] as const

/** Code d'un libellé. */
export type LabelCode = (typeof LABEL_CODES)[number]
