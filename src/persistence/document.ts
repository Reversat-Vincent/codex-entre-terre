// Documents d'état : construction du document stocké et du fichier d'export, nom du fichier, lecture et migration d'un texte JSON.
// Référence : docs/architecture.md § 7 (document, export, import). Le texte lu n'est jamais fiable : tout passe par `validateDocument`.

import { APP_ID, CURRENT_SCHEMA } from './schema.ts'
import { MIGRATIONS, MigrationError, canMigrate, migrateState } from './migrations.ts'
import type { Migration } from './migrations.ts'
import { LIMITS } from './model.ts'
import type { PersistedState, Result, ValidationIssue } from './model.ts'
import { validateDocument } from './validate.ts'

/** Document enregistré dans le stockage local. */
export interface StoredDocument {
  app: typeof APP_ID
  schemaVersion: number
  savedAt: string
  appVersion: string
  state: PersistedState
}

/** Document du fichier d'export. */
export interface ExportDocument {
  app: typeof APP_ID
  kind: 'export'
  schemaVersion: number
  exportedAt: string
  appVersion: string
  state: PersistedState
}

/**
 * Construit le document enregistré dans le stockage local.
 * @param state État à enregistrer.
 * @param appVersion Version de l'application (`__APP_VERSION__`).
 * @param now Date de l'écriture.
 * @returns Le document, prêt pour `JSON.stringify`.
 */
export function buildStoredDocument(state: PersistedState, appVersion: string, now: Date): StoredDocument {
  return { app: APP_ID, schemaVersion: CURRENT_SCHEMA, savedAt: now.toISOString(), appVersion, state }
}

/**
 * Construit le document du fichier d'export (architecture § 7).
 * @param state État à exporter.
 * @param appVersion Version de l'application.
 * @param now Date de l'export.
 * @returns Le document d'export.
 */
export function buildExportDocument(state: PersistedState, appVersion: string, now: Date): ExportDocument {
  return { app: APP_ID, kind: 'export', schemaVersion: CURRENT_SCHEMA, exportedAt: now.toISOString(), appVersion, state }
}

/**
 * Nom du fichier d'export : `codex-entre-terre-AAAA-MM-JJ.json`, date du jour dans le fuseau local.
 * @param now Date de l'export.
 * @returns Le nom de fichier.
 */
export function exportFileName(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `codex-entre-terre-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

/**
 * Produit le fichier d'export complet.
 * @param state État à exporter.
 * @param appVersion Version de l'application.
 * @param now Date de l'export.
 * @returns Le nom du fichier et son contenu JSON indenté (lisible, de taille négligeable).
 */
export function buildExportFile(state: PersistedState, appVersion: string, now: Date): { fileName: string; content: string } {
  return { fileName: exportFileName(now), content: JSON.stringify(buildExportDocument(state, appVersion, now), null, 2) }
}

/** Motifs de refus d'un texte JSON ou d'une opération d'import. */
export type RefusalReason = 'too-large' | 'json' | 'not-codex' | 'unknown-version' | 'newer-version' | 'invalid' | 'readonly'

/** Refus d'un document : motif, message clair en français et écarts détaillés. */
export interface Refusal {
  reason: RefusalReason
  message: string
  issues: ValidationIssue[]
}

/** Document lu, migré et validé. */
export interface ParsedDocument {
  state: PersistedState
  /** Version de schéma du document d'origine. */
  fromVersion: number
  /** Vrai si des migrations ont été appliquées. */
  migrated: boolean
  /** Date d'export ou d'enregistrement, si lisible. */
  stamp: string | null
  /** Version de l'application qui a écrit le document, si lisible. */
  appVersion: string | null
}

/** Options de lecture, surtout utiles aux tests (autre version courante, autres migrations). */
export interface ParseOptions {
  currentSchema?: number
  migrations?: Readonly<Record<number, Migration>>
}

const refuse = (reason: RefusalReason, message: string, issues: ValidationIssue[] = []): Result<never, Refusal> => ({
  ok: false,
  error: { reason, message, issues },
})

/**
 * Taille en octets d'un texte encodé en UTF-8.
 * @param text Texte.
 * @returns Le nombre d'octets.
 */
export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length
}

/**
 * Lit un texte JSON (fichier importé ou document stocké), vérifie sa version, migre si besoin, puis valide entièrement.
 * Aucune écriture : le résultat est soit un état neuf et validé, soit un refus motivé.
 * @param text Contenu brut.
 * @param options Version courante et migrations (par défaut celles de l'application).
 * @returns Le document validé, ou le refus.
 */
export function parseDocument(text: string, options: ParseOptions = {}): Result<ParsedDocument, Refusal> {
  const current = options.currentSchema ?? CURRENT_SCHEMA
  const migrations = options.migrations ?? MIGRATIONS
  if (utf8Length(text) > LIMITS.maxImportBytes) {
    return refuse('too-large', `Le fichier dépasse ${LIMITS.maxImportBytes / (1024 * 1024)} Mo : ce n’est pas une sauvegarde du Codex.`)
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return refuse('json', 'Le fichier n’est pas un JSON valide.')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return refuse('not-codex', 'Ce fichier n’est pas une sauvegarde du Codex de l’Entre-terre.')
  }
  const doc = raw as Record<string, unknown>
  if (!Object.hasOwn(doc, 'app') || doc.app !== APP_ID) {
    return refuse('not-codex', 'Ce fichier n’est pas une sauvegarde du Codex de l’Entre-terre.')
  }
  const version = Object.hasOwn(doc, 'schemaVersion') ? doc.schemaVersion : undefined
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return refuse('unknown-version', 'La version de ce fichier est inconnue : il n’a pas été importé.')
  }
  if (version > current) {
    return refuse(
      'newer-version',
      `Ce fichier vient d’une version plus récente de l’application (schéma ${version}, le vôtre est ${current}) : rechargez la page pour mettre l’application à jour, puis réessayez.`,
    )
  }
  if (!canMigrate(version, current, migrations)) {
    return refuse('unknown-version', `La version ${version} de ce fichier n’est plus prise en charge : il n’a pas été importé.`)
  }
  let candidate: Record<string, unknown> = doc
  if (version < current) {
    try {
      const state = migrateState(Object.hasOwn(doc, 'state') ? doc.state : undefined, version, current, migrations)
      candidate = { ...doc, schemaVersion: current, state }
    } catch (e) {
      const detail = e instanceof MigrationError ? e.message : 'erreur inattendue'
      return refuse('invalid', `Le fichier n’a pas pu être converti vers la version actuelle (${detail}).`)
    }
  }
  const result = validateDocument(candidate, current)
  if (!result.ok) {
    return refuse('invalid', 'Le fichier est incomplet ou contient des valeurs invalides : rien n’a été modifié.', result.error)
  }
  const stampRaw = candidate.kind === 'export' ? candidate.exportedAt : candidate.savedAt
  return {
    ok: true,
    value: {
      state: result.value,
      fromVersion: version,
      migrated: version < current,
      stamp: typeof stampRaw === 'string' ? stampRaw : null,
      appVersion: typeof candidate.appVersion === 'string' ? candidate.appVersion : null,
    },
  }
}
