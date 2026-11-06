// Tests des liens croisés (`links.ts`), des liens externes (`externalLinks.ts`) et de l'analyse du texte du wiki (`wikiText.ts`).

import { describe, expect, it } from 'vitest'
import { GUIDE_LINKS, INTERACTIVE_MAPS, fextralifeSearchUrl, wikiSearchUrl, wikiUrlOf } from '../../../src/data/externalLinks.ts'
import { buildNameIndex, kindOf, resolveAll, resolveName } from '../../../src/data/links.ts'
import { parseWikiLines } from '../../../src/data/wikiText.ts'
import type { SearchDoc } from '../../../src/data/types/searchIndex.ts'
import { prepared } from '../data/helpers.ts'

describe('liens croisés', () => {
  const index = buildNameIndex(prepared().search)

  it('nom exact normalisé → entité ; accents, casse et apostrophes ignorés', () => {
    expect(resolveName(index, 'Moonveil')).toBe('weapon:moonveil')
    expect(resolveName(index, 'moonveil')).toBe('weapon:moonveil')
    expect(resolveName(index, "Rennala's Full Moon")).toBe('spell:rennalas-full-moon')
    expect(resolveName(index, 'Nom inexistant')).toBeNull()
  })

  it('nom porté par plusieurs genres : genre préféré, sinon texte simple', () => {
    const docs: SearchDoc[] = [
      { ref: 'boss:patches', group: 'boss', name: 'Patches', norm: 'patches', source: 'Base game', ctx: [] },
      { ref: 'npc:patches', group: 'npc', name: 'Patches', norm: 'patches', source: 'Base game', ctx: [] },
      { ref: 'weapon:x', group: 'skill', name: 'Patches', norm: 'patches', source: null, ctx: [] },
    ]
    const small = buildNameIndex(docs)
    expect(resolveAll(small, 'Patches')).toEqual(['boss:patches', 'npc:patches'])
    expect(resolveName(small, 'Patches')).toBeNull()
    expect(resolveName(small, 'Patches', ['npc'])).toBe('npc:patches')
    expect(resolveName(small, 'Patches', ['weapon'])).toBeNull()
    expect(kindOf('npc:patches')).toBe('npc')
  })
})

describe('liens externes (D26, D29)', () => {
  it('« Voir sur le wiki » seulement vers eldenring.wiki.gg', () => {
    expect(wikiUrlOf({ url: 'https://eldenring.wiki.gg/wiki/Moonveil' })).toBe('https://eldenring.wiki.gg/wiki/Moonveil')
    expect(wikiUrlOf({ url: 'https://example.com/x' })).toBeNull()
    expect(wikiUrlOf({})).toBeNull()
  })

  it('recherches Fextralife et wiki : nom encodé', () => {
    expect(fextralifeSearchUrl("Rennala's Full Moon")).toBe("https://eldenring.wiki.fextralife.com/index.php?search=Rennala's%20Full%20Moon")
    expect(fextralifeSearchUrl('a&b?c')).toBe('https://eldenring.wiki.fextralife.com/index.php?search=a%26b%3Fc')
    expect(wikiSearchUrl(' Jolán ')).toBe('https://eldenring.wiki.gg/index.php?search=Jol%C3%A1n')
  })

  it('deux cartes interactives et cinq pages de guides, en https vers les deux wikis', () => {
    expect(INTERACTIVE_MAPS.map((l) => l.url)).toEqual([
      'https://eldenring.wiki.gg/wiki/Map:ELDEN_RING',
      'https://eldenring.wiki.fextralife.com/Interactive_Map',
    ])
    expect(GUIDE_LINKS).toHaveLength(5)
    for (const l of [...INTERACTIVE_MAPS, ...GUIDE_LINKS]) {
      expect(l.url).toMatch(l.site === 'wiki-gg' ? /^https:\/\/eldenring\.wiki\.gg\// : /^https:\/\/eldenring\.wiki\.fextralife\.com\//)
    }
  })
})

describe('texte du wiki', () => {
  it('mode liste : `→` répétés donnent l’imbrication, `[Titre]` coupe la liste', () => {
    expect(parseWikiLines(['Un', '→ Un.a', '→→ Un.a.i', '→ Un.b', '[Notes]', 'Deux'], 'list')).toEqual([
      {
        kind: 'list',
        items: [{ text: 'Un', children: [{ text: 'Un.a', children: [{ text: 'Un.a.i', children: [] }] }, { text: 'Un.b', children: [] }] }],
      },
      { kind: 'heading', text: 'Notes' },
      { kind: 'list', items: [{ text: 'Deux', children: [] }] },
    ])
  })

  it('mode paragraphes : les lignes simples sont des paragraphes, les `→` des puces', () => {
    expect(parseWikiLines(['Intro.', '→ point', '→→ détail', '', 'Suite.'], 'paragraphs')).toEqual([
      { kind: 'paragraph', text: 'Intro.' },
      { kind: 'list', items: [{ text: 'point', children: [{ text: 'détail', children: [] }] }] },
      { kind: 'paragraph', text: 'Suite.' },
    ])
  })

  it('un saut de niveau est ramené sous le parent ; le texte reste brut', () => {
    expect(parseWikiLines(['→→→ <b>profond</b>'], 'list')).toEqual([{ kind: 'list', items: [{ text: '<b>profond</b>', children: [] }] }])
  })
})
