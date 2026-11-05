// Lignes de la matrice des faiblesses : met en forme les rencontres (absorption, immunités, lien vers la fiche) pour `CxAbsorptionHeatmap`.
// Lecture de données seulement (aucune méthode de calculs.md) : la frise vient du store `analysis`, l'absorption et les statuts de `bosses.json`.

import type { NegationKey } from '../../data/keys.ts'
import type { BossEntry, Encounter } from '../../data/types/bosses.ts'
import type { HeatmapRow } from '../../components/ds/types.ts'
import type { EncounterIndex } from '../../engine/encounters.ts'
import type { TimelineBossView, TimelineView } from '../../engine/timeline.ts'
import { immunities } from '../../engine/weakness.ts'

/** Construit l'adresse de la fiche d'un boss, sur la rencontre demandée (`?rencontre=`). */
export type BossHref = (bossId: string, encounterId: string) => string

/** Contenu activé dans les critères : une rencontre d'une extension désactivée n'est pas proposée. */
export interface ContentFlags {
  readonly sote: boolean
  readonly tp: boolean
}

/** Lignes de la matrice et nombre de boss de la frise qui n'ont pas de données d'absorption. */
export interface TimelineRows {
  /** Boss de la frise dont l'absorption est documentée, dans l'ordre de la frise. */
  readonly rows: readonly HeatmapRow[]
  /** Nombre de boss de la frise visibles (avec ou sans données). */
  readonly total: number
}

/**
 * Ligne de la matrice pour une rencontre.
 * @param id Identifiant unique de la ligne (clé de rencontre).
 * @param boss Page de boss.
 * @param encounter Rencontre.
 * @param encounterId Identifiant de la rencontre dans sa page.
 * @param done Rencontre vaincue (ligne atténuée).
 * @param href Construction de l'adresse de la fiche.
 * @returns La ligne, ou `null` si la rencontre n'a pas de données d'absorption.
 */
function rowOf(id: string, boss: Pick<BossEntry, 'id'>, encounter: Encounter, encounterId: string, done: boolean, href: BossHref): HeatmapRow | null {
  const negation = encounter.damage_negation_percent
  if (negation === undefined) return null
  return {
    id,
    name: encounter.name,
    ...(encounter.location === null ? {} : { subtitle: encounter.location }),
    href: href(boss.id, encounterId),
    done,
    negation,
    immunities: immunities(encounter),
  }
}

/**
 * Boss de la frise dans l'ordre de lecture : prérequis boss avant leur nœud, puis la voie DLC si elle est activée, sans doublon.
 * @param timeline Frise (store `analysis`).
 * @returns Les boss à examiner.
 */
function timelineBosses(timeline: TimelineView): TimelineBossView[] {
  const out: TimelineBossView[] = []
  const push = (node: TimelineBossView): void => {
    if (!out.some((o) => o.id === node.id)) out.push(node)
  }
  for (const step of timeline.steps) {
    for (const node of step.nodes) {
      for (const prereq of node.prereqs) if (prereq.kind === 'boss') push(prereq.node)
      push(node)
    }
  }
  if (timeline.dlc.enabled) for (const node of timeline.dlc.nodes) push(node)
  return out
}

/**
 * Lignes du tableau de bord : les boss de la frise dont l'absorption est documentée (calculs.md, « Frise des boss » : 11 sur 21).
 * Les boss sans donnée ne sont pas des lignes hachurées : ils sont comptés, et le widget le dit.
 * @param timeline Frise courante (boss vaincus compris).
 * @param index Index des rencontres de `bosses.json`.
 * @param href Construction de l'adresse de la fiche.
 * @returns Les lignes et le nombre de boss de la frise.
 */
export function timelineRows(timeline: TimelineView, index: EncounterIndex, href: BossHref): TimelineRows {
  const nodes = timelineBosses(timeline)
  const rows: HeatmapRow[] = []
  for (const node of nodes) {
    const ref = index.byKey.get(node.levelKey)
    const encounter = ref?.encounter
    if (ref === undefined || encounter === null || encounter === undefined) continue
    // La clé de rencontre est `bossId/encounterId` (architecture § 3.3).
    const encounterId = node.levelKey.slice(node.levelKey.indexOf('/') + 1)
    const row = rowOf(node.id, ref.boss, encounter, encounterId, node.defeated, href)
    if (row !== null) rows.push(row)
  }
  return { rows, total: nodes.length }
}

/**
 * Lignes du plein écran : toutes les rencontres de `bosses.json` dont l'absorption est documentée, dans l'ordre des données.
 * @param bosses Pages de boss.
 * @param defeated Clés des rencontres vaincues.
 * @param content Contenu activé (une rencontre d'une extension désactivée est écartée).
 * @param href Construction de l'adresse de la fiche.
 * @returns Les lignes.
 */
export function allRows(bosses: readonly BossEntry[], defeated: ReadonlySet<string>, content: ContentFlags, href: BossHref): HeatmapRow[] {
  const rows: HeatmapRow[] = []
  for (const boss of bosses) {
    boss.encounters.forEach((encounter, i) => {
      if (encounter.source === 'Shadow of the Erdtree' && !content.sote) return
      if (encounter.source === 'Tarnished Pack' && !content.tp) return
      const identity = boss.derived.encounters[i]
      if (identity === undefined) return
      const row = rowOf(identity.key, boss, encounter, identity.id, defeated.has(identity.key), href)
      if (row !== null) rows.push(row)
    })
  }
  return rows
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
