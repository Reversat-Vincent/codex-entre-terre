// Tests de derived.regions (décision D10, decisions-progression.md § 1.4) sur les vraies données de lieux et de PNJ.

import { describe, expect, it } from 'vitest'
import { KNOWN_REGIONS } from '../../../scripts/data/knownRegions.ts'
import { buildRegionContext, removeParents, resolvePart } from '../../../scripts/data/regions.ts'
import type { RegionNotes } from '../../../scripts/data/regions.ts'
import type { LocationRaw } from '../../../src/data/types/locations.ts'
import type { NpcRaw } from '../../../src/data/types/npcs.ts'
import type { WeaponFile } from '../../../src/data/types/weapon.ts'
import { fixture, rawData } from './helpers.ts'

const raw = rawData()
const ctx = buildRegionContext(raw.locations.entries as LocationRaw[], raw.npcs.entries as NpcRaw[], KNOWN_REGIONS)
const notes = (): RegionNotes => ({ unresolved: [], prefix: [], residues: [] })
const values = (parts: string[]): string[] =>
  removeParents(ctx, parts.flatMap((p) => resolvePart(ctx, p, 'location', notes()))).values.map((v) => v.value)

describe('résolution des régions', () => {
  it('compte 79 valeurs connues', () => {
    expect(KNOWN_REGIONS).toHaveLength(79)
  })

  it('retire la région parente quand une valeur plus précise existe', () => {
    expect(values(['Mt. Gelmir', 'Volcano Manor'])).toEqual(['Volcano Manor'])
    expect(values(['Altus Plateau', 'Mt. Gelmir'])).toEqual(['Mt. Gelmir'])
    expect(values(['Limgrave', 'Stormveil Castle'])).toEqual(['Stormveil Castle'])
  })

  it('applique les règles suffixe, préfixe, lieu et PNJ', () => {
    expect(values(['Wyndham Catacombs (Mt. Gelmir)'])).toEqual(['Mt. Gelmir'])
    expect(values(['Volcano Manor (Mt. Gelmir)'])).toEqual(['Volcano Manor'])
    expect(values(['Gael Tunnel'])).toEqual(['Caelid'])
    expect(values(['Twin Maiden Husks'])).toEqual(['Roundtable Hold'])
  })

  it('rattache les restes d’extraction au lieu cité et les signale', () => {
    const r = resolvePart(ctx, 'through Rauh Base', 'region', notes())
    expect(r).toEqual([{ value: 'Rauh Base', from: 'region', raw: 'through Rauh Base', rule: 'known', residue: true, known: true }])
  })

  it('laisse non résolu un texte inconnu', () => {
    const n = notes()
    expect(resolvePart(ctx, 'Lands Between', 'location', n)).toEqual([])
    expect(n.unresolved).toEqual(['Lands Between'])
  })
})

describe('derived.regions des fixtures', () => {
  const melee = fixture<WeaponFile>('melee_armaments').entries
  const byName = (n: string) => melee.find((w) => w.name === n)

  it('donne les régions attendues', () => {
    expect(byName('Moonveil')?.derived.regions.values).toEqual(['Caelid'])
    expect(byName('Dagger')?.derived.regions.values).toEqual(['Roundtable Hold', 'Realm of Shadow'])
    expect(byName('Longsword')?.derived.regions).toMatchObject({ basis: 'regions_mentioned', values: ['Roundtable Hold'] })
  })

  it('ignore les équipements de départ', () => {
    const club = byName('Club')
    expect(club?.derived.methods[0]).toBe('starting')
    expect(club?.derived.regions.acquisitions[0]).toMatchObject({ starting: true, values: [] })
  })
})
