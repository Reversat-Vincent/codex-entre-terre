// Présence dans les données de chaque référence de la configuration du moteur, partie 2 (docs/architecture.md § 3.5) :
// étapes, hiérarchie des régions, Remembrances, frise, niveau recommandé, archétypes, catégories candidates.

import { describe, expect, it } from 'vitest'
import { KNOWN_REGIONS } from '../../../scripts/data/knownRegions.ts'
import { buildRegionContext } from '../../../scripts/data/regions.ts'
import { rawData } from '../data/helpers.ts'
import type { LocationRaw } from '../../../src/data/types/locations.ts'
import type { NpcRaw } from '../../../src/data/types/npcs.ts'
import { ARCHETYPES, TARGET_FLOOR, TEMPLATE_LEVEL } from '../../../src/engine/config/archetypes.ts'
import { BOSS_LEVEL } from '../../../src/engine/config/bossLevel.ts'
import { REMEMBRANCES, REMEMBRANCE_ENCOUNTERS } from '../../../src/engine/config/remembrances.ts'
import { DLC_ZONE, REGION_PARENT, REGION_STAGE } from '../../../src/engine/config/stages.ts'
import { TIMELINE, timelineBossRefs } from '../../../src/engine/config/timeline.ts'
import { CATALYST_POWER_FIELD, SHIELD_CATEGORIES, STYLE_POOLS } from '../../../src/engine/config/weaponPools.ts'
import { DATASET_KEYS, DATASETS } from '../../../src/data/datasets.ts'
import { data, encounters } from './prepared.ts'

const refs = new Set(DATASET_KEYS.flatMap((k) => (data().datasets[k].entries as readonly { id: string }[]).map((e) => `${DATASETS[k].kind}:${e.id}`)))

describe('stages.ts', () => {
  it('REGION_STAGE couvre exactement les 79 régions relevées ; DLC_ZONE ne porte que sur des régions DLC', () => {
    expect(Object.keys(REGION_STAGE).sort()).toEqual([...KNOWN_REGIONS].sort())
    for (const [region, zone] of Object.entries(DLC_ZONE)) expect(REGION_STAGE[region], `${region} ${zone}`).toBe('dlc')
    for (const [region, stage] of Object.entries(REGION_STAGE)) if (stage === 'dlc') expect(DLC_ZONE[region], region).toBeDefined()
  })

  it('REGION_PARENT reproduit la hiérarchie de locations.json', () => {
    const raw = rawData()
    const ctx = buildRegionContext(raw.locations.entries as LocationRaw[], raw.npcs.entries as NpcRaw[], KNOWN_REGIONS)
    const expected: Record<string, string> = {}
    for (const k of KNOWN_REGIONS) {
      const p = ctx.parent.get(k)
      if (p !== undefined && KNOWN_REGIONS.includes(p)) expected[k] = p
    }
    expect(REGION_PARENT).toEqual(expected)
  })
})

describe('remembrances.ts', () => {
  it('52 objets, 25 Remembrances, toutes les références existent ; chaque rencontre donne sa Remembrance', () => {
    expect(Object.keys(REMEMBRANCES)).toHaveLength(52)
    expect(Object.keys(REMEMBRANCE_ENCOUNTERS)).toHaveLength(25)
    const tools = data().datasets.tools.entries
    for (const [item, link] of Object.entries(REMEMBRANCES)) {
      expect(refs.has(item), item).toBe(true)
      expect(refs.has(link.remembrance), link.remembrance).toBe(true)
      expect(refs.has(`boss:${link.boss}`), link.boss).toBe(true)
      const ref = encounters().byKey.get(link.encounter)
      const name = tools.find((t) => `item:${t.id}` === link.remembrance)?.name
      expect(ref?.encounter?.drops, link.encounter).toContain(name)
    }
  })
})

describe('timeline.ts et bossLevel.ts', () => {
  it('chaque rencontre de la frise existe', () => {
    for (const n of timelineBossRefs(TIMELINE)) {
      expect(refs.has(`boss:${n.boss}`), n.boss).toBe(true)
      for (const k of [...n.keys, n.levelKey]) expect(encounters().byKey.has(k), k).toBe(true)
    }
  })

  it('paliers et rencontres du niveau recommandé existent ; table de bénédiction présente', () => {
    for (const k of [...Object.keys(BOSS_LEVEL.encounterTier), ...BOSS_LEVEL.excludedRunes, ...BOSS_LEVEL.dlcEntryFrom]) {
      expect(encounters().byKey.has(k), k).toBe(true)
    }
    for (const region of Object.keys(BOSS_LEVEL.zoneTier)) expect(KNOWN_REGIONS, region).toContain(region)
    const mech = data().datasets.mechanics.entries.find((e) => e.id === BOSS_LEVEL.blessing.table.entry)
    expect(mech?.sections[BOSS_LEVEL.blessing.table.section]?.tables?.[0]).toBeDefined()
  })
})

describe('archetypes.ts et weaponPools.ts', () => {
  it('gabarits : somme = 150 + 79, au-dessus du plancher', () => {
    for (const a of Object.values(ARCHETYPES)) {
      expect(a.template.reduce((s, v) => s + v, 0), a.id).toBe(TEMPLATE_LEVEL + 79)
      a.template.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(TARGET_FLOOR[i]!))
    }
    expect(TARGET_FLOOR.reduce((s, v) => s + v, 0)).toBe(61)
  })

  it('catégories candidates existent dans leurs fichiers', () => {
    const ds = data().datasets
    for (const pool of Object.values(STYLE_POOLS)) {
      const cats = new Set(pool.files.flatMap((f) => ds[f].entries.map((w) => w.category)))
      for (const c of pool.categories ?? []) expect(cats.has(c), c).toBe(true)
    }
    const shields = new Set(ds.shields_torches.entries.map((w) => w.category))
    expect([...shields].sort()).toEqual([...SHIELD_CATEGORIES].sort())
    const ranged = ds.ranged_weapons_catalysts.entries
    for (const [cat, field] of Object.entries(CATALYST_POWER_FIELD)) expect(ranged.some((w) => w.category === cat && typeof w[field] === 'number'), cat).toBe(true)
  })
})
