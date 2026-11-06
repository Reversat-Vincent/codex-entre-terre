// Rendu de contrôle (côté serveur) de CxWhyPanel, CxWeaponCard et CxBossTimeline : les gabarits se rendent sans erreur et respectent les conventions de données.
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import CxBossTimeline from '../../../src/components/ds/CxBossTimeline.vue'
import CxWeaponCard from '../../../src/components/ds/CxWeaponCard.vue'
import CxWhyPanel from '../../../src/components/ds/CxWhyPanel.vue'
import type { WeaponEntry } from '../../../src/data/types/weapon.ts'
import { buildTimeline } from '../../../src/engine/timeline.ts'
import { makeCalc } from '../../../src/engine/types.ts'
import type { Explanation } from '../../../src/engine/types.ts'
import type { WeaponScore } from '../../../src/engine/score.ts'

/** Rend un composant avec ses propriétés en HTML. */
async function render(component: object, props: Record<string, unknown>): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(component as never, props) }))
}

const explanation: Explanation = {
  method: 'weapon-score',
  components: [
    { code: 'score-fit', value: 20, max: 25 },
    { code: 'score-power', value: null, max: 25 },
  ],
  inputs: [{ file: 'melee_armaments', entry: 'longsword', field: 'scaling.str', value: 'D', reliability: 'wiki' }],
  limits: [{ code: 'score-base-values' }],
}

describe('composants Pourquoi ?, carte d’arme et frise', () => {
  it('rend le panneau ouvert : méthode, composante nulle en « Non documenté », données, limites', async () => {
    const html = await render(CxWhyPanel, { explanation, subject: 'Longsword', open: true })
    expect(html).toContain('Pourquoi Longsword ?')
    expect(html).toContain('Non documenté')
    expect(html).toContain('melee_armaments')
    expect(html).toContain('Score calculé à +0')
    expect(html).toContain('aria-expanded="true"')
  })
  it('rend le panneau fermé : seul le bouton à divulgation', async () => {
    const html = await render(CxWhyPanel, { explanation })
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('cx-why"')
  })
  it('rend une carte d’arme avec son score calculé', async () => {
    const weapon = {
      id: 'longsword', name: 'Longsword', category: 'Straight Swords', source: 'Base game', weight: 6.5,
      scaling: { str: 'D', dex: 'D', int: null, fai: null, arc: null },
      skill: { name: 'Lion’s Claw', type: 'Ash of War skill' },
      passive_effects: [], status_buildup: undefined, acquisition_flags: ['remembrance_weapon'],
      acquisition: [{ method: 'Loot', location: 'Limgrave', region: null, details: [] }],
      derived: { upgrade: { material: 'Smithing Stones', maxLevel: 25, reliability: 'deduced' }, inconsistent: [] },
    } as unknown as WeaponEntry
    const score = makeCalc<WeaponScore>('weapon-score', { total: 77 } as WeaponScore, { components: explanation.components })
    const html = await render(CxWeaponCard, { weapon, score, top: true })
    expect(html).toContain('is-top')
    expect(html).toContain('Longsword')
    expect(html).toContain('Wiki (déduit)')
    expect(html).toContain('Remembrance')
    expect(html).toContain('Pierres normales, +25')
  })
  it('rend la frise complète et compacte, sans données : « Élément introuvable »', async () => {
    const timeline = buildTimeline(null, [], { dlcEnabled: true })
    const full = await render(CxBossTimeline, { timeline, details: {}, playerLevel: 30 })
    expect(full).toContain('2 au choix parmi 5')
    expect(full).toContain('Élément introuvable')
    expect(full).toContain('Voie DLC')
    const compact = await render(CxBossTimeline, { timeline, details: {}, playerLevel: 30, compact: true })
    expect(compact).toContain('Voir la frise complète')
  })
})
