// Logique de présentation du Comparateur : « meilleure valeur » d'une ligne selon son sens, écart entre colonnes, lecture et écriture du paramètre `?e=`.
// Aucune donnée de jeu ni aucun calcul du moteur : les valeurs arrivent déjà prêtes, ce module ne fait que les ordonner.

/** Sens d'une ligne : `higher` (plus haut = meilleur), `lower` (plus bas = meilleur) ou `none` (écart signalé, sans meilleure valeur). */
export type BetterWhen = 'higher' | 'lower' | 'none'

/**
 * Verdict d'une cellule dans sa ligne :
 * - `best` : meilleure valeur de la ligne (ex æquo compris), signalée par une icône et un mot ;
 * - `worse` : valeur moins bonne que la meilleure ;
 * - `different` : la ligne diffère mais n'a pas de sens (ou valeurs de types mêlés) ;
 * - `neutral` : valeurs identiques, ou une seule valeur comparable ;
 * - `missing` : valeur `null` (« Non documenté »), jamais comptée meilleure ni pire.
 */
export type CellVerdict = 'best' | 'worse' | 'different' | 'neutral' | 'missing'

/** Valeur comparée d'une cellule : nombre, texte (égalité seulement) ou `null` (non documenté). */
export type CompareValue = number | string | null | undefined

/** Verdicts d'une ligne. */
export interface RowVerdict {
  /** Un verdict par colonne, dans l'ordre des valeurs reçues. */
  readonly verdicts: readonly CellVerdict[]
  /** Vrai si au moins deux valeurs documentées diffèrent : la ligne porte le repère « Écart ». */
  readonly differs: boolean
}

/**
 * Valeur utilisable pour comparer : un nombre fini ou un texte non vide ; le reste (`null`, `undefined`, `NaN`, texte vide) est « non documenté ».
 * @param value Valeur brute de la cellule.
 * @returns La valeur, ou `null`.
 */
function usable(value: CompareValue): number | string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  return value.trim() === '' ? null : value
}

/**
 * Juge les cellules d'une ligne du comparateur.
 * Une valeur `null` n'entre jamais dans la comparaison. Avec un sens `higher` ou `lower` et des valeurs toutes numériques, les valeurs égales à la meilleure
 * sont `best` et les autres `worse` ; si toutes les valeurs documentées sont égales, personne n'est meilleur. Sans sens, ou avec des textes,
 * seul l'écart est signalé (`different`). Moins de deux valeurs documentées : rien à comparer (`neutral`).
 * @param values Valeurs de la ligne, une par colonne.
 * @param better Sens de la ligne.
 * @returns Un verdict par colonne et le drapeau d'écart.
 */
export function judgeRow(values: readonly CompareValue[], better: BetterWhen): RowVerdict {
  const cleaned = values.map(usable)
  const present = cleaned.filter((v): v is number | string => v !== null)
  const allEqual = present.every((v) => v === present[0])
  if (present.length < 2 || allEqual) {
    return { verdicts: cleaned.map((v): CellVerdict => (v === null ? 'missing' : 'neutral')), differs: false }
  }
  const numbers = present.filter((v): v is number => typeof v === 'number')
  const ranked = better !== 'none' && numbers.length === present.length
  if (!ranked) {
    return { verdicts: cleaned.map((v): CellVerdict => (v === null ? 'missing' : 'different')), differs: true }
  }
  const target = better === 'higher' ? Math.max(...numbers) : Math.min(...numbers)
  return {
    verdicts: cleaned.map((v): CellVerdict => (v === null ? 'missing' : v === target ? 'best' : 'worse')),
    differs: true,
  }
}

/** Mot d'un verdict, pour l'affichage et les lecteurs d'écran ; `null` : rien à écrire. */
export const VERDICT_WORDS: Readonly<Record<CellVerdict, string | null>> = {
  best: 'Meilleur',
  worse: null,
  different: null,
  neutral: null,
  missing: null,
}

/**
 * Lit le paramètre `?e=` : références séparées par des virgules, sans blanc ni doublon.
 * La validité des références (genre connu, même genre, 4 au plus) est jugée par le store `compare` (`replace`).
 * @param query Valeur brute du paramètre (chaîne, liste si répété, ou absente).
 * @returns Les références lues, dans l'ordre.
 */
export function parseCompareQuery(query: string | readonly (string | null)[] | null | undefined): string[] {
  const raw = Array.isArray(query) ? query.filter((q): q is string => typeof q === 'string').join(',') : typeof query === 'string' ? query : ''
  const out: string[] = []
  for (const part of raw.split(',')) {
    const ref = part.trim()
    if (ref !== '' && !out.includes(ref)) out.push(ref)
  }
  return out
}

/**
 * Écrit le paramètre `?e=`.
 * @param refs Références comparées, dans l'ordre.
 * @returns La valeur du paramètre, ou `undefined` quand la liste est vide (le paramètre disparaît de l'adresse).
 */
export function formatCompareQuery(refs: readonly string[]): string | undefined {
  return refs.length === 0 ? undefined : refs.join(',')
}
