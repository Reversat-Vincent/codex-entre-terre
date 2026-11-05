// Archétypes de build : poids du score, gabarits cibles au niveau 150, plancher et poids automatiques (décision D16).
// Source : prototype `docs/design/Main.dc.html` (`ARCH`, `FLOOR`, `targetFor`, `autoW`) ; méthode : calculs.md, « Build cible ».
// Choix de conception du prototype, sans fait du jeu.

import type { AttributeKey, WeaponAttributeKey } from '../../data/keys.ts'

/** Identifiants des archétypes, dans l'ordre du prototype. */
export const ARCHETYPE_IDS = ['str', 'dex', 'qual', 'int', 'fai', 'arc', 'dexarc', 'intdex', 'intfai', 'strfai'] as const

/** Identifiant d'archétype. */
export type ArchetypeKey = (typeof ARCHETYPE_IDS)[number]

/** Archétype : poids des attributs du score (composante 1) et gabarit d'attributs au niveau de référence. */
export interface Archetype {
  readonly id: ArchetypeKey
  /** Poids des attributs du build ; un attribut absent est hors build. */
  readonly weights: Readonly<Partial<Record<WeaponAttributeKey, number>>>
  /** Gabarit au niveau `TEMPLATE_LEVEL`, ordre VIG, MND, END, STR, DEX, INT, FAI, ARC (somme 229 = 150 + 79). */
  readonly template: readonly [number, number, number, number, number, number, number, number]
}

/** Archétypes du prototype (calculs.md, « Build cible », tableau). Les noms affichés viennent de l'interface. */
export const ARCHETYPES: Readonly<Record<ArchetypeKey, Archetype>> = {
  str: { id: 'str', weights: { str: 1, dex: 0.2 }, template: [60, 15, 31, 80, 16, 9, 9, 9] },
  dex: { id: 'dex', weights: { dex: 1, str: 0.3 }, template: [60, 15, 30, 16, 80, 9, 9, 10] },
  qual: { id: 'qual', weights: { str: 1, dex: 1 }, template: [58, 14, 28, 55, 55, 7, 6, 6] },
  int: { id: 'int', weights: { int: 1, dex: 0.2 }, template: [50, 38, 18, 12, 18, 80, 7, 6] },
  fai: { id: 'fai', weights: { fai: 1, str: 0.3 }, template: [50, 35, 20, 16, 12, 7, 80, 9] },
  arc: { id: 'arc', weights: { arc: 1, dex: 0.4 }, template: [55, 25, 25, 12, 30, 9, 13, 60] },
  dexarc: { id: 'dexarc', weights: { dex: 1, arc: 1 }, template: [60, 15, 25, 14, 50, 9, 8, 48] },
  intdex: { id: 'intdex', weights: { int: 1, dex: 1 }, template: [55, 25, 20, 12, 45, 55, 8, 9] },
  intfai: { id: 'intfai', weights: { int: 1, fai: 1 }, template: [50, 30, 18, 12, 12, 50, 50, 7] },
  strfai: { id: 'strfai', weights: { str: 1, fai: 1 }, template: [55, 20, 25, 55, 15, 7, 45, 7] },
}

/** Niveau des gabarits : à ce niveau, la cible est le gabarit (`k = 1`). */
export const TEMPLATE_LEVEL = 150

/** Plancher `FLOOR` des attributs cibles, ordre VIG, MND, END, STR, DEX, INT, FAI, ARC (somme 61). */
export const TARGET_FLOOR: readonly [number, number, number, number, number, number, number, number] = [9, 8, 8, 8, 9, 7, 6, 6]

/** Ordre des attributs des gabarits et du plancher. */
export const TEMPLATE_ORDER: readonly AttributeKey[] = ['vig', 'mnd', 'end', 'str', 'dex', 'int', 'fai', 'arc']

/**
 * Poids automatiques sans archétype (`autoW`) : chaque attribut d'arme au-dessus de `threshold` pèse `valeur − offset` ; sans aucun,
 * `fallback` ; puis division par le plus grand poids et arrondi à `decimals` décimales.
 */
export const AUTO_WEIGHTS = {
  threshold: 12,
  offset: 10,
  fallback: { str: 1 } satisfies Readonly<Partial<Record<WeaponAttributeKey, number>>>,
  decimals: 2,
} as const

/**
 * Indique si une valeur est un identifiant d'archétype connu (un identifiant inconnu des critères est traité comme « aucun »).
 * @param value Valeur à tester.
 * @returns Vrai pour un archétype de `ARCHETYPES`.
 */
export function isArchetypeKey(value: unknown): value is ArchetypeKey {
  return typeof value === 'string' && (ARCHETYPE_IDS as readonly string[]).includes(value)
}
