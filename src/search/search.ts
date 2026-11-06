// Recherche globale sur l'index de recherche (docs/architecture.md § 8) : classement par rangs, groupes de résultats, tolérance aux fautes,
// suggestions sans résultat et surlignage de la partie trouvée. Fonctions pures, parcours linéaire de ~3 500 documents, sans index inversé.
// La normalisation est celle de la préparation (`normalizeText`, src/data/slug.ts) : une seconde implémentation décalerait les rangs.

import { normalizeText } from '../data/slug.ts'
import type { SearchDoc, SearchGroup, SearchIndexFile, SearchTerm } from '../data/types/searchIndex.ts'
import { translateQuery } from './glossary.ts'
import { indexOfWordStart, matchFuzzy, matchTerms, matchText, splitWords } from './match.ts'

/** Nombre de résultats par groupe dans la palette (note `spec-search`, décision P4), avant « Voir les N ». */
export const PER_GROUP = 4

/** Ordre d'affichage des groupes : équipement, sorts, personnages et boss, lieux, puis le reste. Les groupes sans résultat sont absents. */
export const GROUP_ORDER: readonly SearchGroup[] = [
  'weapon',
  'ash',
  'armor',
  'talisman',
  'spell',
  'spirit',
  'item',
  'boss',
  'location',
  'npc',
  'skill',
  'origin',
  'mechanic',
]

/** Libellés français des groupes de résultats (README CommandPalette). */
export const GROUP_LABELS: Readonly<Record<SearchGroup, string>> = {
  weapon: 'Armes',
  ash: 'Cendres de guerre',
  armor: 'Armures',
  talisman: 'Talismans',
  spell: 'Sorts',
  spirit: 'Cendres d’esprit',
  item: 'Objets',
  boss: 'Boss',
  location: 'Lieux',
  npc: 'PNJ',
  skill: 'Compétences',
  origin: 'Origines',
  mechanic: 'Mécaniques',
}

/** Libellés français du champ où un terme secondaire a été trouvé. */
export const TERM_FIELD_LABELS: Readonly<Record<SearchTerm['field'], string>> = {
  skill: 'Compétence',
  acquisition: 'Obtention',
  region: 'Région',
}

/** Rang d'un résultat : 0 début du nom, 1 débuts de mots, 2 sous-chaîne, 3 terme secondaire, 4 correspondance tolérante aux fautes. */
export type SearchRank = 0 | 1 | 2 | 3 | 4

/** Source acceptée par `search` : le fichier `search-index` ou directement sa liste de documents. */
export type SearchSource = SearchIndexFile | readonly SearchDoc[]

/** Options de `search`. */
export interface SearchOptions {
  /** Groupes à renvoyer (filtres par type de la palette) ; tous si absent. Les compteurs `counts` portent toujours sur tous les groupes. */
  readonly groups?: readonly SearchGroup[]
  /** Résultats gardés par groupe (`PER_GROUP` par défaut) ; `Infinity` pour la page « tous les résultats ». */
  readonly perGroup?: number
}

/** Résultat de recherche : un document, son rang et, le cas échéant, le terme secondaire qui a répondu. */
export interface SearchHit {
  readonly doc: SearchDoc
  readonly rank: SearchRank
  /** Somme des distances de Damerau-Levenshtein (0 hors rang 4). */
  readonly distance: number
  /** Terme secondaire où la requête a été trouvée (rangs 3 et 4), pour nommer le champ dans la ligne de contexte. */
  readonly term: SearchTerm | null
}

/** Résultats d'un groupe. */
export interface SearchGroupResult {
  readonly group: SearchGroup
  /** Libellé français du groupe. */
  readonly label: string
  /** Nombre total de résultats du groupe (« Voir les N »). */
  readonly total: number
  /** Les meilleurs résultats, au plus `perGroup`. */
  readonly hits: readonly SearchHit[]
}

/** Requête anglaise proposée quand la saisie ne donne rien. */
export interface SearchSuggestion {
  /** Requête normalisée à proposer (« moon »). */
  readonly query: string
  /** Nombre de résultats qu'elle donne. */
  readonly count: number
}

/** Réponse de `search`. */
export interface SearchResponse {
  /** Saisie normalisée ; vide si la saisie ne contient ni lettre ni chiffre. */
  readonly query: string
  /** Groupes qui ont des résultats (et demandés), dans `GROUP_ORDER`. */
  readonly groups: readonly SearchGroupResult[]
  /** Nombre de résultats par groupe, tous groupes confondus, pour les filtres par type. */
  readonly counts: Readonly<Partial<Record<SearchGroup, number>>>
  /** Nombre total de résultats, tous groupes confondus. */
  readonly total: number
  /** Vrai si les résultats viennent de la tolérance aux fautes (aucune correspondance exacte). */
  readonly fuzzy: boolean
  /** Suggestions du glossaire qui donnent des résultats ; renseignées seulement quand `total` est 0. */
  readonly suggestions: readonly SearchSuggestion[]
}

interface Scored extends SearchHit {
  readonly pos: number
}

const collator = new Intl.Collator('en')

const GROUP_RANK: ReadonlyMap<SearchGroup, number> = new Map(GROUP_ORDER.map((g, i) => [g, i]))

function docsOf(source: SearchSource): readonly SearchDoc[] {
  return 'docs' in source ? source.docs : source
}

/** Départage de docs/architecture.md § 8 : rang, distance, position, longueur du nom, ordre alphabétique (`localeCompare('en')`). */
function compareScored(a: Scored, b: Scored): number {
  return (
    a.rank - b.rank ||
    a.distance - b.distance ||
    a.pos - b.pos ||
    a.doc.norm.length - b.doc.norm.length ||
    collator.compare(a.doc.name, b.doc.name)
  )
}

function scoreExact(docs: readonly SearchDoc[], query: string, words: readonly string[]): Scored[] {
  const out: Scored[] = []
  for (const doc of docs) {
    const m = matchText(doc.norm, query, words)
    if (m) {
      out.push({ doc, rank: m.rank, distance: 0, term: null, pos: m.pos })
      continue
    }
    if (!doc.terms || doc.terms.length === 0) continue
    const t = matchTerms(doc.norm, words, doc.terms.map((x) => x.norm))
    if (t) out.push({ doc, rank: 3, distance: 0, term: doc.terms[t.termIndex] ?? null, pos: t.pos })
  }
  return out
}

function scoreFuzzy(docs: readonly SearchDoc[], words: readonly string[]): Scored[] {
  const out: Scored[] = []
  for (const doc of docs) {
    const m = matchFuzzy(doc.norm, words, doc.terms?.map((x) => x.norm) ?? [])
    if (m) out.push({ doc, rank: 4, distance: m.distance, term: m.termIndex === null ? null : (doc.terms?.[m.termIndex] ?? null), pos: m.pos })
  }
  return out
}

/**
 * Requêtes anglaises du glossaire qui donnent des résultats, pour les saisies sans résultat (« lune » → « moon »).
 * @param docs Documents de l'index.
 * @param q Saisie brute.
 * @returns Les suggestions, de la plus fructueuse à la moins fructueuse.
 */
function suggest(docs: readonly SearchDoc[], q: string): SearchSuggestion[] {
  const out: SearchSuggestion[] = []
  for (const query of translateQuery(q)) {
    const count = scoreExact(docs, query, splitWords(query)).length
    if (count > 0) out.push({ query, count })
  }
  return out.sort((a, b) => b.count - a.count)
}

/**
 * Recherche globale (docs/architecture.md § 8). Tous les mots de la requête sont exigés.
 * Classement : 0 le nom commence par la requête ; 1 chaque mot commence un mot du nom ; 2 sous-chaîne ; 3 terme secondaire (compétence, lieu d'obtention, région).
 * Départage par position, longueur du nom, ordre alphabétique. S'il n'y a aucun résultat exact, les traductions du glossaire qui donnent des résultats
 * sont proposées (`suggestions`, et aucun résultat n'est renvoyé) ; à défaut, une seconde passe tolère les fautes légères
 * (Damerau-Levenshtein ≤ 1 pour les mots de 4 à 7 lettres, ≤ 2 au-delà).
 * Seuls les groupes qui ont des résultats sont renvoyés.
 * @param index Fichier `search-index` ou liste de ses documents.
 * @param q Saisie brute.
 * @param options Groupes demandés et nombre de résultats par groupe.
 * @returns Les groupes de résultats, les compteurs par groupe et le drapeau de tolérance.
 */
export function search(index: SearchSource, q: string, options: SearchOptions = {}): SearchResponse {
  const perGroup = options.perGroup ?? PER_GROUP
  const query = normalizeText(q)
  if (query === '') return { query, groups: [], counts: {}, total: 0, fuzzy: false, suggestions: [] }
  const docs = docsOf(index)
  const words = splitWords(query)
  let scored = scoreExact(docs, query, words)
  let fuzzy = false
  let suggestions: SearchSuggestion[] = []
  if (scored.length === 0) {
    // Un mot français du glossaire qui se traduit en une requête fructueuse passe avant la tolérance :
    // « lune » est à une lettre de « rune », mais l'utilisateur cherche « moon ».
    suggestions = suggest(docs, q)
    if (suggestions.length === 0) {
      scored = scoreFuzzy(docs, words)
      fuzzy = scored.length > 0
    }
  }
  const byGroup = new Map<SearchGroup, Scored[]>()
  for (const s of scored) {
    const list = byGroup.get(s.doc.group)
    if (list) list.push(s)
    else byGroup.set(s.doc.group, [s])
  }
  const counts: Partial<Record<SearchGroup, number>> = {}
  const groups: SearchGroupResult[] = []
  const wanted = options.groups ? new Set(options.groups) : null
  const present = [...byGroup.keys()].sort((a, b) => (GROUP_RANK.get(a) ?? 99) - (GROUP_RANK.get(b) ?? 99))
  for (const group of present) {
    const list = byGroup.get(group) as Scored[]
    counts[group] = list.length
    if (wanted && !wanted.has(group)) continue
    list.sort(compareScored)
    const hits: SearchHit[] = list.slice(0, perGroup).map(({ doc, rank, distance, term }) => ({ doc, rank, distance, term }))
    groups.push({ group, label: GROUP_LABELS[group], total: list.length, hits })
  }
  return {
    query,
    groups,
    counts,
    total: scored.length,
    fuzzy,
    suggestions,
  }
}

/**
 * Ligne de contexte d'un résultat : contexte brut joint par « · », puis le champ où le terme a été trouvé quand la correspondance vient d'un terme secondaire.
 * @param hit Résultat de recherche.
 * @returns Par exemple `Katanas · Compétence : Transient Moonlight` (espace insécable avant les deux-points).
 */
export function contextLine(hit: SearchHit): string {
  const parts = [...hit.doc.ctx]
  if (hit.term) parts.push(`${TERM_FIELD_LABELS[hit.term.field]}\u00a0: ${hit.term.text}`)
  return parts.join(' · ')
}

/** Morceau d'un nom surligné : `match` vaut vrai pour la partie trouvée. */
export interface HighlightPart {
  readonly text: string
  readonly match: boolean
}

/** Texte normalisé d'un nom avec, pour chaque caractère normalisé, l'étendue du caractère d'origine dont il vient. */
interface AlignedText {
  readonly norm: string
  readonly start: readonly number[]
  readonly end: readonly number[]
}

/**
 * Normalise un nom en gardant la correspondance avec le texte d'origine, caractère par caractère.
 * Chaque caractère passe par `normalizeText` (encadré de deux lettres pour distinguer une apostrophe, qui disparaît, d'un séparateur, qui devient une espace).
 * @param name Nom d'origine.
 * @returns Le texte normalisé et les index d'origine de chacun de ses caractères.
 */
function align(name: string): AlignedText {
  let norm = ''
  const start: number[] = []
  const end: number[] = []
  let pendingSeparator = false
  let i = 0
  for (const ch of name) {
    const from = i
    const to = i + ch.length
    i = to
    const probe = normalizeText(`a${ch}a`)
    if (probe === 'a a') {
      pendingSeparator = true
      continue
    }
    const inner = probe.slice(1, -1)
    if (inner === '') {
      // Apostrophe ou signe combinant : rattaché au caractère précédent, qui reste surligné avec lui.
      if (end.length > 0 && /[\u0300-\u036f]/.test(ch)) end[end.length - 1] = to
      continue
    }
    if (pendingSeparator && norm !== '') {
      norm += ' '
      start.push(from)
      end.push(from)
    }
    pendingSeparator = false
    for (const c of inner) {
      norm += c
      start.push(from)
      end.push(to)
    }
  }
  return { norm, start, end }
}

/**
 * Découpe un nom d'origine en morceaux, la partie trouvée par la requête étant marquée (`match`).
 * Mêmes règles que le classement : si le nom commence par la requête, ce début est surligné ; sinon chaque mot l'est, de préférence en début de mot.
 * Les accents et la casse d'origine sont conservés. Aucune partie n'est surlignée si le nom ne contient pas la requête (résultat tolérant aux fautes, terme secondaire).
 * @param name Nom tel qu'affiché (`SearchDoc.name`).
 * @param q Saisie brute.
 * @returns Les morceaux, dans l'ordre, dont la concaténation redonne `name`.
 */
export function highlight(name: string, q: string): HighlightPart[] {
  const query = normalizeText(q)
  const whole: HighlightPart[] = [{ text: name, match: false }]
  if (query === '' || name === '') return whole
  const a = align(name)
  if (a.norm !== normalizeText(name)) return whole
  const ranges: [number, number][] = []
  if (a.norm.startsWith(query)) {
    ranges.push([0, query.length])
  } else {
    for (const w of splitWords(query)) {
      let at = indexOfWordStart(a.norm, w)
      if (at < 0) at = a.norm.indexOf(w)
      if (at >= 0) ranges.push([at, at + w.length])
    }
  }
  if (ranges.length === 0) return whole
  ranges.sort((x, y) => x[0] - y[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  const parts: HighlightPart[] = []
  let cursor = 0
  for (const [ns, ne] of merged) {
    const os = a.start[ns] as number
    const oe = a.end[ne - 1] as number
    if (os > cursor) parts.push({ text: name.slice(cursor, os), match: false })
    parts.push({ text: name.slice(os, oe), match: true })
    cursor = oe
  }
  if (cursor < name.length) parts.push({ text: name.slice(cursor), match: false })
  return parts
}
