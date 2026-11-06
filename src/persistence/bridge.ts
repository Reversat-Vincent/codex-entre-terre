// Pont entre les stores persistés et le stockage : abonnement aux stores, écriture après 300 ms de calme et à `pagehide`,
// réhydratation sur l'événement `storage` d'un autre onglet, lecture seule si la version stockée est plus récente, mode dégradé.
// Référence : docs/architecture.md § 6 (snapshot/hydrate) et § 7 (écriture, mode dégradé). Seul appelant de `snapshot()` et `hydrate()`.

import { effectScope, watch } from 'vue'
import type { EffectScope } from 'vue'
import type { PersistedState } from './model.ts'
import { loadStoredState, writeStoredState } from './repository.ts'
import type { StoredLoad } from './repository.ts'
import { STORAGE_KEYS } from './schema.ts'
import type { StorageLike } from './storage.ts'

/** État du stockage vu par l'interface (architecture § 6) : `ok`, `unavailable` (mémoire seule) ou `readonly-newer` (version stockée plus récente). */
export type StorageMode = 'ok' | 'unavailable' | 'readonly-newer'

/**
 * Store persisté : expose sa tranche d'état à l'écriture (`snapshot`) et la reçoit à la lecture (`hydrate`).
 * @typeParam T Type de la tranche.
 */
export interface SliceStore<T> {
  /** Copie profonde, indépendante du store, de la tranche persistée. */
  snapshot(): T
  /** Remplace la tranche par une valeur déjà validée. */
  hydrate(slice: T): void
}

/** Les sept tranches de l'état persisté, chacune portée par un store. */
export type BridgeStores = { [K in keyof PersistedState]: SliceStore<PersistedState[K]> }

/** Cible d'événements minimale (`window`, ou un `EventTarget` dans les tests). */
export interface EventSource {
  addEventListener(type: string, listener: (event: { key?: string | null }) => void): void
  removeEventListener(type: string, listener: (event: { key?: string | null }) => void): void
}

/** Réglages du pont. */
export interface BridgeOptions {
  /** Stockage à utiliser. */
  storage: StorageLike
  /** Faux si le stockage est un repli en mémoire (mode dégradé). */
  durable: boolean
  /** Stores persistés. */
  stores: BridgeStores
  /** Version de l'application, écrite dans le document. */
  appVersion: string
  /** Fenêtre pour `pagehide` et `storage` ; `null` hors navigateur. */
  win?: EventSource | null
  /** Horloge (tests). */
  now?: () => Date
  /** Délai de calme avant l'écriture, en ms (300 par défaut). */
  delayMs?: number
  /** Appelé à chaque changement de mode. */
  onModeChange?: (mode: StorageMode) => void
}

/** Pont actif. */
export interface Bridge {
  /** Mode courant du stockage. */
  readonly mode: () => StorageMode
  /**
   * Hydrate les stores depuis le résultat de la lecture, puis s'abonne aux stores et à la fenêtre.
   * Une migration est réécrite aussitôt sous la version courante.
   */
  start(load: StoredLoad): void
  /** Rassemble l'état courant des sept stores. */
  collect(): PersistedState
  /**
   * Remplace tout l'état (import, annulation) : hydrate les stores sans déclencher l'écriture différée, puis écrit tout de suite.
   * Sans effet sur le stockage en lecture seule : l'état n'est alors remplacé qu'en mémoire.
   */
  apply(state: PersistedState): void
  /** Écrit immédiatement s'il y a des changements en attente. */
  flush(): void
  /** Se désabonne et annule l'écriture différée. */
  stop(): void
}

const KEYS: readonly (keyof PersistedState)[] = ['criteria', 'profiles', 'pins', 'quests', 'layout', 'preferences', 'recentSearches']

/**
 * Crée le pont de persistance. Rien n'est lu ni écrit avant `start`.
 * @param options Stockage, stores et réglages.
 * @returns Le pont.
 */
export function createBridge(options: BridgeOptions): Bridge {
  const { storage, stores, appVersion } = options
  const delayMs = options.delayMs ?? 300
  const now = options.now ?? ((): Date => new Date())
  let mode: StorageMode = options.durable ? 'ok' : 'unavailable'
  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false
  // Les observateurs sont synchrones : pendant une hydratation, ils se déclenchent dans l'appel, d'où un drapeau plutôt qu'une comparaison.
  let suppress = false
  // Dernier état écrit ou lu : évite de réécrire un document identique (et d'envoyer un événement `storage` inutile aux autres onglets).
  let lastSerialized: string | null = null
  let scope: EffectScope | null = null

  function setMode(next: StorageMode): void {
    if (next === mode) return
    mode = next
    options.onModeChange?.(mode)
  }

  function collect(): PersistedState {
    const out = {} as Record<string, unknown>
    for (const key of KEYS) out[key] = stores[key].snapshot()
    return out as unknown as PersistedState
  }

  function hydrateAll(state: PersistedState): void {
    suppress = true
    try {
      for (const key of KEYS) (stores[key] as SliceStore<unknown>).hydrate(state[key])
    } finally {
      suppress = false
    }
  }

  function cancelPending(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    dirty = false
  }

  function flush(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    if (!dirty) return
    dirty = false
    // Lecture seule ou mémoire seule : rien n'est écrit, la version stockée reste intacte.
    if (mode === 'readonly-newer' || !options.durable) return
    const state = collect()
    const serialized = JSON.stringify(state)
    if (serialized === lastSerialized) return
    const result = writeStoredState(storage, state, appVersion, now())
    if (result.ok) {
      lastSerialized = serialized
      setMode('ok')
    } else {
      // Quota plein ou stockage refusé : l'application continue en mémoire et le signale ; la prochaine modification réessaiera.
      setMode('unavailable')
    }
  }

  function schedule(): void {
    dirty = true
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  }

  function onStorageEvent(event: { key?: string | null }): void {
    // `key === null` : le stockage entier a été vidé ; l'état de cet onglet reste la référence et sera réécrit à la prochaine modification.
    if (event.key !== STORAGE_KEYS.state) return
    const load = loadStoredState(storage)
    if (load.kind === 'newer') {
      cancelPending()
      setMode('readonly-newer')
    } else if (load.kind === 'loaded') {
      // Un autre onglet a écrit : son état fait foi, l'écriture en attente de celui-ci est abandonnée.
      cancelPending()
      hydrateAll(load.state)
      lastSerialized = JSON.stringify(collect())
      if (mode === 'readonly-newer') setMode('ok')
    }
  }

  const onPageHide = (): void => flush()

  return {
    mode: () => mode,
    collect,
    flush,
    start(load) {
      if (load.kind === 'newer') {
        setMode('readonly-newer')
        if (load.state) hydrateAll(load.state)
      } else if (load.kind === 'loaded') {
        hydrateAll(load.state)
      }
      lastSerialized = load.kind === 'loaded' && load.migratedFrom === null ? JSON.stringify(collect()) : null
      scope = effectScope()
      scope.run(() => {
        for (const key of KEYS) {
          watch(
            () => stores[key].snapshot(),
            () => {
              if (!suppress) schedule()
            },
            { flush: 'sync' },
          )
        }
      })
      options.win?.addEventListener('pagehide', onPageHide)
      options.win?.addEventListener('storage', onStorageEvent)
      // Un document migré est réécrit sous la version courante (la copie brute existe déjà dans `backup-v<N>`).
      if (load.kind === 'loaded' && load.migratedFrom !== null) {
        dirty = true
        flush()
      }
    },
    apply(state) {
      cancelPending()
      hydrateAll(state)
      dirty = true
      flush()
    },
    stop() {
      scope?.stop()
      scope = null
      options.win?.removeEventListener('pagehide', onPageHide)
      options.win?.removeEventListener('storage', onStorageEvent)
      flush()
    },
  }
}
