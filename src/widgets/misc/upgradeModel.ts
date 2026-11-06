// Mise en forme du plan d'amélioration : choix de l'arme, lignes de pierres avec leur Bell Bearing, disponibilité selon l'étape du joueur.
// Le plan lui-même vient du moteur (`analysis.upgradePlanFor`, calculs.md, « Plan d'amélioration ») ; ce module associe seulement chaque palier
// à son Bell Bearing et compare l'étape du Bell Bearing à celle du joueur (calculs.md, « Étape de progression d'une arme »).

import type { EntityRef } from '../../data/datasets.ts'
import { stageIndex } from '../../engine/config/stages.ts'
import type { StageId } from '../../engine/config/stages.ts'
import type { BellBearingRef } from '../../engine/config/upgrade.ts'
import type { StoneTierId, UpgradePlan } from '../../engine/upgradePlan.ts'

/** Origine d'une arme proposée : Ma liste, ou les recommandations du widget A. */
export type WeaponOrigin = 'list' | 'recommended'

/** Arme proposée au choix. */
export interface WeaponChoice {
  readonly ref: EntityRef
  /** Nom exact de l'arme dans les données. */
  readonly name: string
  readonly origin: WeaponOrigin
}

/** Une arme recommandée, telle que le store `analysis` la donne. */
export interface RecommendedWeapon {
  readonly ref: EntityRef
  readonly name: string
}

/**
 * Armes proposées : d'abord celles de Ma liste, puis les recommandations qui n'y sont pas déjà, sans doublon.
 * @param pinned Références épinglées (tous genres confondus).
 * @param recommended Armes recommandées, dans l'ordre des colonnes d'étape.
 * @param nameOf Nom d'une arme épinglée ; `null` si la référence n'est pas une arme chargée.
 * @returns Les choix, Ma liste en tête.
 */
export function weaponChoices(
  pinned: readonly EntityRef[],
  recommended: readonly RecommendedWeapon[],
  nameOf: (ref: EntityRef) => string | null,
): WeaponChoice[] {
  const out: WeaponChoice[] = []
  for (const ref of pinned) {
    if (!ref.startsWith('weapon:') || out.some((c) => c.ref === ref)) continue
    const name = nameOf(ref)
    if (name !== null) out.push({ ref, name, origin: 'list' })
  }
  for (const weapon of recommended) {
    if (!out.some((c) => c.ref === weapon.ref)) out.push({ ref: weapon.ref, name: weapon.name, origin: 'recommended' })
  }
  return out
}

/** Disponibilité d'un Bell Bearing comparée à l'étape du joueur. */
export type Availability = 'available' | 'later' | 'unknown'

/** Bell Bearing qui couvre un palier. */
export interface BellLine {
  readonly item: EntityRef
  /** Nom exact dans les données. */
  readonly name: string
  /** Régions où on le trouve (`derived.regions.values`), vides si le wiki n'en donne pas. */
  readonly places: readonly string[]
  /** Étape où on le trouve, `null` si elle n'est pas déterminée. */
  readonly stage: StageId | null
  readonly availability: Availability
}

/** Ligne du tableau : une pierre à réunir et le Bell Bearing qui permet de l'acheter sans limite. */
export interface StoneLine {
  readonly item: EntityRef
  readonly name: string
  readonly tier: StoneTierId
  readonly quantity: number
  /** `null` pour la pierre ancienne, qui ne s'achète pas en quantité illimitée. */
  readonly bell: BellLine | null
}

/** Ce que le widget sait d'un Bell Bearing : lieux et étape. */
export interface BellInfo {
  readonly places: readonly string[]
  readonly stage: StageId | null
}

/**
 * Disponibilité d'un Bell Bearing : trouvé à l'étape du joueur ou avant, trouvé plus tard, ou étape inconnue.
 * @param bellStage Étape du Bell Bearing.
 * @param playerStage Étape courante du joueur ; `null` si elle n'est pas connue.
 * @returns La disponibilité.
 */
export function availabilityOf(bellStage: StageId | null, playerStage: StageId | null): Availability {
  if (bellStage === null || playerStage === null) return 'unknown'
  return stageIndex(bellStage) <= stageIndex(playerStage) ? 'available' : 'later'
}

/**
 * Lignes du tableau d'un plan : chaque pierre avec le Bell Bearing qui couvre son palier.
 * @param plan Plan calculé par le moteur.
 * @param infoOf Lieux et étape d'un Bell Bearing (données chargées, `analysis.bellBearingStages`).
 * @param playerStage Étape courante du joueur.
 * @returns Les lignes, dans l'ordre du plan (paliers croissants puis pierre ancienne).
 */
export function stoneLines(plan: UpgradePlan, infoOf: (item: EntityRef) => BellInfo, playerStage: StageId | null): StoneLine[] {
  return plan.stones.map((stone) => {
    const ref: BellBearingRef | undefined = typeof stone.tier === 'number' ? plan.bellBearings.find((b) => b.tiers.includes(stone.tier as number)) : undefined
    const info = ref === undefined ? null : infoOf(ref.item)
    return {
      item: stone.item,
      name: stone.name,
      tier: stone.tier,
      quantity: stone.quantity,
      bell:
        ref === undefined || info === null
          ? null
          : { item: ref.item, name: ref.name, places: info.places, stage: info.stage, availability: availabilityOf(info.stage, playerStage) },
    }
  })
}
