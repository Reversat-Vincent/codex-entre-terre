// Types du jeu de données `shields_torches` (boucliers et torches) : alias du type commun des armes (weapon.ts).

import type { WeaponEntry, WeaponFile, WeaponMeta, WeaponRaw } from './weapon.ts'

/** Entrée de `data/shields_torches.json` telle que dans data/. */
export type ShieldTorchRaw = WeaponRaw

/** Entrée préparée de `shields_torches`. */
export type ShieldTorchEntry = WeaponEntry

/** Métadonnées de `data/shields_torches.json`. */
export type ShieldTorchMeta = WeaponMeta

/** Fichier préparé `shields_torches`. */
export type ShieldTorchFile = WeaponFile
