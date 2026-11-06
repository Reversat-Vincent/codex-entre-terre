// Tests de src/ui/explainText.ts : chaque code du moteur (composantes, limites, libellés) et chaque méthode a son texte, et aucun texte n'est orphelin.
import { describe, expect, it } from 'vitest'
import { COMPONENT_CODES, LABEL_CODES, LIMIT_CODES } from '../../../src/engine/codes.ts'
import { METHODS } from '../../../src/engine/methods.ts'
import type { MethodId } from '../../../src/engine/types.ts'
import type { AttackUnavailableCode } from '../../../src/engine/attackPower.ts'
import {
  ATTACK_UNAVAILABLE_TEXTS,
  COMPONENT_SPECS,
  LABEL_TEXTS,
  LIMIT_TEXTS,
  attackUnavailableText,
  componentLabel,
  dataValueText,
  describeComponent,
  labelText,
  limitText,
  methodText,
} from '../../../src/ui/explainText.ts'

/** Un texte rendu est utilisable : non vide, sans reste de gabarit ni valeur indéfinie. */
function expectClean(text: string): void {
  expect(text.trim().length).toBeGreaterThan(0)
  expect(text).not.toMatch(/undefined|NaN|\[object|\{|\}/)
}

describe('explainText.ts', () => {
  it('donne un texte à chaque code de composante, sans texte orphelin', () => {
    expect(Object.keys(COMPONENT_SPECS).sort()).toEqual([...COMPONENT_CODES].sort())
    for (const code of COMPONENT_CODES) expectClean(componentLabel(code))
  })
  it('donne un texte à chaque code de limite, sans texte orphelin', () => {
    expect(Object.keys(LIMIT_TEXTS).sort()).toEqual([...LIMIT_CODES].sort())
    for (const code of LIMIT_CODES) expectClean(limitText(code))
  })
  it('donne un texte à chaque code de libellé, sans texte orphelin', () => {
    expect(Object.keys(LABEL_TEXTS).sort()).toEqual([...LABEL_CODES].sort())
    for (const code of LABEL_CODES) if (code !== 'timeline-step-place') expectClean(labelText(code))
  })
  it('donne un titre et un résumé citant la section de calculs.md à chaque méthode', () => {
    for (const id of Object.keys(METHODS) as MethodId[]) {
      const m = methodText(id)
      expectClean(m.title)
      expect(m.summary).toContain(`« ${METHODS[id].section} »`)
    }
  })
  it('interpole les paramètres, en français', () => {
    expect(componentLabel('hp', { attr: 'vig', points: 15 })).toBe('PV à VIG 15')
    expect(componentLabel('stages-ahead', { stage: 'endgame', player: 'mid' })).toBe("Étapes d'avance sur la vôtre (Fin de jeu contre Milieu)")
    expect(limitText('requirement-not-met', { type: 'physical', attrs: 'str,dex' })).toContain('STR, DEX')
    // D48 : réduction de 40 % chiffrée (lue dans la configuration, V17), tolérance du score rappelée ; facteur et tolérance dans la composante.
    expect(limitText('requirement-not-met', { type: 'physical', attrs: 'str' })).toContain('40 %')
    expect(limitText('requirement-not-met', { type: 'physical', attrs: 'str' })).toContain('les dégâts de type physique')
    expect(limitText('requirement-not-met', { type: 'physical', attrs: 'str' })).toContain('au-delà de 5 points')
    expect(limitText('penalty-exception', { type: 'magic' })).toContain('les dégâts de type magie')
    expect(componentLabel('weakness-absorption', { type: 'fire' })).toBe('Absorption des dégâts de type feu de la rencontre, en %')
    expect(componentLabel('unmet-requirement-factor', { factor: 0.6, attrs: 'int', points: 36, tolerance: 5 })).toBe(
      'Puissance retenue, × 0,6 : prérequis non atteints (INT), total manquant 36 ; réduction de 40 % seulement au-delà de 5 points manquants',
    )
    // « Hors build » : valeur avant arrondi et seuil (V15, D51) ; sans la valeur, le seuil seul.
    expect(limitText('weapon-hidden-off-build', { max: 5, fit: 4.6 })).toBe(
      "L'adéquation de cette arme à votre build cible vaut 4,6 sur 25 avant arrondi, sous le seuil de 5 : elle ne figure pas dans les recommandations.",
    )
    expect(limitText('weapon-hidden-off-build', { max: 5, fit: 4.96 })).toContain('vaut 4,96 sur 25')
    expect(limitText('weapon-hidden-off-build', { max: 5 })).toContain('inférieure à 5 sur 25 avant arrondi')
    // « Hors de portée » (V13, D51) : nombres lus dans les paramètres.
    expect(limitText('weapon-hidden-out-of-reach', { max: 25, span: 1, points: 38 })).toBe(
      'Il manque 38 points de prérequis à cette arme, au-delà de 25 : elle ne figure pas dans les recommandations des étapes passées, de la vôtre ni de la suivante.',
    )
    expect(limitText('weapon-hidden-out-of-reach', { max: 30, span: 2, points: 31 })).toBe(
      'Il manque 31 points de prérequis à cette arme, au-delà de 30 : elle ne figure pas dans les recommandations des étapes passées, de la vôtre ni des 2 suivantes.',
    )
    expect(limitText('weapon-hidden-out-of-reach', { max: 25, span: 0 })).toBe(
      'Il manque à cette arme plus de 25 points de prérequis : elle ne figure pas dans les recommandations des étapes passées ni de la vôtre.',
    )
    expect(limitText('upgrade-type-estimated', { confidence: 'high' })).toContain('haute')
    expect(limitText('level-out-of-range', { from: 0, to: 30, max: 25 })).toContain('+25')
    expect(labelText('timeline-step-place', { place: 'Leyndell, Royal Capital' })).toBe('Leyndell, Royal Capital')
    expect(componentLabel('stones', { item: 'item:smithing-stone-1', tier: 1 })).toBe('Smithing Stone [1] (palier 1)')
    expectClean(componentLabel('coverage-documented', { row: 'coverage-timeline-hp' }))
  })
  it('met la valeur d’une composante en forme, sans jamais transformer un null en 0', () => {
    const v = describeComponent({ code: 'score-fit', value: 20, max: 25 })
    expect(v).toMatchObject({ value: '20', max: '25', ratio: 0.8, hidden: false })
    const n = describeComponent({ code: 'score-power', value: null, max: 25 })
    expect(n).toMatchObject({ value: null, ratio: null })
    expect(describeComponent({ code: 'off-build-penalty', value: -4 }).value).toBe('−4')
    expect(describeComponent({ code: 'zone-tier', value: 12, params: { basis: 'wiki' } }).value).toBe('T12')
    expect(describeComponent({ code: 'bell-bearing', value: null, params: { item: 'item:somberstone-miners-bell-bearing-1' } }).hidden).toBe(true)
  })
  it('met en forme la valeur d’une donnée citée', () => {
    expect(dataValueText(null)).toBeNull()
    expect(dataValueText(undefined)).toBeNull()
    expect(dataValueText(true)).toBe('oui')
    expect(dataValueText('Katana')).toBe('Katana')
  })
  it('met en forme l’adéquation précoce en décimal et décrit les priorités de montée de niveau', () => {
    expect(describeComponent({ code: 'early-fit', value: 12.2 }).value).toBe('12,2')
    const label = componentLabel('priority-build-target', { attr: 'dex', actual: 14, points: 6, weight: 0.5 })
    expect(label).toContain('DEX')
    expect(label).toContain('0,5')
    expectClean(label)
  })
  it('donne à la courbe sous 10 points un texte valable pour les deux courbes', () => {
    const text = limitText('curve-below-10', { points: 5 })
    expect(text).not.toContain('15')
    expect(text).not.toContain('19')
  })
  it('donne un texte à chaque raison de non-calcul de la puissance d’attaque', () => {
    const codes: AttackUnavailableCode[] = ['level-out-of-range', 'affinity-undocumented', 'level-undocumented', 'published-value-missing']
    expect(Object.keys(ATTACK_UNAVAILABLE_TEXTS).sort()).toEqual([...codes].sort())
    for (const code of codes) expectClean(attackUnavailableText(code))
  })
})
