// Modèle du widget A (armes recommandées au fil de la partie) : textes des états vides, actions d'élargissement, fil d'étapes, filtres et tris du plein écran.
// Logique pure, sans Vue ni store : les composants affichent ce que ce module décrit. Aucun score n'est calculé ici, tout vient du store `analysis`
// (méthode de calculs.md : « Score de recommandation d'une arme », « Recommandations par étape »).

import { ATTRIBUTE_KEYS, STATUS_KEYS } from '../../data/keys.ts'
import { normalizeText } from '../../data/slug.ts'
import type { ThreadStage, TabItem } from '../../components/ds/types.ts'
import { STAGE_IDS, stageIndex } from '../../engine/config/stages.ts'
import type { DlcZone, StageId } from '../../engine/config/stages.ts'
import type { HiddenReason, MaskReason, ScoredWeapon, StageColumn, WidenSuggestion } from '../../engine/score.ts'
import { dlcZoneRank } from '../../engine/stage.ts'
import type { Attributes } from '../../engine/types.ts'
import { DLC_ZONE_LABELS, STAGE_LABELS } from '../../ui/labels.ts'
import { defaultCriteria } from '../../stores/criteria.ts'
import type { CriteriaPatch } from '../../stores/criteria.ts'

// ---------------------------------------------------------------------------------------------
// Fil d'étapes et colonnes

/**
 * Régions citées sous chaque étape du fil d'or : les exemples du brief (§ 5.2 A), tous présents dans la table `REGION_STAGE` de `config/stages.ts`
 * avec la même étape. Texte d'aide seulement : l'étape d'une arme ne se lit jamais ici.
 */
export const STAGE_REGIONS: Readonly<Record<StageId, string>> = {
  early: 'Limgrave, Weeping Peninsula',
  mid: 'Liurnia of the Lakes, Caelid, Altus Plateau',
  late: 'Leyndell, Mountaintops of the Giants',
  endgame: 'Crumbling Farum Azula',
  dlc: 'Gravesite Plain → Enir-Ilim',
}

/** Complément de phrase de chaque étape (« Aucune arme de début de partie… »), tel que dans le prototype. */
const STAGE_PHRASE: Readonly<Record<StageId, string>> = {
  early: 'de début de partie',
  mid: 'de milieu de partie',
  late: 'de fin de partie',
  endgame: 'de fin de jeu',
  dlc: 'du DLC',
}

/**
 * Étapes du fil d'or, dans l'ordre de la progression.
 * @returns Une entrée par étape, avec son libellé et ses régions d'exemple.
 */
export function threadStages(): ThreadStage[] {
  return STAGE_IDS.map((id) => ({ id, label: STAGE_LABELS[id], regions: STAGE_REGIONS[id] }))
}

/**
 * Onglets de la version mobile : un par étape, avec le nombre d'armes recommandées en note.
 * @param columns Colonnes du store `analysis`.
 * @returns Les onglets, dans l'ordre des étapes.
 */
export function stageTabs(columns: readonly StageColumn[]): TabItem[] {
  return STAGE_IDS.map((id) => ({ id, label: STAGE_LABELS[id], note: String(columns.find((c) => c.stage === id)?.weapons.length ?? 0) }))
}

/**
 * Intertitre de sous-zone dans la colonne DLC (D11) : posé sur la première arme de chaque sous-zone, « DLC non localisé » en fin de colonne (D18).
 * @param weapons Armes de la colonne, déjà ordonnées par le moteur.
 * @param index Indice de l'arme.
 * @returns Le libellé de la sous-zone si l'arme ouvre un groupe, sinon `null`.
 */
export function dlcHeading(weapons: readonly ScoredWeapon[], index: number): string | null {
  const zoneOf = (i: number): DlcZone | null => weapons[i]?.stage.value?.dlcZone ?? null
  const zone = zoneOf(index)
  if (index > 0 && zoneOf(index - 1) === zone) return null
  return zone === null ? 'DLC non localisé' : DLC_ZONE_LABELS[zone]
}

/**
 * Rang de la sous-zone DLC d'une arme, pour le tri du plein écran (réexport commenté de `dlcZoneRank`).
 * @param row Arme évaluée.
 * @returns 0 à 2 pour Entrée, Cœur, Enir-Ilim ; 3 pour « DLC non localisé ».
 */
function zoneRankOf(row: ScoredWeapon): number {
  return dlcZoneRank(row.stage.value?.dlcZone ?? null)
}

// ---------------------------------------------------------------------------------------------
// Élargissements et états vides

/** Libellés des raisons qui masquent une arme : phrase du bouton d'élargissement, et raison affichée sur une ligne grisée du plein écran. */
export const HIDDEN_REASON_TEXTS: Readonly<Record<MaskReason | 'style', { readonly action: string; readonly reason: string; readonly icon: string }>> = {
  // Texte minimal (K-V1, tâche de logique) : « hors build » n'est jamais proposé en élargissement (`widenSuggestions`), seule sa raison s'affiche.
  'off-build': { action: 'Changer de build cible', reason: 'Hors du build cible', icon: 'sliders' },
  'content-sote': { action: 'Activer Shadow of the Erdtree', reason: 'Contenu Shadow of the Erdtree désactivé', icon: 'plus' },
  'content-tp': { action: 'Activer le Tarnished Pack', reason: 'Contenu Tarnished Pack désactivé', icon: 'plus' },
  remembrance: { action: 'Inclure les échanges de Remembrance', reason: 'Échange de Remembrance exclu', icon: 'trade' },
  'random-drop': { action: 'Inclure les butins aléatoires', reason: 'Butin aléatoire exclu', icon: 'dice' },
  quest: { action: 'Inclure les armes de quête', reason: 'Arme de quête exclue', icon: 'quest' },
  estimate: { action: 'Inclure les valeurs estimées', reason: 'Valeurs estimées exclues', icon: 'approx' },
  style: { action: 'Élargir le style à « Hybride »', reason: 'Hors du style choisi', icon: 'sliders' },
}

/**
 * Modification des critères qui lève une raison de masquage (chaque bouton d'élargissement l'applique au store `criteria`).
 * @param reason Raison à lever (ou `style` : élargir le style à « Hybride », qui garde tous les fichiers d'armes).
 * @returns La modification partielle des critères.
 */
export function wideningPatch(reason: HiddenReason | 'style'): CriteriaPatch {
  switch (reason) {
    case 'content-sote':
      return { content: { sote: true } }
    case 'content-tp':
      return { content: { tp: true } }
    case 'remembrance':
      return { constraints: { excludeRemembrance: false } }
    case 'random-drop':
      return { constraints: { excludeRandomDrop: false } }
    case 'quest':
      return { constraints: { excludeQuest: false } }
    case 'estimate':
      return { reliability: { includeEstimates: true } }
    case 'style':
      return { style: { mode: 'hybrid' } }
  }
}

/** Action proposée par un état vide : identifiant (raison levée, ou `all` pour « Voir toutes les armes »), libellé, icône. */
export interface EmptyChoice {
  readonly id: string
  readonly label: string
  readonly icon?: string
}

/** État vide d'une colonne : ce qui manque, pourquoi, et les actions d'élargissement, la plus efficace d'abord. */
export interface ColumnEmpty {
  readonly title: string
  readonly text: string
  readonly actions: readonly EmptyChoice[]
}

/**
 * Pluriel simple des armes (« 1 arme », « 3 armes »).
 * @param n Nombre.
 * @returns Le nom accordé, sans le nombre.
 */
export function armesText(n: number): string {
  return n > 1 ? 'armes' : 'arme'
}

/**
 * État vide d'une colonne d'étape (note `spec-main` : « message et élargissement le plus efficace — Remembrance, estimations, DLC, style »).
 * Trois cas : DLC désactivé (état vide avec « Activer ») ; armes toutes masquées par les critères (les actions viennent de `widen`, la plus
 * efficace d'abord) ; aucune arme à cette étape dans les fichiers chargés (« Voir toutes les armes », et le style si l'élargir en ajoute).
 * @param column Colonne vide du store `analysis`.
 * @param widen Suggestions d'élargissement de la colonne (`analysis.widen(étape)`), déjà triées.
 * @param soteEnabled Contenu Shadow of the Erdtree activé dans les critères.
 * @returns Le titre, la phrase et les actions.
 */
export function columnEmpty(column: StageColumn, widen: readonly WidenSuggestion[], soteEnabled: boolean): ColumnEmpty {
  const choices = (list: readonly WidenSuggestion[]): EmptyChoice[] =>
    list.slice(0, 3).map((s) => ({ id: s.reason, label: HIDDEN_REASON_TEXTS[s.reason].action, icon: HIDDEN_REASON_TEXTS[s.reason].icon }))
  if (column.stage === 'dlc' && !soteEnabled) {
    return {
      title: 'Shadow of the Erdtree est désactivé',
      text: 'Les armes du DLC viennent de ce contenu : activez-le pour les voir ici.',
      actions: [{ id: 'content-sote', label: HIDDEN_REASON_TEXTS['content-sote'].action, icon: 'plus' }],
    }
  }
  const title = `Aucune arme ${STAGE_PHRASE[column.stage]} ne correspond à vos critères`
  if (column.hiddenCount > 0) {
    const text = `Vos critères retirent ${column.hiddenCount > 1 ? `les ${column.hiddenCount} armes` : "l'arme"} de cette étape.`
    return { title, text, actions: choices(widen) }
  }
  return {
    title,
    text: "Aucune arme des fichiers chargés ne s'obtient à cette étape.",
    actions: [...choices(widen.filter((s) => s.reason === 'style')), { id: 'all', label: 'Voir toutes les armes' }],
  }
}

/**
 * Phrase sous une colonne qui a des armes mais aussi des armes masquées.
 * @param count Nombre d'armes masquées de l'étape.
 * @returns « 2 armes masquées par vos critères ».
 */
export function hiddenText(count: number): string {
  return `${count} ${armesText(count)} ${count > 1 ? 'masquées' : 'masquée'} par vos critères`
}

/**
 * Indique si un profil a été saisi : au moins un attribut diffère de la valeur par défaut des critères (tous à 10).
 * Sans profil, les puces de prérequis restent neutres (README RequirementChip). Hypothèse : aucun indicateur « profil configuré » n'existe
 * dans les stores, un profil par défaut est donc un profil jamais modifié.
 * @param attributes Attributs des critères.
 * @returns Vrai si le profil n'est plus celui des valeurs par défaut.
 */
export function isProfileConfigured(attributes: Attributes): boolean {
  const base = defaultCriteria().character.attributes
  return ATTRIBUTE_KEYS.some((k) => attributes[k] !== base[k])
}

// ---------------------------------------------------------------------------------------------
// Plein écran : filtres, tris, textes

/** Valeur du filtre « Étape » : une étape, toutes, ou les armes « Non classé » (sans étape ni score, D10 et D18). */
export type StageFilter = StageId | 'all' | 'unclassified'

/** Valeur du filtre « Amélioration ». */
export type MaterialFilter = 'all' | 'normal' | 'somber'

/** Filtres du tableau plein écran (note `spec-full`). */
export interface TableFilters {
  /** Recherche par nom (ou compétence), sans casse ni accents. */
  readonly query: string
  readonly stage: StageFilter
  /** Classe d'arme (`category` de `data/`) ; chaîne vide = toutes. */
  readonly category: string
  readonly material: MaterialFilter
  /** Seulement les armes dont tous les prérequis sont atteints. */
  readonly requirementsMet: boolean
  /** Affiche aussi, grisées, les armes exclues par les critères. */
  readonly showHidden: boolean
}

/** Filtres au premier affichage : tout, sans les armes masquées. */
export const DEFAULT_TABLE_FILTERS: TableFilters = { query: '', stage: 'all', category: '', material: 'all', requirementsMet: false, showHidden: false }

/**
 * Matériau d'amélioration d'une arme (`derived.upgrade.material`).
 * @param row Arme évaluée.
 * @returns `normal`, `somber`, ou `null` si non améliorable ou non documenté.
 */
function materialOf(row: ScoredWeapon): 'normal' | 'somber' | null {
  const m = row.candidate.weapon.derived.upgrade.material
  return m === 'Smithing Stones' ? 'normal' : m === 'Somber Smithing Stones' ? 'somber' : null
}

/**
 * Applique les filtres du plein écran. Les armes masquées par les critères ne sont gardées que si `showHidden` est vrai ; les autres filtres
 * s'appliquent à toutes.
 * @param rows Toutes les armes évaluées (`analysis.scored`).
 * @param f Filtres.
 * @returns Les lignes gardées, dans l'ordre reçu.
 */
export function filterRows(rows: readonly ScoredWeapon[], f: TableFilters): ScoredWeapon[] {
  const q = normalizeText(f.query.trim())
  return rows.filter((row) => {
    const w = row.candidate.weapon
    if (row.hidden !== null && !f.showHidden) return false
    if (q !== '' && !normalizeText(`${w.derived.displayName} ${w.skill.name ?? ''}`).includes(q)) return false
    const stage = row.stage.value?.stage ?? null
    if (f.stage === 'unclassified' ? stage !== null : f.stage !== 'all' && stage !== f.stage) return false
    if (f.category !== '' && w.category !== f.category) return false
    if (f.material !== 'all' && materialOf(row) !== f.material) return false
    if (f.requirementsMet && !(row.score.value?.requirements ?? []).every((r) => r.met)) return false
    return true
  })
}

/**
 * Indique si un filtre s'écarte des valeurs initiales (affiche « Effacer les filtres »).
 * @param f Filtres.
 * @returns Vrai si au moins un filtre est actif ; « Afficher les armes masquées » n'est pas un filtre.
 */
export function hasActiveFilters(f: TableFilters): boolean {
  return f.query.trim() !== '' || f.stage !== 'all' || f.category !== '' || f.material !== 'all' || f.requirementsMet
}

/**
 * Filtres actifs en phrases, pour le message « aucun résultat ».
 * @param f Filtres.
 * @returns Une phrase courte par filtre actif.
 */
export function activeFilterTexts(f: TableFilters): string[] {
  const out: string[] = []
  if (f.query.trim() !== '') out.push(`nom « ${f.query.trim()} »`)
  if (f.stage !== 'all') out.push(`étape ${f.stage === 'unclassified' ? 'Non classé' : STAGE_LABELS[f.stage]}`)
  if (f.category !== '') out.push(`classe ${f.category}`)
  if (f.material !== 'all') out.push(f.material === 'normal' ? 'pierres normales' : 'pierres sombres')
  if (f.requirementsMet) out.push('prérequis atteints')
  return out
}

/**
 * Classes d'armes présentes parmi les armes évaluées.
 * @param rows Armes évaluées.
 * @returns Les classes, triées en ordre alphabétique anglais, sans doublon.
 */
export function categoriesOf(rows: readonly ScoredWeapon[]): string[] {
  return [...new Set(rows.map((r) => r.candidate.weapon.category))].sort((a, b) => a.localeCompare(b, 'en'))
}

/**
 * Valeur de tri de la colonne Score : total (sans valeur pour une arme sans score, D18, qui passe en dernier).
 * @param row Arme évaluée.
 * @returns Le total, ou `null`.
 */
export function scoreSortValue(row: ScoredWeapon): number | null {
  return row.score.value?.total ?? null
}

/**
 * Valeur de tri de la colonne Étape : rang de l'étape, puis rang de la sous-zone DLC (D11) ; `null` pour une arme « Non classé ».
 * @param row Arme évaluée.
 * @returns Un nombre croissant avec la progression, ou `null`.
 */
export function stageSortValue(row: ScoredWeapon): number | null {
  const stage = row.stage.value?.stage
  return stage === undefined ? null : stageIndex(stage) * 10 + (stage === 'dlc' ? zoneRankOf(row) : 0)
}

/**
 * Valeur de tri de la colonne Attaque à +0 : somme des cinq types de dégâts de base, telle que dans les données (jamais recalculée).
 * @param row Arme évaluée.
 * @returns La somme.
 */
export function attackSortValue(row: ScoredWeapon): number {
  const a = row.candidate.weapon.attack_power
  return a.physical + a.magic + a.fire + a.lightning + a.holy
}

/**
 * Valeur de tri de la colonne Effet passif : la plus forte accumulation de statut chiffrée ; `null` sans statut chiffré.
 * @param row Arme évaluée.
 * @returns Le maximum, ou `null`.
 */
export function passiveSortValue(row: ScoredWeapon): number | null {
  const values = STATUS_KEYS.map((k) => row.candidate.weapon.status_buildup?.[k] ?? 0).filter((v) => v > 0)
  return values.length === 0 ? null : Math.max(...values)
}

/**
 * Valeur de tri de la colonne Prérequis : points d'attribut manquants (0 = tous atteints).
 * @param row Arme évaluée.
 * @returns Les points manquants, ou `null` si le score n'est pas disponible.
 */
export function missingSortValue(row: ScoredWeapon): number | null {
  return row.score.value?.missingPoints ?? null
}
