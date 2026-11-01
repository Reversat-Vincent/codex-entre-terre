/// <reference types="vite/client" />
// Chargeur des données préparées (sans Vue) : manifeste, puis un fichier à la fois avec progression en octets.
// Référence : docs/architecture.md § 3.6 (manifeste) et § 4 (chargement). Le magasin `useDataStore` l'orchestre.

import { FILE_KEYS, FILE_LABELS } from './datasets.ts'
import type { FileKey } from './datasets.ts'
import type { DataManifest, FileOf, ManifestFileEntry } from './types/index.ts'

/** Nature d'un échec de chargement. */
export type DataLoadErrorKind = 'network' | 'http' | 'parse' | 'mismatch'

/** Échec de chargement d'un fichier produit, avec de quoi nommer le fichier fautif dans l'interface. */
export interface DataLoadError {
  /** `network` (pas de réponse ou flux coupé), `http` (statut hors 2xx), `parse` (JSON illisible), `mismatch` (contenu différent du manifeste). */
  readonly kind: DataLoadErrorKind
  /** Fichier concerné, ou `manifest` pour le manifeste lui-même. */
  readonly file: FileKey | 'manifest'
  /** Statut HTTP pour `http`, sinon `null`. */
  readonly status: number | null
  /** Explication en français, affichable telle quelle. */
  readonly message: string
}

/** Exception portant un {@link DataLoadError} ; seule forme d'erreur que lèvent les fonctions de ce module. */
export class DataLoadFailure extends Error {
  /** Détail structuré de l'échec. */
  readonly detail: DataLoadError

  /**
   * @param detail Détail structuré de l'échec.
   */
  constructor(detail: DataLoadError) {
    super(detail.message)
    this.name = 'DataLoadFailure'
    this.detail = detail
  }
}

/** Fonction de récupération compatible avec `fetch` (injectable pour les tests). */
export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>

/** Rappel de progression : octets lus et octets attendus (taille du manifeste). */
export type ProgressFn = (bytesLoaded: number, bytesTotal: number) => void

// Appel enveloppé : stocker `fetch` dans une variable puis l'appeler sans `window` lève « Illegal invocation » dans certains contextes.
const defaultFetch: FetchFn = (input, init) => fetch(input, init)

/**
 * Base du site, telle que Vite la fournit (`/codex-entre-terre/` en production, `/` pour un test).
 * @returns La base, toujours terminée par `/`.
 */
export function dataBase(): string {
  return withTrailingSlash(import.meta.env.BASE_URL || '/')
}

function withTrailingSlash(base: string): string {
  return base.endsWith('/') ? base : `${base}/`
}

/**
 * Adresse du manifeste (`<base>data/manifest.json`).
 * @param base Base du site (`import.meta.env.BASE_URL`).
 * @returns L'adresse du manifeste.
 */
export function manifestUrl(base: string = dataBase()): string {
  return `${withTrailingSlash(base)}data/manifest.json`
}

/**
 * Résout le chemin d'un fichier relativement à l'adresse du manifeste (architecture § 3.6 : `new URL(path, urlDuManifeste)`).
 * Une adresse relative (base `/…`) est résolue contre une origine fictive puis ramenée à son chemin, pour que la fonction marche hors navigateur.
 * @param path Chemin relatif lu dans le manifeste.
 * @param manifest Adresse du manifeste.
 * @returns L'adresse du fichier.
 */
export function resolveDataUrl(path: string, manifest: string): string {
  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(manifest)
  const resolved = new URL(path, new URL(manifest, 'http://codex.invalid'))
  return isAbsolute ? resolved.href : `${resolved.pathname}${resolved.search}`
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Contrôle la forme du manifeste lu (le fichier vient du site, mais une version en cache ou un serveur défaillant peuvent le corrompre).
 * @param json Valeur JSON lue.
 * @returns Le manifeste typé.
 * @throws {DataLoadFailure} De nature `mismatch` si la forme n'est pas celle du § 3.6.
 */
export function parseManifest(json: unknown): DataManifest {
  const fail = (why: string): never => {
    throw new DataLoadFailure({ kind: 'mismatch', file: 'manifest', status: null, message: `Le manifeste des données est invalide (${why}).` })
  }
  if (!isRecord(json)) return fail('objet attendu')
  if (json.schema !== 1) return fail(`schéma ${String(json.schema)} non pris en charge`)
  if (typeof json.dataVersion !== 'string' || typeof json.retrieved !== 'string') return fail('version ou date absente')
  const files = json.files
  if (!isRecord(files)) return fail('liste des fichiers absente')
  for (const key of FILE_KEYS) {
    const f = files[key]
    if (!isRecord(f)) return fail(`fichier « ${key} » absent`)
    // Un chemin de manifeste est un simple nom de fichier : ni sous-dossier, ni schéma, ni remontée.
    if (typeof f.path !== 'string' || !/^[A-Za-z0-9._-]+$/.test(f.path) || f.path.includes('..')) return fail(`chemin de « ${key} » invalide`)
    if (typeof f.bytes !== 'number' || typeof f.entries !== 'number' || typeof f.sha256 !== 'string' || typeof f.label !== 'string') {
      return fail(`description de « ${key} » incomplète`)
    }
  }
  return json as unknown as DataManifest
}

/**
 * Charge le manifeste (`no-cache` : c'est lui qui désigne les fichiers à jour).
 * @param base Base du site ; par défaut `import.meta.env.BASE_URL`.
 * @param fetchFn Fonction de récupération ; par défaut `fetch`.
 * @returns Le manifeste contrôlé.
 * @throws {DataLoadFailure} `network`, `http`, `parse` ou `mismatch`.
 */
export async function fetchManifest(base: string = dataBase(), fetchFn: FetchFn = defaultFetch): Promise<DataManifest> {
  const url = manifestUrl(base)
  let response: Response
  try {
    response = await fetchFn(url, { cache: 'no-cache' })
  } catch {
    throw new DataLoadFailure({ kind: 'network', file: 'manifest', status: null, message: 'Le manifeste des données n’a pas pu être téléchargé : vérifiez la connexion.' })
  }
  if (!response.ok) {
    throw new DataLoadFailure({ kind: 'http', file: 'manifest', status: response.status, message: `Le manifeste des données est introuvable (HTTP ${response.status}).` })
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new DataLoadFailure({ kind: 'parse', file: 'manifest', status: null, message: 'Le manifeste des données est illisible.' })
  }
  return parseManifest(json)
}

/**
 * Nombre d'entrées d'un fichier produit, au sens du manifeste : entrées d'un jeu de données, tables de `tables`, documents de `search-index`.
 * @param key Clé du fichier.
 * @param file Contenu parsé.
 * @returns Le nombre d'entrées, ou `null` si la liste attendue est absente.
 */
function countEntries(key: FileKey, file: Record<string, unknown>): number | null {
  const list = key === 'tables' ? file.tables : key === 'search-index' ? file.docs : file.entries
  if (key === 'tables') return isRecord(list) ? Object.keys(list).length : null
  return Array.isArray(list) ? list.length : null
}

/**
 * Lit tout le flux d'une réponse en comptant les octets, puis le décode en UTF-8.
 * @param response Réponse HTTP.
 * @param key Fichier lu (pour nommer l'erreur).
 * @param total Octets attendus.
 * @param onProgress Rappel de progression.
 * @returns Le texte de la réponse.
 * @throws {DataLoadFailure} `network` si le flux est coupé.
 */
async function readText(response: Response, key: FileKey, total: number, onProgress: ProgressFn): Promise<string> {
  const networkFailure = (): DataLoadFailure =>
    new DataLoadFailure({ kind: 'network', file: key, status: null, message: `« ${FILE_LABELS[key]} » : le téléchargement a été interrompu.` })
  if (!response.body) {
    try {
      const text = await response.text()
      onProgress(total, total)
      return text
    } catch {
      throw networkFailure()
    }
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      onProgress(loaded, total)
    }
  } catch {
    throw networkFailure()
  }
  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Charge un fichier produit : télécharge en lisant le flux (progression en octets), parse, puis vérifie la clé et le nombre d'entrées du manifeste.
 * @param key Clé du fichier.
 * @param entry Description du fichier dans le manifeste.
 * @param onProgress Rappel de progression (octets lus, octets attendus).
 * @param fetchFn Fonction de récupération ; par défaut `fetch`.
 * @param base Base du site ; par défaut `import.meta.env.BASE_URL`.
 * @returns Le contenu du fichier, typé selon la clé.
 * @throws {DataLoadFailure} `network`, `http`, `parse` ou `mismatch`.
 */
export async function fetchDataFile<K extends FileKey>(
  key: K,
  entry: ManifestFileEntry,
  onProgress: ProgressFn = () => {},
  fetchFn: FetchFn = defaultFetch,
  base: string = dataBase(),
): Promise<FileOf<K>> {
  const label = FILE_LABELS[key]
  const url = resolveDataUrl(entry.path, manifestUrl(base))
  let response: Response
  try {
    response = await fetchFn(url)
  } catch {
    throw new DataLoadFailure({ kind: 'network', file: key, status: null, message: `« ${label} » n’a pas pu être téléchargé : vérifiez la connexion.` })
  }
  if (!response.ok) {
    throw new DataLoadFailure({ kind: 'http', file: key, status: response.status, message: `« ${label} » est introuvable sur le serveur (HTTP ${response.status}).` })
  }
  const text = await readText(response, key, entry.bytes, onProgress)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new DataLoadFailure({ kind: 'parse', file: key, status: null, message: `« ${label} » est illisible (JSON invalide).` })
  }
  if (!isRecord(parsed) || parsed.key !== key) {
    throw new DataLoadFailure({ kind: 'mismatch', file: key, status: null, message: `« ${label} » ne contient pas les données attendues.` })
  }
  const count = countEntries(key, parsed)
  if (count !== entry.entries) {
    throw new DataLoadFailure({
      kind: 'mismatch',
      file: key,
      status: null,
      message: `« ${label} » est incomplet : ${count ?? 'aucune'} entrée(s) lue(s) au lieu de ${entry.entries}.`,
    })
  }
  return parsed as unknown as FileOf<K>
}
