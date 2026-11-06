// Tests de la configuration du moteur : références présentes dans data/ (docs/architecture.md § 3.5), sections de calculs.md des méthodes,
// et pondérations conformes au texte de calculs.md.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { slug } from '../../../src/data/slug.ts'
import { UPGRADE } from '../../../src/engine/config/upgrade.ts'
import { TWO_HANDED } from '../../../src/engine/config/twoHanded.ts'
import { ATTACK_POWER } from '../../../src/engine/config/attackPower.ts'
import { ACCESS_WEIGHTS, FIT_WEIGHTS, GAUGE, POWER_WEIGHTS, READINESS, SCORE_FILTERS, UPGRADE_COST_WEIGHTS } from '../../../src/engine/config/weights.ts'
import { METHODS } from '../../../src/engine/methods.ts'
import { COMPONENT_CODES, LIMIT_CODES } from '../../../src/engine/codes.ts'
import { rawList } from './helpers.ts'

interface Named {
  name: string
  wiki_page: string
  category?: string
}

const weaponFiles = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const
const allWeapons = weaponFiles.flatMap((f) => rawList<Named>(f, 'weapons'))
const weaponIds = new Set(allWeapons.map((w) => slug(w.wiki_page)))
const categories = new Set(allWeapons.map((w) => w.category))
const items = new Map(
  [...rawList<Named>('upgrade_materials', 'items'), ...rawList<Named>('key_items', 'items')].map((i) => [`item:${slug(i.wiki_page)}`, i.name]),
)

describe('références de la configuration', () => {
  it('twoHanded : catégories et armes existent dans data/', () => {
    for (const c of [...TWO_HANDED.noStanceCategories, ...TWO_HANDED.alwaysTwoHandedCategories]) expect(categories.has(c), c).toBe(true)
    for (const id of [...TWO_HANDED.noStanceWeapons, ...TWO_HANDED.bonusExceptions]) expect(weaponIds.has(id), id).toBe(true)
  })

  it('upgrade : pierres et Bell Bearings existent, avec leur nom exact', () => {
    for (const rule of Object.values(UPGRADE.materials)) {
      for (const ref of [...rule.stones, rule.ancient]) expect(items.get(ref.item), ref.item).toBe(ref.name)
      expect(rule.stones.length * rule.quantities.length + 1).toBe(rule.maxLevel)
    }
    for (const b of UPGRADE.bellBearings) expect(items.get(b.item), b.item).toBe(b.name)
  })

  it('attackPower : armes d’exception existent', () => {
    for (const id of Object.keys(ATTACK_POWER.penaltyExceptions)) expect(weaponIds.has(id), id).toBe(true)
  })
})

describe('méthodes et codes', () => {
  const doc = readFileSync(join(process.cwd(), 'docs', 'design', 'ds', 'calculs.md'), 'utf-8')
  const headings = new Set(doc.split('\n').filter((l) => /^#{2,3} /.test(l)).map((l) => l.replace(/^#+ /, '').trim()))

  it('chaque méthode renvoie à une section existante de calculs.md', () => {
    for (const m of Object.values(METHODS)) if (m.section !== null) expect(headings.has(m.section), m.section).toBe(true)
  })

  it('les codes sont uniques', () => {
    expect(new Set(COMPONENT_CODES).size).toBe(COMPONENT_CODES.length)
    expect(new Set(LIMIT_CODES).size).toBe(LIMIT_CODES.length)
  })
})

describe('pondérations (valeurs de calculs.md)', () => {
  it('composante 1 : une moyenne de 0,5 vaut 25', () => {
    expect(25 / FIT_WEIGHTS.meanForMax).toBe(50)
    expect(FIT_WEIGHTS.grade).toEqual({ S: 1, A: 0.85, B: 0.7, C: 0.55, D: 0.4, E: 0.25 })
  })

  it('composantes 2 à 4, préparation et jauge', () => {
    expect(POWER_WEIGHTS.baseShare + POWER_WEIGHTS.scalingShare).toBe(1)
    // D48 : seuil « hors build » 5 sur 25, plafond des points manquants 15, tolérance du facteur 0,6 de 5 points.
    expect(SCORE_FILTERS.minFitComponent).toBe(5)
    expect(ACCESS_WEIGHTS.missingPointsCap).toBe(15)
    expect([POWER_WEIGHTS.unmetRequirementFactor, POWER_WEIGHTS.unmetRequirementTolerance]).toEqual([0.6, 5])
    expect([UPGRADE_COST_WEIGHTS.undocumented, UPGRADE_COST_WEIGHTS.notUpgradeable]).toEqual([14, 8])
    expect(READINESS.limitMargin).toBe(8)
    expect(GAUGE).toEqual({ aboveRecommended: 30, abovePlayer: 12, minimum: 60 })
  })
})
