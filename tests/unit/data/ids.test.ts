// Tests d'identité sur les vraies données : unicité des id par genre, des rencontres par boss, noms affichés, contrôles bloquants.

import { describe, expect, it } from 'vitest'
import { DataCheckError } from '../../../scripts/data/checks.ts'
import { displayNames, encounterIds } from '../../../scripts/data/ids.ts'
import { prepareAll } from '../../../scripts/data/pipeline.ts'
import { DATASETS, DATASET_KEYS, ENTITY_KINDS, datasetsOfKind } from '../../../src/data/datasets.ts'
import type { BossFile } from '../../../src/data/types/bosses.ts'
import type { OriginFile } from '../../../src/data/types/origins.ts'
import { fixture, prepared, rawData } from './helpers.ts'

describe('identifiants des données préparées', () => {
  it('sont uniques par genre et non vides', () => {
    const p = prepared()
    for (const kind of ENTITY_KINDS) {
      const ids = datasetsOfKind(kind).flatMap((k) => p.datasets[k].entries.map((e) => e.id))
      expect(ids.every((id) => id !== '')).toBe(true)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('donnent des clés de rencontre uniques sur tout le fichier', () => {
    const bosses = prepared().datasets.bosses
    const keys = bosses.entries.flatMap((b) => [...b.derived.encounters.map((e) => e.key), ...(b.derived.pageKey ? [b.derived.pageKey] : [])])
    expect(new Set(keys).size).toBe(keys.length)
    expect(bosses.entries.filter((b) => b.derived.pageKey !== null)).toHaveLength(15)
  })

  it('identifient Sir Gideon Ofnir par sa rencontre (correctif C1)', () => {
    const gideon = fixture<BossFile>('bosses').entries.find((b) => b.id === 'sir-gideon-ofnir-the-all-knowing')
    expect(gideon?.derived.pageKey).toBeNull()
    expect(gideon?.derived.encounters[0]?.key).toBe('sir-gideon-ofnir-the-all-knowing/sir-gideon-ofnir-the-all-knowing')
    expect(gideon?.encounters[0]?.hp_values).toEqual([6226])
  })

  it('gardent le nombre d’entrées de data/, hors doublons de key_items', () => {
    const p = prepared()
    const raw = rawData()
    for (const key of DATASET_KEYS) {
      const expected = raw[key].entries.length - (key === 'key_items' ? 6 : 0)
      expect(p.datasets[key].entries).toHaveLength(expected)
      expect(p.datasets[key].kind).toBe(DATASETS[key].kind)
    }
  })
})

describe('encounterIds', () => {
  it('départage par variante, puis par lieu', () => {
    const r = encounterIds([
      { name: 'Erdtree Avatar', variant: 'A', location: 'Liurnia' },
      { name: 'Erdtree Avatar', variant: 'A', location: 'Caelid' },
      { name: 'Erdtree Avatar', variant: 'B', location: null },
      { name: 'Other', location: null },
    ])
    expect(r.ids).toEqual(['erdtree-avatar-a-liurnia', 'erdtree-avatar-a-caelid', 'erdtree-avatar-b', 'other'])
    expect(r.duplicates).toEqual([])
  })

  it('signale un doublon irréductible', () => {
    const r = encounterIds([
      { name: 'X', location: null },
      { name: 'X', location: null },
    ])
    expect(r.duplicates).toEqual(['x'])
  })
})

describe('displayNames', () => {
  it('prend wiki_page pour les noms partagés', () => {
    expect(
      displayNames([
        { name: 'Larval Tear', wiki_page: 'Larval Tear' },
        { name: 'Larval Tear', wiki_page: 'Larval Tear (SotE)' },
        { name: 'Moonveil', wiki_page: 'Moonveil' },
      ]),
    ).toEqual(['Larval Tear', 'Larval Tear (SotE)', 'Moonveil'])
  })
})

describe('contrôles bloquants', () => {
  it('vérifient Σ attributs − 79 = level pour les 12 origines', () => {
    const origins = fixture<OriginFile>('origins').entries
    expect(origins).toHaveLength(12)
    for (const o of origins) {
      const a = o.attributes
      expect(a.vigor + a.mind + a.endurance + a.strength + a.dexterity + a.intelligence + a.faith + a.arcane - 79).toBe(o.level)
    }
  })

  it('arrêtent la préparation sur un coefficient de scaling > 3', () => {
    const raw = rawData()
    const weapons = raw.ranged_weapons_catalysts.entries as { name: string; upgrade: { tables: Record<string, Record<string, { scaling: { int: { coef: number } } }>> } }[]
    const horn = weapons.find((w) => w.name === 'Horn Bow')
    const cell = horn?.upgrade.tables.Standard?.['+1']?.scaling.int
    if (cell === undefined) throw new Error('Horn Bow +1 introuvable')
    cell.coef = 104
    expect(() => prepareAll(raw)).toThrow(DataCheckError)
    expect(() => prepareAll(raw)).toThrow(/coef 104 > 3/)
  })

  it('arrêtent la préparation sur un champ non conforme au type', () => {
    const raw = rawData()
    const first = raw.origins.entries[0] as { level: unknown }
    first.level = '9'
    expect(() => prepareAll(raw)).toThrow(/origins\[0\]\.level : number attendu/)
  })
})
