// Configuration de la puissance d'attaque calculée (hypothèse C3, mode `estimate` choisi par le développeur, D25).
// Source : docs/design/ds/calculs.md, « Puissance d'attaque calculée (Estimation) » ; courbe et règles : page Weapon Scaling et pages d'affinité du wiki.

import type { DamageKey, WeaponAttributeKey } from '../../data/keys.ts'

/** Mode de calcul : `estimate` méthode approchée ; `published` valeurs du tableau d'amélioration seulement (repli). */
export type AttackPowerMode = 'estimate' | 'published'

/** Point d'une courbe de scaling : attribut → valeur de courbe (en %). */
export interface CurvePoint {
  readonly attr: number
  readonly value: number
}

/** Configuration de la puissance d'attaque. */
export interface AttackPowerConfig {
  readonly mode: AttackPowerMode
  /** Courbe générique, points croissants ; interpolation linéaire entre deux points (calculs.md, point 6). */
  readonly curve: readonly CurvePoint[]
  /** Point bas proposé sous 10, non documenté par le wiki [conception] : interpolation entre ce point et le premier point de `curve`. */
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
  // Famille « physique » de la page Weapon Scaling (calculs.md, point 6).
  curve: [
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
