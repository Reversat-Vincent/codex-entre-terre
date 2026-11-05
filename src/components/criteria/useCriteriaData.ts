// Composable `useCriteriaData` : jeux de données lus par le panneau de critères (armes, origines, boss, lieux), sous forme de listes prêtes à l'emploi.
// Il ne charge rien : `CriteriaPanel` demande les fichiers (`useDatasets`) ; tant qu'un fichier manque, sa liste est vide.

import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { LocationEntry } from '../../data/types/locations.ts'
import type { OriginEntry } from '../../data/types/origins.ts'
import type { WeaponEntry } from '../../data/types/weapon.ts'
import { useDataStore } from '../../stores/data.ts'

/** Fichiers que le panneau de critères demande au démarrage. */
export const CRITERIA_FILES = ['origins', 'bosses', 'tables', 'melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const

/** Listes lues dans les jeux de données chargés. */
export interface CriteriaData {
  /** Armes des trois fichiers d'armes. */
  weapons: ComputedRef<readonly WeaponEntry[]>
  /** Toutes les origines des données. */
  origins: ComputedRef<readonly OriginEntry[]>
  /** Lieux (chargés à la demande, pour la progression par régions). */
  locations: ComputedRef<readonly LocationEntry[]>
  /** Nom d'un boss d'après son identifiant, `null` si inconnu ou non chargé. */
  bossName: ComputedRef<(id: string) => string | null>
  /** Nom d'une entité d'après sa référence (`origin:samurai`), `null` si inconnue ou non chargée. */
  entityName: ComputedRef<(ref: string) => string | null>
}

/**
 * Donne accès aux listes de données du panneau de critères.
 * @returns Des listes réactives, vides tant que le fichier correspondant n'est pas lu.
 */
export function useCriteriaData(): CriteriaData {
  const data = useDataStore()
  const weapons = computed(() => [
    ...(data.dataset('melee_armaments')?.entries ?? []),
    ...(data.dataset('ranged_weapons_catalysts')?.entries ?? []),
    ...(data.dataset('shields_torches')?.entries ?? []),
  ])
  const origins = computed(() => data.dataset('origins')?.entries ?? [])
  const locations = computed(() => data.dataset('locations')?.entries ?? [])
  const bossName = computed(() => {
    const byId = new Map((data.dataset('bosses')?.entries ?? []).map((b) => [b.id, b.name]))
    return (id: string): string | null => byId.get(id) ?? null
  })
  const entityName = computed(() => (ref: string): string | null => {
    const entry = data.entity(ref as Parameters<typeof data.entity>[0])
    return entry !== null && 'name' in entry && typeof entry.name === 'string' ? entry.name : null
  })
  return { weapons, origins, locations, bossName, entityName }
}
