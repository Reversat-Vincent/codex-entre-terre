// Configuration de la puissance d'attaque calculée (hypothèse C3, mode `estimate` choisi par le développeur, D25).
// Source : docs/design/ds/calculs.md, « Puissance d'attaque calculée (Estimation) » ; courbes et règles : page Weapon Scaling
// (https://eldenring.wiki.gg/wiki/Weapon_Scaling, section « Stat Scaling ») et pages d'affinité du wiki ; choix de la courbe par affinité : D39, S4.

import type { DamageKey, WeaponAttributeKey } from '../../data/keys.ts'

/** Mode de calcul : `estimate` méthode approchée ; `published` valeurs du tableau d'amélioration seulement (repli). */
export type AttackPowerMode = 'estimate' | 'published'

/** Point d'une courbe de scaling : attribut → valeur de courbe (en %). */
export interface CurvePoint {
  readonly attr: number
  readonly value: number
}

/** Famille de courbe du wiki : « physique » (Standard, Heavy, Keen, Quality, Occult) ou « non physique » (affinités élémentaires). */
export type CurveFamily = 'physical' | 'nonPhysical'

/** Configuration de la puissance d'attaque. */
export interface AttackPowerConfig {
  readonly mode: AttackPowerMode
  /** Courbes génériques par famille, points croissants ; interpolation linéaire entre deux points (calculs.md, point 6). */
  readonly curves: Readonly<Record<CurveFamily, readonly CurvePoint[]>>
  /**
   * Affinités qui suivent la courbe « non physique », pour tous les types de dégâts de l'arme, physique compris (calculs.md, point 6) ;
   * toute autre affinité, et les armes uniques traitées en Standard, suivent la courbe « physique ».
   */
  readonly nonPhysicalAffinities: readonly string[]
  /** Point bas proposé sous 10, non documenté par le wiki [conception] : interpolation entre ce point et le premier point de la famille. */
  readonly curveFloor: CurvePoint
  /** Attributs qui font varier chaque type de dégâts, quelle que soit l'affinité (calculs.md, point 4). */
  readonly attributesByType: Readonly<Partial<Record<DamageKey, readonly WeaponAttributeKey[]>>>
  /** Attributs ajoutés à un type selon l'affinité (calculs.md, point 4 : Occult, Blood, Poison → ARC ; Cold → INT pour la magie). */
  readonly attributesByAffinity: Readonly<Record<string, Readonly<Partial<Record<DamageKey, readonly WeaponAttributeKey[]>>>>>
  /** Facteur appliqué à un type dont un prérequis n'est pas atteint (−40 %, page Weapon Scaling). */
  readonly requirementPenaltyFactor: number
  /** Types jamais réduits par la pénalité, par arme (id) : exception connue de la page Ruins Greatsword (calculs.md, point 5). */
  readonly penaltyExceptions: Readonly<Record<string, readonly DamageKey[]>>
  /** Affinité par défaut. */
  readonly defaultAffinity: string
}

/** Valeurs retenues (calculs.md, « Puissance d'attaque calculée (Estimation) »). */
export const ATTACK_POWER: AttackPowerConfig = {
  mode: 'estimate',
  curves: {
    // [wiki] Weapon Scaling, « Physical affinity values » (Standard, Heavy, Keen, Quality, Occult).
    physical: [
      { attr: 10, value: 15 },
      { attr: 20, value: 35 },
      { attr: 30, value: 46.5 },
      { attr: 40, value: 57.5 },
      { attr: 50, value: 67.5 },
      { attr: 60, value: 75 },
      { attr: 70, value: 82.5 },
      { attr: 80, value: 90 },
      { attr: 90, value: 92.5 },
      { attr: 99, value: 96 },
    ],
    // [wiki] Weapon Scaling, « Non-physical affinity values » (Fire, Flame Art, Lightning, Sacred, Magic, Cold, Blood, Poison).
    nonPhysical: [
      { attr: 10, value: 19 },
      { attr: 20, value: 40 },
      { attr: 30, value: 53 },
      { attr: 40, value: 66.5 },
      { attr: 50, value: 80 },
      { attr: 60, value: 85 },
      { attr: 70, value: 90 },
      { attr: 80, value: 95 },
      { attr: 90, value: 97.5 },
      { attr: 99, value: 100 },
    ],
  },
  // [wiki] Weapon Scaling : « varying somewhat depending on if the used affinity is physical (Standard, Heavy, Keen, Quality, or Occult)
  // or non-physical (Fire, Flame Art, Lightning, Sacred, Magic, Cold, Blood, or Poison) ». Noms exacts des clés de `upgrade.tables`.
  nonPhysicalAffinities: ['Fire', 'Flame Art', 'Lightning', 'Sacred', 'Magic', 'Cold', 'Blood', 'Poison'],
  curveFloor: { attr: 1, value: 0 },
  attributesByType: { physical: ['str', 'dex'] },
  attributesByAffinity: {
    Occult: { physical: ['arc'] },
    Blood: { physical: ['arc'] },
    Poison: { physical: ['arc'] },
    Cold: { magic: ['int'] },
  },
  requirementPenaltyFactor: 0.6,
  penaltyExceptions: { 'ruins-greatsword': ['magic'] },
  defaultAffinity: 'Standard',
}
