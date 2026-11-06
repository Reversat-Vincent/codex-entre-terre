// Tests du pont de persistance avec les vrais stores : écriture différée de 300 ms, pagehide, autre onglet, lecture seule, mode dégradé, remplacement complet.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createBridge } from '../../../src/persistence/bridge.ts'
import type { Bridge, EventSource, StorageMode } from '../../../src/persistence/bridge.ts'
import { buildStoredDocument } from '../../../src/persistence/document.ts'
import { loadStoredState } from '../../../src/persistence/repository.ts'
import { STORAGE_KEYS } from '../../../src/persistence/schema.ts'
import { useCriteriaStore } from '../../../src/stores/criteria.ts'
import { useLayoutStore } from '../../../src/stores/layout.ts'
import { usePinsStore } from '../../../src/stores/pins.ts'
import { useQuestsStore } from '../../../src/stores/quests.ts'
import { usePreferencesStore } from '../../../src/stores/preferences.ts'
import { useProfilesStore } from '../../../src/stores/profiles.ts'
import { useSearchStore } from '../../../src/stores/search.ts'
import { sampleState, spyStorage } from './helpers.ts'
import type { SpyStorage } from './helpers.ts'

type Listener = (event: { key?: string | null }) => void

/** Fenêtre simulée : enregistre les écouteurs et permet de déclencher les événements. */
function fakeWindow(): EventSource & { fire(type: string, event?: { key?: string | null }): void } {
  const listeners = new Map<string, Set<Listener>>()
  return {
    addEventListener: (type, l) => void (listeners.get(type) ?? listeners.set(type, new Set()).get(type))!.add(l),
    removeEventListener: (type, l) => void listeners.get(type)?.delete(l),
    fire: (type, event = {}) => listeners.get(type)?.forEach((l) => l(event)),
  }
}

function setup(storage: SpyStorage, durable = true) {
  const modes: StorageMode[] = []
  const win = fakeWindow()
  const stores = {
    criteria: useCriteriaStore(),
    profiles: useProfilesStore(),
    pins: usePinsStore(),
    quests: useQuestsStore(),
    layout: useLayoutStore(),
    preferences: usePreferencesStore(),
    recentSearches: useSearchStore(),
  }
  const bridge: Bridge = createBridge({ storage, durable, stores, appVersion: '0.1.0', win, now: () => new Date('2026-11-01T10:00:00Z'), onModeChange: (m) => modes.push(m) })
  return { bridge, stores, win, modes }
}

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.useRealTimers()
})

describe('écriture', () => {
  it('attend 300 ms de calme, regroupe les changements, puis écrit une fois', () => {
    const storage = spyStorage()
    const { bridge, stores } = setup(storage)
    bridge.start(loadStoredState(storage))
    stores.preferences.setTheme('parchemin')
    vi.advanceTimersByTime(299)
    expect(storage.writes).toBe(0)
    stores.criteria.setAttribute('vig', 30)
    vi.advanceTimersByTime(299)
    expect(storage.writes).toBe(0)
    vi.advanceTimersByTime(1)
    expect(storage.writes).toBe(1)
    const load = loadStoredState(storage)
    expect(load.kind === 'loaded' && load.state.preferences.theme).toBe('parchemin')
    expect(load.kind === 'loaded' && load.state.criteria.character.attributes.vig).toBe(30)
  })

  it('écrit à pagehide sans attendre', () => {
    const storage = spyStorage()
    const { bridge, stores, win } = setup(storage)
    bridge.start(loadStoredState(storage))
    stores.recentSearches.commit('moonveil')
    expect(storage.writes).toBe(0)
    win.fire('pagehide')
    expect(storage.writes).toBe(1)
    vi.advanceTimersByTime(1000)
    expect(storage.writes).toBe(1)
  })

  it('ne réécrit pas un état identique', () => {
    const storage = spyStorage()
    const { bridge, stores } = setup(storage)
    bridge.start(loadStoredState(storage))
    stores.preferences.setTheme('parchemin')
    vi.advanceTimersByTime(300)
    stores.preferences.setTheme('sombre')
    stores.preferences.setTheme('parchemin')
    vi.advanceTimersByTime(300)
    expect(storage.writes).toBe(1)
  })

  it('restaure l’état au démarrage suivant (hydratation des sept stores)', () => {
    const storage = spyStorage()
    const first = setup(storage)
    first.bridge.start(loadStoredState(storage))
    first.bridge.apply(sampleState())
    first.bridge.stop()

    setActivePinia(createPinia())
    const second = setup(storage)
    second.bridge.start(loadStoredState(storage))
    expect(second.bridge.collect()).toEqual(sampleState())
    expect(second.stores.pins.items).toHaveLength(2)
    expect(second.stores.quests.isDone('melina', 'rest-at-the-site-of-grace')).toBe(true)
    expect(second.stores.preferences.theme).toBe('parchemin')
  })
})

describe('mode dégradé', () => {
  it('stockage non durable : rien n’est écrit, l’application fonctionne', () => {
    const storage = spyStorage()
    const { bridge, stores } = setup(storage, false)
    bridge.start({ kind: 'empty' })
    expect(bridge.mode()).toBe('unavailable')
    stores.pins.pin('weapon:moonveil')
    vi.advanceTimersByTime(1000)
    expect(storage.writes).toBe(0)
    expect(stores.pins.items).toHaveLength(1)
  })

  it('quota dépassé à l’écriture : passe en « unavailable », puis revient à « ok » quand l’écriture réussit', () => {
    const storage = spyStorage()
    const { bridge, stores, modes } = setup(storage)
    bridge.start({ kind: 'empty' })
    storage.failWrites = true
    stores.preferences.setTheme('parchemin')
    vi.advanceTimersByTime(300)
    expect(bridge.mode()).toBe('unavailable')
    storage.failWrites = false
    stores.preferences.setTheme('sombre')
    vi.advanceTimersByTime(300)
    expect(bridge.mode()).toBe('ok')
    expect(modes).toEqual(['unavailable', 'ok'])
  })
})

describe('version stockée plus récente', () => {
  it('lecture seule : l’état affiché vient du document, rien n’est écrit ni écrasé', () => {
    const raw = JSON.stringify({ ...buildStoredDocument(sampleState(), '9.9.9', new Date()), schemaVersion: 5 })
    const storage = spyStorage({ [STORAGE_KEYS.state]: raw })
    const { bridge, stores, win } = setup(storage)
    bridge.start(loadStoredState(storage))
    expect(bridge.mode()).toBe('readonly-newer')
    expect(stores.pins.items).toHaveLength(2)
    stores.preferences.setTheme('sombre')
    win.fire('pagehide')
    vi.advanceTimersByTime(1000)
    expect(storage.writes).toBe(0)
    expect(storage.raw.get(STORAGE_KEYS.state)).toBe(raw)
  })

  it('un autre onglet qui écrit une version plus récente fait passer en lecture seule', () => {
    const storage = spyStorage()
    const { bridge, stores, win } = setup(storage)
    bridge.start(loadStoredState(storage))
    storage.put(STORAGE_KEYS.state, JSON.stringify({ ...buildStoredDocument(sampleState(), '9.9.9', new Date()), schemaVersion: 5 }))
    win.fire('storage', { key: STORAGE_KEYS.state })
    expect(bridge.mode()).toBe('readonly-newer')
    const before = storage.writes
    stores.preferences.setTheme('parchemin')
    vi.advanceTimersByTime(1000)
    expect(storage.writes).toBe(before)
  })
})

describe('autre onglet', () => {
  it('réhydrate les stores sans réécrire en retour', () => {
    const storage = spyStorage()
    const { bridge, stores, win } = setup(storage)
    bridge.start(loadStoredState(storage))
    storage.put(STORAGE_KEYS.state, JSON.stringify(buildStoredDocument(sampleState(), '0.1.0', new Date())))
    win.fire('storage', { key: STORAGE_KEYS.state })
    expect(stores.pins.items).toHaveLength(2)
    expect(stores.preferences.theme).toBe('parchemin')
    vi.advanceTimersByTime(1000)
    expect(storage.writes).toBe(0)
  })

  it('ignore les autres clés', () => {
    const storage = spyStorage()
    const { bridge, stores, win } = setup(storage)
    bridge.start(loadStoredState(storage))
    win.fire('storage', { key: 'autre' })
    win.fire('storage', { key: null })
    expect(stores.pins.items).toHaveLength(0)
  })
})

describe('remplacement complet', () => {
  it('apply remplace tout et écrit aussitôt', () => {
    const storage = spyStorage()
    const { bridge, stores } = setup(storage)
    bridge.start(loadStoredState(storage))
    stores.pins.pin('talisman:radagons-scarseal')
    bridge.apply(sampleState())
    expect(storage.writes).toBe(1)
    expect(stores.pins.items.map((p) => p.ref)).toEqual(['weapon:moonveil', 'boss:margit-the-fell-omen'])
    expect(bridge.collect()).toEqual(sampleState())
  })

  it('une migration au démarrage est réécrite sous la version courante', () => {
    const storage = spyStorage()
    const { bridge } = setup(storage)
    bridge.start({ kind: 'loaded', state: sampleState(), migratedFrom: 1 })
    expect(storage.writes).toBe(1)
  })
})
