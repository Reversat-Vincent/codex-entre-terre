// Point d'entrée des types de données : correspondance clé de fichier → type du fichier préparé, pour le chargeur et le store des données.
// Ne réexporte que des types : l'application n'embarque aucun schéma d'exécution.

import type { DatasetKey, FileKey } from '../datasets.ts'
import type { AmmunitionEntry, AmmunitionFile } from './ammunition.ts'
import type { ArmorEntry, ArmorFile } from './armor.ts'
import type { AshOfWarEntry, AshOfWarFile } from './ashesOfWar.ts'
import type { BossEntry, BossFile } from './bosses.ts'
import type { CraftingMaterialEntry, CraftingMaterialFile } from './craftingMaterials.ts'
import type { KeyItemEntry, KeyItemFile } from './keyItems.ts'
import type { LocationEntry, LocationFile } from './locations.ts'
import type { MechanicEntry, MechanicFile } from './mechanics.ts'
import type { NpcEntry, NpcFile } from './npcs.ts'
import type { OriginEntry, OriginFile } from './origins.ts'
import type { SearchIndexFile } from './searchIndex.ts'
import type { SpellEntry, SpellFile } from './spells.ts'
import type { SpiritAshEntry, SpiritAshFile } from './spiritAshes.ts'
import type { TablesFile } from './tables.ts'
import type { TalismanEntry, TalismanFile } from './talismans.ts'
import type { ToolEntry, ToolFile } from './tools.ts'
import type { UpgradeMaterialEntry, UpgradeMaterialFile } from './upgradeMaterials.ts'
import type { WeaponEntry, WeaponFile } from './weapon.ts'

export type * from './common.ts'
export type * from './weapon.ts'
export type * from './meleeArmaments.ts'
export type * from './rangedWeaponsCatalysts.ts'
export type * from './shieldsTorches.ts'
export type * from './ashesOfWar.ts'
export type * from './armor.ts'
export type * from './talismans.ts'
export type * from './spells.ts'
export type * from './spiritAshes.ts'
export type * from './tools.ts'
export type * from './upgradeMaterials.ts'
export type * from './keyItems.ts'
export type * from './craftingMaterials.ts'
export type * from './ammunition.ts'
export type * from './bosses.ts'
export type * from './locations.ts'
export type * from './npcs.ts'
export type * from './origins.ts'
export type * from './mechanics.ts'
export type * from './tables.ts'
export type * from './searchIndex.ts'
export type * from './manifest.ts'

/** Type du fichier préparé de chaque jeu de données. */
export interface DatasetFileMap {
  melee_armaments: WeaponFile
  ranged_weapons_catalysts: WeaponFile
  shields_torches: WeaponFile
  ashes_of_war: AshOfWarFile
  armor: ArmorFile
  talismans: TalismanFile
  spells: SpellFile
  spirit_ashes: SpiritAshFile
  tools: ToolFile
  upgrade_materials: UpgradeMaterialFile
  key_items: KeyItemFile
  crafting_materials: CraftingMaterialFile
  ammunition: AmmunitionFile
  bosses: BossFile
  locations: LocationFile
  npcs: NpcFile
  origins: OriginFile
  mechanics: MechanicFile
}

/** Type d'une entrée préparée de chaque jeu de données. */
export interface DatasetEntryMap {
  melee_armaments: WeaponEntry
  ranged_weapons_catalysts: WeaponEntry
  shields_torches: WeaponEntry
  ashes_of_war: AshOfWarEntry
  armor: ArmorEntry
  talismans: TalismanEntry
  spells: SpellEntry
  spirit_ashes: SpiritAshEntry
  tools: ToolEntry
  upgrade_materials: UpgradeMaterialEntry
  key_items: KeyItemEntry
  crafting_materials: CraftingMaterialEntry
  ammunition: AmmunitionEntry
  bosses: BossEntry
  locations: LocationEntry
  npcs: NpcEntry
  origins: OriginEntry
  mechanics: MechanicEntry
}

/** Type d'un fichier produit, jeux de données, tables et index compris. */
export type FileOf<K extends FileKey> = K extends DatasetKey
  ? DatasetFileMap[K]
  : K extends 'tables'
    ? TablesFile
    : SearchIndexFile

/** Type du fichier préparé d'un jeu de données (`useDataStore().dataset(key)`). */
export type DatasetOf<K extends DatasetKey> = DatasetFileMap[K]

/** Entrée préparée quelconque. */
export type AnyEntry = DatasetEntryMap[DatasetKey]
