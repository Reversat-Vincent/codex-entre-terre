// Store racine (docs/architecture.md § 6, partagé) : démarrage de l'application, mode du stockage, export et import de l'état.
// `boot()` lit le stockage, migre, hydrate les stores, pose le thème, branche le pont de persistance et lance le chargement du manifeste.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createBridge } from '../persistence/bridge.ts'
import type { Bridge, EventSource, StorageMode } from '../persistence/bridge.ts'
import { buildExportFile } from '../persistence/document.ts'
import type { Refusal } from '../persistence/document.ts'
import { createImportController, prepareImport, prepareImportFile } from '../persistence/importer.ts'
import type { ImportController, ImportPreview, ReadableFile } from '../persistence/importer.ts'
import type { Result } from '../persistence/model.ts'
import { loadStoredState } from '../persistence/repository.ts'
import { openSessionStorage, openStorage } from '../persistence/storage.ts'
import type { StorageLike } from '../persistence/storage.ts'
import { useCriteriaStore } from './criteria.ts'
import { useDataStore } from './data.ts'
import { useLayoutStore } from './layout.ts'
import { usePinsStore } from './pins.ts'
import { useQuestsStore } from './quests.ts'
import { usePreferencesStore, applyTheme } from './preferences.ts'
import { useProfilesStore } from './profiles.ts'
import { useSearchStore } from './search.ts'
import { useToastsStore } from './toasts.ts'

/** Réglages de `boot()`, surtout utiles aux tests ; l'application l'appelle sans argument. */
export interface BootOptions {
  /** Stockage durable (`undefined` : `localStorage` ; `null` : indisponible). */
  storage?: StorageLike | null
  /** Stockage de session pour l'instantané d'annulation de l'import. */
  session?: StorageLike | null
  /** Fenêtre pour `pagehide` et `storage` (`undefined` : `window` s'il existe). */
  win?: EventSource | null
  /** Délai de calme avant écriture, en ms. */
  delayMs?: number
}

const bootHooks: (() => void)[] = []

/**
 * Enregistre une fonction exécutée à la fin de `boot()` : point d'accroche du service worker (tâche PWA, `src/pwa/registerSW.ts`).
 * @param hook Fonction à appeler une fois l'état hydraté.
 */
export function registerBootHook(hook: () => void): void {
  bootHooks.push(hook)
}

/**
 * Store racine.
 * État : `appVersion`, `storage` (`ok`, `unavailable` ou `readonly-newer`), `booted`, `canUndoImport`.
 * Actions : `boot()` (idempotent), `exportFile()`, `previewImport(fichier)` et `previewImportText(texte)` (aucune écriture),
 * `confirmImport(aperçu)` (remplace tout l'état, avec « Annuler »), `undoImport()`.
 */
export const useAppStore = defineStore('app', () => {
  const appVersion = __APP_VERSION__
  const storage = ref<StorageMode>('ok')
  const booted = ref(false)
  const canUndoImport = ref(false)
  let bridge: Bridge | null = null
  let importer: ImportController | null = null

  function boot(options: BootOptions = {}): void {
    if (booted.value) return
    const opened = openStorage(options.storage)
    const load = loadStoredState(opened.storage)
    const win = options.win === undefined ? (typeof window === 'undefined' ? null : (window as unknown as EventSource)) : options.win

    bridge = createBridge({
      storage: opened.storage,
      durable: opened.durable,
      appVersion,
      win,
      delayMs: options.delayMs,
      onModeChange: (mode) => {
        storage.value = mode
      },
      stores: {
        criteria: useCriteriaStore(),
        profiles: useProfilesStore(),
        pins: usePinsStore(),
        quests: useQuestsStore(),
        layout: useLayoutStore(),
        preferences: usePreferencesStore(),
        recentSearches: useSearchStore(),
      },
    })
    bridge.start(load)
    storage.value = bridge.mode()
    // Posé avant le montage de l'application, pour que la première image ait déjà le bon thème.
    applyTheme(usePreferencesStore().theme)

    const current = bridge
    importer = createImportController({
      collect: () => current.collect(),
      apply: (state) => current.apply(state),
      readonly: () => current.mode() === 'readonly-newer',
      session: openSessionStorage(options.session),
    })
    canUndoImport.value = importer.canUndo()

    if (load.kind === 'invalid') {
      useToastsStore().push({
        message: 'Vos données enregistrées étaient illisibles : les réglages par défaut sont chargés. Une copie brute a été conservée.',
        kind: 'warning',
      })
    }

    // Les données se chargent en tâche de fond : les widgets réclament leurs fichiers par `ensure`.
    void useDataStore().loadManifest()

    booted.value = true
    // Point d'accroche du service worker (enregistrement, invite de mise à jour) : voir `registerBootHook`.
    for (const hook of bootHooks) hook()
  }

  function exportFile(now: Date = new Date()): { fileName: string; content: string } {
    if (!bridge) throw new Error('boot() doit être appelé avant exportFile().')
    return buildExportFile(bridge.collect(), appVersion, now)
  }

  function previewImportText(text: string): Result<ImportPreview, Refusal> {
    return prepareImport(text)
  }

  function previewImport(file: ReadableFile): Promise<Result<ImportPreview, Refusal>> {
    return prepareImportFile(file)
  }

  function confirmImport(preview: ImportPreview): Result<true, Refusal> {
    if (!importer) throw new Error('boot() doit être appelé avant confirmImport().')
    const result = importer.commit(preview)
    canUndoImport.value = importer.canUndo()
    if (result.ok) {
      useToastsStore().undoable('Sauvegarde importée : l’état précédent est remplacé', undoImport, 'refresh')
    }
    return result
  }

  function undoImport(): boolean {
    if (!importer) return false
    const done = importer.undo()
    canUndoImport.value = importer.canUndo()
    if (done) useToastsStore().push({ message: 'Import annulé : l’état précédent est restauré', kind: 'success', icon: 'check' })
    return done
  }

  return { appVersion, storage, booted, canUndoImport, boot, exportFile, previewImportText, previewImport, confirmImport, undoImport }
})
