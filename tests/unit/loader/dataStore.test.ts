// Tests du store des données : ensure idempotent, état par fichier, retry, index par id et entity(ref), échec isolé par fichier.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FILE_KEYS } from '../../../src/data/datasets.ts'
import type { FetchFn } from '../../../src/data/loader.ts'
import type { DataManifest } from '../../../src/data/types/index.ts'
import { useDataStore } from '../../../src/stores/data.ts'

const encoder = new TextEncoder()

const bosses = { schema: 1, key: 'bosses', entries: [{ id: 'margit-the-fell-omen', name: 'Margit' }, { id: 'patches', name: 'Patches' }] }
const npcs = { schema: 1, key: 'npcs', entries: [{ id: 'patches', name: 'Patches (PNJ)' }] }
const melee = { schema: 1, key: 'melee_armaments', entries: [{ id: 'moonveil', name: 'Moonveil' }] }
const ranged = { schema: 1, key: 'ranged_weapons_catalysts', entries: [{ id: 'carian-regal-scepter', name: 'Carian Regal Scepter' }] }
const contents: Record<string, unknown> = { bosses, npcs, melee_armaments: melee, ranged_weapons_catalysts: ranged }

function manifest(): DataManifest {
  const files = Object.fromEntries(
    FILE_KEYS.map((k) => {
      const content = contents[k]
      const text = JSON.stringify(content ?? {})
      return [k, { path: `${k}.0123456789.json`, bytes: encoder.encode(text).length, sha256: 'a', entries: Array.isArray((content as { entries?: unknown[] })?.entries) ? (content as { entries: unknown[] }).entries.length : 0, label: k }]
    }),
  ) as DataManifest['files']
  return { schema: 1, dataVersion: '0123456789abcdef', retrieved: '2026-10-31', files }
}

function server(options: { failing?: Set<string> } = {}) {
  const calls: string[] = []
  const fetchFn = vi.fn<FetchFn>(async (url) => {
    calls.push(url)
    if (url.endsWith('manifest.json')) return Response.json(manifest())
    const key = url.split('/').pop()!.split('.')[0]!
    if (options.failing?.has(key)) return new Response('', { status: 500 })
    return new Response(JSON.stringify(contents[key]))
  })
  return { fetchFn, calls }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useDataStore', () => {
  it('ensure charge le manifeste puis les fichiers demandés, une seule fois chacun', async () => {
    const { fetchFn, calls } = server()
    const data = useDataStore()
    data.configure({ base: '/', fetchFn })
    await Promise.all([data.ensure(['bosses']), data.ensure(['bosses', 'npcs'])])
    await data.ensure(['bosses'])
    expect(calls.filter((c) => c.includes('manifest'))).toHaveLength(1)
    expect(calls.filter((c) => c.includes('bosses.'))).toHaveLength(1)
    expect(calls.filter((c) => c.includes('npcs.'))).toHaveLength(1)
    expect(data.files.bosses.status).toBe('ready')
    expect(data.files.melee_armaments.status).toBe('idle')
    expect(data.statusOf(['bosses', 'npcs'])).toBe('ready')
    expect(data.statusOf(['bosses', 'melee_armaments'])).toBe('loading')
    expect(data.dataset('bosses')?.entries).toHaveLength(2)
    expect(data.dataset('origins')).toBeNull()
  })

  it('suit la progression en octets', async () => {
    const { fetchFn } = server()
    const data = useDataStore()
    data.configure({ base: '/', fetchFn })
    expect(data.progress.ratio).toBe(0)
    await data.ensure(['bosses', 'npcs'])
    expect(data.progress.bytesLoaded).toBe(data.progress.bytesTotal)
    expect(data.progress.bytesTotal).toBeGreaterThan(0)
    expect(data.progress.ratio).toBe(1)
  })

  it('entity(ref) cherche par genre dans tous les fichiers du genre, sans confondre deux genres', async () => {
    const { fetchFn } = server()
    const data = useDataStore()
    data.configure({ base: '/', fetchFn })
    await data.ensure(['bosses', 'npcs', 'melee_armaments', 'ranged_weapons_catalysts'])
    expect(data.entity('boss:patches')).toMatchObject({ name: 'Patches' })
    expect(data.entity('npc:patches')).toMatchObject({ name: 'Patches (PNJ)' })
    expect(data.entity('weapon:moonveil')).toMatchObject({ name: 'Moonveil' })
    expect(data.entity('weapon:carian-regal-scepter')).toMatchObject({ name: 'Carian Regal Scepter' })
    expect(data.entity('weapon:inconnu')).toBeNull()
    expect(data.entity('spell:moonveil')).toBeNull()
  })

  it('un fichier en échec n’empêche pas les autres ; retry le relance', async () => {
    const failing = new Set(['npcs'])
    const { fetchFn } = server({ failing })
    const data = useDataStore()
    data.configure({ base: '/', fetchFn })
    await data.ensure(['bosses', 'npcs'])
    expect(data.files.bosses.status).toBe('ready')
    expect(data.files.npcs.status).toBe('error')
    expect(data.files.npcs.error).toMatchObject({ kind: 'http', status: 500, file: 'npcs' })
    expect(data.statusOf(['bosses', 'npcs'])).toBe('error')
    expect(data.statusOf(['bosses'])).toBe('ready')
    expect(data.failed(['bosses', 'npcs']).map((f) => f.key)).toEqual(['npcs'])

    // ensure ne relance pas un fichier en échec.
    const callsBefore = fetchFn.mock.calls.length
    await data.ensure(['npcs'])
    expect(fetchFn.mock.calls.length).toBe(callsBefore)

    failing.clear()
    await data.retry('npcs')
    expect(data.files.npcs.status).toBe('ready')
    expect(data.entity('npc:patches')).not.toBeNull()
  })

  it('échec du manifeste : état d’erreur, puis retry recharge les fichiers demandés', async () => {
    let down = true
    const inner = server().fetchFn
    const fetchFn = vi.fn<FetchFn>(async (url, init) => {
      if (down && url.endsWith('manifest.json')) throw new TypeError('hors ligne')
      return inner(url, init)
    })
    const data = useDataStore()
    data.configure({ base: '/', fetchFn })
    await data.ensure(['bosses'])
    expect(data.manifestStatus).toBe('error')
    expect(data.statusOf(['bosses'])).toBe('error')
    expect(data.failed(['bosses'])[0]).toMatchObject({ key: 'manifest' })
    down = false
    await data.retry('manifest')
    expect(data.manifestStatus).toBe('ready')
    expect(data.files.bosses.status).toBe('ready')
  })
})
