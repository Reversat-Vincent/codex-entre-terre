// Tests de la lecture et de l'écriture du document stocké : migration avec sauvegarde, version plus récente intacte, document illisible, stockage indisponible.
import { describe, expect, it } from 'vitest'
import { buildStoredDocument } from '../../../src/persistence/document.ts'
import { loadStoredState, writeStoredState } from '../../../src/persistence/repository.ts'
import { STORAGE_KEYS } from '../../../src/persistence/schema.ts'
import { createMemoryStorage, openSessionStorage, openStorage, probeStorage } from '../../../src/persistence/storage.ts'
import type { StorageLike } from '../../../src/persistence/storage.ts'
import { sampleState, spyStorage } from './helpers.ts'

const NOW = new Date('2026-11-01T10:00:00Z')
const stored = (extra: Record<string, unknown> = {}): string => JSON.stringify({ ...buildStoredDocument(sampleState(), '0.1.0', NOW), ...extra })

describe('loadStoredState', () => {
  it('stockage vide : rien à charger, aucune écriture', () => {
    const storage = spyStorage()
    expect(loadStoredState(storage)).toEqual({ kind: 'empty' })
    expect(storage.writes).toBe(0)
  })

  it('écrit puis relit le même état', () => {
    const storage = spyStorage()
    expect(writeStoredState(storage, sampleState(), '0.1.0', NOW)).toEqual({ ok: true })
    const load = loadStoredState(storage)
    expect(load.kind === 'loaded' && load.state).toEqual(sampleState())
    expect(load.kind === 'loaded' && load.migratedFrom).toBeNull()
  })

  it('migre une version plus ancienne après avoir copié le document brut', () => {
    const raw = stored({ schemaVersion: 1 })
    const storage = spyStorage({ [STORAGE_KEYS.state]: raw })
    const load = loadStoredState(storage, { currentSchema: 2, migrations: { 1: (s) => s } })
    expect(load.kind === 'loaded' && load.migratedFrom).toBe(1)
    expect(storage.raw.get(STORAGE_KEYS.backup(1))).toBe(raw)
    // Le document courant n'est pas touché par la lecture.
    expect(storage.raw.get(STORAGE_KEYS.state)).toBe(raw)
  })

  it('version plus récente : lecture seule, aucune écriture, contenu lisible si valide', () => {
    const raw = stored({ schemaVersion: 7, futur: true })
    const storage = spyStorage({ [STORAGE_KEYS.state]: raw })
    const load = loadStoredState(storage)
    expect(load.kind).toBe('newer')
    if (load.kind === 'newer') {
      expect(load.version).toBe(7)
      expect(load.state).toEqual(sampleState())
    }
    expect(storage.writes).toBe(0)
    expect(storage.raw.get(STORAGE_KEYS.state)).toBe(raw)
  })

  it('version plus récente au contenu inexploitable : pas d’état, document intact', () => {
    const raw = JSON.stringify({ app: 'codex-entre-terre', schemaVersion: 9, state: 'autre forme' })
    const storage = spyStorage({ [STORAGE_KEYS.state]: raw })
    const load = loadStoredState(storage)
    expect(load).toMatchObject({ kind: 'newer', version: 9, state: null })
    expect(storage.writes).toBe(0)
  })

  it('document illisible : copie brute conservée, valeurs par défaut', () => {
    const storage = spyStorage({ [STORAGE_KEYS.state]: '{cassé' })
    const load = loadStoredState(storage)
    expect(load.kind).toBe('invalid')
    expect(storage.raw.get(STORAGE_KEYS.backupInvalid)).toBe('{cassé')
  })

  it('un stockage qui lève à la lecture est traité comme vide', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('refusé')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(loadStoredState(storage)).toEqual({ kind: 'empty' })
  })
})

describe('stockage indisponible', () => {
  const refusing: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('quota', 'QuotaExceededError')
    },
    removeItem: () => {},
  }

  it('le test d’écriture détecte un stockage qui refuse', () => {
    expect(probeStorage(refusing)).toBe(false)
    expect(probeStorage(createMemoryStorage())).toBe(true)
  })

  it('repli en mémoire, non durable, qui fonctionne quand même', () => {
    const opened = openStorage(refusing)
    expect(opened.durable).toBe(false)
    opened.storage.setItem('k', 'v')
    expect(opened.storage.getItem('k')).toBe('v')
  })

  it('aucun stockage du tout (null, ou absent de l’environnement)', () => {
    expect(openStorage(null).durable).toBe(false)
    // Sous Node, `localStorage` n'existe pas : le repli est le comportement attendu.
    expect(openStorage().durable).toBe(false)
    openSessionStorage(null).setItem('k', 'v')
  })

  it('l’écriture qui échoue est rapportée sans exception', () => {
    const result = writeStoredState(refusing, sampleState(), '0.1.0', NOW)
    expect(result.ok).toBe(false)
  })

  it('un stockage valide est durable', () => {
    expect(openStorage(createMemoryStorage()).durable).toBe(true)
  })
})
