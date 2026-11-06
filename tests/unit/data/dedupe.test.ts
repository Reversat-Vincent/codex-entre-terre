// Tests de la fusion des doublons de key_items et des sections RichSection des PNJ.

import { describe, expect, it } from 'vitest'
import { mergeKeyItemDuplicates, toRichSection } from '../../../scripts/data/transforms.ts'
import type { KeyItemRaw } from '../../../src/data/types/keyItems.ts'
import { prepared, rawData } from './helpers.ts'

const GREAT_RUNES = [
  "Godrick's Great Rune",
  "Rykard's Great Rune",
  "Radahn's Great Rune",
  "Morgott's Great Rune",
  "Mohg's Great Rune",
  "Malenia's Great Rune",
]

describe('mergeKeyItemDuplicates', () => {
  it('fusionne les 6 Grandes Runes en double et garde l’autre catégorie', () => {
    const keyItems = prepared().datasets.key_items
    for (const name of GREAT_RUNES) {
      const found = keyItems.entries.filter((e) => e.name === name)
      expect(found).toHaveLength(1)
      expect(found[0]?.category).toBe('Restored Great Runes')
      expect(found[0]?.derived.alsoListedIn).toEqual(['Containers and Slot Boosters'])
    }
    expect(keyItems.transforms.find((t) => t.code === 'merge-duplicates')?.count).toBe(6)
  })

  it('garde les homonymes de pages différentes (Larval Tear)', () => {
    const tears = prepared().datasets.key_items.entries.filter((e) => e.name === 'Larval Tear')
    expect(tears.map((e) => e.derived.displayName)).toEqual(['Larval Tear', 'Larval Tear (SotE)'])
  })

  it('signale un doublon au contenu différent', () => {
    const items = rawData().key_items.entries as KeyItemRaw[]
    const rune = items.find((e) => e.name === GREAT_RUNES[0])
    if (rune === undefined) throw new Error('Grande Rune introuvable')
    const altered = { ...rune, summary: `${rune.summary} (modifié)` }
    const r = mergeKeyItemDuplicates([rune, altered])
    expect(r.conflicts).toHaveLength(1)
    expect(r.entries).toHaveLength(1)
  })
})

describe('toRichSection', () => {
  it('ramène liste et section à une forme unique, sans perte', () => {
    expect(toRichSection(['a', 'b'])).toEqual({ text: ['a', 'b'], tables: [] })
    expect(toRichSection({ text: ['a'] })).toEqual({ text: ['a'], tables: [] })
    const tables = [[{ HP: 1000 }]]
    expect(toRichSection({ text: [], tables })).toEqual({ text: [], tables })
  })

  it('s’applique aux trois champs hétérogènes des PNJ', () => {
    for (const npc of prepared().datasets.npcs.entries) {
      for (const f of ['overview', 'character_information', 'questline'] as const) {
        const v = npc[f]
        if (v !== undefined) {
          expect(Array.isArray(v.text)).toBe(true)
          expect(Array.isArray(v.tables)).toBe(true)
        }
      }
    }
  })
})
