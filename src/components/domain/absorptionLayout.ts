// Géométrie des barres d'absorption de la fiche boss : échelle commune, position et longueur de chaque barre autour de 0 %, bande de couleur.
// La couleur vient de `engine/weakness.ts` (`absorptionBand`), la même que la matrice des faiblesses : seule la mise à l'échelle est propre aux barres.

import { NEGATION_KEYS } from '../../data/keys.ts'
import type { NegationKey } from '../../data/keys.ts'
import { absorptionBand } from '../../engine/weakness.ts'
import type { AbsorptionBand } from '../../engine/weakness.ts'

/** Absorption par type de dégâts, `null` ou absente quand le wiki ne la donne pas. */
export type NegationInput = Readonly<Partial<Record<NegationKey, number | null>>>

/** Barre d'un type de dégâts. */
export interface AbsorptionBarModel {
  readonly key: NegationKey
  /** Absorption en %, `null` si non documentée (pas de barre). */
  readonly value: number | null
  /** Bande de couleur de l'échelle commune. */
  readonly band: AbsorptionBand
  /** Début de la barre, en % de la largeur de la piste. */
  readonly left: number
  /** Longueur de la barre, en % de la largeur de la piste. */
  readonly width: number
  /** Dégâts amplifiés (absorption négative) : mention « Faiblesse ». */
  readonly weak: boolean
}

/** Graduation de l'axe. */
export interface AbsorptionTick {
  readonly value: number
  /** Position en % de la largeur de la piste. */
  readonly left: number
}

/** Échelle de la piste : valeurs extrêmes, position du zéro et graduations. */
export interface AbsorptionScale {
  readonly min: number
  readonly max: number
  /** Position du 0 % en % de la largeur de la piste. */
  readonly zero: number
  readonly ticks: readonly AbsorptionTick[]
}

/** Étendue minimale de l'axe : de −20 % à 80 % (écran Fiche boss), élargie si une valeur sort de cet intervalle. */
const BASE_MIN = -20
const BASE_MAX = 80

/**
 * Échelle de la piste : −20 % à 80 % au minimum, élargie par pas de 20 pour qu'aucune valeur ne sorte de la piste ; graduations tous les 20 %
 * (tous les 40 % quand l'axe dépasse 120 points, pour que les étiquettes restent lisibles).
 * @param values Absorptions de la rencontre ; les valeurs absentes sont ignorées.
 * @returns L'échelle.
 */
export function absorptionScale(values: readonly (number | null | undefined)[]): AbsorptionScale {
  const numbers = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const min = Math.min(BASE_MIN, Math.floor(Math.min(...numbers, 0) / 20) * 20)
  const max = Math.max(BASE_MAX, Math.ceil(Math.max(...numbers, 0) / 20) * 20)
  const span = max - min
  const step = span > 120 ? 40 : 20
  const ticks: AbsorptionTick[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push({ value: v, left: ((v - min) / span) * 100 })
  return { min, max, zero: ((0 - min) / span) * 100, ticks }
}

/**
 * Barres des huit types de dégâts, dans l'ordre de `NEGATION_KEYS`, sur une échelle commune. Une barre part du 0 % : vers la gauche pour une faiblesse,
 * vers la droite pour une résistance.
 * @param negation Absorption par type (`damage_negation_percent`).
 * @param scale Échelle de la piste.
 * @returns Une barre par type ; `value` vaut `null` quand le type n'est pas documenté.
 */
export function absorptionBars(negation: NegationInput, scale: AbsorptionScale): AbsorptionBarModel[] {
  const span = scale.max - scale.min
  return NEGATION_KEYS.map((key) => {
    const value = negation[key] ?? null
    if (value === null) return { key, value, band: 'null', left: scale.zero, width: 0, weak: false }
    const at = ((Math.min(scale.max, Math.max(scale.min, value)) - scale.min) / span) * 100
    return { key, value, band: absorptionBand(value), left: Math.min(at, scale.zero), width: Math.abs(at - scale.zero), weak: value < 0 }
  })
}
