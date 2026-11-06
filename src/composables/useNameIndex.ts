// Composable `useNameIndex` : index des noms d'entités (nom exact normalisé → références), construit une seule fois depuis le fichier `search-index`
// et partagé par tous les textes du wiki (`WikiText`, `WikiTable`). Référence : docs/architecture.md § 8 et § 10.5.

import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { buildNameIndex } from '../data/links.ts'
import type { NameIndex } from '../data/links.ts'
import type { SearchIndexFile } from '../data/types/searchIndex.ts'
import { useDataStore } from '../stores/data.ts'

/**
 * Index déjà construits, par fichier lu. Le fichier est figé (`markRaw`) et ne change qu'au rechargement : la clé évite de reconstruire
 * l'index (~3 500 documents) pour chaque paragraphe ou cellule d'un article.
 */
const built = new WeakMap<SearchIndexFile, NameIndex>()

/**
 * Index des noms d'entités, ou `null` tant que le fichier `search-index` n'est pas lu (les noms restent alors du texte simple).
 * Ne demande pas le chargement : la vue qui affiche un texte du wiki appelle `ensure(['search-index'])`.
 * @returns Une référence calculée qui se met à jour quand le fichier arrive.
 */
export function useNameIndex(): ComputedRef<NameIndex | null> {
  const data = useDataStore()
  return computed(() => {
    const file = data.file('search-index')
    if (!file) return null
    let index = built.get(file)
    if (!index) {
      index = buildNameIndex(file)
      built.set(file, index)
    }
    return index
  })
}
