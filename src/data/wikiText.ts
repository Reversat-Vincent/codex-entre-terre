// Analyse des lignes de texte du wiki en blocs (sous-titres, listes imbriquées, paragraphes) pour le composant `WikiText`.
// Conventions de data/README.md : une puce imbriquée est préfixée par `→` (un par niveau), un sous-titre de section s'écrit `[Titre]`
// (docs/architecture.md § 10.5). Le texte reste brut : le composant l'affiche par interpolation, jamais en HTML.

/** Élément de liste, avec ses sous-éléments. */
export interface WikiListItem {
  readonly text: string
  readonly children: readonly WikiListItem[]
}

/** Bloc de texte du wiki : sous-titre `[Titre]`, liste imbriquée ou paragraphe. */
export type WikiBlock =
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly WikiListItem[] }
  | { readonly kind: 'paragraph'; readonly text: string }

/** Mode de lecture : `list` (chaque ligne est une puce) ou `paragraphs` (chaque ligne simple est un paragraphe, les `→` des puces). */
export type WikiTextMode = 'list' | 'paragraphs'

const HEADING = /^\[([^\]]+)\]$/
const ARROWS = /^(→+)\s*/u

/** Élément de liste en construction. */
interface MutableItem {
  text: string
  children: MutableItem[]
}

/**
 * Analyse des lignes de texte du wiki (docs/architecture.md § 10.5). Une ligne `[Titre]` donne un sous-titre et ferme la liste en cours ;
 * une ligne préfixée par n `→` est une puce de profondeur n − 1 en mode `paragraphs` (sous le paragraphe qui précède) et de profondeur n
 * en mode `list` (où une ligne sans `→` est une puce de profondeur 0). Une profondeur qui saute un niveau est ramenée au niveau suivant le parent.
 * Les lignes vides sont ignorées.
 * @param lines Lignes de texte telles que dans data/.
 * @param mode Mode de lecture.
 * @returns Les blocs, dans l'ordre.
 */
export function parseWikiLines(lines: readonly string[], mode: WikiTextMode): WikiBlock[] {
  const blocks: WikiBlock[] = []
  let list: MutableItem[] | null = null
  // Pile des derniers éléments par profondeur, pour rattacher une puce à son parent.
  let stack: MutableItem[] = []

  const closeList = (): void => {
    if (list !== null && list.length > 0) blocks.push({ kind: 'list', items: list })
    list = null
    stack = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const heading = HEADING.exec(line)
    if (heading !== null) {
      closeList()
      blocks.push({ kind: 'heading', text: heading[1]!.trim() })
      continue
    }
    const arrows = ARROWS.exec(line)
    const text = arrows === null ? line : line.slice(arrows[0].length).trim()
    if (arrows === null && mode === 'paragraphs') {
      closeList()
      blocks.push({ kind: 'paragraph', text })
      continue
    }
    const wanted = arrows === null ? 0 : mode === 'list' ? arrows[1]!.length : arrows[1]!.length - 1
    const depth = Math.min(wanted, stack.length)
    const item: MutableItem = { text, children: [] }
    const current: MutableItem[] = list ?? []
    list = current
    if (depth === 0) current.push(item)
    else stack[depth - 1]!.children.push(item)
    stack = [...stack.slice(0, depth), item]
  }
  closeList()
  return blocks
}
