// Aides des tests de persistance : état d'exemple complet et non trivial, stockage espion.
import { defaultCriteria } from '../../../src/stores/criteria.ts'
import { defaultLayout } from '../../../src/stores/layout.ts'
import { defaultPreferences } from '../../../src/stores/preferences.ts'
import type { PersistedState } from '../../../src/persistence/model.ts'
import { createMemoryStorage } from '../../../src/persistence/storage.ts'
import type { StorageLike } from '../../../src/persistence/storage.ts'

/** État d'exemple dont aucune tranche n'est à sa valeur par défaut. */
export function sampleState(): PersistedState {
  const criteria = defaultCriteria()
  criteria.character.origin = 'auto'
  criteria.character.attributes.vig = 40
  criteria.style.status = 'blood_loss'
  criteria.target = { archetype: 'str', level: 713 }
  criteria.progress.defeated = [
    'margit-the-fell-omen/margit-the-fell-omen',
    'godrick-the-grafted/godrick-the-grafted-phase-1',
    'red-wolf-of-radagon/red-wolf-of-radagon',
    'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-1',
  ]
  const other = defaultCriteria()
  other.style.mode = 'magic'
  other.style.hands = 2
  const layout = defaultLayout()
  layout.order = ['boss-order', 'weapons-by-stage', 'optimal-origin', 'weakness-matrix', 'upgrade-plan', 'rune-calculator', 'attribute-yield']
  layout.hidden = ['data-coverage']
  layout.collapsed = ['boss-order']
  return {
    criteria,
    profiles: {
      items: [{ id: 'p-1', name: 'Mage', criteria: other, savedAt: '2026-11-01T10:00:00.000Z' }],
      activeId: 'p-1',
    },
    pins: [
      { ref: 'weapon:moonveil', addedAt: '2026-11-01T10:00:00.000Z', done: true },
      { ref: 'boss:margit-the-fell-omen', addedAt: '2026-11-01T10:01:00.000Z', done: false },
    ],
    quests: { melina: ['speak-to-melina-at-the-site-of-grace', 'rest-at-the-site-of-grace'], 'boc-the-seamster': ['speak-to-boc'] },
    layout,
    preferences: { ...defaultPreferences(), theme: 'parchemin', navRail: 'rail', catalogView: { weapons: 'grid' }, catalogColumns: { weapons: ['name', 'weight'] } },
    recentSearches: ['moonveil', 'jolan'],
  }
}

/** Stockage mémoire qui compte les écritures et peut être forcé à échouer. */
export interface SpyStorage extends StorageLike {
  writes: number
  failWrites: boolean
  raw: Map<string, string>
  /** Écrit une valeur comme le ferait un autre onglet : sans être comptée. */
  put(key: string, value: string): void
}

/**
 * Crée un stockage espion.
 * @param initial Contenu de départ.
 * @returns Un stockage qui compte les `setItem`.
 */
export function spyStorage(initial: Record<string, string> = {}): SpyStorage {
  const inner = createMemoryStorage(initial)
  const raw = new Map<string, string>(Object.entries(initial))
  const spy: SpyStorage = {
    writes: 0,
    failWrites: false,
    raw,
    put(k, v) {
      inner.setItem(k, v)
      raw.set(k, v)
    },
    getItem: (k) => inner.getItem(k),
    setItem(k, v) {
      if (spy.failWrites) throw new DOMException('quota', 'QuotaExceededError')
      spy.writes++
      inner.setItem(k, v)
      raw.set(k, v)
    },
    removeItem(k) {
      inner.removeItem(k)
      raw.delete(k)
    },
  }
  return spy
}
