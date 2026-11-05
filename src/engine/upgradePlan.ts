// Plan d'amélioration d'une arme : pierres par niveau et par palier, pierre ancienne, Bell Bearings utiles.
// Méthode : docs/design/ds/calculs.md, « Plan d'amélioration » ; matériaux et Bell Bearings : config/upgrade.ts.
// L'étape de progression des Bell Bearings se lit avec `entryStage` (stage.ts) ; le store `analysis` l'expose (`bellBearingStages`).

import type { WeaponEntry } from '../data/types/weapon.ts'
import { UPGRADE } from './config/upgrade.ts'
import type { BellBearingRef, ItemRef, MaterialRule, StoneMaterial, UpgradeConfig } from './config/upgrade.ts'
import { isIntIn, makeCalc, nullCalc } from './types.ts'
import type { Calc, DataRef, Estimate, ExplanationComponent, ExplanationLimit, WeaponFileKey } from './types.ts'

/** Champs d'arme lus par le plan. */
export type UpgradeWeapon = Pick<WeaponEntry, 'id' | 'derived'>

/** Palier d'une pierre : numéro de palier, ou `ancient` pour la pierre du niveau maximal. */
export type StoneTierId = number | 'ancient'

/** Pierres demandées pour atteindre un niveau. */
export interface UpgradeStep extends ItemRef {
  /** Niveau atteint (+n). */
  readonly level: number
  readonly tier: StoneTierId
  readonly quantity: number
}

/** Total d'une pierre sur tout le plan. */
export interface StoneTotal extends ItemRef {
  readonly tier: StoneTierId
  readonly quantity: number
}

/** Plan d'amélioration de `from` à `to`. */
export interface UpgradePlan {
  readonly material: StoneMaterial
  readonly from: number
  readonly to: number
  readonly maxLevel: number
  /** Une étape par niveau, de `from + 1` à `to`. */
  readonly steps: readonly UpgradeStep[]
  /** Totaux par pierre, paliers croissants puis pierre ancienne. */
  readonly stones: readonly StoneTotal[]
  /** Pierres de palier (hors pierre ancienne). */
  readonly totalStones: number
  /** Pierres anciennes (0 ou 1). */
  readonly ancientStones: number
  /** Bell Bearings qui débloquent l'achat illimité d'au moins un palier du plan. */
  readonly bellBearings: readonly BellBearingRef[]
}

/**
 * État du type d'amélioration d'une arme (calculs.md, « Plan d'amélioration ») : `documented` (wiki), `deduced`, `estimate`
 * (`upgrade.estimate_if_undocumented`), `undocumented` (« Non documenté ») ou `not-upgradeable` (« Non améliorable »).
 */
export type UpgradeStatus = 'documented' | 'deduced' | 'estimate' | 'undocumented' | 'not-upgradeable'

/**
 * État du type d'amélioration, d'après `derived.upgrade.reliability` (calculs.md, « Plan d'amélioration »).
 * @param w Arme.
 * @returns L'état, qui décide entre plan, « Non documenté » et « Non améliorable ».
 */
export function upgradeStatus(w: UpgradeWeapon): UpgradeStatus {
  switch (w.derived.upgrade.reliability) {
    case 'wiki':
      return 'documented'
    case 'deduced':
      return 'deduced'
    case 'estimate':
      return 'estimate'
    case 'not-upgradeable':
      return 'not-upgradeable'
    case 'null':
      return 'undocumented'
  }
}

/**
 * Pierres demandées pour atteindre le niveau +n (calculs.md, « Plan d'amélioration ») : pierres normales `2 × ((n − 1) mod 3 + 1)`
 * Smithing Stone [`ceil(n / 3)`] ; pierres sombres une Somber [n] ; niveau maximal : la pierre ancienne.
 * @param rule Règle du matériau.
 * @param n Niveau atteint, de 1 au niveau maximal.
 * @returns La pierre, son palier et la quantité.
 */
export function stonesForLevel(rule: MaterialRule, n: number): Omit<UpgradeStep, 'level'> {
  if (n === rule.maxLevel) return { ...rule.ancient, tier: 'ancient', quantity: 1 }
  const per = rule.quantities.length
  const tier = Math.ceil(n / per)
  const stone = rule.stones[tier - 1]
  const quantity = rule.quantities[(n - 1) % per]
  if (stone === undefined || quantity === undefined) throw new Error(`upgradePlan : palier ${tier} absent de la configuration`)
  return { item: stone.item, name: stone.name, tier, quantity }
}

/**
 * Plan d'amélioration d'une arme de `from` à `to` (calculs.md, « Plan d'amélioration »).
 * Hérite du badge Estimation quand le type vient de `upgrade.estimate_if_undocumented` ; sans type ou « Not upgradeable », renvoie `null`
 * avec la limite `upgrade-type-undocumented` ou `not-upgradeable` (plan non calculé). Les prix ne sont pas dans data/ : aucun prix rendu.
 * @param w Arme.
 * @param from Niveau actuel (entier ≥ 0).
 * @param to Niveau visé (`from ≤ to ≤ niveau maximal`).
 * @param ctx Fichier de l'arme (références de données) et configuration des matériaux.
 * @param ctx.file Fichier de données de l'arme.
 * @param ctx.cfg Configuration des matériaux et Bell Bearings (par défaut `UPGRADE`).
 * @returns Le plan, ou `null` avec sa limite.
 */
export function upgradePlan(
  w: UpgradeWeapon,
  from: number,
  to: number,
  ctx: { readonly file: WeaponFileKey; readonly cfg?: UpgradeConfig },
): Calc<UpgradePlan> {
  const cfg = ctx.cfg ?? UPGRADE
  const u = w.derived.upgrade
  const status = upgradeStatus(w)
  if (status === 'not-upgradeable') {
    return nullCalc('upgrade-plan', { code: 'not-upgradeable' }, {
      inputs: [{ file: ctx.file, entry: w.id, field: 'upgrade.material', value: u.material, reliability: 'wiki' }],
    })
  }
  if (status === 'undocumented') {
    return nullCalc('upgrade-plan', { code: 'upgrade-type-undocumented' }, {
      inputs: [{ file: ctx.file, entry: w.id, field: 'upgrade.material', value: null, reliability: 'null' }],
    })
  }

  const estimate: Estimate | null = status === 'estimate' ? { confidence: u.confidence ?? 'medium' } : null
  const inputs: DataRef[] = [
    status === 'estimate'
      ? { file: ctx.file, entry: w.id, field: 'upgrade.estimate_if_undocumented.material', value: u.material, reliability: 'estimate' }
      : { file: ctx.file, entry: w.id, field: 'upgrade.material', value: u.material, reliability: status === 'deduced' ? 'deduced' : 'wiki' },
  ]
  const limits: ExplanationLimit[] = []
  if (status === 'estimate') limits.push({ code: 'upgrade-type-estimated', params: { confidence: estimate?.confidence ?? 'medium' } })
  if (status === 'deduced') limits.push({ code: 'upgrade-type-deduced' })

  const rule = u.material === null ? undefined : cfg.materials[u.material as StoneMaterial]
  if (rule === undefined) {
    return nullCalc('upgrade-plan', { code: 'material-unknown', params: { material: u.material ?? '' } }, { estimate, inputs, limits })
  }
  const maxLevel = u.maxLevel ?? rule.maxLevel
  if (!isIntIn(from, 0, maxLevel) || !isIntIn(to, from, maxLevel)) {
    return nullCalc('upgrade-plan', { code: 'level-out-of-range', params: { from, to, max: maxLevel } }, { estimate, inputs, limits })
  }

  const steps: UpgradeStep[] = []
  for (let n = from + 1; n <= to; n++) steps.push({ level: n, ...stonesForLevel(rule, n) })

  const totals = new Map<string, StoneTotal>()
  for (const s of steps) {
    const prev = totals.get(s.item)
    totals.set(s.item, { item: s.item, name: s.name, tier: s.tier, quantity: (prev?.quantity ?? 0) + s.quantity })
  }
  const order = (t: StoneTierId): number => (t === 'ancient' ? Number.MAX_SAFE_INTEGER : t)
  const stones = [...totals.values()].sort((a, b) => order(a.tier) - order(b.tier))
  const totalStones = stones.filter((s) => s.tier !== 'ancient').reduce((n, s) => n + s.quantity, 0)
  const ancientStones = stones.filter((s) => s.tier === 'ancient').reduce((n, s) => n + s.quantity, 0)
  const usedTiers = new Set(stones.map((s) => s.tier))
  const bellBearings = cfg.bellBearings.filter((b) => b.material === rule.material && b.tiers.some((t) => usedTiers.has(t)))

  const components: ExplanationComponent[] = [
    ...stones.map((s): ExplanationComponent =>
      s.tier === 'ancient'
        ? { code: 'ancient-stones', value: s.quantity, params: { item: s.item } }
        : { code: 'stones', value: s.quantity, params: { item: s.item, tier: s.tier } },
    ),
    { code: 'total-stones', value: totalStones },
    ...bellBearings.map((b): ExplanationComponent => ({ code: 'bell-bearing', value: null, params: { item: b.item } })),
  ]
  inputs.push({ file: 'config', entry: 'upgrade', field: `materials["${rule.material}"]`, value: rule.material, reliability: 'wiki' })
  if (bellBearings.length > 0) {
    inputs.push({ file: 'config', entry: 'upgrade', field: 'bellBearings', value: bellBearings.length, reliability: 'wiki' })
  }
  limits.push({ code: 'prices-not-in-data' })
  if (ancientStones > 0) limits.push({ code: 'ancient-stones-not-purchasable' })

  return makeCalc(
    'upgrade-plan',
    { material: rule.material, from, to, maxLevel, steps, stones, totalStones, ancientStones, bellBearings },
    { estimate, components, inputs, limits },
  )
}
