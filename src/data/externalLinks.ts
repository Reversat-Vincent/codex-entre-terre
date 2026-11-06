// Liens externes de l'application (D25, D26, D29) : « Voir sur le wiki », recherche sur Fextralife et sur le wiki, cartes interactives, guides.
// Adresses seulement : l'application ne fait aucune requête vers ces sites ; les liens s'ouvrent dans un nouvel onglet (docs/architecture.md § 10.4).

import type { LabelCode } from '../engine/codes.ts'
import { WIKI_URL_PREFIX } from './types/common.ts'

/** Site d'un lien externe. */
export type ExternalSite = 'wiki-gg' | 'fextralife'

/** Lien externe fixe : site, adresse et code du libellé (texte dans `src/ui/explainText.ts`). */
export interface ExternalLink {
  readonly id: string
  readonly site: ExternalSite
  readonly url: string
  readonly labelCode: LabelCode
}

/** Racine d'eldenring.wiki.gg (source des données, CC BY-SA 4.0). */
const WIKI_GG = 'https://eldenring.wiki.gg'
/** Racine du wiki Fextralife : liens seulement, aucune donnée ni ressource chargée (D22, D26). */
const FEXTRALIFE = 'https://eldenring.wiki.fextralife.com'

/**
 * Lien « Voir sur le wiki » d'une entrée : son `url`, si elle pointe bien vers eldenring.wiki.gg (contrôle de la préparation, § 3.5).
 * @param entry Entrée de data/ (ou rencontre) avec son `url`.
 * @returns L'adresse, ou `null` si elle manque ou ne vise pas le wiki.
 */
export function wikiUrlOf(entry: { readonly url?: string | null }): string | null {
  const url = entry.url
  return typeof url === 'string' && url.startsWith(WIKI_URL_PREFIX) ? url : null
}

/**
 * Adresse de recherche de Fextralife pour un nom (« Voir sur Fextralife », D26) ; le nom est encodé, rien n'est envoyé par l'application.
 * @param name Nom de l'entité, tel que dans data/.
 * @returns L'adresse de recherche.
 */
export function fextralifeSearchUrl(name: string): string {
  return `${FEXTRALIFE}/index.php?search=${encodeURIComponent(name.trim())}`
}

/**
 * Adresse de recherche d'eldenring.wiki.gg (état « aucun résultat » de la recherche globale).
 * @param query Texte saisi.
 * @returns L'adresse de la recherche du wiki.
 */
export function wikiSearchUrl(query: string): string {
  return `${WIKI_GG}/index.php?search=${encodeURIComponent(query.trim())}`
}

/**
 * Cartes interactives (D25, D29) : celle d'eldenring.wiki.gg (`Map:ELDEN_RING`, marqueurs du jeu de base seulement, complements-wiki-gg.md § 5)
 * et celle de Fextralife.
 */
export const INTERACTIVE_MAPS: readonly ExternalLink[] = [
  { id: 'map-wiki-gg', site: 'wiki-gg', url: `${WIKI_GG}/wiki/Map:ELDEN_RING`, labelCode: 'link-map-wiki-gg' },
  { id: 'map-fextralife', site: 'fextralife', url: `${FEXTRALIFE}/Interactive_Map`, labelCode: 'link-map-fextralife' },
]

/** Pages de guides et de progression des deux wikis (D29). */
export const GUIDE_LINKS: readonly ExternalLink[] = [
  { id: 'guide-elden-ring-guide', site: 'wiki-gg', url: `${WIKI_GG}/wiki/Elden_Ring_Guide`, labelCode: 'link-guide-elden-ring-guide' },
  { id: 'guide-recommended-level', site: 'wiki-gg', url: `${WIKI_GG}/wiki/Recommended_Level_by_Location`, labelCode: 'link-guide-recommended-level' },
  { id: 'guide-walkthrough-wiki-gg', site: 'wiki-gg', url: `${WIKI_GG}/wiki/Walkthrough`, labelCode: 'link-guide-walkthrough-wiki-gg' },
  { id: 'guide-progress-route', site: 'fextralife', url: `${FEXTRALIFE}/Game_Progress_Route`, labelCode: 'link-guide-progress-route' },
  { id: 'guide-walkthrough-fextralife', site: 'fextralife', url: `${FEXTRALIFE}/Walkthrough`, labelCode: 'link-guide-walkthrough-fextralife' },
]
