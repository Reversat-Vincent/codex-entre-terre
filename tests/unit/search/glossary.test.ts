// Tests du glossaire français → anglais : forme des entrées, pluriels, élisions, articles, requêtes produites.

import { describe, expect, it } from 'vitest'
import { normalizeText } from '../../../src/data/slug.ts'
import { prepared } from '../data/helpers.ts'
import { GLOSSARY, MAX_TRANSLATIONS, STOPWORDS, lookupWord, translateQuery } from '../../../src/search/glossary.ts'

describe('GLOSSARY', () => {
  it('a des clés et des équivalents sous la forme de normalizeText', () => {
    for (const [fr, en] of Object.entries(GLOSSARY)) {
      expect(normalizeText(fr), fr).toBe(fr)
      expect(en.length, fr).toBeGreaterThan(0)
      for (const word of en) expect(normalizeText(word), `${fr} → ${word}`).toBe(word)
    }
  })

  it('ne contient pas d’article', () => {
    for (const w of STOPWORDS) expect(GLOSSARY[w], w).toBeUndefined()
  })
})

describe('lookupWord', () => {
  it('trouve le mot, son pluriel et son élision', () => {
    expect(lookupWord('lune')).toEqual(['moon'])
    expect(lookupWord('lunes')).toEqual(['moon'])
    expect(lookupWord('epees')).toEqual(['sword'])
    expect(lookupWord('lepee')).toEqual(['sword'])
    expect(lookupWord('dor')).toEqual(['gold', 'golden'])
  })

  it('préfère le mot entier à son élision', () => {
    expect(lookupWord('lame')).toEqual(['blade'])
    expect(lookupWord('lance')).toEqual(['spear', 'lance'])
  })

  it('ignore les mots inconnus', () => {
    expect(lookupWord('zzz')).toBeNull()
    expect(lookupWord('moon')).toBeNull()
  })
})

describe('translateQuery', () => {
  it('traduit un mot', () => {
    expect(translateQuery('lune')).toEqual(['moon'])
    expect(translateQuery('Épée')).toEqual(['sword'])
  })

  it('retire les articles quand un mot est traduit', () => {
    expect(translateQuery('épée de lune')).toEqual(['sword moon'])
    expect(translateQuery("l'épée de la lune")).toEqual(['sword moon'])
  })

  it('garde les mots inconnus', () => {
    expect(translateQuery('épée Rennala')).toEqual(['sword rennala'])
  })

  it('produit toutes les combinaisons, plafonnées', () => {
    expect(translateQuery('glace')).toEqual(['ice', 'frost'])
    const many = translateQuery('glace pourriture folie or')
    expect(many).toHaveLength(MAX_TRANSLATIONS)
    expect(many[0]).toBe('ice rot madness gold')
    expect(new Set(many).size).toBe(many.length)
  })

  it('ne propose rien quand rien n’est traduit ou quand la requête est déjà la traduction', () => {
    expect(translateQuery('moon')).toEqual([])
    expect(translateQuery('de la')).toEqual([])
    expect(translateQuery('')).toEqual([])
    expect(translateQuery('rune')).toEqual([])
  })
})

describe('mots de mécanique', () => {
  it('traduit les mots courants de la tâche « comprendre une mécanique »', () => {
    expect(translateQuery('saignement')).toEqual(['blood loss'])
    expect(translateQuery('hémorragie')).toEqual(['blood loss'])
    expect(translateQuery('statut')).toEqual(['status'])
    expect(translateQuery('parade')).toEqual(['parry'])
    expect(translateQuery('garde')).toEqual(['guard'])
    expect(translateQuery('affinités')).toEqual(['affinity'])
    expect(translateQuery('endurance')).toEqual(['stamina'])
    expect(translateQuery('givre')).toEqual(['frost', 'frostbite'])
    expect(translateQuery('poison')).toEqual([])
    expect(translateQuery('putréfaction')).toEqual(['rot', 'scarlet rot'])
    expect(translateQuery('sommeil')).toEqual(['sleep'])
    expect(translateQuery('folie')).toEqual(['madness', 'frenzy'])
    expect(translateQuery('équilibre')).toEqual(['poise'])
    expect(translateQuery('charge')).toEqual(['equip load'])
    expect(translateQuery('esprit')).toEqual(['spirit'])
  })

  it('chaque équivalent est un mot (ou une suite de mots) d’un nom de l’index de recherche', () => {
    const names = prepared().search.map((d) => ` ${d.norm} `)
    const missing: string[] = []
    for (const [fr, en] of Object.entries(GLOSSARY)) {
      for (const word of en) if (!names.some((n) => n.includes(` ${word} `))) missing.push(`${fr} → ${word}`)
    }
    expect(missing).toEqual([])
  })
})
