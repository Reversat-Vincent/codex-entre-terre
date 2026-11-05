// Index des rencontres de boss par clé `bossId/encounterId` (docs/architecture.md § 3.3), partagé par l'étape, la frise et le niveau recommandé.
// Lecture de données seulement, sans calcul.

import type { BossEntry, Encounter } from '../data/types/bosses.ts'

/** Rencontre trouvée par sa clé, avec sa page de boss. */
export interface EncounterRef {
  readonly key: string
  readonly boss: BossEntry
  /** `null` pour une page sans rencontre (clé = `bossId`). */
  readonly encounter: Encounter | null
}

/** Index des rencontres et des pages de boss. */
export interface EncounterIndex {
  readonly byKey: ReadonlyMap<string, EncounterRef>
  readonly bosses: ReadonlyMap<string, BossEntry>
}

/**
 * Construit l'index des rencontres (`derived.encounters[i].key`, et `derived.pageKey` pour une page sans rencontre).
 * @param bosses Pages de boss préparées.
 * @returns L'index, à construire une fois par jeu de données.
 */
export function indexEncounters(bosses: readonly BossEntry[]): EncounterIndex {
  const byKey = new Map<string, EncounterRef>()
  const byId = new Map<string, BossEntry>()
  for (const boss of bosses) {
    byId.set(boss.id, boss)
    boss.encounters.forEach((encounter, i) => {
      const key = boss.derived.encounters[i]?.key
      if (key !== undefined) byKey.set(key, { key, boss, encounter })
    })
    if (boss.derived.pageKey !== null) byKey.set(boss.derived.pageKey, { key: boss.derived.pageKey, boss, encounter: null })
  }
  return { byKey, bosses: byId }
}
