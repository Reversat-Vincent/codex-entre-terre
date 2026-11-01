// Tri multicolonne des catalogues (README DataTable, note `spec-catalog`) : clic = tri principal, Maj + clic = tri secondaire numéroté.
// Le tri est stable et les valeurs `null` (non documenté) passent toujours en dernier, quel que soit le sens : un `null` n'est jamais traité comme 0 ni comme une chaîne vide.

/** Sens d'un tri. */
export type SortDirection = 'asc' | 'desc'

/** Un critère de tri : colonne et sens. Dans une liste, le premier est le tri principal, les suivants les tris secondaires. */
export interface SortKey {
  readonly column: string
  readonly direction: SortDirection
}

/** Valeur triable d'une cellule ; `null` ou `undefined` = non documenté. */
export type SortValue = number | string | null | undefined

/**
 * Colonnes triables : pour chaque identifiant de colonne, la fonction qui lit la valeur d'une ligne.
 * @typeParam R Ligne du catalogue.
 */
export type SortAccessors<R> = Readonly<Record<string, (row: R) => SortValue>>

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function isMissing(v: SortValue): v is null | undefined {
  return v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/**
 * Trie des lignes selon une liste de critères, sans modifier l'entrée.
 * Les nombres se comparent comme des nombres, les textes avec l'ordre alphabétique anglais (nombres dans les textes en ordre naturel). Un critère sur une colonne inconnue est ignoré.
 * Le sens ne joue pas sur les `null` : ils sont toujours après les valeurs, et ex æquo entre eux pour ce critère. Égalité sur tous les critères : l'ordre d'entrée est conservé.
 * @param rows Lignes à trier.
 * @param keys Critères, principal en premier. Liste vide : ordre d'entrée.
 * @param accessors Lecture de la valeur de chaque colonne.
 * @returns Une nouvelle liste triée.
 */
export function sortRows<R>(rows: readonly R[], keys: readonly SortKey[], accessors: SortAccessors<R>): R[] {
  const active = keys.flatMap((k) => {
    const get = accessors[k.column]
    return get ? [{ get, sign: k.direction === 'asc' ? 1 : -1 }] : []
  })
  if (active.length === 0) return [...rows]
  // Valeurs lues une fois par ligne et par critère : le tri les compare plusieurs fois.
  const decorated = rows.map((row, index) => ({ row, index, values: active.map((a) => a.get(row)) }))
  decorated.sort((x, y) => {
    for (let i = 0; i < active.length; i++) {
      const a = x.values[i]
      const b = y.values[i]
      const missingA = isMissing(a)
      const missingB = isMissing(b)
      if (missingA || missingB) {
        if (missingA && missingB) continue
        return missingA ? 1 : -1
      }
      const c = compareValues(a as number | string, b as number | string)
      if (c !== 0) return c * (active[i] as { sign: number }).sign
    }
    return x.index - y.index
  })
  return decorated.map((d) => d.row)
}

/**
 * Nouvelle liste de critères après un clic sur un en-tête de colonne.
 * Clic simple : la colonne devient l'unique tri, croissant ; si elle était déjà l'unique tri, le sens s'inverse.
 * Maj + clic : la colonne s'ajoute en tri secondaire (croissant) ; déjà présente, elle passe en décroissant, puis sort de la liste au clic suivant.
 * @param keys Critères actuels.
 * @param column Colonne cliquée.
 * @param additive Vrai si Maj était enfoncée.
 * @returns La nouvelle liste (l'ancienne n'est pas modifiée).
 */
export function toggleSort(keys: readonly SortKey[], column: string, additive: boolean): SortKey[] {
  const current = keys.find((k) => k.column === column)
  if (!additive) {
    const onlyThis = keys.length === 1 && current !== undefined
    return [{ column, direction: onlyThis && current.direction === 'asc' ? 'desc' : 'asc' }]
  }
  if (!current) return [...keys, { column, direction: 'asc' }]
  if (current.direction === 'asc') return keys.map((k) => (k === current ? { column, direction: 'desc' as const } : k))
  return keys.filter((k) => k !== current)
}

/**
 * Rang d'affichage d'un tri dans l'en-tête (`.cx-sort-rank`) : 1 pour le principal, 2 et suivants pour les secondaires.
 * @param keys Critères actuels.
 * @param column Colonne de l'en-tête.
 * @returns Le rang (à partir de 1), ou `null` si la colonne n'est pas triée ; à n'afficher que s'il y a plusieurs critères.
 */
export function sortRank(keys: readonly SortKey[], column: string): number | null {
  const i = keys.findIndex((k) => k.column === column)
  return i < 0 ? null : i + 1
}
