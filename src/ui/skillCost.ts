// Lecture du coût d'une compétence dans la notation du wiki « X (Y Z) » : partagée par la fiche d'arme et la fiche de cendre de guerre.
// Seule mise en forme du texte du wiki : aucun calcul de jeu (data/README.md, notation des coûts de compétence).

/** Coût d'une compétence lu dans la notation du wiki `X (Y Z)` : X la compétence, Y et Z les suites légère et lourde, `-` aucun. */
export interface SkillCost {
  /** Coût de la compétence elle-même ; `null` : aucun. */
  readonly skill: string | null
  readonly light: string | null
  readonly heavy: string | null
}

/**
 * Lit la notation de coût du wiki (`data/README.md`, `skill.fp_cost` : « X (Y Z) », `-` = aucun).
 * @param raw Texte de `fp_cost` ou `stamina_cost_wiki`.
 * @returns Les trois coûts, ou `null` si la notation n'est pas reconnue (le texte brut est alors affiché).
 */
export function parseSkillCost(raw: string): SkillCost | null {
  const text = raw.trim()
  const bare = /^(\d+(?:\.\d+)?|-)$/.exec(text)
  if (bare) return { skill: bare[1] === '-' ? null : (bare[1] ?? null), light: null, heavy: null }
  const full = /^(\d+(?:\.\d+)?|-)\s*\(\s*(\d+(?:\.\d+)?|-)\s+(\d+(?:\.\d+)?|-)\s*\)$/.exec(text)
  if (!full) return null
  const pick = (v: string | undefined): string | null => (v === undefined || v === '-' ? null : v)
  return { skill: pick(full[1]), light: pick(full[2]), heavy: pick(full[3]) }
}
