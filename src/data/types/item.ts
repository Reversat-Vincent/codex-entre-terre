// Forme commune des entrées d'objets issues de la galerie du wiki (armures, talismans, sorts, esprits, outils, matériaux, objets clés, munitions, Cendres de guerre).
// Chaque fichier complète cette base dans son propre module, avec l'optionalité exacte de ses champs.

import { acquisitionSchema, infobox, sourceTag, wikiUrl } from './common.ts'
import type { AcquisitionDerived } from './common.ts'
import { arr, str } from './schema.ts'

/** Champs présents dans toutes les entrées des fichiers de la galerie. */
export const itemBaseShape = {
  name: str,
  wiki_page: str,
  url: wikiUrl,
  /** Section de la galerie « All Items (Gallery) ». */
  section: str,
  category: str,
  source: sourceTag,
  acquisition: arr(acquisitionSchema),
  /** Grandes régions repérées dans le texte d'acquisition (C6 : faux `Altus Plateau` retirés, data/CHANGELOG.md). */
  regions_mentioned: arr(str),
  /** Indices heuristiques sur le mode d'obtention. */
  acquisition_flags: arr(str),
  infobox,
} as const

/** Champs dérivés d'un objet de la galerie. */
export type ItemDerived = AcquisitionDerived
