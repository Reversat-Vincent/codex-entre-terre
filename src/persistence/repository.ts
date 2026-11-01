// Lecture et écriture du document d'état dans un `StorageLike` : migration avec copie de sauvegarde, version plus récente en lecture seule.
// Référence : docs/architecture.md § 7 (clés, migrations, mode dégradé). Aucune dépendance à Vue.

import { buildStoredDocument, parseDocument } from './document.ts'
import type { ParseOptions, Refusal } from './document.ts'
import type { PersistedState } from './model.ts'
import { CURRENT_SCHEMA, STORAGE_KEYS } from './schema.ts'
import type { StorageLike } from './storage.ts'
import { validateDocument } from './validate.ts'

/** Résultat de la lecture du document stocké. */
export type StoredLoad =
  /** Rien d'enregistré : les stores gardent leurs valeurs par défaut. */
  | { kind: 'empty' }
  /** Document valide (migré si `migratedFrom` n'est pas `null`). */
  | { kind: 'loaded'; state: PersistedState; migratedFrom: number | null }
  /** Document écrit par une version plus récente : lecture seule, rien n'est écrasé ; `state` si son contenu reste lisible. */
  | { kind: 'newer'; version: number; state: PersistedState | null }
  /** Document illisible ou invalide : copie conservée dans `backup-invalid`, valeurs par défaut. */
  | { kind: 'invalid'; refusal: Refusal }

/** Échec d'écriture (quota dépassé, stockage refusé). */
export interface WriteFailure {
  ok: false
  error: unknown
}

/**
 * Lit le document d'état stocké.
 * Une version plus ancienne est migrée après copie brute dans `backup-v<N>` (écriture au mieux : un échec n'empêche pas la lecture).
 * Un document illisible est copié dans `backup-invalid` avant que quoi que ce soit puisse l'écraser.
 * Cette fonction n'écrit jamais l'état courant : c'est le rôle de {@link writeStoredState}.
 * @param storage Stockage à lire.
 * @param options Version courante et migrations (tests).
 * @returns Le résultat de la lecture.
 */
export function loadStoredState(storage: StorageLike, options: ParseOptions = {}): StoredLoad {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEYS.state)
  } catch {
    return { kind: 'empty' }
  }
  if (raw === null) return { kind: 'empty' }

  const parsed = parseDocument(raw, options)
  if (parsed.ok) {
    if (parsed.value.migrated) bestEffort(() => storage.setItem(STORAGE_KEYS.backup(parsed.value.fromVersion), raw))
    return { kind: 'loaded', state: parsed.value.state, migratedFrom: parsed.value.migrated ? parsed.value.fromVersion : null }
  }
  if (parsed.error.reason === 'newer-version') {
    return { kind: 'newer', version: readVersion(raw), state: readNewerState(raw, options.currentSchema ?? CURRENT_SCHEMA) }
  }
  bestEffort(() => storage.setItem(STORAGE_KEYS.backupInvalid, raw))
  return { kind: 'invalid', refusal: parsed.error }
}

function bestEffort(action: () => void): void {
  try {
    action()
  } catch {
    // Sauvegarde de courtoisie : si le stockage la refuse, la lecture continue.
  }
}

function readVersion(raw: string): number {
  try {
    const doc = JSON.parse(raw) as { schemaVersion?: unknown }
    return typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 0
  } catch {
    return 0
  }
}

/**
 * Tente de lire l'état d'un document plus récent avec les règles de la version courante : en lecture seule, un contenu qui reste valide est utilisable.
 * @param raw Texte du document.
 * @param schema Version courante du schéma.
 * @returns L'état si le contenu est valide selon le schéma courant, sinon `null`.
 */
function readNewerState(raw: string, schema: number): PersistedState | null {
  try {
    const doc = JSON.parse(raw) as Record<string, unknown>
    const result = validateDocument({ ...doc, schemaVersion: schema }, schema)
    return result.ok ? result.value : null
  } catch {
    return null
  }
}

/**
 * Écrit l'état dans le stockage sous un document versionné.
 * @param storage Stockage cible.
 * @param state État à écrire.
 * @param appVersion Version de l'application.
 * @param now Date de l'écriture.
 * @returns `{ ok: true }` ou l'échec (quota, stockage refusé), sans exception.
 */
export function writeStoredState(storage: StorageLike, state: PersistedState, appVersion: string, now: Date): { ok: true } | WriteFailure {
  try {
    storage.setItem(STORAGE_KEYS.state, JSON.stringify(buildStoredDocument(state, appVersion, now)))
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}
