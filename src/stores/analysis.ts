// Store d'analyse : getters mémoïsés qui appellent le moteur de calcul à partir des critères et des données chargées (docs/architecture.md § 6).
// Ordre d'évaluation du cycle A ↔ B (§ 5.4) : scores sans bonus d'origine → classement des origines → origine retenue → scores définitifs.
// Aucun état propre, aucun texte d'interface : les composants affichent les valeurs et traduisent les codes.

import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { EntityRef } from '../data/datasets.ts'
import type { OriginEntry } from '../data/types/origins.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { attributeYield } from '../engine/attributeYield.ts'
import { bossLevelContext, gaugeMax, readBlessingTable, readiness, recommendedLevel } from '../engine/bossLevel.ts'
import type { BossLevel, ReadinessId } from '../engine/bossLevel.ts'
import type { StageId } from '../engine/config/stages.ts'
import { UPGRADE } from '../engine/config/upgrade.ts'
import { coverage } from '../engine/coverage.ts'
import { derivedStats } from '../engine/derivedStats.ts'
import { indexEncounters } from '../engine/encounters.ts'
import { levelOf } from '../engine/level.ts'
import { effectiveOrigin, rankOrigins, startingArmamentNames } from '../engine/origins.ts'
import type { OriginRank } from '../engine/origins.ts'
import { runesBetween } from '../engine/runes.ts'
import {
  alternatives,
  candidateWeapons,
  catalystCaps,
  filterWeapons,
  hiddenReason,
  loadBudget,
  recommendByStage,
  scoreWeapon,
  widenSuggestions,
} from '../engine/score.ts'
import type { CandidateWeapon, ScoredWeapon, StageRecommendations, WeaponData, WidenSuggestion } from '../engine/score.ts'
import { currentStage, encounterStage, entryStage } from '../engine/stage.ts'
import type { StageInfo } from '../engine/stage.ts'
import { buildWeights, targetAttributes } from '../engine/target.ts'
import { buildTimeline } from '../engine/timeline.ts'
import type { TimelineView } from '../engine/timeline.ts'
import type { Attributes, Calc, Hands, WeaponFileKey } from '../engine/types.ts'
import { upgradePlan } from '../engine/upgradePlan.ts'
import type { UpgradePlan } from '../engine/upgradePlan.ts'
import type { StatusKey } from '../data/keys.ts'
import type { Criteria, StonePreference, StyleMode } from '../persistence/model.ts'
import type { CriteriaPatch } from './criteria.ts'
import { useCriteriaStore } from './criteria.ts'
import { useDataStore } from './data.ts'

/** Puce de critère (note `spec-main` : les puces résument les critères actifs ; la croix retire un critère facultatif). */
export type CriteriaChip =
  | { readonly kind: 'content'; readonly sote: boolean; readonly tp: boolean; readonly reset: null }
  | { readonly kind: 'origin'; readonly choice: string; readonly effective: EntityRef | null; readonly reset: CriteriaPatch | null }
  | { readonly kind: 'level'; readonly level: number | null; readonly reset: null }
  | { readonly kind: 'build'; readonly archetype: string; readonly level: number; readonly reset: CriteriaPatch }
  | { readonly kind: 'style'; readonly mode: StyleMode; readonly hands: 1 | 2; readonly reset: null }
  | { readonly kind: 'classes'; readonly classes: readonly string[]; readonly reset: CriteriaPatch }
  | { readonly kind: 'status'; readonly status: StatusKey; readonly reset: CriteriaPatch }
  | { readonly kind: 'stage'; readonly stage: StageId; readonly mode: Criteria['progress']['mode']; readonly reset: null }
  | { readonly kind: 'exclusion'; readonly exclusion: 'remembrance' | 'random-drop' | 'quest'; readonly reset: CriteriaPatch }
  | { readonly kind: 'stones'; readonly preference: Exclude<StonePreference, 'none'>; readonly reset: CriteriaPatch }
  | { readonly kind: 'estimates'; readonly reset: CriteriaPatch }

/** Étapes intermédiaires du cycle A ↔ B, exposées pour le « Pourquoi ? » du widget B et pour les tests (§ 5.4). */
export interface OriginPipeline {
  /** Origine utilisée pour les scores préliminaires : l'origine choisie, ou aucune en mode « Automatique ». */
  readonly preliminaryOrigin: EntityRef | null
  /** Armes recommandées par les scores préliminaires (noms exacts), qui départagent les origines. */
  readonly recommendedWeapons: readonly string[]
  /** Origine retenue après classement. */
  readonly effectiveOrigin: EntityRef | null
  /** Vrai si les scores définitifs ont été recalculés avec l'origine retenue. */
  readonly rescored: boolean
}

/** Préparation face à une rencontre, avec l'échelle de la jauge. */
export interface BossReadiness {
  readonly level: Calc<BossLevel>
  readonly readiness: Calc<ReadinessId>
  readonly gaugeMax: number
}

/**
 * Store d'analyse.
 * Getters : `level`, `weights`, `target`, `derived`, `attributeYield`, `bossLevel(clé)`, `bossReadiness(clé)`, `timeline`, `nextBoss`,
 * `stage`, `budget`, `candidates`, `filtered`, `preliminary`, `originRanking`, `effectiveOrigin`, `pipeline`, `scored`, `recommendations`,
 * `alternativesOf(ref)`, `widen(stage)`, `coverage`, `chips`, `runesTo(niveau)`, `upgradePlanFor(ref, de, à)`, `bellBearingStages`.
 * Aucun effet : chaque getter se recalcule quand les critères ou les fichiers chargés changent.
 */
export const useAnalysisStore = defineStore('analysis', () => {
  const criteriaStore = useCriteriaStore()
  const data = useDataStore()
  const c = computed(() => criteriaStore.criteria)
  const attrs = computed((): Attributes => c.value.character.attributes)

  const tables = computed(() => data.file('tables')?.tables ?? null)
  const bosses = computed(() => data.dataset('bosses')?.entries ?? null)
  const encounters = computed(() => (bosses.value === null ? null : indexEncounters(bosses.value)))

  // Personnage et build cible.
  const level = computed(() => levelOf(attrs.value))
  const weights = computed(() => buildWeights(c.value.target.archetype, attrs.value))
  const target = computed(() => targetAttributes(c.value.target.archetype, c.value.target.level, attrs.value))
  const derived = computed(() => (tables.value === null ? null : derivedStats(attrs.value, tables.value)))
  const yieldCurves = computed(() => (tables.value === null ? null : attributeYield(attrs.value, tables.value)))

  // Niveau recommandé, frise et étape courante.
  const blessingTable = computed(() => readBlessingTable(tables.value ?? undefined))
  const bossContext = computed(() =>
    encounters.value === null || tables.value === null ? null : bossLevelContext(encounters.value, tables.value, blessingTable.value),
  )
  const bossLevel = computed(() => {
    const ctx = bossContext.value
    const cache = new Map<string, Calc<BossLevel>>()
    return (key: string): Calc<BossLevel> | null => {
      if (ctx === null) return null
      let v = cache.get(key)
      if (v === undefined) {
        v = recommendedLevel(key, ctx)
        cache.set(key, v)
      }
      return v
    }
  })
  const defeated = computed(() => new Set(c.value.progress.defeated))
  const bossReadiness = computed(() => (key: string): BossReadiness | null => {
    const rec = bossLevel.value(key)
    if (rec === null) return null
    const lvl = level.value.value ?? 1
    const recLevel = rec.value === null ? null : { ...rec, value: rec.value.level }
    return {
      level: rec,
      readiness: readiness(lvl, recLevel ?? { ...rec, value: null }, defeated.value.has(key)),
      gaugeMax: gaugeMax(lvl, rec.value?.level ?? null),
    }
  })
  const timeline = computed((): TimelineView | null =>
    encounters.value === null
      ? null
      : buildTimeline(encounters.value, c.value.progress.defeated, {
          dlcEnabled: c.value.content.sote,
          levelOf: (key) => bossLevel.value(key)?.value?.level ?? null,
        }),
  )
  const nextBoss = computed(() => timeline.value?.next ?? null)
  const stage = computed((): Calc<StageId> => {
    const t = timeline.value
    const next = t?.next ?? null
    const nextStage = next === null || encounters.value === null ? null : (encounterStage(encounters.value, next.node.levelKey).value?.stage ?? null)
    return currentStage(
      c.value.progress,
      t === null ? null : { nextStage, nextNode: next?.node.id ?? null, complete: t.complete, dlcEnabled: c.value.content.sote },
    )
  })

  // Widget A : candidats, filtres, budget.
  const weaponData = computed((): WeaponData => {
    const out: Partial<Record<WeaponFileKey, readonly WeaponEntry[]>> = {}
    for (const k of ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const) {
      const ds = data.dataset(k)
      if (ds !== null) out[k] = ds.entries
    }
    return out
  })
  const candidates = computed(() => candidateWeapons(weaponData.value, c.value.style))
  const filtered = computed(() => filterWeapons(candidates.value, c.value))
  const caps = computed(() => catalystCaps(weaponData.value))
  const budget = computed(() => loadBudget(attrs.value.end, c.value.style.load, tables.value))

  // Origines (contenu activé : les origines du Tarnished Pack seulement si ce contenu est coché).
  const origins = computed((): readonly OriginEntry[] =>
    (data.dataset('origins')?.entries ?? []).filter((o) => o.source !== 'Tarnished Pack' || c.value.content.tp),
  )
  const originById = (ref: EntityRef | null): OriginEntry | null =>
    ref === null ? null : (data.dataset('origins')?.entries.find((o) => `origin:${o.id}` === ref) ?? null)
  const chosenOrigin = computed((): EntityRef | null => (c.value.character.origin === 'auto' ? null : `origin:${c.value.character.origin}`))

  /**
   * Évalue tous les candidats pour une origine retenue (bonus d'équipement de départ, étape des armes de départ).
   * @param origin Origine retenue, ou `null` (scores sans bonus d'origine).
   * @returns Les armes évaluées.
   */
  function scoreAll(origin: EntityRef | null): ScoredWeapon[] {
    const o = originById(origin)
    const starting = o === null ? null : new Set(startingArmamentNames(o))
    const hands: Hands = c.value.style.hands === 2 ? 'two' : 'one'
    const playerStage = stage.value.value ?? 'early'
    return candidates.value.map((candidate: CandidateWeapon): ScoredWeapon => {
      const st: Calc<StageInfo> = entryStage(candidate.weapon, {
        ref: candidate.ref,
        file: candidate.file,
        encounters: encounters.value,
        startingArmaments: starting,
      })
      const score = scoreWeapon(candidate, {
        weights: weights.value.weights,
        attrs: attrs.value,
        hands,
        status: c.value.style.status,
        classes: c.value.style.classes,
        stonePreference: c.value.constraints.stonePreference,
        playerStage,
        budget: budget.value.value,
        catalystCaps: caps.value,
        stage: st,
        startingBonus: starting?.has(candidate.weapon.name) ?? false,
      })
      return { candidate, stage: st, score, hidden: hiddenReason(candidate, c.value) }
    })
  }

  // § 5.4, étape 1 : scores sans bonus d'origine (ou avec l'origine choisie, qui ne dépend pas du classement).
  const preliminary = computed(() => scoreAll(chosenOrigin.value))
  const preliminaryRecommended = computed(() => [
    ...new Set(recommendByStage(preliminary.value).columns.flatMap((col) => col.weapons.map((w) => w.candidate.weapon.name))),
  ])
  // § 5.4, étape 2 : classement des origines, départagé par les armes recommandées.
  const originRanking = computed((): Calc<OriginRank>[] =>
    target.value.value === null
      ? []
      : rankOrigins(origins.value, target.value, { weights: weights.value.weights, recommendedWeapons: new Set(preliminaryRecommended.value) }),
  )
  // § 5.4, étape 3 : origine retenue.
  const effective = computed(() => effectiveOrigin(chosenOrigin.value ?? 'auto', originRanking.value))
  // § 5.4, étape 4 : scores définitifs, recalculés seulement si l'origine retenue diffère de celle des scores préliminaires.
  const rescored = computed(() => effective.value !== chosenOrigin.value)
  const scored = computed(() => (rescored.value ? scoreAll(effective.value) : preliminary.value))
  const pipeline = computed(
    (): OriginPipeline => ({
      preliminaryOrigin: chosenOrigin.value,
      recommendedWeapons: preliminaryRecommended.value,
      effectiveOrigin: effective.value,
      rescored: rescored.value,
    }),
  )
  const recommendations = computed((): StageRecommendations => recommendByStage(scored.value))
  const alternativesOf = computed(() => (ref: EntityRef): ScoredWeapon[] => {
    const t = scored.value.find((s) => s.candidate.ref === ref)
    return t === undefined ? [] : alternatives(t, scored.value)
  })
  /** Armes de l'étape hors du style choisi, parmi les fichiers chargés (suggestion « style »). */
  const otherStyleByStage = computed(() => {
    const inStyle = new Set(candidates.value.map((x) => x.ref))
    const others = candidateWeapons(weaponData.value, { mode: 'hybrid', classes: [] }).filter((x) => !inStyle.has(x.ref) && filterWeapons([x], c.value).kept.length > 0)
    const counts = new Map<StageId, number>()
    for (const o of others) {
      const s = entryStage(o.weapon, { ref: o.ref, file: o.file, encounters: encounters.value, startingArmaments: null }).value?.stage
      if (s !== undefined) counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    return counts
  })
  const widen = computed(() => (stageId: StageId): WidenSuggestion[] => {
    const column = recommendations.value.columns.find((col) => col.stage === stageId)
    return column === undefined ? [] : widenSuggestions(column, otherStyleByStage.value.get(stageId) ?? 0)
  })

  // Couverture, runes, plan d'amélioration.
  const coverageRows = computed(() => coverage({ weapons: weaponData.value, bosses: bosses.value }))
  const runesTo = computed(() => (to: number) => {
    const from = level.value.value
    return tables.value === null || from === null ? null : runesBetween(from, to, tables.value)
  })
  const upgradePlanFor = computed(() => (ref: EntityRef, from: number, to: number): Calc<UpgradePlan> | null => {
    for (const file of ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const) {
      const w = weaponData.value[file]?.find((x) => `weapon:${x.id}` === ref)
      if (w !== undefined) return upgradePlan(w, from, to, { file })
    }
    return null
  })
  const bellBearingStages = computed((): ReadonlyMap<EntityRef, Calc<StageInfo>> => {
    const items = data.dataset('key_items')?.entries ?? []
    const out = new Map<EntityRef, Calc<StageInfo>>()
    for (const b of UPGRADE.bellBearings) {
      const entry = items.find((i) => `item:${i.id}` === b.item)
      if (entry !== undefined) out.set(b.item, entryStage(entry, { ref: b.item, file: 'key_items', encounters: encounters.value, startingArmaments: null }))
    }
    return out
  })

  // Puces de critères : données structurées, texte fait par l'interface.
  const chips = computed((): CriteriaChip[] => {
    const k = c.value
    const out: CriteriaChip[] = [
      { kind: 'content', sote: k.content.sote, tp: k.content.tp, reset: null },
      { kind: 'origin', choice: k.character.origin, effective: effective.value, reset: k.character.origin === 'auto' ? null : { character: { origin: 'auto' } } },
      { kind: 'level', level: level.value.value, reset: null },
    ]
    if (k.target.archetype !== null) out.push({ kind: 'build', archetype: k.target.archetype, level: k.target.level, reset: { target: { archetype: null } } })
    out.push({ kind: 'style', mode: k.style.mode, hands: k.style.hands, reset: null })
    if (k.style.classes.length > 0) out.push({ kind: 'classes', classes: k.style.classes, reset: { style: { classes: [] } } })
    if (k.style.status !== null) out.push({ kind: 'status', status: k.style.status, reset: { style: { status: null } } })
    out.push({ kind: 'stage', stage: stage.value.value ?? k.progress.stage, mode: k.progress.mode, reset: null })
    if (k.constraints.excludeRemembrance) out.push({ kind: 'exclusion', exclusion: 'remembrance', reset: { constraints: { excludeRemembrance: false } } })
    if (k.constraints.excludeRandomDrop) out.push({ kind: 'exclusion', exclusion: 'random-drop', reset: { constraints: { excludeRandomDrop: false } } })
    if (k.constraints.excludeQuest) out.push({ kind: 'exclusion', exclusion: 'quest', reset: { constraints: { excludeQuest: false } } })
    if (k.constraints.stonePreference !== 'none') out.push({ kind: 'stones', preference: k.constraints.stonePreference, reset: { constraints: { stonePreference: 'none' } } })
    if (!k.reliability.includeEstimates) out.push({ kind: 'estimates', reset: { reliability: { includeEstimates: true } } })
    return out
  })

  return {
    level,
    weights,
    target,
    derived,
    attributeYield: yieldCurves,
    blessingTable,
    bossLevel,
    bossReadiness,
    timeline,
    nextBoss,
    stage,
    budget,
    candidates,
    filtered,
    origins,
    preliminary,
    originRanking,
    effectiveOrigin: effective,
    pipeline,
    scored,
    recommendations,
    alternativesOf,
    widen,
    coverage: coverageRows,
    chips,
    runesTo,
    upgradePlanFor,
    bellBearingStages,
  }
})
