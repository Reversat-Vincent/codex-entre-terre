// Préparation du joueur face à un boss et échelle de la jauge niveau / niveau recommandé.
// Méthode : docs/design/ds/calculs.md, « Préparation et jauge » ; seuils : config/weights.ts (`READINESS`, `GAUGE`).
// Le niveau recommandé lui-même (M1, M2, M3) vient de `bossLevel.ts`, qui réexporte ces fonctions.

import { GAUGE, READINESS } from './config/weights.ts'
import { makeCalc } from './types.ts'
import type { Calc, ExplanationLimit } from './types.ts'

/** Préparation : `ready` (Prêt), `limit` (Limite), `early` (Trop tôt), `defeated` (Vaincu), `unknown` (Non estimé). */
export type ReadinessId = 'ready' | 'limit' | 'early' | 'defeated' | 'unknown'

/**
 * Préparation face à un boss (calculs.md, « Préparation et jauge ») : Prêt si niveau ≥ recommandé ; Limite si niveau ≥ recommandé − 8 ;
 * Trop tôt sinon ; Non estimé sans niveau recommandé. Un boss vaincu est `defeated`, quel que soit le niveau.
 * Le niveau recommandé est une estimation : le résultat en hérite.
 * @param level Niveau du joueur.
 * @param recommended Niveau recommandé calculé ; `value === null` = boss sans données de combat.
 * @param defeated Vrai si le boss est coché vaincu.
 * @returns La préparation, avec l'estimation du niveau recommandé.
 */
export function readiness(level: number, recommended: Calc<number>, defeated: boolean): Calc<ReadinessId> {
  const rec = recommended.value
  const limits: ExplanationLimit[] = []
  let value: ReadinessId
  if (defeated) value = 'defeated'
  else if (rec === null) {
    value = 'unknown'
    limits.push({ code: 'boss-not-estimated' })
  } else if (level >= rec) value = 'ready'
  else if (level >= rec - READINESS.limitMargin) value = 'limit'
  else value = 'early'
  if (recommended.estimate !== null) limits.push({ code: 'input-estimated' })
  return makeCalc('readiness', value, {
    estimate: recommended.estimate,
    components: [
      { code: 'player-level', value: level },
      { code: 'recommended-level', value: rec },
      { code: 'limit-margin', value: READINESS.limitMargin },
    ],
    inputs: [{ file: 'config', entry: 'weights', field: 'READINESS.limitMargin', value: READINESS.limitMargin, reliability: 'calculated' }],
    limits,
  })
}

/**
 * Maximum de l'échelle de la jauge (calculs.md, « Préparation et jauge ») : `max(recommandé + 30, niveau + 12, 60)`.
 * Sans niveau recommandé, `max(niveau + 12, 60)` pour que le repère du joueur reste dans la jauge (calculs.md ne traite pas ce cas).
 * @param level Niveau du joueur.
 * @param recommended Niveau recommandé, ou `null` s'il n'est pas estimé.
 * @returns Le maximum de l'échelle (le minimum est 0).
 */
export function gaugeMax(level: number, recommended: number | null): number {
  const fromPlayer = Math.max(level + GAUGE.abovePlayer, GAUGE.minimum)
  return recommended === null ? fromPlayer : Math.max(recommended + GAUGE.aboveRecommended, fromPlayer)
}
