// Tests du registre des widgets : les 8 identifiants, codes de texte connus, fichiers requis selon les critères (D7).

import { describe, expect, it } from 'vitest'
import { FILE_KEYS } from '../../../src/data/datasets.ts'
import { LABEL_CODES } from '../../../src/engine/codes.ts'
import { DEFAULT_COLLAPSED_MOBILE, WIDGET_IDS } from '../../../src/widgets/ids.ts'
import { WIDGETS, WIDGET_LIST, enhancingFiles, requiredFiles } from '../../../src/widgets/registry.ts'

describe('registre des widgets', () => {
  it('un widget par identifiant, dans l’ordre par défaut, avec ses codes de texte', () => {
    expect(WIDGET_LIST.map((w) => w.id)).toEqual([...WIDGET_IDS])
    for (const w of WIDGET_LIST) {
      expect(LABEL_CODES).toContain(w.titleCode)
      expect(LABEL_CODES).toContain(w.howCode)
    }
  })

  it('largeurs et plein écran (architecture § 10.3) ; réduits sur mobile = ids.ts', () => {
    expect(WIDGET_LIST.map((w) => w.span)).toEqual([12, 12, 12, 12, 7, 5, 7, 5])
    expect(WIDGET_LIST.filter((w) => w.fullscreen).map((w) => w.id)).toEqual(['weapons-by-stage', 'boss-order', 'weakness-matrix', 'attribute-yield'])
    expect(WIDGET_LIST.filter((w) => w.collapsedOnMobile).map((w) => w.id)).toEqual([...DEFAULT_COLLAPSED_MOBILE])
    expect(WIDGETS['upgrade-plan'].tall).toBe(true)
  })

  it('widget A : fichiers selon le style et les classes préférées (D7)', () => {
    const files = (mode: 'melee' | 'ranged' | 'magic' | 'hybrid', classes: string[] = []) => requiredFiles('weapons-by-stage', { style: { mode, classes } })
    expect(files('melee')).toEqual(['origins', 'bosses', 'tables', 'melee_armaments'])
    expect(files('ranged')).toContain('ranged_weapons_catalysts')
    expect(files('hybrid')).toEqual(expect.arrayContaining(['melee_armaments', 'ranged_weapons_catalysts']))
    expect(files('melee')).not.toContain('shields_torches')
    expect(files('melee', ['Greatshields'])).toContain('shields_torches')
  })

  it('fichiers connus ; facultatifs distincts des requis', () => {
    const criteria = { style: { mode: 'melee' as const, classes: [] } }
    for (const id of WIDGET_IDS) {
      for (const f of [...requiredFiles(id, criteria), ...enhancingFiles(id, criteria)]) expect(FILE_KEYS).toContain(f)
      for (const f of enhancingFiles(id, criteria)) expect(requiredFiles(id, criteria)).not.toContain(f)
    }
    expect(enhancingFiles('boss-order', criteria)).toEqual(['mechanics'])
    expect(requiredFiles('attribute-yield', criteria)).toEqual(['tables'])
  })
})
