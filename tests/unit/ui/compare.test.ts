// Tests de src/ui/compare.ts : meilleure valeur selon le sens de la ligne, `null` jamais compté, écart sans sens, lecture et écriture de `?e=`.
import { describe, expect, it } from 'vitest'
import { formatCompareQuery, judgeRow, parseCompareQuery } from '../../../src/ui/compare.ts'

describe('judgeRow', () => {
  it('marque la plus haute valeur quand plus haut est meilleur', () => {
    const r = judgeRow([100, 140, 120], 'higher')
    expect(r.verdicts).toEqual(['worse', 'best', 'worse'])
    expect(r.differs).toBe(true)
  })

  it('marque la plus basse valeur quand plus bas est meilleur (poids)', () => {
    expect(judgeRow([9.5, 4, 11], 'lower').verdicts).toEqual(['worse', 'best', 'worse'])
  })

  it('garde tous les ex æquo comme meilleurs', () => {
    expect(judgeRow([5, 5, 3], 'higher').verdicts).toEqual(['best', 'best', 'worse'])
  })

  it('ne désigne personne quand toutes les valeurs sont égales', () => {
    const r = judgeRow([7, 7, 7], 'higher')
    expect(r.verdicts).toEqual(['neutral', 'neutral', 'neutral'])
    expect(r.differs).toBe(false)
  })

  it('ne compte jamais null comme meilleur ni comme pire', () => {
    expect(judgeRow([null, 12, 8], 'lower').verdicts).toEqual(['missing', 'worse', 'best'])
    expect(judgeRow([null, 0, 8], 'lower').verdicts).toEqual(['missing', 'best', 'worse'])
    expect(judgeRow([undefined, 3, null], 'higher').verdicts).toEqual(['missing', 'neutral', 'missing'])
  })

  it('traite 0 comme une vraie valeur, distincte de null', () => {
    expect(judgeRow([0, 4], 'lower').verdicts).toEqual(['best', 'worse'])
    expect(judgeRow([0, null], 'lower').verdicts).toEqual(['neutral', 'missing'])
  })

  it('ne désigne personne sans valeur comparable : une seule valeur documentée', () => {
    const r = judgeRow([null, 4, null], 'higher')
    expect(r.verdicts).toEqual(['missing', 'neutral', 'missing'])
    expect(r.differs).toBe(false)
  })

  it('signale seulement l’écart d’une ligne sans sens', () => {
    const r = judgeRow([10, 20], 'none')
    expect(r.verdicts).toEqual(['different', 'different'])
    expect(r.differs).toBe(true)
  })

  it('signale l’écart des textes sans les classer', () => {
    expect(judgeRow(['Wave of Gold', 'Hoarfrost Stomp', null], 'higher').verdicts).toEqual(['different', 'different', 'missing'])
    expect(judgeRow(['Corpse Piler', 'Corpse Piler'], 'none').verdicts).toEqual(['neutral', 'neutral'])
  })

  it('traite un texte vide ou un nombre non fini comme non documenté', () => {
    expect(judgeRow(['', 4, Number.NaN], 'higher').verdicts).toEqual(['missing', 'neutral', 'missing'])
  })

  it('renvoie une liste vide pour une ligne vide', () => {
    expect(judgeRow([], 'higher')).toEqual({ verdicts: [], differs: false })
  })
})

describe('parseCompareQuery', () => {
  it('découpe les références séparées par des virgules', () => {
    expect(parseCompareQuery('weapon:moonveil,weapon:uchigatana')).toEqual(['weapon:moonveil', 'weapon:uchigatana'])
  })

  it('retire les blancs, les vides et les doublons', () => {
    expect(parseCompareQuery(' weapon:a ,, weapon:b,weapon:a')).toEqual(['weapon:a', 'weapon:b'])
  })

  it('accepte un paramètre répété et une valeur absente', () => {
    expect(parseCompareQuery(['weapon:a', 'weapon:b,weapon:c'])).toEqual(['weapon:a', 'weapon:b', 'weapon:c'])
    expect(parseCompareQuery(undefined)).toEqual([])
    expect(parseCompareQuery(null)).toEqual([])
    expect(parseCompareQuery([null])).toEqual([])
  })
})

describe('formatCompareQuery', () => {
  it('joint les références et supprime le paramètre quand la liste est vide', () => {
    expect(formatCompareQuery(['weapon:a', 'weapon:b'])).toBe('weapon:a,weapon:b')
    expect(formatCompareQuery([])).toBeUndefined()
  })

  it('est l’inverse de la lecture', () => {
    const refs = ['armor:a', 'armor:b', 'armor:c']
    expect(parseCompareQuery(formatCompareQuery(refs))).toEqual(refs)
  })
})
