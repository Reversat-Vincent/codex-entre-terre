// Accès communs des tests de données : fichiers bruts de data/, préparation en mémoire (mise en cache par fichier de test) et fixtures.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRawDatasets } from '../../../scripts/data/io.ts'
import type { RawDataset } from '../../../scripts/data/io.ts'
import { prepareAll } from '../../../scripts/data/pipeline.ts'
import type { PreparedData } from '../../../scripts/data/pipeline.ts'
import type { DatasetKey } from '../../../src/data/datasets.ts'

/** Racine du dépôt : Vitest est lancé depuis la racine (`npm run test`). */
export const ROOT = process.cwd()

/**
 * Lit les fichiers bruts de data/ (sans préparation).
 * @returns Chaque jeu de données brut, par clé.
 */
export function rawData(): Record<DatasetKey, RawDataset> {
  return readRawDatasets(join(ROOT, 'data'))
}

let cache: PreparedData | null = null

/**
 * Données préparées en mémoire, comme `npm run data`, sans écrire public/data/. La préparation est faite une fois par fichier de test
 * (cache du module) : elle prend plusieurs secondes.
 * @returns Les jeux préparés, les tables et l'index de recherche.
 */
export function prepared(): PreparedData {
  cache ??= prepareAll(rawData())
  return cache
}

/**
 * Lit une fixture de tests/fixtures/.
 * @param name Nom du fichier, sans `.json`.
 * @returns Son contenu, typé par l'appelant (aucune validation).
 */
export function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', `${name}.json`), 'utf-8')) as T
}
