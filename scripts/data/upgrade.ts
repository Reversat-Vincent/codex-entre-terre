// Champs dérivés `upgrade` et `inconsistent` des armes (docs/architecture.md § 3.2).
// Aucune valeur n'est supposée : une estimation reste marquée `estimate`, avec sa confiance et sa base.

import type { DerivedUpgrade, Inconsistency, WeaponMeta, WeaponRaw } from '../../src/data/types/weapon.ts'

/** Élément de `metadata.material_inconsistencies_flagged`. */
export type MaterialInconsistency = WeaponMeta['material_inconsistencies_flagged'][number]

/**
 * Niveau maximal par matériau, d'après `metadata.field_notes["upgrade.material"]` des fichiers d'armes :
 * « Smithing Stones => max +25; Somber Smithing Stones => max +10 ».
 */
export const MAX_LEVEL_BY_MATERIAL: Readonly<Record<string, number>> = {
  'Smithing Stones': 25,
  'Somber Smithing Stones': 10,
}

/** Valeur de `upgrade.material` d'une arme non améliorable. */
export const NOT_UPGRADEABLE = 'Not upgradeable'

/**
 * Restructure l'amélioration d'une arme.
 * `deduced` si `material_info_source` commence par « deduced » ou « game rule » (field_notes : conséquence logique stricte de la page),
 * `wiki` pour tout autre matériau documenté, `estimate` si seul `estimate_if_undocumented` existe (niveau maximal déduit du matériau estimé),
 * `null` sinon.
 * @param weapon Arme d'origine.
 * @returns Le champ dérivé `upgrade`.
 */
export function deriveUpgrade(weapon: WeaponRaw): DerivedUpgrade {
  const u = weapon.upgrade
  if (u.material === NOT_UPGRADEABLE) return { material: u.material, maxLevel: u.max_level, reliability: 'not-upgradeable' }
  if (u.material !== null) {
    const deduced = /^(deduced|game rule)/i.test(u.material_info_source ?? '')
    return { material: u.material, maxLevel: u.max_level, reliability: deduced ? 'deduced' : 'wiki' }
  }
  const e = u.estimate_if_undocumented
  if (e !== undefined) {
    return {
      material: e.material,
      maxLevel: MAX_LEVEL_BY_MATERIAL[e.material] ?? null,
      reliability: 'estimate',
      confidence: e.confidence,
      basis: e.basis,
    }
  }
  return { material: null, maxLevel: null, reliability: 'null' }
}

/**
 * Champs signalés incohérents :
 * - `upgrade.tables` quand le wiki contredit son infobox (`tables_consistent_with_infobox === false`) ; l'infobox fait foi ;
 * - `upgrade.material` quand le nom de l'arme figure dans `metadata.material_inconsistencies_flagged` (D34) ; la valeur de la liste est gardée.
 * @param weapon Arme d'origine.
 * @param materialFlags `metadata.material_inconsistencies_flagged` du fichier de l'arme.
 * @returns Les incohérences, vide si aucune.
 */
export function deriveInconsistent(weapon: WeaponRaw, materialFlags: readonly MaterialInconsistency[] = []): Inconsistency[] {
  const out: Inconsistency[] = []
  if (weapon.upgrade.tables_consistent_with_infobox === false) out.push({ field: 'upgrade.tables', reference: 'infobox' })
  const flag = materialFlags.find((f) => f.name === weapon.name)
  if (flag !== undefined) out.push({ field: 'upgrade.material', reference: 'list', reason: flag.reason, url: flag.url })
  return out
}
