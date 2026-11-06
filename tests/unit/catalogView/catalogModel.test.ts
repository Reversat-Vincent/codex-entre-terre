// Modèle d'affichage des catalogues : colonnes des 17 catalogues, champs lus par les cellules.

import { describe, expect, it } from 'vitest'
import { CATALOG_KEYS, CATALOG_SPECS } from '../../../src/catalog/registry.ts'
import type { CatalogRow } from '../../../src/catalog/registry.ts'
import {
  CATALOG_INFO,
  catalogIntro,
  catalogRoute,
  columnsOf,
  defaultColumnIds,
  familyOf,
  obtentionParts,
  rowHeightOf,
  rowRef,
  sortChoices,
  upgradeParts,
  visibleColumns,
} from '../../../src/components/domain/catalog/catalogModel.ts'

const asRow = (value: object): CatalogRow => value as unknown as CatalogRow

describe('colonnes des catalogues', () => {
  it('chaque catalogue commence par son nom, sans identifiant en double', () => {
    for (const key of CATALOG_KEYS) {
      const ids = columnsOf(key).map((c) => c.id)
      expect(ids[0]).toBe('name')
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('les critères de « Trier par » existent tous dans le registre', () => {
    for (const key of CATALOG_KEYS) {
      for (const choice of sortChoices(key)) expect(Object.hasOwn(CATALOG_SPECS[key].columns, choice.column), `${key} ${choice.column}`).toBe(true)
    }
  })

  it('masque la compétence des armes par défaut mais la propose', () => {
    expect(visibleColumns('weapons:melee', undefined).map((c) => c.id)).not.toContain('skill')
    expect(columnsOf('weapons:melee').map((c) => c.id)).toContain('skill')
    expect(defaultColumnIds('weapons:melee')).not.toContain('skill')
  })

  it('garde toujours le nom et ignore un identifiant inconnu', () => {
    expect(visibleColumns('armors', ['weight', 'inconnue']).map((c) => c.id)).toEqual(['name', 'weight'])
    expect(visibleColumns('armors', []).map((c) => c.id)).toEqual(['name'])
  })

  it('donne 52 px aux lignes d\'armes (classe sous le nom) et 34 px aux autres', () => {
    expect(rowHeightOf('weapons:melee')).toBe(52)
    expect(rowHeightOf('armors')).toBe(34)
  })
})

describe('catalogues et familles', () => {
  it('relie les onglets de chaque famille à leur route', () => {
    expect(familyOf('weapons:distance')).toEqual(['weapons:melee', 'weapons:distance', 'weapons:boucliers'])
    expect(familyOf('items:cles')).toHaveLength(5)
    expect(familyOf('armors')).toEqual([])
    expect(catalogRoute('weapons:boucliers')).toEqual({ name: 'weapons', query: { famille: 'boucliers' } })
    expect(catalogRoute('armors')).toEqual({ name: 'armors' })
    expect(catalogRoute('items:munitions')).toEqual({ name: 'items', query: { type: 'munitions' } })
  })

  it('nomme chaque catalogue', () => {
    expect(CATALOG_INFO['weapons:melee'].title).toBe('Armes de mêlée')
    expect(CATALOG_INFO.armors.kind).toBe('armor')
    expect(CATALOG_INFO['items:outils'].kind).toBe('item')
  })

  it('rédige la phrase sous le titre avec la répartition par contenu', () => {
    const text = catalogIntro('weapons:melee', 335, { 'Base game': 250, 'Shadow of the Erdtree': 79, 'Tarnished Pack': 6 })
    expect(text).toBe('335 armes : 250 du jeu de base, 79 de Shadow of the Erdtree, 6 du Tarnished Pack. Valeurs de base à +0.')
    expect(catalogIntro('origins', 1, undefined)).toBe('1 origine.')
    expect(catalogIntro('armors', 704, 'illisible')).toContain('704 armures.')
  })
})

describe('colonnes par défaut et références', () => {
  it('masque Obtention et Compétence par défaut pour les armes (D43)', () => {
    const ids = defaultColumnIds('weapons:melee')
    expect(ids).not.toContain('obtention')
    expect(ids).not.toContain('skill')
    expect(columnsOf('weapons:melee').some((c) => c.id === 'obtention')).toBe(true)
  })

  it("donne la référence d'entité d'une ligne", () => {
    expect(rowRef('weapons:melee', asRow({ id: 'moonveil' }))).toBe('weapon:moonveil')
    expect(rowRef('armors', asRow({ id: 'bull-goat-armor' }))).toBe('armor:bull-goat-armor')
  })
})

describe('champs lus par les cellules', () => {
  it('traduit l\'amélioration et son badge', () => {
    const upgrade = (reliability: string, extra: object = {}, inconsistent: object[] = []) =>
      asRow({ derived: { upgrade: { material: 'Somber Smithing Stones', maxLevel: 10, reliability, ...extra }, inconsistent } })
    expect(upgradeParts(upgrade('wiki'))).toMatchObject({ text: 'Pierres sombres, +10', short: 'Sombres, +10', kind: 'wiki' })
    expect(upgradeParts(upgrade('deduced'))).toMatchObject({ kind: 'deduced' })
    expect(upgradeParts(upgrade('estimate', { confidence: 'high', basis: 'base' }))).toMatchObject({ kind: 'estimate', confidence: 'high', tip: 'base' })
    expect(upgradeParts(upgrade('wiki', {}, [{ field: 'upgrade.material', reference: 'list' }]))).toMatchObject({ kind: 'inconsistent' })
    expect(upgradeParts(asRow({ derived: { upgrade: { material: null, maxLevel: null, reliability: 'null' }, inconsistent: [] } })).text).toBeNull()
    expect(upgradeParts(asRow({ derived: { upgrade: { material: null, maxLevel: null, reliability: 'not-upgradeable' }, inconsistent: [] } })).text).toBe('Non améliorable')
  })

  it('lit l\'obtention sans rien inventer', () => {
    const entry = asRow({ derived: { regions: { values: ['Limgrave', 'Caelid'] } }, acquisition: [{ method: 'Loot', location: 'Castle Morne', details: [] }] })
    expect(obtentionParts(entry)).toEqual({ regions: 'Limgrave, Caelid', how: 'Loot · Castle Morne' })
    expect(obtentionParts(asRow({ derived: { regions: { values: [] } }, acquisition: [] }))).toEqual({ regions: null, how: null })
  })
})
