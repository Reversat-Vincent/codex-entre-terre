// Tests des profils et des critères : enregistrer, charger, dirty, supprimer, limite de 50, réinitialiser avec Annuler, boss vaincus, bornes.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { LIMITS } from '../../../src/persistence/model.ts'
import { cloneCriteria, defaultCriteria, useCriteriaStore } from '../../../src/stores/criteria.ts'
import { useProfilesStore } from '../../../src/stores/profiles.ts'
import { useToastsStore } from '../../../src/stores/toasts.ts'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})

function undoLast(): void {
  const toasts = useToastsStore()
  const toast = toasts.items.at(-1)!
  toasts.runAction(toast.id)
}

describe('profils', () => {
  it('saveAs copie les critères de travail et active le profil, sans lien avec la suite', () => {
    const criteria = useCriteriaStore()
    const profiles = useProfilesStore()
    const r = profiles.saveAs('  Dex / Saignement  ')
    expect(r.ok).toBe(true)
    expect(profiles.items[0]?.name).toBe('Dex / Saignement')
    expect(profiles.activeId).toBe(profiles.items[0]?.id)
    expect(profiles.dirty).toBe(false)
    criteria.setAttribute('dex', 40)
    expect(profiles.dirty).toBe(true)
    expect(profiles.items[0]?.criteria.character.attributes.dex).toBe(27)
  })

  it('save met à jour le profil actif ; sans profil actif il refuse', () => {
    const criteria = useCriteriaStore()
    const profiles = useProfilesStore()
    expect(profiles.save()).toEqual({ ok: false, reason: 'no-active' })
    profiles.saveAs('A')
    criteria.setAttribute('dex', 40)
    expect(profiles.save()).toEqual({ ok: true })
    expect(profiles.dirty).toBe(false)
    expect(profiles.items[0]?.criteria.character.attributes.dex).toBe(40)
  })

  it('un nom vide reçoit un nom par défaut ; un nom trop long est tronqué à 200', () => {
    const profiles = useProfilesStore()
    profiles.saveAs('   ')
    profiles.saveAs('x'.repeat(500))
    expect(profiles.items[0]?.name).toBe('Profil sans nom')
    expect(profiles.items[1]?.name).toHaveLength(LIMITS.maxString)
  })

  it(`refuse un ${LIMITS.maxProfiles + 1}e profil`, () => {
    const profiles = useProfilesStore()
    for (let i = 0; i < LIMITS.maxProfiles; i++) expect(profiles.saveAs(`P${i}`).ok).toBe(true)
    expect(profiles.saveAs('de trop')).toEqual({ ok: false, reason: 'limit' })
    expect(profiles.items).toHaveLength(LIMITS.maxProfiles)
  })

  it('load remplace les critères ; Annuler rend les modifications non enregistrées', () => {
    const criteria = useCriteriaStore()
    const profiles = useProfilesStore()
    profiles.saveAs('A')
    const id = profiles.items[0]!.id
    criteria.setAttribute('vig', 50)
    expect(profiles.load(id)).toBe(true)
    expect(criteria.criteria.character.attributes.vig).toBe(26)
    undoLast()
    expect(criteria.criteria.character.attributes.vig).toBe(50)
    expect(profiles.load('absent')).toBe(false)
  })

  it('rename et remove ; Annuler rétablit le profil supprimé à sa place et comme profil actif', () => {
    const profiles = useProfilesStore()
    profiles.saveAs('A')
    profiles.saveAs('B')
    profiles.saveAs('C')
    const [a, b, c] = profiles.items.map((p) => p.id) as [string, string, string]
    expect(profiles.activeId).toBe(c)
    expect(profiles.rename(b, 'Bé')).toBe(true)
    profiles.remove(c)
    expect(profiles.activeId).toBeNull()
    expect(profiles.dirty).toBe(false)
    undoLast()
    expect(profiles.items.map((p) => p.id)).toEqual([a, b, c])
    expect(profiles.activeId).toBe(c)
    expect(profiles.items[1]?.name).toBe('Bé')
  })

  it('snapshot puis hydrate donne le même état', () => {
    const profiles = useProfilesStore()
    profiles.saveAs('A')
    const snap = profiles.snapshot()
    setActivePinia(createPinia())
    const other = useProfilesStore()
    other.hydrate(snap)
    expect(other.snapshot()).toEqual(snap)
    expect(other.items[0]).not.toBe(snap.items[0])
  })
})

describe('critères', () => {
  it('valeurs par défaut : celles du prototype', () => {
    const c = defaultCriteria()
    expect(c.character.attributes).toEqual({ vig: 26, mnd: 11, end: 18, str: 12, dex: 27, int: 9, fai: 8, arc: 10 })
    expect(c.target).toEqual({ archetype: 'dexarc', level: 125 })
    expect(c.progress.defeated).toHaveLength(3)
    expect(c).toEqual(cloneCriteria(c))
  })

  it('set fusionne par section et borne attributs et niveau cible', () => {
    const criteria = useCriteriaStore()
    criteria.set({ style: { hands: 2 }, target: { level: 9999 } })
    expect(criteria.criteria.style.hands).toBe(2)
    expect(criteria.criteria.style.mode).toBe('melee')
    expect(criteria.criteria.target.level).toBe(LIMITS.levelMax)
    criteria.setAttribute('str', 150)
    criteria.setAttribute('end', -3)
    criteria.setAttribute('arc', 12.6)
    expect(criteria.criteria.character.attributes).toMatchObject({ str: 99, end: 1, arc: 13 })
  })

  it('toggleDefeated passe la progression en mode « boss »', () => {
    const criteria = useCriteriaStore()
    criteria.set({ progress: { mode: 'stage' } })
    criteria.toggleDefeated('rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-1')
    expect(criteria.criteria.progress.mode).toBe('boss')
    expect(criteria.criteria.progress.defeated).toHaveLength(4)
    criteria.toggleDefeated('margit-the-fell-omen/margit-the-fell-omen')
    expect(criteria.criteria.progress.defeated).toHaveLength(3)
    expect(criteria.criteria.progress.defeated).not.toContain('margit-the-fell-omen/margit-the-fell-omen')
  })

  it('reset revient au profil actif, ou aux valeurs par défaut, avec Annuler', () => {
    const criteria = useCriteriaStore()
    const profiles = useProfilesStore()
    criteria.setAttribute('dex', 60)
    criteria.reset()
    expect(criteria.criteria).toEqual(defaultCriteria())
    undoLast()
    expect(criteria.criteria.character.attributes.dex).toBe(60)

    profiles.saveAs('Base')
    criteria.setAttribute('dex', 70)
    criteria.set({ style: { mode: 'magic' } })
    criteria.reset()
    expect(criteria.criteria.character.attributes.dex).toBe(60)
    expect(criteria.criteria.style.mode).toBe('melee')
    expect(profiles.dirty).toBe(false)
    undoLast()
    expect(criteria.criteria.character.attributes.dex).toBe(70)
    expect(criteria.criteria.style.mode).toBe('magic')
  })
})
