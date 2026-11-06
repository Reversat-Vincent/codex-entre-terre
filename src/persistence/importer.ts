// Import d'une sauvegarde : lecture et validation complètes sans aucune écriture, résumé pour la confirmation, remplacement complet
// de l'état avec instantané préalable et « Annuler » jusqu'à la fin de la session (docs/architecture.md § 7, cahier des charges § 5).

import { parseDocument } from './document.ts'
import type { ParseOptions, Refusal } from './document.ts'
import { LIMITS } from './model.ts'
import type { PersistedState, Result } from './model.ts'
import { STORAGE_KEYS } from './schema.ts'
import type { StorageLike } from './storage.ts'
import { validateState } from './validate.ts'

/** Résumé affiché dans la confirmation d'import. */
export interface ImportSummary {
  /** Date d'export lue dans le fichier, si lisible. */
  exportedAt: string | null
  /** Version de l'application qui a produit le fichier. */
  appVersion: string | null
  /** Version de schéma du fichier. */
  schemaVersion: number
  /** Version d'origine si le fichier a été migré, sinon `null`. */
  migratedFrom: number | null
  profiles: number
  pins: number
  /** Boss vaincus dans les critères de travail. */
  defeatedBosses: number
  recentSearches: number
  /** PNJ dont au moins une étape de quête est cochée dans le fichier. */
  questNpcs: number
  /** Étapes de quête cochées dans le fichier, tous PNJ confondus. */
  questSteps: number
}

/** Import prêt à être appliqué : l'état validé et son résumé. Rien n'est encore écrit. */
export interface ImportPreview {
  state: PersistedState
  summary: ImportSummary
}

/**
 * Lit et valide entièrement un texte importé, sans rien écrire.
 * @param text Contenu du fichier.
 * @param options Version courante et migrations (tests).
 * @returns L'import prêt à confirmer, ou le refus motivé.
 */
export function prepareImport(text: string, options: ParseOptions = {}): Result<ImportPreview, Refusal> {
  const parsed = parseDocument(text, options)
  if (!parsed.ok) return parsed
  const { state } = parsed.value
  // Un PNJ sans étape cochée (liste vide) ne compte pas : l'état validé n'en garde normalement pas, mais le résumé ne s'y fie pas.
  const questLists = Object.values(state.quests)
  return {
    ok: true,
    value: {
      state,
      summary: {
        exportedAt: parsed.value.stamp,
        appVersion: parsed.value.appVersion,
        schemaVersion: parsed.value.fromVersion,
        migratedFrom: parsed.value.migrated ? parsed.value.fromVersion : null,
        profiles: state.profiles.items.length,
        pins: state.pins.length,
        defeatedBosses: state.criteria.progress.defeated.length,
        recentSearches: state.recentSearches.length,
        questNpcs: questLists.filter((steps) => steps.length > 0).length,
        questSteps: questLists.reduce((sum, steps) => sum + steps.length, 0),
      },
    },
  }
}

/** Fichier tel que le navigateur le fournit (`File`, `Blob`). */
export interface ReadableFile {
  size: number
  text(): Promise<string>
}

/**
 * Lit un fichier choisi par l'utilisateur après avoir vérifié sa taille (≤ 1 Mo) : un fichier trop gros n'est même pas chargé en mémoire.
 * @param file Fichier choisi.
 * @param options Version courante et migrations (tests).
 * @returns L'import prêt à confirmer, ou le refus motivé.
 */
export async function prepareImportFile(file: ReadableFile, options: ParseOptions = {}): Promise<Result<ImportPreview, Refusal>> {
  if (file.size > LIMITS.maxImportBytes) {
    return {
      ok: false,
      error: { reason: 'too-large', message: `Le fichier dépasse ${LIMITS.maxImportBytes / (1024 * 1024)} Mo : ce n’est pas une sauvegarde du Codex.`, issues: [] },
    }
  }
  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, error: { reason: 'json', message: 'Le fichier n’a pas pu être lu.', issues: [] } }
  }
  return prepareImport(text, options)
}

/** Dépendances du contrôleur d'import (fournies par le pont de persistance). */
export interface ImportDeps {
  /** Rassemble l'état courant des stores. */
  collect(): PersistedState
  /** Remplace tout l'état et l'écrit. */
  apply(state: PersistedState): void
  /** Vrai si le stockage est en lecture seule (version stockée plus récente) : l'import est alors refusé. */
  readonly(): boolean
  /** Stockage de session, pour que l'instantané survive à un rechargement de l'onglet (repli en mémoire). */
  session: StorageLike
}

/** Contrôleur de l'import : confirmation, remplacement, annulation. */
export interface ImportController {
  /** Remplace tout l'état par celui de l'import, après avoir mis l'ancien de côté. Refus en lecture seule. */
  commit(preview: ImportPreview): Result<true, Refusal>
  /** Vrai si un instantané d'avant import peut être restauré. */
  canUndo(): boolean
  /** Restaure l'instantané d'avant import ; faux s'il n'y en a pas (ou s'il est illisible). */
  undo(): boolean
}

/**
 * Crée le contrôleur d'import.
 * L'instantané est gardé en mémoire et recopié, au mieux, dans le stockage de session : « Annuler » reste possible jusqu'à la fermeture de l'onglet.
 * @param deps Pont de persistance et stockage de session.
 * @returns Le contrôleur.
 */
export function createImportController(deps: ImportDeps): ImportController {
  let snapshot: PersistedState | null = null

  // Reprise après rechargement de l'onglet : l'instantané de session est revalidé comme tout contenu stocké.
  try {
    const raw = deps.session.getItem(STORAGE_KEYS.undoImport)
    if (raw !== null) {
      const result = validateState(JSON.parse(raw))
      if (result.ok) snapshot = result.value
    }
  } catch {
    snapshot = null
  }

  function persistSnapshot(): void {
    try {
      if (snapshot) deps.session.setItem(STORAGE_KEYS.undoImport, JSON.stringify(snapshot))
      else deps.session.removeItem(STORAGE_KEYS.undoImport)
    } catch {
      // Stockage de session indisponible ou plein : l'instantané reste en mémoire.
    }
  }

  return {
    commit(preview) {
      if (deps.readonly()) {
        return {
          ok: false,
          error: {
            reason: 'readonly',
            message: 'Vos données enregistrées viennent d’une version plus récente de l’application : l’import est désactivé pour ne rien écraser. Rechargez la page pour mettre l’application à jour.',
            issues: [],
          },
        }
      }
      snapshot = deps.collect()
      persistSnapshot()
      deps.apply(preview.state)
      return { ok: true, value: true }
    },
    canUndo: () => snapshot !== null,
    undo() {
      if (!snapshot) return false
      const previous = snapshot
      snapshot = null
      persistSnapshot()
      deps.apply(previous)
      return true
    },
  }
}
