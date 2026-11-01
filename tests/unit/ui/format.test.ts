// Tests de src/ui/format.ts : séparateurs exacts (U+202F, U+00A0, U+2212), virgule décimale, arrondis, zéros et signes.
import { describe, expect, it } from 'vitest'
import { formatDecimal, formatInt, formatPercent, formatSigned, formatWeight } from '../../../src/ui/format.ts'

const F = '\u202F' // espace fine insécable
const N = '\u00A0' // espace insécable
const M = '\u2212' // vrai signe moins

describe('formatInt', () => {
  it('ne groupe pas en dessous de 4 chiffres', () => {
    expect(formatInt(0)).toBe('0')
    expect(formatInt(512)).toBe('512')
  })
  it('groupe par milliers dès 4 chiffres avec l’espace fine insécable', () => {
    expect(formatInt(1000)).toBe(`1${F}000`)
    expect(formatInt(70000)).toBe(`70${F}000`)
    expect(formatInt(8879348)).toBe(`8${F}879${F}348`)
  })
  it('arrondit à l’entier le plus proche', () => {
    expect(formatInt(1234.5)).toBe(`1${F}235`)
    expect(formatInt(0.4)).toBe('0')
  })
  it('utilise le vrai signe moins et jamais « −0 »', () => {
    expect(formatInt(-1500)).toBe(`${M}1${F}500`)
    expect(formatInt(-0)).toBe('0')
    expect(formatInt(-0.2)).toBe('0')
  })
  it('laisse visible une valeur non finie', () => {
    expect(formatInt(Number.NaN)).toBe('NaN')
  })
})

describe('formatDecimal', () => {
  it('utilise la virgule décimale', () => {
    expect(formatDecimal(5.5)).toBe('5,5')
  })
  it('retire les zéros finaux sauf si une décimale minimale est demandée', () => {
    expect(formatDecimal(10)).toBe('10')
    expect(formatDecimal(10, 1, 1)).toBe('10,0')
  })
  it('respecte le nombre maximal de décimales et groupe la partie entière', () => {
    expect(formatDecimal(1234.5678, 2)).toBe(`1${F}234,57`)
    expect(formatDecimal(1.005, 2)).toBe('1,01')
  })
  it('met le vrai signe moins', () => {
    expect(formatDecimal(-2.5)).toBe(`${M}2,5`)
  })
})

describe('formatPercent', () => {
  it('place une espace insécable avant le signe %', () => {
    expect(formatPercent(35.5)).toBe(`35,5${N}%`)
    expect(formatPercent(12)).toBe(`12${N}%`)
  })
  it('écrit un vrai zéro « 0 % » et les faiblesses avec le vrai moins', () => {
    expect(formatPercent(0)).toBe(`0${N}%`)
    expect(formatPercent(-10)).toBe(`${M}10${N}%`)
  })
})

describe('formatWeight', () => {
  it('garde une décimale fixe', () => {
    expect(formatWeight(6.5)).toBe('6,5')
    expect(formatWeight(2)).toBe('2,0')
    expect(formatWeight(12.34)).toBe('12,3')
  })
})

describe('formatSigned', () => {
  it('ajoute + aux positifs et le vrai moins aux négatifs', () => {
    expect(formatSigned(12)).toBe('+12')
    expect(formatSigned(-3)).toBe(`${M}3`)
  })
  it('n’écrit aucun signe pour zéro, même arrondi', () => {
    expect(formatSigned(0)).toBe('0')
    expect(formatSigned(-0.2)).toBe('0')
    expect(formatSigned(0.4)).toBe('0')
  })
  it('accepte des décimales et le groupement', () => {
    expect(formatSigned(1.5, 1)).toBe('+1,5')
    expect(formatSigned(-1500)).toBe(`${M}1${F}500`)
  })
})
