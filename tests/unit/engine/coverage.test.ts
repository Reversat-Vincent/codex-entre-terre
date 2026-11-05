// Tests de la couverture des données (calculs.md, « Couverture des données ») et du rendement des attributs (« Rendement des attributs »).
// La couverture du type d'amélioration change avec les compléments de données : les attendus sont recomptés depuis les données, pas codés.

import { describe, expect, it } from 'vitest'
import { attributeYield, softCaps } from '../../../src/engine/attributeYield.ts'
import { coverage } from '../../../src/engine/coverage.ts'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { attrs, tables } from './helpers.ts'
import { data, weaponData } from './prepared.ts'

describe('couverture', () => {
  const rows = coverage({ weapons: weaponData(), bosses: data().datasets.bosses.entries })

  it('lignes, totaux cohérents, décompte par source', () => {
    expect(rows.explanation.method).toBe('coverage')
    expect(rows.value!.map((r) => r.id)).toEqual([
      'coverage-upgrade-melee',
      'coverage-upgrade-ranged',
      'coverage-upgrade-shields',
      'coverage-timeline-hp',
      'coverage-timeline-runes',
      'coverage-timeline-negation',
      'coverage-encounters-hp',
      'coverage-encounters-negation',
    ])
    for (const r of rows.value!) {
      const c = r.counts
      expect(c.documented + c.deduced + c.estimated + c.undocumented).toBe(c.total)
      expect(Object.values(r.bySource).reduce((s, x) => s + (x?.total ?? 0), 0)).toBe(c.total)
    }
  })

  it('type d’amélioration : décompte de `derived.upgrade.reliability`', () => {
    const melee = rows.value![0]!
    const list = data().datasets.melee_armaments.entries
    const n = (r: WeaponEntry['derived']['upgrade']['reliability']) => list.filter((w) => w.derived.upgrade.reliability === r).length
    expect(melee.counts).toEqual({
      documented: n('wiki') + n('not-upgradeable'),
      deduced: n('deduced'),
      estimated: n('estimate'),
      undocumented: n('null'),
      total: list.length,
    })
  })

  it('frise : 21 rencontres ; PV absents pour Fia’s Champions (groupe) et Godskin Duo', () => {
    const hp = rows.value!.find((r) => r.id === 'coverage-timeline-hp')!
    expect(hp.counts.total).toBe(21)
    expect(hp.counts.undocumented).toBe(2)
    expect(hp.bySource['Shadow of the Erdtree']?.total).toBe(3)
  })

  it('une famille non chargée ne produit pas de ligne', () => {
    const only = coverage({ weapons: { shields_torches: weaponData().shields_torches }, bosses: null })
    expect(only.value!.map((r) => r.id)).toEqual(['coverage-upgrade-shields'])
  })
})

describe('rendement des attributs (D23)', () => {
  it('paliers déduits des tables : PV 40 et 60, FP 60, endurance 30 et 50, charge 25 et 60', () => {
    const t = tables()
    expect(softCaps(t.hpByVigor.rows).map((c) => c.points)).toEqual([40, 60])
    expect(softCaps(t.fpByMind.rows).map((c) => c.points)).toEqual([60])
    expect(softCaps(t.staminaByEndurance.rows).map((c) => c.points)).toEqual([30, 50])
    expect(softCaps(t.equipLoadByEndurance.rows).map((c) => c.points)).toEqual([25, 60])
  })

  it('valeur par niveau, gain du point suivant à la précision de la table, position du profil', () => {
    const y = attributeYield(attrs({ vig: 15, end: 25 }), tables())
    expect(y.explanation.method).toBe('attribute-yield')
    const [hp, , , load] = y.value!
    expect(hp?.points).toHaveLength(99)
    expect(hp?.position).toEqual({ points: 15, value: 522, nextGain: 25 })
    expect(hp?.points.at(-1)?.gain).toBeNull()
    expect(load?.position.value).toBe(72)
    expect(load?.points.every((p) => p.gain === null || p.gain === Math.round(p.gain * 10) / 10)).toBe(true)
    expect(load?.points[8]?.gain).toBe(1.6)
  })
})
