// Tests du chargeur : adresses, manifeste, progression en octets par lecture du flux, erreurs network, http, parse et mismatch (fetch simulé).
import { describe, expect, it, vi } from 'vitest'
import { FILE_KEYS } from '../../../src/data/datasets.ts'
import { DataLoadFailure, fetchDataFile, fetchManifest, manifestUrl, parseManifest, resolveDataUrl } from '../../../src/data/loader.ts'
import type { DataLoadError, FetchFn } from '../../../src/data/loader.ts'
import type { DataManifest, ManifestFileEntry } from '../../../src/data/types/index.ts'

const BASE = '/codex-entre-terre/'
const encoder = new TextEncoder()

/** Réponse dont le corps est servi par morceaux d'octets donnés. */
function streamResponse(chunks: Uint8Array[], init: ResponseInit = {}): Response {
  let i = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[i++]
      if (chunk) controller.enqueue(chunk)
      else controller.close()
    },
  })
  return new Response(body, init)
}

const split = (text: string, parts: number): Uint8Array[] => {
  const bytes = encoder.encode(text)
  const size = Math.ceil(bytes.length / parts)
  return Array.from({ length: parts }, (_, i) => bytes.slice(i * size, (i + 1) * size)).filter((c) => c.length > 0)
}

const file = { schema: 1, key: 'bosses', entries: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
const fileText = JSON.stringify(file)
const entry = (over: Partial<ManifestFileEntry> = {}): ManifestFileEntry => ({
  path: 'bosses.abc1234567.json',
  bytes: encoder.encode(fileText).length,
  sha256: 'x'.repeat(64),
  entries: 3,
  label: 'Boss',
  ...over,
})

async function failureOf(promise: Promise<unknown>): Promise<DataLoadError> {
  try {
    await promise
  } catch (e) {
    if (e instanceof DataLoadFailure) return e.detail
    throw e
  }
  throw new Error('échec attendu')
}

describe('adresses', () => {
  it('construit l’adresse du manifeste depuis la base, avec ou sans barre finale', () => {
    expect(manifestUrl('/codex-entre-terre/')).toBe('/codex-entre-terre/data/manifest.json')
    expect(manifestUrl('/codex-entre-terre')).toBe('/codex-entre-terre/data/manifest.json')
    expect(manifestUrl('/')).toBe('/data/manifest.json')
  })

  it('résout le chemin relatif au manifeste', () => {
    expect(resolveDataUrl('bosses.abc.json', '/codex-entre-terre/data/manifest.json')).toBe('/codex-entre-terre/data/bosses.abc.json')
    expect(resolveDataUrl('bosses.abc.json', 'https://exemple.test/x/data/manifest.json')).toBe('https://exemple.test/x/data/bosses.abc.json')
  })
})

describe('manifeste', () => {
  const valid = (): DataManifest => ({
    schema: 1,
    dataVersion: 'abcdef0123456789',
    retrieved: '2026-10-31',
    files: Object.fromEntries(FILE_KEYS.map((k) => [k, { path: `${k}.0123456789.json`, bytes: 10, sha256: 'a', entries: 1, label: k }])) as DataManifest['files'],
  })

  it('le charge avec no-cache', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => Response.json(valid()))
    const m = await fetchManifest(BASE, fetchFn)
    expect(m.dataVersion).toBe('abcdef0123456789')
    expect(fetchFn).toHaveBeenCalledWith('/codex-entre-terre/data/manifest.json', { cache: 'no-cache' })
  })

  it('signale réseau, HTTP, JSON illisible et manifeste incomplet', async () => {
    const network = await failureOf(
      fetchManifest(BASE, async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    expect(network).toMatchObject({ kind: 'network', file: 'manifest' })
    expect(await failureOf(fetchManifest(BASE, async () => new Response('', { status: 404 })))).toMatchObject({ kind: 'http', status: 404 })
    expect(await failureOf(fetchManifest(BASE, async () => new Response('<html>')))).toMatchObject({ kind: 'parse' })
    const incomplete = valid()
    delete (incomplete.files as Partial<Record<string, unknown>>).bosses
    expect(await failureOf(fetchManifest(BASE, async () => Response.json(incomplete)))).toMatchObject({ kind: 'mismatch' })
  })

  it('refuse un chemin qui sort du dossier des données et un schéma inconnu', () => {
    const evil = valid()
    ;(evil.files.bosses as { path: string }).path = '../../secret.json'
    expect(() => parseManifest(evil)).toThrow(DataLoadFailure)
    expect(() => parseManifest({ ...valid(), schema: 2 })).toThrow(DataLoadFailure)
    expect(() => parseManifest(null)).toThrow(DataLoadFailure)
  })
})

describe('fetchDataFile', () => {
  it('lit le flux, rapporte la progression en octets et renvoie le contenu', async () => {
    const chunks = split(fileText, 4)
    const progress: [number, number][] = []
    const fetchFn = vi.fn<FetchFn>(async () => streamResponse(chunks))
    const result = await fetchDataFile('bosses', entry(), (loaded, total) => progress.push([loaded, total]), fetchFn, BASE)
    expect(result).toEqual(file)
    expect(fetchFn).toHaveBeenCalledWith('/codex-entre-terre/data/bosses.abc1234567.json')
    expect(progress).toHaveLength(chunks.length)
    expect(progress.map(([l]) => l)).toEqual(chunks.map((_, i) => chunks.slice(0, i + 1).reduce((n, c) => n + c.length, 0)))
    expect(progress.at(-1)).toEqual([encoder.encode(fileText).length, entry().bytes])
  })

  it('compte des octets, pas des caractères (UTF-8 multioctet)', async () => {
    const accented = { ...file, entries: [{ id: 'é' }, { id: 'ô' }, { id: '€' }] }
    const text = JSON.stringify(accented)
    let last = 0
    const result = await fetchDataFile('bosses', entry({ bytes: encoder.encode(text).length }), (l) => (last = l), async () => streamResponse(split(text, 3)), BASE)
    expect(result).toEqual(accented)
    expect(last).toBe(encoder.encode(text).length)
    expect(last).toBeGreaterThan(text.length)
  })

  it('network : la requête échoue', async () => {
    const e = await failureOf(
      fetchDataFile('bosses', entry(), undefined, async () => {
        throw new TypeError('Failed to fetch')
      }, BASE),
    )
    expect(e).toMatchObject({ kind: 'network', file: 'bosses', status: null })
    expect(e.message).toContain('Boss')
  })

  it('network : le flux est coupé en cours de lecture', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"schema":'))
        controller.error(new Error('connexion perdue'))
      },
    })
    const e = await failureOf(fetchDataFile('bosses', entry(), undefined, async () => new Response(body), BASE))
    expect(e.kind).toBe('network')
  })

  it('http : statut hors 2xx', async () => {
    const e = await failureOf(fetchDataFile('bosses', entry(), undefined, async () => new Response('nope', { status: 503 }), BASE))
    expect(e).toMatchObject({ kind: 'http', status: 503 })
  })

  it('parse : JSON illisible', async () => {
    const e = await failureOf(fetchDataFile('bosses', entry(), undefined, async () => streamResponse([encoder.encode('{"schema":1,')]), BASE))
    expect(e.kind).toBe('parse')
  })

  it('mismatch : clé différente, ou nombre d’entrées différent du manifeste', async () => {
    const other = JSON.stringify({ ...file, key: 'npcs' })
    expect(await failureOf(fetchDataFile('bosses', entry(), undefined, async () => streamResponse([encoder.encode(other)]), BASE))).toMatchObject({ kind: 'mismatch' })
    expect(await failureOf(fetchDataFile('bosses', entry({ entries: 4 }), undefined, async () => streamResponse(split(fileText, 2)), BASE))).toMatchObject({ kind: 'mismatch' })
    expect(await failureOf(fetchDataFile('bosses', entry(), undefined, async () => streamResponse([encoder.encode('[1,2]')]), BASE))).toMatchObject({ kind: 'mismatch' })
  })

  it('compte les entrées de tables (objets) et de l’index (documents)', async () => {
    const tables = JSON.stringify({ schema: 1, key: 'tables', tables: { a: {}, b: {}, c: {}, d: {}, e: {} } })
    const index = JSON.stringify({ schema: 1, key: 'search-index', docs: [{}, {}] })
    await expect(fetchDataFile('tables', entry({ entries: 5 }), undefined, async () => streamResponse([encoder.encode(tables)]), BASE)).resolves.toBeDefined()
    await expect(fetchDataFile('search-index', entry({ entries: 2 }), undefined, async () => streamResponse([encoder.encode(index)]), BASE)).resolves.toBeDefined()
    expect((await failureOf(fetchDataFile('tables', entry({ entries: 4 }), undefined, async () => streamResponse([encoder.encode(tables)]), BASE))).kind).toBe('mismatch')
  })

  it('sans flux disponible, lit le texte entier', async () => {
    const response = new Response(fileText)
    Object.defineProperty(response, 'body', { value: null })
    const result = await fetchDataFile('bosses', entry(), undefined, async () => response, BASE)
    expect(result).toEqual(file)
  })
})
