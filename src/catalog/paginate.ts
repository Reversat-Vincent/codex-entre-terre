// Pagination des catalogues par pages de 50 (docs/architecture.md § 15, P5). « Tout afficher » (liste virtualisée côté interface) est une page unique.

/** Taille d'une page de catalogue (décision P5). */
export const PAGE_SIZE = 50

/**
 * Une page de résultats.
 * @typeParam T Élément de la liste.
 */
export interface Page<T> {
  /** Éléments de la page. */
  readonly items: readonly T[]
  /** Numéro de la page, à partir de 1, ramené dans les bornes. */
  readonly page: number
  /** Nombre de pages (1 au minimum, même sans résultat). */
  readonly pageCount: number
  /** Nombre total d'éléments. */
  readonly total: number
  /** Taille de page utilisée. */
  readonly pageSize: number
  /** Rang du premier élément affiché, à partir de 1 ; 0 si la liste est vide. */
  readonly from: number
  /** Rang du dernier élément affiché ; 0 si la liste est vide. */
  readonly to: number
}

/**
 * Découpe une liste en pages. Un numéro hors bornes ou non entier est ramené à la première ou à la dernière page, ce qui évite une page vide
 * après un changement de filtre.
 * @param rows Liste complète, déjà filtrée et triée.
 * @param page Numéro de page demandé, à partir de 1.
 * @param pageSize Taille de page (`PAGE_SIZE` par défaut) ; `Infinity` pour « Tout afficher » ; une valeur inférieure à 1 est remplacée par `PAGE_SIZE`.
 * @returns La page et ses repères d'affichage (« 51–100 sur 704 »).
 */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number = PAGE_SIZE): Page<T> {
  const size = pageSize >= 1 ? pageSize : PAGE_SIZE
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / size))
  const wanted = Number.isFinite(page) ? Math.trunc(page) : 1
  const current = Math.min(Math.max(wanted, 1), pageCount)
  const startIndex = Number.isFinite(size) ? (current - 1) * size : 0
  const items = Number.isFinite(size) ? rows.slice(startIndex, startIndex + size) : rows.slice()
  return {
    items,
    page: current,
    pageCount,
    total,
    pageSize: size,
    from: total === 0 ? 0 : startIndex + 1,
    to: startIndex + items.length,
  }
}
