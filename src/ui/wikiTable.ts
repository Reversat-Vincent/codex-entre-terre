// Modèle d'affichage d'un tableau du wiki pour `WikiTable` (docs/architecture.md § 10.5) : colonnes, en-têtes à un ou deux niveaux
// (`A / B`), cellules typées et formatées. Aucun calcul sur les données : seulement de la mise en forme (`src/ui/format.ts`).

import { formatDecimal, formatInt } from './format.ts'

/** Cellule telle que dans data/ ; `null` = non documenté (jamais remplacé par 0 ni par du vide). */
export type RawWikiCell = string | number | null

/** Ligne telle que dans data/ : objet (colonne → valeur) ou liste de cellules. */
export type RawWikiRow = Readonly<Record<string, RawWikiCell>> | readonly RawWikiCell[]

/** Cellule prête à l'affichage : `number` formaté, `text` brut, `null` (non documenté) ou `empty` (colonne absente de la ligne). */
export interface WikiCellModel {
  readonly kind: 'text' | 'number' | 'null' | 'empty'
  readonly text: string
}

/** Cellule d'en-tête, avec son étendue. */
export interface WikiHeadCell {
  readonly text: string
  readonly colspan: number
  readonly rowspan: number
  /** Vrai pour un en-tête de groupe (niveau 1 sur deux niveaux) : centré, sans tri. */
  readonly group: boolean
  /** Rang de la première colonne couverte (pour aligner le titre sur ses chiffres). */
  readonly column: number
}

/** Tableau prêt à l'affichage. */
export interface WikiTableModel {
  /** Lignes d'en-tête : aucune (tableau sans titres de colonnes), une ou deux. */
  readonly head: readonly (readonly WikiHeadCell[])[]
  /** Corps du tableau : une liste de cellules par ligne, toutes de la même longueur. */
  readonly rows: readonly (readonly WikiCellModel[])[]
  /** Pour chaque colonne : vrai si elle ne contient que des nombres (alignement à droite). */
  readonly numeric: readonly boolean[]
  /** Vrai si la première colonne tient lieu d'en-tête de ligne (tableaux sans titres de colonnes). */
  readonly rowHeader: boolean
}

/** Séparateur des deux niveaux d'un en-tête (`HP increase per Vigor level / HP`). */
const LEVEL_SEPARATOR = ' / '
/** Nombre maximal de décimales affichées pour un nombre non entier du wiki (le plus long dans data/ en a 3). */
const MAX_DECIMALS = 3

/**
 * Cellule affichable d'une valeur de data/.
 * @param value Valeur ; `undefined` si la ligne n'a pas cette colonne.
 * @returns `null` → `null` (rendu « Non documenté » par `CxValue`) ; nombre → formaté à la française ; texte → tel quel ; absent ou vide → `empty`.
 */
export function toCellModel(value: RawWikiCell | undefined): WikiCellModel {
  if (value === null) return { kind: 'null', text: '' }
  if (value === undefined || value === '') return { kind: 'empty', text: '' }
  if (typeof value === 'number') return { kind: 'number', text: Number.isInteger(value) ? formatInt(value) : formatDecimal(value, MAX_DECIMALS) }
  return { kind: 'text', text: value }
}

/**
 * Titres de colonnes d'un tableau à lignes objets, dans l'ordre de première apparition (les lignes d'un même tableau n'ont pas toutes les mêmes clés).
 * @param rows Lignes du tableau.
 * @returns Les titres, sans doublon.
 */
function objectColumns(rows: readonly RawWikiRow[]): string[] {
  const seen = new Set<string>()
  for (const row of rows) {
    if (!Array.isArray(row)) for (const key of Object.keys(row)) seen.add(key)
  }
  return [...seen]
}

/**
 * En-têtes à deux niveaux : un titre `A / B` donne le groupe `A` (fusionné sur les colonnes voisines de même groupe) et le sous-titre `B` ;
 * un titre sans séparateur occupe les deux niveaux.
 * @param titles Titres de colonnes.
 * @returns Les deux lignes d'en-tête, ou une seule si aucun titre n'a de séparateur.
 */
function buildHead(titles: readonly string[]): WikiHeadCell[][] {
  const split = titles.map((t) => {
    const at = t.indexOf(LEVEL_SEPARATOR)
    return at === -1 ? { group: null, sub: t } : { group: t.slice(0, at), sub: t.slice(at + LEVEL_SEPARATOR.length) }
  })
  if (split.every((s) => s.group === null)) return [titles.map((text, column) => ({ text, colspan: 1, rowspan: 1, group: false, column }))]
  const top: WikiHeadCell[] = []
  const bottom: WikiHeadCell[] = []
  let previous: string | null = null
  for (const [column, s] of split.entries()) {
    if (s.group === null) {
      top.push({ text: s.sub, colspan: 1, rowspan: 2, group: false, column })
      previous = null
      continue
    }
    const last = top[top.length - 1]
    if (previous === s.group && last !== undefined) top[top.length - 1] = { ...last, colspan: last.colspan + 1 }
    else top.push({ text: s.group, colspan: 1, rowspan: 1, group: true, column })
    previous = s.group
    bottom.push({ text: s.sub, colspan: 1, rowspan: 1, group: false, column })
  }
  return [top, bottom]
}

/**
 * Construit le modèle d'affichage d'un tableau du wiki.
 * - Lignes objets : une colonne par clé (union des clés, ordre de première apparition) ; une clé absente d'une ligne donne une case vide
 *   (écart de structure du wiki, pas une donnée `null`).
 * - Lignes en listes : pas de titres ; les lignes plus courtes sont complétées, les colonnes entièrement vides (colonne d'icône du wiki) sont retirées,
 *   et la première colonne devient l'en-tête de ligne.
 * @param rows Lignes du tableau, telles que dans data/.
 * @returns Le modèle (en-têtes, cellules, colonnes numériques).
 */
export function buildWikiTable(rows: readonly RawWikiRow[]): WikiTableModel {
  const titles = objectColumns(rows)
  const hasTitles = titles.length > 0
  let width = titles.length
  if (!hasTitles) for (const row of rows) width = Math.max(width, Array.isArray(row) ? row.length : 0)
  const grid = rows.map((row) =>
    Array.from({ length: width }, (_, i) => {
      if (Array.isArray(row)) return toCellModel((row as readonly RawWikiCell[])[i])
      return toCellModel(hasTitles ? (row as Readonly<Record<string, RawWikiCell>>)[titles[i] ?? ''] : undefined)
    }),
  )
  const keep = Array.from({ length: width }, (_, i) => i).filter((i) => hasTitles || grid.some((row) => row[i]?.kind !== 'empty'))
  const kept = grid.map((row) => keep.map((i) => row[i] as WikiCellModel))
  const numeric = keep.map((_, c) => {
    const cells = kept.map((row) => row[c] as WikiCellModel).filter((cell) => cell.kind !== 'empty' && cell.kind !== 'null')
    return cells.length > 0 && cells.every((cell) => cell.kind === 'number')
  })
  return {
    head: hasTitles ? buildHead(keep.map((i) => titles[i] as string)) : [],
    rows: kept,
    numeric,
    rowHeader: !hasTitles,
  }
}
