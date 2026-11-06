// Mise en forme des lignes de la matrice des faiblesses pour `CxAbsorptionHeatmap` : adresse de la fiche et tri par type de dégâts.
// Aucune méthode de calculs.md ici : les lignes (frise, absorption, immunités) viennent du getter `weaknessRows` du store `analysis`.

import type { NegationKey } from '../../data/keys.ts'
import type { HeatmapRow } from '../../components/ds/types.ts'
import type { WeaknessRow } from '../../engine/weakness.ts'

/** Construit l'adresse de la fiche d'un boss, sur la rencontre demandée (`?rencontre=`). */
export type BossHref = (bossId: string, encounterId: string) => string

/**
 * Lignes de la matrice prêtes pour `CxAbsorptionHeatmap` : les lignes du store, avec l'adresse de la fiche du boss sur la rencontre.
 * @param rows Lignes de `analysis.weaknessRows(portée)` (sans adresse).
 * @param href Construction de l'adresse de la fiche (le routeur est propre à l'interface).
 * @returns Les lignes, dans le même ordre.
 */
export function heatmapRows(rows: readonly WeaknessRow[], href: BossHref): HeatmapRow[] {
  return rows.map(
    (row): HeatmapRow => ({
      id: row.id,
      name: row.name,
      ...(row.subtitle === undefined ? {} : { subtitle: row.subtitle }),
      href: href(row.bossId, row.encounterId),
      done: row.done,
      negation: row.negation,
      immunities: row.immunities,
    }),
  )
}

/**
 * Classe les lignes du plus vulnérable au plus résistant pour un type de dégâts (tri stable ; les valeurs absentes en dernier).
 * @param rows Lignes dans l'ordre de l'histoire.
 * @param by Type de dégâts, ou `null` pour garder l'ordre d'origine.
 * @returns Une nouvelle liste.
 */
export function sortRows(rows: readonly HeatmapRow[], by: NegationKey | null): HeatmapRow[] {
  if (by === null) return [...rows]
  const value = (row: HeatmapRow): number => row.negation?.[by] ?? Number.POSITIVE_INFINITY
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const va = value(a.row)
      const vb = value(b.row)
      return va === vb ? a.i - b.i : va < vb ? -1 : 1
    })
    .map((x) => x.row)
}
