// Mise en forme du détail du calculateur de runes : barres du coût par niveau, avec échantillonnage quand il y a beaucoup de niveaux.
// Aucune valeur de jeu produite : les coûts viennent de `analysis.runeCostsBetween` (calculs.md, « Coût en runes d'un niveau »).

import type { LevelRuneCost } from '../../engine/runes.ts'

/** Barre de la petite courbe : un niveau, son coût et sa hauteur relative. */
export interface CostBar {
  /** Niveau de départ du coût (runes pour passer de `level` à `level + 1`). */
  readonly level: number
  readonly cost: number
  /** Hauteur de la barre en % de la plus haute barre affichée (au moins 4 % pour rester visible). */
  readonly height: number
}

/** Nombre de barres au plus : au-delà, un niveau sur N est tracé (une barre doit rester lisible dans un widget de 5 colonnes). */
export const MAX_COST_BARS = 48

/**
 * Barres de la petite courbe du coût par niveau.
 * Quand la plage compte plus de `MAX_COST_BARS` niveaux, un niveau sur `step` est tracé et le dernier l'est toujours : la courbe reste fidèle
 * à la table (aucune moyenne), et `step` permet au widget de le dire.
 * @param costs Coûts par niveau, dans l'ordre croissant (`runeCostsBetween`).
 * @param max Nombre de barres au plus.
 * @returns Les barres et le pas d'échantillonnage (1 si tous les niveaux sont tracés).
 */
export function costBars(costs: readonly LevelRuneCost[], max: number = MAX_COST_BARS): { bars: CostBar[]; step: number } {
  if (costs.length === 0) return { bars: [], step: 1 }
  const step = Math.max(1, Math.ceil(costs.length / max))
  const picked = costs.filter((_, i) => i % step === 0 || i === costs.length - 1)
  const top = Math.max(...picked.map((c) => c.cost))
  return {
    bars: picked.map((c) => ({ level: c.level, cost: c.cost, height: top > 0 ? Math.max(4, Math.round((c.cost / top) * 100)) : 4 })),
    step,
  }
}
