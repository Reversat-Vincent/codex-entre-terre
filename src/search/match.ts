// Primitives de correspondance partagées par la recherche de documents (search.ts) et celle des actions (actions.ts) :
// découpage en mots, rangs 0 à 2 sur un texte normalisé, mots répartis entre un nom et ses termes secondaires, distance de Damerau-Levenshtein.
// Tout texte reçu ici est déjà normalisé par `normalizeText` (src/data/slug.ts) ; ce module ne normalise rien lui-même (docs/architecture.md § 8).

/** Rang d'une correspondance exacte sur un nom : 0 début du nom, 1 débuts de mots, 2 sous-chaînes. */
export type NameRank = 0 | 1 | 2

/** Correspondance d'un texte normalisé : son rang et la position (index dans le texte) du premier mot trouvé. */
export interface TextMatch {
  readonly rank: NameRank
  /** Index du premier caractère trouvé, au plus petit des mots de la requête ; sert au départage. */
  readonly pos: number
}

/**
 * Découpe une requête déjà normalisée en mots.
 * @param normalized Requête issue de `normalizeText` (mots séparés par une seule espace).
 * @returns Les mots, tableau vide si la requête est vide.
 */
export function splitWords(normalized: string): string[] {
  return normalized === '' ? [] : normalized.split(' ')
}

/**
 * Cherche la première occurrence d'un mot au début d'un mot du texte.
 * @param norm Texte normalisé.
 * @param word Mot normalisé.
 * @returns L'index de l'occurrence, ou -1.
 */
export function indexOfWordStart(norm: string, word: string): number {
  let from = 0
  for (;;) {
    const i = norm.indexOf(word, from)
    if (i < 0) return -1
    if (i === 0 || norm.charCodeAt(i - 1) === 32) return i
    from = i + 1
  }
}

/**
 * Classe un texte normalisé selon les rangs 0 à 2 de docs/architecture.md § 8 :
 * 0 le texte commence par la requête, 1 chaque mot de la requête commence un mot du texte, 2 chaque mot est une sous-chaîne du texte.
 * @param norm Texte normalisé (nom d'un document, libellé d'une action).
 * @param query Requête normalisée entière.
 * @param words Mots de la requête (tous exigés).
 * @returns Le rang et la position, ou `null` si un mot manque.
 */
export function matchText(norm: string, query: string, words: readonly string[]): TextMatch | null {
  if (norm.startsWith(query)) return { rank: 0, pos: 0 }
  let pos = Infinity
  let allStarts = true
  for (const w of words) {
    const start = indexOfWordStart(norm, w)
    if (start >= 0) {
      pos = Math.min(pos, start)
      continue
    }
    allStarts = false
    break
  }
  if (allStarts) return { rank: 1, pos }
  pos = Infinity
  for (const w of words) {
    const i = norm.indexOf(w)
    if (i < 0) return null
    pos = Math.min(pos, i)
  }
  return { rank: 2, pos }
}

/** Mots répartis entre un nom et ses termes secondaires : indice du terme qui porte le premier mot absent du nom. */
export interface TermMatch {
  /** Indice dans la liste des termes. */
  readonly termIndex: number
  /** Index du mot trouvé dans le texte du terme. */
  readonly pos: number
}

/**
 * Rang 3 : chaque mot de la requête figure dans le nom ou dans un terme secondaire, et au moins un mot ne figure que dans un terme.
 * À appeler quand `matchText` a échoué sur le nom.
 * @param nameNorm Nom normalisé du document.
 * @param words Mots de la requête (tous exigés).
 * @param termNorms Termes secondaires normalisés, dans l'ordre du document.
 * @returns Le terme qui nomme le champ à afficher (celui du premier mot absent du nom), ou `null`.
 */
export function matchTerms(nameNorm: string, words: readonly string[], termNorms: readonly string[]): TermMatch | null {
  let found: TermMatch | null = null
  for (const w of words) {
    if (nameNorm.includes(w)) continue
    let hit = false
    for (let t = 0; t < termNorms.length; t++) {
      const i = (termNorms[t] as string).indexOf(w)
      if (i < 0) continue
      found ??= { termIndex: t, pos: i }
      hit = true
      break
    }
    if (!hit) return null
  }
  return found
}

/**
 * Tolérance aux fautes d'un mot de la requête (docs/architecture.md § 8) : 1 pour 4 à 7 lettres, 2 au-delà, 0 en dessous de 4.
 * @param length Nombre de lettres du mot.
 * @returns La distance de Damerau-Levenshtein maximale admise.
 */
export function typoTolerance(length: number): 0 | 1 | 2 {
  if (length < 4) return 0
  return length <= 7 ? 1 : 2
}

/**
 * Distance de Damerau-Levenshtein, variante à transpositions adjacentes (insertion, suppression, substitution, échange de deux lettres voisines).
 * Abandonne dès que la distance dépasse `max`, pour que le parcours linéaire de tout l'index reste léger.
 * @param a Premier mot.
 * @param b Second mot.
 * @param max Distance au-delà de laquelle la valeur exacte n'importe plus.
 * @returns La distance, ou `max + 1` si elle dépasse `max`.
 */
export function damerauLevenshtein(a: string, b: string, max: number = Infinity): number {
  if (a === b) return 0
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > max) return max + 1
  if (la === 0) return lb
  if (lb === 0) return la
  let prev2: number[] = []
  let prev: number[] = Array.from({ length: lb + 1 }, (_, j) => j)
  for (let i = 1; i <= la; i++) {
    const cur: number[] = [i]
    let rowMin = i
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      let v = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, (prev[j - 1] as number) + cost)
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, (prev2[j - 2] as number) + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[lb] as number
}

/** Meilleur mot trouvé pour un mot de la requête dans un texte, avec sa distance. */
export interface WordCandidate {
  /** Distance du mot de la requête au mot du texte (0 si c'est un début de mot). */
  readonly distance: number
  /** Index du mot dans le texte. */
  readonly pos: number
}

/**
 * Meilleur mot d'un texte normalisé pour un mot de la requête, tolérant aux fautes : un début de mot vaut distance 0 (saisie en cours),
 * sinon la distance de Damerau-Levenshtein au mot entier, dans la tolérance de `typoTolerance`.
 * @param word Mot de la requête, normalisé.
 * @param text Texte normalisé (nom ou terme).
 * @returns Le meilleur candidat, ou `null` si aucun mot n'est assez proche.
 */
export function bestWordIn(word: string, text: string): WordCandidate | null {
  const tolerance = typoTolerance(word.length)
  let best: WordCandidate | null = null
  let start = 0
  while (start <= text.length) {
    let end = text.indexOf(' ', start)
    if (end < 0) end = text.length
    const token = text.slice(start, end)
    let d: number
    if (token.startsWith(word)) d = 0
    else if (tolerance === 0) d = Infinity
    else d = damerauLevenshtein(word, token, tolerance)
    if (d <= tolerance && (best === null || d < best.distance)) {
      best = { distance: d, pos: start }
      if (d === 0) return best
    }
    start = end + 1
  }
  return best
}

/** Correspondance tolérante aux fautes d'un document. */
export interface FuzzyMatch {
  /** Somme des distances des mots de la requête (au moins 1 quand la recherche exacte a échoué). */
  readonly distance: number
  /** Position du premier mot trouvé dans son texte. */
  readonly pos: number
  /** Indice du terme qui porte le premier mot absent du nom, ou `null` si tout est dans le nom. */
  readonly termIndex: number | null
}

/**
 * Correspondance tolérante aux fautes d'un document : chaque mot de la requête doit être proche d'un mot du nom ou d'un terme secondaire.
 * @param nameNorm Nom normalisé.
 * @param words Mots de la requête (tous exigés).
 * @param termNorms Termes secondaires normalisés.
 * @returns La correspondance, ou `null`.
 */
export function matchFuzzy(nameNorm: string, words: readonly string[], termNorms: readonly string[]): FuzzyMatch | null {
  let distance = 0
  let pos = Infinity
  let termIndex: number | null = null
  for (const w of words) {
    let best = bestWordIn(w, nameNorm)
    let from: number | null = null
    if (best === null || best.distance > 0) {
      for (let t = 0; t < termNorms.length; t++) {
        const c = bestWordIn(w, termNorms[t] as string)
        if (c !== null && (best === null || c.distance < best.distance)) {
          best = c
          from = t
        }
      }
    }
    if (best === null) return null
    distance += best.distance
    pos = Math.min(pos, best.pos)
    if (from !== null) termIndex ??= from
  }
  return { distance, pos, termIndex }
}
