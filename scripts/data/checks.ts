// Erreur des contrôles bloquants et rapport des contrôles non bloquants (docs/architecture.md § 3.5).
// Un contrôle bloquant arrête la préparation avec un message clair ; il ne corrige jamais rien.

/** Nombre maximal d'écarts cités par contrôle dans le message (le décompte reste exact). */
const MAX_LISTED = 25

/** Échec d'un contrôle bloquant : nom du contrôle et écarts trouvés. */
export class DataCheckError extends Error {
  readonly control: string
  readonly failures: readonly string[]

  /**
   * @param control Nom du contrôle, en français.
   * @param failures Écarts trouvés, un par ligne.
   */
  constructor(control: string, failures: readonly string[]) {
    const listed = failures.slice(0, MAX_LISTED).map((f) => `  - ${f}`)
    const more = failures.length > MAX_LISTED ? [`  … et ${failures.length - MAX_LISTED} autres`] : []
    super([`Contrôle bloquant échoué : ${control} (${failures.length} écart(s))`, ...listed, ...more].join('\n'))
    this.name = 'DataCheckError'
    this.control = control
    this.failures = failures
  }
}

/**
 * Lève une `DataCheckError` si la liste d'écarts n'est pas vide.
 * @param control Nom du contrôle.
 * @param failures Écarts trouvés.
 * @throws DataCheckError si `failures` n'est pas vide.
 */
export function assertNoFailures(control: string, failures: readonly string[]): void {
  if (failures.length > 0) throw new DataCheckError(control, failures)
}

/** Constat non bloquant : nombre d'occurrences et exemples. */
export interface ReportItem {
  readonly count: number
  readonly examples: readonly string[]
}

/** Rapport des contrôles non bloquants, écrit dans `.cache/data/report.json`. */
export interface DataReport {
  /** Morceaux de lieu ou de région non résolus, par jeu de données : texte → occurrences. */
  readonly unresolvedNames: Record<string, Record<string, number>>
  /** Régions retenues absentes des 79 valeurs connues (donc de la table d'étapes) : valeur → occurrences. */
  readonly regionsOutsideStageTable: Record<string, number>
  /** Règle `prefix` appliquée (`Volcano Manor (Mt. Gelmir)` → `Volcano Manor`) : texte → occurrences. */
  readonly prefixRuleApplied: Record<string, number>
  /** Restes d'extraction rattachés au lieu cité : texte → occurrences. */
  readonly extractionResidues: Record<string, number>
  /** Restes de balisage (`ER Icon … .png`) par jeu de données. */
  readonly markupResidues: Record<string, ReportItem>
  /** Méthodes d'acquisition absentes de la table de normalisation (classées `other`) : valeur → occurrences. */
  readonly unknownMethods: Record<string, number>
  /** Valeurs connues absentes de data/ (contrôle de la liste des 79). */
  readonly knownRegionsNotFound: string[]
  /** Entrées sans aucune région déduite, par jeu de données. */
  readonly entriesWithoutRegion: Record<string, number>
  /** Butins d'envahisseurs non rattachés à une entrée (ensembles d'armure, runes…) : texte → occurrences. */
  readonly invaderDropsUnmatched: Record<string, number>
}

/**
 * Crée un rapport vide.
 * @returns Un rapport sans constat.
 */
export function emptyReport(): DataReport {
  return {
    unresolvedNames: {},
    regionsOutsideStageTable: {},
    prefixRuleApplied: {},
    extractionResidues: {},
    markupResidues: {},
    unknownMethods: {},
    knownRegionsNotFound: [],
    entriesWithoutRegion: {},
    invaderDropsUnmatched: {},
  }
}

/**
 * Incrémente un compteur de rapport.
 * @param counter Dictionnaire texte → occurrences, modifié en place.
 * @param key Texte compté.
 */
export function bump(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1
}
