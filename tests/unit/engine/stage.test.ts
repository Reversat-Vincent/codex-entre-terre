// Tests de l'étape de progression (calculs.md, « Étape de progression d'une arme ») sur les vraies données préparées.
// Résistent aux compléments de données annoncés (matériaux d'amélioration) : ils ne lisent que les régions, la source et les rencontres.

import { describe, expect, it } from 'vitest'
import { STAGE_IDS } from '../../../src/engine/config/stages.ts'
import { currentStage, dlcZoneRank, encounterStage, entryStage, mostPrecise, stagesAhead } from '../../../src/engine/stage.ts'
import type { StageContext } from '../../../src/engine/stage.ts'
import { allWeapons, candidate, encounters } from './prepared.ts'

function stageOf(name: string, starting: ReadonlySet<string> | null = null) {
  const c = candidate(name)
  const ctx: StageContext = { ref: c.ref, file: c.file, encounters: encounters(), startingArmaments: starting }
  return entryStage(c.weapon, ctx)
}

describe('étape d’une arme', () => {
  it('Blasphemous Blade → Rykard → Volcano Manor → Fin', () => {
    const s = stageOf('Blasphemous Blade')
    expect(s.value).toMatchObject({ stage: 'late', basis: 'remembrance', region: 'Volcano Manor' })
    expect(s.value?.remembrance).toEqual({
      remembrance: 'item:remembrance-of-the-blasphemous',
      boss: 'rykard-lord-of-blasphemy',
      encounter: 'rykard-lord-of-blasphemy/rykard-lord-of-blasphemy-phase-1',
    })
    expect(s.explanation.method).toBe('stage')
  })

  it('armes de Mt. Gelmir en Milieu, celles de Volcano Manor en Fin (D10)', () => {
    const gelmir = [
      'Great Knife', "Scavenger's Curved Sword", 'Mantis Blade', 'Butchering Knife', 'Ringed Finger',
      "Troll's Hammer", 'Fallingstar Beast Jaw', 'Thorned Whip', 'Pulley Bow', 'Pulley Crossbow', 'Jar Cannon', 'Albinauric Staff',
      'Gelmir Glintstone Staff', 'Erdtree Seal', 'Coil Shield',
    ]
    for (const n of gelmir) expect(stageOf(n).value?.stage, n).toBe('mid')
    // Listée en Milieu par decisions-progression.md § 1.5 : « Perfumer's Grotto » (Altus Plateau) et « Volcano Manor » sont deux lieux distincts,
    // la région parente n'est plus retirée entre deux lieux (D37) ; Altus Plateau reste donc, d'où Milieu.
    expect(stageOf('Great Omenkiller Cleaver').value).toMatchObject({ stage: 'mid', region: 'Altus Plateau' })
    for (const n of ["Ghiza's Wheel", "Inquisitor's Girandole", 'Godskin Stitcher', "Man-Serpent's Shield", 'Serpent-Hunter']) {
      expect(stageOf(n).value?.stage, n).toBe('late')
    }
  })

  it('Carian Regal Scepter : la Remembrance l’emporte sur l’achat', () => {
    expect(stageOf('Carian Regal Scepter').value).toMatchObject({ stage: 'mid', basis: 'remembrance' })
  })

  it('sous-zones du DLC et « DLC non localisé »', () => {
    expect(stageOf('Milady').value).toMatchObject({ stage: 'dlc', dlcZone: 'entry', region: 'Castle Ensis' })
    expect(stageOf('Sword Lance').value).toMatchObject({ stage: 'dlc', dlcZone: 'core', basis: 'remembrance' })
    expect(stageOf('Greatsword of Radahn (Lord)').value).toMatchObject({ stage: 'dlc', dlcZone: 'enir-ilim' })
    const unlocated = allWeapons().filter((c) => {
      const s = entryStage(c.weapon, { ref: c.ref, file: c.file, encounters: encounters(), startingArmaments: null })
      return s.value?.stage === 'dlc' && s.value.dlcZone === null
    })
    expect(unlocated.length).toBeGreaterThan(0)
    for (const c of unlocated) expect(c.weapon.source).toBe('Shadow of the Erdtree')
    expect(dlcZoneRank(null)).toBeGreaterThan(dlcZoneRank('enir-ilim'))
  })

  it('équipement de départ : seulement pour l’origine retenue', () => {
    expect(stageOf('Broadsword').value).toBeNull()
    expect(stageOf('Broadsword').explanation.limits).toContainEqual({ code: 'stage-unclassified' })
    expect(stageOf('Broadsword', new Set(['Finger Seal', 'Broadsword'])).value).toMatchObject({ stage: 'early', basis: 'starting' })
  })

  it('répartition des 487 armes : 19 « Non classé », plus les 2 armes de départ seulement (decisions-progression.md § 1.4)', () => {
    const counts: Record<string, number> = {}
    const unclassified: string[] = []
    for (const c of allWeapons()) {
      const s = entryStage(c.weapon, { ref: c.ref, file: c.file, encounters: encounters(), startingArmaments: null }).value
      const key = s === null ? 'none' : s.stage === 'dlc' ? `dlc:${s.dlcZone ?? 'unlocated'}` : s.stage
      counts[key] = (counts[key] ?? 0) + 1
      if (s === null) unclassified.push(c.weapon.name)
    }
    expect(allWeapons()).toHaveLength(487)
    expect(unclassified.filter((n) => n !== 'Broadsword' && n !== 'Halberd')).toHaveLength(19)
    expect(unclassified).toEqual(expect.arrayContaining(['Parrying Dagger', 'Whip', 'Golden Epitaph', 'Broadsword', 'Halberd']))
    // Aucune arme du jeu de base dans le DLC, aucune arme du DLC hors du DLC.
    for (const c of allWeapons()) {
      const s = entryStage(c.weapon, { ref: c.ref, file: c.file, encounters: encounters(), startingArmaments: null }).value
      if (c.weapon.source === 'Shadow of the Erdtree') expect(s?.stage, c.weapon.name).toBe('dlc')
      else if (s !== null) expect(s.stage, c.weapon.name).not.toBe('dlc')
    }
  })
})

describe('étape d’une rencontre', () => {
  it('région la plus précise, puis étape la plus précoce', () => {
    expect(mostPrecise(['Mt. Gelmir', 'Volcano Manor'])).toEqual(['Volcano Manor'])
    expect(mostPrecise(['Limgrave', 'Altus Plateau', 'Capital Outskirts'])).toEqual(['Limgrave', 'Capital Outskirts'])
    expect(encounterStage(encounters(), 'margit-the-fell-omen/margit-the-fell-omen').value?.stage).toBe('early')
    expect(encounterStage(encounters(), 'mohg-lord-of-blood/mohg-lord-of-blood-phase-1').value?.stage).toBe('endgame')
    expect(encounterStage(encounters(), 'elden-beast/elden-beast').value?.stage).toBe('endgame')
    expect(encounterStage(encounters(), 'romina-saint-of-the-bud/romina-saint-of-the-bud').value).toMatchObject({ stage: 'dlc', dlcZone: 'core' })
    expect(encounterStage(encounters(), 'inconnu/absent').explanation.limits).toContainEqual({ code: 'encounter-missing', params: { encounter: 'inconnu/absent' } })
  })
})

describe('étape courante', () => {
  const base = { stage: 'mid' as const, regions: [] as string[] }

  it('mode étape : l’étape choisie', () => {
    expect(currentStage({ ...base, mode: 'stage' }, null).value).toBe('mid')
  })

  it('mode régions : la plus avancée ; Début sans région connue', () => {
    expect(currentStage({ ...base, mode: 'region', regions: ['Limgrave', 'Caelid', 'Volcano Manor'] }, null).value).toBe('late')
    const none = currentStage({ ...base, mode: 'region', regions: ['Nulle part'] }, null)
    expect(none.value).toBe('early')
    expect(none.explanation.limits).toContainEqual({ code: 'region-unknown', params: { region: 'Nulle part' } })
  })

  it('mode boss : étape du prochain boss, Fin de jeu ou DLC une fois l’histoire finie', () => {
    const t = { nextStage: 'late' as const, nextNode: 'rykard', complete: false, dlcEnabled: true }
    expect(currentStage({ ...base, mode: 'boss' }, t).value).toBe('late')
    expect(currentStage({ ...base, mode: 'boss' }, { ...t, nextStage: null, complete: true, dlcEnabled: false }).value).toBe('endgame')
    expect(currentStage({ ...base, mode: 'boss' }, { ...t, nextStage: null, complete: true }).value).toBe('dlc')
    expect(currentStage({ ...base, mode: 'boss' }, null).explanation.limits).toContainEqual({ code: 'timeline-unavailable' })
  })

  it('étapes d’avance', () => {
    expect(stagesAhead('dlc', 'early')).toBe(STAGE_IDS.length - 1)
    expect(stagesAhead('early', 'late')).toBe(0)
  })
})
