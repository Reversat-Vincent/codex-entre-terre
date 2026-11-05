// Modèle du panneau de critères : libellés français des choix, texte des puces, listes à cocher (classes, boss, régions) et décomptes.
// Fonctions pures, sans Vue ni store : les composants du panneau les appellent avec les données qu'ils lisent dans les stores.
// Les nombres affichés sont des décomptes de données ; aucun calcul du moteur n'est refait ici.

import type { CriteriaChip as ChipView } from '../ds/types.ts'
import type { SelectOption } from '../ds/types.ts'
import type { LocationEntry } from '../../data/types/locations.ts'
import type { OriginEntry } from '../../data/types/origins.ts'
import type { WeaponEntry } from '../../data/types/weapon.ts'
import { ARCHETYPE_IDS } from '../../engine/config/archetypes.ts'
import type { ArchetypeKey } from '../../engine/config/archetypes.ts'
import { REGION_STAGE, STAGE_IDS, stageIndex } from '../../engine/config/stages.ts'
import type { StageId } from '../../engine/config/stages.ts'
import type { StageRecommendations } from '../../engine/score.ts'
import type { TimelineView } from '../../engine/timeline.ts'
import type { Attributes } from '../../engine/types.ts'
import type { Criteria, ProgressMode, StonePreference, StyleMode } from '../../persistence/model.ts'
import type { CriteriaChip as AnalysisChip } from '../../stores/analysis.ts'
import type { CriteriaPatch } from '../../stores/criteria.ts'
import { formatInt } from '../../ui/format.ts'
import { STAGE_LABELS, STATUS_BY_DATA_KEY, STATUS_LABELS } from '../../ui/labels.ts'
import type { AttributeKey } from '../../ui/labels.ts'

/** Sections du panneau, dans l'ordre d'affichage (note `spec-sheet`). */
export const SECTION_IDS = ['content', 'character', 'style', 'progress', 'constraints', 'reliability'] as const

/** Identifiant d'une section du panneau de critères. */
export type SectionId = (typeof SECTION_IDS)[number]

/** Titres des sections (note `spec-sheet`, design `Main.dc.html`). */
export const SECTION_TITLES: Readonly<Record<SectionId, string>> = {
  content: 'Contenu',
  character: 'Personnage',
  style: 'Style de jeu',
  progress: 'Progression',
  constraints: 'Contraintes d’obtention',
  reliability: 'Fiabilité',
}

/** Section ouverte par défaut dans les panneaux repliables (note `spec-sheet`). */
export const DEFAULT_OPEN_SECTION: SectionId = 'character'

/** Noms français des archétypes de build (design `Main.dc.html`, `ARCH`). */
export const ARCHETYPE_LABELS: Readonly<Record<ArchetypeKey, string>> = {
  str: 'Force',
  dex: 'Dextérité',
  qual: 'Qualité (Force et Dextérité)',
  int: 'Intelligence',
  fai: 'Foi',
  arc: 'Arcane',
  dexarc: 'Dextérité / Arcane',
  intdex: 'Intelligence / Dextérité',
  intfai: 'Intelligence / Foi',
  strfai: 'Force / Foi',
}

/** Libellés des styles de jeu. */
export const STYLE_LABELS: Readonly<Record<StyleMode, string>> = { melee: 'Mêlée', ranged: 'Distance', magic: 'Magie', hybrid: 'Hybride' }

/** Libellés des modes de saisie de la progression. */
export const PROGRESS_MODE_LABELS: Readonly<Record<ProgressMode, string>> = { stage: 'Étape', boss: 'Boss', region: 'Régions' }

/** Libellés de la préférence de pierres d'amélioration. */
export const STONE_LABELS: Readonly<Record<StonePreference, string>> = { none: 'Indifférent', normal: 'Normales', somber: 'Sombres' }

/** Libellés des exclusions d'obtention (puces et interrupteurs). */
export const EXCLUSION_LABELS = {
  remembrance: 'Exclure les échanges de Remembrance',
  'random-drop': 'Exclure les butins aléatoires à farmer',
  quest: 'Exclure les objets de quêtes de PNJ',
} as const

/** Options d'une liste déroulante d'archétypes : « Aucun » (valeur vide) puis les dix archétypes. */
export function archetypeOptions(): SelectOption[] {
  return [
    { value: '', label: 'Aucun : déduit des attributs actuels' },
    ...ARCHETYPE_IDS.map((id) => ({ value: id, label: ARCHETYPE_LABELS[id] })),
  ]
}

/**
 * Nom français d'un archétype.
 * @param id Identifiant d'archétype des critères (une valeur inconnue est rendue telle quelle).
 * @returns Le nom affiché.
 */
export function archetypeName(id: string): string {
  return (ARCHETYPE_LABELS as Readonly<Record<string, string>>)[id] ?? id
}

/**
 * Options de la liste d'origines : « Automatique », puis les origines des données (celles du Tarnished Pack nommées comme telles).
 * L'origine choisie reste proposée même si elle n'est plus dans la liste (contenu désactivé, identifiant inconnu des données).
 * @param origins Origines proposées (contenu activé).
 * @param all Toutes les origines des données, pour retrouver le nom de l'origine choisie.
 * @param chosen Valeur actuelle (`auto` ou identifiant).
 * @returns Les options.
 */
export function originOptions(origins: readonly OriginEntry[], all: readonly OriginEntry[], chosen: string): SelectOption[] {
  const label = (o: OriginEntry): string => (o.source === 'Tarnished Pack' ? `${o.name} (Tarnished Pack)` : o.name)
  const out: SelectOption[] = [{ value: 'auto', label: 'Automatique (la mieux classée)' }, ...origins.map((o) => ({ value: o.id, label: label(o) }))]
  if (chosen !== 'auto' && !out.some((o) => o.value === chosen)) {
    const known = all.find((o) => o.id === chosen)
    out.push({ value: chosen, label: known ? label(known) : chosen })
  }
  return out
}

/**
 * Relève chaque attribut au moins à sa valeur de départ pour l'origine choisie (comportement du design : choisir une origine ne baisse rien).
 * @param attributes Attributs actuels.
 * @param start Attributs de départ de l'origine.
 * @returns Les nouveaux attributs.
 */
export function raiseToOrigin(attributes: Attributes, start: Attributes): Attributes {
  const out = { ...attributes }
  for (const key of Object.keys(out) as AttributeKey[]) out[key] = Math.max(out[key], start[key])
  return out
}

/** Classe d'armes et nombre d'armes qu'elle compte. */
export interface WeaponClass {
  readonly name: string
  readonly count: number
}

/**
 * Classes d'armes présentes dans les données (champ `category`), de la plus fournie à la moins fournie, puis par nom.
 * @param weapons Armes des trois fichiers d'armes chargés.
 * @returns Les classes.
 */
export function weaponClasses(weapons: readonly WeaponEntry[]): WeaponClass[] {
  const counts = new Map<string, number>()
  for (const w of weapons) counts.set(w.category, (counts.get(w.category) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'))
}

/** Nombre de classes visibles avant « Voir les N classes ». */
export const CLASSES_COLLAPSED = 8

/**
 * Classes à afficher : les plus fournies, plus les classes choisies qui n'en font pas partie ; toutes une fois la liste dépliée.
 * @param classes Toutes les classes.
 * @param selected Classes choisies.
 * @param expanded Liste dépliée.
 * @returns Les classes affichées.
 */
export function visibleClasses(classes: readonly WeaponClass[], selected: readonly string[], expanded: boolean): WeaponClass[] {
  if (expanded) return [...classes]
  return classes.filter((c, i) => i < CLASSES_COLLAPSED || selected.includes(c.name))
}

/** Décomptes d'armes par contenu et nombre d'armes estimées. */
export interface WeaponCounts {
  readonly base: number
  readonly sote: number
  readonly tp: number
  readonly estimated: number
}

/**
 * Compte les armes par source et celles dont le type d'amélioration est estimé.
 * @param weapons Armes chargées.
 * @returns Les décomptes.
 */
export function weaponCounts(weapons: readonly WeaponEntry[]): WeaponCounts {
  let base = 0
  let sote = 0
  let tp = 0
  let estimated = 0
  for (const w of weapons) {
    if (w.source === 'Base game') base++
    else if (w.source === 'Shadow of the Erdtree') sote++
    else if (w.source === 'Tarnished Pack') tp++
    if (w.derived.upgrade.reliability === 'estimate') estimated++
  }
  return { base, sote, tp, estimated }
}

/** Boss de la liste à cocher. */
export interface BossCheck {
  /** Identifiant du nœud de la frise. */
  readonly id: string
  /** Nom du boss, tel que dans les données. */
  readonly label: string
  /** Rencontres cochées ensemble. */
  readonly keys: readonly string[]
  readonly checked: boolean
}

/**
 * Liste des boss à cocher : les nœuds de la frise (prérequis compris) dans l'ordre de lecture, puis la voie DLC si l'extension est activée.
 * @param timeline Frise issue du store d'analyse.
 * @param nameOf Nom d'un boss d'après son identifiant (jeu de données `bosses`), `null` s'il est inconnu.
 * @param includeDlc Shadow of the Erdtree activé.
 * @returns Les boss, sans doublon.
 */
export function bossChecklist(timeline: TimelineView, nameOf: (bossId: string) => string | null, includeDlc: boolean): BossCheck[] {
  const out: BossCheck[] = []
  const push = (n: { id: string; boss: string; keys: readonly string[]; defeated: boolean }): void => {
    if (out.some((o) => o.id === n.id)) return
    out.push({ id: n.id, label: nameOf(n.boss) ?? n.boss, keys: n.keys, checked: n.defeated })
  }
  for (const step of timeline.steps) {
    for (const node of step.nodes) {
      for (const p of node.prereqs) if (p.kind === 'boss') push(p.node)
      push(node)
    }
  }
  if (includeDlc) {
    for (const node of timeline.dlc.nodes) {
      for (const p of node.prereqs) if (p.kind === 'boss') push(p.node)
      push(node)
    }
  }
  return out
}

/**
 * Clés de rencontre à basculer pour cocher ou décocher un boss : cocher ajoute celles qui manquent, décocher retire celles qui sont présentes.
 * @param item Boss de la liste.
 * @param defeated Rencontres actuellement vaincues.
 * @returns Les clés à passer une à une à `toggleDefeated`.
 */
export function keysToToggle(item: BossCheck, defeated: readonly string[]): string[] {
  return item.checked ? item.keys.filter((k) => defeated.includes(k)) : item.keys.filter((k) => !defeated.includes(k))
}

/** Région de la liste « Régions atteintes ». */
export interface RegionCheck {
  readonly name: string
  readonly stage: StageId
  readonly checked: boolean
}

/**
 * Régions proposées : les régions des données (`locations`, genre « Region ») dont l'étape est connue du moteur, de la plus précoce à la plus tardive.
 * Les régions du DLC ne sont proposées que si l'extension est activée ; une région déjà choisie reste proposée.
 * @param locations Lieux chargés.
 * @param selected Régions atteintes.
 * @param includeDlc Shadow of the Erdtree activé.
 * @returns Les régions.
 */
export function regionChecklist(locations: readonly LocationEntry[], selected: readonly string[], includeDlc: boolean): RegionCheck[] {
  const out: RegionCheck[] = []
  for (const loc of locations) {
    if (loc.kind !== 'Region') continue
    const stage = REGION_STAGE[loc.name]
    if (stage === undefined) continue
    if (stage === 'dlc' && !includeDlc && !selected.includes(loc.name)) continue
    out.push({ name: loc.name, stage, checked: selected.includes(loc.name) })
  }
  return out.sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage) || a.name.localeCompare(b.name, 'en'))
}

/** Puce prête à afficher, avec le correctif du bouton de retrait et la section à ouvrir au clic. */
export interface CriteriaChipView {
  readonly chip: ChipView
  /** Modification qui retire le critère ; `null` si le critère est obligatoire. */
  readonly reset: CriteriaPatch | null
  /** Section du panneau qui porte ce critère. */
  readonly section: SectionId
}

/** Noms nécessaires au texte des puces, fournis par les jeux de données chargés. */
export interface ChipNames {
  /** Nom d'une origine d'après sa référence (`origin:<id>`), `null` si inconnue ou non chargée. */
  originName(ref: string): string | null
}

/** Nombre de classes citées dans la puce avant « + N ». */
const CHIP_CLASSES_SHOWN = 2

/**
 * Compose le texte des puces à partir des données structurées du store d'analyse (le store ne produit aucun texte d'interface).
 * @param chips Puces structurées.
 * @param names Noms tirés des données.
 * @returns Les puces à afficher, dans l'ordre.
 */
export function chipViews(chips: readonly AnalysisChip[], names: ChipNames): CriteriaChipView[] {
  return chips.map((c): CriteriaChipView => {
    switch (c.kind) {
      case 'content': {
        const parts = ['Base', ...(c.sote ? ['SotE'] : []), ...(c.tp ? ['TP'] : [])]
        return view('content', 'Contenu', parts.join(', '), 'content', c.reset)
      }
      case 'origin': {
        const effective = c.effective === null ? null : names.originName(c.effective)
        const value = c.choice === 'auto' ? (effective === null ? 'Automatique' : `Automatique : ${effective}`) : (effective ?? c.choice)
        return view('origin', 'Origine', value, 'character', c.reset)
      }
      case 'level':
        return view('level', 'Niveau', c.level === null ? 'Non calculé' : formatInt(c.level), 'character', c.reset)
      case 'build':
        return view('build', 'Build', `${archetypeName(c.archetype)} → ${formatInt(c.level)}`, 'character', c.reset, true)
      case 'style':
        return view('style', 'Style', `${STYLE_LABELS[c.mode]}, ${c.hands === 1 ? 'une main' : 'deux mains'}`, 'style', c.reset)
      case 'classes': {
        const shown = c.classes.slice(0, CHIP_CLASSES_SHOWN).join(', ')
        const more = c.classes.length - CHIP_CLASSES_SHOWN
        return view('classes', 'Classes', more > 0 ? `${shown} +${formatInt(more)}` : shown, 'style', c.reset)
      }
      case 'status':
        return view('status', 'Statut', STATUS_LABELS[STATUS_BY_DATA_KEY[c.status]], 'style', c.reset)
      case 'stage': {
        const how = c.mode === 'boss' ? ' (boss vaincus)' : c.mode === 'region' ? ' (régions)' : ''
        return view('stage', 'Étape', `${STAGE_LABELS[c.stage]}${how}`, 'progress', c.reset)
      }
      case 'exclusion': {
        const value = c.exclusion === 'remembrance' ? 'Remembrances' : c.exclusion === 'random-drop' ? 'Butins aléatoires' : 'Objets de quête'
        return view(`exclusion-${c.exclusion}`, 'Exclus', value, 'constraints', c.reset)
      }
      case 'stones':
        return view('stones', 'Pierres', STONE_LABELS[c.preference], 'constraints', c.reset)
      case 'estimates':
        return view('estimates', 'Estimations', 'Exclues', 'reliability', c.reset)
    }
  })
}

/** Fabrique une puce : facultative si elle a un correctif de retrait, mise en avant si `active` (build cible). */
function view(id: string, label: string, value: string, section: SectionId, reset: CriteriaPatch | null, active = false): CriteriaChipView {
  return { chip: { id, label, value, removable: reset !== null, active }, reset, section }
}

/**
 * Résumé d'une section, pour l'en-tête des sections repliables (une ligne).
 * @param section Section.
 * @param criteria Critères de travail.
 * @param level Niveau calculé, ou `null`.
 * @param originName Nom de l'origine retenue, ou `null`.
 * @returns Le résumé en français.
 */
export function sectionSummary(section: SectionId, criteria: Criteria, level: number | null, originName: string | null): string {
  switch (section) {
    case 'content':
      return ['Base', ...(criteria.content.sote ? ['SotE'] : []), ...(criteria.content.tp ? ['TP'] : [])].join(', ')
    case 'character': {
      const parts = [criteria.character.origin === 'auto' ? 'Origine automatique' : (originName ?? criteria.character.origin)]
      parts.push(level === null ? 'niveau non calculé' : `niveau ${formatInt(level)}`)
      if (criteria.target.archetype !== null) parts.push(`build ${archetypeName(criteria.target.archetype)} → ${formatInt(criteria.target.level)}`)
      return parts.join(', ')
    }
    case 'style':
      return `${STYLE_LABELS[criteria.style.mode]}, ${criteria.style.hands === 1 ? 'une main' : 'deux mains'}`
    case 'progress':
      return `${PROGRESS_MODE_LABELS[criteria.progress.mode]}${criteria.progress.mode === 'boss' ? ` (${formatInt(criteria.progress.defeated.length)})` : ''}`
    case 'constraints': {
      const k = criteria.constraints
      const n = Number(k.excludeRemembrance) + Number(k.excludeRandomDrop) + Number(k.excludeQuest) + Number(k.stonePreference !== 'none')
      return n === 0 ? 'Aucune' : `${formatInt(n)} active${n > 1 ? 's' : ''}`
    }
    case 'reliability':
      return criteria.reliability.includeEstimates ? 'Estimations incluses' : 'Estimations exclues'
  }
}

/** Étapes dans l'ordre, pour le sélecteur d'étape. */
export const STAGE_OPTIONS = STAGE_IDS.map((id) => ({ value: id, label: STAGE_LABELS[id] }))

/**
 * Nombre d'armes recommandées affichées par le widget A : la somme des armes de chaque colonne d'étape (bouton « Voir N armes » de la feuille mobile).
 * @param recommendations Recommandations du store `analysis`.
 * @returns Le nombre d'armes.
 */
export function recommendedCount(recommendations: StageRecommendations): number {
  return recommendations.columns.reduce((sum, column) => sum + column.weapons.length, 0)
}
