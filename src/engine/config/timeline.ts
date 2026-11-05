// Frise des boss : étapes de l'histoire principale, nœuds, rencontres exactes, prérequis et voie DLC (décision D13).
// Source : docs/contenu/decisions-progression.md § 3.2 (page Bosses du wiki, section « Mandatory bosses ») ; méthode : calculs.md, « Frise des boss ».
// Les clés de rencontre sont celles des données préparées (`bossId/encounterId`) ; un test vérifie que chacune existe.

import type { CodeParams } from '../types.ts'
import type { LabelCode } from '../codes.ts'

/** Rencontre suivie par la frise. */
export interface TimelineBossRef {
  /** Identifiant du nœud, stable (repère d'interface et de test). */
  readonly id: string
  /** Identifiant du boss (`bosses.json`). */
  readonly boss: string
  /** Rencontres dont l'une (`any`) ou toutes (`all`) doivent être cochées « Vaincu ». */
  readonly keys: readonly string[]
  readonly match: 'all' | 'any'
  /** Rencontre qui porte les données du niveau recommandé (PV, runes, régions). */
  readonly levelKey: string
  /** Vrai si les runes de la rencontre ne mesurent pas ce combat (Radagon : runes d'Elden Beast). */
  readonly excludeRunes?: boolean
}

/** Prérequis d'un nœud : un boss (avec son niveau) ou un sous-nœud textuel, sans calcul de niveau. */
export type TimelinePrereq =
  | { readonly kind: 'boss'; readonly node: TimelineBossRef }
  | { readonly kind: 'text'; readonly code: LabelCode }

/** Nœud de la frise. */
export interface TimelineNode extends TimelineBossRef {
  readonly prereqs?: readonly TimelinePrereq[]
}

/** Étape de l'histoire : `choice` N parmi M, `or` l'un ou l'autre, `one` un seul boss. */
export interface TimelineStep {
  readonly n: number
  readonly labelCode: LabelCode
  readonly labelParams?: CodeParams
  readonly kind: 'choice' | 'or' | 'one'
  /** Nombre de nœuds à vaincre pour terminer l'étape. */
  readonly need: number
  readonly nodes: readonly TimelineNode[]
}

/** Voie DLC : ouverte par les nœuds `gate`, puis une chaîne de nœuds dont certains sans ordre imposé entre eux. */
export interface DlcLane {
  /** Identifiants de nœuds de l'histoire qui ouvrent le DLC. */
  readonly gate: readonly string[]
  readonly nodes: readonly TimelineNode[]
  /** Nœuds de la chaîne sans ordre imposé entre eux (mention « ordre libre »). */
  readonly freeOrder: readonly string[]
}

/** Configuration complète de la frise. */
export interface TimelineConfig {
  readonly steps: readonly TimelineStep[]
  readonly dlc: DlcLane
}

const one = (id: string, boss: string, key: string, extra: Partial<TimelineNode> = {}): TimelineNode => ({
  id,
  boss,
  keys: [`${boss}/${key}`],
  match: 'any',
  levelKey: `${boss}/${key}`,
  ...extra,
})

/** Margit, prérequis de Godrick : première valeur de PV et de runes (Limgrave) ; la seconde est le combat de Capital Outskirts. */
const MARGIT = one('margit', 'margit-the-fell-omen', 'margit-the-fell-omen')
/** Red Wolf of Radagon, prérequis de Rennala (l'Academy Glintstone Key est un objet, pas un boss). */
const RED_WOLF = one('red-wolf', 'red-wolf-of-radagon', 'red-wolf-of-radagon')

/** Valeurs retenues (decisions-progression.md § 3.2, D13). */
export const TIMELINE: TimelineConfig = {
  steps: [
    {
      n: 1,
      labelCode: 'timeline-step-shardbearers',
      kind: 'choice',
      need: 2,
      nodes: [
        one('godrick', 'godrick-the-grafted', 'godrick-the-grafted-phase-1', { prereqs: [{ kind: 'boss', node: MARGIT }] }),
        {
          id: 'rennala',
          boss: 'rennala-queen-of-the-full-moon',
          // Les deux phases forment un seul combat : l'une ou l'autre cochée suffit ; runes et Remembrance sont celles de la phase 2.
          keys: ['rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-1', 'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2'],
          match: 'any',
          levelKey: 'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2',
          prereqs: [{ kind: 'boss', node: RED_WOLF }],
        },
        one('radahn', 'starscourge-radahn', 'starscourge-radahn', { prereqs: [{ kind: 'text', code: 'prereq-radahn-jerren' }] }),
        one('rykard', 'rykard-lord-of-blasphemy', 'rykard-lord-of-blasphemy-phase-1', { prereqs: [{ kind: 'text', code: 'prereq-rykard-tanith-or-godskin-noble' }] }),
        // Mohg, Lord of Blood – Phase 1, pas « Mohg, the Omen » (Subterranean Shunning-Grounds).
        one('mohg', 'mohg-lord-of-blood', 'mohg-lord-of-blood-phase-1', { prereqs: [{ kind: 'text', code: 'prereq-mohg-varre-or-snowfield' }] }),
      ],
    },
    {
      n: 2,
      labelCode: 'timeline-step-leyndell-access',
      kind: 'or',
      need: 1,
      nodes: [
        // Rencontre de Capital Outskirts, pas celle de Farum Azula.
        one('draconic-tree-sentinel', 'draconic-tree-sentinel', 'draconic-tree-sentinel-outskirts-draconic-tree-sentinel'),
        // Rencontre de groupe : runes 40 000, PV `null` ; contournement du Sentinel par Deeproot Depths.
        one('fias-champions', 'fias-champions', 'fias-champions'),
      ],
    },
    { n: 3, labelCode: 'timeline-step-place', labelParams: { place: 'Leyndell, Royal Capital' }, kind: 'one', need: 1, nodes: [one('godfrey-golden-shade', 'godfrey-first-elden-lord', 'godfrey-first-elden-lord-leyndell-royal-capital')] },
    { n: 4, labelCode: 'timeline-step-place', labelParams: { place: 'Leyndell, Royal Capital' }, kind: 'one', need: 1, nodes: [one('morgott', 'morgott-the-omen-king', 'morgott-the-omen-king')] },
    { n: 5, labelCode: 'timeline-step-place', labelParams: { place: 'Mountaintops of the Giants' }, kind: 'one', need: 1, nodes: [one('fire-giant', 'fire-giant', 'fire-giant')] },
    { n: 6, labelCode: 'timeline-step-place', labelParams: { place: 'Crumbling Farum Azula' }, kind: 'one', need: 1, nodes: [one('godskin-duo', 'godskin-duo', 'godskin-duo')] },
    // Maliketh, the Black Blade, pas la phase « Beast Clergyman ».
    { n: 7, labelCode: 'timeline-step-place', labelParams: { place: 'Crumbling Farum Azula' }, kind: 'one', need: 1, nodes: [one('maliketh', 'maliketh-the-black-blade', 'maliketh-the-black-blade')] },
    { n: 8, labelCode: 'timeline-step-place', labelParams: { place: 'Leyndell, Ashen Capital' }, kind: 'one', need: 1, nodes: [one('gideon', 'sir-gideon-ofnir-the-all-knowing', 'sir-gideon-ofnir-the-all-knowing')] },
    { n: 9, labelCode: 'timeline-step-place', labelParams: { place: 'Leyndell, Ashen Capital' }, kind: 'one', need: 1, nodes: [one('hoarah-loux', 'godfrey-first-elden-lord', 'godfrey-first-elden-lord-leyndell-ashen-capital')] },
    // Radagon : ses runes sont celles d'Elden Beast (« after defeating Elden Beast ») et ne mesurent pas ce combat.
    { n: 10, labelCode: 'timeline-step-erdtree', kind: 'one', need: 1, nodes: [one('radagon', 'radagon-of-the-golden-order', 'radagon-of-the-golden-order', { excludeRunes: true })] },
    { n: 11, labelCode: 'timeline-step-erdtree', kind: 'one', need: 1, nodes: [one('elden-beast', 'elden-beast', 'elden-beast')] },
  ],
  dlc: {
    gate: ['radahn', 'mohg'],
    nodes: [
      one('messmer', 'messmer-the-impaler', 'messmer-the-impaler-base-serpent-messmer'),
      one('romina', 'romina-saint-of-the-bud', 'romina-saint-of-the-bud'),
      {
        id: 'promised-consort-radahn',
        boss: 'promised-consort-radahn',
        keys: ['promised-consort-radahn/promised-consort-radahn', 'promised-consort-radahn/promised-consort-radahn-radahn-consort-of-miquella'],
        match: 'any',
        // Runes et Remembrance sont portées par la seconde rencontre.
        levelKey: 'promised-consort-radahn/promised-consort-radahn-radahn-consort-of-miquella',
        prereqs: [{ kind: 'text', code: 'prereq-messmers-kindling' }],
      },
    ],
    // Le wiki exige Messmer et Romina sans imposer d'ordre entre eux.
    freeOrder: ['messmer', 'romina'],
  },
}

/**
 * Tous les nœuds de boss de la frise (étapes, prérequis boss, voie DLC), sans doublon, dans l'ordre de lecture.
 * @param cfg Configuration de la frise.
 * @returns Les références de rencontre de la frise.
 */
export function timelineBossRefs(cfg: TimelineConfig = TIMELINE): TimelineBossRef[] {
  const out: TimelineBossRef[] = []
  const push = (n: TimelineBossRef): void => {
    if (!out.some((o) => o.id === n.id)) out.push(n)
  }
  const visit = (nodes: readonly TimelineNode[]): void => {
    for (const node of nodes) {
      for (const p of node.prereqs ?? []) if (p.kind === 'boss') push(p.node)
      push(node)
    }
  }
  for (const s of cfg.steps) visit(s.nodes)
  visit(cfg.dlc.nodes)
  return out
}
