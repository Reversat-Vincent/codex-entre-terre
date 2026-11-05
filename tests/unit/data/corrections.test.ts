// Tests des correctifs D29 et D34 appliqués à data/ : matériau d'amélioration, incohérence de Carian Sorcery Sword, rang des envahisseurs ajoutés,
// affinités des armes Somber, absence de restes d'images, et contrôle bloquant de material_inconsistencies_flagged.

import { describe, expect, it } from 'vitest'
import { DataCheckError } from '../../../scripts/data/checks.ts'
import { prepareAll } from '../../../scripts/data/pipeline.ts'
import { deriveInconsistent } from '../../../scripts/data/upgrade.ts'
import type { WeaponRaw } from '../../../src/data/types/weapon.ts'
import { prepared, rawData } from './helpers.ts'

const WEAPON_KEYS = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const

function allWeapons() {
  const p = prepared()
  return WEAPON_KEYS.flatMap((k) => p.datasets[k].entries)
}

describe('fiabilité du type d’amélioration après D29', () => {
  it('documente presque toutes les armes', () => {
    const count: Record<string, number> = {}
    for (const w of allWeapons()) count[w.derived.upgrade.reliability] = (count[w.derived.upgrade.reliability] ?? 0) + 1
    expect(count).toEqual({ wiki: 429, deduced: 51, estimate: 4, null: 2, 'not-upgradeable': 1 })
  })

  it('met à jour upgrade_path_documentation avec les comptes réels', () => {
    const p = prepared()
    for (const k of WEAPON_KEYS) {
      const entries = p.datasets[k].entries
      const doc = p.datasets[k].meta.upgrade_path_documentation
      expect(doc.documented_by_wiki).toBe(entries.filter((w) => w.upgrade.material !== null).length)
      expect(doc.undocumented).toBe(entries.filter((w) => w.upgrade.material === null).length)
    }
  })

  it('ne laisse aucune arme Somber avec affinity_changeable à null, et en donne la provenance (D34)', () => {
    for (const w of allWeapons()) {
      if (w.upgrade.material !== 'Somber Smithing Stones') continue
      expect(w.upgrade.affinity_changeable, w.name).toBe(false)
      expect(w.upgrade.changeability_info_source, w.name).not.toBeNull()
    }
    const deduced = allWeapons().filter((w) => (w.upgrade.changeability_info_source ?? '').includes('deduced (affinity_changeable'))
    expect(deduced).toHaveLength(95)
  })
})

describe('Carian Sorcery Sword (D34)', () => {
  it('garde le matériau de la liste et remonte l’incohérence dans derived.inconsistent', () => {
    const carian = prepared().datasets.melee_armaments.entries.find((w) => w.id === 'carian-sorcery-sword')
    expect(carian?.upgrade.material).toBe('Somber Smithing Stones')
    expect(carian?.derived.inconsistent).toEqual([
      expect.objectContaining({ field: 'upgrade.material', reference: 'list', url: 'https://eldenring.wiki.gg/wiki/Carian_Sorcery_Sword' }),
    ])
    expect(carian?.derived.inconsistent[0]?.reason).toContain('+25')
  })

  it('ne touche pas wiki_inconsistencies_flagged, réservée aux tableaux contre infobox', () => {
    const meta = prepared().datasets.melee_armaments.meta
    expect(meta.wiki_inconsistencies_flagged).not.toContain('Carian Sorcery Sword')
    expect(meta.material_inconsistencies_flagged.map((f) => f.name)).toEqual(['Carian Sorcery Sword'])
    expect(prepared().datasets.shields_torches.meta.material_inconsistencies_flagged).toEqual([])
  })

  it('combine tableau et matériau dans deriveInconsistent', () => {
    const weapon = { name: 'X', upgrade: { tables_consistent_with_infobox: false } } as unknown as WeaponRaw
    const flags = [{ name: 'X', reason: 'r', url: 'https://eldenring.wiki.gg/wiki/X' }]
    expect(deriveInconsistent(weapon, flags).map((i) => i.field)).toEqual(['upgrade.tables', 'upgrade.material'])
    expect(deriveInconsistent(weapon)).toEqual([{ field: 'upgrade.tables', reference: 'infobox' }])
  })

  it('arrête la préparation si une arme signalée n’existe pas', () => {
    const raw = rawData()
    const meta = raw.melee_armaments.metadata as Record<string, unknown>
    const flagged = [{ name: 'Épée imaginaire', reason: 'r', url: 'https://eldenring.wiki.gg/wiki/X' }]
    const broken = { ...raw, melee_armaments: { ...raw.melee_armaments, metadata: { ...meta, material_inconsistencies_flagged: flagged } } }
    expect(() => prepareAll(broken)).toThrow(DataCheckError)
  })
})

describe('combats ajoutés par D29', () => {
  it('donne le rang des envahisseurs aux 5 pages ajoutées (D34)', () => {
    const bosses = prepared().datasets.bosses
    for (const id of ['anastasia-tarnished-eater', 'mad-tongue-alberich', 'moongrum-carian-knight', 'maleigh-marais-shaded-castle-castellan', 'millicents-sisters']) {
      expect(bosses.entries.find((b) => b.id === id)?.tier, id).toEqual(['Invaders and other minibosses'])
    }
    expect(bosses.meta.counts_by_tier['Invaders and other minibosses']).toBe(19)
    expect(bosses.entries.filter((b) => b.tier.includes('Invaders and other minibosses'))).toHaveLength(19)
    expect(bosses.meta.field_notes['tier']).toContain('deduced from the page itself')
  })

  it('compte 138 pages et 314 combats, comme les métadonnées', () => {
    const b = prepared().datasets.bosses
    expect(b.entries).toHaveLength(138)
    expect(b.entries.reduce((s, e) => s + e.encounters.length, 0)).toBe(314)
    expect(b.meta.boss_pages).toBe(138)
    expect(b.meta.encounters).toBe(314)
  })

  it('porte les trois pages au lien corrigé', () => {
    const ids = new Set(prepared().datasets.bosses.entries.map((b) => b.id))
    for (const id of ['perfumer', 'madding-hand-npc', 'jolan-swordhand-of-night']) expect(ids.has(id), id).toBe(true)
  })
})

describe('restes d’images', () => {
  it('ne laissent aucun nom de fichier image dans data/', () => {
    expect(prepared().report.markupResidues).toEqual({})
    expect(JSON.stringify(rawData())).not.toMatch(/\.(png|jpe?g|gif|webp|svg)\b/i)
  })
})
