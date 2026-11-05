// Composable `useWidgetData` : état de chargement d'un widget d'après les fichiers de son entrée du registre (`requires`, `enhancedBy`).
// Sert `WidgetHost` (tableau de bord) et le plein écran : même état, mêmes messages (docs/architecture.md § 4 ; note `spec-main`).

import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { FILE_LABELS } from '../data/datasets.ts'
import type { FileKey } from '../data/datasets.ts'
import { useCriteriaStore } from '../stores/criteria.ts'
import type { WidgetId } from '../widgets/ids.ts'
import { enhancingFiles, requiredFiles } from '../widgets/registry.ts'
import type { WidgetState } from '../components/ds/types.ts'
import { useDatasets } from './useDatasets.ts'

/** Valeur renvoyée par `useWidgetData`. */
export interface WidgetData {
  /** `loading` tant qu'un fichier requis manque, `error` si l'un a échoué, `partial` si un fichier facultatif manque, sinon `ready`. */
  state: ComputedRef<WidgetState>
  /** Fichiers requis en échec, nommés comme dans le dossier de données (`bosses.json`), séparés par des virgules ; `undefined` sans échec. */
  errorFile: ComputedRef<string | undefined>
  /** Texte du bandeau « Données partielles » : quels fichiers manquent et ce que devient le widget. */
  partialText: ComputedRef<string>
  /** Relance les fichiers requis en échec. */
  retry: () => Promise<void>
}

/** Options de `useWidgetData`. */
export interface WidgetDataOptions {
  /** Faux : aucun fichier n'est demandé (widget réduit, rien n'est affiché). Vrai par défaut. */
  active?: MaybeRefOrGetter<boolean>
}

/**
 * Suit les fichiers de données d'un widget. Les fichiers dépendent du style de jeu et des classes préférées (registre, D7) : la liste est
 * recalculée quand les critères changent et le chargement redemandé (`useDatasets`).
 * Effet : demande le chargement des fichiers requis et facultatifs tant que `active` est vrai.
 * @param id Identifiant du widget (valeur, référence ou getter).
 * @param options Activation du chargement.
 * @returns L'état agrégé, les textes d'erreur et de données partielles, et l'action « Réessayer ».
 */
export function useWidgetData(id: MaybeRefOrGetter<WidgetId>, options: WidgetDataOptions = {}): WidgetData {
  const criteria = useCriteriaStore()
  const active = computed(() => toValue(options.active) ?? true)
  const widgetCriteria = computed(() => ({ style: { mode: criteria.criteria.style.mode, classes: criteria.criteria.style.classes } }))
  const required = useDatasets(() => (active.value ? requiredFiles(toValue(id), widgetCriteria.value) : []))
  const enhancing = computed<FileKey[]>(() => (active.value ? enhancingFiles(toValue(id), widgetCriteria.value) : []))
  const enhanced = useDatasets(enhancing)

  const state = computed<WidgetState>(() => {
    if (!active.value) return 'ready'
    if (required.status.value !== 'ready') return required.status.value
    return enhanced.status.value === 'ready' ? 'ready' : 'partial'
  })

  const errorFile = computed(() => {
    const failed = required.failed.value
    if (failed.length === 0) return undefined
    return failed.map((f) => (f.key === 'manifest' ? 'manifest.json' : `${f.key}.json`)).join(', ')
  })

  const partialText = computed(() => {
    const missing = enhancing.value.filter((k) => !enhanced.readyKeys.value.includes(k)).map((k) => FILE_LABELS[k])
    if (missing.length === 0) return ''
    const list = missing.join(', ')
    if (enhanced.status.value === 'error') {
      return `${list} : lecture impossible. Le widget s'affiche sans ces données ; rechargez la page pour les relire.`
    }
    return `${list} : lecture en cours. Le widget s'affiche sans ces données et se complète dès qu'elles sont lues.`
  })

  return { state, errorFile, partialText, retry: required.retry }
}
