// Tests de la recherche globale : accents et casse, rangs et départage, 4 résultats par groupe, groupes présents, tolérance aux fautes, suggestions, surlignage.

import { describe, expect, it } from 'vitest'
import { normalizeText } from '../../../src/data/slug.ts'
import { GROUP_ORDER, PER_GROUP, contextLine, highlight, search } from '../../../src/search/search.ts'
import { doc, names, realIndex } from './helpers.ts'

const index = realIndex()

function group(res: ReturnType<typeof search>, g: string) {
  return res.groups.find((x) => x.group === g)
}

describe('search : accents et casse', () => {
  it('trouve « Jolán » sans accent, avec accent et en majuscules', () => {
    const plain = search(index, 'jolan')
    expect(plain.total).toBeGreaterThan(0)
    for (const q of ['jolán', 'JOLÁN', 'Jolan', '  JoLaN  ']) {
      const r = search(index, q)
      expect(r.groups.map((g) => [g.group, names(g.hits)])).toEqual(plain.groups.map((g) => [g.group, names(g.hits)]))
    }
    expect(plain.groups.map((g) => g.group)).toEqual(['spirit', 'boss', 'npc'])
    expect(names(group(plain, 'npc')?.hits ?? [])).toEqual(['Jolán, Swordhand of Night'])
  })

  it('ignore les apostrophes comme la préparation', () => {
    expect(names(group(search(index, 'rennalas full'), 'spell')?.hits ?? [])).toEqual(["Rennala's Full Moon"])
    expect(names(group(search(index, "Rennala's"), 'spell')?.hits ?? [])).toEqual(["Rennala's Full Moon"])
  })

  it('une saisie vide ou sans lettre ne cherche rien', () => {
    for (const q of ['', '   ', "'", '…']) {
      expect(search(index, q)).toMatchObject({ query: '', groups: [], total: 0, fuzzy: false, suggestions: [] })
    }
  })
})

describe('search : rangs', () => {
  it('0 début du nom, puis 1 débuts de mots', () => {
    const r = search([doc('Ring of Moon'), doc('Moonstone'), doc('Typhoon Moon'), doc('Blue moonstone')], 'moon', { perGroup: 10 })
    const hits = r.groups[0]?.hits ?? []
    expect(hits.map((h) => [h.doc.name, h.rank])).toEqual([
      ['Moonstone', 0],
      ['Blue moonstone', 1],
      ['Ring of Moon', 1],
      ['Typhoon Moon', 1],
    ])
  })

  it('2 sous-chaîne, après les débuts de mots', () => {
    const r = search([doc('Typhoon'), doc('Soon Moon'), doc('Moonveil'), doc('Tycoon')], 'moon', { perGroup: 10 })
    expect(r.groups[0]?.hits.map((h) => [h.doc.name, h.rank])).toEqual([
      ['Moonveil', 0],
      ['Soon Moon', 1],
    ])
    const sub = search([doc('Typhoon'), doc('Blue moonstone')], 'oon')
    expect(sub.groups[0]?.hits.map((h) => [h.doc.name, h.rank])).toEqual([
      ['Typhoon', 2],
      ['Blue moonstone', 2],
    ])
    const mixed = search([doc('Typhoon'), doc('Blue Oonstone')], 'oon')
    expect(mixed.groups[0]?.hits.map((h) => [h.doc.name, h.rank])).toEqual([
      ['Blue Oonstone', 1],
      ['Typhoon', 2],
    ])
  })

  it('exige tous les mots, dans n’importe quel ordre', () => {
    const weapons = names(group(search(index, 'moon dark'), 'weapon')?.hits ?? [])
    expect(weapons).toEqual(['Dark Moon Greatsword'])
    expect(group(search(index, 'dark moon'), 'weapon')?.hits[0]?.rank).toBe(0)
    expect(group(search(index, 'moon dark'), 'weapon')?.hits[0]?.rank).toBe(1)
    expect(search(index, 'dark moon zzzz').total).toBe(0)
  })

  it('classe les armes « moon » de l’extrait : début du nom, puis position, puis longueur', () => {
    const weapons = group(search(index, 'moon', { perGroup: 20 }), 'weapon')?.hits ?? []
    const named = weapons.filter((h) => h.rank <= 1)
    expect(named.map((h) => [h.doc.name, h.rank])).toEqual([
      ['Moonveil', 0],
      ["Moonrithyll's Knight Sword", 0],
      ['Full Moon Crossbow', 1],
      ['Dark Moon Greatsword', 1],
      ['Crescent Moon Axe', 1],
    ])
  })

  it('au même rang, position puis longueur puis ordre alphabétique', () => {
    const byPosition = search([doc('Big Great Rune'), doc('Rune of Foo Bar Baz'), doc('A Rune')], 'rune', { perGroup: 10 })
    expect(names(byPosition.groups[0]?.hits ?? [])).toEqual(['Rune of Foo Bar Baz', 'A Rune', 'Big Great Rune'])
    const byLength = search([doc('Runes of Death'), doc('Runes'), doc('Runes of X')], 'runes')
    expect(names(byLength.groups[0]?.hits ?? [])).toEqual(['Runes', 'Runes of X', 'Runes of Death'])
    const alpha = search([doc('Ya Rune'), doc('Xa Rune'), doc('Wa Rune')], 'rune')
    expect(names(alpha.groups[0]?.hits ?? [])).toEqual(['Wa Rune', 'Xa Rune', 'Ya Rune'])
  })

  it('3 : cherche dans les termes secondaires et nomme le champ', () => {
    const r = search(index, 'caelid')
    const moonveil = group(r, 'weapon')?.hits.find((h) => h.doc.name === 'Moonveil')
    expect(moonveil).toMatchObject({ rank: 3 })
    expect(moonveil?.term).toMatchObject({ field: 'region', text: 'Caelid' })
    expect(contextLine(moonveil as NonNullable<typeof moonveil>)).toBe('Katanas · Région : Caelid')
    const skill = search(index, 'transient')
    expect(group(skill, 'weapon')?.hits[0]?.term?.field).toBe('skill')
    expect(names(group(skill, 'skill')?.hits ?? [])).toEqual(['Transient Moonlight'])
  })

  it('un résultat de rang 0 à 2 passe avant un résultat par terme', () => {
    const locations = group(search(index, 'caelid', { perGroup: 20 }), 'location')?.hits ?? []
    expect(locations[0]?.doc.name).toBe('Caelid')
    expect(locations[0]?.rank).toBe(0)
    expect(contextLine(locations[0] as NonNullable<(typeof locations)[0]>)).toBe(locations[0]?.doc.ctx.join(' · '))
  })

  it('mots répartis entre le nom et un terme', () => {
    expect(names(group(search(index, 'moonveil caelid'), 'weapon')?.hits ?? [])).toEqual(['Moonveil'])
  })
})

describe('search : groupes', () => {
  it('garde 4 résultats par groupe et le total pour « Voir les N »', () => {
    expect(PER_GROUP).toBe(4)
    const r = search(index, 'godrick')
    const armor = group(r, 'armor')
    expect(armor?.hits).toHaveLength(4)
    expect(armor?.total).toBe(8)
    expect(r.counts.armor).toBe(8)
    expect(r.total).toBe(r.groups.reduce((n, g) => n + g.total, 0))
    expect(group(search(index, 'godrick', { perGroup: 100 }), 'armor')?.hits).toHaveLength(8)
  })

  it('ne renvoie que les groupes qui ont des résultats, dans l’ordre fixe', () => {
    const r = search(index, 'seppuku')
    expect(r.groups.map((g) => g.group)).toEqual(['ash', 'skill'])
    expect(r.groups.map((g) => g.label)).toEqual(['Cendres de guerre', 'Compétences'])
    const wide = search(index, 'radahn')
    const order = wide.groups.map((g) => GROUP_ORDER.indexOf(g.group))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(wide.groups.length).toBeGreaterThan(3)
  })

  it('filtre par type sans changer les compteurs', () => {
    const all = search(index, 'radahn')
    const only = search(index, 'radahn', { groups: ['boss'] })
    expect(only.groups.map((g) => g.group)).toEqual(['boss'])
    expect(only.counts).toEqual(all.counts)
    expect(only.total).toBe(all.total)
    expect(search(index, 'seppuku', { groups: ['boss'] }).groups).toEqual([])
  })

  it('accepte le fichier d’index ou la liste de documents', () => {
    expect(search(index.docs, 'jolan').total).toBe(search(index, 'jolan').total)
  })
})

describe('search : tolérance aux fautes', () => {
  it('n’intervient que sans résultat exact', () => {
    expect(search(index, 'margit').fuzzy).toBe(false)
    const r = search(index, 'margti')
    expect(r.fuzzy).toBe(true)
    expect(names(group(r, 'boss')?.hits ?? [])).toEqual(['Margit, the Fell Omen'])
    expect(group(r, 'boss')?.hits[0]).toMatchObject({ rank: 4, distance: 1 })
  })

  it('accepte une erreur pour 4 à 7 lettres : substitution, oubli, ajout, échange', () => {
    for (const q of ['rennela', 'rennla', 'rennalla', 'rennlaa']) {
      expect(names(group(search(index, q), 'boss')?.hits ?? [])).toContain('Rennala, Queen of the Full Moon')
    }
    expect(names(group(search(index, 'rykrad'), 'boss')?.hits ?? [])).toEqual(['Rykard, Lord of Blasphemy'])
  })

  it('refuse deux erreurs sur un mot de 7 lettres, les accepte à 8 lettres et plus', () => {
    expect(search(index, 'rexnnla').total).toBe(0)
    expect(names(group(search(index, 'bloodhoonnd'), 'boss')?.hits ?? [])).toEqual(['Bloodhound Knight'])
    expect(search(index, 'bloodhoonnnd').total).toBe(0)
  })

  it('ne tolère rien sur un mot de moins de 4 lettres', () => {
    expect(search([doc('Axe of Godrick')], 'aze').total).toBe(0)
    expect(search([doc('Axe of Godrick')], 'axw godrick').total).toBe(0)
    expect(search([doc('Axe of Godrick')], 'axe godrik').total).toBe(1)
  })

  it('applique la tolérance mot par mot', () => {
    const r = search(index, 'godrik knigt')
    expect(r.fuzzy).toBe(true)
    expect(names(group(r, 'armor')?.hits ?? [])).toContain('Godrick Knight Helm')
    expect(group(r, 'armor')?.hits[0]?.distance).toBe(2)
  })

  it('classe d’abord la plus petite distance', () => {
    const r = search([doc('Margxxt'), doc('Margit')], 'margut', { perGroup: 10 })
    expect(r.fuzzy).toBe(true)
    expect(names(r.groups[0]?.hits ?? [])).toEqual(['Margit'])
  })

  it('cherche aussi dans les termes secondaires', () => {
    const r = search(index, 'caelod')
    expect(r.fuzzy).toBe(true)
    const moonveil = group(r, 'weapon')?.hits.find((h) => h.doc.name === 'Moonveil')
    expect(moonveil?.term?.text).toBe('Caelid')
  })
})

describe('search : aucun résultat', () => {
  it('propose la traduction du glossaire quand elle trouve quelque chose', () => {
    const r = search(index, 'lune')
    expect(r.total).toBe(0)
    expect(r.suggestions.map((s) => s.query)).toEqual(['moon'])
    expect(r.suggestions[0]?.count).toBeGreaterThan(10)
    const sword = search(index, 'épée de lune')
    expect(sword.suggestions.map((s) => s.query)).toEqual(['sword moon'])
    expect(sword.suggestions[0]?.count).toBe(search(index, 'sword moon').total)
  })

  it('ne propose rien d’inutile', () => {
    expect(search(index, 'zzzzzz').suggestions).toEqual([])
    expect(search(index, 'moon').suggestions).toEqual([])
    expect(search(index, 'lune', { groups: ['boss'] }).suggestions.length).toBe(1)
  })
})

describe('highlight', () => {
  const text = (parts: ReturnType<typeof highlight>) => parts.map((p) => (p.match ? `[${p.text}]` : p.text)).join('')

  it('surligne le début du nom sans toucher aux accents ni à la casse', () => {
    expect(highlight('Jolán, Swordhand of Night', 'jolan')).toEqual([
      { text: 'Jolán', match: true },
      { text: ', Swordhand of Night', match: false },
    ])
    expect(text(highlight('Jolán, Swordhand of Night', 'JOLÁN'))).toBe('[Jolán], Swordhand of Night')
  })

  it('surligne une sous-chaîne ou un début de mot', () => {
    expect(text(highlight('Moonveil', 'veil'))).toBe('Moon[veil]')
    expect(text(highlight('Dark Moon Greatsword', 'moon'))).toBe('Dark [Moon] Greatsword')
    expect(text(highlight('Typhoon Moon', 'moon'))).toBe('Typhoon [Moon]')
  })

  it('traverse les apostrophes et la ponctuation', () => {
    expect(text(highlight("Rennala's Full Moon", 'rennalas fu'))).toBe("[Rennala's Fu]ll Moon")
    expect(text(highlight('Rennala, Queen of the Full Moon', 'queen'))).toBe('Rennala, [Queen] of the Full Moon')
    expect(text(highlight("Moonrithyll's Knight Sword", 'rithyl'))).toBe("Moon[rithyl]l's Knight Sword")
  })

  it('surligne chaque mot d’une requête à plusieurs mots', () => {
    expect(text(highlight('Dark Moon Greatsword', 'moon dark'))).toBe('[Dark] [Moon] Greatsword')
    expect(text(highlight('Dark Moon Greatsword', 'dark moon'))).toBe('[Dark Moon] Greatsword')
    expect(text(highlight('Dark Moon Greatsword', 'gre moon'))).toBe('Dark [Moon] [Gre]atsword')
  })

  it('ne surligne rien sans correspondance (faute de frappe, terme secondaire, requête vide)', () => {
    expect(highlight('Margit, the Fell Omen', 'margti')).toEqual([{ text: 'Margit, the Fell Omen', match: false }])
    expect(highlight('Moonveil', 'caelid')).toEqual([{ text: 'Moonveil', match: false }])
    expect(highlight('Moonveil', '')).toEqual([{ text: 'Moonveil', match: false }])
  })

  it('redonne toujours le nom d’origine, pour tous les documents de l’extrait', () => {
    for (const d of index.docs) {
      for (const q of [d.name, normalizeText(d.name).split(' ')[0] ?? '', 'a', 'ar']) {
        const parts = highlight(d.name, q)
        expect(parts.map((p) => p.text).join('')).toBe(d.name)
      }
      const full = highlight(d.name, d.name)
      expect(full.some((p) => p.match)).toBe(true)
      expect(normalizeText(full.filter((p) => p.match).map((p) => p.text).join(' '))).toBe(d.norm)
    }
  })

  it('garde les signes combinants avec leur lettre', () => {
    expect(text(highlight('Jolán Vale', 'jolan'))).toBe('[Jolán] Vale')
  })
})
