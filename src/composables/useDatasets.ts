// Composable d'accès aux fichiers de données pour un widget ou une vue : demande le chargement et expose l'état agrégé (docs/architecture.md § 4).
// Alimente `CxWidgetShell` : fichier fautif nommé et « Réessayer ».

import { computed, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { FileKey } from '../data/datasets.ts'
import { useDataStore } from '../stores/data.ts'
import type { FailedFile } from '../stores/data.ts'

/** État agrégé de plusieurs fichiers de données. */
export interface UseDatasets {
  /** `loading` tant qu'un fichier manque, `error` si l'un a échoué, `ready` quand tous sont lus. */
  status: ComputedRef<'loading' | 'ready' | 'error'>
  /** Fichiers en échec (le manifeste compris), avec leur libellé et leur erreur. */
  failed: ComputedRef<FailedFile[]>
  /** Fichiers déjà lus : permet l'affichage partiel (`enhancedBy`). */
  readyKeys: ComputedRef<FileKey[]>
  /** Relance les fichiers en échec. */
  retry(): Promise<void>
}

/**
 * Demande le chargement des fichiers indiqués (idempotent) et suit leur état.
 * La liste peut changer (fonction des critères) : le chargement est redemandé à chaque changement.
 * @param keys Clés des fichiers, ou fonction/référence qui les renvoie.
 * @returns L'état agrégé et l'action « Réessayer ».
 */
export function useDatasets(keys: MaybeRefOrGetter<readonly FileKey[]>): UseDatasets {
  const data = useDataStore()
  const list = computed(() => toValue(keys))
  watch(
    list,
    (current) => {
      void data.ensure(current)
    },
    { immediate: true },
  )
  return {
    status: computed(() => data.statusOf(list.value)),
    failed: computed(() => data.failed(list.value)),
    readyKeys: computed(() => list.value.filter((k) => data.files[k].status === 'ready')),
    retry: async () => {
      await Promise.all(data.failed(list.value).map((f) => data.retry(f.key)))
    },
  }
}
