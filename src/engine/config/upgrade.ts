// Matériaux d'amélioration et Bell Bearings : pierres par palier, pierres anciennes, paliers couverts par chaque Bell Bearing.
// Source : docs/design/ds/calculs.md, « Plan d'amélioration » (pages Smithing Stones, Somber Smithing Stones et Bell Bearing du wiki ; D5).
// Les références (`item:<id>`) et les noms sont ceux de data/upgrade_materials.json et data/key_items.json ; un test contrôle qu'ils existent.

import type { EntityRef } from '../../data/datasets.ts'

/** Valeur de `upgrade.material` d'une arme non améliorable. */
export const NOT_UPGRADEABLE = 'Not upgradeable'

/** Matériau d'amélioration reconnu par le plan. */
export type StoneMaterial = 'Smithing Stones' | 'Somber Smithing Stones'

/** Objet référencé par la configuration : référence d'entité et nom exact dans data/. */
export interface ItemRef {
  readonly item: EntityRef
  readonly name: string
}

/** Pierre d'un palier. */
export interface StoneTier extends ItemRef {
  readonly tier: number
}

/** Bell Bearing qui débloque l'achat illimité de pierres de certains paliers auprès des Twin Maiden Husks. */
export interface BellBearingRef extends ItemRef {
  readonly material: StoneMaterial
  /** Paliers couverts. */
  readonly tiers: readonly number[]
}

/** Règle d'un matériau : niveau maximal, pierres par palier, pierre ancienne du dernier niveau. */
export interface MaterialRule {
  readonly material: StoneMaterial
  /** Niveau maximal (`metadata.field_notes["upgrade.material"]` : +25 ou +10). */
  readonly maxLevel: number
  /**
   * Pierres demandées par chaque niveau d'un même palier, dans l'ordre : le niveau +n utilise le palier `ceil(n / quantities.length)`
   * et `quantities[(n − 1) mod quantities.length]` pierres.
   */
  readonly quantities: readonly number[]
  /** Pierres des paliers, du palier 1 au dernier. */
  readonly stones: readonly StoneTier[]
  /** Pierre ancienne, seule pierre du niveau maximal. */
  readonly ancient: ItemRef
}

/** Configuration du plan d'amélioration. */
export interface UpgradeConfig {
  readonly materials: Readonly<Record<StoneMaterial, MaterialRule>>
  readonly bellBearings: readonly BellBearingRef[]
}

/**
 * Pierres de `prefix [1]` à `prefix [count]`, avec l'id slug de `wiki_page` (« Smithing Stone 3 » → `smithing-stone-3`).
 * @param prefix Nom sans le palier.
 * @param idPrefix Id sans le palier.
 * @param count Nombre de paliers.
 * @returns Les pierres, palier 1 en tête.
 */
function tiers(prefix: string, idPrefix: string, count: number): StoneTier[] {
  return Array.from({ length: count }, (_, i) => ({
    tier: i + 1,
    item: `item:${idPrefix}-${i + 1}` as EntityRef,
    name: `${prefix} [${i + 1}]`,
  }))
}

/** Valeurs retenues (calculs.md, « Plan d'amélioration »). */
export const UPGRADE: UpgradeConfig = {
  materials: {
    // +n (1 ≤ n ≤ 24) : 2 × ((n − 1) mod 3 + 1) Smithing Stone [ceil(n / 3)] ; +25 : une Ancient Dragon Smithing Stone.
    'Smithing Stones': {
      material: 'Smithing Stones',
      maxLevel: 25,
      quantities: [2, 4, 6],
      stones: tiers('Smithing Stone', 'smithing-stone', 8),
      ancient: { item: 'item:ancient-dragon-smithing-stone', name: 'Ancient Dragon Smithing Stone' },
    },
    // +n (n ≤ 9) : une Somber Smithing Stone [n] ; +10 : une Somber Ancient Dragon Smithing Stone.
    'Somber Smithing Stones': {
      material: 'Somber Smithing Stones',
      maxLevel: 10,
      quantities: [1],
      stones: tiers('Somber Smithing Stone', 'somber-smithing-stone', 9),
      ancient: { item: 'item:somber-ancient-dragon-smithing-stone', name: 'Somber Ancient Dragon Smithing Stone' },
    },
  },
  // Smithing-Stone Miner's [1] à [4] : paliers 1–2, 3–4, 5–6, 7–8 ; Somberstone Miner's [1] à [5] : 1–2, 3–4, 5–6, 7–8 et 9.
  bellBearings: [
    { item: 'item:smithing-stone-miners-bell-bearing-1', name: "Smithing-Stone Miner's Bell Bearing [1]", material: 'Smithing Stones', tiers: [1, 2] },
    { item: 'item:smithing-stone-miners-bell-bearing-2', name: "Smithing-Stone Miner's Bell Bearing [2]", material: 'Smithing Stones', tiers: [3, 4] },
    { item: 'item:smithing-stone-miners-bell-bearing-3', name: "Smithing-Stone Miner's Bell Bearing [3]", material: 'Smithing Stones', tiers: [5, 6] },
    { item: 'item:smithing-stone-miners-bell-bearing-4', name: "Smithing-Stone Miner's Bell Bearing [4]", material: 'Smithing Stones', tiers: [7, 8] },
    { item: 'item:somberstone-miners-bell-bearing-1', name: "Somberstone Miner's Bell Bearing [1]", material: 'Somber Smithing Stones', tiers: [1, 2] },
    { item: 'item:somberstone-miners-bell-bearing-2', name: "Somberstone Miner's Bell Bearing [2]", material: 'Somber Smithing Stones', tiers: [3, 4] },
    { item: 'item:somberstone-miners-bell-bearing-3', name: "Somberstone Miner's Bell Bearing [3]", material: 'Somber Smithing Stones', tiers: [5, 6] },
    { item: 'item:somberstone-miners-bell-bearing-4', name: "Somberstone Miner's Bell Bearing [4]", material: 'Somber Smithing Stones', tiers: [7, 8] },
    { item: 'item:somberstone-miners-bell-bearing-5', name: "Somberstone Miner's Bell Bearing [5]", material: 'Somber Smithing Stones', tiers: [9] },
  ],
}
