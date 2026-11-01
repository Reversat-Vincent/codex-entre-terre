// Types du fichier `tables` : tables de calcul extraites de `mechanics.json`, chacune avec sa source (docs/architecture.md § 3.2).

/** Provenance d'une table : page de `mechanics.json` et chemin du tableau lu. */
export interface TableSource {
  readonly file: 'mechanics'
  /** Titre de la page (`topics[].title`). */
  readonly title: string
  /** Chemin JSON du tableau dans `data/mechanics.json`. */
  readonly path: string
}

/** Ligne de la table des coûts de niveau (page Level du wiki). */
export interface LevelCostRow {
  /** Niveau de départ. */
  readonly level: number
  /** Runes pour passer au niveau suivant (colonne « Runes to next »). */
  readonly runesToNext: number
  /** Colonne « Cost increase ». */
  readonly costIncrease: number
  /** Total de runes dépensées pour atteindre ce niveau (colonne « Total runes »). */
  readonly totalRunes: number
}

/** Ligne d'une table d'attribut : points de l'attribut → valeur de la statistique. */
export interface AttributeRow {
  readonly points: number
  readonly value: number
}

/**
 * Table de calcul.
 * @typeParam R Type d'une ligne.
 */
export interface CalcTable<R> {
  readonly source: TableSource
  /** Nom de colonne du wiki pour chaque champ d'une ligne. */
  readonly columns: Readonly<Record<keyof R, string>>
  readonly rows: readonly R[]
}

/** Tables de calcul ; `levelCosts` fait foi pour le coût en runes (décision C1). */
export interface CalcTables {
  /** Niveaux 1 à 713, continus. */
  readonly levelCosts: CalcTable<LevelCostRow>
  /** Vigor 1 à 99 → PV. */
  readonly hpByVigor: CalcTable<AttributeRow>
  /** Mind 1 à 99 → FP. */
  readonly fpByMind: CalcTable<AttributeRow>
  /** Endurance 1 à 99 → endurance (stamina). */
  readonly staminaByEndurance: CalcTable<AttributeRow>
  /** Endurance 1 à 99 → charge d'équipement. */
  readonly equipLoadByEndurance: CalcTable<AttributeRow>
}

/** Clé d'une table de calcul. */
export type CalcTableKey = keyof CalcTables

/** Fichier produit `tables`. */
export interface TablesFile {
  readonly schema: 1
  readonly key: 'tables'
  readonly tables: CalcTables
}
