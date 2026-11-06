// Composable de « Ma liste » : demande les fichiers de données des éléments épinglés, résout chaque référence et lit son étape et, pour une arme, son score
// dans le store d'analyse (`stageOf`, `scoreOf`, y compris hors du style des critères). Aucun calcul : on ne fait que ranger et nommer.

import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useDatasets } from '../../../composables/useDatasets.ts'
import { datasetsOfKind } from '../../../data/datasets.ts'
import type { EntityKind, FileKey } from '../../../data/datasets.ts'
import type { PinRecord } from '../../../persistence/model.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import { kindOfRef } from '../../../stores/compare.ts'
import { useDataStore } from '../../../stores/data.ts'
import type { FailedFile } from '../../../stores/data.ts'
import { usePinsStore } from '../../../stores/pins.ts'
import { STAGED_KINDS, scoreView, stageView, whereToGet } from './myListModel.ts'
import type { ScoreView, StageView, WhereToGet } from './myListModel.ts'

/** Étape d'un élément épinglé : connue, non classée, ou en attente des fichiers du moteur. */
export type PinStage = StageView | { readonly kind: 'loading' }

/** Ce que la ligne d'un élément lit de son entrée de `data/`. */
export interface PinEntry {
  readonly id: string
  readonly name: string
  readonly source: string
  readonly url?: string
  readonly derived: { readonly displayName: string }
}

/** Élément épinglé prêt à afficher. */
export interface MyListRow {
  readonly pin: PinRecord
  /** Genre de la référence, `null` si elle est mal formée. */
  readonly kind: EntityKind | null
  /** `ready` : entrée trouvée ; `loading` : fichier en cours de lecture ; `error` : fichier illisible ; `missing` : référence absente des données (import). */
  readonly state: 'ready' | 'loading' | 'error' | 'missing'
  readonly entry: PinEntry | null
  readonly where: WhereToGet
  /** Étape (genres qui ont des acquisitions) ; `null` pour les autres genres. */
  readonly stage: PinStage | null
  /** Score pour le profil (armes seulement), même hors du style de jeu ; `null` sinon ou tant que le calcul n'est pas prêt. */
  readonly score: ScoreView | null
}

/** Valeur renvoyée par `useMyList`. */
export interface MyListState {
  readonly rows: ComputedRef<MyListRow[]>
  /** Fichiers en échec, nommés pour le message d'erreur. */
  readonly failed: ComputedRef<FailedFile[]>
  /** Relance les fichiers en échec. */
  retry(): Promise<void>
}

/** Fichiers que le moteur lit pour évaluer une entité (étape et score). */
const WEAPON_ENGINE_FILES: readonly FileKey[] = ['bosses', 'origins', 'tables']

/**
 * Prépare les lignes de Ma liste dans l'ordre du store `pins`.
 * Les fichiers de chaque genre épinglé sont demandés ; une référence n'est « introuvable » qu'une fois son fichier lu.
 * @returns Les lignes, les fichiers en échec et l'action « Réessayer ».
 */
export function useMyList(): MyListState {
  const pins = usePinsStore()
  const data = useDataStore()
  const analysis = useAnalysisStore()

  const kinds = computed(() => {
    const out = new Set<EntityKind>()
    for (const p of pins.items) {
      const kind = kindOfRef(p.ref)
      if (kind !== null) out.add(kind)
    }
    return out
  })
  const needsEngine = computed(() => [...kinds.value].some((k) => STAGED_KINDS.has(k)))
  const files = computed((): FileKey[] => [
    ...[...kinds.value].flatMap((k) => datasetsOfKind(k)),
    ...(needsEngine.value ? WEAPON_ENGINE_FILES : []),
  ])
  const datasets = useDatasets(files)

  const engineReady = computed(() => data.statusOf(WEAPON_ENGINE_FILES) === 'ready')

  const rows = computed((): MyListRow[] =>
    pins.items.map((pin): MyListRow => {
      const kind = kindOfRef(pin.ref)
      const none = { rows: [], more: 0 } as const
      if (kind === null) return { pin, kind, state: 'missing', entry: null, where: none, stage: null, score: null }
      const entry = data.entity(pin.ref) as PinEntry | null
      // Les getters ne sont lus qu'une fois les fichiers du moteur prêts : l'étape et le score ne sont pas calculés pour une liste sans entité concernée.
      let stage: PinStage | null = null
      let score: ScoreView | null = null
      if (STAGED_KINDS.has(kind)) {
        if (!engineReady.value) stage = { kind: 'loading' }
        else {
          stage = stageView(analysis.stageOf(pin.ref))
          if (kind === 'weapon') score = scoreView(analysis.scoreOf(pin.ref))
        }
      }
      if (entry !== null) return { pin, kind, state: 'ready', entry, where: whereToGet(entry), stage, score }
      const status = data.statusOf(datasetsOfKind(kind))
      return { pin, kind, state: status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'missing', entry: null, where: none, stage, score }
    }),
  )

  return { rows, failed: datasets.failed, retry: datasets.retry }
}
