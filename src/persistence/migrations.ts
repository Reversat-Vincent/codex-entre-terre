// Migrations du schéma persisté : fonctions de N vers N + 1, appliquées en chaîne (docs/architecture.md § 7).
// Chaque migration reçoit la valeur `state` du document, non fiable, et renvoie la valeur `state` de la version suivante ;
// la validation complète passe après la dernière migration.

import { CURRENT_SCHEMA } from './schema.ts'

/** Migration de la version N vers N + 1 (clé = N). */
export type Migration = (state: unknown) => unknown

/** Table des migrations. Vide tant que le schéma est à la version 1 : la première migration s'écrit avec `CURRENT_SCHEMA = 2`. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

/** Erreur levée quand une étape de la chaîne est absente ou échoue. */
export class MigrationError extends Error {
  /** Version de départ de l'étape en cause. */
  readonly from: number

  /**
   * @param from Version de départ de l'étape en cause.
   * @param message Explication.
   */
  constructor(from: number, message: string) {
    super(message)
    this.name = 'MigrationError'
    this.from = from
  }
}

/**
 * Indique si la chaîne de migrations de `from` jusqu'à `to` est complète.
 * @param from Version de départ.
 * @param to Version visée.
 * @param migrations Table des migrations.
 * @returns Vrai si chaque étape existe.
 */
export function canMigrate(from: number, to: number = CURRENT_SCHEMA, migrations: Readonly<Record<number, Migration>> = MIGRATIONS): boolean {
  for (let v = from; v < to; v++) if (typeof migrations[v] !== 'function') return false
  return true
}

/**
 * Migre un état de la version `from` à la version `to`, une étape à la fois.
 * @param state Valeur `state` du document (non fiable).
 * @param from Version du document.
 * @param to Version visée ; `CURRENT_SCHEMA` par défaut.
 * @param migrations Table des migrations.
 * @returns L'état migré, à valider ensuite.
 * @throws {MigrationError} Si une étape manque ou lève une exception.
 */
export function migrateState(
  state: unknown,
  from: number,
  to: number = CURRENT_SCHEMA,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): unknown {
  let current = state
  for (let v = from; v < to; v++) {
    const step = migrations[v]
    if (typeof step !== 'function') throw new MigrationError(v, `Migration de la version ${v} vers ${v + 1} absente.`)
    try {
      current = step(current)
    } catch (e) {
      throw new MigrationError(v, `Migration de la version ${v} vers ${v + 1} en échec : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return current
}
