// Modèle d'affichage du widget C (ordre des boss et préparation) : données de chaque nœud de la frise, « Vaincu » synchronisé avec les critères,
// panneau « Pourquoi ? » du niveau recommandé, activation du DLC et ouverture du plein écran. Aucun calcul : la frise, le niveau et la préparation
// viennent du store `analysis` (méthode : calculs.md, « Frise des boss » et « Niveau recommandé d'un boss et préparation »).

import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TimelineBossView, TimelineView } from '../../engine/timeline.ts'
import type { Explanation } from '../../engine/types.ts'
import { entityRoute } from '../../router/entityRoute.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { bossNodeData } from '../../ui/bossNode.ts'
import type { BossNodeData } from '../../ui/bossNode.ts'
import type { EstimateConfidence } from '../../ui/labels.ts'

/** Valeur du composable `useBossWidget`. */
export interface BossWidgetModel {
  /** Frise construite par le moteur ; `null` tant que le fichier des boss n'est pas lu. */
  readonly timeline: ComputedRef<TimelineView | null>
  /** Données affichées de chaque rencontre de la frise, par clé `levelKey`. */
  readonly details: ComputedRef<Record<string, BossNodeData | null>>
  /** Niveau du joueur ; 1 s'il n'est pas calculable (même repli que le store pour la préparation). */
  readonly playerLevel: ComputedRef<number>
  /** Données du prochain boss, si la frise en a un. */
  readonly next: ComputedRef<BossNodeData | null>
  /** Explication ouverte dans le panneau « Pourquoi ? », `null` si le panneau est fermé. */
  readonly why: Ref<Explanation | null>
  /** Confiance de l'estimation du niveau expliqué, transmise avec l'événement `why`. */
  readonly whyEstimate: Ref<EstimateConfidence | null>
  /** Ouvre le « Pourquoi ? » d'un niveau recommandé, avec la confiance de son estimation (`null` si le niveau n'est pas estimé). */
  readonly showWhy: (explanation: Explanation, confidence: EstimateConfidence | null) => void
  /** Ferme le « Pourquoi ? ». */
  readonly closeWhy: () => void
  /** Coche ou décoche « Vaincu » pour un nœud, puis passe la progression en mode « Boss vaincus ». */
  readonly setDefeated: (node: TimelineBossView, defeated: boolean) => void
  /** Active Shadow of the Erdtree dans les critères. */
  readonly enableDlc: () => void
  /** Ouvre le plein écran du widget. */
  readonly openFullscreen: () => void
}

/**
 * Prépare ce que le widget C affiche et les actions qu'il déclenche, à partir des stores `analysis`, `criteria` et `data`.
 * L'index des rencontres est celui du store (`analysis.encounters`).
 * @returns Le modèle réactif du widget.
 */
export function useBossWidget(): BossWidgetModel {
  const analysis = useAnalysisStore()
  const criteria = useCriteriaStore()
  const router = useRouter()
  const why = ref<Explanation | null>(null)

  const details = computed((): Record<string, BossNodeData | null> => {
    const t = analysis.timeline
    const idx = analysis.encounters
    const out: Record<string, BossNodeData | null> = {}
    if (t === null || idx === null) return out
    const nodes: TimelineBossView[] = [
      ...t.steps.flatMap((s) => s.nodes.flatMap((n) => [n, ...n.prereqs.flatMap((p) => (p.kind === 'boss' ? [p.node] : []))])),
      ...t.dlc.gate,
      ...t.dlc.nodes,
    ]
    if (t.next !== null) nodes.push(t.next.node)
    for (const node of nodes) {
      const key = node.levelKey
      if (key in out) continue
      const ref = idx.byKey.get(key)
      const href = ref === undefined ? undefined : router.resolve(entityRoute(`boss:${ref.boss.id}`)).href
      out[key] = bossNodeData(ref, analysis.bossReadiness(key), href)
    }
    return out
  })

  const next = computed(() => {
    const node = analysis.nextBoss?.node
    return node === undefined ? null : (details.value[node.levelKey] ?? null)
  })

  const whyEstimate = ref<EstimateConfidence | null>(null)

  return {
    timeline: computed(() => analysis.timeline),
    details,
    playerLevel: computed(() => analysis.level.value ?? 1),
    next,
    why,
    whyEstimate,
    showWhy: (explanation, confidence) => {
      why.value = explanation
      whyEstimate.value = confidence
    },
    closeWhy: () => {
      why.value = null
      whyEstimate.value = null
    },
    setDefeated: (node, defeated) => {
      for (const key of node.keys) {
        if (criteria.criteria.progress.defeated.includes(key) !== defeated) criteria.toggleDefeated(key)
      }
      // La bascule d'une clé passe déjà en mode « Boss vaincus » ; ceci couvre le cas où rien n'a changé.
      criteria.set({ progress: { mode: 'boss' } })
    },
    enableDlc: () => {
      criteria.set({ content: { sote: true } })
    },
    openFullscreen: () => {
      void router.push({ name: 'widgetFullscreen', params: { widgetId: 'boss-order' } })
    },
  }
}
