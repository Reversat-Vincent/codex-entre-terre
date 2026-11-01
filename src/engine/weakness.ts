// Lecture des faiblesses d'une rencontre : types de dégâts les moins absorbés, immunités aux statuts, bande de la matrice des faiblesses.
// Lecture de données, pas une méthode de calculs.md : seuils de bandes du README `docs/design/ds/components/AbsorptionHeatmap/README.md`.

import { NEGATION_KEYS, STATUS_KEYS } from '../data/keys.ts'
import type { NegationKey, StatusKey } from '../data/keys.ts'
import type { Encounter } from '../data/types/bosses.ts'

/** Bande de couleur d'une absorption (classes `h-*` d'AbsorptionHeatmap) ; `null` = absorption non documentée (`h-null`). */
export type AbsorptionBand = 'w2' | 'w1' | 'n' | 'r1' | 'r2' | 'r3' | 'null'

/**
 * Bornes hautes incluses des bandes, de la plus forte faiblesse à la plus forte résistance (README AbsorptionHeatmap) :
 * `h-w2` ≤ −10, `h-w1` −9 à 5, `h-n` 6 à 15, `h-r1` 16 à 30, `h-r2` 31 à 50, `h-r3` > 50.
 */
export const ABSORPTION_BANDS: readonly { readonly band: Exclude<AbsorptionBand, 'null' | 'r3'>; readonly max: number }[] = [
  { band: 'w2', max: -10 },
  { band: 'w1', max: 5 },
  { band: 'n', max: 15 },
  { band: 'r1', max: 30 },
  { band: 'r2', max: 50 },
]

/**
 * Bande d'une absorption (README AbsorptionHeatmap). Une valeur non entière entre deux bornes va dans la bande supérieure (−9,5 → `w1`).
 * @param v Absorption en %, négative pour une faiblesse ; `null` si non documentée.
 * @returns La bande, ou `null` pour une valeur non documentée.
 */
export function absorptionBand(v: number | null | undefined): AbsorptionBand {
  if (v === null || v === undefined || Number.isNaN(v)) return 'null'
  for (const b of ABSORPTION_BANDS) if (v <= b.max) return b.band
  return 'r3'
}

/** Absorption d'un type de dégâts. */
export interface DamageAbsorption {
  readonly type: NegationKey
  readonly value: number
}

/**
 * Types de dégâts les moins absorbés par une rencontre (absorption croissante ; ex æquo dans l'ordre de `NEGATION_KEYS`).
 * @param enc Rencontre (`damage_negation_percent`).
 * @param n Nombre de types rendus.
 * @returns Les `n` types les moins absorbés, ou `null` si l'absorption n'est pas documentée (aucune suggestion d'arme dans ce cas).
 */
export function bestDamageTypes(enc: Pick<Encounter, 'damage_negation_percent'>, n: number): DamageAbsorption[] | null {
  const neg = enc.damage_negation_percent
  if (neg === undefined) return null
  return NEGATION_KEYS.map((type) => ({ type, value: neg[type] }))
    .sort((a, b) => a.value - b.value || NEGATION_KEYS.indexOf(a.type) - NEGATION_KEYS.indexOf(b.type))
    .slice(0, Math.max(0, n))
}

/**
 * Statuts auxquels une rencontre est immunisée : valeur exactement `"Immune"` (docs/architecture.md § 3.4).
 * @param enc Rencontre (`status_resistance`).
 * @returns Les statuts immunisés dans l'ordre de `STATUS_KEYS`, ou `null` si les résistances ne sont pas documentées.
 */
export function immunities(enc: Pick<Encounter, 'status_resistance'>): StatusKey[] | null {
  const res = enc.status_resistance
  if (res === undefined) return null
  return STATUS_KEYS.filter((k) => res[k] === 'Immune')
}
