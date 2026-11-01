// Accès au stockage du navigateur derrière une interface injectable, avec repli en mémoire (docs/architecture.md § 7).
// Seul module de l'application qui touche à `localStorage` et `sessionStorage`.

/** Sous-ensemble de l'API Web Storage utilisé par l'application. */
export interface StorageLike {
  /** Lit une valeur, `null` si la clé est absente. */
  getItem(key: string): string | null
  /** Écrit une valeur ; peut lever une exception (quota, stockage refusé). */
  setItem(key: string, value: string): void
  /** Supprime une clé. */
  removeItem(key: string): void
}

/**
 * Crée un stockage en mémoire : repli quand le stockage du navigateur est indisponible, et double des tests.
 * @param initial Contenu de départ.
 * @returns Un stockage qui n'écrit nulle part.
 */
export function createMemoryStorage(initial: Readonly<Record<string, string>> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

const PROBE_KEY = 'codex-entre-terre:probe'

/**
 * Teste qu'un stockage accepte une écriture (navigation privée, stockage plein ou bloqué refusent).
 * @param storage Stockage à tester.
 * @returns Vrai si l'écriture puis la suppression d'une clé de test réussissent.
 */
export function probeStorage(storage: StorageLike): boolean {
  try {
    storage.setItem(PROBE_KEY, '1')
    storage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

// Lire `window.localStorage` peut lui-même lever une SecurityError (cookies bloqués) : d'où le try.
function browserStorage(kind: 'localStorage' | 'sessionStorage'): StorageLike | null {
  try {
    return ((globalThis as Record<string, unknown>)[kind] as StorageLike | null | undefined) ?? null
  } catch {
    return null
  }
}

/** Stockage ouvert et sa nature. */
export interface OpenedStorage {
  /** Stockage à utiliser (celui du navigateur, ou la mémoire en repli). */
  storage: StorageLike
  /** Vrai si l'état survivra à la fermeture de l'onglet ; faux en mode dégradé. */
  durable: boolean
}

/**
 * Ouvre le stockage durable : le candidat fourni, sinon `localStorage`, avec test d'écriture ; repli en mémoire en cas d'échec.
 * @param candidate Stockage à utiliser (tests) ; par défaut `localStorage`.
 * @returns Le stockage et son caractère durable.
 */
export function openStorage(candidate?: StorageLike | null): OpenedStorage {
  const storage = candidate === undefined ? browserStorage('localStorage') : candidate
  if (storage && probeStorage(storage)) return { storage, durable: true }
  return { storage: createMemoryStorage(), durable: false }
}

/**
 * Ouvre le stockage de session (instantané d'annulation de l'import) ; repli en mémoire.
 * @param candidate Stockage à utiliser (tests) ; par défaut `sessionStorage`.
 * @returns Le stockage de session ou la mémoire.
 */
export function openSessionStorage(candidate?: StorageLike | null): StorageLike {
  return openStorage(candidate === undefined ? browserStorage('sessionStorage') : candidate).storage
}
