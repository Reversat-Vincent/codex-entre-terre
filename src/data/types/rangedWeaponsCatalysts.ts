// Types du jeu de données `ranged_weapons_catalysts` (armes à distance et catalyseurs) : alias du type commun des armes (weapon.ts).

import type { WeaponEntry, WeaponFile, WeaponMeta, WeaponRaw } from './weapon.ts'

/** Entrée de `data/ranged_weapons_catalysts.json` telle que dans data/. */
export type RangedWeaponCatalystRaw = WeaponRaw

/** Entrée préparée de `ranged_weapons_catalysts`. */
export type RangedWeaponCatalystEntry = WeaponEntry

/** Métadonnées de `data/ranged_weapons_catalysts.json`. */
export type RangedWeaponCatalystMeta = WeaponMeta

/** Fichier préparé `ranged_weapons_catalysts`. */
export type RangedWeaponCatalystFile = WeaponFile
