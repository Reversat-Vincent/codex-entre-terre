// Composable de la fiche d'arme : état local (maniement, niveau affiché, affinité du calcul, affinités du graphique) et appels au moteur
// (puissance d'attaque, prérequis, score) avec les attributs du profil actif. Aucune formule ici : tout vient de `src/engine/` et du store d'analyse.

import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { EntityRef } from '../../../data/datasets.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import { attackPower } from '../../../engine/attackPower.ts'
import type { AttackPowerResult } from '../../../engine/attackPower.ts'
import { checkRequirements, twoHandBonusApplies, twoHandMode, twoHandedStrength } from '../../../engine/requirements.ts'
import type { RequirementsResult, TwoHandMode } from '../../../engine/requirements.ts'
import type { WeaponScore } from '../../../engine/score.ts'
import type { Attributes, Calc, Hands, WeaponFileKey } from '../../../engine/types.ts'
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
  readonly twoHandMode: TwoHandMode
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
  readonly attack: ComputedRef<AttackPowerResult>
  readonly requirements: ComputedRef<Calc<RequirementsResult>>
  /** Plan d'amélioration jusqu'au niveau maximal (« Coût jusqu'au maximum »), `null` si le plan n'est pas disponible. */
  readonly plan: ComputedRef<Calc<UpgradePlan> | null>
  /** Score de l'arme pour les critères courants ; `null` si l'arme n'est pas évaluée (hors du style choisi). */
  readonly score: ComputedRef<Calc<WeaponScore> | null>
  /** Phrase décrivant le profil actif (« Dex / Saignement, Samurai, niveau 42, étape Milieu »), sans les parties inconnues. */
  readonly profileName: ComputedRef<string | null>
}

/**
 * Prépare l'état de la fiche d'une arme.
 * Le niveau reste à 0 sans tableau d'amélioration (calcul limité à +0). L'affinité du calcul est Standard si elle est documentée, sinon la première.
 * @param weapon Arme affichée.
 * @param file Fichier de données de l'arme (références des explications).
 * @returns Les états et valeurs calculées, réactifs aux critères.
 */
export function useWeaponSheet(weapon: WeaponEntry, file: WeaponFileKey): WeaponSheetState {
  const criteria = useCriteriaStore()
  const analysis = useAnalysisStore()
  const profiles = useProfilesStore()
  const entityRef: EntityRef = `weapon:${weapon.id}`

  const attrs = computed(() => criteria.criteria.character.attributes)
  const tables = computed(() => describeUpgradeTables(weapon))
  const mode = twoHandMode(weapon)

  const hands = ref<Hands>(criteria.criteria.style.hands === 2 ? 'two' : 'one')
  // Le maniement des critères sert de point de départ ; un changement de critère le remplace.
  watch(
    () => criteria.criteria.style.hands,
    (h) => {
      hands.value = h === 2 ? 'two' : 'one'
    },
  )
  const engineHands = computed<Hands>(() => (mode === 'none' ? 'one' : mode === 'always' ? 'two' : hands.value))
  const effectiveStrength = computed(() =>
    twoHandBonusApplies(mode, engineHands.value) ? twoHandedStrength(attrs.value.str) : null,
  )

  const levelMax = computed(() => sliderMax(weapon, tables.value))
  const level = ref(0)
  const initialAffinity = tables.value.affinities.includes('Standard') ? 'Standard' : (tables.value.affinities[0] ?? 'Standard')
  const affinity = ref(initialAffinity)
  const slots = ref(defaultSlots(tables.value.affinities))
  const toggleAffinity = (name: string): void => {
    slots.value = toggleSlot(slots.value, name)
  }

  const attack = computed(() => attackPower(weapon, affinity.value, level.value, attrs.value, engineHands.value, { file }))
  const requirements = computed(() => checkRequirements(weapon, attrs.value, engineHands.value, { file }))
  const plan = computed(() => {
    const max = weapon.derived.upgrade.maxLevel
    return max === null || max <= 0 ? null : analysis.upgradePlanFor(entityRef, 0, max)
  })
  const score = computed(() => analysis.scored.find((s) => s.candidate.ref === entityRef)?.score ?? null)

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
