// Libellés français des types de compétence d'arme (`skill.type`) : une seule table pour la fiche d'arme, le catalogue et la carte d'arme (D46).
// Seule mise en forme d'un texte du wiki : aucun calcul de jeu.

/** Libellés des types de compétence connus des données ; même casse partout (D46). */
const SKILL_TYPE_LABELS: Readonly<Record<string, string>> = {
  'Unique Skill': 'Compétence unique',
  'Ash of War skill': 'Compétence de cendre de guerre',
  'Standard skill (no Ash of War item)': 'Compétence sans cendre de guerre',
  'No skill': 'Aucune',
}

/** Valeur de `skill.type` d'une arme sans compétence. */
export const NO_SKILL_TYPE = 'No skill'

/**
 * Libellé français du type de compétence.
 * @param type Valeur de `skill.type`.
 * @returns Le libellé (« Aucune » pour une arme sans compétence) ; un type inconnu est repris tel quel. La recherche passe par `Object.hasOwn` :
 * une valeur venue d'ailleurs ne peut pas désigner un membre du prototype.
 */
export function skillTypeLabel(type: string): string {
  return Object.hasOwn(SKILL_TYPE_LABELS, type) ? (SKILL_TYPE_LABELS[type] as string) : type
}
