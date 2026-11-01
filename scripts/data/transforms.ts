// Transformations sans perte consignées dans `transforms` : sections hétérogènes des PNJ ramenées à `RichSection`, doublons de `key_items` fusionnés.
// Référence : docs/architecture.md § 3.2.

import type { RichSection, WikiSection } from '../../src/data/types/common.ts'
import type { KeyItemRaw } from '../../src/data/types/keyItems.ts'

/**
 * Ramène une section de PNJ à `RichSection` : une liste de lignes devient `{ text, tables: [] }`, une section garde ses lignes et ses tableaux.
 * Sans perte : les sections d'origine n'ont que `text` et `tables` (contrôlé par le schéma de `npcs`).
 * @param value Valeur d'origine.
 * @returns La section uniforme.
 */
export function toRichSection(value: readonly string[] | WikiSection): RichSection {
  if (isStringList(value)) return { text: value, tables: [] }
  return { text: value.text, tables: value.tables ?? [] }
}

function isStringList(value: readonly string[] | WikiSection): value is readonly string[] {
  return Array.isArray(value)
}

/** Résultat de la fusion des doublons de `key_items`. */
export interface MergedKeyItems {
  /** Entrées gardées, dans l'ordre d'origine (première occurrence de chaque page). */
  readonly entries: readonly KeyItemRaw[]
  /** Autres catégories de chaque entrée gardée, au même indice. */
  readonly alsoListedIn: readonly string[][]
  /** Pages fusionnées. */
  readonly merged: readonly string[]
  /** Doublons de page au contenu différent hors `category` (cas bloquant). */
  readonly conflicts: readonly string[]
}

/**
 * Fusionne les entrées de `key_items` qui décrivent la même page (`wiki_page`) et ne diffèrent que par `category`
 * (les 6 Grandes Runes listées sous « Restored Great Runes » et « Containers and Slot Boosters »).
 * @param items Entrées d'origine.
 * @returns Les entrées gardées, leurs autres catégories, les pages fusionnées et les conflits.
 */
export function mergeKeyItemDuplicates(items: readonly KeyItemRaw[]): MergedKeyItems {
  const firstIndex = new Map<string, number>()
  const entries: KeyItemRaw[] = []
  const alsoListedIn: string[][] = []
  const merged: string[] = []
  const conflicts: string[] = []
  for (const item of items) {
    const at = firstIndex.get(item.wiki_page)
    if (at === undefined) {
      firstIndex.set(item.wiki_page, entries.length)
      entries.push(item)
      alsoListedIn.push([])
      continue
    }
    const kept = entries[at] as KeyItemRaw
    if (comparable(kept) !== comparable(item)) {
      conflicts.push(`${item.wiki_page} : deux entrées au contenu différent`)
      continue
    }
    const others = alsoListedIn[at] as string[]
    if (item.category !== kept.category && !others.includes(item.category)) others.push(item.category)
    merged.push(item.wiki_page)
  }
  return { entries, alsoListedIn, merged, conflicts }
}

// Comparaison exacte hors `category`, clés dans l'ordre d'origine.
const comparable = (item: KeyItemRaw): string => JSON.stringify({ ...item, category: null })
