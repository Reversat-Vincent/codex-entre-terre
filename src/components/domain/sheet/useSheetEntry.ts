// Composable commun des fiches : demande le fichier du genre (et l'index de recherche pour les liens croisés), résout l'entrée de l'adresse,
// donne l'état d'affichage (chargement, erreur, introuvable, prêt) et fixe le titre de la page.

import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { useDatasets } from '../../../composables/useDatasets.ts'
import { usePageTitle } from '../../../composables/usePageTitle.ts'
import type { DatasetKey, EntityRef } from '../../../data/datasets.ts'
import type { AmmunitionEntry } from '../../../data/types/ammunition.ts'
import type { ArmorEntry } from '../../../data/types/armor.ts'
import type { AshOfWarEntry } from '../../../data/types/ashesOfWar.ts'
import type { CraftingMaterialEntry } from '../../../data/types/craftingMaterials.ts'
import type { KeyItemEntry } from '../../../data/types/keyItems.ts'
import type { LocationEntry } from '../../../data/types/locations.ts'
import type { NpcEntry } from '../../../data/types/npcs.ts'
import type { OriginEntry } from '../../../data/types/origins.ts'
import type { SpellEntry } from '../../../data/types/spells.ts'
import type { SpiritAshEntry } from '../../../data/types/spiritAshes.ts'
import type { TalismanEntry } from '../../../data/types/talismans.ts'
import type { ToolEntry } from '../../../data/types/tools.ts'
import type { UpgradeMaterialEntry } from '../../../data/types/upgradeMaterials.ts'
import { useDataStore } from '../../../stores/data.ts'
import type { FailedFile } from '../../../stores/data.ts'
import { SHEET_KINDS } from './sheetKinds.ts'
import type { SheetKind, SheetKindInfo } from './sheetKinds.ts'

/** Entrée d'un objet : l'un des cinq fichiers d'objets (outils, matériaux d'amélioration, objets clés, matériaux d'artisanat, munitions). */
export type ItemEntry = ToolEntry | UpgradeMaterialEntry | KeyItemEntry | CraftingMaterialEntry | AmmunitionEntry

/** Type d'entrée de chaque genre de fiche. */
export interface SheetEntryMap {
  readonly ash: AshOfWarEntry
  readonly armor: ArmorEntry
  readonly talisman: TalismanEntry
  readonly spell: SpellEntry
  readonly spirit: SpiritAshEntry
  readonly item: ItemEntry
  readonly location: LocationEntry
  readonly npc: NpcEntry
  readonly origin: OriginEntry
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
  /** Fichier de données qui contient l'entrée (un des cinq fichiers pour un objet), `null` tant que l'entrée manque. */
  readonly datasetKey: ComputedRef<DatasetKey | null>
  /** Date d'extraction du fichier de l'entrée (`metadata.retrieved`), `null` tant qu'il n'est pas lu. */
  readonly retrieved: ComputedRef<string | null>
  /** Référence stable de l'entité (`armor:aristocrat-hat`). */
  readonly ref: ComputedRef<EntityRef>
  /** Relance les fichiers en échec. */
  retry(): Promise<void>
}

/**
 * Prépare l'état d'une fiche. Un genre a un ou plusieurs fichiers de données (les objets en ont cinq : l'identifiant ne dit pas lequel contient l'entrée) ;
 * tant que l'entrée n'est pas trouvée, la fiche attend la lecture de tous ces fichiers.
 * L'index de recherche est demandé pour les liens croisés mais n'empêche jamais d'afficher la fiche : les noms restent du texte tant qu'il manque.
 * Le titre de la page est le nom de l'entité une fois résolue (`usePageTitle`).
 * @param kind Genre de la fiche.
 * @param id Identifiant de l'entrée (paramètre de la route), valeur, référence ou fonction.
 * @returns L'entrée, l'état d'affichage, les fichiers en échec et l'action « Réessayer ».
 */
export function useSheetEntry<K extends SheetKind>(kind: K, id: MaybeRefOrGetter<string>): SheetEntryState<K> {
  const info = SHEET_KINDS[kind]
  const data = useDataStore()
  const datasets = useDatasets([...info.datasets, 'search-index'])

  const ref = computed((): EntityRef => `${kind}:${toValue(id)}`)
  const entry = computed(() => {
    if (toValue(id) === '') return null
    return data.entity(ref.value) as SheetEntryMap[K] | null
  })
  // L'état des fichiers de données seuls décide : un échec de l'index de recherche ne cache pas la fiche.
  const ownStatus = computed(() => data.statusOf(info.datasets))
  const view = computed((): SheetView => {
    if (entry.value) return 'ready'
    if (ownStatus.value === 'error') return 'error'
    if (ownStatus.value === 'loading' && toValue(id) !== '') return 'loading'
    return 'missing'
  })
  const failed = computed(() => data.failed(info.datasets))
  const datasetKey = computed((): DatasetKey | null => {
    const found = entry.value
    if (found === null) return null
    if (info.datasets.length === 1) return info.dataset
    return info.datasets.find((k) => (data.dataset(k)?.entries as readonly unknown[] | undefined)?.includes(found)) ?? null
  })
  const retrieved = computed(() => data.dataset(datasetKey.value ?? info.dataset)?.meta.retrieved ?? null)

  usePageTitle(() => entry.value?.derived.displayName)

  return { info, entry, view, failed, datasetKey, retrieved, ref, retry: datasets.retry }
}
