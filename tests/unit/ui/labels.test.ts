// Tests de src/ui/labels.ts : les libellés couvrent exactement les clés de src/data/keys.ts (attributs, dégâts, statuts) et les niveaux de fiabilité du moteur.
import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_KEYS, DAMAGE_KEYS, NEGATION_KEYS, STATUS_KEYS } from '../../../src/data/keys.ts'
import {
  ATTRIBUTE_LABELS,
  DAMAGE_LABELS,
  DAMAGE_SHORT_LABELS,
  RELIABILITY_LABELS,
  STATUS_BY_DATA_KEY,
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  ATTRIBUTE_KEYS as LABEL_ATTRIBUTE_KEYS,
} from '../../../src/ui/labels.ts'

describe('labels.ts', () => {
  it('réexporte les clés d’attribut de data/keys.ts', () => {
    expect(LABEL_ATTRIBUTE_KEYS).toBe(ATTRIBUTE_KEYS)
    expect(Object.keys(ATTRIBUTE_LABELS).sort()).toEqual([...ATTRIBUTE_KEYS].sort())
  })
  it('libelle tous les types de dégâts d’arme et d’absorption', () => {
    for (const key of [...DAMAGE_KEYS, ...NEGATION_KEYS]) {
      expect(DAMAGE_LABELS[key]).toBeTruthy()
      expect(DAMAGE_SHORT_LABELS[key]).toBeTruthy()
    }
  })
  it('associe chaque statut de données à un libellé et une abréviation', () => {
    for (const key of STATUS_KEYS) {
      const style = STATUS_BY_DATA_KEY[key]
      expect(STATUS_LABELS[style]).toBeTruthy()
      expect(STATUS_SHORT_LABELS[style]).toBeTruthy()
    }
  })
  it('libelle les six niveaux de fiabilité du moteur', () => {
    expect(Object.keys(RELIABILITY_LABELS).sort()).toEqual(['calculated', 'deduced', 'estimate', 'inconsistent', 'null', 'wiki'])
  })
})
