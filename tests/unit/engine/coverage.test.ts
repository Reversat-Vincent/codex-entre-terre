// Tests de la couverture des données (calculs.md, « Couverture des données ») et du rendement des attributs (« Rendement des attributs »).
// La couverture du type d'amélioration change avec les compléments de données : les attendus sont recomptés depuis les données, pas codés.

import { describe, expect, it } from 'vitest'
import { attributeYield, publishedSoftCaps, softCaps } from '../../../src/engine/attributeYield.ts'
import { PUBLISHED_SOFT_CAPS } from '../../../src/engine/config/softCaps.ts'
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
  it('contrôle : paliers déduits des tables (PV 40 et 60, FP 60, endurance 30 et 50, charge 25 et 60), tous publiés par le wiki', () => {
    const t = tables()
    const deduced = {
      hp: softCaps(t.hpByVigor.rows).map((c) => c.points),
      fp: softCaps(t.fpByMind.rows).map((c) => c.points),
      stamina: softCaps(t.staminaByEndurance.rows).map((c) => c.points),
      equipLoad: softCaps(t.equipLoadByEndurance.rows).map((c) => c.points),
    }
    expect(deduced).toEqual({ hp: [40, 60], fp: [60], stamina: [30, 50], equipLoad: [25, 60] })
    for (const [stat, points] of Object.entries(deduced)) {
      for (const p of points) expect(PUBLISHED_SOFT_CAPS[stat as keyof typeof PUBLISHED_SOFT_CAPS].points, stat).toContain(p)
    }
  })

  it('paliers affichés = paliers publiés par le wiki (D39, S5), avec les gains moyens lus dans les tables', () => {
    const y = attributeYield(attrs(), tables())
    expect(y.value!.map((c) => [c.stat, c.softCaps.map((s) => s.points)])).toEqual([
      ['hp', [40, 60]],
      ['fp', [50, 60]],
      ['stamina', [15, 30, 50]],
      ['equipLoad', [25, 60]],
    ])
    expect(y.explanation.limits).toContainEqual({ code: 'soft-caps-published' })
    expect(y.explanation.inputs).toContainEqual({
      file: 'config',
      entry: 'softCaps',
      field: 'PUBLISHED_SOFT_CAPS.fp',
      value: 'https://eldenring.wiki.gg/wiki/Mind',
      reliability: 'wiki',
    })
    // FP : gain moyen 6,4 avant 50 puis 5,6 après (verification-socle.md § 9).
    const fp50 = y.value![1]!.softCaps[0]!
    expect([fp50.gainBefore, fp50.gainAfter]).toEqual([6.4, 5.6])
    for (const c of y.value!) for (const s of c.softCaps) expect(s.gainBefore !== null && s.gainAfter !== null, `${c.stat} ${s.points}`).toBe(true)
  })

  it('gain non calculable hors de la table : null, jamais 0', () => {
    expect(publishedSoftCaps(tables().hpByVigor, [3, 97])).toEqual([
      { points: 3, gainBefore: null, gainAfter: expect.any(Number) },
      { points: 97, gainBefore: expect.any(Number), gainAfter: null },
    ])
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
