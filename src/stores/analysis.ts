// Store d'analyse : getters mémoïsés qui appellent le moteur de calcul à partir des critères et des données chargées (docs/architecture.md § 6).
// Ordre d'évaluation du cycle A ↔ B (§ 5.4) : scores sans bonus d'origine → classement des origines → origine retenue → scores définitifs.
// Aucun état propre, aucun texte d'interface : les composants affichent les valeurs et traduisent les codes.

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { DATASETS } from '../data/datasets.ts'
import type { DatasetKey, EntityRef } from '../data/datasets.ts'
import type { EncounterKey } from '../data/types/bosses.ts'
import type { OriginEntry } from '../data/types/origins.ts'
import type { SpellEntry } from '../data/types/spells.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { attackPower } from '../engine/attackPower.ts'
import type { AttackPowerResult } from '../engine/attackPower.ts'
import { attributeYield } from '../engine/attributeYield.ts'
import { bossLevelContext, gaugeMax, readBlessingTable, readiness, recommendedLevel } from '../engine/bossLevel.ts'
import type { BossLevel, ReadinessId } from '../engine/bossLevel.ts'
import type { StageId } from '../engine/config/stages.ts'
import { UPGRADE } from '../engine/config/upgrade.ts'
import { coverage } from '../engine/coverage.ts'
import { derivedStats } from '../engine/derivedStats.ts'
import type { DerivedStats, DerivedStatsInput } from '../engine/derivedStats.ts'
import { indexEncounters } from '../engine/encounters.ts'
import type { EncounterIndex } from '../engine/encounters.ts'
import { levelOf } from '../engine/level.ts'
import { bestWeaponOfStage, levelUpPriorities } from '../engine/levelUp.ts'
import type { LevelUpPriority } from '../engine/levelUp.ts'
import { effectiveOrigin, rankOrigins, startingArmamentNames } from '../engine/origins.ts'
import type { OriginRank } from '../engine/origins.ts'
import { checkRequirements, checkSpellRequirements } from '../engine/requirements.ts'
import type { RequirementsResult } from '../engine/requirements.ts'
import { runeCostsBetween, runesBetween } from '../engine/runes.ts'
import type { LevelRuneCost } from '../engine/runes.ts'
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
  withVisibilityLimits,
} from '../engine/score.ts'
import type { CandidateWeapon, ScoredWeapon, StageRecommendations, WeaponData, WeaponScore, WidenSuggestion } from '../engine/score.ts'
import { currentStage, encounterStage, entryStage } from '../engine/stage.ts'
import type { StageEntry, StageInfo } from '../engine/stage.ts'
import { buildWeights, targetAttributes } from '../engine/target.ts'
import { buildTimeline } from '../engine/timeline.ts'
import type { TimelineView } from '../engine/timeline.ts'
import type { Attributes, Calc, Hands, WeaponFileKey } from '../engine/types.ts'
import { upgradePlan } from '../engine/upgradePlan.ts'
import type { UpgradePlan } from '../engine/upgradePlan.ts'
import { allWeaknessRows, timelineWeaknessRows, weaponsAgainst } from '../engine/weakness.ts'
import type { WeaknessRows, WeaknessWeapon } from '../engine/weakness.ts'
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

/** Jeux de données dont les entrées ont des acquisitions, donc une étape (calculs.md, « Étape de progression d'une arme »). */
const ACQUISITION_DATASETS = [
  'melee_armaments',
  'ranged_weapons_catalysts',
  'shields_torches',
  'ashes_of_war',
  'armor',
  'talismans',
  'spells',
  'spirit_ashes',
  'tools',
  'upgrade_materials',
  'key_items',
  'crafting_materials',
  'ammunition',
] as const satisfies readonly DatasetKey[]

/** Puissance d'attaque et prérequis d'une arme pour le profil courant (fiche arme). */
export interface WeaponCalcs {
  /** Puissance d'attaque estimée (calculs.md, « Puissance d'attaque calculée (Estimation) »), ou la raison pour laquelle elle ne l'est pas. */
  readonly attack: AttackPowerResult
  /** Prérequis comparés au profil (calculs.md, « Prérequis comparés au profil »), avec leur explication. */
  readonly requirements: Calc<RequirementsResult>
}

/** Portée des lignes de la matrice des faiblesses : boss de la frise (tableau de bord) ou toutes les rencontres (plein écran). */
export type WeaknessScope = 'timeline' | 'all'

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
 * `alternativesOf(ref)`, `widen(stage)`, `weaponsAgainst(clé de rencontre)`, `coverage`, `chips`, `runesTo(niveau)`, `upgradePlanFor(ref, de, à)`,
 * `bellBearingStages`, `encounters`, `derivedOf(attributs)`, `weaponCalcs(ref, niveau, affinité, maniement)`, `scoreOf(ref)`, `requirementsOf(ref)`,
 * `levelUpPriorities`, `runeCostsBetween(de, à)`, `weaknessRows(portée)`, `stageOf(ref)`, `stageOfEncounter(clé de rencontre)`.
 * Les getters à paramètres sont des fonctions mémoïsées : le cache se vide quand les critères ou les fichiers chargés changent.
 * Aucun effet : chaque getter se recalcule quand les critères ou les fichiers chargés changent.
 */
export const useAnalysisStore = defineStore('analysis', () => {
  const criteriaStore = useCriteriaStore()
  const data = useDataStore()
  const c = computed(() => criteriaStore.criteria)
  const attrs = computed((): Attributes => c.value.character.attributes)

  const tables = computed(() => data.file('tables')?.tables ?? null)
  const bosses = computed(() => data.dataset('bosses')?.entries ?? null)
  const encounters = computed((): EncounterIndex | null => (bosses.value === null ? null : indexEncounters(bosses.value)))

  // Personnage et build cible.
  const level = computed(() => levelOf(attrs.value))
  const weights = computed(() => buildWeights(c.value.target.archetype, attrs.value))
  const target = computed(() => targetAttributes(c.value.target.archetype, c.value.target.level, attrs.value))
  const derived = computed(() => (tables.value === null ? null : derivedStats(attrs.value, tables.value)))
  const yieldCurves = computed(() => (tables.value === null ? null : attributeYield(attrs.value, tables.value)))
  /**
   * Statistiques dérivées d'un jeu d'attributs quelconque (origine affichée par le widget B ; calculs.md, « Statistiques dérivées »).
   * `null` tant que le fichier `tables` n'est pas chargé.
   */
  const derivedOf = computed(() => (attributes: DerivedStatsInput): Calc<DerivedStats> | null =>
    tables.value === null ? null : derivedStats(attributes, tables.value),
  )

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
  // Les poids du build restreignent les catalyseurs du style « magie » (D39, S3).
  const candidates = computed(() => candidateWeapons(weaponData.value, c.value.style, weights.value.weights))
  const filtered = computed(() => filterWeapons(candidates.value, c.value))
  const caps = computed(() => catalystCaps(weaponData.value))
  const criteriaHands = computed((): Hands => (c.value.style.hands === 2 ? 'two' : 'one'))
  /** Toutes les armes chargées par référence, quel que soit le style (fiches, catalogues, `scoreOf`). */
  const weaponByRef = computed((): ReadonlyMap<EntityRef, CandidateWeapon> => {
    const out = new Map<EntityRef, CandidateWeapon>()
    for (const file of ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const) {
      for (const weapon of weaponData.value[file] ?? []) out.set(`weapon:${weapon.id}`, { file, weapon, ref: `weapon:${weapon.id}` })
    }
    return out
  })
  const budget = computed(() => loadBudget(attrs.value.end, c.value.style.load, tables.value))

  // Origines (contenu activé : les origines du Tarnished Pack seulement si ce contenu est coché).
  const origins = computed((): readonly OriginEntry[] =>
    (data.dataset('origins')?.entries ?? []).filter((o) => o.source !== 'Tarnished Pack' || c.value.content.tp),
  )
  const originById = (ref: EntityRef | null): OriginEntry | null =>
    ref === null ? null : (data.dataset('origins')?.entries.find((o) => `origin:${o.id}` === ref) ?? null)
  const chosenOrigin = computed((): EntityRef | null => (c.value.character.origin === 'auto' ? null : `origin:${c.value.character.origin}`))

  /**
   * Noms des armes de départ d'une origine retenue.
   * @param origin Origine retenue, ou `null`.
   * @returns Les noms, ou `null` sans origine.
   */
  function startingOf(origin: EntityRef | null): ReadonlySet<string> | null {
    const o = originById(origin)
    return o === null ? null : new Set(startingArmamentNames(o))
  }

  /**
   * Évalue une arme pour les critères courants (étape, puis score ; calculs.md, « Score de recommandation d'une arme (0–100) »).
   * @param candidate Arme et son fichier.
   * @param starting Armes de départ de l'origine retenue (bonus d'accessibilité, étape des armes de départ), ou `null`.
   * @returns L'arme évaluée, avec la raison qui la masque.
   */
  function scoreOne(candidate: CandidateWeapon, starting: ReadonlySet<string> | null): ScoredWeapon {
    const st: Calc<StageInfo> = entryStage(candidate.weapon, {
      ref: candidate.ref,
      file: candidate.file,
      encounters: encounters.value,
      startingArmaments: starting,
    })
    const score = scoreWeapon(candidate, {
      weights: weights.value.weights,
      attrs: attrs.value,
      hands: criteriaHands.value,
      status: c.value.style.status,
      classes: c.value.style.classes,
      stonePreference: c.value.constraints.stonePreference,
      playerStage: stage.value.value ?? 'early',
      budget: budget.value.value,
      catalystCaps: caps.value,
      stage: st,
      startingBonus: starting?.has(candidate.weapon.name) ?? false,
    })
    return { candidate, stage: st, score, hidden: hiddenReason(candidate, c.value) }
  }

  /**
   * Évalue tous les candidats pour une origine retenue (bonus d'équipement de départ, étape des armes de départ).
   * @param origin Origine retenue, ou `null` (scores sans bonus d'origine).
   * @returns Les armes évaluées.
   */
  function scoreAll(origin: EntityRef | null): ScoredWeapon[] {
    const starting = startingOf(origin)
    return candidates.value.map((candidate) => scoreOne(candidate, starting))
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
      // Compteur par étape : une étape pas encore vue en est à 0 arme (dénombrement, pas une donnée du jeu).
      if (s !== undefined) counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    return counts
  })
  const widen = computed(() => (stageId: StageId): WidenSuggestion[] => {
    const column = recommendations.value.columns.find((col) => col.stage === stageId)
    // `otherStyleByStage` ne compte que les étapes qui ont au moins une arme hors style : une étape absente en a 0.
    return column === undefined ? [] : widenSuggestions(column, otherStyleByStage.value.get(stageId) ?? 0)
  })
  /**
   * Armes candidates efficaces contre une rencontre (fiche boss ; calculs.md, « Armes efficaces contre une rencontre ») : scores définitifs
   * des critères courants, filtrés par les types les moins absorbés de la rencontre, avec leurs prérequis comparés au profil.
   * `null` tant que `bosses` ou aucun fichier d'armes n'est chargé ; liste vide avec une limite si l'absorption n'est pas documentée (Mohg).
   */
  const weaponsAgainstOf = computed(() => (encounterKey: string): Calc<WeaknessWeapon[]> | null => {
    if (encounters.value === null || Object.keys(weaponData.value).length === 0) return null
    return weaponsAgainst(encounters.value.byKey.get(encounterKey), scored.value)
  })

  /**
   * Étape de partie d'une rencontre de boss, celle de la frise et de « Dans l'histoire » (calculs.md, « Remembrances » : règle 2 de l'étape
   * appliquée aux régions de la rencontre), avec son explication. `null` si `bosses` n'est pas chargé ou si la clé est inconnue ; pour une
   * rencontre dont les régions ne sont pas classées, le `Calc` est rendu avec une valeur `null` et la limite `stage-unclassified`.
   */
  const stageOfEncounter = computed(() => (encounterKey: EncounterKey): Calc<StageInfo> | null => {
    if (encounters.value === null || !encounters.value.byKey.has(encounterKey)) return null
    return encounterStage(encounters.value, encounterKey)
  })

  /**
   * Score d'une arme pour les critères courants, même hors du style choisi ou masquée par un filtre (fiche arme, comparateur ; calculs.md,
   * « Score de recommandation d'une arme (0–100) »). Une arme candidate reprend son score définitif ; une autre est évaluée avec l'origine
   * retenue. Les exclusions et le style sont signalés par des limites (`weapon-hidden-*`, `weapon-outside-style`) ; une arme « Non classé »
   * reste sans total (D18). `null` si l'arme n'est pas dans un fichier chargé.
   */
  const scoreOf = computed(() => {
    const scoredByRef = new Map(scored.value.map((s) => [s.candidate.ref, s]))
    const starting = startingOf(effective.value)
    // Lus ici, et non dans la fonction rendue, pour que le cache se vide à chaque changement de ce qu'utilise `scoreOne` : `scored` ne les lit
    // pas tous quand aucune arme du style n'est chargée, et un fichier d'armes hors du style peut se charger après coup.
    const all = weaponByRef.value
    void [c.value, weights.value, stage.value, budget.value, caps.value, encounters.value]
    const cache = new Map<EntityRef, Calc<WeaponScore>>()
    return (ref: EntityRef): Calc<WeaponScore> | null => {
      const hit = cache.get(ref)
      if (hit !== undefined) return hit
      const inStyle = scoredByRef.get(ref)
      const candidate = inStyle?.candidate ?? all.get(ref)
      if (candidate === undefined) return null
      const s = inStyle ?? scoreOne(candidate, starting)
      const out = withVisibilityLimits(s.score, s.hidden, inStyle !== undefined)
      cache.set(ref, out)
      return out
    }
  })

  /** Entrées à acquisitions chargées, par référence, avec leur fichier. */
  const acquisitionByRef = computed((): ReadonlyMap<EntityRef, { readonly file: DatasetKey; readonly entry: StageEntry }> => {
    const out = new Map<EntityRef, { file: DatasetKey; entry: StageEntry }>()
    for (const file of ACQUISITION_DATASETS) {
      const kind = DATASETS[file].kind
      for (const entry of data.dataset(file)?.entries ?? []) out.set(`${kind}:${entry.id}`, { file, entry })
    }
    return out
  })

  /**
   * Étape de toute entité qui a des acquisitions (arme, armure, talisman, sort, cendre de guerre, cendre d'esprit, objet), sous-zone DLC
   * comprise, indépendamment du style choisi et des filtres (Ma liste, comparateur ; calculs.md, « Étape de progression d'une arme »).
   * Mêmes règles et même contexte que le widget A : index des rencontres, armes de départ de l'origine retenue. `null` pour une autre
   * entité ou si son fichier n'est pas chargé ; valeur `null` (« Non classé ») avec sa limite si aucune règle ne donne d'étape.
   */
  const stageOf = computed(() => {
    const entries = acquisitionByRef.value
    const index = encounters.value
    const starting = startingOf(effective.value)
    const cache = new Map<EntityRef, Calc<StageInfo>>()
    return (ref: EntityRef): Calc<StageInfo> | null => {
      const hit = cache.get(ref)
      if (hit !== undefined) return hit
      const found = entries.get(ref)
      if (found === undefined) return null
      const out = entryStage(found.entry, { ref, file: found.file, encounters: index, startingArmaments: starting })
      cache.set(ref, out)
      return out
    }
  })

  /**
   * Puissance d'attaque estimée et prérequis d'une arme pour les attributs du profil (fiche arme ; calculs.md, « Puissance d'attaque calculée
   * (Estimation) » et « Prérequis comparés au profil »). Le maniement est celui que la fiche transmet au moteur (posture imposée comprise) ;
   * le moteur applique lui-même les exceptions de `twoHanded.ts`. `null` si l'arme n'est pas dans un fichier chargé.
   */
  const weaponCalcs = computed(() => {
    const profile = attrs.value
    const byRef = weaponByRef.value
    const cache = new Map<string, WeaponCalcs>()
    return (ref: EntityRef, level: number, affinity: string, hands: Hands): WeaponCalcs | null => {
      const key = `${ref}|${level}|${affinity}|${hands}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      const candidate = byRef.get(ref)
      if (candidate === undefined) return null
      const ctx = { file: candidate.file }
      const out: WeaponCalcs = {
        attack: attackPower(candidate.weapon, affinity, level, profile, hands, ctx),
        requirements: checkRequirements(candidate.weapon, profile, hands, ctx),
      }
      cache.set(key, out)
      return out
    }
  })

  /** Sorts chargés par référence. */
  const spellByRef = computed((): ReadonlyMap<EntityRef, SpellEntry> => new Map((data.dataset('spells')?.entries ?? []).map((s) => [`spell:${s.id}`, s])))

  /**
   * Prérequis d'une arme ou d'un sort comparés au profil (catalogues, comparateur ; calculs.md, « Prérequis comparés au profil ») : une arme
   * avec le maniement des critères (Force effective à deux mains selon `twoHanded.ts`), un sort sans posture. `null` pour une autre entité
   * ou si son fichier n'est pas chargé.
   */
  const requirementsOf = computed(() => {
    const profile = attrs.value
    const hands = criteriaHands.value
    const weapons = weaponByRef.value
    const spells = spellByRef.value
    const cache = new Map<EntityRef, Calc<RequirementsResult>>()
    return (ref: EntityRef): Calc<RequirementsResult> | null => {
      const hit = cache.get(ref)
      if (hit !== undefined) return hit
      const weapon = weapons.get(ref)
      const spell = weapon === undefined ? spells.get(ref) : undefined
      const out =
        weapon !== undefined
          ? checkRequirements(weapon.weapon, profile, hands, { file: weapon.file })
          : spell !== undefined
            ? checkSpellRequirements(spell, profile)
            : null
      if (out !== null) cache.set(ref, out)
      return out
    }
  })

  // Priorités de montée de niveau (widget B, D42) : meilleure arme de l'étape courante, palier de Vigor, écart pondéré au build cible.
  const levelUp = computed(
    (): Calc<LevelUpPriority[]> =>
      levelUpPriorities({
        attrs: attrs.value,
        weapon: bestWeaponOfStage(recommendations.value, stage.value.value),
        target: target.value,
        weights: weights.value.weights,
      }),
  )

  /**
   * Lignes de la matrice des faiblesses (widget D1) : `timeline` pour les boss de la frise documentés (tableau de bord, `null` tant que la
   * frise n'est pas construite), `all` pour toutes les rencontres documentées du contenu activé (plein écran, `null` sans `bosses`).
   * Les lignes n'ont pas d'adresse : l'interface la construit avec `bossId` et `encounterId`.
   */
  const weaknessTimeline = computed((): WeaknessRows | null =>
    timeline.value === null || encounters.value === null ? null : timelineWeaknessRows(timeline.value, encounters.value),
  )
  const weaknessAll = computed((): WeaknessRows | null =>
    bosses.value === null ? null : allWeaknessRows(bosses.value, defeated.value, c.value.content),
  )
  const weaknessRows = computed(() => (scope: WeaknessScope): WeaknessRows | null => (scope === 'timeline' ? weaknessTimeline.value : weaknessAll.value))

  // Couverture, runes, plan d'amélioration.
  const coverageRows = computed(() => coverage({ weapons: weaponData.value, bosses: bosses.value }))
  const runesTo = computed(() => (to: number) => {
    const from = level.value.value
    return tables.value === null || from === null ? null : runesBetween(from, to, tables.value)
  })
  /**
   * Coût de chaque niveau de `from` à `to − 1`, lu dans la table officielle (calculateur de runes ; calculs.md, « Coût en runes d'un niveau »).
   * `null` tant que le fichier `tables` n'est pas chargé ; plage invalide ou hors table : valeur `null` avec sa limite.
   */
  const runeCostsBetweenOf = computed(() => (from: number, to: number): Calc<LevelRuneCost[]> | null =>
    tables.value === null ? null : runeCostsBetween(from, to, tables.value),
  )
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
    weaponsAgainst: weaponsAgainstOf,
    stageOfEncounter,
    coverage: coverageRows,
    chips,
    runesTo,
    upgradePlanFor,
    bellBearingStages,
    encounters,
    derivedOf,
    weaponCalcs,
    scoreOf,
    requirementsOf,
    levelUpPriorities: levelUp,
    runeCostsBetween: runeCostsBetweenOf,
    weaknessRows,
    stageOf,
  }
})
