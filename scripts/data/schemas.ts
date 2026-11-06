// Registre des schémas de chaque jeu de données (entrée et métadonnées), utilisé par le contrôle « champs et types conformes aux types ».

import type { DatasetKey } from '../../src/data/datasets.ts'
import { ammunitionMetaSchema, ammunitionSchema } from '../../src/data/types/ammunition.ts'
import { armorMetaSchema, armorSchema } from '../../src/data/types/armor.ts'
import { ashesOfWarMetaSchema, ashesOfWarSchema } from '../../src/data/types/ashesOfWar.ts'
import { bossesMetaSchema, bossSchema } from '../../src/data/types/bosses.ts'
import { craftingMaterialsMetaSchema, craftingMaterialsSchema } from '../../src/data/types/craftingMaterials.ts'
import { keyItemsMetaSchema, keyItemsSchema } from '../../src/data/types/keyItems.ts'
import { locationSchema, locationsMetaSchema } from '../../src/data/types/locations.ts'
import { mechanicSchema, mechanicsMetaSchema } from '../../src/data/types/mechanics.ts'
import { npcSchema, npcsMetaSchema } from '../../src/data/types/npcs.ts'
import { originSchema, originsMetaSchema } from '../../src/data/types/origins.ts'
import type { Schema } from '../../src/data/types/schema.ts'
import { spellsMetaSchema, spellsSchema } from '../../src/data/types/spells.ts'
import { spiritAshesMetaSchema, spiritAshesSchema } from '../../src/data/types/spiritAshes.ts'
import { talismansMetaSchema, talismansSchema } from '../../src/data/types/talismans.ts'
import { toolsMetaSchema, toolsSchema } from '../../src/data/types/tools.ts'
import { upgradeMaterialsMetaSchema, upgradeMaterialsSchema } from '../../src/data/types/upgradeMaterials.ts'
import { weaponMetaSchema, weaponSchema } from '../../src/data/types/weapon.ts'

/** Schémas d'un jeu de données. */
export interface DatasetSchemas {
  readonly entry: Schema<unknown>
  readonly meta: Schema<unknown>
}

/** Schémas d'entrée et de métadonnées de chaque jeu de données. */
export const DATASET_SCHEMAS: Readonly<Record<DatasetKey, DatasetSchemas>> = {
  melee_armaments: { entry: weaponSchema, meta: weaponMetaSchema },
  ranged_weapons_catalysts: { entry: weaponSchema, meta: weaponMetaSchema },
  shields_torches: { entry: weaponSchema, meta: weaponMetaSchema },
  ashes_of_war: { entry: ashesOfWarSchema, meta: ashesOfWarMetaSchema },
  armor: { entry: armorSchema, meta: armorMetaSchema },
  talismans: { entry: talismansSchema, meta: talismansMetaSchema },
  spells: { entry: spellsSchema, meta: spellsMetaSchema },
  spirit_ashes: { entry: spiritAshesSchema, meta: spiritAshesMetaSchema },
  tools: { entry: toolsSchema, meta: toolsMetaSchema },
  upgrade_materials: { entry: upgradeMaterialsSchema, meta: upgradeMaterialsMetaSchema },
  key_items: { entry: keyItemsSchema, meta: keyItemsMetaSchema },
  crafting_materials: { entry: craftingMaterialsSchema, meta: craftingMaterialsMetaSchema },
  ammunition: { entry: ammunitionSchema, meta: ammunitionMetaSchema },
  bosses: { entry: bossSchema, meta: bossesMetaSchema },
  locations: { entry: locationSchema, meta: locationsMetaSchema },
  npcs: { entry: npcSchema, meta: npcsMetaSchema },
  origins: { entry: originSchema, meta: originsMetaSchema },
  mechanics: { entry: mechanicSchema, meta: mechanicsMetaSchema },
}
