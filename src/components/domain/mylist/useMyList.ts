// Composable de « Ma liste » : demande les fichiers de données des éléments épinglés, résout chaque référence et, pour une arme, son étape (store d'analyse).
// Aucun calcul : l'étape vient du moteur par `analysis.scored` ; ici on ne fait que ranger et nommer.

import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useDatasets } from '../../../composables/useDatasets.ts'
import { datasetsOfKind } from '../../../data/datasets.ts'
import type { EntityKind, EntityRef, FileKey } from '../../../data/datasets.ts'
import type { PinRecord } from '../../../persistence/model.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import { kindOfRef } from '../../../stores/compare.ts'
import { useDataStore } from '../../../stores/data.ts'
import type { FailedFile } from '../../../stores/data.ts'
import { usePinsStore } from '../../../stores/pins.ts'
import { DLC_ZONE_LABELS, STAGE_LABELS } from '../../../ui/labels.ts'
import { whereToGet } from './myListModel.ts'
import type { WhereToGet } from './myListModel.ts'

/** Étape d'une arme épinglée : connue, non classée, hors du style de jeu des critères (non évaluée), ou en attente des fichiers du moteur. */
export type PinStage = { kind: 'stage'; text: string } | { kind: 'unclassified' } | { kind: 'outside' } | { kind: 'loading' }

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
  /** Étape (armes seulement) ; `null` pour les autres genres. */
  readonly stage: PinStage | null
}

/** Valeur renvoyée par `useMyList`. */
export interface MyListState {
  readonly rows: ComputedRef<MyListRow[]>
  /** Fichiers en échec, nommés pour le message d'erreur. */
  readonly failed: ComputedRef<FailedFile[]>
  /** Relance les fichiers en échec. */
  retry(): Promise<void>
}

/** Fichiers que le moteur lit pour évaluer une arme (étape et score). */
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
  const hasWeapon = computed(() => kinds.value.has('weapon'))
  const files = computed((): FileKey[] => [
    ...[...kinds.value].flatMap((k) => datasetsOfKind(k)),
    ...(hasWeapon.value ? WEAPON_ENGINE_FILES : []),
  ])
  const datasets = useDatasets(files)

  // `analysis.scored` n'est lu que s'il y a une arme épinglée : le calcul des scores n'est pas payé pour une liste sans arme.
  const stages = computed(() => {
    const map = new Map<EntityRef, PinStage>()
    if (!hasWeapon.value || data.statusOf(WEAPON_ENGINE_FILES) !== 'ready') return map
    for (const s of analysis.scored) {
      const info = s.stage.value
      if (info === null) map.set(s.candidate.ref, { kind: 'unclassified' })
      else {
        const zone = info.stage === 'dlc' && info.dlcZone !== null ? ` · ${DLC_ZONE_LABELS[info.dlcZone]}` : ''
        map.set(s.candidate.ref, { kind: 'stage', text: `${STAGE_LABELS[info.stage]}${zone}` })
      }
    }
    return map
  })
  const engineReady = computed(() => data.statusOf(WEAPON_ENGINE_FILES) === 'ready')

  const rows = computed((): MyListRow[] =>
    pins.items.map((pin): MyListRow => {
      const kind = kindOfRef(pin.ref)
      const none = { rows: [], more: 0 } as const
      if (kind === null) return { pin, kind, state: 'missing', entry: null, where: none, stage: null }
      const entry = data.entity(pin.ref) as PinEntry | null
      let stage: PinStage | null = null
      if (kind === 'weapon') stage = !engineReady.value ? { kind: 'loading' } : (stages.value.get(pin.ref) ?? { kind: 'outside' })
      if (entry !== null) return { pin, kind, state: 'ready', entry, where: whereToGet(entry), stage }
      const status = data.statusOf(datasetsOfKind(kind))
      return { pin, kind, state: status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'missing', entry: null, where: none, stage }
    }),
  )

  return { rows, failed: datasets.failed, retry: datasets.retry }
}
