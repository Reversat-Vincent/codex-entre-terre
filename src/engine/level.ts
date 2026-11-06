// Niveau d'un jeu d'attributs : somme des huit attributs − 79 (docs/design/ds/calculs.md, « Origine optimale »).
// Toutes les origines de data/origins.json vérifient cette relation (contrôle de la préparation, docs/architecture.md § 3.5).

import { ATTRIBUTE_KEYS, ORIGIN_ATTRIBUTE_FIELD } from '../data/keys.ts'
import type { OriginEntry } from '../data/types/origins.ts'
import { isIntIn, makeCalc, nullCalc } from './types.ts'
import type { Attributes, Calc } from './types.ts'

/** Décalage entre la somme des attributs et le niveau (calculs.md, « Origine optimale » : niveau = Σ attributs − 79). */
export const LEVEL_OFFSET = 79

/** Bornes d'un attribut (calculs.md, « Origine optimale », « Préconditions »). */
export const ATTRIBUTE_MIN = 1
/** Valeur maximale d'un attribut. */
export const ATTRIBUTE_MAX = 99

/**
 * Attributs d'une origine, en clés courtes (`origins.json`, `attributes.vigor`…).
 * @param origin Origine préparée.
 * @returns Ses huit attributs de départ.
 */
export function originAttributes(origin: Pick<OriginEntry, 'attributes'>): Attributes {
  const out = {} as Record<(typeof ATTRIBUTE_KEYS)[number], number>
  for (const k of ATTRIBUTE_KEYS) out[k] = origin.attributes[ORIGIN_ATTRIBUTE_FIELD[k]]
  return out
}

/**
 * Indique si chaque attribut est un entier de 1 à 99.
 * @param attrs Attributs à contrôler.
 * @returns La première clé hors bornes, ou `null` si tous sont valides.
 */
export function invalidAttribute(attrs: Attributes): (typeof ATTRIBUTE_KEYS)[number] | null {
  for (const k of ATTRIBUTE_KEYS) if (!isIntIn(attrs[k], ATTRIBUTE_MIN, ATTRIBUTE_MAX)) return k
  return null
}

/**
 * Niveau d'un personnage d'après ses attributs (calculs.md, « Origine optimale » : niveau = Σ attributs − 79).
 * @param attrs Les huit attributs.
 * @returns Le niveau ; `null` avec la limite `attribute-out-of-range` si un attribut n'est pas un entier de 1 à 99.
 */
export function levelOf(attrs: Attributes): Calc<number> {
  const bad = invalidAttribute(attrs)
  if (bad !== null) return nullCalc('level', { code: 'attribute-out-of-range', params: { attr: bad } })
  const sum = ATTRIBUTE_KEYS.reduce((s, k) => s + attrs[k], 0)
  return makeCalc('level', sum - LEVEL_OFFSET, {
    components: [
      { code: 'attribute-sum', value: sum },
      { code: 'level-offset', value: LEVEL_OFFSET },
      { code: 'level', value: sum - LEVEL_OFFSET },
    ],
  })
}
