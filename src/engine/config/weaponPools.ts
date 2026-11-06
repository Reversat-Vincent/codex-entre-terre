// Armes candidates du widget A selon le style de jeu, catalyseurs du style « magie » selon les poids du build, et champ de puissance
// des catalyseurs (décision D7, précisions D18 et D39).
// Méthode : calculs.md, « Score de recommandation d'une arme », « Candidats selon le style de jeu » et composante 2.
// Les catégories sont les valeurs exactes de `category` dans data/ ; un test vérifie que chacune existe.

import type { WeaponAttributeKey } from '../../data/keys.ts'
import type { WeaponFileKey } from '../types.ts'

/** Style de jeu des critères. */
export type PlayStyle = 'melee' | 'ranged' | 'magic' | 'hybrid'

/** Réserve de candidats d'un style : fichiers lus et catégories retenues (`null` = toutes les catégories du fichier). */
export interface StylePool {
  readonly files: readonly WeaponFileKey[]
  readonly categories: readonly string[] | null
}

/** Catégories d'armes à distance (D7). */
export const RANGED_CATEGORIES: readonly string[] = ['Light Bows', 'Bows', 'Greatbows', 'Crossbows', 'Ballistas']

/** Catégories de catalyseurs (D7). */
export const CATALYST_CATEGORIES: readonly string[] = ['Staves', 'Sacred Seals']

/**
 * Candidats par style (D7) : mêlée → armes de mêlée ; distance → arcs, arbalètes, balistes ; magie → bâtons et sceaux, restreints ensuite
 * selon les poids du build (`MAGIC_CATALYST_ATTRIBUTE`, D39) ; hybride → tout.
 */
export const STYLE_POOLS: Readonly<Record<PlayStyle, StylePool>> = {
  melee: { files: ['melee_armaments'], categories: null },
  ranged: { files: ['ranged_weapons_catalysts'], categories: RANGED_CATEGORIES },
  magic: { files: ['ranged_weapons_catalysts'], categories: CATALYST_CATEGORIES },
  hybrid: { files: ['melee_armaments', 'ranged_weapons_catalysts'], categories: null },
}

/**
 * Attribut du build qui retient chaque catégorie de catalyseur pour le style « magie » (D39, S3 de docs/contenu/verification-socle.md ;
 * calculs.md, « Candidats selon le style de jeu ») : Staves si l'Intelligence a un poids non nul, Sacred Seals si la Foi en a un ;
 * les deux si les deux pèsent (build hybride) ou si aucun ne pèse. [wiki] Les sceaux ne tirent que de la Foi (page Spiraltree Seal :
 * `fai_scale = C`, `int_scale = -`) et les bâtons de l'Intelligence ; un catalyseur hors build aurait une adéquation nulle (F2).
 */
export const MAGIC_CATALYST_ATTRIBUTE: Readonly<Record<string, WeaponAttributeKey>> = {
  Staves: 'int',
  'Sacred Seals': 'fai',
}

/** Fichier des boucliers et torches : candidats seulement pour les catégories préférées, quel que soit le style (D7). */
export const SHIELD_FILE: WeaponFileKey = 'shields_torches'

/** Catégories du fichier des boucliers et torches. */
export const SHIELD_CATEGORIES: readonly string[] = ['Torches', 'Small Shields', 'Medium Shields', 'Greatshields', 'Thrusting Shields']

/** Champ de puissance de sort à +0 de chaque catégorie de catalyseur (D18) ; son plafond est le maximum observé, calculé au chargement. */
export const CATALYST_POWER_FIELD: Readonly<Record<string, 'sorcery_scaling' | 'incantation_scaling'>> = {
  Staves: 'sorcery_scaling',
  'Sacred Seals': 'incantation_scaling',
}
