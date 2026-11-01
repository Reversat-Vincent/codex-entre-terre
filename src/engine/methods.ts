// Registre des méthodes de calcul : pour chaque `MethodId`, la section de `docs/design/ds/calculs.md` qui la décrit.
// Aucun texte d'interface ici : titres et résumés français viennent de `src/ui/explainText.ts` (docs/architecture.md § 5.1, P11).

import type { MethodId } from './types.ts'

/** Référence d'une méthode dans `calculs.md`. */
export interface MethodInfo {
  readonly id: MethodId
  /** Titre exact de la section (`##` ou `###`) de `calculs.md`, ou `null` si la méthode n'y est pas encore décrite. */
  readonly section: string | null
}

/** Section de `calculs.md` de chaque méthode ; un test vérifie que chaque titre existe dans le document. */
export const METHODS: Readonly<Record<MethodId, MethodInfo>> = {
  stage: { id: 'stage', section: "Étape de progression d'une arme" },
  'weapon-score': { id: 'weapon-score', section: "Score de recommandation d'une arme (0–100)" },
  requirements: { id: 'requirements', section: 'Prérequis comparés au profil' },
  'optimal-origin': { id: 'optimal-origin', section: 'Origine optimale' },
  'target-attributes': { id: 'target-attributes', section: 'Build cible' },
  'boss-level': { id: 'boss-level', section: "Niveau recommandé d'un boss et préparation" },
  readiness: { id: 'readiness', section: 'Préparation et jauge' },
  'rune-cost': { id: 'rune-cost', section: "Coût en runes d'un niveau" },
  'upgrade-plan': { id: 'upgrade-plan', section: "Plan d'amélioration" },
  'derived-stats': { id: 'derived-stats', section: 'Statistiques dérivées' },
  'attack-power': { id: 'attack-power', section: "Puissance d'attaque calculée (Estimation)" },
  // Le niveau d'un jeu d'attributs (Σ − 79) est énoncé dans la section « Origine optimale ».
  level: { id: 'level', section: 'Origine optimale' },
  // La couverture des données n'a pas encore de section dans calculs.md (signalé au chef de projet).
  coverage: { id: 'coverage', section: null },
}

/**
 * Référence de la section de `calculs.md` d'une méthode.
 * @param id Identifiant de la méthode.
 * @returns L'identifiant et le titre de section.
 */
export function methodInfo(id: MethodId): MethodInfo {
  return METHODS[id]
}
