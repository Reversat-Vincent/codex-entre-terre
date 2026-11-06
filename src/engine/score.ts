// Score de recommandation des armes (widget A) : candidats selon le style, filtres et exclusions, score 4 × 25, budget de charge,
// recommandations par étape (3 à 5 armes), alternatives et suggestions d'élargissement.
// Méthode : docs/design/ds/calculs.md, « Score de recommandation d'une arme (0–100) » (D6, D7, D18) ; pondérations : config/weights.ts.

import type { EntityRef } from '../data/datasets.ts'
import { WEAPON_ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { StatusKey } from '../data/keys.ts'
import type { CalcTables } from '../data/types/tables.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import type { LimitCode } from './codes.ts'
import { REMEMBRANCES } from './config/remembrances.ts'
import { STAGE_IDS, stageIndex } from './config/stages.ts'
import type { StageId } from './config/stages.ts'
import { CATALYST_POWER_FIELD, MAGIC_CATALYST_ATTRIBUTE, SHIELD_CATEGORIES, SHIELD_FILE, STYLE_POOLS } from './config/weaponPools.ts'
import type { PlayStyle } from './config/weaponPools.ts'
import {
  ACCESS_WEIGHTS,
  FIT_WEIGHTS,
  LOAD_BUDGET,
  POWER_WEIGHTS,
  RECOMMENDATIONS,
  SCORE_COMPONENT_MAX,
  SCORE_FILTERS,
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
 * Catégories candidates d'un style (calculs.md, « Candidats selon le style de jeu ») : celles de `STYLE_POOLS` ; pour le style « magie »,
 * les catalyseurs dont l'attribut a un poids non nul dans le build (Staves pour l'Intelligence, Sacred Seals pour la Foi), ou tous si aucun
 * de ces attributs ne pèse (D39, S3).
 * @param mode Style de jeu.
 * @param weights Poids du build (archétype ou poids automatiques).
 * @returns Les catégories retenues, ou `null` pour toutes les catégories des fichiers du style.
 */
export function styleCategories(mode: PlayStyle, weights: BuildWeights): readonly string[] | null {
  const categories = STYLE_POOLS[mode].categories
  if (mode !== 'magic' || categories === null) return categories
  // Un poids absent veut dire « attribut hors build » (type `BuildWeights`), pas une donnée du jeu manquante : 0 = ne retient pas la catégorie.
  const weighted = categories.filter((cat) => {
    const attr = MAGIC_CATALYST_ATTRIBUTE[cat]
    return attr !== undefined && (weights[attr] ?? 0) > 0
  })
  return weighted.length > 0 ? weighted : categories
}

/**
 * Armes candidates selon le style (calculs.md, « Candidats selon le style de jeu », D7, D39) : mêlée → armes de mêlée ; distance → Light Bows,
 * Bows, Greatbows, Crossbows, Ballistas ; magie → Staves et Sacred Seals selon les poids du build (`styleCategories`) ; hybride → tout ;
 * boucliers et torches si leur catégorie est préférée.
 * @param data Armes chargées, par fichier.
 * @param style Style de jeu.
 * @param weights Poids du build ; sans poids, le style « magie » garde les deux catégories de catalyseurs.
 * @returns Les candidats, dans l'ordre des fichiers.
 */
export function candidateWeapons(data: WeaponData, style: StyleInput, weights: BuildWeights = {}): CandidateWeapon[] {
  const pool = STYLE_POOLS[style.mode]
  const categories = styleCategories(style.mode, weights)
  const out: CandidateWeapon[] = []
  for (const file of pool.files) {
    for (const weapon of data[file] ?? []) {
      if (categories === null || categories.includes(weapon.category)) out.push({ file, weapon, ref: `weapon:${weapon.id}` })
    }
  }
  for (const weapon of data[SHIELD_FILE] ?? []) {
    if (style.classes.includes(weapon.category)) out.push({ file: SHIELD_FILE, weapon, ref: `weapon:${weapon.id}` })
  }
  return out
}

/**
 * Raisons de masquage qu'un critère lève (élargissements du widget A) ; l'ordre est celui d'application des filtres, après « hors build ».
 */
export const HIDDEN_REASONS = ['content-sote', 'content-tp', 'remembrance', 'random-drop', 'quest', 'estimate'] as const

/** Raison de masquage qu'un critère lève. */
export type HiddenReason = (typeof HIDDEN_REASONS)[number]

/**
 * Toutes les raisons qui masquent une arme candidate, dans l'ordre d'application. « Hors build » (K-V1, D47) passe en premier : aucun critère
 * à relâcher ne la ferait apparaître, et les décomptes des autres raisons restent ainsi le nombre d'armes qu'un élargissement montrerait.
 */
export const MASK_REASONS = ['off-build', ...HIDDEN_REASONS] as const

/** Raison qui masque une arme candidate : celle d'un critère, ou « hors build ». */
export type MaskReason = (typeof MASK_REASONS)[number]

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
 * Build cible lu par le filtre « hors build » : les entrées de la composante 1 (poids de l'archétype, statut privilégié, classes préférées).
 * Le contexte du score (`ScoreContext`) en est un.
 */
export interface BuildFilter {
  readonly weights: BuildWeights
  readonly status: StatusKey | null
  readonly classes: readonly string[]
}

/**
 * Indique si une arme est hors du build cible (calculs.md, « Filtres appliqués avant le score », K-V1, D48) : sa composante 1 « Adéquation
 * au build », pénalités et bonus compris, avant arrondi, est strictement inférieure à `SCORE_FILTERS.minFitComponent` (5 sur 25).
 * @param w Arme.
 * @param build Build cible (poids, statut, classes), ou `null` sans build cible (poids automatiques) : rien n'est alors écarté.
 * @returns Vrai si l'arme est hors build ; faux sans build cible ou si le build ne pondère aucun attribut d'arme.
 */
export function isOffBuild(w: WeaponEntry, build: BuildFilter | null): boolean {
  if (build === null || scalingFitMean(w, build.weights) === null) return false
  return fitScore(w, build).exact < SCORE_FILTERS.minFitComponent
}

/**
 * Raison pour laquelle une arme est masquée (calculs.md, « Filtres appliqués avant le score ») : hors build (avec un build cible), contenu
 * désactivé, exclusions (Remembrance, butin aléatoire, quête, lus dans `acquisition_flags`), estimations exclues si la fiabilité l'impose.
 * @param c Candidat.
 * @param criteria Critères.
 * @param build Build cible (poids, statut, classes), ou `null` sans build cible (le filtre « hors build » ne s'applique pas).
 * @returns La première raison qui s'applique, ou `null` si l'arme reste visible.
 */
export function hiddenReason(c: CandidateWeapon, criteria: FilterCriteria, build: BuildFilter | null = null): MaskReason | null {
  const w = c.weapon
  if (isOffBuild(w, build)) return 'off-build'
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
  readonly hidden: Readonly<Record<MaskReason, number>>
  /** Armes masquées avec leur raison (affichables grisées en plein écran). */
  readonly hiddenItems: readonly { readonly candidate: CandidateWeapon; readonly reason: MaskReason }[]
}

/**
 * Applique les filtres aux candidats (calculs.md, « Filtres appliqués avant le score »).
 * @param candidates Candidats.
 * @param criteria Critères.
 * @param build Build cible (poids, statut, classes), ou `null` sans build cible (le filtre « hors build » ne s'applique pas).
 * @returns Les armes gardées, le décompte des armes masquées par raison et leur liste.
 */
export function filterWeapons(candidates: readonly CandidateWeapon[], criteria: FilterCriteria, build: BuildFilter | null = null): FilterResult {
  const hidden = Object.fromEntries(MASK_REASONS.map((r) => [r, 0])) as Record<MaskReason, number>
  const kept: CandidateWeapon[] = []
  const hiddenItems: { candidate: CandidateWeapon; reason: MaskReason }[] = []
  for (const c of candidates) {
    const reason = hiddenReason(c, criteria, build)
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
      // Premier maximum d'une catégorie : 0 est l'élément neutre du maximum (les puissances de sort sont positives), pas une donnée.
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

/**
 * Valeur de chaque lettre de scaling (pondération du score, pas un coefficient du jeu). `null` vaut 0 parce que, dans `scaling`, `null` signifie
 * « pas de scaling » et non « non documenté » : `metadata.field_notes` des trois fichiers d'armes, « Scaling grades: S > A > B > C > D > E,
 * null = no scaling » ; calculs.md, point 1 : « pas de scaling = 0 ». Ce n'est donc pas un `null` du jeu changé en 0. Une lettre hors de S à E
 * (lettre inconnue) est refusée par le schéma au chargement (`scaling` : `nullable(grade)`, data/types/weapon.ts) : le repli 0 ne sert pas
 * avec des données validées, il garde seulement la fonction totale.
 */
const gradeValue = (g: string | null): number => (g === null ? 0 : (FIT_WEIGHTS.grade[g as keyof typeof FIT_WEIGHTS.grade] ?? 0))

/**
 * Moyenne pondérée des lettres de scaling d'une arme selon les poids d'un build (calculs.md, point 1, avant pénalités et bonus).
 * @param w Arme.
 * @param weights Poids du build ; un poids absent ou nul = attribut hors build, qui n'entre pas dans la moyenne.
 * @returns La moyenne (0 si aucune lettre ne porte sur un attribut pondéré), ou `null` si le build ne pondère aucun attribut d'arme.
 */
function scalingFitMean(w: WeaponEntry, weights: BuildWeights): number | null {
  let ws = 0
  let acc = 0
  for (const k of WEAPON_ATTRIBUTE_KEYS) {
    // Poids absent = attribut hors build (type `BuildWeights`), pas une donnée du jeu manquante.
    const weight = weights[k] ?? 0
    if (weight === 0) continue
    ws += weight
    acc += weight * gradeValue(w.scaling[k])
  }
  return ws > 0 ? acc / ws : null
}

/**
 * Borne et arrondit une composante sur 0–25 (calculs.md : « Quatre composantes de 0 à 25, arrondies »).
 * @param x Valeur brute.
 * @returns La composante.
 */
function component(x: number): number {
  return Math.min(SCORE_COMPONENT_MAX, Math.max(0, Math.round(x)))
}

/**
 * Composante 1, adéquation au build (calculs.md, point 1), avec sa valeur avant arrondi (lue par le filtre « hors build », D48).
 * @param w Arme.
 * @param ctx Poids du build, statut privilégié et classes préférées.
 * @returns `exact` bornée à 0–25 avant arrondi, `value` la composante arrondie, `parts` ses composantes de détail.
 */
function fitScore(w: WeaponEntry, ctx: BuildFilter): { exact: number; value: number; parts: ExplanationComponent[] } {
  // Sans attribut d'arme pondéré, la moyenne n'a pas de sens : elle compte pour 0, l'adéquation repose alors sur les pénalités et bonus.
  const mean = scalingFitMean(w, ctx.weights) ?? 0
  const raw = Math.min(SCORE_COMPONENT_MAX, (SCORE_COMPONENT_MAX / FIT_WEIGHTS.meanForMax) * mean)
  let penalty = 0
  for (const k of WEAPON_ATTRIBUTE_KEYS) {
    // Poids absent ou nul = attribut hors build : c'est sur ces attributs que porte la pénalité de prérequis.
    if ((ctx.weights[k] ?? 0) !== 0) continue
    const req = w.requirements[k]
    if (req > FIT_WEIGHTS.requirementThresholdHigh) penalty += FIT_WEIGHTS.requirementPenaltyHigh
    else if (req > FIT_WEIGHTS.requirementThresholdLow) penalty += FIT_WEIGHTS.requirementPenaltyLow
  }
  // Bonus seulement si `status_buildup` documente le statut (calculs.md, point 1) : un statut absent n'est pas compté. Le repli 0 veut dire
  // « pas d'accumulation de ce statut dans `status_buildup` », jamais un `null` du jeu : le schéma (data/types/weapon.ts) n'admet qu'un nombre
  // ou l'absence de la clé, et data/ n'a ni `null` ni 0 dans ce champ (101 armes au 06/11/2026). La valeur n'est lue que par `> 0`, jamais
  // affichée ni additionnée. Limite connue : quelques armes ne décrivent leur accumulation que dans `passive_effects` (Spiked Club, Death's
  // Poker…), sans `status_buildup` ; elles n'ont pas le bonus.
  const statusBonus = ctx.status !== null && (w.status_buildup?.[ctx.status] ?? 0) > 0 ? FIT_WEIGHTS.passiveStatusBonus : 0
  const classBonus = ctx.classes.length === 0 ? 0 : ctx.classes.includes(w.category) ? FIT_WEIGHTS.preferredClassBonus : -FIT_WEIGHTS.otherClassPenalty
  const parts: ExplanationComponent[] = [
    { code: 'scaling-mean', value: Math.round(mean * 1000) / 1000 },
    { code: 'off-build-penalty', value: -penalty },
    { code: 'status-bonus', value: statusBonus, params: { status: ctx.status ?? '' } },
    { code: 'class-bonus', value: classBonus, params: { category: w.category } },
  ]
  const sum = raw - penalty + statusBonus + classBonus
  return { exact: Math.min(SCORE_COMPONENT_MAX, Math.max(0, sum)), value: component(sum), parts }
}

/**
 * Composante 2, puissance et scaling (calculs.md, point 2) : 70 % sur la puissance à +0 (attaque totale plafonnée à 200, ou puissance de sort
 * pour les catalyseurs, plafonnée au maximum observé), multipliée par 0,6 si plus de 5 points de prérequis manquent (K-V2, D48, [wiki] −40 %),
 * 30 % sur la somme des lettres (plafond 1,6), −4 au-delà du budget de poids.
 * @param c Candidat.
 * @param ctx Contexte.
 * @param requirements Prérequis comparés au profil (`compareRequirements`, maniement des critères).
 * @param missingPoints Total des points de prérequis manquants (somme des écarts de `requirements`).
 * @param parts Composantes de détail, complétées en place.
 * @param limits Limites, complétées en place.
 * @returns La composante sur 25, ou `null` si la puissance de sort d'un catalyseur n'est pas documentée.
 */
function powerComponent(
  c: CandidateWeapon,
  ctx: ScoreContext,
  requirements: readonly RequirementCheck[],
  missingPoints: number,
  parts: ExplanationComponent[],
  limits: ExplanationLimit[],
): number | null {
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
  // K-V2 ([wiki] Weapon Scaling ; calculs.md, puissance d'attaque, point 5). Simplification retenue par D47 : le facteur porte sur toute la
  // puissance à +0, et non sur les seuls types de dégâts qui progressent avec l'attribut manquant. Tolérance de D48 : le jeu réduit dès un
  // point manquant, le score seulement au-delà de `unmetRequirementTolerance` points au total.
  const unmet = requirements.filter((r) => !r.met).map((r) => r.attr)
  const tolerance = POWER_WEIGHTS.unmetRequirementTolerance
  const factor = unmet.length > 0 && missingPoints > tolerance ? POWER_WEIGHTS.unmetRequirementFactor : 1
  parts.push({ code: 'base-power', value: base, max: cap ?? undefined, params: { field: field ?? 'attack_power' } })
  if (unmet.length > 0) {
    // Puissance retenue après le facteur (× 1 dans la tolérance, affichée pour dire pourquoi elle n'est pas réduite) ; `null` reste `null`
    // (puissance de sort non documentée).
    const kept = base === null ? null : Math.round(base * factor * 10) / 10
    parts.push({
      code: 'unmet-requirement-factor',
      value: kept,
      max: cap ?? undefined,
      params: { factor, attrs: unmet.join(','), points: missingPoints, tolerance },
    })
  }
  parts.push(
    { code: 'scaling-sum', value: Math.round(sum * 100) / 100, max: POWER_WEIGHTS.scalingSumCap },
    { code: 'overweight-penalty', value: over === null ? null : over ? -POWER_WEIGHTS.overweightPenalty : 0, params: { weight: w.weight, budget: ctx.budget ?? '' } },
  )
  if (ctx.budget === null) limits.push({ code: 'load-budget-unavailable' })
  if (base === null || cap === null || cap <= 0) return null
  const max = SCORE_COMPONENT_MAX
  return component(
    max * POWER_WEIGHTS.baseShare * Math.min(1, (base * factor) / cap) +
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
  const powerParts: ExplanationComponent[] = []
  const accessParts: ExplanationComponent[] = []
  const upgradeParts: ExplanationComponent[] = []
  const limits: ExplanationLimit[] = [{ code: 'score-base-values' }]

  const requirements = compareRequirements(w, ctx.attrs, ctx.hands)
  const missingPoints = requirements.reduce((s, r) => s + r.gap, 0)
  const { value: fit, parts: fitParts } = fitScore(w, ctx)
  const power = powerComponent(c, ctx, requirements, missingPoints, powerParts, limits)

  const stage = ctx.stage.value
  const remembrance = isRemembranceWeapon(c)
  const invader = w.derived.invaderDrop.length > 0
  let ahead: number | null = null
  let access: number | null = null
  // D18 : une arme « Non classé » (étape `null`) n'a ni étapes d'avance ni accessibilité, donc pas de score total ; elle est triée en dernier.
  if (stage === null) limits.push({ code: 'stage-unclassified' })
  else {
    const W = ACCESS_WEIGHTS
    ahead = stagesAhead(stage.stage, ctx.playerStage)
    access = component(
      W.base -
        W.perStageAhead * ahead -
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
  readonly hidden: MaskReason | null
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
  /** Armes de l'étape masquées par les critères ou hors build, par raison. */
  readonly hidden: Readonly<Partial<Record<MaskReason, number>>>
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
    const hidden: Partial<Record<MaskReason, number>> = {}
    // Compteur : une raison pas encore rencontrée compte 0 arme.
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
 * du plus efficace au moins efficace ; proposés quand la colonne a moins de 3 armes. « Hors build » n'est jamais proposé : aucun critère ne le
 * lève sans changer de build cible (K-V1).
 * @param column Colonne d'étape.
 * @param otherStyleCount Armes de l'étape hors du style choisi (calculées par l'appelant sur les fichiers chargés), ou 0.
 * @param min Seuil sous lequel la colonne propose un élargissement.
 * @returns Les suggestions, vide si la colonne a assez d'armes.
 */
export function widenSuggestions(column: StageColumn, otherStyleCount = 0, min: number = RECOMMENDATIONS.perStageMin): WidenSuggestion[] {
  if (column.weapons.length >= min) return []
  // `hidden` ne liste que les raisons rencontrées : une raison absente masque 0 arme.
  const out: WidenSuggestion[] = HIDDEN_REASONS.map((reason) => ({ reason, count: column.hidden[reason] ?? 0 }))
  out.push({ reason: 'style', count: otherStyleCount })
  return out.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
}

/** Limite qui signale chaque raison de masquage dans le score d'une arme consultée hors du widget A (getter `scoreOf`). */
const HIDDEN_LIMIT: Readonly<Record<MaskReason, LimitCode>> = {
  'off-build': 'weapon-hidden-off-build',
  'content-sote': 'weapon-hidden-content-sote',
  'content-tp': 'weapon-hidden-content-tp',
  remembrance: 'weapon-hidden-remembrance',
  'random-drop': 'weapon-hidden-random-drop',
  quest: 'weapon-hidden-quest',
  estimate: 'weapon-hidden-estimate',
}

/**
 * Signale dans l'explication d'un score qu'une arme n'est pas recommandable avec les critères courants (calculs.md, « Score de
 * recommandation d'une arme », filtres et candidats) : masquée par un filtre ou hors build, ou hors du style choisi. Le score lui-même ne change pas ;
 * une arme « Non classé » reste sans score (D18).
 * @param score Score calculé.
 * @param hidden Raison qui masque l'arme, ou `null`.
 * @param inStyle Vrai si l'arme est candidate pour le style choisi.
 * @returns Le score inchangé s'il n'y a rien à signaler, sinon une copie dont les limites portent les raisons.
 */
export function withVisibilityLimits(score: Calc<WeaponScore>, hidden: MaskReason | null, inStyle: boolean): Calc<WeaponScore> {
  const extra: ExplanationLimit[] = []
  if (!inStyle) extra.push({ code: 'weapon-outside-style' })
  // « Hors build » cite son seuil (D48), pour que le texte ne répète pas une valeur de config/weights.ts.
  if (hidden !== null) extra.push(hidden === 'off-build' ? { code: HIDDEN_LIMIT[hidden], params: { max: SCORE_FILTERS.minFitComponent } } : { code: HIDDEN_LIMIT[hidden] })
  if (extra.length === 0) return score
  return { ...score, explanation: { ...score.explanation, limits: [...score.explanation.limits, ...extra] } }
}
