// Logique d'affichage des Mécaniques (docs/architecture.md § 9) : thèmes en français, regroupement et recherche du sommaire, sections et ancres d'un article,
// lignes de la fiche (infobox). Données : `src/data/types/mechanics.ts` ; aucun fait du jeu n'est ajouté, seuls les libellés d'interface le sont.

import { normalizeText, slug } from '../data/slug.ts'
import type { WikiTableData } from '../data/types/common.ts'
import type { MechanicEntry } from '../data/types/mechanics.ts'
import { toCellModel } from './wikiTable.ts'
import type { RawWikiCell } from './wikiTable.ts'

/** Libellés français des thèmes de `mechanics.json` (champ `topic`, thèmes de data/README.md). */
export const MECHANIC_TOPIC_LABELS: Readonly<Record<string, string>> = {
  'Attributes & stats': 'Attributs et statistiques',
  'Status effects': 'Effets de statut et résistances',
  'Damage types': 'Types de dégâts',
  'Weapons & upgrades': 'Armes et amélioration',
  Combat: 'Combat',
  Progression: 'Progression',
}

/**
 * Libellé français d'un thème.
 * @param topic Valeur du champ `topic`.
 * @returns Le libellé ; un thème inconnu (nouvelle extraction) reste tel que dans les données.
 */
export function topicLabel(topic: string): string {
  return MECHANIC_TOPIC_LABELS[topic] ?? topic
}

/** Groupe du sommaire : un thème et ses sujets. */
export interface MechanicGroup {
  readonly topic: string
  readonly label: string
  readonly entries: readonly MechanicEntry[]
}

/**
 * Regroupe les sujets par thème, dans l'ordre des thèmes de data/README.md puis des thèmes inconnus, les sujets gardant l'ordre du fichier.
 * @param entries Sujets du fichier `mechanics`.
 * @param query Texte de la recherche locale ; vide : tous les sujets. Comparaison sans accents ni casse, sur le titre et le thème.
 * @returns Les groupes non vides.
 */
export function groupMechanics(entries: readonly MechanicEntry[], query = ''): MechanicGroup[] {
  const wanted = normalizeText(query)
  const known = Object.keys(MECHANIC_TOPIC_LABELS)
  const groups = new Map<string, MechanicEntry[]>(known.map((topic) => [topic, []]))
  for (const entry of entries) {
    if (wanted !== '' && !normalizeText(`${entry.title} ${topicLabel(entry.topic)}`).includes(wanted)) continue
    const list = groups.get(entry.topic) ?? []
    list.push(entry)
    groups.set(entry.topic, list)
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([topic, list]) => ({ topic, label: topicLabel(topic), entries: list }))
}

/** Section d'un article : ancre (`?section=`), titre, lignes de texte et tableaux. */
export interface ArticleSection {
  readonly anchor: string
  readonly title: string
  /** Vrai pour l'introduction (résumé et tableaux du résumé), titrée par l'interface et non par le wiki. */
  readonly intro: boolean
  readonly text: readonly string[]
  readonly tables: readonly WikiTableData[]
}

/** Titre de la section d'introduction (texte d'interface). */
export const INTRO_TITLE = 'Introduction'

/** Colonne recopiée de l'en-tête du wiki dans les tableaux d'introduction : à ignorer (commentaire de `mechanicSchema`, src/data/types/mechanics.ts). */
const COPIED_HEADER_COLUMN = 'Increments'

/**
 * Retire d'un tableau les cases qui ne sont qu'un en-tête recopié par l'extraction : une case dont la valeur est son propre titre de colonne
 * (par exemple `Increments: "Increments"` sur la première ligne). Dans un tableau d'introduction, la colonne `Increments` entière est ignorée.
 * @param table Tableau tel que dans data/.
 * @param intro Vrai pour un tableau de l'introduction (`summary_tables`).
 * @returns Le tableau à afficher ; le même objet si rien n'est à retirer.
 */
export function withoutCopiedHeaders(table: WikiTableData, intro: boolean): WikiTableData {
  return table.map((row, index) => {
    if (Array.isArray(row)) return row
    const record = row as Readonly<Record<string, string | number>>
    const kept = Object.entries(record).filter(([key, value]) => !(intro && key === COPIED_HEADER_COLUMN) && !(index === 0 && value === key))
    return kept.length === Object.keys(record).length ? row : Object.fromEntries(kept)
  })
}

/**
 * Sections d'un article, dans l'ordre : introduction (résumé et tableaux du résumé), puis les sections du wiki dans l'ordre du fichier.
 * L'ancre est le `slug` du titre ; une collision (deux sections au même slug, ou une section « Introduction ») reçoit un suffixe `-2`, `-3`…
 * @param entry Sujet.
 * @returns Les sections, l'introduction en tête (omise si le sujet n'a ni résumé ni tableau de résumé).
 */
export function articleSections(entry: MechanicEntry): ArticleSection[] {
  const used = new Set<string>()
  const anchorFor = (title: string): string => {
    const base = slug(title) || 'section'
    let anchor = base
    for (let n = 2; used.has(anchor); n++) anchor = `${base}-${n}`
    used.add(anchor)
    return anchor
  }
  const out: ArticleSection[] = []
  const summaryTables = entry.summary_tables ?? []
  if (entry.summary.length > 0 || summaryTables.length > 0) {
    out.push({ anchor: anchorFor(INTRO_TITLE), title: INTRO_TITLE, intro: true, text: entry.summary, tables: summaryTables.map((t) => withoutCopiedHeaders(t, true)) })
  }
  for (const [title, section] of Object.entries(entry.sections)) {
    out.push({ anchor: anchorFor(title), title, intro: false, text: section.text, tables: (section.tables ?? []).map((t) => withoutCopiedHeaders(t, false)) })
  }
  return out
}

/**
 * Ancre à rejoindre pour la valeur de `?section=`.
 * @param sections Sections de l'article.
 * @param requested Valeur de la requête (peut être absente, répétée ou inconnue).
 * @returns L'ancre si elle existe, sinon `null`.
 */
export function resolveSectionAnchor(sections: readonly ArticleSection[], requested: unknown): string | null {
  const value = Array.isArray(requested) ? requested[0] : requested
  return typeof value === 'string' && sections.some((s) => s.anchor === value) ? value : null
}

/** Ligne de la fiche d'un article (infobox du wiki). */
export interface InfoboxRow {
  readonly label: string
  readonly value: string
}

/**
 * Lignes de la fiche d'un article. Les clés de l'extraction (`max_held`) deviennent des libellés lisibles (`Max held`) ; les valeurs gardent leur texte
 * du wiki, les nombres étant formatés à la française.
 * @param infobox Infobox du sujet, si elle existe.
 * @returns Les lignes, vides si le sujet n'a pas d'infobox.
 */
export function infoboxRows(infobox: Readonly<Record<string, RawWikiCell>> | undefined): InfoboxRow[] {
  if (!infobox) return []
  return Object.entries(infobox)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => {
      const label = key.replace(/_/g, ' ').trim()
      return { label: label.charAt(0).toUpperCase() + label.slice(1), value: toCellModel(value).text }
    })
}
