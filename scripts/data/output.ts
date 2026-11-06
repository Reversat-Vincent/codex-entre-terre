// Sérialisation déterministe des fichiers produits et construction du manifeste (docs/architecture.md § 3.1 et § 3.6).

import { DATASET_KEYS, FILE_KEYS, FILE_LABELS } from '../../src/data/datasets.ts'
import type { FileKey } from '../../src/data/datasets.ts'
import type { DataManifest, ManifestFileEntry } from '../../src/data/types/manifest.ts'
import type { SearchIndexFile } from '../../src/data/types/searchIndex.ts'
import type { TablesFile } from '../../src/data/types/tables.ts'
import { sha256 } from './io.ts'
import type { PreparedData } from './pipeline.ts'

/** Longueur de l'empreinte dans le nom servi. */
export const HASH_IN_NAME = 10
/** Nom fixe du manifeste. */
export const MANIFEST_NAME = 'manifest.json'

/** Fichier produit, prêt à écrire. */
export interface OutputFile {
  readonly key: FileKey
  readonly name: string
  readonly text: string
  readonly entries: number
}

/**
 * Sérialise les fichiers produits. JSON minifié, ordre des clés fixé par la construction, aucune date : même entrée, même sortie.
 * @param prepared Données préparées.
 * @returns Les fichiers et le manifeste, dans l'ordre du manifeste.
 */
export function serialize(prepared: PreparedData): { files: OutputFile[]; manifest: DataManifest; manifestText: string } {
  const texts = new Map<FileKey, { text: string; entries: number }>()
  for (const key of DATASET_KEYS) {
    const file = prepared.datasets[key]
    texts.set(key, { text: JSON.stringify(file), entries: file.entries.length })
  }
  const tables: TablesFile = { schema: 1, key: 'tables', tables: prepared.tables }
  texts.set('tables', { text: JSON.stringify(tables), entries: Object.keys(prepared.tables).length })
  const search: SearchIndexFile = { schema: 1, key: 'search-index', docs: prepared.search }
  texts.set('search-index', { text: JSON.stringify(search), entries: prepared.search.length })

  const files: OutputFile[] = []
  const entries = {} as Record<FileKey, ManifestFileEntry>
  for (const key of FILE_KEYS) {
    const t = texts.get(key)
    if (t === undefined) throw new Error(`fichier ${key} non produit`)
    const hash = sha256(t.text)
    const name = `${key}.${hash.slice(0, HASH_IN_NAME)}.json`
    files.push({ key, name, text: t.text, entries: t.entries })
    entries[key] = { path: name, bytes: Buffer.byteLength(t.text, 'utf-8'), sha256: hash, entries: t.entries, label: FILE_LABELS[key] }
  }
  const dataVersion = sha256(FILE_KEYS.map((k) => entries[k].sha256).join('\n')).slice(0, 16)
  const manifest: DataManifest = { schema: 1, dataVersion, retrieved: prepared.retrieved, files: entries }
  return { files, manifest, manifestText: JSON.stringify(manifest) }
}
