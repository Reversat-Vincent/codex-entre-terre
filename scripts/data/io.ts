// Lecture des 18 fichiers de data/ avec leurs contrôles de forme, empreintes et écriture des fichiers produits.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATASETS, DATASET_KEYS } from '../../src/data/datasets.ts'
import type { DatasetKey } from '../../src/data/datasets.ts'
import { assertNoFailures } from './checks.ts'

/** Fichier brut de data/ : métadonnées et liste d'entrées, encore non validées. */
export interface RawDataset {
  readonly key: DatasetKey
  readonly metadata: unknown
  readonly entries: readonly unknown[]
}

/**
 * Lit les 18 fichiers de data/ et contrôle leur forme générale (bloquant) : fichier présent, JSON valide,
 * exactement les clés `metadata` et la clé de liste attendue, liste non vide.
 * @param dataDir Dossier data/.
 * @returns Les fichiers bruts, par clé.
 * @throws DataCheckError si un fichier manque, est illisible ou n'a pas la forme attendue.
 */
export function readRawDatasets(dataDir: string): Record<DatasetKey, RawDataset> {
  const failures: string[] = []
  const out: Partial<Record<DatasetKey, RawDataset>> = {}
  const present = new Set(readdirSync(dataDir).filter((f) => f.endsWith('.json')))
  for (const key of DATASET_KEYS) {
    const info = DATASETS[key]
    const file = join(dataDir, info.file)
    if (!existsSync(file)) {
      failures.push(`${info.file} : fichier absent`)
      continue
    }
    present.delete(info.file)
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'))
    } catch (e) {
      failures.push(`${info.file} : JSON invalide (${(e as Error).message})`)
      continue
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      failures.push(`${info.file} : objet racine attendu`)
      continue
    }
    const root = parsed as Record<string, unknown>
    const keys = Object.keys(root).sort()
    const expected = ['metadata', info.listKey].sort()
    if (keys.join(',') !== expected.join(',')) {
      failures.push(`${info.file} : clés racine ${keys.join(', ')} au lieu de ${expected.join(', ')}`)
      continue
    }
    const list = root[info.listKey]
    if (!Array.isArray(list) || list.length === 0) {
      failures.push(`${info.file} : « ${info.listKey} » doit être une liste non vide`)
      continue
    }
    out[key] = { key, metadata: root.metadata, entries: list }
  }
  for (const extra of present) failures.push(`${extra} : fichier inattendu dans data/ (18 fichiers attendus)`)
  assertNoFailures('18 fichiers de data/, JSON valide, clé de liste attendue', failures)
  return out as Record<DatasetKey, RawDataset>
}

/**
 * Empreinte SHA-256 d'un texte.
 * @param text Contenu (UTF-8).
 * @returns L'empreinte en hexadécimal (64 caractères).
 */
export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex')
}

/**
 * Vide puis recrée un dossier.
 * @param dir Dossier à vider.
 */
export function resetDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}

/**
 * Écrit un fichier texte en UTF-8, en créant son dossier au besoin.
 * @param dir Dossier de destination.
 * @param name Nom du fichier.
 * @param text Contenu.
 */
export function writeText(dir: string, name: string, text: string): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), text, 'utf-8')
}
