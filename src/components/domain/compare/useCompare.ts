// Composable du Comparateur : synchronise le store `compare` avec `?e=` dans les deux sens, demande les fichiers des éléments comparés, résout chaque colonne
// et fournit le profil et le score des armes (store d'analyse). Aucun calcul de jeu : le score et les prérequis viennent du moteur.

import { computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CatalogRow, ProfileContext } from '../../../catalog/registry.ts'
import { useDatasets } from '../../../composables/useDatasets.ts'
import { datasetsOfKind } from '../../../data/datasets.ts'
import type { EntityKind, EntityRef, FileKey } from '../../../data/datasets.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import { useCompareStore } from '../../../stores/compare.ts'
import { useCriteriaStore } from '../../../stores/criteria.ts'
import { useDataStore } from '../../../stores/data.ts'
import type { FailedFile } from '../../../stores/data.ts'
import { formatCompareQuery, parseCompareQuery } from '../../../ui/compare.ts'
import { compareRows } from './compareModel.ts'
import type { CompareRowSpec } from './compareModel.ts'

/** Une colonne du comparateur : un élément et l'état de sa lecture. */
export interface CompareColumn {
  readonly ref: EntityRef
  /** `ready` : entrée trouvée ; `loading` : fichier en cours de lecture ; `error` : fichier illisible ; `missing` : référence absente des données. */
  readonly state: 'ready' | 'loading' | 'error' | 'missing'
  /** Entrée de `data/`, vue comme une ligne de catalogue ; `null` tant qu'elle manque. */
  readonly row: CatalogRow | null
  /** Score de recommandation (armes) : `undefined` si l'arme n'est pas évaluée pour le style, `null` si « Non classé », sinon le total. */
  readonly score: number | null | undefined
}

/** Valeur renvoyée par `useCompare`. */
export interface CompareState {
  readonly kind: ComputedRef<EntityKind | null>
  readonly columns: ComputedRef<CompareColumn[]>
  readonly rows: ComputedRef<readonly CompareRowSpec[]>
  readonly profile: ComputedRef<ProfileContext>
  /** Fichiers en échec, nommés pour le message d'erreur. */
  readonly failed: ComputedRef<FailedFile[]>
  retry(): Promise<void>
}

/** Fichiers que le moteur lit pour évaluer une arme (score). */
const WEAPON_ENGINE_FILES: readonly FileKey[] = ['bosses', 'origins', 'tables']

/**
 * Prépare le comparateur.
 * Adresse → store : à l'ouverture et à chaque changement de `?e=`, la liste du store est remplacée par les références valides de l'adresse (`compare.replace`).
 * Store → adresse : un ajout ou un retrait réécrit `?e=` par `router.replace` (pas d'entrée d'historique par clic). Les deux sens s'arrêtent dès que
 * les deux listes sont égales, donc aucune boucle. Sans `?e=` à l'ouverture, la liste déjà dans le store (ajoutée depuis une fiche) est conservée et écrite dans l'adresse.
 * @returns Genre commun, colonnes, lignes, profil, fichiers en échec et « Réessayer ».
 */
export function useCompare(): CompareState {
  const route = useRoute()
  const router = useRouter()
  const compare = useCompareStore()
  const data = useDataStore()
  const analysis = useAnalysisStore()
  const criteria = useCriteriaStore()

  const kind = computed(() => compare.kind)

  // --- Adresse ↔ store ---------------------------------------------------------------------------------------------
  const queryText = computed(() => formatCompareQuery(parseCompareQuery(route.query.e)) ?? '')
  const storeText = computed(() => formatCompareQuery(compare.items) ?? '')

  /** Aligne l'adresse sur le store (remplacement, sans nouvelle entrée d'historique). */
  function writeUrl(): void {
    const e = formatCompareQuery(compare.items)
    const query = { ...route.query }
    if (e === undefined) delete query.e
    else query.e = e
    void router.replace({ query })
  }

  /** Aligne le store sur l'adresse ; si l'adresse contenait des références refusées, elle est corrigée. */
  function readUrl(): void {
    compare.replace(parseCompareQuery(route.query.e))
    if (storeText.value !== queryText.value) writeUrl()
  }

  if (route.query.e === undefined && compare.items.length > 0) writeUrl()
  else readUrl()

  watch(queryText, (text) => {
    if (text !== storeText.value) readUrl()
  })
  watch(storeText, (text) => {
    if (text !== queryText.value) writeUrl()
  })

  // --- Données -----------------------------------------------------------------------------------------------------
  const files = computed((): FileKey[] => {
    const k = kind.value
    if (k === null) return ['search-index']
    return [...datasetsOfKind(k), 'search-index', ...(k === 'weapon' ? WEAPON_ENGINE_FILES : [])]
  })
  const datasets = useDatasets(files)
  const engineReady = computed(() => data.statusOf(WEAPON_ENGINE_FILES) === 'ready')

  // `analysis.scored` n'est lu que pour des armes : le calcul des scores n'est pas payé pour les autres genres.
  const scores = computed(() => {
    const map = new Map<EntityRef, number | null>()
    if (kind.value !== 'weapon' || !engineReady.value) return map
    for (const s of analysis.scored) map.set(s.candidate.ref, s.score.value?.total ?? null)
    return map
  })

  const columns = computed((): CompareColumn[] =>
    compare.items.map((ref): CompareColumn => {
      const entry = data.entity(ref) as CatalogRow | null
      const k = kind.value
      const score = k === 'weapon' && engineReady.value ? scores.value.get(ref) : undefined
      if (entry !== null) return { ref, state: 'ready', row: entry, score }
      const status = k === null ? 'ready' : data.statusOf(datasetsOfKind(k))
      return { ref, state: status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'missing', row: null, score }
    }),
  )

  const rows = computed(() => {
    const k = kind.value
    if (k === null) return []
    return compareRows(k, { withScore: columns.value.some((c) => c.score !== undefined) })
  })

  const profile = computed(
    (): ProfileContext => ({
      attributes: criteria.criteria.character.attributes,
      hands: criteria.criteria.style.hands === 2 ? 'two' : 'one',
    }),
  )

  return { kind, columns, rows, profile, failed: datasets.failed, retry: datasets.retry }
}
