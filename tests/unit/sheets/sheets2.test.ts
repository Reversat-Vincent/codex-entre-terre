// Fiches d'objets, de lieux, de PNJ et d'origines : inventaires de boutique, noms avec quantité, étapes de quête, classement des tableaux de PNJ,
// hiérarchie de régions, équipement de départ, lecture du coût d'une compétence ; contrôles sur toutes les données préparées.

import { describe, expect, it } from 'vitest'
import { itemFacts, itemTypeOf, joinList, summaryParagraphs, itemAttack, itemIngredients } from '../../../src/components/domain/sheet/item/itemModel.ts'
import { buildLocationIndex, locationChildren, locationLinks, locationTrail, resolveLocation } from '../../../src/components/domain/sheet/location/locationModel.ts'
import { classifyNpcTable, isQuestHeading, meaningfulLines, questGroups, questItemRows, translateHeaders } from '../../../src/components/domain/sheet/npc/npcModel.ts'
import { originEquipment, originAttributes } from '../../../src/components/domain/sheet/origin/originModel.ts'
import { isShopTable, shopTable } from '../../../src/components/domain/sheet/shop/shopModel.ts'
import { parseNameEntry, splitNameEntries } from '../../../src/components/domain/sheet/sheetModel.ts'
import type { ItemEntry } from '../../../src/components/domain/sheet/useSheetEntry.ts'
import { parseSkillCost } from '../../../src/ui/skillCost.ts'
import type { RawWikiRow } from '../../../src/ui/wikiTable.ts'
import { prepared } from '../data/helpers.ts'

describe('parseSkillCost (module partagé)', () => {
  it('lit X (Y Z) et le tiret', () => {
    expect(parseSkillCost('15 (10 -)')).toEqual({ skill: '15', light: '10', heavy: null })
    expect(parseSkillCost('-')).toEqual({ skill: null, light: null, heavy: null })
    expect(parseSkillCost('6+12')).toBeNull()
  })
})

describe('noms avec quantité', () => {
  it('retire la puce et la quantité, garde +N et crochets', () => {
    expect(parseNameEntry('* Thin Beast Bones x3')).toEqual({ name: 'Thin Beast Bones', count: 3 })
    expect(parseNameEntry('Smithing Stone [3]')).toEqual({ name: 'Smithing Stone [3]', count: null })
    expect(parseNameEntry('Crimson Seed Talisman +1')).toEqual({ name: 'Crimson Seed Talisman +1', count: null })
  })
  it('découpe par ligne et point-virgule', () => {
    expect(splitNameEntries('*Empty Cracked Pot x1\n*Mushroom x1')).toHaveLength(2)
    expect(splitNameEntries('Thin Beast Bones x3; Fulgurbloom x1').map((e) => e.name)).toEqual(['Thin Beast Bones', 'Fulgurbloom'])
  })
  it('nettoie une liste d’infobox', () => {
    expect(joinList('*Loot\n*Craftable')).toBe('Loot ; Craftable')
  })
})

describe('inventaire de boutique', () => {
  it('reconnaît les en-têtes variables et range objet, prix, stock, condition', () => {
    const rows: RawWikiRow[] = [
      { 'Item name': 'Fan Daggers', '#': '20 / ∞', Runes: 160, 'Additional condition': 'Stock increases.' },
      { 'Item name': 'Glass Shard', '#': '∞', Runes: 100 },
    ]
    expect(isShopTable(rows)).toBe(true)
    const model = shopTable(rows)
    expect(model?.currency).toBe('runes')
    expect(model?.hasCondition).toBe(true)
    expect(model?.rows[0]).toMatchObject({ item: 'Fan Daggers', price: 160, stock: '20 / ∞', condition: 'Stock increases.' })
    expect(model?.rows[1]?.condition).toBeNull()
  })
  it('lit « item / cost / stock », la Remembrance requise et les Starlight Shards', () => {
    expect(shopTable([{ item: 'Arrow', cost: 20, stock: '∞' }])?.rows[0]).toMatchObject({ item: 'Arrow', price: 20 })
    const remembrance = shopTable([{ 'Item name': 'Axe of Godrick', '#': 1, Runes: 0, 'Required remembrance': 'Remembrance of the Grafted' }])
    expect(remembrance?.rows[0]).toMatchObject({ price: 0, remembrance: true, condition: 'Remembrance of the Grafted' })
    expect(shopTable([{ 'Item name': 'X', '#': 1, 'Starlight Shards': 3 }])?.currency).toBe('Starlight Shards')
  })
  it('une valeur absente reste null, jamais 0', () => {
    expect(shopTable([{ 'Item Name': 'Torch', Runes: 200 }])?.rows[0]?.stock).toBeNull()
  })
  it('ne prend pas un tableau d’objets de quête pour une boutique', () => {
    expect(isShopTable([{ Item: 'Gesture', Requirements: 'Talk.' }])).toBe(false)
  })
})

describe('tableaux de PNJ', () => {
  it('classe par en-têtes', () => {
    expect(classifyNpcTable([{ 'Item name': 'A', '#': 1, Runes: 5 }])).toBe('shop')
    expect(classifyNpcTable([{ Item: 'A', Requirements: 'x' }])).toBe('quest-items')
    expect(classifyNpcTable([{ 'Right Hand': 'Spear +7', Armor: 'Leather Set' }])).toBe('equipment')
    expect(classifyNpcTable([{ Location: 'Cave', HP: 1191, Runes: 800, Drops: 'x' }])).toBe('encounters')
    expect(classifyNpcTable([{ col1: 'x' }])).toBe('other')
  })
  it('traduit les en-têtes connus et garde les autres', () => {
    const [row] = translateHeaders([{ 'Right Hand': 'Spear', Weird: 'x' }])
    expect(Object.keys(row as object)).toEqual(['Main droite', 'Weird'])
  })
  it('retire les intertitres vides mais garde les phrases', () => {
    expect(meaningfulLines({ text: ['[Basic Info]', '[Equipment]', 'Goldmask cannot be made hostile.'] })).toEqual(['Goldmask cannot be made hostile.'])
  })
  it('lit les objets de quête avec leur quantité', () => {
    const rows = questItemRows([{ Item: 'Festering Bloody Finger x5', Requirements: 'Talk.' }, { Item: 'Gesture' }])
    expect(rows[0]).toEqual({ item: { name: 'Festering Bloody Finger', count: 5 }, requirement: 'Talk.' })
    expect(rows[1]?.requirement).toBeNull()
  })
})

describe('étapes de quête', () => {
  it('distingue titres de lieu, étapes et précisions', () => {
    expect(isQuestHeading('Murkwater Cave')).toBe(true)
    expect(isQuestHeading('(Optional) Liurnia of the Lakes')).toBe(true)
    expect(isQuestHeading('Limgrave (Mistwood Ruins)')).toBe(true)
    expect(isQuestHeading('Pass through the golden fog into the boss room.')).toBe(false)
    expect(isQuestHeading('5. Speaking with Leda and choose an option:')).toBe(false)
    expect(isQuestHeading('Suggest Hornsent -> She goes after Hornsent')).toBe(false)
    const groups = questGroups([
      'Murkwater Cave',
      'Pass through the fog.',
      '(Optional) There is another chest.',
      '→ Using it teleports you.',
      '(Optional) Liurnia of the Lakes',
      'Find him near the Scenic Isle.',
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ title: 'Murkwater Cave', optional: false })
    expect(groups[0]?.steps[1]).toMatchObject({ optional: true, text: 'There is another chest.', sub: ['→ Using it teleports you.'] })
    expect(groups[1]).toMatchObject({ title: 'Liurnia of the Lakes', optional: true })
    expect(groups[1]?.steps[0]?.id).toBe('1-0')
  })
  it('ignore l’intertitre vide du wiki', () => {
    expect(questGroups(['[Questline steps]', 'Limgrave', 'Do it.'])).toHaveLength(1)
  })
})

const ammo = {
  id: 'fire-arrow',
  name: 'Fire Arrow',
  category: 'Arrows',
  type: 'Arrow',
  attack_power: { physical: 15, magic: 0, fire: 95, lightning: 0, holy: 0 },
  critical: 100,
  summary: 'Fire Arrow is bow ammunition in Elden Ring.',
  description: 'Arrow with the tip set alight.',
  infobox: { type: 'Arrow', max_held: 99, attack_type: 'Pierce', fire_power: 95, blood_loss: 55, sell_price: 10, 'sell+price': 3 },
} as unknown as ItemEntry

describe('fiche d’objet', () => {
  it('donne le type d’après le fichier et le filtre du catalogue', () => {
    expect(itemTypeOf('ammunition')).toMatchObject({ type: 'ammo', filter: 'munitions' })
    expect(itemTypeOf('upgrade_materials')?.effectTitle).toBe('Usage')
    expect(itemTypeOf('armor')).toBeNull()
    expect(itemTypeOf(null)).toBeNull()
  })
  it('liste les valeurs de l’infobox présentes seulement', () => {
    const ids = itemFacts(ammo).map((f) => f.id)
    expect(ids).toEqual(['type', 'attack-type', 'held', 'sell'])
  })
  it('lit l’attaque d’une munition, un 0 reste 0', () => {
    const attack = itemAttack(ammo)
    expect(attack?.damages.find((d) => d.key === 'magic')?.value).toBe(0)
    expect(attack?.critical).toBe(100)
    expect(attack?.statuses).toEqual([{ key: 'blood_loss', value: 55 }])
  })
  it('lit les ingrédients d’une recette', () => {
    const tool = { infobox: { required_items: '*Empty Cracked Pot x1\n*Mushroom x1' } } as unknown as ItemEntry
    expect(itemIngredients(tool)).toEqual([{ name: 'Empty Cracked Pot', count: 1 }, { name: 'Mushroom', count: 1 }])
  })
  it('retire la phrase d’amorce du résumé', () => {
    expect(summaryParagraphs('Fire Pot is a craftable Throwing Pot in Elden Ring.')).toEqual([])
    expect(summaryParagraphs('Key is a key item in Elden Ring.\n\nThey break seals.')).toEqual(['They break seals.'])
    expect(summaryParagraphs('Seed is an item in Elden Ring that gives +5 uses.')).toHaveLength(1)
  })
})

describe('lieux', () => {
  const entries = prepared().datasets.locations.entries
  const index = buildLocationIndex(entries)
  const find = (name: string) => entries.find((e) => e.name === name)!

  it('remonte la région parente', () => {
    expect(locationTrail(find('Stormhill'), index).map((c) => c.label)).toEqual(['Limgrave'])
    expect(locationTrail(find('Limgrave'), index)).toEqual([])
    expect(locationTrail(find('Gelmir Hero\'s Grave'), index).map((c) => c.label)).toEqual(['Altus Plateau', 'Mt. Gelmir'])
  })
  it('résout les noms à parenthèses du wiki', () => {
    expect(resolveLocation(index, 'Weeping Peninsula (Limgrave)')?.name).toBe('Weeping Peninsula')
    expect(find('Morne Tunnel').region).toBe('Weeping Peninsula (Limgrave)')
    expect(locationTrail(find('Morne Tunnel'), index).map((c) => c.label)).toEqual(['Limgrave', 'Weeping Peninsula'])
  })
  it('relie une phrase de sous-régions par son premier nom', () => {
    const [link] = locationLinks(['Stormhill, a foggy and windy area at the foot of Stormveil Castle.'], index)
    expect(link).toMatchObject({ name: 'Stormhill', note: 'a foggy and windy area at the foot of Stormveil Castle.' })
    expect(link?.to).not.toBeNull()
    expect(locationLinks(['Leyndell, Royal Capital'], index)[0]?.note).toBeNull()
  })
  it('liste les lieux rattachés sans répéter les listes du lieu', () => {
    const groups = locationChildren(find('Limgrave'), entries, index)
    expect(groups.length).toBeGreaterThan(0)
    const all = groups.flatMap((g) => g.links.map((l) => l.name))
    expect(all).not.toContain('Limgrave')
    expect(new Set(all).size).toBe(all.length)
    // Stormhill est cité par les sous-régions de Limgrave : il n'est pas répété parmi les lieux rattachés.
    expect(all).not.toContain('Stormhill')
  })
  it('la hiérarchie se termine pour tous les lieux', () => {
    for (const e of entries) expect(locationTrail(e, index).length).toBeLessThanOrEqual(5)
  })
})

describe('PNJ de toutes les données', () => {
  const npcs = prepared().datasets.npcs.entries
  it('chaque tableau de boutique donne des lignes', () => {
    let shops = 0
    for (const n of npcs) {
      for (const tables of [n.shop_inventory?.tables, n.character_information?.tables]) {
        for (const rows of tables ?? []) {
          const model = shopTable(rows)
          if (model) {
            shops++
            expect(model.rows.length).toBe(rows.length)
          }
        }
      }
    }
    expect(shops).toBeGreaterThanOrEqual(35)
  })
  it('chaque quête qui a du texte donne au moins un groupe d’étapes', () => {
    let withSteps = 0
    for (const n of npcs) {
      // La quête de Forager Brood ne contient que des intertitres vides du wiki : aucune étape à cocher.
      if (n.questline && meaningfulLines(n.questline).length > 0) {
        withSteps++
        expect(questGroups(n.questline.text).length, n.name).toBeGreaterThan(0)
      }
    }
    expect(withSteps).toBeGreaterThanOrEqual(55)
  })
})

describe('origines', () => {
  const origins = prepared().datasets.origins.entries
  it('sépare les objets groupés de l’équipement de départ', () => {
    const names = origins.flatMap((o) => originEquipment(o).flatMap((g) => g.entries.map((e) => e.name)))
    expect(names.some((n) => n.includes(' + '))).toBe(false)
  })
  it('donne les huit attributs dans l’ordre du jeu', () => {
    const vagabond = origins.find((o) => o.name === 'Vagabond')!
    expect(originAttributes(vagabond).map((a) => `${a.abbr}${a.value}`)).toEqual(['VIG15', 'MND10', 'END11', 'STR14', 'DEX13', 'INT9', 'FAI9', 'ARC7'])
  })
})

describe('objets de toutes les données', () => {
  const datasets = prepared().datasets
  it('chaque fichier d’objets a un type et ses valeurs clés', () => {
    for (const key of ['tools', 'upgrade_materials', 'key_items', 'crafting_materials', 'ammunition'] as const) {
      expect(itemTypeOf(key), key).not.toBeNull()
      for (const entry of datasets[key].entries as readonly ItemEntry[]) expect(itemFacts(entry).length).toBeGreaterThan(0)
    }
  })
  it('les Bell Bearings qui listent des articles donnent un inventaire', () => {
    const withTables = datasets.key_items.entries.filter((e) => e.type === 'Bell Bearing' && (e.effect_tables?.length ?? 0) > 0)
    expect(withTables.length).toBeGreaterThan(10)
    for (const e of withTables) expect(isShopTable(e.effect_tables![0]!), e.name).toBe(true)
  })
})
