// Données préparées en mémoire (même préparation que `npm run data`) pour les tests du moteur, partie 2 : armes, boss, index des rencontres.
// Les tests qui en dépendent lisent data/ tel qu'il est : ceux qui pourraient changer avec les compléments de données sont signalés.

import { prepared } from '../data/helpers.ts'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { indexEncounters } from '../../../src/engine/encounters.ts'
import type { EncounterIndex } from '../../../src/engine/encounters.ts'
import type { CandidateWeapon, WeaponData } from '../../../src/engine/score.ts'
import type { WeaponFileKey } from '../../../src/engine/types.ts'

export const WEAPON_FILES: readonly WeaponFileKey[] = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches']

export function data() {
  return prepared()
}

export function weaponData(): WeaponData {
  const ds = prepared().datasets
  return { melee_armaments: ds.melee_armaments.entries, ranged_weapons_catalysts: ds.ranged_weapons_catalysts.entries, shields_torches: ds.shields_torches.entries }
}

export function allWeapons(): CandidateWeapon[] {
  const ds = prepared().datasets
  return WEAPON_FILES.flatMap((file) => ds[file].entries.map((weapon): CandidateWeapon => ({ file, weapon, ref: `weapon:${weapon.id}` })))
}

export function candidate(name: string): CandidateWeapon {
  const found = allWeapons().find((c) => c.weapon.name === name)
  if (found === undefined) throw new Error(`arme ${name} absente`)
  return found
}

export function weaponEntry(name: string): WeaponEntry {
  return candidate(name).weapon
}

let index: EncounterIndex | null = null

export function encounters(): EncounterIndex {
  index ??= indexEncounters(prepared().datasets.bosses.entries)
  return index
}
