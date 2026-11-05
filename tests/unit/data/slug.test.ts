// Tests de slug et normalizeText (docs/architecture.md § 3.3 et § 8).

import { describe, expect, it } from 'vitest'
import { normalizeText, slug } from '../../../src/data/slug.ts'

describe('slug', () => {
  it('suit la règle NFD, minuscules, apostrophes supprimées, tirets', () => {
    expect(slug('Moonveil')).toBe('moonveil')
    expect(slug('Rykard, Lord of Blasphemy')).toBe('rykard-lord-of-blasphemy')
    expect(slug("Godrick's Great Rune")).toBe('godricks-great-rune')
    expect(slug('Godrick’s Great Rune')).toBe('godricks-great-rune')
    expect(slug('Swordhand of Night Jolán')).toBe('swordhand-of-night-jolan')
    expect(slug('Flamedrake Talisman +3')).toBe('flamedrake-talisman-3')
    expect(slug('Affinity/Standard')).toBe('affinity-standard')
    expect(slug('Larval Tear (SotE)')).toBe('larval-tear-sote')
    expect(slug('  --Skill: Parry--  ')).toBe('skill-parry')
  })

  it('renvoie une chaîne vide sans lettre ni chiffre', () => {
    expect(slug("'—'")).toBe('')
  })

  it('ne décompose pas les ligatures : les identifiants stockés ne changent pas (aucun titre de data/ n’en contient)', () => {
    expect(slug('Cœur')).toBe('c-ur')
  })
})

describe('normalizeText', () => {
  it('retire accents, casse, apostrophes et signes', () => {
    expect(normalizeText('Jolán, Swordhand')).toBe('jolan swordhand')
    expect(normalizeText("Miquella's Haligtree")).toBe('miquellas haligtree')
    expect(normalizeText('Ash of War: Black Flame Tornado')).toBe('ash of war black flame tornado')
  })

  it('décompose les ligatures œ, æ et ß', () => {
    expect(normalizeText('Cœur')).toBe('coeur')
    expect(normalizeText('ŒUVRE')).toBe('oeuvre')
    expect(normalizeText('Ærial')).toBe('aerial')
    expect(normalizeText('Straße')).toBe('strasse')
  })
})
