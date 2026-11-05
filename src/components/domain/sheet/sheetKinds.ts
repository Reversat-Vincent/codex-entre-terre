// Genres de fiche couverts par les composants communs `sheet/` : jeu de données, route du catalogue, libellés et icône de chaque genre.
// Les libellés sont du texte d'interface (français) ; les noms d'entités restent ceux des données.

import { DATASETS } from '../../../data/datasets.ts'
import type { DatasetKey, EntityKind } from '../../../data/datasets.ts'

/** Genres qui utilisent les composants de fiche communs (les autres fiches s'y ajouteront : objets, lieux, PNJ, origines). */
export type SheetKind = Extract<EntityKind, 'ash' | 'armor' | 'talisman' | 'spell' | 'spirit'>

/** Description d'un genre de fiche. */
export interface SheetKindInfo {
  readonly kind: SheetKind
  /** Jeu de données qui contient les entrées de ce genre. */
  readonly dataset: DatasetKey
  /** Nom de la route du catalogue (`DATASETS[dataset].routes.list`). */
  readonly listRoute: string
  /** Libellé du catalogue (fil d'Ariane). */
  readonly listLabel: string
  /** Nom du genre au singulier, pour l'en-tête (« Armure »). */
  readonly singular: string
  /** Icône du sprite du genre. */
  readonly icon: string
  /** Titre de l'état « introuvable » : ce qui manque. */
  readonly missingTitle: string
  /** Libellé du lien de retour vers le catalogue. */
  readonly backLabel: string
  /** Titre de l'état d'erreur de lecture. */
  readonly errorTitle: string
}

/**
 * Assemble la description d'un genre de fiche ; le libellé et la route du catalogue viennent du registre des jeux de données.
 * @param kind Genre d'entité.
 * @param dataset Jeu de données du genre.
 * @param singular Nom du genre au singulier.
 * @param icon Icône du sprite.
 * @param missingTitle Titre de l'état « introuvable ».
 * @param backLabel Libellé du lien de retour.
 * @param errorTitle Titre de l'état d'erreur.
 * @returns La description du genre.
 */
function info(
  kind: SheetKind,
  dataset: DatasetKey,
  singular: string,
  icon: string,
  missingTitle: string,
  backLabel: string,
  errorTitle: string,
): SheetKindInfo {
  return {
    kind,
    dataset,
    listRoute: DATASETS[dataset].routes.list,
    listLabel: DATASETS[dataset].label,
    singular,
    icon,
    missingTitle,
    backLabel,
    errorTitle,
  }
}

/** Informations de chaque genre de fiche. */
export const SHEET_KINDS: Readonly<Record<SheetKind, SheetKindInfo>> = {
  ash: info('ash', 'ashes_of_war', 'Cendre de guerre', 'skill', 'Cette cendre de guerre n’existe pas dans les données.', 'Voir toutes les cendres de guerre', 'Impossible de lire les cendres de guerre.'),
  armor: info('armor', 'armor', 'Armure', 'shield', 'Cette armure n’existe pas dans les données.', 'Voir toutes les armures', 'Impossible de lire les armures.'),
  talisman: info('talisman', 'talismans', 'Talisman', 'heart', 'Ce talisman n’existe pas dans les données.', 'Voir tous les talismans', 'Impossible de lire les talismans.'),
  spell: info('spell', 'spells', 'Sort', 'book', 'Ce sort n’existe pas dans les données.', 'Voir tous les sorts', 'Impossible de lire les sorts.'),
  spirit: info('spirit', 'spirit_ashes', 'Cendre d’esprit', 'npc', 'Cette cendre d’esprit n’existe pas dans les données.', 'Voir toutes les cendres d’esprit', 'Impossible de lire les cendres d’esprit.'),
}
