// Composable de la fiche d'arme : état local (maniement, niveau affiché, affinité du calcul, affinités du graphique) et lecture, dans le store
// d'analyse, de la puissance d'attaque, des prérequis et du score pour les attributs du profil actif. Aucune formule ici : le store appelle le moteur.

import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { EntityRef } from '../../../data/datasets.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import type { AttackPowerResult } from '../../../engine/attackPower.ts'
import type { RequirementsResult, TwoHandMode } from '../../../engine/requirements.ts'
import type { WeaponScore } from '../../../engine/score.ts'
import type { Attributes, Calc, Hands } from '../../../engine/types.ts'
import type { UpgradePlan } from '../../../engine/upgradePlan.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import { useCriteriaStore } from '../../../stores/criteria.ts'
import { useProfilesStore } from '../../../stores/profiles.ts'
import { defaultSlots, describeUpgradeTables, sliderMax, toggleSlot } from './weaponModel.ts'
import type { UpgradeTables } from './weaponModel.ts'

/** État et valeurs calculées de la fiche d'une arme. */
export interface WeaponSheetState {
  readonly ref: EntityRef
  readonly attrs: ComputedRef<Attributes>
  /** Description des tableaux d'amélioration. */
  readonly tables: ComputedRef<UpgradeTables>
  /** Maniement du calcul (une ou deux mains) ; modifiable. */
  readonly hands: Ref<Hands>
  /** Maniement à deux mains de l'arme (bascule libre, sans posture, ou toujours à deux mains). */
  readonly twoHandMode: ComputedRef<TwoHandMode>
  /** Maniement effectivement transmis au moteur (la posture imposée prime sur le choix). */
  readonly engineHands: ComputedRef<Hands>
  /** Force effective affichée à côté du profil quand le bonus de deux mains s'applique, sinon `null`. */
  readonly effectiveStrength: ComputedRef<number | null>
  /** Niveau affiché, de 0 au niveau maximal du curseur. */
  readonly level: Ref<number>
  readonly levelMax: ComputedRef<number>
  /** Affinités du calcul (choix quand plusieurs tableaux existent). */
  readonly affinity: Ref<string>
  /** Affinités affichées au graphique (4 emplacements ; la couleur suit l'emplacement). */
  readonly slots: Ref<(string | null)[]>
  toggleAffinity(name: string): void
  /** Puissance d'attaque, ou la raison pour laquelle elle n'est pas calculable (`unavailable`) ; `null` tant que l'arme n'est pas chargée. */
  readonly attack: ComputedRef<AttackPowerResult | null>
  /** Prérequis comparés au profil ; `null` tant que l'arme n'est pas chargée. */
  readonly requirements: ComputedRef<Calc<RequirementsResult> | null>
  /** Plan d'amélioration jusqu'au niveau maximal (« Coût jusqu'au maximum »), `null` si le plan n'est pas disponible. */
  readonly plan: ComputedRef<Calc<UpgradePlan> | null>
  /** Score de l'arme pour les critères courants, même hors du style choisi ou masquée (les raisons sont en limites) ; `null` tant que l'arme n'est pas chargée. */
  readonly score: ComputedRef<Calc<WeaponScore> | null>
  /** Phrase décrivant le profil actif (« Dex / Saignement, Samurai, niveau 42, étape Milieu »), sans les parties inconnues. */
  readonly profileName: ComputedRef<string | null>
}

/**
 * Prépare l'état de la fiche d'une arme.
 * Le niveau reste à 0 sans tableau d'amélioration (calcul limité à +0). L'affinité du calcul est Standard si elle est documentée, sinon la première.
 * @param weapon Arme affichée.
 * @returns Les états et valeurs calculées, réactifs aux critères.
 */
export function useWeaponSheet(weapon: WeaponEntry): WeaponSheetState {
  const criteria = useCriteriaStore()
  const analysis = useAnalysisStore()
  const profiles = useProfilesStore()
  const entityRef: EntityRef = `weapon:${weapon.id}`

  const attrs = computed(() => criteria.criteria.character.attributes)
  const tables = computed(() => describeUpgradeTables(weapon))

  const hands = ref<Hands>(criteria.criteria.style.hands === 2 ? 'two' : 'one')
  // Le maniement des critères sert de point de départ ; un changement de critère le remplace.
  watch(
    () => criteria.criteria.style.hands,
    (h) => {
      hands.value = h === 2 ? 'two' : 'one'
    },
  )
  // Le mode de maniement ne dépend ni du niveau, ni de l'affinité, ni du choix de maniement : le moteur le rend avec les prérequis
  // (calculs.md, « Prérequis comparés au profil »). Ce premier appel, mis en cache par le store, sert à fixer le maniement transmis ensuite.
  const mode = computed<TwoHandMode>(() => analysis.requirementsOf(entityRef)?.value?.mode ?? 'optional')
  const engineHands = computed<Hands>(() => (mode.value === 'none' ? 'one' : mode.value === 'always' ? 'two' : hands.value))

  const levelMax = computed(() => sliderMax(weapon, tables.value))
  const level = ref(0)
  const initialAffinity = tables.value.affinities.includes('Standard') ? 'Standard' : (tables.value.affinities[0] ?? 'Standard')
  const affinity = ref(initialAffinity)
  const slots = ref(defaultSlots(tables.value.affinities))
  const toggleAffinity = (name: string): void => {
    slots.value = toggleSlot(slots.value, name)
  }

  const calcs = computed(() => analysis.weaponCalcs(entityRef, level.value, affinity.value, engineHands.value))
  const attack = computed(() => calcs.value?.attack ?? null)
  const requirements = computed(() => calcs.value?.requirements ?? null)
  // Force effective à deux mains : composante `effective-strength` de l'explication, présente seulement si le bonus s'applique.
  const effectiveStrength = computed(
    () => requirements.value?.explanation.components.find((c) => c.code === 'effective-strength')?.value ?? null,
  )
  const plan = computed(() => {
    const max = weapon.derived.upgrade.maxLevel
    return max === null || max <= 0 ? null : analysis.upgradePlanFor(entityRef, 0, max)
  })
  const score = computed(() => analysis.scoreOf(entityRef))

  const profileName = computed(() => profiles.active?.name ?? null)

  return {
    ref: entityRef,
    attrs,
    tables,
    hands,
    twoHandMode: mode,
    engineHands,
    effectiveStrength,
    level,
    levelMax,
    affinity,
    slots,
    toggleAffinity,
    attack,
    requirements,
    plan,
    score,
    profileName,
  }
}
