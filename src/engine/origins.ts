// Classement des origines pour un jeu d'attributs cible : niveau final, points gaspillés, adéquation précoce.
// Méthode : docs/design/ds/calculs.md, « Origine optimale ». Ordre d'évaluation avec le score des armes : docs/architecture.md § 5.4
// (scores sans bonus d'origine → classement des origines → origine retenue → scores définitifs), orchestré par le store `analysis`.

import { ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { AttributeKey } from '../data/keys.ts'
import type { EntityRef } from '../data/datasets.ts'
import type { OriginEntry } from '../data/types/origins.ts'
import { ORIGIN_RANKING } from './config/weights.ts'
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN, LEVEL_OFFSET, originAttributes } from './level.ts'
import { isCalc, isIntIn, makeCalc, nullCalc } from './types.ts'
import type { Attributes, Calc, DataRef, Estimate, ExplanationComponent, ExplanationLimit } from './types.ts'

/** Champs d'origine lus par le classement. */
export type RankedOrigin = Pick<OriginEntry, 'id' | 'name' | 'attributes' | 'starting_equipment'>

/** Poids des attributs du build (composante 1 du score) ; un poids absent ou nul = attribut hors build. */
export type BuildWeights = Readonly<Partial<Record<AttributeKey, number>>>

/** Contexte du classement : poids du build et armes recommandées (noms exacts de data/), fournis par le store `analysis`. */
export interface OriginRankContext {
  readonly weights: BuildWeights
  /** Noms des armes recommandées par le widget A, joints aux `starting_equipment.Armaments` des origines. */
  readonly recommendedWeapons: ReadonlySet<string>
}

/** Rang d'une origine pour une cible. */
export interface OriginRank {
  readonly origin: EntityRef
  /** Rang, 1 = meilleure origine ; les origines sont rendues triées. */
  readonly rank: number
  /** Niveau final : `Σ max(départ, cible) − 79`. */
  readonly finalLevel: number
  /** Points gaspillés : `Σ max(0, départ − cible)` ; affichés, jamais critère de tri. */
  readonly wastedPoints: number
  /** Points gaspillés par attribut (attributs concernés seulement). */
  readonly wastedBy: Readonly<Partial<Record<AttributeKey, number>>>
  /** Adéquation précoce : somme des attributs de départ utiles au build, plus le bonus d'arme recommandée. */
  readonly earlyFit: number
  /** Armes de départ qui figurent parmi les armes recommandées. */
  readonly recommendedStartingWeapons: readonly string[]
}

/**
 * Noms d'armes de l'équipement de départ d'une origine (`starting_equipment.Armaments`) : le texte du wiki groupe parfois plusieurs objets
 * (« Shortbow + Bone Arrow (Fletched) x30 ») et des quantités (« Scimitar (x2) ») ; on découpe sur « + » et on retire les quantités.
 * @param origin Origine.
 * @returns Les noms, dans l'ordre du wiki, sans doublon.
 */
export function startingArmamentNames(origin: Pick<OriginEntry, 'starting_equipment'>): string[] {
  const names = origin.starting_equipment.Armaments.flatMap((entry) =>
    entry.split(' + ').map((part) => part.replace(/\s*\(x\d+\)\s*$/i, '').replace(/\s+x\d+\s*$/i, '').trim()),
  )
  return [...new Set(names.filter((n) => n.length > 0))]
}

/**
 * Indique si chaque attribut cible est un entier de 1 à 99 (calculs.md, « Origine optimale », « Préconditions »).
 * @param target Attributs cibles.
 * @returns La première clé hors bornes, ou `null`.
 */
function invalidTarget(target: Attributes): AttributeKey | null {
  for (const k of ATTRIBUTE_KEYS) if (!isIntIn(target[k], ATTRIBUTE_MIN, ATTRIBUTE_MAX)) return k
  return null
}

/** Ligne intermédiaire du classement, avant le rang. */
interface Scored {
  readonly origin: RankedOrigin
  readonly rank: Omit<OriginRank, 'rank'>
  readonly components: ExplanationComponent[]
  readonly inputs: DataRef[]
}

/**
 * Classe les origines pour un jeu d'attributs cible (calculs.md, « Origine optimale »).
 * Niveau final `Σ max(départ, cible) − 79` ; points gaspillés `Σ max(0, départ − cible)` ; tri par niveau final croissant, puis adéquation
 * précoce décroissante (prototype : somme des attributs de départ de poids non nul, + bonus si une arme de départ est recommandée), puis nom.
 * Les points gaspillés ne départagent jamais (identité de calculs.md) : ils restent dans le résultat. Le filtrage des origines par contenu
 * activé (Tarnished Pack…) appartient à l'appelant.
 * @param origins Origines à classer.
 * @param target Attributs cibles, bruts ou calculés (une cible estimée rend chaque rang estimé).
 * @param ctx Poids du build et armes recommandées.
 * @returns Un `Calc` par origine, triés du meilleur au moins bon ; si la cible est invalide, des `null` avec `target-out-of-range`, dans l'ordre reçu.
 */
export function rankOrigins(
  origins: readonly RankedOrigin[],
  target: Attributes | Calc<Attributes>,
  ctx: OriginRankContext,
): Calc<OriginRank>[] {
  const targetValue = isCalc(target) ? target.value : target
  const estimate: Estimate | null = isCalc(target) ? target.estimate : null
  const baseLimits: ExplanationLimit[] = estimate === null ? [] : [{ code: 'input-estimated' }]
  if (targetValue === null) {
    return origins.map(() => nullCalc<OriginRank>('optimal-origin', { code: 'target-out-of-range' }, { estimate, limits: baseLimits }))
  }
  const bad = invalidTarget(targetValue)
  if (bad !== null) {
    return origins.map(() =>
      nullCalc<OriginRank>('optimal-origin', { code: 'target-out-of-range', params: { attr: bad } }, { estimate, limits: baseLimits }),
    )
  }

  const scored: Scored[] = origins.map((o) => {
    const start = originAttributes(o)
    let sum = 0
    let wasted = 0
    let fit = 0
    const wastedBy: Partial<Record<AttributeKey, number>> = {}
    const inputs: DataRef[] = []
    for (const k of ATTRIBUTE_KEYS) {
      sum += Math.max(start[k], targetValue[k])
      const w = Math.max(0, start[k] - targetValue[k])
      wasted += w
      if (w > 0) wastedBy[k] = w
      if ((ctx.weights[k] ?? 0) !== 0) fit += start[k]
      inputs.push({ file: 'origins', entry: o.id, field: `attributes.${k}`, value: start[k], reliability: 'wiki' })
    }
    const recommendedStartingWeapons = startingArmamentNames(o).filter((n) => ctx.recommendedWeapons.has(n))
    const bonus = recommendedStartingWeapons.length > 0 ? ORIGIN_RANKING.recommendedWeaponBonus : 0
    if (bonus > 0) inputs.push({ file: 'origins', entry: o.id, field: 'starting_equipment.Armaments', value: recommendedStartingWeapons.join(', '), reliability: 'wiki' })
    const finalLevel = sum - LEVEL_OFFSET
    return {
      origin: o,
      rank: {
        origin: `origin:${o.id}` as EntityRef,
        finalLevel,
        wastedPoints: wasted,
        wastedBy,
        earlyFit: fit + bonus,
        recommendedStartingWeapons,
      },
      components: [
        { code: 'final-level', value: finalLevel },
        { code: 'wasted-points', value: wasted },
        { code: 'early-fit', value: fit + bonus },
        { code: 'starting-weapon-bonus', value: bonus },
      ],
      inputs,
    }
  })

  scored.sort(
    (a, b) =>
      a.rank.finalLevel - b.rank.finalLevel ||
      b.rank.earlyFit - a.rank.earlyFit ||
      (a.origin.name < b.origin.name ? -1 : a.origin.name > b.origin.name ? 1 : 0),
  )

  return scored.map((s, i) =>
    makeCalc<OriginRank>('optimal-origin', { ...s.rank, rank: i + 1 }, {
      estimate,
      components: [...s.components, { code: 'rank', value: i + 1 }],
      inputs: s.inputs,
      limits: [...baseLimits, { code: 'wasted-points-not-tiebreak' }, { code: 'early-fit-uses-recommended-weapons' }],
    }),
  )
}

/**
 * Origine retenue (docs/architecture.md § 5.4) : le rang 1 du classement en mode « Automatique », sinon l'origine choisie.
 * @param choice `auto` ou référence d'origine choisie par le joueur.
 * @param ranking Classement rendu par `rankOrigins`.
 * @returns La référence de l'origine retenue, ou `null` si le classement est vide ou non calculé.
 */
export function effectiveOrigin(choice: 'auto' | EntityRef, ranking: readonly Calc<OriginRank>[]): EntityRef | null {
  if (choice !== 'auto') return choice
  return ranking[0]?.value?.origin ?? null
}
