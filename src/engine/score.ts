// Score de recommandation des armes (widget A) : candidats selon le style, filtres et exclusions, score 4 × 25, budget de charge,
// recommandations par étape (3 à 5 armes), alternatives et suggestions d'élargissement.
// Méthode : docs/design/ds/calculs.md, « Score de recommandation d'une arme (0–100) » (D6, D7, D18) ; pondérations : config/weights.ts.

import type { EntityRef } from '../data/datasets.ts'
import { WEAPON_ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { StatusKey } from '../data/keys.ts'
import type { CalcTables } from '../data/types/tables.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { REMEMBRANCES } from './config/remembrances.ts'
import { STAGE_IDS, stageIndex } from './config/stages.ts'
import type { StageId } from './config/stages.ts'
import { CATALYST_POWER_FIELD, SHIELD_CATEGORIES, SHIELD_FILE, STYLE_POOLS } from './config/weaponPools.ts'
import type { PlayStyle } from './config/weaponPools.ts'
import {
  ACCESS_WEIGHTS,
  FIT_WEIGHTS,
  LOAD_BUDGET,
  POWER_WEIGHTS,
  RECOMMENDATIONS,
  SCORE_COMPONENT_MAX,
  UPGRADE_COST_WEIGHTS,
} from './config/weights.ts'
import type { LoadTarget } from './config/weights.ts'
import { attributeTableValue } from './derivedStats.ts'
import type { BuildWeights } from './origins.ts'
import { compareRequirements } from './requirements.ts'
import type { RequirementCheck } from './requirements.ts'
import { dlcZoneRank, stagesAhead } from './stage.ts'
import type { StageInfo } from './stage.ts'
import { makeCalc, nullCalc } from './types.ts'
import type { Attributes, Calc, DataRef, Estimate, ExplanationComponent, ExplanationLimit, Hands, WeaponFileKey } from './types.ts'
import { upgradeStatus } from './upgradePlan.ts'

/** Arme candidate et son fichier. */
export interface CandidateWeapon {
  readonly file: WeaponFileKey
  readonly weapon: WeaponEntry
  readonly ref: EntityRef
}

/** Armes disponibles par fichier (les fichiers non chargés sont absents). */
export type WeaponData = Readonly<Partial<Record<WeaponFileKey, readonly WeaponEntry[]>>>

/** Style de jeu lu par la sélection des candidats. */
export interface StyleInput {
  readonly mode: PlayStyle
  /** Classes préférées (`category` de data/). */
  readonly classes: readonly string[]
}

/**
 * Fichiers d'armes requis par un style (registre des widgets, widget A) : ceux du style, plus les boucliers si une classe préférée en relève.
 * @param style Style de jeu.
 * @returns Les clés de fichiers, sans doublon.
 */
export function weaponFilesFor(style: StyleInput): WeaponFileKey[] {
  const files = new Set<WeaponFileKey>(STYLE_POOLS[style.mode].files)
  if (style.classes.some((c) => SHIELD_CATEGORIES.includes(c))) files.add(SHIELD_FILE)
  return [...files]
}

/**
 * Armes candidates selon le style (calculs.md, « Candidats selon le style de jeu », D7) : mêlée → armes de mêlée ; distance → Light Bows,
 * Bows, Greatbows, Crossbows, Ballistas ; magie → Staves, Sacred Seals ; hybride → tout ; boucliers et torches si leur catégorie est préférée.
 * @param data Armes chargées, par fichier.
 * @param style Style de jeu.
 * @returns Les candidats, dans l'ordre des fichiers.
 */
export function candidateWeapons(data: WeaponData, style: StyleInput): CandidateWeapon[] {
  const pool = STYLE_POOLS[style.mode]
  const out: CandidateWeapon[] = []
  for (const file of pool.files) {
    for (const weapon of data[file] ?? []) {
      if (pool.categories === null || pool.categories.includes(weapon.category)) out.push({ file, weapon, ref: `weapon:${weapon.id}` })
    }
  }
  for (const weapon of data[SHIELD_FILE] ?? []) {
    if (style.classes.includes(weapon.category)) out.push({ file: SHIELD_FILE, weapon, ref: `weapon:${weapon.id}` })
  }
  return out
}

/** Raison qui masque une arme candidate ; l'ordre est celui d'application des filtres. */
export const HIDDEN_REASONS = ['content-sote', 'content-tp', 'remembrance', 'random-drop', 'quest', 'estimate'] as const

/** Raison qui masque une arme candidate. */
export type HiddenReason = (typeof HIDDEN_REASONS)[number]

/** Critères lus par les filtres. */
export interface FilterCriteria {
  readonly content: { readonly sote: boolean; readonly tp: boolean }
  readonly constraints: { readonly excludeRemembrance: boolean; readonly excludeRandomDrop: boolean; readonly excludeQuest: boolean }
  readonly reliability: { readonly includeEstimates: boolean }
}

/** Indicateurs d'acquisition lus par les exclusions (`acquisition_flags`, data/README.md). */
const FLAG = { remembrance: 'remembrance_weapon', randomDrop: 'random_enemy_drop', quest: 'npc_or_quest_related' } as const

/**
 * Indique si une arme est un échange de Remembrance (indicateur ou table de config/remembrances.ts).
 * @param c Candidat.
 * @returns Vrai pour un échange de Remembrance.
 */
export function isRemembranceWeapon(c: CandidateWeapon): boolean {
  return c.weapon.acquisition_flags.includes(FLAG.remembrance) || REMEMBRANCES[c.ref] !== undefined
}

/**
 * Raison pour laquelle une arme est masquée (calculs.md, « Filtres appliqués avant le score ») : contenu désactivé, exclusions
 * (Remembrance, butin aléatoire, quête, lus dans `acquisition_flags`), estimations exclues si la fiabilité l'impose.
 * @param c Candidat.
 * @param criteria Critères.
 * @returns La première raison qui s'applique, ou `null` si l'arme reste visible.
 */
export function hiddenReason(c: CandidateWeapon, criteria: FilterCriteria): HiddenReason | null {
  const w = c.weapon
  if (w.source === 'Shadow of the Erdtree' && !criteria.content.sote) return 'content-sote'
  if (w.source === 'Tarnished Pack' && !criteria.content.tp) return 'content-tp'
  if (criteria.constraints.excludeRemembrance && isRemembranceWeapon(c)) return 'remembrance'
  if (criteria.constraints.excludeRandomDrop && w.acquisition_flags.includes(FLAG.randomDrop)) return 'random-drop'
  if (criteria.constraints.excludeQuest && w.acquisition_flags.includes(FLAG.quest)) return 'quest'
  if (!criteria.reliability.includeEstimates && w.derived.upgrade.reliability === 'estimate') return 'estimate'
  return null
}

/** Résultat des filtres. */
export interface FilterResult {
  readonly kept: readonly CandidateWeapon[]
  readonly hidden: Readonly<Record<HiddenReason, number>>
  /** Armes masquées avec leur raison (affichables grisées en plein écran). */
  readonly hiddenItems: readonly { readonly candidate: CandidateWeapon; readonly reason: HiddenReason }[]
}

/**
 * Applique les filtres aux candidats (calculs.md, « Filtres appliqués avant le score »).
 * @param candidates Candidats.
 * @param criteria Critères.
 * @returns Les armes gardées, le décompte des armes masquées par raison et leur liste.
 */
export function filterWeapons(candidates: readonly CandidateWeapon[], criteria: FilterCriteria): FilterResult {
  const hidden = Object.fromEntries(HIDDEN_REASONS.map((r) => [r, 0])) as Record<HiddenReason, number>
  const kept: CandidateWeapon[] = []
  const hiddenItems: { candidate: CandidateWeapon; reason: HiddenReason }[] = []
  for (const c of candidates) {
    const reason = hiddenReason(c, criteria)
    if (reason === null) kept.push(c)
    else {
      hidden[reason]++
      hiddenItems.push({ candidate: c, reason })
    }
  }
  return { kept, hidden, hiddenItems }
}

/**
 * Plafond de puissance de sort à +0 de chaque catégorie de catalyseur (D18) : maximum observé dans les données chargées.
 * @param data Armes chargées.
 * @returns Le plafond par catégorie (`Staves`, `Sacred Seals`), absent si aucune valeur n'est documentée.
 */
export function catalystCaps(data: WeaponData): Readonly<Record<string, number>> {
  const caps: Record<string, number> = {}
  for (const list of Object.values(data)) {
    for (const w of list ?? []) {
      const field = CATALYST_POWER_FIELD[w.category]
      const v = field === undefined ? undefined : w[field]
      if (field !== undefined && typeof v === 'number') caps[w.category] = Math.max(caps[w.category] ?? 0, v)
    }
  }
  return caps
}

/**
 * Budget de poids d'une arme (calculs.md, « Budget de charge ») : `arrondi(charge × ratio × part, 1 décimale)`, la charge étant lue dans
 * la table Endurance → charge d'équipement.
 * @param endurance Endurance du profil.
 * @param load Charge visée.
 * @param tables Tables de calcul, ou `null` si elles ne sont pas chargées.
 * @returns Le budget ; `null` avec `load-budget-unavailable` sans table.
 */
export function loadBudget(endurance: number, load: LoadTarget, tables: CalcTables | null): Calc<number> {
  const equipLoad = tables === null ? null : attributeTableValue(tables.equipLoadByEndurance, endurance)
  if (equipLoad === null) return nullCalc('weapon-score', { code: 'load-budget-unavailable' })
  const ratio = LOAD_BUDGET.ratios[load]
  const budget = Math.round(equipLoad * ratio * LOAD_BUDGET.weaponShare * 10) / 10
  return makeCalc('weapon-score', budget, {
    components: [
      { code: 'equip-load', value: equipLoad, params: { points: endurance } },
      { code: 'load-ratio', value: ratio, params: { load } },
      { code: 'weapon-share', value: LOAD_BUDGET.weaponShare },
      { code: 'load-budget', value: budget },
    ],
    inputs: [{ file: 'tables', entry: 'equipLoadByEndurance', field: `rows[points=${endurance}].value`, value: equipLoad, reliability: 'wiki' }],
  })
}

/** Contexte du score d'une arme, fourni par le store `analysis`. */
export interface ScoreContext {
  readonly weights: BuildWeights
  readonly attrs: Attributes
  readonly hands: Hands
  readonly status: StatusKey | null
  readonly classes: readonly string[]
  readonly stonePreference: 'none' | 'normal' | 'somber'
  readonly playerStage: StageId
  /** Budget de poids (`loadBudget`), `null` si inconnu. */
  readonly budget: number | null
  /** Plafonds des catalyseurs (`catalystCaps`). */
  readonly catalystCaps: Readonly<Record<string, number>>
  /** Étape de l'arme (`entryStage`). */
  readonly stage: Calc<StageInfo>
  /** Vrai si l'arme est dans l'équipement de départ de l'origine retenue (bonus d'accessibilité) ; faux avant le choix de l'origine (§ 5.4). */
  readonly startingBonus: boolean
}

/** Score d'une arme : quatre composantes de 0 à 25 et total. */
export interface WeaponScore {
  /** Somme des quatre composantes ; `null` si l'une manque (arme « Non classé », D18). */
  readonly total: number | null
  readonly fit: number
  readonly power: number | null
  readonly access: number | null
  readonly upgrade: number
  readonly requirements: readonly RequirementCheck[]
  /** Points d'attribut manquants (écarts en points réels). */
  readonly missingPoints: number
  /** Vrai si l'arme dépasse le budget de poids ; `null` si le budget est inconnu. */
  readonly overBudget: boolean | null
  readonly stagesAhead: number | null
  readonly startingBonus: boolean
}

/** Valeur de chaque lettre de scaling (pondération du score, pas un coefficient du jeu). */
const gradeValue = (g: string | null): number => (g === null ? 0 : (FIT_WEIGHTS.grade[g as keyof typeof FIT_WEIGHTS.grade] ?? 0))

/**
 * Borne et arrondit une composante sur 0–25 (calculs.md : « Quatre composantes de 0 à 25, arrondies »).
 * @param x Valeur brute.
 * @returns La composante.
 */
function component(x: number): number {
  return Math.min(SCORE_COMPONENT_MAX, Math.max(0, Math.round(x)))
}

/**
 * Composante 1, adéquation au build (calculs.md, point 1).
 * @param w Arme.
 * @param ctx Contexte.
 * @param parts Composantes de détail, complétées en place.
 * @returns La composante sur 25.
 */
function fitComponent(w: WeaponEntry, ctx: ScoreContext, parts: ExplanationComponent[]): number {
  let ws = 0
  let acc = 0
  for (const k of WEAPON_ATTRIBUTE_KEYS) {
    const weight = ctx.weights[k] ?? 0
    if (weight === 0) continue
    ws += weight
    acc += weight * gradeValue(w.scaling[k])
  }
  const mean = ws > 0 ? acc / ws : 0
  const raw = Math.min(SCORE_COMPONENT_MAX, (SCORE_COMPONENT_MAX / FIT_WEIGHTS.meanForMax) * mean)
  let penalty = 0
  for (const k of WEAPON_ATTRIBUTE_KEYS) {
    if ((ctx.weights[k] ?? 0) !== 0) continue
    const req = w.requirements[k]
    if (req > FIT_WEIGHTS.requirementThresholdHigh) penalty += FIT_WEIGHTS.requirementPenaltyHigh
    else if (req > FIT_WEIGHTS.requirementThresholdLow) penalty += FIT_WEIGHTS.requirementPenaltyLow
  }
  const statusBonus = ctx.status !== null && (w.status_buildup?.[ctx.status] ?? 0) > 0 ? FIT_WEIGHTS.passiveStatusBonus : 0
  const classBonus = ctx.classes.length === 0 ? 0 : ctx.classes.includes(w.category) ? FIT_WEIGHTS.preferredClassBonus : -FIT_WEIGHTS.otherClassPenalty
  parts.push(
    { code: 'scaling-mean', value: Math.round(mean * 1000) / 1000 },
    { code: 'off-build-penalty', value: -penalty },
    { code: 'status-bonus', value: statusBonus, params: { status: ctx.status ?? '' } },
    { code: 'class-bonus', value: classBonus, params: { category: w.category } },
  )
  return component(raw - penalty + statusBonus + classBonus)
}

/**
 * Composante 2, puissance et scaling (calculs.md, point 2) : 70 % sur la puissance à +0 (attaque totale plafonnée à 200, ou puissance de sort
 * pour les catalyseurs, plafonnée au maximum observé), 30 % sur la somme des lettres (plafond 1,6), −4 au-delà du budget de poids.
 * @param c Candidat.
 * @param ctx Contexte.
 * @param parts Composantes de détail, complétées en place.
 * @param limits Limites, complétées en place.
 * @returns La composante sur 25, ou `null` si la puissance de sort d'un catalyseur n'est pas documentée.
 */
function powerComponent(c: CandidateWeapon, ctx: ScoreContext, parts: ExplanationComponent[], limits: ExplanationLimit[]): number | null {
  const w = c.weapon
  const field = CATALYST_POWER_FIELD[w.category]
  let base: number | null
  let cap: number | null
  if (field !== undefined) {
    const v = w[field]
    base = typeof v === 'number' ? v : null
    cap = ctx.catalystCaps[w.category] ?? null
    if (base === null || cap === null || cap <= 0) limits.push({ code: 'spell-power-missing', params: { field } })
  } else {
    const a = w.attack_power
    base = a.physical + a.magic + a.fire + a.lightning + a.holy
    cap = POWER_WEIGHTS.attackCap
  }
  const sum = WEAPON_ATTRIBUTE_KEYS.reduce((s, k) => s + gradeValue(w.scaling[k]), 0)
  const over = ctx.budget === null ? null : w.weight > ctx.budget
  parts.push(
    { code: 'base-power', value: base, max: cap ?? undefined, params: { field: field ?? 'attack_power' } },
    { code: 'scaling-sum', value: Math.round(sum * 100) / 100, max: POWER_WEIGHTS.scalingSumCap },
    { code: 'overweight-penalty', value: over === null ? null : over ? -POWER_WEIGHTS.overweightPenalty : 0, params: { weight: w.weight, budget: ctx.budget ?? '' } },
  )
  if (ctx.budget === null) limits.push({ code: 'load-budget-unavailable' })
  if (base === null || cap === null || cap <= 0) return null
  const max = SCORE_COMPONENT_MAX
  return component(
    max * POWER_WEIGHTS.baseShare * Math.min(1, base / cap) +
      max * POWER_WEIGHTS.scalingShare * Math.min(1, sum / POWER_WEIGHTS.scalingSumCap) -
      (over === true ? POWER_WEIGHTS.overweightPenalty : 0),
  )
}

/**
 * Composante 4, coût d'amélioration (calculs.md, point 4, D6) : 20 sombres, 16 normales, ±préférence, −2 si estimé ; 14 sans type ni estimation ;
 * 8 si non améliorable.
 * @param w Arme.
 * @param ctx Contexte.
 * @param parts Composantes de détail, complétées en place.
 * @param limits Limites, complétées en place.
 * @returns La composante sur 25 et l'estimation héritée.
 */
function upgradeComponent(w: WeaponEntry, ctx: ScoreContext, parts: ExplanationComponent[], limits: ExplanationLimit[]): { value: number; estimate: Estimate | null } {
  const status = upgradeStatus(w)
  const u = w.derived.upgrade
  if (status === 'not-upgradeable') {
    parts.push({ code: 'upgrade-base', value: UPGRADE_COST_WEIGHTS.notUpgradeable })
    limits.push({ code: 'not-upgradeable' })
    return { value: UPGRADE_COST_WEIGHTS.notUpgradeable, estimate: null }
  }
  const kind = u.material === 'Somber Smithing Stones' ? 'somber' : u.material === 'Smithing Stones' ? 'normal' : null
  if (status === 'undocumented' || kind === null) {
    parts.push({ code: 'upgrade-base', value: UPGRADE_COST_WEIGHTS.undocumented })
    limits.push({ code: status === 'undocumented' ? 'upgrade-type-undocumented' : 'material-unknown', params: { material: u.material ?? '' } })
    return { value: UPGRADE_COST_WEIGHTS.undocumented, estimate: null }
  }
  const base = kind === 'somber' ? UPGRADE_COST_WEIGHTS.somber : UPGRADE_COST_WEIGHTS.normal
  const pref = ctx.stonePreference === 'none' ? 0 : ctx.stonePreference === kind ? UPGRADE_COST_WEIGHTS.preferredStoneBonus : -UPGRADE_COST_WEIGHTS.otherStonePenalty
  const est = status === 'estimate' ? -UPGRADE_COST_WEIGHTS.estimatePenalty : 0
  parts.push({ code: 'upgrade-base', value: base, params: { material: kind } }, { code: 'stone-preference', value: pref }, { code: 'estimate-penalty', value: est })
  if (status === 'estimate') limits.push({ code: 'upgrade-type-estimated', params: { confidence: u.confidence ?? 'medium' } })
  if (status === 'deduced') limits.push({ code: 'upgrade-type-deduced' })
  return { value: component(base + pref + est), estimate: status === 'estimate' ? { confidence: u.confidence ?? 'medium' } : null }
}

/**
 * Score d'une arme (calculs.md, « Score de recommandation d'une arme (0–100) ») : quatre composantes de 0 à 25, arrondies puis additionnées.
 * Une arme « Non classé » n'a pas de score : accessibilité `null`, total `null` (D18). Le score hérite de l'estimation du type d'amélioration.
 * @param c Candidat.
 * @param ctx Contexte (poids, profil, étapes, budget, plafonds, bonus de départ).
 * @returns Le score et sa décomposition.
 */
export function scoreWeapon(c: CandidateWeapon, ctx: ScoreContext): Calc<WeaponScore> {
  const w = c.weapon
  const fitParts: ExplanationComponent[] = []
  const powerParts: ExplanationComponent[] = []
  const accessParts: ExplanationComponent[] = []
  const upgradeParts: ExplanationComponent[] = []
  const limits: ExplanationLimit[] = [{ code: 'score-base-values' }]

  const fit = fitComponent(w, ctx, fitParts)
  const power = powerComponent(c, ctx, powerParts, limits)

  const requirements = compareRequirements(w, ctx.attrs, ctx.hands)
  const missingPoints = requirements.reduce((s, r) => s + r.gap, 0)
  const stage = ctx.stage.value
  const remembrance = isRemembranceWeapon(c)
  const invader = w.derived.invaderDrop.length > 0
  const ahead = stage === null ? null : stagesAhead(stage.stage, ctx.playerStage)
  let access: number | null = null
  if (stage === null) limits.push({ code: 'stage-unclassified' })
  else {
    const W = ACCESS_WEIGHTS
    access = component(
      W.base -
        W.perStageAhead * (ahead ?? 0) -
        Math.min(W.missingPointsCap, W.perMissingPoint * missingPoints) -
        (remembrance ? W.remembrancePenalty : 0) -
        (invader ? W.invaderPenalty : 0) +
        (ctx.startingBonus ? W.startingEquipmentBonus : 0),
    )
  }
  accessParts.push(
    { code: 'stages-ahead', value: ahead, params: { stage: stage?.stage ?? '', player: ctx.playerStage } },
    { code: 'missing-points', value: missingPoints },
    { code: 'remembrance-penalty', value: remembrance ? -ACCESS_WEIGHTS.remembrancePenalty : 0 },
    { code: 'invader-penalty', value: invader ? -ACCESS_WEIGHTS.invaderPenalty : 0 },
    { code: 'starting-bonus', value: ctx.startingBonus ? ACCESS_WEIGHTS.startingEquipmentBonus : 0 },
  )

  const up = upgradeComponent(w, ctx, upgradeParts, limits)
  const total = power === null || access === null ? null : fit + power + access + up.value
  if (up.estimate !== null) limits.push({ code: 'input-estimated' })

  const max = SCORE_COMPONENT_MAX
  const components: ExplanationComponent[] = [
    { code: 'score-fit', value: fit, max },
    ...fitParts,
    { code: 'score-power', value: power, max },
    ...powerParts,
    { code: 'score-access', value: access, max },
    ...accessParts,
    { code: 'score-upgrade', value: up.value, max },
    ...upgradeParts,
    { code: 'score-total', value: total, max: max * 4 },
  ]
  const inputs: DataRef[] = [
    { file: c.file, entry: w.id, field: 'scaling', value: WEAPON_ATTRIBUTE_KEYS.map((k) => `${k} ${w.scaling[k] ?? '–'}`).join(', '), reliability: 'wiki' },
    { file: c.file, entry: w.id, field: 'requirements', value: WEAPON_ATTRIBUTE_KEYS.map((k) => `${k} ${w.requirements[k]}`).join(', '), reliability: 'wiki' },
    { file: c.file, entry: w.id, field: CATALYST_POWER_FIELD[w.category] ?? 'attack_power', reliability: 'wiki' },
    { file: c.file, entry: w.id, field: 'weight', value: w.weight, reliability: 'wiki' },
    { file: c.file, entry: w.id, field: 'acquisition_flags', value: w.acquisition_flags.join(', '), reliability: 'wiki' },
    {
      file: c.file,
      entry: w.id,
      field: 'derived.upgrade',
      value: w.derived.upgrade.material,
      reliability: w.derived.upgrade.reliability === 'not-upgradeable' ? 'wiki' : w.derived.upgrade.reliability,
    },
    ...ctx.stage.explanation.inputs,
  ]
  return makeCalc<WeaponScore>(
    'weapon-score',
    { total, fit, power, access, upgrade: up.value, requirements, missingPoints, overBudget: ctx.budget === null ? null : w.weight > ctx.budget, stagesAhead: ahead, startingBonus: ctx.startingBonus },
    { estimate: up.estimate, components, inputs, limits },
  )
}

/** Arme évaluée : candidat, étape, score et visibilité. */
export interface ScoredWeapon {
  readonly candidate: CandidateWeapon
  readonly stage: Calc<StageInfo>
  readonly score: Calc<WeaponScore>
  /** Raison qui masque l'arme, `null` si elle est visible. */
  readonly hidden: HiddenReason | null
}

/**
 * Ordre des recommandations : score décroissant (`null` en dernier), puis nom.
 * @param a Première arme.
 * @param b Seconde arme.
 * @returns Valeur de comparaison.
 */
export function byScore(a: ScoredWeapon, b: ScoredWeapon): number {
  const ta = a.score.value?.total ?? null
  const tb = b.score.value?.total ?? null
  if (ta !== tb) return ta === null ? 1 : tb === null ? -1 : tb - ta
  return a.candidate.weapon.name.localeCompare(b.candidate.weapon.name, 'en')
}

/** Colonne d'étape du widget A. */
export interface StageColumn {
  readonly stage: StageId
  /** Armes affichées (5 au plus), triées par score ; en DLC, groupées par sous-zone puis « DLC non localisé » en fin de colonne. */
  readonly weapons: readonly ScoredWeapon[]
  /** Armes visibles de l'étape, toutes (plein écran). */
  readonly visibleCount: number
  /** Armes de l'étape masquées par les critères, par raison. */
  readonly hidden: Readonly<Partial<Record<HiddenReason, number>>>
  readonly hiddenCount: number
}

/** Recommandations par étape. */
export interface StageRecommendations {
  readonly columns: readonly StageColumn[]
  /** Armes visibles « Non classé » : sans score, hors des colonnes, visibles en plein écran (D10, D18). */
  readonly unclassified: readonly ScoredWeapon[]
  /** Meilleure arme visible toutes étapes confondues. */
  readonly top: ScoredWeapon | null
}

/**
 * Recommandations par étape (calculs.md, « Recommandations par étape ») : les 5 meilleures armes visibles de chaque étape ; en DLC, ces 5 armes
 * sont ensuite ordonnées par sous-zone (Entrée, Cœur, Enir-Ilim, puis « DLC non localisé »), puis par score.
 * @param scored Armes évaluées.
 * @param perStage Nombre d'armes par colonne.
 * @returns Les colonnes, les armes non classées et la meilleure arme.
 */
export function recommendByStage(scored: readonly ScoredWeapon[], perStage: number = RECOMMENDATIONS.perStageMax): StageRecommendations {
  const visible = scored.filter((s) => s.hidden === null)
  const columns = STAGE_IDS.map((stage): StageColumn => {
    const all = scored.filter((s) => s.stage.value?.stage === stage)
    const shown = all.filter((s) => s.hidden === null).sort(byScore)
    let weapons = shown.slice(0, perStage)
    if (stage === 'dlc') {
      weapons = [...weapons].sort((a, b) => dlcZoneRank(a.stage.value?.dlcZone ?? null) - dlcZoneRank(b.stage.value?.dlcZone ?? null) || byScore(a, b))
    }
    const hidden: Partial<Record<HiddenReason, number>> = {}
    for (const s of all) if (s.hidden !== null) hidden[s.hidden] = (hidden[s.hidden] ?? 0) + 1
    return { stage, weapons, visibleCount: shown.length, hidden, hiddenCount: all.length - shown.length }
  })
  const unclassified = visible.filter((s) => s.stage.value === null).sort(byScore)
  const ranked = visible.filter((s) => s.score.value?.total !== null).sort(byScore)
  return { columns, unclassified, top: ranked[0] ?? null }
}

/**
 * Alternatives à une arme (calculs.md, « Recommandations par étape ») : armes visibles à une étape d'écart au plus, de la plus proche
 * en étape à la plus lointaine, puis par score ; 4 au plus.
 * @param target Arme de référence.
 * @param scored Armes évaluées.
 * @param count Nombre d'alternatives.
 * @returns Les alternatives ; vide si l'arme est « Non classé ».
 */
export function alternatives(target: ScoredWeapon, scored: readonly ScoredWeapon[], count: number = RECOMMENDATIONS.alternatives): ScoredWeapon[] {
  const stage = target.stage.value?.stage
  if (stage === undefined) return []
  const at = stageIndex(stage)
  const dist = (s: ScoredWeapon): number => Math.abs(stageIndex(s.stage.value?.stage ?? stage) - at)
  return scored
    .filter((s) => s.hidden === null && s.candidate.ref !== target.candidate.ref && s.stage.value !== null && dist(s) <= RECOMMENDATIONS.alternativesStageSpan)
    .sort((a, b) => dist(a) - dist(b) || byScore(a, b))
    .slice(0, count)
}

/** Élargissement proposé pour une colonne : critère à relâcher et nombre d'armes qu'il ferait apparaître. */
export interface WidenSuggestion {
  readonly reason: HiddenReason | 'style'
  readonly count: number
}

/**
 * Élargissements les plus efficaces pour une colonne (note de spécification du tableau de bord : Remembrance, estimations, DLC, style),
 * du plus efficace au moins efficace ; proposés quand la colonne a moins de 3 armes.
 * @param column Colonne d'étape.
 * @param otherStyleCount Armes de l'étape hors du style choisi (calculées par l'appelant sur les fichiers chargés), ou 0.
 * @param min Seuil sous lequel la colonne propose un élargissement.
 * @returns Les suggestions, vide si la colonne a assez d'armes.
 */
export function widenSuggestions(column: StageColumn, otherStyleCount = 0, min: number = RECOMMENDATIONS.perStageMin): WidenSuggestion[] {
  if (column.weapons.length >= min) return []
  const out: WidenSuggestion[] = HIDDEN_REASONS.map((reason) => ({ reason, count: column.hidden[reason] ?? 0 }))
  out.push({ reason: 'style', count: otherStyleCount })
  return out.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
}
