// Tests des libellés partagés (D46) : types de compétence d'arme et emplacements d'armure.

import { describe, expect, it } from 'vitest'
import { armorSlotLabel } from '../../../src/ui/armorSlots.ts'
import { skillTypeLabel } from '../../../src/ui/skillTypes.ts'

describe('skillTypeLabel', () => {
  it('nomme les trois types de compétence avec la même casse, et « Aucune » pour une arme sans compétence', () => {
    expect(skillTypeLabel('Unique Skill')).toBe('Compétence unique')
    expect(skillTypeLabel('Ash of War skill')).toBe('Compétence de cendre de guerre')
    expect(skillTypeLabel('Standard skill (no Ash of War item)')).toBe('Compétence sans cendre de guerre')
    expect(skillTypeLabel('No skill')).toBe('Aucune')
  })

  it('reprend tel quel un type inconnu ou un nom du prototype', () => {
    expect(skillTypeLabel('Autre')).toBe('Autre')
    expect(skillTypeLabel('constructor')).toBe('constructor')
  })
})

describe('armorSlotLabel', () => {
  it('traduit les quatre emplacements et reprend le reste tel quel', () => {
    expect(['Head', 'Chest', 'Arms', 'Legs'].map(armorSlotLabel)).toEqual(['Tête', 'Torse', 'Bras', 'Jambes'])
    expect(armorSlotLabel('toString')).toBe('toString')
  })
})
