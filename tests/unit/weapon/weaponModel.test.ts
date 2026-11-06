// Tests du modèle de la fiche d'arme : mode et séries du graphique, bascule des emplacements d'affinité, niveau maximal du curseur, tableau partiel,
// alertes de qualité, tri des armes voisines. Les armes sont de petits objets de test : seuls les champs lus par chaque fonction sont renseignés.
import { describe, expect, it } from 'vitest'
import {
  MAX_AFFINITY_SERIES,
  affinityChart,
  bySimilarOrder,
  damageChart,
  defaultSlots,
  describeUpgradeTables,
  findWeapon,
  partialTable,
  sliderMax,
  toggleSlot,
  weaponAlerts,
} from '../../../src/components/domain/weapon/weaponModel.ts'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'

/** Arme de test : infobox à +0, tableaux d'amélioration et incohérences à la demande. */
function weapon(options: {
  tables?: Record<string, Record<string, unknown>>
  physical?: number
  fire?: number
  maxLevel?: number | null
  inconsistent?: object[]
  reliability?: string
  confidence?: string
}): WeaponEntry {
  return {
    id: 'test',
    attack_power: { physical: options.physical ?? 100, magic: 0, fire: options.fire ?? 0, lightning: 0, holy: 0 },
    upgrade: { tables: options.tables },
    derived: {
      inconsistent: options.inconsistent ?? [],
      upgrade: { maxLevel: options.maxLevel ?? null, reliability: options.reliability ?? 'wiki', confidence: options.confidence },
      methods: [],
      regions: { acquisitions: [] },
    },
    acquisition: [{ method: 'Loot', location: 'x', region: null, details: ['d'] }],
    guarded_damage_negation: {},
  } as unknown as WeaponEntry
}

/** Niveau d'un tableau : seuls les types de dégâts donnés. */
const level = (attack: Record<string, number | string>): Record<string, unknown> => ({ attack })

const standard = { '+0': level({ physical: 100 }), '+5': level({ physical: 150 }), '+10': level({ physical: 200 }) }
const keen = { '+0': level({ physical: 90 }), '+5': level({ physical: 130 }), '+10': level({ physical: 170 }), growth_per_level: { atk: '+5%' } }
const cold = { '+0': level({ physical: 80, magic: 40 }), '+10': level({ physical: 150, magic: 80 }) }

describe('describeUpgradeTables', () => {
  it('sans tableau : pas de graphique, plus haut niveau 0', () => {
    expect(describeUpgradeTables(weapon({}))).toMatchObject({ mode: 'none', affinities: [], single: null, highestDocumented: 0 })
  })
  it('une seule affinité : une courbe par type de dégâts', () => {
    expect(describeUpgradeTables(weapon({ tables: { Standard: standard } }))).toMatchObject({ mode: 'damage', single: 'Standard', highestDocumented: 10 })
  })
  it('plusieurs affinités : une courbe par affinité, `growth_per_level` n’est pas un niveau', () => {
    const t = describeUpgradeTables(weapon({ tables: { Standard: standard, Keen: keen } }))
    expect(t).toMatchObject({ mode: 'affinity', single: null, highestDocumented: 10 })
    expect(t.affinities).toEqual(['Standard', 'Keen'])
  })
  it('signale un tableau incohérent avec l’infobox', () => {
    expect(describeUpgradeTables(weapon({ tables: { Standard: standard }, inconsistent: [{ field: 'upgrade.tables' }] })).inconsistent).toBe(true)
    expect(describeUpgradeTables(weapon({ tables: { Standard: standard }, inconsistent: [{ field: 'upgrade.material' }] })).inconsistent).toBe(false)
  })
})

describe('sliderMax', () => {
  it('est 0 sans tableau, quel que soit le niveau maximal de l’arme', () => {
    const w = weapon({ maxLevel: 25 })
    expect(sliderMax(w, describeUpgradeTables(w))).toBe(0)
  })
  it('prend le plus haut entre le niveau maximal et le plus haut niveau documenté', () => {
    const a = weapon({ tables: { Standard: standard }, maxLevel: 25 })
    expect(sliderMax(a, describeUpgradeTables(a))).toBe(25)
    const b = weapon({ tables: { Standard: standard }, maxLevel: 5 })
    expect(sliderMax(b, describeUpgradeTables(b))).toBe(10)
    const c = weapon({ tables: { Standard: standard }, maxLevel: null })
    expect(sliderMax(c, describeUpgradeTables(c))).toBe(10)
  })
})

describe('defaultSlots', () => {
  it('range Standard, Keen, Cold, Blood d’abord, puis le reste du tableau, sur quatre emplacements', () => {
    expect(defaultSlots(['Heavy', 'Blood', 'Standard', 'Fire', 'Keen', 'Cold'])).toEqual(['Standard', 'Keen', 'Cold', 'Blood'])
  })
  it('complète par l’ordre du wiki quand les affinités préférées manquent', () => {
    expect(defaultSlots(['Heavy', 'Fire', 'Standard'])).toEqual(['Standard', 'Heavy', 'Fire', null])
  })
  it('laisse des emplacements vides pour une arme à une affinité', () => {
    expect(defaultSlots(['Standard'])).toEqual(['Standard', null, null, null])
    expect(defaultSlots([])).toHaveLength(MAX_AFFINITY_SERIES)
  })
})

describe('toggleSlot', () => {
  it('retire une affinité affichée sans déplacer les autres : les couleurs restent attachées aux emplacements', () => {
    expect(toggleSlot(['Standard', 'Keen', 'Cold', 'Blood'], 'Keen')).toEqual(['Standard', null, 'Cold', 'Blood'])
  })
  it('ajoute au premier emplacement libre, donc à la couleur laissée vacante', () => {
    expect(toggleSlot(['Standard', null, 'Cold', null], 'Heavy')).toEqual(['Standard', 'Heavy', 'Cold', null])
  })
  it('refuse de retirer la dernière affinité affichée', () => {
    const only = ['Standard', null, null, null]
    expect(toggleSlot(only, 'Standard')).toEqual(only)
  })
  it('refuse un cinquième emplacement', () => {
    const full = ['Standard', 'Keen', 'Cold', 'Blood']
    expect(toggleSlot(full, 'Heavy')).toEqual(full)
  })
  it('ne modifie pas la liste reçue', () => {
    const before = ['Standard', 'Keen', null, null]
    toggleSlot(before, 'Keen')
    expect(before).toEqual(['Standard', 'Keen', null, null])
  })
})

describe('affinityChart', () => {
  const w = weapon({ tables: { Standard: standard, Keen: keen, Cold: cold } })

  it('trace une série par emplacement occupé, avec la couleur de l’emplacement', () => {
    const chart = affinityChart(w, ['Standard', null, 'Cold', 'Keen'])
    expect(chart.series.map((s) => [s.id, s.color])).toEqual([['Standard', 1], ['Cold', 3], ['Keen', 4]])
  })
  it('prend les abscisses dans l’union des niveaux documentés, du plus bas au plus haut', () => {
    expect(affinityChart(w, ['Standard', 'Cold', null, null]).x).toEqual([0, 5, 10])
  })
  it('additionne les types de dégâts documentés ; un niveau absent d’une affinité vaut null, jamais 0', () => {
    const chart = affinityChart(w, ['Standard', 'Cold', null, null])
    expect(chart.series.find((s) => s.id === 'Standard')?.values).toEqual([100, 150, 200])
    // Cold n'a pas de niveau +5 ; ses totaux comptent le physique et la magie.
    expect(chart.series.find((s) => s.id === 'Cold')?.values).toEqual([120, null, 230])
  })
  it('ignore un emplacement dont l’affinité n’est pas documentée', () => {
    expect(affinityChart(w, ['Standard', 'Inconnue', null, null]).series.map((s) => s.id)).toEqual(['Standard'])
  })
  it('rend un total null pour une valeur illisible du wiki', () => {
    const odd = weapon({ tables: { Standard: { '+0': level({ physical: 100 }), '+1': level({ physical: '56/56' }), '+2': level({ physical: 120 }) } } })
    expect(affinityChart(odd, ['Standard', null, null, null]).series[0]?.values).toEqual([100, null, 120])
  })
  it('rend un total null quand un type de l’infobox manque dans le tableau Standard', () => {
    // L'infobox donne du feu (30) que le tableau ne documente à aucun niveau : le total serait faux.
    const missing = weapon({ fire: 30, tables: { Standard: standard, Keen: keen } })
    const chart = affinityChart(missing, ['Standard', 'Keen', null, null])
    expect(chart.series.find((s) => s.id === 'Standard')?.values).toEqual([null, null, null])
    // Seule l'affinité Standard est comparable à l'infobox.
    expect(chart.series.find((s) => s.id === 'Keen')?.values).toEqual([90, 130, 170])
  })
  it('sans tableau, rend un graphique vide', () => {
    expect(affinityChart(weapon({}), ['Standard', null, null, null])).toEqual({ x: [], series: [] })
  })
})

describe('damageChart', () => {
  it('trace un type de dégâts par série, seulement ceux qui ont des dégâts', () => {
    const w = weapon({ tables: { Standard: { '+0': level({ physical: 100, magic: 40, fire: 0 }), '+5': level({ physical: 150, magic: 70, fire: 0 }) } } })
    const chart = damageChart(w, 'Standard')
    expect(chart.x).toEqual([0, 5])
    expect(chart.series.map((s) => [s.id, s.values])).toEqual([['physical', [100, 150]], ['magic', [40, 70]]])
    expect(chart.series.map((s) => s.color)).toEqual([1, 2])
  })
  it('un type absent d’un niveau ou illisible vaut null', () => {
    const w = weapon({ tables: { Standard: { '+0': level({ physical: 100, magic: 40 }), '+5': level({ physical: '9/9' }) } } })
    const chart = damageChart(w, 'Standard')
    expect(chart.series.find((s) => s.id === 'physical')?.values).toEqual([100, null])
    expect(chart.series.find((s) => s.id === 'magic')?.values).toEqual([40, null])
  })
  it('rend un graphique vide pour une affinité inconnue', () => {
    expect(damageChart(weapon({ tables: { Standard: standard } }), 'Keen')).toEqual({ x: [], series: [] })
  })
})

describe('partialTable', () => {
  it('une ligne par affinité, une colonne par niveau documenté, « dont » pour les types non physiques', () => {
    const { levels, rows } = partialTable(weapon({ tables: { Standard: standard, Cold: cold } }))
    expect(levels).toEqual([0, 5, 10])
    expect(rows.map((r) => r.affinity)).toEqual(['Standard', 'Cold'])
    const coldRow = rows[1]!
    expect(coldRow.cells.map((c) => c.total)).toEqual([120, null, 230])
    expect(coldRow.cells[0]?.split).toBe('dont Magie 40')
    expect(rows[0]?.cells[0]?.split).toBeNull()
  })
})

describe('weaponAlerts', () => {
  it('ne signale rien pour une arme complète et cohérente', () => {
    const w = weapon({ tables: { Standard: standard } })
    expect(weaponAlerts(w, describeUpgradeTables(w))).toEqual([])
  })
  it('dit l’absence de tableau, sauf pour une arme non améliorable', () => {
    const none = weapon({})
    expect(weaponAlerts(none, describeUpgradeTables(none)).map((a) => a.id)).toContain('tables-none')
    const fixed = weapon({ reliability: 'not-upgradeable' })
    expect(weaponAlerts(fixed, describeUpgradeTables(fixed)).map((a) => a.id)).toEqual(['not-upgradeable'])
  })
  it('signale une estimation avec sa confiance et un tableau incohérent', () => {
    const w = weapon({ tables: { Standard: standard }, reliability: 'estimate', confidence: 'medium', inconsistent: [{ field: 'upgrade.tables' }] })
    const alerts = weaponAlerts(w, describeUpgradeTables(w))
    expect(alerts.find((a) => a.id === 'upgrade-estimate')?.title).toContain('moyenne')
    expect(alerts.find((a) => a.id === 'tables-inconsistent')?.tone).toBe('warn')
  })
})

describe('findWeapon et bySimilarOrder', () => {
  it('cherche l’arme dans les fichiers chargés, dans l’ordre mêlée, distance, boucliers', () => {
    const a = weapon({})
    const entries = (key: string): readonly WeaponEntry[] | null => (key === 'shields_torches' ? [a] : key === 'melee_armaments' ? [] : null)
    expect(findWeapon(entries, 'test')).toEqual({ weapon: a, file: 'shields_torches' })
    expect(findWeapon(entries, 'autre')).toBeNull()
  })
  it('classe les armes évaluées par score décroissant, puis « Non classé », puis les autres par nom', () => {
    const list = [
      { name: 'Zweihander', score: undefined },
      { name: 'Banished', score: null },
      { name: 'Uchigatana', score: 40 },
      { name: 'Moonveil', score: 80 },
      { name: 'Alabaster', score: undefined },
    ]
    expect(list.sort(bySimilarOrder).map((w) => w.name)).toEqual(['Moonveil', 'Uchigatana', 'Banished', 'Alabaster', 'Zweihander'])
  })
})
