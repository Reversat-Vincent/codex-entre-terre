// Modèle d'un inventaire de boutique du wiki (PNJ marchands, Bell Bearings) : reconnaissance du tableau et normalisation de ses colonnes.
// Le wiki écrit ces tableaux avec des en-têtes variables (« Item name / # / Runes / Additional condition », « Item Name / Runes / Stock / Notes », « item / cost / stock »…) :
// ce module ne fait que ranger les colonnes sous les quatre rôles de l'interface (objet, prix, stock, condition). Aucune valeur n'est calculée ni inventée.

import type { RawWikiCell, RawWikiRow } from '../../../../ui/wikiTable.ts'

/** Ligne d'un inventaire de boutique prête à afficher. */
export interface ShopRow {
  /** Nom de l'objet, tel que dans le wiki. */
  readonly item: string
  /** Prix : nombre, texte du wiki (« 2,000 - 5,000 »), ou `null` si le wiki ne le donne pas. */
  readonly price: number | string | null
  /** Stock : nombre, texte du wiki (« 20 / ∞ », « ∞ »), ou `null` si le wiki ne le donne pas. */
  readonly stock: number | string | null
  /** Condition d'obtention (disponibilité, Remembrance requise…), telle que dans le wiki ; `null` : aucune condition écrite pour cette ligne. */
  readonly condition: string | null
  /** La condition est une Remembrance à rapporter (colonne « Required remembrance ») : le libellé le dit. */
  readonly remembrance: boolean
}

/** Inventaire de boutique normalisé. */
export interface ShopTableModel {
  /** Monnaie du prix, selon l'en-tête de la colonne : « runes » ou « Starlight Shards ». */
  readonly currency: string
  readonly rows: readonly ShopRow[]
  /** Au moins une ligne porte une condition : sans cela, la colonne est omise (elle ne dirait rien). */
  readonly hasCondition: boolean
}

const ITEM_KEYS = ['item name', 'item']
const PRICE_KEYS = ['runes', 'cost', 'starlight shards']
const STOCK_KEYS = ['#', 'stock']
const CONDITION_KEYS = ['additional condition', 'notes', 'note']
const REMEMBRANCE_KEY = 'required remembrance'

/**
 * Valeur d'une colonne, quelle que soit la casse de l'en-tête.
 * @param row Ligne du tableau (objet colonne → valeur).
 * @param keys En-têtes admis pour ce rôle, en minuscules, par ordre de préférence.
 * @returns La valeur trouvée ; `undefined` si la ligne n'a aucune de ces colonnes.
 */
function pick(row: Readonly<Record<string, RawWikiCell>>, keys: readonly string[]): RawWikiCell | undefined {
  for (const wanted of keys) {
    for (const [name, value] of Object.entries(row)) {
      if (name.trim().toLowerCase() === wanted) return value
    }
  }
  return undefined
}

/**
 * Un tableau de lignes-objets est un inventaire de boutique s'il a une colonne d'objet et une colonne de prix, et aucune colonne « Requirements »
 * (les tableaux d'objets de quête de PNJ ont « Item » et « Requirements », sans prix).
 * @param rows Lignes d'un tableau du wiki.
 * @returns Vrai pour un inventaire de boutique.
 */
export function isShopTable(rows: readonly RawWikiRow[]): boolean {
  const first = rows[0]
  if (first === undefined || Array.isArray(first)) return false
  const names = Object.keys(first as Readonly<Record<string, RawWikiCell>>).map((k) => k.trim().toLowerCase())
  return names.some((n) => ITEM_KEYS.includes(n)) && names.some((n) => PRICE_KEYS.includes(n)) && !names.includes('requirements')
}

/**
 * Normalise un inventaire de boutique.
 * @param rows Lignes d'un tableau du wiki reconnu par `isShopTable`.
 * @returns Le modèle ; `null` si le tableau n'est pas un inventaire.
 */
export function shopTable(rows: readonly RawWikiRow[]): ShopTableModel | null {
  if (!isShopTable(rows)) return null
  const first = rows[0] as Readonly<Record<string, RawWikiCell>>
  const priceHeader = Object.keys(first).find((k) => PRICE_KEYS.includes(k.trim().toLowerCase())) ?? 'Runes'
  const currency = priceHeader.trim().toLowerCase() === 'starlight shards' ? 'Starlight Shards' : 'runes'
  const out: ShopRow[] = []
  for (const raw of rows) {
    if (Array.isArray(raw)) continue
    const row = raw as Readonly<Record<string, RawWikiCell>>
    const item = pick(row, ITEM_KEYS)
    if (item === undefined || item === null || item === '') continue
    const remembrance = pick(row, [REMEMBRANCE_KEY])
    const condition = pick(row, CONDITION_KEYS)
    const price = pick(row, PRICE_KEYS)
    const stock = pick(row, STOCK_KEYS)
    out.push({
      item: String(item),
      price: price === undefined || price === '' ? null : price,
      stock: stock === undefined || stock === '' ? null : stock,
      condition:
        typeof remembrance === 'string' && remembrance !== ''
          ? remembrance
          : typeof condition === 'string' && condition !== ''
            ? condition
            : null,
      remembrance: typeof remembrance === 'string' && remembrance !== '',
    })
  }
  return { currency, rows: out, hasCondition: out.some((r) => r.condition !== null) }
}
