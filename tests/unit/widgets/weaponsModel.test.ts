// Tests du modèle du widget A : états vides des colonnes, élargissements, filtres et valeurs de tri du plein écran (note `spec-main` et `spec-full`).
// Les armes évaluées sont des objets minimaux : seul ce que lit le modèle y figure.

import { describe, expect, it } from 'vitest'
import { defaultCriteria } from '../../../src/stores/criteria.ts'
import type { ScoredWeapon, StageColumn } from '../../../src/engine/score.ts'
import type { StageId, DlcZone } from '../../../src/engine/config/stages.ts'
import {
  DEFAULT_TABLE_FILTERS,
  activeFilterTexts,
  attackSortValue,
  categoriesOf,
  columnEmpty,
  dlcHeading,
  filterRows,
  hasActiveFilters,
  hiddenText,
  isProfileConfigured,
  passiveSortValue,
  scoreSortValue,
  stageSortValue,
  stageTabs,
  threadStages,
  wideningPatch,
} from '../../../src/widgets/weapons/weaponsModel.ts'

interface Spec {
  name?: string
  category?: string
  stage?: StageId | null
  zone?: DlcZone | null
  total?: number | null
  material?: string | null
  met?: boolean
  hidden?: ScoredWeapon['hidden']
  skill?: string | null
  bleed?: number
}

/** Arme évaluée minimale. */
function weapon(spec: Spec = {}): ScoredWeapon {
  const stage = spec.stage === undefined ? 'early' : spec.stage
  return {
    candidate: {
      ref: `weapon:${spec.name ?? 'w'}`,
      file: 'melee_armaments',
      weapon: {
        id: spec.name ?? 'w',
        name: spec.name ?? 'W',
        category: spec.category ?? 'Katanas',
        attack_power: { physical: 100, magic: 0, fire: 10, lightning: 0, holy: 0 },
        status_buildup: spec.bleed === undefined ? undefined : { blood_loss: spec.bleed },
        skill: { name: spec.skill ?? null, type: 'Unique Skill' },
        derived: { displayName: spec.name ?? 'W', upgrade: { material: spec.material ?? null } },
      },
    },
    stage: { value: stage === null ? null : { stage, dlcZone: spec.zone ?? null } },
    score: { value: { total: spec.total === undefined ? 50 : spec.total, requirements: [{ met: spec.met ?? true }], missingPoints: spec.met === false ? 4 : 0 } },
    hidden: spec.hidden ?? null,
  } as unknown as ScoredWeapon
}

/** Colonne d'étape minimale. */
function column(stage: StageId, over: Partial<StageColumn> = {}): StageColumn {
  return { stage, weapons: [], visibleCount: 0, hidden: {}, hiddenCount: 0, ...over }
}

describe('fil d’étapes et onglets', () => {
  it('liste les cinq étapes dans l’ordre, avec leurs régions', () => {
    const thread = threadStages()
    expect(thread.map((t) => t.id)).toEqual(['early', 'mid', 'late', 'endgame', 'dlc'])
    expect(thread.map((t) => t.label)).toEqual(['Début', 'Milieu', 'Fin', 'Fin de jeu', 'DLC'])
    expect(thread.every((t) => (t.regions ?? '') !== '')).toBe(true)
  })

  it('note le nombre d’armes de chaque onglet', () => {
    const tabs = stageTabs([column('early', { weapons: [weapon(), weapon()] }), column('mid')])
    expect(tabs.find((t) => t.id === 'early')?.note).toBe('2')
    expect(tabs.find((t) => t.id === 'mid')?.note).toBe('0')
    expect(tabs.find((t) => t.id === 'dlc')?.note).toBe('0')
  })

  it('pose un intertitre à chaque sous-zone du DLC, « DLC non localisé » en dernier', () => {
    const list = [weapon({ stage: 'dlc', zone: 'entry' }), weapon({ stage: 'dlc', zone: 'entry' }), weapon({ stage: 'dlc', zone: 'core' }), weapon({ stage: 'dlc', zone: null })]
    expect([0, 1, 2, 3].map((i) => dlcHeading(list, i))).toEqual(['Entrée', null, 'Cœur', 'DLC non localisé'])
  })
})

describe('états vides des colonnes', () => {
  it('DLC désactivé : un état vide qui propose d’activer', () => {
    const e = columnEmpty(column('dlc', { hidden: { 'content-sote': 3 }, hiddenCount: 3 }), [], false)
    expect(e.title).toBe('Shadow of the Erdtree est désactivé')
    expect(e.actions).toEqual([{ id: 'content-sote', label: 'Activer Shadow of the Erdtree', icon: 'plus' }])
  })

  it('armes masquées : les actions suivent l’ordre des suggestions, trois au plus', () => {
    const widen = [
      { reason: 'remembrance', count: 4 },
      { reason: 'estimate', count: 2 },
      { reason: 'quest', count: 1 },
      { reason: 'style', count: 1 },
    ] as const
    const e = columnEmpty(column('late', { hidden: { remembrance: 4 }, hiddenCount: 4 }), widen, true)
    expect(e.title).toBe('Aucune arme de fin de partie ne correspond à vos critères')
    expect(e.text).toBe('Vos critères retirent les 4 armes de cette étape.')
    expect(e.actions.map((a) => a.id)).toEqual(['remembrance', 'estimate', 'quest'])
  })

  it('une seule arme masquée : phrase au singulier', () => {
    const e = columnEmpty(column('mid', { hidden: { quest: 1 }, hiddenCount: 1 }), [{ reason: 'quest', count: 1 }], true)
    expect(e.text).toBe("Vos critères retirent l'arme de cette étape.")
  })

  it('aucune arme à l’étape : « Voir toutes les armes », et le style seulement s’il en ajoute', () => {
    const none = columnEmpty(column('endgame'), [], true)
    expect(none.actions.map((a) => a.id)).toEqual(['all'])
    const withStyle = columnEmpty(column('endgame'), [{ reason: 'style', count: 5 }], true)
    expect(withStyle.actions.map((a) => a.id)).toEqual(['style', 'all'])
  })

  it('accorde le décompte des armes masquées', () => {
    expect(hiddenText(1)).toBe('1 arme masquée par vos critères')
    expect(hiddenText(3)).toBe('3 armes masquées par vos critères')
  })
})

describe('élargissement des critères', () => {
  it('chaque raison lève exactement son critère', () => {
    expect(wideningPatch('content-sote')).toEqual({ content: { sote: true } })
    expect(wideningPatch('content-tp')).toEqual({ content: { tp: true } })
    expect(wideningPatch('remembrance')).toEqual({ constraints: { excludeRemembrance: false } })
    expect(wideningPatch('random-drop')).toEqual({ constraints: { excludeRandomDrop: false } })
    expect(wideningPatch('quest')).toEqual({ constraints: { excludeQuest: false } })
    expect(wideningPatch('estimate')).toEqual({ reliability: { includeEstimates: true } })
    expect(wideningPatch('style')).toEqual({ style: { mode: 'hybrid' } })
  })

  it('un profil laissé aux valeurs par défaut n’est pas configuré', () => {
    const attrs = defaultCriteria().character.attributes
    expect(isProfileConfigured(attrs)).toBe(false)
    expect(isProfileConfigured({ ...attrs, dex: 40 })).toBe(true)
  })
})

describe('filtres du plein écran', () => {
  const rows = [
    weapon({ name: 'Uchigatana', category: 'Katanas', stage: 'early', material: 'Smithing Stones', skill: 'Unsheathe' }),
    weapon({ name: 'Moonveil', category: 'Katanas', stage: 'mid', material: 'Somber Smithing Stones', met: false }),
    weapon({ name: 'Bloodhound’s Fang', category: 'Curved Greatswords', stage: 'dlc', zone: 'entry', total: 61, material: 'Somber Smithing Stones' }),
    weapon({ name: 'Mystère', category: 'Daggers', stage: null, total: null }),
    weapon({ name: 'Écartée', category: 'Katanas', stage: 'early', hidden: 'remembrance' }),
  ]
  const names = (list: readonly ScoredWeapon[]): string[] => list.map((r) => r.candidate.weapon.name)

  it('sans filtre : toutes les armes visibles, les masquées en moins', () => {
    expect(names(filterRows(rows, DEFAULT_TABLE_FILTERS))).toEqual(['Uchigatana', 'Moonveil', 'Bloodhound’s Fang', 'Mystère'])
  })

  it('affiche les armes masquées sur demande', () => {
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, showHidden: true }))).toContain('Écartée')
  })

  it('recherche sans casse ni accents, sur le nom et la compétence', () => {
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, query: 'MYSTERE' }))).toEqual(['Mystère'])
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, query: 'unsheathe' }))).toEqual(['Uchigatana'])
  })

  it('filtre par étape, y compris « Non classé »', () => {
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, stage: 'mid' }))).toEqual(['Moonveil'])
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, stage: 'unclassified' }))).toEqual(['Mystère'])
  })

  it('filtre par classe, amélioration et prérequis atteints', () => {
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, category: 'Daggers' }))).toEqual(['Mystère'])
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, material: 'somber' }))).toEqual(['Moonveil', 'Bloodhound’s Fang'])
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, material: 'normal' }))).toEqual(['Uchigatana'])
    expect(names(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, requirementsMet: true }))).not.toContain('Moonveil')
  })

  it('décrit les filtres actifs', () => {
    expect(hasActiveFilters(DEFAULT_TABLE_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_TABLE_FILTERS, showHidden: true })).toBe(false)
    const f = { ...DEFAULT_TABLE_FILTERS, query: ' katana ', stage: 'unclassified' as const, material: 'somber' as const, requirementsMet: true }
    expect(activeFilterTexts(f)).toEqual(['nom « katana »', 'étape Non classé', 'pierres sombres', 'prérequis atteints'])
  })

  it('liste les classes présentes, triées', () => {
    expect(categoriesOf(rows)).toEqual(['Curved Greatswords', 'Daggers', 'Katanas'])
  })
})

describe('valeurs de tri', () => {
  it('une arme sans score ou sans étape n’a pas de valeur (jamais 0)', () => {
    expect(scoreSortValue(weapon({ total: null }))).toBeNull()
    expect(stageSortValue(weapon({ stage: null }))).toBeNull()
    expect(scoreSortValue(weapon({ total: 72 }))).toBe(72)
  })

  it('l’étape se trie par rang, le DLC par sous-zone', () => {
    const v = (s: StageId, z: DlcZone | null = null): number | null => stageSortValue(weapon({ stage: s, zone: z }))
    expect(v('early')).toBeLessThan(v('mid') ?? 0)
    expect(v('endgame')).toBeLessThan(v('dlc', 'entry') ?? 0)
    expect(v('dlc', 'entry')).toBeLessThan(v('dlc', 'core') ?? 0)
    expect(v('dlc', 'core')).toBeLessThan(v('dlc', 'enir-ilim') ?? 0)
    expect(v('dlc', 'enir-ilim')).toBeLessThan(v('dlc', null) ?? 0)
  })

  it('l’attaque est la somme des types de base, le passif le plus fort statut chiffré', () => {
    expect(attackSortValue(weapon())).toBe(110)
    expect(passiveSortValue(weapon())).toBeNull()
    expect(passiveSortValue(weapon({ bleed: 45 }))).toBe(45)
  })
})
