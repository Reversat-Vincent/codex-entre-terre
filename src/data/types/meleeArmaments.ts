// Types du jeu de données `melee_armaments` (armes de mêlée) : alias du type commun des armes (weapon.ts).

import type { WeaponEntry, WeaponFile, WeaponMeta, WeaponRaw } from './weapon.ts'

/** Entrée de `data/melee_armaments.json` telle que dans data/. */
export type MeleeArmamentRaw = WeaponRaw

/** Entrée préparée de `melee_armaments`. */
export type MeleeArmamentEntry = WeaponEntry

/** Métadonnées de `data/melee_armaments.json`. */
export type MeleeArmamentMeta = WeaponMeta

/** Fichier préparé `melee_armaments`. */
export type MeleeArmamentFile = WeaponFile
