// Store de la recherche globale : palette ouverte, requête en cours et recherches récentes (8 au plus, seules persistées).
// Référence : docs/architecture.md § 6 et § 8. Le calcul des résultats est dans `src/search/`.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeText } from '../data/slug.ts'
import { LIMITS } from '../persistence/model.ts'

/** Longueur minimale d'une recherche mémorisée : une seule lettre n'est pas une recherche. */
const MIN_RECENT_LENGTH = 2

/**
 * Store de la recherche.
 * Actions : `openPalette()`, `close()` (vide la requête), `commit(texte)` (mémorise la recherche en tête de `recent`, sans doublon à la casse et aux accents près, 8 au plus),
 * `removeRecent(texte)`, `clearRecent()`, `snapshot()` et `hydrate(slice)` pour la persistance.
 */
export const useSearchStore = defineStore('search', () => {
  const open = ref(false)
  const query = ref('')
  const recent = ref<string[]>([])

  function openPalette(): void {
    open.value = true
  }

  function close(): void {
    open.value = false
    query.value = ''
  }

  function commit(text: string): void {
    const term = text.trim().replace(/\s+/g, ' ').slice(0, LIMITS.maxString)
    if (term.length < MIN_RECENT_LENGTH) return
    const key = normalizeText(term)
    recent.value = [term, ...recent.value.filter((r) => normalizeText(r) !== key)].slice(0, LIMITS.maxRecentSearches)
  }

  function removeRecent(text: string): void {
    recent.value = recent.value.filter((r) => r !== text)
  }

  function clearRecent(): void {
    recent.value = []
  }

  function snapshot(): string[] {
    return [...recent.value]
  }

  function hydrate(slice: string[]): void {
    recent.value = slice.slice(0, LIMITS.maxRecentSearches)
  }

  return { open, query, recent, openPalette, close, commit, removeRecent, clearRecent, snapshot, hydrate }
})
