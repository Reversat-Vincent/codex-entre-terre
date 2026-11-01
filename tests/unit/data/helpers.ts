// Accès communs des tests de données : fichiers bruts de data/, préparation en mémoire (mise en cache par fichier de test) et fixtures.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRawDatasets } from '../../../scripts/data/io.ts'
import type { RawDataset } from '../../../scripts/data/io.ts'
import { prepareAll } from '../../../scripts/data/pipeline.ts'
import type { PreparedData } from '../../../scripts/data/pipeline.ts'
import type { DatasetKey } from '../../../src/data/datasets.ts'

export const ROOT = process.cwd()

export function rawData(): Record<DatasetKey, RawDataset> {
  return readRawDatasets(join(ROOT, 'data'))
}

let cache: PreparedData | null = null

export function prepared(): PreparedData {
  cache ??= prepareAll(rawData())
  return cache
}

export function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', `${name}.json`), 'utf-8')) as T
}
