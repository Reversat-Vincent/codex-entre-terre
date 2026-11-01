// Formatage des nombres à la française : seul module de formatage de l'interface (architecture § 10.5, décision D20).
// Écrit à la main plutôt que par `toLocaleString('fr-FR')` : les séparateurs de l'ICU varient selon les versions
// (espace fine avant « % », signe moins ASCII), alors que le design impose des caractères précis.
// Aucune fonction ne traite `null` : une valeur absente est affichée par `CxValue` (« Non documenté »), jamais ici.

/** Espace fine insécable : séparateur de milliers. */
export const THIN_NBSP = '\u202F'
/** Espace insécable : placée avant le signe `%`. */
export const NBSP = '\u00A0'
/** Vrai signe moins (U+2212), à la place du trait d'union. */
export const MINUS = '\u2212'

const formatters = new Map<string, Intl.NumberFormat>()

/** Renvoie un formateur anglais sans groupement (cache par couple de décimales) : sert uniquement à arrondir correctement. */
function plainFormatter(minDigits: number, maxDigits: number): Intl.NumberFormat {
  const key = `${minDigits}/${maxDigits}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      useGrouping: false,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    })
    formatters.set(key, formatter)
  }
  return formatter
}

/** Résultat décomposé d'un formatage : signe, partie entière groupée, partie décimale. */
interface Parts {
  negative: boolean
  integer: string
  fraction: string
}

/** Arrondit `value` et le décompose ; le signe d'un zéro arrondi (−0, −0,04 à 1 décimale) est supprimé. */
function decompose(value: number, minDigits: number, maxDigits: number): Parts {
  const [integerRaw = '0', fraction = ''] = plainFormatter(minDigits, maxDigits).format(Math.abs(value)).split('.')
  const integer = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_NBSP)
  const isZero = /^0*$/.test(integerRaw) && /^0*$/.test(fraction)
  return { negative: value < 0 && !isZero, integer, fraction }
}

/** Assemble les parties en chaîne : `−1 234,5`. */
function assemble({ negative, integer, fraction }: Parts): string {
  return `${negative ? MINUS : ''}${integer}${fraction ? `,${fraction}` : ''}`
}

/** Valeur non finie (NaN, ±Infinity) : rendue telle quelle pour que l'erreur reste visible au lieu d'être masquée. */
function isUnformattable(value: number): boolean {
  return !Number.isFinite(value)
}

/**
 * Formate un entier à la française : espace fine insécable (U+202F) entre les milliers dès 4 chiffres, vrai signe moins.
 * @param value nombre à afficher (arrondi à l'entier le plus proche)
 * @returns par exemple `70 000` (avec U+202F) ou `512`
 */
export function formatInt(value: number): string {
  if (isUnformattable(value)) return String(value)
  return assemble(decompose(value, 0, 0))
}

/**
 * Formate un nombre décimal à la française : virgule décimale, espace fine insécable pour les milliers, vrai signe moins.
 * @param value nombre à afficher
 * @param maxDigits nombre maximal de décimales (1 par défaut) ; les zéros finaux sont retirés sauf si `minDigits` les impose
 * @param minDigits nombre minimal de décimales (0 par défaut)
 * @returns par exemple `5,5`, `10` ou `1 234,56`
 */
export function formatDecimal(value: number, maxDigits = 1, minDigits = 0): string {
  if (isUnformattable(value)) return String(value)
  return assemble(decompose(value, Math.min(minDigits, maxDigits), maxDigits))
}

/**
 * Formate un pourcentage : espace insécable (U+00A0) avant `%`, vrai signe moins (`−10 %`). Un vrai zéro donne `0 %`.
 * @param value valeur en points de pourcentage (12,5 pour 12,5 %), pas une fraction de 1
 * @param maxDigits nombre maximal de décimales (1 par défaut)
 * @returns par exemple `35,5 %` ou `−10 %`
 */
export function formatPercent(value: number, maxDigits = 1): string {
  if (isUnformattable(value)) return String(value)
  return `${assemble(decompose(value, 0, maxDigits))}${NBSP}%`
}

/**
 * Formate un poids (charge d'équipement) avec une décimale fixe, comme l'affiche le jeu : `6,5`, `2,0`, `12,3`.
 * @param value poids, sans unité
 * @returns le poids avec une décimale
 */
export function formatWeight(value: number): string {
  if (isUnformattable(value)) return String(value)
  return assemble(decompose(value, 1, 1))
}

/**
 * Formate un nombre avec son signe explicite : `+12`, `−3`. Le zéro n'a pas de signe (`0`).
 * @param value nombre à afficher
 * @param maxDigits nombre maximal de décimales (0 par défaut)
 * @returns le nombre précédé de `+` ou du vrai signe moins
 */
export function formatSigned(value: number, maxDigits = 0): string {
  if (isUnformattable(value)) return String(value)
  const parts = decompose(value, 0, maxDigits)
  const isZero = parts.integer === '0' && !parts.fraction.replace(/0/g, '')
  const sign = parts.negative ? '' : isZero ? '' : '+'
  return `${sign}${assemble(parts)}`
}
