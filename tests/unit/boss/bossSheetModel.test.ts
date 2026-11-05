// Modèle de la fiche boss : rencontres et onglets, PV et runes, statuts, butin, notes de combat, suggestions d'armes, échelle des barres d'absorption.

import { describe, expect, it } from 'vitest'
import { absorptionBars, absorptionScale } from '../../../src/components/domain/absorptionLayout.ts'
import {
  countModel,
  dealtChips,
  encounterModels,
  lootGroups,
  noteGroups,
  notesFor,
  pickEncounter,
  readWeaponSuggestions,
  resolveLootItem,
  statusRows,
  yesNo,
} from '../../../src/components/domain/boss/bossSheetModel.ts'
import { buildNameIndex } from '../../../src/data/links.ts'
import type { BossEntry, Encounter } from '../../../src/data/types/bosses.ts'

/** Rencontre minimale. */
function enc(partial: Partial<Encounter> & { name: string }): Encounter {
  return { location: null, regions: [], source: 'Base game', hp: null, hp_values: [], runes: null, runes_values: [], drops: [], ...partial } as Encounter
}

/** Page de boss minimale avec les rencontres données. */
function boss(id: string, encounters: Encounter[]): BossEntry {
  return {
    id,
    name: id,
    wiki_page: id,
    url: `https://eldenring.wiki.gg/wiki/${id}`,
    source: 'Base game',
    tier: [],
    flags: [],
    summary: '',
    encounters,
    derived: { encounters: encounters.map((_, i) => ({ id: `e${i + 1}`, key: `${id}/e${i + 1}` })), pageKey: encounters.length === 0 ? id : null },
  } as unknown as BossEntry
}

describe('rencontres et onglets', () => {
  const mohg = boss('mohg', [
    enc({ name: 'Mohg, the Omen', variant: 'Mohg, the Omen', location: 'Subterranean Shunning-Grounds', regions: ['Leyndell, Royal Capital'] }),
    enc({ name: 'Mohg, Lord of Blood – Phase 1', variant: 'Mohg, Lord of Blood', location: 'Mohgwyn Palace', regions: ['Siofra River'] }),
  ])

  it('une rencontre par entrée, avec sa clé et son complément', () => {
    const models = encounterModels(mohg)
    expect(models.map((m) => m.key)).toEqual(['mohg/e1', 'mohg/e2'])
    expect(models[1]?.note).toBe('Mohg, Lord of Blood')
  })

  it('distingue deux rencontres d’un même lieu par la suite du nom', () => {
    const radahn = boss('pcr', [
      enc({ name: 'Promised Consort Radahn', location: 'Enir-Ilim', regions: ['Land of the Tower'] }),
      enc({ name: 'Promised Consort Radahn – Radahn, Consort of Miquella', location: 'Enir-Ilim', regions: ['Land of the Tower'] }),
    ])
    expect(encounterModels(radahn).map((m) => m.note)).toEqual(['Land of the Tower', 'Radahn, Consort of Miquella'])
  })

  it('une page sans rencontre donne une rencontre sans données, clé de page', () => {
    const models = encounterModels(boss('duo', []))
    expect(models).toHaveLength(1)
    expect(models[0]).toMatchObject({ key: 'duo', encounter: null })
  })

  it('?rencontre= : l’identifiant demandé, sinon la première', () => {
    const models = encounterModels(mohg)
    expect(pickEncounter(models, 'e2')?.key).toBe('mohg/e2')
    expect(pickEncounter(models, ['e2'])?.key).toBe('mohg/e2')
    expect(pickEncounter(models, 'inconnue')?.key).toBe('mohg/e1')
    expect(pickEncounter(models, undefined)?.key).toBe('mohg/e1')
    expect(pickEncounter([], 'e1')).toBeNull()
  })
})

describe('PV et runes', () => {
  it('« null » du wiki : aucune valeur', () => {
    expect(countModel(null, [])).toEqual({ values: [], note: null, raw: null })
  })
  it('un nombre simple n’ajoute pas de note', () => {
    expect(countModel('14,000', [14000]).note).toBeNull()
  })
  it('plusieurs lieux ou un qualificatif gardent le texte nettoyé', () => {
    expect(countModel('Limgrave: *4174 Capital Outskirts: *8193', [4174, 8193]).note).toBe('Limgrave: 4174 Capital Outskirts: 8193')
    expect(countModel('46,134 (until 65%)', [46134]).note).toBe('46,134 (until 65%)')
  })
})

describe('statuts', () => {
  it('Immune, nombres, textes bruts et champ absent', () => {
    const rows = statusRows({ status_resistance: { poison: 252, blood_loss: '734 / 1024', sleep: 'Immune', madness: 'no' } })
    expect(rows?.find((r) => r.key === 'poison')).toMatchObject({ kind: 'value', number: 252 })
    expect(rows?.find((r) => r.key === 'blood_loss')).toMatchObject({ kind: 'value', text: '734 / 1024', number: null })
    expect(rows?.find((r) => r.key === 'sleep')?.kind).toBe('immune')
    expect(rows?.find((r) => r.key === 'madness')).toMatchObject({ kind: 'value', text: 'no' })
    expect(rows?.find((r) => r.key === 'frostbite')?.kind).toBe('missing')
  })
  it('sans résistances documentées : null, jamais des zéros', () => {
    expect(statusRows({})).toBeNull()
    expect(statusRows(null)).toBeNull()
  })
})

describe('parade, critique, dégâts infligés', () => {
  it('Oui, Non, ou non documenté', () => {
    expect([yesNo(true), yesNo(false), yesNo(undefined)]).toEqual(['Oui', 'Non', null])
  })
  it('type de dégâts, statut ou texte', () => {
    expect(dealtChips(['slash', 'bleed', 'Nécrose'])).toEqual([
      { kind: 'damage', key: 'slash' },
      { kind: 'status', key: 'blood_loss' },
      { kind: 'text', text: 'Nécrose' },
    ])
  })
})

describe('butin', () => {
  it('groupe par titre de lieu', () => {
    expect(lootGroups(['Limgrave:', 'Talisman Pouch', 'Capital Outskirts:', 'Viridian Amber Medallion +1'])).toEqual([
      { title: 'Limgrave', items: ['Talisman Pouch'] },
      { title: 'Capital Outskirts', items: ['Viridian Amber Medallion +1'] },
    ])
    expect(lootGroups(['A', 'B'])).toEqual([{ title: null, items: ['A', 'B'] }])
    expect(lootGroups([])).toEqual([])
  })

  const names = buildNameIndex([
    { ref: 'item:talisman-pouch', group: 'item', name: 'Talisman Pouch', norm: 'talisman pouch', source: 'Base game', ctx: [] },
    { ref: 'ash:black-flame-tornado', group: 'ash', name: 'Black Flame Tornado', norm: 'black flame tornado', source: 'Base game', ctx: [] },
    { ref: 'talisman:viridian-amber-medallion', group: 'talisman', name: 'Viridian Amber Medallion', norm: 'viridian amber medallion', source: 'Base game', ctx: [] },
  ])

  it('lien seulement si le nom se résout (avec les deux écritures de repli)', () => {
    expect(resolveLootItem('Talisman Pouch', names).ref).toBe('item:talisman-pouch')
    expect(resolveLootItem('Ash of War: Black Flame Tornado', names).ref).toBe('ash:black-flame-tornado')
    expect(resolveLootItem('Viridian Amber Medallion +1', names).ref).toBe('talisman:viridian-amber-medallion')
    expect(resolveLootItem('Objet inconnu', names).ref).toBeNull()
    expect(resolveLootItem('Talisman Pouch', null).ref).toBeNull()
  })
})

describe('notes de combat', () => {
  const groups = noteGroups(['Général.', 'Mohg, the Omen=', 'Notes Omen.', 'Mohg, Lord of Blood=', 'Notes Lord.'])
  it('coupe aux titres « = »', () => {
    expect(groups.map((g) => g.title)).toEqual([null, 'Mohg, the Omen', 'Mohg, Lord of Blood'])
  })
  it('garde le groupe de la rencontre affichée, sinon tout', () => {
    const lord = notesFor(groups, { name: 'Mohg, Lord of Blood – Phase 1', variant: 'Mohg, Lord of Blood', location: 'Mohgwyn Palace' })
    expect(lord.map((g) => g.title)).toEqual([null, 'Mohg, Lord of Blood'])
    expect(notesFor(groups, { name: 'Autre', location: null })).toHaveLength(3)
  })
})

describe('suggestions d’armes', () => {
  const item = { ref: 'weapon:uchigatana', name: 'Uchigatana', damage: 'slash', attack: 120, requirements: [] }
  it('getter absent : indisponible', () => {
    expect(readWeaponSuggestions(undefined, 'a/b')).toEqual({ available: false, items: [] })
  })
  it('liste ou Calc ; les entrées incomplètes sont écartées', () => {
    expect(readWeaponSuggestions(() => [item, { name: 'sans ref' }], 'a/b')).toEqual({ available: true, items: [item] })
    expect(readWeaponSuggestions(() => ({ value: [item] }), 'a/b').items).toHaveLength(1)
    expect(readWeaponSuggestions(() => null, 'a/b').available).toBe(false)
  })
})

describe('barres d’absorption', () => {
  it('échelle de −20 à 80, élargie par les valeurs extrêmes', () => {
    const base = absorptionScale([0, 10])
    expect([base.min, base.max]).toEqual([-20, 80])
    expect(base.zero).toBeCloseTo(20)
    const wide = absorptionScale([-100, 80])
    expect(wide.min).toBe(-100)
    expect(wide.ticks.every((t) => t.value % 40 === 0)).toBe(true)
  })
  it('barre à gauche du zéro pour une faiblesse, à droite pour une résistance, aucune pour null', () => {
    const scale = absorptionScale([-10, 40])
    const bars = absorptionBars({ slash: -10, holy: 40, fire: null }, scale)
    const slash = bars.find((b) => b.key === 'slash')
    const holy = bars.find((b) => b.key === 'holy')
    expect(slash?.weak).toBe(true)
    expect((slash?.left ?? 0) + (slash?.width ?? 0)).toBeCloseTo(scale.zero)
    expect(holy?.weak).toBe(false)
    expect(holy?.left).toBeCloseTo(scale.zero)
    expect(bars.find((b) => b.key === 'fire')).toMatchObject({ value: null, band: 'null', width: 0 })
  })
})
