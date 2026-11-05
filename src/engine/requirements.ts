// Prérequis d'une arme comparés aux attributs du profil, avec la Force effective à deux mains et ses exceptions.
// Méthode : docs/design/ds/calculs.md, « Prérequis comparés au profil » ; exceptions : config/twoHanded.ts.

import { WEAPON_ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { WeaponAttributeKey } from '../data/keys.ts'
import type { SpellEntry } from '../data/types/spells.ts'
import type { WeaponEntry } from '../data/types/weapon.ts'
import { TWO_HANDED } from './config/twoHanded.ts'
import type { TwoHandedConfig } from './config/twoHanded.ts'
import { makeCalc } from './types.ts'
import type { Attributes, Calc, DataRef, ExplanationComponent, ExplanationLimit, Hands, WeaponFileKey } from './types.ts'

/** Champs d'arme lus par la comparaison des prérequis. */
export type RequirementWeapon = Pick<WeaponEntry, 'id' | 'category' | 'requirements'>

/**
 * Maniement à deux mains d'une arme : `optional` bascule 1M / 2M avec bonus de Force, `none` pas de posture à deux mains (pas de bonus),
 * `always` toujours à deux mains (bonus d'office, bascule masquée).
 */
export type TwoHandMode = 'optional' | 'none' | 'always'

/** Comparaison d'un prérequis au profil. */
export interface RequirementCheck {
  readonly attr: WeaponAttributeKey
  /** Valeur demandée (`requirements.<attr>`, toujours > 0 ici). */
  readonly required: number
  /** Valeur réelle du profil. */
  readonly actual: number
  /** Valeur comparée au prérequis : Force × 1,5 arrondie à l'entier inférieur si le bonus s'applique, sinon la valeur réelle. */
  readonly effective: number
  readonly met: boolean
  /** Écart en points réels à ajouter au profil (Force réelle à deux mains), 0 si atteint. */
  readonly gap: number
  /** Vrai si le bonus de deux mains a servi pour cet attribut. */
  readonly twoHandApplied: boolean
}

/** Résultat complet de la comparaison, pour le panneau « Pourquoi ? ». */
export interface RequirementsResult {
  readonly mode: TwoHandMode
  readonly checks: readonly RequirementCheck[]
  readonly allMet: boolean
}

/**
 * Maniement à deux mains d'une arme (calculs.md, « Prérequis comparés au profil ») : l'exception (Starscourge Greatsword) prime,
 * puis les catégories toujours à deux mains, puis les catégories et armes sans posture.
 * @param w Arme (id et catégorie).
 * @param cfg Configuration des exceptions.
 * @returns Le mode de maniement à deux mains.
 */
export function twoHandMode(w: Pick<WeaponEntry, 'id' | 'category'>, cfg: TwoHandedConfig = TWO_HANDED): TwoHandMode {
  if (cfg.bonusExceptions.includes(w.id)) return 'optional'
  if (cfg.alwaysTwoHandedCategories.includes(w.category)) return 'always'
  if (cfg.noStanceCategories.includes(w.category) || cfg.noStanceWeapons.includes(w.id)) return 'none'
  return 'optional'
}

/**
 * Force effective à deux mains (calculs.md, « Prérequis comparés au profil ») : `floor(STR × 1,5)`, en entiers `STR + floor(STR / 2)`.
 * @param str Force réelle.
 * @param cfg Configuration (facteur 3 / 2).
 * @returns La Force effective.
 */
export function twoHandedStrength(str: number, cfg: TwoHandedConfig = TWO_HANDED): number {
  const { numerator, denominator } = cfg.strengthFactor
  return Math.floor((str * numerator) / denominator)
}

/**
 * Force réelle minimale pour atteindre un prérequis à deux mains (calculs.md : `ceil(2 × prérequis / 3)`, en entiers `floor((2 × p + 2) / 3)`).
 * @param required Prérequis de Force.
 * @param cfg Configuration (facteur 3 / 2).
 * @returns La plus petite Force réelle dont la Force effective atteint le prérequis.
 */
export function twoHandedStrengthNeeded(required: number, cfg: TwoHandedConfig = TWO_HANDED): number {
  const { numerator, denominator } = cfg.strengthFactor
  return Math.floor((denominator * required + numerator - 1) / numerator)
}

/**
 * Indique si le bonus de Force à deux mains s'applique.
 * @param mode Maniement de l'arme.
 * @param hands Maniement choisi par le joueur.
 * @returns Vrai pour une arme toujours à deux mains, ou maniée à deux mains avec une posture.
 */
export function twoHandBonusApplies(mode: TwoHandMode, hands: Hands): boolean {
  return mode === 'always' || (mode === 'optional' && hands === 'two')
}

/**
 * Compare les prérequis d'une arme au profil (calculs.md, « Prérequis comparés au profil »). Seuls les prérequis non nuls sont rendus
 * (`requirements.<attr> === 0` = aucun prérequis). Atteint si l'attribut effectif ≥ prérequis ; l'écart de Force à deux mains est en Force réelle.
 * @param w Arme.
 * @param attrs Attributs du profil.
 * @param hands Maniement choisi ; ignoré pour une arme toujours à deux mains ou sans posture.
 * @param cfg Configuration du maniement à deux mains.
 * @returns Une comparaison par prérequis non nul, dans l'ordre STR, DEX, INT, FAI, ARC.
 */
export function compareRequirements(
  w: RequirementWeapon,
  attrs: Attributes,
  hands: Hands,
  cfg: TwoHandedConfig = TWO_HANDED,
): RequirementCheck[] {
  const bonus = twoHandBonusApplies(twoHandMode(w, cfg), hands)
  const out: RequirementCheck[] = []
  for (const attr of WEAPON_ATTRIBUTE_KEYS) {
    const required = w.requirements[attr]
    if (required <= 0) continue
    const actual = attrs[attr]
    const twoHandApplied = bonus && attr === 'str'
    const effective = twoHandApplied ? twoHandedStrength(actual, cfg) : actual
    const met = effective >= required
    const needed = twoHandApplied ? twoHandedStrengthNeeded(required, cfg) : required
    out.push({ attr, required, actual, effective, met, gap: Math.max(0, needed - actual), twoHandApplied })
  }
  return out
}

/**
 * Comparaison des prérequis avec son explication (calculs.md, « Prérequis comparés au profil »).
 * @param w Arme.
 * @param attrs Attributs du profil.
 * @param hands Maniement choisi.
 * @param ctx Fichier de l'arme (références de données) et configuration du maniement à deux mains.
 * @param ctx.file Fichier de données de l'arme.
 * @param ctx.cfg Configuration du maniement à deux mains (par défaut `TWO_HANDED`).
 * @returns Les comparaisons, le mode de maniement et l'indication « tous atteints » ; jamais estimé (données du wiki).
 */
export function checkRequirements(
  w: RequirementWeapon,
  attrs: Attributes,
  hands: Hands,
  ctx: { readonly file: WeaponFileKey; readonly cfg?: TwoHandedConfig },
): Calc<RequirementsResult> {
  const cfg = ctx.cfg ?? TWO_HANDED
  const mode = twoHandMode(w, cfg)
  const checks = compareRequirements(w, attrs, hands, cfg)
  const components: ExplanationComponent[] = checks.map((c) => ({
    code: 'requirement',
    value: c.gap,
    params: { attr: c.attr, required: c.required, actual: c.actual, effective: c.effective },
  }))
  const inputs: DataRef[] = checks.map((c) => ({
    file: ctx.file,
    entry: w.id,
    field: `requirements.${c.attr}`,
    value: c.required,
    reliability: 'wiki',
  }))
  inputs.push({ file: ctx.file, entry: w.id, field: 'category', value: w.category, reliability: 'wiki' })
  const limits: ExplanationLimit[] = []
  if (twoHandBonusApplies(mode, hands)) {
    components.push({ code: 'effective-strength', value: twoHandedStrength(attrs.str, cfg), params: { actual: attrs.str } })
  }
  if (mode === 'always') limits.push({ code: 'two-hand-always', params: { category: w.category } })
  if (mode === 'none' && hands === 'two') limits.push({ code: 'two-hand-no-stance' })
  if (cfg.bonusExceptions.includes(w.id)) limits.push({ code: 'two-hand-bonus-exception' })
  return makeCalc('requirements', { mode, checks, allMet: checks.every((c) => c.met) }, { components, inputs, limits })
}

/** Champs de sort lus par la comparaison des prérequis (INT, FAI, ARC ; 0 = aucun prérequis). */
export type RequirementSpell = Pick<SpellEntry, 'id' | 'requirements'>

/** Catégorie fictive donnée à un sort pour la comparaison : hors des listes de `twoHanded.ts`, elle ne déclenche aucune exception. */
const SPELL_CATEGORY = 'Spell'

/**
 * Prérequis d'un sort comparés au profil, avec explication (calculs.md, « Prérequis comparés au profil ») : même règle `attribut ≥ prérequis`
 * que pour une arme ; un sort n'a ni prérequis de Force ni posture, la Force effective à deux mains ne s'applique donc jamais.
 * @param spell Sort (`requirements.int`, `.fai`, `.arc`).
 * @param attrs Attributs du profil.
 * @returns Les comparaisons des prérequis non nuls (ordre INT, FAI, ARC), mode `optional` sans effet ; jamais estimé (données du wiki).
 */
export function checkSpellRequirements(spell: RequirementSpell, attrs: Attributes): Calc<RequirementsResult> {
  const { int, fai, arc } = spell.requirements
  const checks = compareRequirements({ id: spell.id, category: SPELL_CATEGORY, requirements: { str: 0, dex: 0, int, fai, arc } }, attrs, 'one')
  const components: ExplanationComponent[] = checks.map((c) => ({
    code: 'requirement',
    value: c.gap,
    params: { attr: c.attr, required: c.required, actual: c.actual, effective: c.effective },
  }))
  const inputs: DataRef[] = checks.map((c) => ({ file: 'spells', entry: spell.id, field: `requirements.${c.attr}`, value: c.required, reliability: 'wiki' }))
  return makeCalc('requirements', { mode: 'optional', checks, allMet: checks.every((c) => c.met) }, { components, inputs })
}
