// Données préparées en mémoire (même préparation que `npm run data`) pour les tests du moteur, partie 2 : armes, boss, index des rencontres.
// Les tests qui en dépendent lisent data/ tel qu'il est : ceux qui pourraient changer avec les compléments de données sont signalés.

import { prepared } from '../data/helpers.ts'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { indexEncounters } from '../../../src/engine/encounters.ts'
import type { EncounterIndex } from '../../../src/engine/encounters.ts'
import type { CandidateWeapon, WeaponData } from '../../../src/engine/score.ts'
import type { WeaponFileKey } from '../../../src/engine/types.ts'

/** Les trois fichiers d'armes, dans l'ordre des candidats du moteur. */
export const WEAPON_FILES: readonly WeaponFileKey[] = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches']

/**
 * Données préparées en mémoire (cache de `prepared()` dans tests/unit/data/helpers.ts).
 * @returns Les jeux préparés, les tables et l'index de recherche.
 */
export function data() {
  return prepared()
}

/**
 * Armes préparées des trois fichiers, forme lue par `candidateWeapons` et `catalystCaps`.
 * @returns Les armes, par fichier.
 */
export function weaponData(): WeaponData {
  const ds = prepared().datasets
  return { melee_armaments: ds.melee_armaments.entries, ranged_weapons_catalysts: ds.ranged_weapons_catalysts.entries, shields_torches: ds.shields_torches.entries }
}

/**
 * Toutes les armes préparées en candidats (487 avec les données actuelles).
 * @returns Les candidats, dans l'ordre des fichiers.
 */
export function allWeapons(): CandidateWeapon[] {
  const ds = prepared().datasets
  return WEAPON_FILES.flatMap((file) => ds[file].entries.map((weapon): CandidateWeapon => ({ file, weapon, ref: `weapon:${weapon.id}` })))
}

/**
 * Candidat d'une arme préparée, cherché par son nom exact.
 * @param name Nom de l'arme dans data/.
 * @returns Le candidat ; lève une erreur si l'arme est absente.
 */
export function candidate(name: string): CandidateWeapon {
  const found = allWeapons().find((c) => c.weapon.name === name)
  if (found === undefined) throw new Error(`arme ${name} absente`)
  return found
}

/**
 * Arme préparée, cherchée par son nom exact.
 * @param name Nom de l'arme dans data/.
 * @returns L'arme ; lève une erreur si elle est absente.
 */
export function weaponEntry(name: string): WeaponEntry {
  return candidate(name).weapon
}

let index: EncounterIndex | null = null

/**
 * Index des rencontres des boss préparés, construit une fois par fichier de test.
 * @returns L'index par clé `bossId/encounterId`.
 */
export function encounters(): EncounterIndex {
  index ??= indexEncounters(prepared().datasets.bosses.entries)
  return index
}
