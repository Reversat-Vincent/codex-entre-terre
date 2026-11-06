// Frise des boss : état de chaque étape et nœud selon les boss vaincus, prérequis, voie DLC (ordre libre) et prochain boss.
// Méthode : docs/design/ds/calculs.md, « Frise des boss » (D13) ; configuration : config/timeline.ts. Le niveau des nœuds vient de `bossLevel.ts`.

import { TIMELINE } from './config/timeline.ts'
import type { DlcLane, TimelineBossRef, TimelineConfig, TimelineNode, TimelineStep } from './config/timeline.ts'
import type { LabelCode } from './codes.ts'
import type { EncounterIndex } from './encounters.ts'
import type { CodeParams } from './types.ts'

/** État d'un boss de la frise. */
export interface TimelineBossView {
  readonly id: string
  readonly boss: string
  readonly keys: readonly string[]
  readonly levelKey: string
  readonly defeated: boolean
  /** Vrai si la rencontre `levelKey` existe dans les données (sinon « Élément introuvable » à l'affichage). */
  readonly present: boolean
}

/** Prérequis d'un nœud, avec son état. */
export type TimelinePrereqView =
  | { readonly kind: 'boss'; readonly node: TimelineBossView }
  | { readonly kind: 'text'; readonly code: LabelCode }

/** Nœud de la frise avec son état. */
export interface TimelineNodeView extends TimelineBossView {
  readonly prereqs: readonly TimelinePrereqView[]
  /** Vrai si tous les prérequis boss sont vaincus (les sous-nœuds textuels ne bloquent pas). */
  readonly prereqsMet: boolean
}

/** Étape de la frise avec son état. */
export interface TimelineStepView {
  readonly n: number
  readonly labelCode: LabelCode
  readonly labelParams: CodeParams
  readonly kind: TimelineStep['kind']
  readonly need: number
  readonly nodes: readonly TimelineNodeView[]
  /** Nœuds vaincus (« N parmi M »). */
  readonly defeatedCount: number
  readonly done: boolean
}

/** Voie DLC avec son état. */
export interface TimelineDlcView {
  /** Vrai si Shadow of the Erdtree est activé dans les critères ; sinon l'interface affiche un état vide avec « Activer ». */
  readonly enabled: boolean
  /** Nœuds de l'histoire qui ouvrent le DLC. */
  readonly gate: readonly TimelineBossView[]
  /** Vrai si tous les nœuds d'ouverture sont vaincus. */
  readonly open: boolean
  readonly nodes: readonly TimelineNodeView[]
  readonly freeOrder: readonly string[]
  readonly done: boolean
}

/** Prochain boss à affronter. */
export interface NextBoss {
  readonly lane: 'story' | 'dlc'
  /** Numéro d'étape de l'histoire, `null` dans la voie DLC. */
  readonly step: number | null
  /** Nœud (ou prérequis boss) à affronter. */
  readonly node: TimelineBossView
  /** Nœud de la frise dont il est le prérequis, s'il en est un. */
  readonly prereqOf: string | null
}

/** Vue complète de la frise. */
export interface TimelineView {
  readonly steps: readonly TimelineStepView[]
  readonly dlc: TimelineDlcView
  readonly next: NextBoss | null
  /** Toutes les étapes de l'histoire sont terminées. */
  readonly storyComplete: boolean
  /** Histoire terminée et, si le DLC est activé, voie DLC terminée. */
  readonly complete: boolean
}

/** Options de la frise. */
export interface TimelineOptions {
  /** Shadow of the Erdtree activé. */
  readonly dlcEnabled: boolean
  /** Niveau recommandé d'une rencontre (`levelKey`), pour départager les candidats au prochain boss ; `null` si non estimé. */
  readonly levelOf?: (key: string) => number | null
}

/**
 * Indique si un nœud est vaincu : l'une de ses rencontres (`any`) ou toutes (`all`).
 * @param node Nœud.
 * @param defeated Rencontres cochées « Vaincu ».
 * @returns Vrai si le nœud est vaincu.
 */
export function isNodeDefeated(node: Pick<TimelineBossRef, 'keys' | 'match'>, defeated: ReadonlySet<string>): boolean {
  return node.match === 'all' ? node.keys.every((k) => defeated.has(k)) : node.keys.some((k) => defeated.has(k))
}

/**
 * Construit la frise (calculs.md, « Frise des boss ») : étapes « N parmi M », « ou » et uniques, prérequis boss ou textuels, voie DLC
 * ouverte par Radahn et Mohg avec Messmer et Romina en « ordre libre », et prochain boss. Prochain boss : dans la première étape non
 * terminée, les nœuds non vaincus (remplacés par leur prérequis boss non vaincu), du plus bas niveau recommandé au plus haut (non estimés
 * en dernier, puis ordre de la frise) ; l'histoire finie, le premier nœud non vaincu de la voie DLC si elle est activée.
 * @param encounters Index des rencontres (présence des nœuds), ou `null` si `bosses` n'est pas chargé.
 * @param defeated Clés des rencontres vaincues (critères).
 * @param options DLC activé, niveau recommandé.
 * @param cfg Configuration de la frise.
 * @returns La vue de la frise.
 */
export function buildTimeline(
  encounters: EncounterIndex | null,
  defeated: readonly string[],
  options: TimelineOptions,
  cfg: TimelineConfig = TIMELINE,
): TimelineView {
  const done = new Set(defeated)
  const bossView = (n: TimelineBossRef): TimelineBossView => ({
    id: n.id,
    boss: n.boss,
    keys: n.keys,
    levelKey: n.levelKey,
    defeated: isNodeDefeated(n, done),
    present: encounters?.byKey.has(n.levelKey) ?? false,
  })
  const nodeView = (n: TimelineNode): TimelineNodeView => {
    const prereqs: TimelinePrereqView[] = (n.prereqs ?? []).map((p) => (p.kind === 'boss' ? { kind: 'boss', node: bossView(p.node) } : p))
    return { ...bossView(n), prereqs, prereqsMet: prereqs.every((p) => p.kind === 'text' || p.node.defeated) }
  }

  const steps: TimelineStepView[] = cfg.steps.map((s) => {
    const nodes = s.nodes.map(nodeView)
    const defeatedCount = nodes.filter((n) => n.defeated).length
    return { n: s.n, labelCode: s.labelCode, labelParams: s.labelParams ?? {}, kind: s.kind, need: s.need, nodes, defeatedCount, done: defeatedCount >= s.need }
  })
  const dlc = dlcView(cfg.dlc, steps, nodeView, options.dlcEnabled)
  const storyComplete = steps.every((s) => s.done)
  const levelOf = options.levelOf ?? (() => null)
  const order = (a: Candidate, b: Candidate): number => {
    const la = levelOf(a.node.levelKey)
    const lb = levelOf(b.node.levelKey)
    if (la !== lb) return la === null ? 1 : lb === null ? -1 : la - lb
    return a.index - b.index
  }

  let next: NextBoss | null = null
  const firstOpen = steps.find((s) => !s.done)
  if (firstOpen !== undefined) {
    const candidates = candidatesOf(firstOpen.nodes).sort(order)
    const c = candidates[0]
    if (c !== undefined) next = { lane: 'story', step: firstOpen.n, node: c.node, prereqOf: c.prereqOf }
  } else if (options.dlcEnabled && !dlc.done) {
    const firstUndone = dlc.nodes.findIndex((n) => !n.defeated)
    const pool = dlc.nodes.filter((n, i) => !n.defeated && (i === firstUndone || (dlc.freeOrder.includes(n.id) && dlc.freeOrder.includes(dlc.nodes[firstUndone]?.id ?? ''))))
    const c = candidatesOf(pool).sort(order)[0]
    if (c !== undefined) next = { lane: 'dlc', step: null, node: c.node, prereqOf: c.prereqOf }
  }
  return { steps, dlc, next, storyComplete, complete: storyComplete && (!options.dlcEnabled || dlc.done) }
}

/** Candidat au prochain boss, avec son rang dans la frise. */
interface Candidate {
  readonly node: TimelineBossView
  readonly prereqOf: string | null
  readonly index: number
}

/**
 * Candidats au prochain boss parmi des nœuds : chaque nœud non vaincu, ou son premier prérequis boss non vaincu.
 * @param nodes Nœuds d'une étape.
 * @returns Les candidats, dans l'ordre de la frise.
 */
function candidatesOf(nodes: readonly TimelineNodeView[]): Candidate[] {
  return nodes
    .filter((n) => !n.defeated)
    .map((n, index) => {
      const pending = n.prereqs.find((p): p is { kind: 'boss'; node: TimelineBossView } => p.kind === 'boss' && !p.node.defeated)
      return pending === undefined ? { node: n, prereqOf: null, index } : { node: pending.node, prereqOf: n.id, index }
    })
}

/**
 * État de la voie DLC.
 * @param lane Configuration de la voie.
 * @param steps Étapes de l'histoire (nœuds d'ouverture).
 * @param nodeView Construction d'un nœud.
 * @param enabled DLC activé.
 * @returns La vue de la voie DLC.
 */
function dlcView(
  lane: DlcLane,
  steps: readonly TimelineStepView[],
  nodeView: (n: TimelineNode) => TimelineNodeView,
  enabled: boolean,
): TimelineDlcView {
  const all = steps.flatMap((s) => s.nodes)
  const gate = lane.gate.map((id) => all.find((n) => n.id === id)).filter((n): n is TimelineNodeView => n !== undefined)
  const nodes = lane.nodes.map(nodeView)
  return { enabled, gate, open: gate.length === lane.gate.length && gate.every((g) => g.defeated), nodes, freeOrder: lane.freeOrder, done: nodes.every((n) => n.defeated) }
}
