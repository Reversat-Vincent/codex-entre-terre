// Actions proposées par la palette de recherche (groupe « Actions », docs/architecture.md § 8) : aller à un écran, ouvrir les critères, changer de thème, exporter ou importer.
// Le libellé français sert à l'affichage et à la recherche ; l'effet est une donnée que le composant de la palette exécute (routeur, stores) : ce module ne fait rien lui-même.

import { normalizeText } from '../data/slug.ts'
import { matchText, splitWords } from './match.ts'
import type { NameRank } from './match.ts'

/** Effet d'une action ; le composant de la palette l'exécute. */
export type ActionEffect =
  /** Ouvre un écran (chemin du routeur, docs/architecture.md § 9). */
  | { readonly type: 'navigate'; readonly to: string }
  /** Ouvre le panneau ou le tiroir des critères. */
  | { readonly type: 'open-criteria' }
  /** Bascule entre le thème sombre et le thème parchemin (`useAppPreferences`). */
  | { readonly type: 'toggle-theme' }
  /** Lance l'export du fichier de sauvegarde. */
  | { readonly type: 'export-state' }
  /** Ouvre la sélection d'un fichier à importer. */
  | { readonly type: 'import-state' }

/** Action de la palette. */
export interface PaletteAction {
  /** Identifiant stable (clé de liste, suivi des tests). */
  readonly id: string
  /** Libellé français affiché, et cherché. */
  readonly label: string
  /** Synonymes français cherchés au rang 3, jamais affichés. */
  readonly keywords: readonly string[]
  readonly effect: ActionEffect
}

const navigate = (id: string, label: string, to: string, keywords: readonly string[] = []): PaletteAction => ({
  id,
  label,
  keywords,
  effect: { type: 'navigate', to },
})

/**
 * Actions de la palette, dans l'ordre où la saisie vide les propose : commandes d'abord, puis écrans.
 * Les chemins sont ceux du routeur (docs/architecture.md § 9).
 */
export const ACTIONS: readonly PaletteAction[] = [
  { id: 'open-criteria', label: 'Ouvrir les critères', keywords: ['personnage', 'profil de jeu', 'niveau', 'filtres'], effect: { type: 'open-criteria' } },
  { id: 'toggle-theme', label: 'Changer de thème', keywords: ['sombre', 'parchemin', 'clair', 'apparence', 'mode'], effect: { type: 'toggle-theme' } },
  { id: 'export-state', label: 'Exporter mes données', keywords: ['sauvegarde', 'telecharger', 'fichier', 'profils'], effect: { type: 'export-state' } },
  { id: 'import-state', label: 'Importer des données', keywords: ['restaurer', 'charger', 'fichier', 'sauvegarde'], effect: { type: 'import-state' } },
  navigate('go-dashboard', 'Aller au tableau de bord', '/', ['accueil', 'widgets']),
  navigate('go-explore', 'Aller à Explorer', '/explorer', ['catalogues', 'parcourir']),
  navigate('go-weapons', 'Aller aux armes', '/armes', ['epees', 'melee', 'catalyseurs', 'boucliers']),
  navigate('go-ashes', 'Aller aux cendres de guerre', '/cendres-de-guerre', ['competences', 'ash of war']),
  navigate('go-armors', 'Aller aux armures', '/armures', ['casques', 'equipement']),
  navigate('go-talismans', 'Aller aux talismans', '/talismans', ['amulettes']),
  navigate('go-spells', 'Aller aux sorts', '/sorts', ['sorcelleries', 'incantations', 'magie']),
  navigate('go-spirits', 'Aller aux cendres d’esprit', '/esprits', ['invocations', 'spirit ashes']),
  navigate('go-items', 'Aller aux objets', '/objets', ['outils', 'materiaux', 'munitions', 'objets cles']),
  navigate('go-bosses', 'Aller aux boss', '/boss', ['combats', 'rencontres', 'ennemis']),
  navigate('go-locations', 'Aller aux lieux', '/lieux', ['regions', 'donjons', 'cartes']),
  navigate('go-npcs', 'Aller aux PNJ', '/pnj', ['personnages', 'marchands', 'quetes']),
  navigate('go-origins', 'Aller aux origines', '/origines', ['classes', 'departs']),
  navigate('go-mechanics', 'Aller aux mécaniques', '/mecaniques', ['regles', 'attributs', 'guide']),
  navigate('go-my-list', 'Aller à Ma liste', '/ma-liste', ['epingles', 'favoris']),
  navigate('go-compare', 'Aller au comparateur', '/comparateur', ['comparer']),
  navigate('go-profile', 'Aller au profil', '/profil', ['profils', 'preferences', 'reglages', 'stockage']),
]

interface PreparedAction {
  readonly action: PaletteAction
  readonly norm: string
  readonly keywordNorms: readonly string[]
}

/** Libellés normalisés, calculés une fois par liste d'actions (la liste ne change pas). */
const PREPARED = new WeakMap<readonly PaletteAction[], readonly PreparedAction[]>()

function prepare(actions: readonly PaletteAction[]): readonly PreparedAction[] {
  let prepared = PREPARED.get(actions)
  if (!prepared) {
    prepared = actions.map((action) => ({
      action,
      norm: normalizeText(action.label),
      keywordNorms: action.keywords.map((k) => normalizeText(k)),
    }))
    PREPARED.set(actions, prepared)
  }
  return prepared
}

/** Rang d'une action : 0 à 2 sur le libellé (voir `matchText`), 3 sur un synonyme. */
export type ActionRank = NameRank | 3

/** Action trouvée par la saisie. */
export interface ActionHit {
  readonly action: PaletteAction
  readonly rank: ActionRank
}

/** Résultat du groupe « Actions ». */
export interface ActionGroupResult {
  /** Nombre total d'actions qui correspondent (pour « Voir les N »). */
  readonly total: number
  /** Les premières, classées. */
  readonly hits: readonly ActionHit[]
}

const collator = new Intl.Collator('fr')

/**
 * Cherche parmi les actions : mêmes rangs que les documents (début du libellé, débuts de mots, sous-chaîne), puis les synonymes.
 * Départage par position, longueur du libellé, ordre alphabétique. Saisie vide : les premières actions dans l'ordre de `ACTIONS`.
 * Pas de tolérance aux fautes pour les actions.
 * @param q Saisie brute.
 * @param perGroup Nombre d'actions renvoyées (4 par défaut, comme les autres groupes).
 * @param actions Liste à parcourir (tests) ; `ACTIONS` par défaut.
 * @returns Le total et les actions classées, tronquées à `perGroup`.
 */
export function searchActions(q: string, perGroup = 4, actions: readonly PaletteAction[] = ACTIONS): ActionGroupResult {
  const prepared = prepare(actions)
  const query = normalizeText(q)
  if (query === '') {
    return { total: actions.length, hits: prepared.slice(0, perGroup).map((p) => ({ action: p.action, rank: 0 as const })) }
  }
  const words = splitWords(query)
  const scored: { hit: ActionHit; pos: number; len: number }[] = []
  for (const p of prepared) {
    const m = matchText(p.norm, query, words)
    if (m) {
      scored.push({ hit: { action: p.action, rank: m.rank }, pos: m.pos, len: p.norm.length })
      continue
    }
    let kwPos = -1
    for (const k of p.keywordNorms) {
      const km = matchText(k, query, words)
      if (km) {
        kwPos = km.pos
        break
      }
    }
    if (kwPos >= 0) scored.push({ hit: { action: p.action, rank: 3 }, pos: kwPos, len: p.norm.length })
  }
  scored.sort(
    (a, b) =>
      a.hit.rank - b.hit.rank || a.pos - b.pos || a.len - b.len || collator.compare(a.hit.action.label, b.hit.action.label),
  )
  return { total: scored.length, hits: scored.slice(0, perGroup).map((s) => s.hit) }
}
