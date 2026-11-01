// Régénère les fixtures des tests (`tests/fixtures/`) : extraits réels des données préparées, à la forme exacte des fichiers produits.
// Usage : `node scripts/data/fixtures.ts`. Relancer après tout changement de data/ ou de la préparation ; ne jamais éditer les fixtures à la main.

import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DATASET_KEYS } from '../../src/data/datasets.ts'
import type { DatasetKey } from '../../src/data/datasets.ts'
import type { DatasetFile } from '../../src/data/types/common.ts'
import type { WeaponEntry } from '../../src/data/types/weapon.ts'
import type { TablesFile } from '../../src/data/types/tables.ts'
import { DataCheckError } from './checks.ts'
import { readRawDatasets, resetDir, writeText } from './io.ts'
import { prepareAll } from './pipeline.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = join(root, 'tests', 'fixtures')

/** Armes nommées par la demande, par fichier. */
const NAMED_WEAPONS: Partial<Record<DatasetKey, readonly string[]>> = {
  melee_armaments: ['Moonveil', 'Blasphemous Blade', 'Club', 'Longsword', 'Dagger'],
  ranged_weapons_catalysts: ['Horn Bow'],
}

/** Boss nommés par la demande. */
const NAMED_BOSSES = [
  'Margit, the Fell Omen',
  'Godrick the Grafted',
  'Rykard, Lord of Blasphemy',
  'Godskin Duo',
  'Sir Gideon Ofnir, the All-Knowing',
  'Elden Beast',
  'Promised Consort Radahn',
]

const WEAPON_KEYS = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const

function pick<E extends { readonly name?: string }>(file: DatasetFile<E, unknown>, names: readonly string[]): E[] {
  return names.map((n) => {
    const found = file.entries.find((e) => e.name === n)
    if (found === undefined) throw new Error(`fixture : « ${n} » introuvable dans ${file.key}`)
    return found
  })
}

function main(): void {
  const prepared = prepareAll(readRawDatasets(join(root, 'data')))
  const chosen = new Map<DatasetKey, Set<string>>()
  const add = (key: DatasetKey, id: string): void => {
    const set = chosen.get(key) ?? new Set<string>()
    set.add(id)
    chosen.set(key, set)
  }
  for (const key of WEAPON_KEYS) for (const w of pick(prepared.datasets[key], NAMED_WEAPONS[key] ?? [])) add(key, w.id)

  // Une arme par famille d'amélioration (fiabilité × matériau), la première dans l'ordre du registre ;
  // plus un bouclier sans type d'amélioration et une arme dont le tableau contredit l'infobox.
  const families = new Set<string>()
  let shieldWithoutType = false
  let inconsistent = false
  for (const key of WEAPON_KEYS) {
    for (const w of prepared.datasets[key].entries as readonly WeaponEntry[]) {
      const family = `${w.derived.upgrade.reliability}|${w.derived.upgrade.material ?? ''}`
      if (!families.has(family)) {
        families.add(family)
        add(key, w.id)
      }
      if (key === 'shields_torches' && !shieldWithoutType && w.category !== 'Torches' && w.derived.upgrade.reliability === 'null') {
        shieldWithoutType = true
        add(key, w.id)
      }
      if (!inconsistent && w.derived.inconsistent.length > 0) {
        inconsistent = true
        add(key, w.id)
      }
    }
  }
  if (!shieldWithoutType) throw new Error('fixture : aucun bouclier sans type d’amélioration')
  for (const b of pick(prepared.datasets.bosses, NAMED_BOSSES)) add('bosses', b.id)
  for (const o of prepared.datasets.origins.entries) add('origins', o.id)

  resetDir(outDir)
  for (const key of DATASET_KEYS) {
    const ids = chosen.get(key)
    if (ids === undefined) continue
    const file = prepared.datasets[key] as DatasetFile<{ readonly id: string }, unknown>
    // Même forme que le fichier produit ; seules les entrées sont filtrées, dans leur ordre d'origine.
    const subset = { ...file, entries: file.entries.filter((e) => ids.has(e.id)) }
    writeText(outDir, `${key}.json`, `${JSON.stringify(subset, null, 2)}\n`)
    console.log(`  tests/fixtures/${key}.json  ${subset.entries.length} entrées`)
  }
  const tables: TablesFile = { schema: 1, key: 'tables', tables: prepared.tables }
  writeText(outDir, 'tables.json', `${JSON.stringify(tables, null, 2)}\n`)
  console.log('  tests/fixtures/tables.json  5 tables')
}

try {
  main()
} catch (e) {
  if (e instanceof DataCheckError) {
    console.error(e.message)
    process.exit(1)
  }
  throw e
}
