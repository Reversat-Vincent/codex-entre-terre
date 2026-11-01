// Store des données du jeu (docs/architecture.md § 4) : état de chargement par fichier, `ensure` idempotent, `retry`, accès aux jeux de données et aux entités.
// Les données (jusqu'à 7 Mo) restent hors de la réactivité profonde : fichiers et entrées sont marqués `markRaw`, les index par id sont des `Map` construites une fois,
// et seul un compteur de révision, incrémenté à chaque fichier lu, signale le changement aux getters.

import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import { DATASETS, DATASET_KEYS, FILE_KEYS, FILE_LABELS, datasetsOfKind } from '../data/datasets.ts'
import type { DatasetKey, EntityRef, FileKey } from '../data/datasets.ts'
import { DataLoadFailure, dataBase, fetchDataFile, fetchManifest } from '../data/loader.ts'
import type { DataLoadError, FetchFn } from '../data/loader.ts'
import type { AnyEntry, DataManifest, DatasetOf, FileOf } from '../data/types/index.ts'

/** État de chargement d'un fichier. */
export type FileStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Suivi d'un fichier produit. */
export interface FileState {
  status: FileStatus
  bytesLoaded: number
  bytesTotal: number
  error: DataLoadError | null
}

/** Fichier en échec, nommé pour l'interface (« Réessayer »). */
export interface FailedFile {
  key: FileKey | 'manifest'
  label: string
  error: DataLoadError
}

const emptyState = (): FileState => ({ status: 'idle', bytesLoaded: 0, bytesTotal: 0, error: null })

/** Normalise une exception inattendue en échec de lecture, pour que l'état ne reste jamais « en chargement ». */
function toLoadError(e: unknown, file: FileKey | 'manifest'): DataLoadError {
  if (e instanceof DataLoadFailure) return e.detail
  return { kind: 'parse', file, status: null, message: `Le fichier « ${file === 'manifest' ? 'manifeste' : FILE_LABELS[file]} » n’a pas pu être lu.` }
}

/**
 * Store des données.
 * État : `manifest`, `manifestStatus`, `manifestError`, `files` (état par fichier).
 * Getters : `progress` (octets lus sur octets attendus des fichiers demandés), `statusOf(clés)`, `failed(clés)`, `dataset(clé)`, `file(clé)`, `entity(ref)`.
 * Actions : `loadManifest()`, `ensure(clés)` (idempotent ; ne rejette jamais, les échecs sont dans l'état), `retry(clé)`, `configure({ base, fetchFn })` (tests).
 */
export const useDataStore = defineStore('data', () => {
  const manifest = ref<DataManifest | null>(null)
  const manifestStatus = ref<FileStatus>('idle')
  const manifestError = ref<DataLoadError | null>(null)
  const files = ref<Record<FileKey, FileState>>(Object.fromEntries(FILE_KEYS.map((k) => [k, emptyState()])) as Record<FileKey, FileState>)

  // Hors réactivité : contenu des fichiers et index par id.
  const loaded = new Map<FileKey, unknown>()
  const indexes = new Map<DatasetKey, Map<string, AnyEntry>>()
  const revision = ref(0)
  const inflight = new Map<FileKey, Promise<void>>()
  const requested = new Set<FileKey>()
  let manifestPromise: Promise<DataManifest | null> | null = null
  let deps: { base: string; fetchFn: FetchFn | undefined } = { base: dataBase(), fetchFn: undefined }

  function configure(options: { base?: string; fetchFn?: FetchFn }): void {
    deps = { base: options.base ?? deps.base, fetchFn: options.fetchFn ?? deps.fetchFn }
  }

  function loadManifest(): Promise<DataManifest | null> {
    if (manifestPromise) return manifestPromise
    manifestStatus.value = 'loading'
    manifestError.value = null
    manifestPromise = fetchManifest(deps.base, deps.fetchFn)
      .then((m) => {
        manifest.value = markRaw(m)
        manifestStatus.value = 'ready'
        return m
      })
      .catch((e: unknown) => {
        manifestError.value = toLoadError(e, 'manifest')
        manifestStatus.value = 'error'
        return null
      })
    return manifestPromise
  }

  function loadFile(key: FileKey, m: DataManifest): Promise<void> {
    const pending = inflight.get(key)
    if (pending) return pending
    const state = files.value[key]
    // Un fichier prêt n'est pas relu ; un fichier en échec n'est relancé que par `retry` (sinon chaque widget remonté referait la requête).
    if (state.status === 'ready' || state.status === 'error') return Promise.resolve()
    const entry = m.files[key]
    state.status = 'loading'
    state.bytesLoaded = 0
    state.bytesTotal = entry.bytes
    state.error = null
    const promise = fetchDataFile(
      key,
      entry,
      (loadedBytes, total) => {
        state.bytesLoaded = loadedBytes
        state.bytesTotal = total
      },
      deps.fetchFn,
      deps.base,
    )
      .then((file) => {
        store(key, file)
        state.status = 'ready'
        state.bytesLoaded = state.bytesTotal
      })
      .catch((e: unknown) => {
        state.status = 'error'
        state.error = toLoadError(e, key)
      })
      .finally(() => {
        inflight.delete(key)
      })
    inflight.set(key, promise)
    return promise
  }

  /** Range un fichier lu : données figées, index par id pour les jeux de données. */
  function store<K extends FileKey>(key: K, file: FileOf<K>): void {
    markRaw(file)
    if ((DATASET_KEYS as readonly string[]).includes(key)) {
      const dataset = file as DatasetOf<DatasetKey>
      const index = new Map<string, AnyEntry>()
      for (const entry of dataset.entries as readonly AnyEntry[]) {
        markRaw(entry)
        index.set(entry.id, entry)
      }
      indexes.set(key as DatasetKey, index)
    }
    loaded.set(key, file)
    revision.value++
  }

  async function ensure(keys: readonly FileKey[]): Promise<void> {
    for (const k of keys) requested.add(k)
    const m = await loadManifest()
    if (!m) return
    await Promise.all(keys.map((k) => loadFile(k, m)))
  }

  async function retry(key: FileKey | 'manifest'): Promise<void> {
    if (key === 'manifest') {
      if (manifestStatus.value !== 'error') return
      manifestPromise = null
      const m = await loadManifest()
      if (m) await Promise.all([...requested].map((k) => loadFile(k, m)))
      return
    }
    if (files.value[key].status !== 'error') return
    files.value[key] = emptyState()
    await ensure([key])
  }

  const progress = computed(() => {
    let bytesLoaded = 0
    let bytesTotal = 0
    for (const key of FILE_KEYS) {
      const s = files.value[key]
      if (s.status === 'idle') continue
      bytesLoaded += s.bytesLoaded
      bytesTotal += s.bytesTotal
    }
    return { bytesLoaded, bytesTotal, ratio: bytesTotal > 0 ? bytesLoaded / bytesTotal : 0 }
  })

  const statusOf = computed(() => (keys: readonly FileKey[]): 'loading' | 'ready' | 'error' => {
    if (manifestStatus.value === 'error') return 'error'
    if (keys.some((k) => files.value[k].status === 'error')) return 'error'
    return keys.every((k) => files.value[k].status === 'ready') ? 'ready' : 'loading'
  })

  const failed = computed(() => (keys: readonly FileKey[]): FailedFile[] => {
    const out: FailedFile[] = []
    if (manifestStatus.value === 'error' && manifestError.value) out.push({ key: 'manifest', label: 'Manifeste des données', error: manifestError.value })
    for (const key of keys) {
      const error = files.value[key].error
      if (files.value[key].status === 'error' && error) out.push({ key, label: FILE_LABELS[key], error })
    }
    return out
  })

  const file = computed(() => <K extends FileKey>(key: K): FileOf<K> | null => {
    void revision.value
    return (loaded.get(key) as FileOf<K> | undefined) ?? null
  })

  const dataset = computed(() => <K extends DatasetKey>(key: K): DatasetOf<K> | null => {
    void revision.value
    return (loaded.get(key) as DatasetOf<K> | undefined) ?? null
  })

  const entity = computed(() => (entityRef: EntityRef): AnyEntry | null => {
    void revision.value
    const separator = entityRef.indexOf(':')
    const kind = entityRef.slice(0, separator) as (typeof DATASETS)[DatasetKey]['kind']
    const id = entityRef.slice(separator + 1)
    for (const key of datasetsOfKind(kind)) {
      const found = indexes.get(key)?.get(id)
      if (found) return found
    }
    return null
  })

  return { manifest, manifestStatus, manifestError, files, progress, statusOf, failed, file, dataset, entity, configure, loadManifest, ensure, retry }
})
