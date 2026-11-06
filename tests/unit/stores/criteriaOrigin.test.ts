// Tests de `setOrigin` du store des critères : reprise des attributs de départ de l'origine choisie quand le joueur ne les a pas modifiés
// (docs/design/ds/calculs.md, « Origine optimale » : niveau = Σ attributs − 79), sur les vraies origines préparées.

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FILE_KEYS } from '../../../src/data/datasets.ts'
import type { FileKey } from '../../../src/data/datasets.ts'
import type { FetchFn } from '../../../src/data/loader.ts'
import type { DataManifest } from '../../../src/data/types/index.ts'
import { levelOf, originAttributes } from '../../../src/engine/level.ts'
import { useCriteriaStore } from '../../../src/stores/criteria.ts'
import { useDataStore } from '../../../src/stores/data.ts'
import { prepared } from '../data/helpers.ts'

const encoder = new TextEncoder()

/** Contenu d'un fichier de données préparé (comme `npm run data`) ; seuls les origines sont réellement demandés par ces tests. */
function fileContent(key: FileKey): unknown {
  const p = prepared()
  if (key === 'tables') return { schema: 1, key: 'tables', tables: p.tables }
  if (key === 'search-index') return { schema: 1, key: 'search-index', docs: p.search }
  return p.datasets[key]
}

const texts = new Map<FileKey, string>(FILE_KEYS.map((k) => [k, JSON.stringify(fileContent(k))]))

function manifest(): DataManifest {
  const files = Object.fromEntries(
    FILE_KEYS.map((k) => {
      const content = fileContent(k) as { entries?: unknown[]; docs?: unknown[]; tables?: object }
      const entries = k === 'tables' ? Object.keys(content.tables ?? {}).length : k === 'search-index' ? (content.docs ?? []).length : (content.entries ?? []).length
      return [k, { path: `${k}.0123456789.json`, bytes: encoder.encode(texts.get(k)!).length, sha256: 'a', entries, label: k }]
    }),
  ) as DataManifest['files']
  return { schema: 1, dataVersion: '0123456789abcdef', retrieved: prepared().retrieved, files }
}

const fetchFn: FetchFn = async (url) => {
  if (url.endsWith('manifest.json')) return Response.json(manifest())
  const key = url.split('/').pop()!.split('.')[0] as FileKey
  return new Response(texts.get(key)!)
}

async function setup(load = true) {
  const data = useDataStore()
  data.configure({ base: '/', fetchFn })
  if (load) await data.ensure(['origins'])
  return useCriteriaStore()
}

const origin = (id: string) => {
  const o = prepared().datasets.origins.entries.find((e) => e.id === id)
  if (!o) throw new Error(id)
  return originAttributes(o)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('setOrigin', () => {
  it('attributs par défaut (10) : adopte ceux de départ, Samurai donne le niveau 9', async () => {
    const criteria = await setup()
    expect(criteria.setOrigin('samurai')).toBe(true)
    expect(criteria.criteria.character.origin).toBe('samurai')
    expect(criteria.criteria.character.attributes).toEqual(origin('samurai'))
    expect(levelOf(criteria.criteria.character.attributes).value).toBe(9)
  })

  it('attributs exactement ceux de l’origine précédente : adopte ceux de la nouvelle', async () => {
    const criteria = await setup()
    criteria.setOrigin('samurai')
    expect(criteria.setOrigin('vagabond')).toBe(true)
    expect(criteria.criteria.character.attributes).toEqual(origin('vagabond'))
  })

  it('attributs modifiés par le joueur : seule l’origine change', async () => {
    const criteria = await setup()
    criteria.setOrigin('samurai')
    criteria.setAttribute('vig', 40)
    const before = { ...criteria.criteria.character.attributes }
    expect(criteria.setOrigin('vagabond')).toBe(false)
    expect(criteria.criteria.character.origin).toBe('vagabond')
    expect(criteria.criteria.character.attributes).toEqual(before)
  })

  it('attributs modifiés alors que l’origine était automatique : attributs conservés', async () => {
    const criteria = await setup()
    criteria.setAttribute('str', 30)
    const before = { ...criteria.criteria.character.attributes }
    expect(criteria.setOrigin('samurai')).toBe(false)
    expect(criteria.criteria.character.attributes).toEqual(before)
  })

  it('« automatique » ne touche pas aux attributs', async () => {
    const criteria = await setup()
    criteria.setOrigin('samurai')
    const before = { ...criteria.criteria.character.attributes }
    expect(criteria.setOrigin('auto')).toBe(false)
    expect(criteria.criteria.character.origin).toBe('auto')
    expect(criteria.criteria.character.attributes).toEqual(before)
  })

  it('revenir à l’origine déjà choisie ne remplace rien', async () => {
    const criteria = await setup()
    criteria.setOrigin('samurai')
    expect(criteria.setOrigin('samurai')).toBe(false)
  })

  it('identifiant inconnu des données ou données non chargées : seule l’origine change', async () => {
    const criteria = await setup()
    for (const id of ['inconnue', 'constructor', '__proto__', 'toString']) {
      expect(criteria.setOrigin(id), id).toBe(false)
      expect(criteria.criteria.character.origin).toBe(id)
      expect(criteria.criteria.character.attributes.vig).toBe(10)
    }
    setActivePinia(createPinia())
    const bare = await setup(false)
    expect(bare.setOrigin('samurai')).toBe(false)
    expect(bare.criteria.character.origin).toBe('samurai')
    expect(bare.criteria.character.attributes.vig).toBe(10)
  })
})
