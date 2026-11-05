// Tests de la logique des Mécaniques : découpage des textes en liens, modèle de tableau, regroupement du sommaire, sections et ancres d'un article,
// sur des cas construits et sur les vraies données de `mechanics.json`.

import { describe, expect, it } from 'vitest'
import { buildNameIndex, resolveName } from '../../../src/data/links.ts'
import type { SearchDoc } from '../../../src/data/types/searchIndex.ts'
import { articleSections, groupMechanics, infoboxRows, resolveSectionAnchor, topicLabel, withoutCopiedHeaders } from '../../../src/ui/mechanics.ts'
import { segmentWikiText } from '../../../src/ui/wikiSegments.ts'
import { buildWikiTable } from '../../../src/ui/wikiTable.ts'
import { prepared } from '../data/helpers.ts'

const docs: SearchDoc[] = [
  { ref: 'weapon:dagger', group: 'weapon', name: 'Dagger', norm: 'dagger', source: 'Base game', ctx: [] },
  { ref: 'weapon:torch', group: 'weapon', name: 'Torch', norm: 'torch', source: 'Base game', ctx: [] },
  { ref: 'mechanic:poison', group: 'mechanic', name: 'Poison', norm: 'poison', source: 'Base game', ctx: [] },
  { ref: 'boss:patches', group: 'boss', name: 'Patches', norm: 'patches', source: 'Base game', ctx: [] },
  { ref: 'npc:patches', group: 'npc', name: 'Patches', norm: 'patches', source: 'Base game', ctx: [] },
]
const names = buildNameIndex(docs)
const resolve = (name: string) => resolveName(names, name)

describe('segmentWikiText', () => {
  it('lie un texte qui est exactement un nom', () => {
    expect(segmentWikiText('Poison', resolve)).toEqual([{ text: 'Poison', ref: 'mechanic:poison' }])
  })
  it("lie chaque élément d'une énumération de noms et garde les séparateurs", () => {
    const segments = segmentWikiText('Dagger, Moonblade, Torch', resolve)
    expect(segments.map((s) => s.text).join('')).toBe('Dagger, Moonblade, Torch')
    expect(segments.filter((s) => s.ref !== null).map((s) => s.ref)).toEqual(['weapon:dagger', 'weapon:torch'])
  })
  it('ne cherche jamais un nom au milieu d’une phrase', () => {
    expect(segmentWikiText('Poison builds up gradually, Dagger helps.', resolve)).toEqual([{ text: 'Poison builds up gradually, Dagger helps.', ref: null }])
    expect(segmentWikiText('Poisoned', resolve)[0]?.ref).toBeNull()
  })
  it('laisse en texte simple un nom ambigu ou inconnu, et sans index', () => {
    expect(segmentWikiText('Patches', resolve)[0]?.ref).toBeNull()
    expect(segmentWikiText('Nom inconnu', resolve)[0]?.ref).toBeNull()
    expect(segmentWikiText('Dagger', null)).toEqual([{ text: 'Dagger', ref: null }])
  })
})

describe('buildWikiTable', () => {
  it('lignes objets : colonnes dans l’ordre d’apparition, case absente vide, nombres formatés', () => {
    const model = buildWikiTable([{ Strength: 1 }, { Strength: 1234, Armament: 'Dagger' }])
    expect(model.head).toHaveLength(1)
    expect(model.head[0]?.map((h) => h.text)).toEqual(['Strength', 'Armament'])
    expect(model.rows[0]?.map((c) => c.kind)).toEqual(['number', 'empty'])
    expect(model.rows[1]?.[0]?.text).toBe('1 234')
    expect(model.numeric).toEqual([true, false])
  })
  it('un en-tête « A / B » donne deux niveaux, fusionnés sur les colonnes voisines', () => {
    const model = buildWikiTable([{ 'HP per level / Vigor': 1, 'HP per level / HP': 2, Note: 'x' }])
    expect(model.head).toHaveLength(2)
    expect(model.head[0]).toEqual([
      { text: 'HP per level', colspan: 2, rowspan: 1, group: true, column: 0 },
      { text: 'Note', colspan: 1, rowspan: 2, group: false, column: 2 },
    ])
    expect(model.head[1]?.map((h) => h.text)).toEqual(['Vigor', 'HP'])
  })
  it('un « Duration/Scaling » sans espaces reste un seul niveau', () => {
    expect(buildWikiTable([{ 'Duration/Scaling': 'x' }]).head).toHaveLength(1)
  })
  it('lignes en listes : sans en-tête, colonne vide retirée, première colonne en en-tête de ligne', () => {
    const model = buildWikiTable([['', 'Vigor', 'HP and Immunity'], ['', 'Mind']])
    expect(model.head).toEqual([])
    expect(model.rowHeader).toBe(true)
    expect(model.rows[0]?.map((c) => c.text)).toEqual(['Vigor', 'HP and Immunity'])
    expect(model.rows[1]?.[1]?.kind).toBe('empty')
  })
  it('null → cellule « Non documenté », jamais 0 ni vide', () => {
    const model = buildWikiTable([{ A: null, B: 0 }])
    expect(model.rows[0]?.map((c) => c.kind)).toEqual(['null', 'number'])
    expect(model.rows[0]?.[1]?.text).toBe('0')
  })
})

describe('Mécaniques', () => {
  const entries = prepared().datasets.mechanics.entries

  it('regroupe les 88 sujets par thème, dans l’ordre de data/README.md', () => {
    const groups = groupMechanics(entries)
    expect(groups.map((g) => g.topic)).toEqual(['Attributes & stats', 'Status effects', 'Damage types', 'Weapons & upgrades', 'Combat', 'Progression'])
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(88)
    expect(topicLabel('Combat')).toBe('Combat')
    expect(topicLabel('Autre')).toBe('Autre')
  })
  it('la recherche locale ignore accents et casse, et vide les groupes sans résultat', () => {
    const found = groupMechanics(entries, 'sCADUTREE')
    expect(found.flatMap((g) => g.entries.map((e) => e.id))).toEqual(['scadutree-fragment'])
    expect(groupMechanics(entries, 'zzzz')).toEqual([])
  })
  it("les sections d'un article ont des ancres uniques et l'introduction en tête", () => {
    for (const entry of entries) {
      const sections = articleSections(entry)
      expect(new Set(sections.map((s) => s.anchor)).size).toBe(sections.length)
      expect(sections.length).toBeGreaterThan(0)
      if (sections.some((s) => s.intro)) expect(sections[0]?.intro).toBe(true)
    }
    const scadutree = entries.find((e) => e.id === 'scadutree-fragment')
    expect(scadutree).toBeDefined()
    const sections = articleSections(scadutree!)
    expect(sections.map((s) => s.anchor)).toEqual(['introduction', 'acquisition', 'scadutree-blessing-level'])
    expect(resolveSectionAnchor(sections, 'acquisition')).toBe('acquisition')
    expect(resolveSectionAnchor(sections, ['acquisition', 'x'])).toBe('acquisition')
    expect(resolveSectionAnchor(sections, 'inconnue')).toBeNull()
    expect(resolveSectionAnchor(sections, undefined)).toBeNull()
  })
  it("l'infobox devient des lignes lisibles", () => {
    expect(infoboxRows({ max_held: 99, type: 'Bolstering Material' })).toEqual([
      { label: 'Max held', value: '99' },
      { label: 'Type', value: 'Bolstering Material' },
    ])
    expect(infoboxRows(undefined)).toEqual([])
  })
  it("ignore l'en-tête recopié par l'extraction (colonne Increments d'une introduction, case égale à son titre)", () => {
    expect(withoutCopiedHeaders([{ Vigor: 1, HP: 300, Increments: 'Immunity' }, { Vigor: 2, HP: 304, Increments: 0 }], true)).toEqual([
      { Vigor: 1, HP: 300 },
      { Vigor: 2, HP: 304 },
    ])
    expect(withoutCopiedHeaders([{ Level: 0, Increments: 'Increments' }, { Level: 1, Increments: 95 }], false)).toEqual([{ Level: 0 }, { Level: 1, Increments: 95 }])
    const vigor = entries.find((e) => e.id === 'vigor')
    const intro = articleSections(vigor!)[0]
    expect(Object.keys(intro?.tables[0]?.[0] as object)).toEqual(['Vigor', 'HP'])
  })
  it('chaque tableau de data/ se transforme en lignes de même longueur', () => {
    for (const entry of entries) {
      for (const section of articleSections(entry)) {
        for (const table of section.tables) {
          const model = buildWikiTable(table)
          expect(model.rows).toHaveLength(table.length)
          const width = model.rows[0]?.length ?? 0
          expect(model.rows.every((r) => r.length === width)).toBe(true)
        }
      }
    }
  })
})
