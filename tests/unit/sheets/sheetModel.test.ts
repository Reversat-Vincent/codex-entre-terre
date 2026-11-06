// Modèle des fiches communes : notation de coût « X (Y) », paragraphes de description, vendeurs, sections annexes, alertes, absorption d'armure,
// prérequis de sort comparés au profil et coût d'une cendre de guerre.

import { describe, expect, it } from 'vitest'
import { negationRows, negationScale, resistanceRows } from '../../../src/components/domain/sheet/armor/armorModel.ts'
import { ashCostHint } from '../../../src/components/domain/sheet/ash/ashModel.ts'
import {
  descriptionParagraphs,
  missingFieldsAlert,
  otherSectionViews,
  parseCastCost,
  splitNames,
} from '../../../src/components/domain/sheet/sheetModel.ts'
import { spellRequirementRows } from '../../../src/components/domain/sheet/spell/spellModel.ts'
import { checkSpellRequirements } from '../../../src/engine/requirements.ts'
import type { Attributes } from '../../../src/engine/types.ts'

const attrs: Attributes = { vig: 10, mnd: 10, end: 10, str: 10, dex: 10, int: 20, fai: 10, arc: 10 }

describe('parseCastCost', () => {
  it('lit un nombre, un nombre en texte et la notation X (Y)', () => {
    expect(parseCastCost(14)).toEqual({ kind: 'plain', cast: 14, raw: '14' })
    expect(parseCastCost('26')).toMatchObject({ kind: 'plain', cast: 26 })
    expect(parseCastCost('22 (4)')).toEqual({ kind: 'channel', cast: 22, tick: 4, raw: '22 (4)' })
    expect(parseCastCost('34 (0)')).toMatchObject({ kind: 'channel', cast: 34, tick: 0 })
  })
  it('garde une notation inconnue telle quelle et signale l\'absence', () => {
    expect(parseCastCost('6+12')).toEqual({ kind: 'text', raw: '6+12' })
    expect(parseCastCost(undefined)).toEqual({ kind: 'none' })
    expect(parseCastCost(null)).toEqual({ kind: 'none' })
  })
})

describe('textes', () => {
  it('découpe une description en paragraphes et joint les retours de mise en page', () => {
    expect(descriptionParagraphs('Use to\nsummon four.\n\nSecond  one.')).toEqual(['Use to summon four.', 'Second  one.'])
    expect(descriptionParagraphs(null)).toEqual([])
  })
  it('ne coupe pas un nom à virgule dans une liste de vendeurs', () => {
    expect(splitNames('Brother Corhyn / Miriel, Pastor of Vows')).toEqual(['Brother Corhyn', 'Miriel, Pastor of Vows'])
    expect(splitNames('Brother Corhyn or Miriel')).toEqual(['Brother Corhyn', 'Miriel'])
  })
  it('écarte la section annexe qui répète les notes', () => {
    const notes = ['a', 'b']
    const sections = { Note: { text: ['a', 'b'] }, Strategies: { text: ['c'] }, Vide: { text: [] } }
    expect(otherSectionViews(sections, notes).map((v) => v.title)).toEqual(['Strategies'])
  })
})

describe('alertes', () => {
  it('liste les champs absents, rien sinon', () => {
    expect(missingFieldsAlert([{ label: 'Poids', missing: false }])).toBeNull()
    expect(missingFieldsAlert([{ label: 'Poids', missing: true }, { label: 'Équilibre', missing: true }])?.text).toContain('Poids, Équilibre')
  })
})

describe('armure', () => {
  const dn = { physical: 3.1, strike: 3.1, slash: 2.8, pierce: 3.1, magic: 3.8, fire: 4, lightning: 3.8, holy: 3.1 }
  it('donne huit lignes et une échelle commune', () => {
    const { rows, scale } = negationRows({ damage_negation: dn })
    expect(rows).toHaveLength(8)
    expect(scale.min).toBe(-10)
    expect(rows[0]?.left).toBeCloseTo(scale.zero)
    expect(rows[0]?.negative).toBe(false)
  })
  it('place une absorption négative à gauche du zéro et une valeur absente sans barre', () => {
    const { rows, scale } = negationRows({ damage_negation: { ...dn, physical: null, holy: -5.1 } })
    expect(rows[0]).toMatchObject({ value: null, width: 0 })
    const holy = rows[7]
    expect(holy?.negative).toBe(true)
    expect((holy?.left ?? 0) + (holy?.width ?? 0)).toBeCloseTo(scale.zero)
  })
  it('élargit l\'échelle vers le bas si une valeur sort de la plage', () => {
    expect(negationScale([-23]).min).toBe(-25)
  })
  it('associe chaque résistance à ses statuts', () => {
    const rows = resistanceRows({ resistance: { immunity: 22, robustness: 14, focus: 18, vitality: 20 } })
    expect(rows.map((r) => r.label)).toEqual(['Immunity', 'Robustness', 'Focus', 'Vitality'])
    expect(rows[0]?.statuses).toBe('Poison, Putréfaction écarlate')
  })
})

describe('sort : prérequis comparés au profil', () => {
  it('une ligne par attribut, comparaison du moteur seulement quand il y a un prérequis', () => {
    const spell = { id: 'x', requirements: { int: 23, fai: 0, arc: 0 } }
    const rows = spellRequirementRows(spell, attrs, checkSpellRequirements(spell, attrs).value?.checks ?? [])
    expect(rows.map((r) => r.attr)).toEqual(['int', 'fai', 'arc'])
    expect(rows[0]?.check).toMatchObject({ required: 23, actual: 20, met: false, gap: 3 })
    expect(rows[1]?.check).toBeNull()
  })
  it('un prérequis atteint est marqué atteint', () => {
    const spell = { id: 'x', requirements: { int: 0, fai: 10, arc: 0 } }
    const rows = spellRequirementRows(spell, attrs, checkSpellRequirements(spell, attrs).value?.checks ?? [])
    expect(rows[1]?.check).toMatchObject({ met: true, gap: 0 })
  })
  it('sans comparaison du store, aucune ligne n’est comparée', () => {
    const rows = spellRequirementRows({ requirements: { int: 23, fai: 0, arc: 0 } }, attrs, [])
    expect(rows.map((r) => r.check)).toEqual([null, null, null])
    expect(rows[0]?.required).toBe(23)
  })
})

describe('cendre de guerre : coût', () => {
  it('explique la notation X (Y Z) et garde le reste tel quel', () => {
    expect(ashCostHint('2 (10 15)')).toContain('suite légère 10')
    expect(ashCostHint('2 (10 15)')).toContain('suite lourde 15')
    expect(ashCostHint('6+12')).toBe('Notation du wiki, gardée telle quelle.')
    expect(ashCostHint(20)).toBeNull()
    expect(ashCostHint(null)).toBeNull()
  })
})
