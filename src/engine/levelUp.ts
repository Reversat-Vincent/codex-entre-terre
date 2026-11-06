// Priorités de montée de niveau (widget B, décision D42) : prérequis de la meilleure arme de l'étape, palier de Vigor, puis écart pondéré
// à la cible du build. Méthode : docs/design/ds/calculs.md, « Priorités de montée de niveau » ; réglages : config/weights.ts (`LEVEL_UP_PRIORITIES`).

import { ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { AttributeKey } from '../data/keys.ts'
import type { EntityRef } from '../data/datasets.ts'
import type { StageId } from './config/stages.ts'
import { PUBLISHED_SOFT_CAPS } from './config/softCaps.ts'
import { LEVEL_UP_PRIORITIES } from './config/weights.ts'
import type { BuildWeights } from './origins.ts'
import { byScore } from './score.ts'
import type { ScoredWeapon, StageRecommendations } from './score.ts'
import { makeCalc } from './types.ts'
import type { Attributes, Calc, DataRef, Estimate, ExplanationComponent, ExplanationLimit } from './types.ts'

/** Raison d'une priorité, qui est aussi le code de sa composante dans l'explication (`codes.ts`). */
export type LevelUpReason = 'priority-weapon-requirement' | 'priority-vigor-soft-cap' | 'priority-build-target'

/** Priorité de montée de niveau : attribut, valeur actuelle, valeur visée et raison. */
export interface LevelUpPriority {
  readonly attr: AttributeKey
  readonly current: number
  /** Valeur à atteindre, en points réels (Force réelle à deux mains pour un prérequis de Force). */
  readonly target: number
  readonly reason: LevelUpReason
  /** Arme dont le prérequis est visé (raison `priority-weapon-requirement`), sinon `null`. */
  readonly weapon: EntityRef | null
  /** Poids de l'attribut (raison `priority-build-target`), sinon `null`. */
  readonly weight: number | null
}

/** Réglages de la méthode (par défaut `LEVEL_UP_PRIORITIES` et le premier palier publié de Vigor). */
export interface LevelUpConfig {
  readonly max: number
  readonly survivalWeight: number
  readonly survivalAttributes: readonly AttributeKey[]
  readonly vigorSoftCap: number
}

/** Réglages par défaut. Le palier de Vigor est publié par le wiki ; il existe toujours dans la configuration (40). */
export const LEVEL_UP_CONFIG: LevelUpConfig = {
  ...LEVEL_UP_PRIORITIES,
  vigorSoftCap: PUBLISHED_SOFT_CAPS.hp.points[0] ?? 40,
}

/** Entrées de la méthode, fournies par le store `analysis`. */
export interface LevelUpInput {
  readonly attrs: Attributes
  /** Meilleure arme recommandée de l'étape courante (`bestWeaponOfStage`), ou `null` s'il n'y en a pas. */
  readonly weapon: ScoredWeapon | null
  /** Attributs du build cible ; `value === null` sans build cible (seules les règles 1 et 2 s'appliquent). */
  readonly target: Calc<Attributes>
  /** Poids du build (ceux de l'archétype quand un build cible existe). */
  readonly weights: BuildWeights
}

/**
 * Meilleure arme recommandée d'une étape (calculs.md, « Priorités de montée de niveau », règle 1) : la mieux notée des armes affichées
 * dans la colonne de l'étape (score décroissant, puis nom), quel que soit l'ordre d'affichage de la colonne (la colonne DLC est ordonnée
 * par sous-zone).
 * @param recommendations Recommandations par étape du widget A.
 * @param stage Étape courante du joueur, ou `null` si elle est inconnue.
 * @returns L'arme, ou `null` si la colonne est vide ou l'étape inconnue.
 */
export function bestWeaponOfStage(recommendations: StageRecommendations, stage: StageId | null): ScoredWeapon | null {
  if (stage === null) return null
  const column = recommendations.columns.find((c) => c.stage === stage)
  if (column === undefined) return null
  return [...column.weapons].sort(byScore)[0] ?? null
}

/**
 * Priorités de montée de niveau (calculs.md, « Priorités de montée de niveau », D42) [conception] :
 * 1. prérequis non atteints de la meilleure arme recommandée de l'étape courante (ordre STR, DEX, INT, FAI, ARC ; valeur visée en points réels) ;
 * 2. Vigor jusqu'au premier palier publié (40) si elle est en dessous ;
 * 3. avec un build cible, les autres attributs par écart à la cible multiplié par leur poids (0,5 pour VIG, MND et END que l'archétype ne pondère
 *    pas, 0 pour les autres attributs hors build), du plus grand au plus petit, ex æquo dans l'ordre des attributs.
 * Un attribut n'apparaît qu'une fois (la première règle qui le retient) ; `max` priorités au plus. La liste hérite de l'estimation du score de
 * l'arme quand la règle 1 en retient un prérequis, puisque le choix de l'arme en dépend.
 * @param input Attributs, meilleure arme de l'étape, build cible et poids.
 * @param cfg Réglages.
 * @returns Les priorités dans l'ordre (liste vide si tout est atteint), avec leur explication ; jamais `null`.
 */
export function levelUpPriorities(input: LevelUpInput, cfg: LevelUpConfig = LEVEL_UP_CONFIG): Calc<LevelUpPriority[]> {
  const { attrs, weapon, target, weights } = input
  const out: LevelUpPriority[] = []
  const inputs: DataRef[] = []
  const limits: ExplanationLimit[] = []
  const listed = (attr: AttributeKey): boolean => out.some((p) => p.attr === attr)
  let estimate: Estimate | null = null

  // Règle 1 : prérequis de la meilleure arme de l'étape. L'écart est déjà en points réels (Force réelle à deux mains, calculs.md, « Prérequis »).
  if (weapon === null) limits.push({ code: 'priorities-no-weapon' })
  else {
    const checks = weapon.score.value?.requirements ?? []
    for (const check of checks) {
      if (check.met) continue
      out.push({ attr: check.attr, current: check.actual, target: check.actual + check.gap, reason: 'priority-weapon-requirement', weapon: weapon.candidate.ref, weight: null })
      inputs.push({ file: weapon.candidate.file, entry: weapon.candidate.weapon.id, field: `requirements.${check.attr}`, value: check.required, reliability: 'wiki' })
    }
    if (checks.some((c) => !c.met)) {
      estimate = weapon.score.estimate
      if (checks.some((c) => !c.met && c.twoHandApplied)) limits.push({ code: 'priorities-two-handed-strength' })
    }
  }

  // Règle 2 : Vigor jusqu'au premier palier publié.
  if (attrs.vig < cfg.vigorSoftCap && !listed('vig')) {
    out.push({ attr: 'vig', current: attrs.vig, target: cfg.vigorSoftCap, reason: 'priority-vigor-soft-cap', weapon: null, weight: null })
    inputs.push({ file: 'config', entry: 'softCaps', field: 'PUBLISHED_SOFT_CAPS.hp.points[0]', value: cfg.vigorSoftCap, reliability: 'wiki' })
  }

  // Règle 3 : écart pondéré à la cible du build.
  const goal = target.value
  if (goal === null) limits.push({ code: 'priorities-no-target' })
  else {
    const ranked = ATTRIBUTE_KEYS.flatMap((attr) => {
      if (listed(attr)) return []
      // Poids absent = attribut hors build (type `BuildWeights`) ; VIG, MND et END reçoivent le poids de survie (D42).
      const weight = weights[attr] ?? (cfg.survivalAttributes.includes(attr) ? cfg.survivalWeight : 0)
      const gap = Math.max(0, goal[attr] - attrs[attr])
      return gap * weight > 0 ? [{ attr, weight, gap, score: gap * weight }] : []
    }).sort((a, b) => b.score - a.score || ATTRIBUTE_KEYS.indexOf(a.attr) - ATTRIBUTE_KEYS.indexOf(b.attr))
    for (const r of ranked) out.push({ attr: r.attr, current: attrs[r.attr], target: goal[r.attr], reason: 'priority-build-target', weapon: null, weight: r.weight })
    inputs.push(...target.explanation.inputs)
    if (ranked.some((r) => weights[r.attr] === undefined)) limits.push({ code: 'priorities-survival-weight', params: { weight: cfg.survivalWeight } })
  }

  const value = out.slice(0, Math.max(0, cfg.max))
  if (out.length > value.length) limits.push({ code: 'priorities-truncated', params: { max: cfg.max } })
  limits.push({ code: 'priorities-design-method' })
  if (estimate !== null) limits.push({ code: 'input-estimated' })
  const components: ExplanationComponent[] = value.map((p) => ({
    code: p.reason,
    value: p.target,
    params: { attr: p.attr, actual: p.current, ...(p.weight === null ? {} : { weight: p.weight, points: p.target - p.current }) },
  }))
  inputs.push({ file: 'config', entry: 'weights', field: 'LEVEL_UP_PRIORITIES', value: `${cfg.max} ; ${cfg.survivalWeight}`, reliability: 'calculated' })
  return makeCalc('level-up-priorities', value, { estimate, components, inputs, limits })
}
