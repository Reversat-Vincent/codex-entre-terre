// Découpage d'un texte du wiki en morceaux « texte » et « nom d'entité » pour `WikiText` et `WikiTable` (docs/architecture.md § 10.5).
// Un morceau devient un lien seulement si le nom est celui d'une entité, lettre pour lettre (à la normalisation près de `resolveName`) :
// aucune correspondance partielle, aucun pluriel, aucune recherche dans une phrase.

import type { EntityRef } from '../data/datasets.ts'

/** Morceau d'un texte : sa valeur, et l'entité visée si le morceau est exactement un nom d'entité. */
export interface TextSegment {
  readonly text: string
  readonly ref: EntityRef | null
}

/** Fonction qui résout un nom en entité (`resolveName` de `src/data/links.ts` avec l'index et les genres préférés), ou `null`. */
export type NameResolver = (name: string) => EntityRef | null

/** Longueur au-delà de laquelle une ligne est une phrase, jamais une énumération de noms. */
const MAX_LIST_LENGTH = 240
/** Séparateurs d'une énumération de noms : virgule suivie d'une espace, ou barre oblique entourée d'espaces. */
const SEPARATOR = /(,\s+|\s\/\s)/
/** Signes d'une phrase ou d'une précision entre parenthèses : le texte n'est alors pas découpé. */
const SENTENCE_MARK = /[.!?:;()]/

/**
 * Découpe un texte en morceaux et résout les noms d'entités. Règles, de la plus à la moins sûre :
 * 1. le texte entier est un nom d'entité : un seul morceau lié ;
 * 2. le texte est une énumération courte sans signe de phrase (« Dagger, Parrying Dagger, Torch ») : chaque élément est essayé, les séparateurs sont conservés ;
 * 3. sinon le texte reste simple (aucune recherche de noms au milieu d'une phrase).
 * @param text Texte brut, tel que dans data/.
 * @param resolve Résolution d'un nom ; `null` quand l'index n'est pas encore chargé.
 * @returns Les morceaux, dont la concaténation redonne exactement `text`.
 */
export function segmentWikiText(text: string, resolve: NameResolver | null): TextSegment[] {
  if (text === '') return []
  const plain: TextSegment[] = [{ text, ref: null }]
  if (resolve === null) return plain
  const whole = resolve(text.trim())
  if (whole !== null) return [{ text, ref: whole }]
  if (text.length > MAX_LIST_LENGTH || SENTENCE_MARK.test(text.replace(/\d\.\d/g, '')) || !SEPARATOR.test(text)) return plain
  const out: TextSegment[] = []
  let linked = false
  // `split` avec un groupe capturant place les séparateurs aux rangs impairs.
  const parts = text.split(SEPARATOR)
  for (const [index, part] of parts.entries()) {
    const ref = index % 2 === 1 || part.trim() === '' ? null : resolve(part.trim())
    if (ref !== null) linked = true
    const last = out[out.length - 1]
    // Fusionne les morceaux simples voisins : moins de nœuds à l'écran, même texte.
    if (ref === null && last !== undefined && last.ref === null) out[out.length - 1] = { text: last.text + part, ref: null }
    else out.push({ text: part, ref })
  }
  return linked ? out : plain
}
