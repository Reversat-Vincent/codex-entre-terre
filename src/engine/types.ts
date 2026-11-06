// Types communs du moteur de calcul (docs/architecture.md § 5.1) : valeur calculée `Calc<T>`, explication, référence de donnée,
// et fonctions d'aide qui gardent un `null` comme `null` et font hériter une estimation (docs/design/ds/calculs.md, introduction).

import type { DatasetKey } from '../data/datasets.ts'
import type { AttributeKey } from '../data/keys.ts'
import type { ComponentCode, LimitCode } from './codes.ts'

/**
 * Fiabilité d'une donnée lue ou d'une valeur produite : `wiki` publiée, `deduced` déduite d'une règle du wiki, `estimate` estimation,
 * `null` non documentée, `inconsistent` signalée incohérente par le wiki lui-même, `calculated` calculée par l'application.
 */
export type Reliability = 'wiki' | 'deduced' | 'estimate' | 'null' | 'inconsistent' | 'calculated'

/** Identifiant d'une méthode de `docs/design/ds/calculs.md` ; correspondance avec les sections dans `methods.ts`. */
export type MethodId =
  | 'stage'
  | 'weapon-score'
  | 'requirements'
  | 'optimal-origin'
  | 'target-attributes'
  | 'boss-level'
  | 'readiness'
  | 'rune-cost'
  | 'upgrade-plan'
  | 'derived-stats'
  | 'attack-power'
  | 'level'
  | 'coverage'
  | 'attribute-yield'
  | 'level-up-priorities'

/** Confiance d'une estimation, reprise de `upgrade.estimate_if_undocumented.confidence` ou fixée par la méthode. */
export type Confidence = 'high' | 'medium'

/** Marque d'estimation d'une valeur (badge Estimation). */
export interface Estimate {
  readonly confidence: Confidence
}

/** Clé d'un fichier d'armes : les trois fichiers partagent le type `WeaponEntry`. */
export type WeaponFileKey = 'melee_armaments' | 'ranged_weapons_catalysts' | 'shields_torches'

/** Valeur d'une donnée citée dans une explication. */
export type DataValue = string | number | boolean | null

/** Donnée lue par un calcul : fichier, entrée, champ et fiabilité (« Données utilisées » du panneau « Pourquoi ? »). */
export interface DataRef {
  /** Jeu de données, tables de calcul ou configuration du moteur (`src/engine/config/`). */
  readonly file: DatasetKey | 'tables' | 'config'
  /** Identifiant de l'entrée (id, clé de table ou nom de fichier de configuration). */
  readonly entry?: string
  /** Chemin du champ lu dans l'entrée. */
  readonly field: string
  readonly value?: DataValue
  readonly reliability: Reliability
}

/** Paramètres d'un code (attribut, type de dégâts, palier…), interpolés par `src/ui/explainText.ts`. */
export type CodeParams = Readonly<Record<string, string | number>>

/** Composante chiffrée d'une explication ; `value` vaut `null` quand la donnée manque, jamais 0. */
export interface ExplanationComponent {
  readonly code: ComponentCode
  readonly value: number | null
  /** Maximum de la composante, quand elle en a un (score sur 25…). */
  readonly max?: number
  readonly params?: CodeParams
}

/** Limite d'une explication : hypothèse, approximation ou donnée manquante. */
export interface ExplanationLimit {
  readonly code: LimitCode
  readonly params?: CodeParams
}

/** Décomposition d'une valeur calculée pour le panneau « Pourquoi ? ». */
export interface Explanation {
  /** Méthode, donc section de `calculs.md`. */
  readonly method: MethodId
  readonly components: readonly ExplanationComponent[]
  /** Données lues : fichier, entrée, champ. */
  readonly inputs: readonly DataRef[]
  readonly limits: readonly ExplanationLimit[]
}

/**
 * Valeur calculée : la valeur (ou `null` si elle ne peut pas être calculée), l'estimation héritée et l'explication.
 * @typeParam T Type de la valeur.
 */
export interface Calc<T> {
  readonly value: T | null
  readonly estimate: Estimate | null
  readonly explanation: Explanation
}

/** Les huit attributs d'un personnage, en clés courtes. */
export type Attributes = Readonly<Record<AttributeKey, number>>

/** Maniement d'une arme : à une main ou à deux mains. */
export type Hands = 'one' | 'two'

/** Contenu facultatif d'une explication, pour `makeCalc`. */
export interface CalcParts {
  readonly estimate?: Estimate | null
  readonly components?: readonly ExplanationComponent[]
  readonly inputs?: readonly DataRef[]
  readonly limits?: readonly ExplanationLimit[]
}

/**
 * Construit une valeur calculée.
 * @param method Méthode de `calculs.md` qui produit la valeur.
 * @param value Valeur, ou `null` si elle ne peut pas être calculée.
 * @param parts Estimation, composantes, données lues et limites.
 * @returns La valeur calculée, sans effet de bord.
 */
export function makeCalc<T>(method: MethodId, value: T | null, parts: CalcParts = {}): Calc<T> {
  return {
    value,
    estimate: parts.estimate ?? null,
    explanation: {
      method,
      components: parts.components ?? [],
      inputs: parts.inputs ?? [],
      limits: parts.limits ?? [],
    },
  }
}

/**
 * Construit une valeur non calculable : `null` avec la limite qui l'explique, jamais 0.
 * @param method Méthode de `calculs.md`.
 * @param limit Code de la limite.
 * @param parts Composantes et données lues déjà connues ; leurs limites précèdent `limit`.
 * @returns Une valeur calculée de valeur `null`.
 */
export function nullCalc<T>(method: MethodId, limit: ExplanationLimit, parts: CalcParts = {}): Calc<T> {
  return makeCalc<T>(method, null, { ...parts, limits: [...(parts.limits ?? []), limit] })
}

/**
 * Combine des estimations : une valeur calculée à partir d'une estimation hérite de l'estimation (calculs.md, introduction).
 * La confiance retenue est la plus faible (`medium` dès qu'une source l'est).
 * @param estimates Estimations des sources ; `null` ou `undefined` = source non estimée.
 * @returns L'estimation héritée, ou `null` si aucune source n'est estimée.
 */
export function mergeEstimates(...estimates: readonly (Estimate | null | undefined)[]): Estimate | null {
  let result: Estimate | null = null
  for (const e of estimates) {
    if (e === null || e === undefined) continue
    if (result === null || e.confidence === 'medium') result = { confidence: e.confidence }
  }
  return result
}

/**
 * Estimation héritée de plusieurs valeurs calculées.
 * @param calcs Valeurs sources.
 * @returns L'estimation la plus faible des sources, ou `null` si aucune n'est estimée.
 */
export function inheritEstimate(...calcs: readonly Calc<unknown>[]): Estimate | null {
  return mergeEstimates(...calcs.map((c) => c.estimate))
}

/**
 * Transforme la valeur d'un calcul en gardant son estimation et son explication ; un `null` reste un `null` (la fonction n'est pas appelée).
 * @param calc Valeur source.
 * @param fn Transformation de la valeur non nulle.
 * @returns La valeur transformée, avec la même estimation et la même explication.
 */
export function mapCalc<T, U>(calc: Calc<T>, fn: (value: T) => U): Calc<U> {
  return { value: calc.value === null ? null : fn(calc.value), estimate: calc.estimate, explanation: calc.explanation }
}

/**
 * Applique une fonction à une valeur qui peut manquer : `null` en entrée donne `null`, jamais 0.
 * @param value Valeur ou `null`.
 * @param fn Fonction appliquée à une valeur présente.
 * @returns Le résultat, ou `null`.
 */
export function mapNullable<T, U>(value: T | null, fn: (v: T) => U): U | null {
  return value === null ? null : fn(value)
}

/**
 * Indique si une valeur est une valeur calculée `Calc` plutôt qu'une valeur brute.
 * @param x Valeur à tester.
 * @returns Vrai si `x` a la forme d'un `Calc`.
 */
export function isCalc<T>(x: T | Calc<T>): x is Calc<T> {
  return typeof x === 'object' && x !== null && 'explanation' in x && 'estimate' in x && 'value' in x
}

/**
 * Vérifie qu'un nombre est un entier compris dans un intervalle fermé.
 * @param n Nombre testé.
 * @param min Borne basse incluse.
 * @param max Borne haute incluse.
 * @returns Vrai si `n` est un entier de `[min, max]`.
 */
export function isIntIn(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max
}

/**
 * Lit une entrée d'une table par une clé qui peut venir de l'état de l'utilisateur ou d'un fichier importé : seules les clés propres
 * comptent, jamais la chaîne de prototypes (`constructor`, `toString`, `__proto__`… ne désignent aucune entrée).
 * @param table Table de configuration.
 * @param key Clé à chercher.
 * @returns La valeur, ou `undefined` si la clé n'est pas une clé propre de la table.
 */
export function ownValue<V>(table: Readonly<Record<string, V>>, key: string): V | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined
}
