// Modèle de la palette de recherche : transforme les résultats de `src/search/` en sections et lignes prêtes à afficher (icône, titre surligné, contexte, cible).
// Fonctions pures, sans routeur ni store : `CxCommandPalette` les appelle et exécute la cible de la ligne choisie.

import type { RouteLocationRaw } from 'vue-router'
import type { SearchGroup, SearchDoc } from '../../data/types/searchIndex.ts'
import type { EntityRef } from '../../data/datasets.ts'
import { entityRoute } from '../../router/entityRoute.ts'
import type { ActionEffect, ActionGroupResult, ActionHit } from '../../search/actions.ts'
import { GROUP_LABELS, GROUP_ORDER, contextLine, highlight } from '../../search/search.ts'
import type { HighlightPart, SearchHit, SearchResponse } from '../../search/search.ts'
import { formatInt } from '../../ui/format.ts'

/** Ce qui se passe quand l'utilisateur choisit une ligne. */
export type RowTarget =
  /** Ouvre un écran (fiche, page de résultats). */
  | { readonly type: 'route'; readonly to: RouteLocationRaw }
  /** Exécute l'effet d'une action de la palette. */
  | { readonly type: 'action'; readonly effect: ActionEffect }
  /** Remplace la saisie (recherche récente, suggestion) sans fermer la palette. */
  | { readonly type: 'query'; readonly query: string }
  /** Ouvre une adresse externe dans un nouvel onglet. */
  | { readonly type: 'external'; readonly href: string }

/** Ligne de la palette. */
export interface PaletteRow {
  /** Clé stable de liste. */
  readonly key: string
  /** Icône du sprite, sans le préfixe `i-`. */
  readonly icon: string
  /** Titre, avec la partie trouvée marquée. */
  readonly parts: readonly HighlightPart[]
  /** Source de l'entité (badge après le titre), ou `null`. */
  readonly source: SearchDoc['source']
  /** Ligne de contexte (classe, lieu, champ trouvé), ou chaîne vide. */
  readonly sub: string
  /** Cible de la ligne. */
  readonly target: RowTarget
  /** Vrai si choisir cette ligne mémorise la saisie dans les recherches récentes (résultats et « Voir les N », pas les actions ni les suggestions). */
  readonly remember: boolean
}

/** Section de la palette : un groupe de résultats, les actions, les recherches récentes… */
export interface PaletteSection {
  /** Identifiant stable (suffixe d'identifiant ARIA). */
  readonly id: string
  /** Libellé du groupe. */
  readonly label: string
  /** Nombre affiché à droite du libellé (total du groupe), ou `null`. */
  readonly count: number | null
  readonly rows: readonly PaletteRow[]
}

/** Filtre de type : un groupe de résultats, les actions, ou tous. */
export type PaletteFilter = 'all' | SearchGroup | 'action'

/** Puce de filtre. */
export interface FilterChip {
  readonly id: PaletteFilter
  readonly label: string
  readonly count: number
}

/** Libellé du groupe des actions. */
export const ACTIONS_LABEL = 'Actions'

/** Résultats par groupe quand un filtre de type est choisi (4 dans la vue « Tout », avec « Voir les N »). */
export const FILTERED_PER_GROUP = 8

/** Icône de chaque groupe de résultats (sprite du design system, aucune icône du jeu). */
export const GROUP_ICONS: Readonly<Record<SearchGroup, string>> = {
  weapon: 'c-greatsword',
  ash: 'skill',
  armor: 'shield',
  talisman: 'rune',
  spell: 'd-magic',
  spirit: 'd-holy',
  item: 'key',
  boss: 'boss',
  location: 'map',
  npc: 'npc',
  skill: 'skill',
  origin: 'origin',
  mechanic: 'book',
}

/**
 * Icône d'une action selon son effet.
 * @param effect Effet de l'action.
 * @returns Nom d'icône du sprite.
 */
export function actionIcon(effect: ActionEffect): string {
  switch (effect.type) {
    case 'open-criteria':
      return 'sliders'
    case 'toggle-theme':
      return 'sun'
    case 'export-state':
      return 'save'
    case 'import-state':
      return 'plus'
    default:
      return 'chev-r'
  }
}

const NO_PARTS = (text: string): HighlightPart[] => [{ text, match: false }]

/** Ligne d'un document de l'index. */
function hitRow(hit: SearchHit, query: string): PaletteRow {
  return {
    key: `hit:${hit.doc.group}:${hit.doc.ref}`,
    icon: GROUP_ICONS[hit.doc.group],
    parts: highlight(hit.doc.name, query),
    source: hit.doc.source,
    sub: contextLine(hit),
    target: { type: 'route', to: entityRoute(hit.doc.ref) },
    remember: true,
  }
}

/** Ligne d'une action. */
function actionRow(hit: ActionHit, query: string): PaletteRow {
  const { action } = hit
  return {
    key: `action:${action.id}`,
    icon: actionIcon(action.effect),
    parts: highlight(action.label, query),
    source: null,
    sub: '',
    target: action.effect.type === 'navigate' ? { type: 'route', to: action.effect.to } : { type: 'action', effect: action.effect },
    remember: false,
  }
}

/**
 * Puces de filtre par type : « Tout » puis seulement les types qui ont des résultats (note `spec-search`), dans l'ordre des groupes, « Actions » en dernier.
 * @param response Réponse de `search` (ses compteurs portent sur tous les groupes, quel que soit le filtre).
 * @param actions Actions trouvées par la saisie.
 * @returns Les puces ; vide s'il n'y a aucun résultat.
 */
export function buildFilterChips(response: SearchResponse, actions: ActionGroupResult): FilterChip[] {
  const total = response.total + actions.total
  if (total === 0) return []
  const chips: FilterChip[] = [{ id: 'all', label: 'Tout', count: total }]
  for (const group of GROUP_ORDER) {
    const count = response.counts[group]
    if (count) chips.push({ id: group, label: GROUP_LABELS[group], count })
  }
  if (actions.total > 0) chips.push({ id: 'action', label: ACTIONS_LABEL, count: actions.total })
  return chips
}

/**
 * Sections d'une saisie qui a des résultats : un groupe par type avec ses meilleurs résultats puis « Voir les N » s'il en reste, et les actions.
 * @param response Réponse de `search` (déjà limitée aux groupes du filtre).
 * @param actions Actions trouvées par la saisie.
 * @param query Saisie brute, pour le surlignage et le lien « Voir les N ».
 * @param filter Filtre de type en cours : `action` ne garde que les actions, un groupe n'affiche pas les actions.
 * @returns Les sections non vides.
 */
export function buildResultSections(response: SearchResponse, actions: ActionGroupResult, query: string, filter: PaletteFilter): PaletteSection[] {
  const sections: PaletteSection[] = []
  if (filter !== 'action') {
    for (const group of response.groups) {
      const rows = group.hits.map((hit) => hitRow(hit, query))
      if (group.total > group.hits.length) {
        rows.push({
          key: `more:${group.group}`,
          icon: 'chev-r',
          parts: NO_PARTS(`Voir les ${formatInt(group.total)}`),
          source: null,
          sub: `${group.label} : tous les résultats`,
          target: { type: 'route', to: { name: 'search', query: { q: query.trim(), groupe: group.group } } },
          remember: true,
        })
      }
      sections.push({ id: `g-${group.group}`, label: group.label, count: group.total, rows })
    }
  }
  if ((filter === 'all' || filter === 'action') && actions.hits.length > 0) {
    sections.push({ id: 'g-actions', label: ACTIONS_LABEL, count: actions.total, rows: actions.hits.map((hit) => actionRow(hit, query)) })
  }
  return sections
}

/**
 * Sections de la saisie vide : recherches récentes, éléments épinglés, actions.
 * @param recent Recherches récentes (la plus récente en premier).
 * @param pinned Éléments de Ma liste, avec leur document de l'index quand il est chargé (`null` sinon : l'identifiant tient lieu de nom).
 * @param actions Premières actions.
 * @returns Les sections non vides.
 */
export function buildIdleSections(recent: readonly string[], pinned: readonly { ref: EntityRef; doc: SearchDoc | null }[], actions: ActionGroupResult): PaletteSection[] {
  const sections: PaletteSection[] = []
  if (recent.length > 0) {
    sections.push({
      id: 'g-recent',
      label: 'Recherches récentes',
      count: null,
      rows: recent.map((text) => ({ key: `recent:${text}`, icon: 'clock', parts: NO_PARTS(text), source: null, sub: '', target: { type: 'query', query: text }, remember: false })),
    })
  }
  if (pinned.length > 0) {
    sections.push({
      id: 'g-pinned',
      label: 'Ma liste',
      count: null,
      rows: pinned.map(({ ref, doc }) => ({
        key: `pinned:${ref}`,
        icon: doc ? GROUP_ICONS[doc.group] : 'pin',
        parts: NO_PARTS(doc?.name ?? ref.slice(ref.indexOf(':') + 1)),
        source: doc?.source ?? null,
        sub: doc?.ctx.join(' · ') ?? '',
        target: { type: 'route', to: entityRoute(ref) } as RowTarget,
        remember: false,
      })),
    })
  }
  if (actions.hits.length > 0) {
    sections.push({ id: 'g-actions', label: ACTIONS_LABEL, count: null, rows: actions.hits.map((hit) => actionRow(hit, '')) })
  }
  return sections
}

/**
 * Sections d'une saisie sans résultat : suggestions du glossaire (« lune » → « moon ») et recherche sur le wiki si une adresse est fournie.
 * @param response Réponse de `search` (ses `suggestions` sont déjà filtrées sur celles qui donnent des résultats).
 * @param query Saisie brute.
 * @param wikiSearchUrl Fabrique l'adresse de recherche sur le wiki, ou `undefined` si l'application n'en propose pas.
 * @returns Les sections non vides.
 */
export function buildEmptySections(response: SearchResponse, query: string, wikiSearchUrl?: (q: string) => string): PaletteSection[] {
  const sections: PaletteSection[] = []
  if (response.suggestions.length > 0) {
    sections.push({
      id: 'g-suggestions',
      label: 'Essayez plutôt',
      count: null,
      rows: response.suggestions.map((s) => ({
        key: `suggestion:${s.query}`,
        icon: 'search',
        parts: NO_PARTS(s.query),
        source: null,
        sub: `${formatInt(s.count)} résultat${s.count > 1 ? 's' : ''}`,
        target: { type: 'query', query: s.query } as RowTarget,
        remember: false,
      })),
    })
  }
  const text = query.trim()
  if (wikiSearchUrl && text !== '') {
    sections.push({
      id: 'g-wiki',
      label: 'Hors du Codex',
      count: null,
      rows: [
        {
          key: 'wiki-search',
          icon: 'ext',
          parts: NO_PARTS(`Chercher « ${text} » sur le wiki`),
          source: null,
          sub: 'S’ouvre dans un nouvel onglet',
          target: { type: 'external', href: wikiSearchUrl(text) },
          remember: false,
        },
      ],
    })
  }
  return sections
}

/**
 * Aplatit les sections en la liste des lignes, dans l'ordre de navigation au clavier.
 * @param sections Sections affichées.
 * @returns Toutes les lignes, section après section.
 */
export function flattenRows(sections: readonly PaletteSection[]): PaletteRow[] {
  return sections.flatMap((s) => [...s.rows])
}
