// Identifiants et normalisation du texte, partagés par la préparation des données (scripts/) et l'application.
// Changer `slug` change les identifiants stockés : c'est un changement de schéma de persistance (docs/architecture.md § 3.3 et § 7).

/**
 * Transforme un titre en identifiant d'URL (docs/architecture.md § 3.3).
 * Règle : décomposition NFD, diacritiques retirés, minuscules, apostrophes `'` et `’` supprimées,
 * toute autre suite de caractères hors `[a-z0-9]` remplacée par un tiret, tirets de bord retirés.
 * @param text Titre d'origine (`wiki_page`, `title`, nom de rencontre…).
 * @returns L'identifiant, éventuellement vide si le titre ne contient aucune lettre ni chiffre.
 * @example slug("Rykard, Lord of Blasphemy") === "rykard-lord-of-blasphemy"
 */
export function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Normalise un texte pour la recherche (docs/architecture.md § 8) : NFD, diacritiques retirés, minuscules,
 * apostrophes supprimées, tout autre signe remplacé par une espace, espaces multiples réduites.
 * Utilisée pour le champ `norm` de l'index de recherche ; la recherche doit appliquer la même fonction à la requête.
 * @param text Texte d'origine.
 * @returns Le texte normalisé, sans espace de bord.
 * @example normalizeText("Jolán, Swordhand") === "jolan swordhand"
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
