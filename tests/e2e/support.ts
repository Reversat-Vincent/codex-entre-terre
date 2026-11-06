// Aides communes aux tests e2e : surveillance des erreurs de console et des requêtes hors du serveur local, lecture des données préparées.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const root = fileURLToPath(new URL('../../', import.meta.url))

/** Problèmes relevés pendant le test. */
export interface Watcher {
  /** Messages d'erreur de la console, exceptions de la page et requêtes échouées. */
  readonly problems: string[]
  /** Adresses des requêtes adressées à un autre serveur que le serveur local. */
  readonly foreign: string[]
}

/**
 * Surveille une page : erreurs de console, exceptions, requêtes échouées et requêtes vers un autre domaine que le serveur local.
 * @param page Page à surveiller (avant toute navigation).
 * @param baseURL Adresse du serveur local, pour reconnaître l'origine autorisée.
 * @returns Les listes alimentées au fil du test.
 */
export function watchPage(page: Page, baseURL: string): Watcher {
  const origin = new URL(baseURL).origin
  const problems: string[] = []
  const foreign: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console : ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`exception : ${error.message}`))
  page.on('requestfailed', (request) => problems.push(`requête échouée : ${request.url()} (${request.failure()?.errorText ?? 'inconnue'})`))
  page.on('request', (request) => {
    const url = request.url()
    if (/^(data|blob|about):/.test(url)) return
    if (new URL(url).origin !== origin) foreign.push(url)
  })
  return { problems, foreign }
}

/** Manifeste des données préparées, partie utile aux tests. */
interface DataManifest {
  files: Record<string, { path: string }>
}

/**
 * Lit le manifeste des données préparées par `npm run data`.
 * @returns Les chemins des fichiers produits, relatifs à `data/`.
 */
export function readDataManifest(): DataManifest {
  return JSON.parse(readFileSync(join(root, 'public', 'data', 'manifest.json'), 'utf-8')) as DataManifest
}

/**
 * Lit les identifiants des entrées d'un fichier de données préparé.
 * @param key Clé du jeu de données (nom du fichier de `data/` sans extension).
 * @returns Les identifiants (`id`) dans l'ordre du fichier.
 */
export function readEntryIds(key: string): string[] {
  const entry = readDataManifest().files[key]
  if (!entry) throw new Error(`Jeu de données « ${key} » absent du manifeste : lancez « npm run data ».`)
  const file = JSON.parse(readFileSync(join(root, 'public', 'data', entry.path), 'utf-8')) as { entries: { id: string }[] }
  return file.entries.map((e) => e.id)
}
