// Composable commun des fiches : demande le fichier du genre (et l'index de recherche pour les liens croisés), résout l'entrée de l'adresse,
// donne l'état d'affichage (chargement, erreur, introuvable, prêt) et fixe le titre de la page.

import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { useDatasets } from '../../../composables/useDatasets.ts'
import { usePageTitle } from '../../../composables/usePageTitle.ts'
import type { EntityRef } from '../../../data/datasets.ts'
import type { ArmorEntry } from '../../../data/types/armor.ts'
import type { AshOfWarEntry } from '../../../data/types/ashesOfWar.ts'
import type { SpellEntry } from '../../../data/types/spells.ts'
import type { SpiritAshEntry } from '../../../data/types/spiritAshes.ts'
import type { TalismanEntry } from '../../../data/types/talismans.ts'
import { useDataStore } from '../../../stores/data.ts'
import type { FailedFile } from '../../../stores/data.ts'
import { SHEET_KINDS } from './sheetKinds.ts'
import type { SheetKind, SheetKindInfo } from './sheetKinds.ts'

/** Type d'entrée de chaque genre de fiche. */
export interface SheetEntryMap {
  readonly ash: AshOfWarEntry
  readonly armor: ArmorEntry
  readonly talisman: TalismanEntry
  readonly spell: SpellEntry
  readonly spirit: SpiritAshEntry
}

/** État d'affichage d'une fiche : `loading` (fichier en cours de lecture), `error`, `missing` (identifiant inconnu) ou `ready`. */
export type SheetView = 'loading' | 'error' | 'missing' | 'ready'

/** Valeur renvoyée par `useSheetEntry`. */
export interface SheetEntryState<K extends SheetKind> {
  readonly info: SheetKindInfo
  /** Entrée résolue, `null` tant qu'elle manque. */
  readonly entry: ComputedRef<SheetEntryMap[K] | null>
  readonly view: ComputedRef<SheetView>
  /** Fichiers en échec, nommés pour le message d'erreur. */
  readonly failed: ComputedRef<FailedFile[]>
  /** Date d'extraction du fichier (`metadata.retrieved`), `null` tant qu'il n'est pas lu. */
  readonly retrieved: ComputedRef<string | null>
  /** Référence stable de l'entité (`armor:aristocrat-hat`). */
  readonly ref: ComputedRef<EntityRef>
  /** Relance les fichiers en échec. */
  retry(): Promise<void>
}

/**
 * Prépare l'état d'une fiche de genre simple (un seul fichier de données).
 * L'index de recherche est demandé pour les liens croisés mais n'empêche jamais d'afficher la fiche : les noms restent du texte tant qu'il manque.
 * Le titre de la page est le nom de l'entité une fois résolue (`usePageTitle`).
 * @param kind Genre de la fiche.
 * @param id Identifiant de l'entrée (paramètre de la route), valeur, référence ou fonction.
 * @returns L'entrée, l'état d'affichage, les fichiers en échec et l'action « Réessayer ».
 */
export function useSheetEntry<K extends SheetKind>(kind: K, id: MaybeRefOrGetter<string>): SheetEntryState<K> {
  const info = SHEET_KINDS[kind]
  const data = useDataStore()
  const datasets = useDatasets([info.dataset, 'search-index'])

  const ref = computed((): EntityRef => `${kind}:${toValue(id)}`)
  const entry = computed(() => {
    if (toValue(id) === '') return null
    return data.entity(ref.value) as SheetEntryMap[K] | null
  })
  // L'état du fichier de données seul décide : un échec de l'index de recherche ne cache pas la fiche.
  const ownStatus = computed(() => data.statusOf([info.dataset]))
  const view = computed((): SheetView => {
    if (entry.value) return 'ready'
    if (ownStatus.value === 'error') return 'error'
    if (ownStatus.value === 'loading' && toValue(id) !== '') return 'loading'
    return 'missing'
  })
  const failed = computed(() => data.failed([info.dataset]))
  const retrieved = computed(() => data.dataset(info.dataset)?.meta.retrieved ?? null)

  usePageTitle(() => entry.value?.derived.displayName)

  return { info, entry, view, failed, retrieved, ref, retry: datasets.retry }
}
