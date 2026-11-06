// Tests de l'import : validation sans écriture, résumé, remplacement complet, « Annuler » (y compris après rechargement de l'onglet), lecture seule.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildExportFile } from '../../../src/persistence/document.ts'
import { createImportController, prepareImport, prepareImportFile } from '../../../src/persistence/importer.ts'
import type { ImportPreview } from '../../../src/persistence/importer.ts'
import { LIMITS } from '../../../src/persistence/model.ts'
import type { PersistedState } from '../../../src/persistence/model.ts'
import { STORAGE_KEYS } from '../../../src/persistence/schema.ts'
import { createMemoryStorage } from '../../../src/persistence/storage.ts'
import { useAppStore } from '../../../src/stores/app.ts'
import { usePinsStore } from '../../../src/stores/pins.ts'
import { useToastsStore } from '../../../src/stores/toasts.ts'
import { sampleState, spyStorage } from './helpers.ts'

const file = (state: PersistedState) => buildExportFile(state, '0.1.0', new Date(2026, 10, 1)).content

function preview(): ImportPreview {
  const r = prepareImport(file(sampleState()))
  if (!r.ok) throw new Error('import valide attendu')
  return r.value
}

describe('prepareImport', () => {
  it('donne un résumé pour la confirmation', () => {
    const { summary } = preview()
    expect(summary).toMatchObject({
      profiles: 1,
      pins: 2,
      defeatedBosses: 4,
      recentSearches: 2,
      questNpcs: 2,
      questSteps: 3,
      schemaVersion: 1,
      migratedFrom: null,
      appVersion: '0.1.0',
    })
    expect(summary.exportedAt).toMatch(/^2026-/)
  })

  it('compte PNJ et étapes de quête cochés ; zéro sans suivi de quêtes', () => {
    const none = prepareImport(file({ ...sampleState(), quests: {} }))
    if (!none.ok) throw new Error('import valide attendu')
    expect(none.value.summary).toMatchObject({ questNpcs: 0, questSteps: 0 })
    const one = prepareImport(file({ ...sampleState(), quests: { melina: ['a', 'b', 'c'], 'boc-the-seamster': [] } }))
    if (!one.ok) throw new Error('import valide attendu')
    expect(one.value.summary).toMatchObject({ questNpcs: 1, questSteps: 3 })
  })

  it('refuse un fichier trop gros sans le lire', async () => {
    const text = vi.fn(async () => '')
    const r = await prepareImportFile({ size: LIMITS.maxImportBytes + 1, text })
    expect(r.ok).toBe(false)
    expect(text).not.toHaveBeenCalled()
  })

  it('lit un fichier valide', async () => {
    const content = file(sampleState())
    const r = await prepareImportFile({ size: content.length, text: async () => content })
    expect(r.ok).toBe(true)
  })
})

describe('contrôleur', () => {
  function controller(initial: PersistedState, session = createMemoryStorage(), readonly = false) {
    let current = initial
    const applied: PersistedState[] = []
    const c = createImportController({
      collect: () => current,
      apply: (s) => {
        applied.push(s)
        current = s
      },
      readonly: () => readonly,
      session,
    })
    return { c, applied, state: () => current, session }
  }

  const empty = (): PersistedState => ({ ...sampleState(), pins: [], recentSearches: [] })

  it('remplace tout l’état puis « Annuler » restaure l’instantané', () => {
    const { c, state } = controller(empty())
    expect(c.canUndo()).toBe(false)
    expect(c.commit(preview()).ok).toBe(true)
    expect(state()).toEqual(sampleState())
    expect(c.canUndo()).toBe(true)
    expect(c.undo()).toBe(true)
    expect(state()).toEqual(empty())
    expect(c.canUndo()).toBe(false)
    expect(c.undo()).toBe(false)
  })

  it('l’instantané survit à un rechargement de l’onglet (stockage de session)', () => {
    const session = createMemoryStorage()
    const first = controller(empty(), session)
    first.c.commit(preview())
    const reloaded = controller(sampleState(), session)
    expect(reloaded.c.canUndo()).toBe(true)
    reloaded.c.undo()
    expect(reloaded.state()).toEqual(empty())
  })

  it('un instantané de session corrompu est ignoré', () => {
    const session = createMemoryStorage({ [STORAGE_KEYS.undoImport]: '{"pins":"x"}' })
    expect(controller(empty(), session).c.canUndo()).toBe(false)
  })

  it('refuse en lecture seule, sans rien changer', () => {
    const { c, applied, state } = controller(empty(), createMemoryStorage(), true)
    const r = c.commit(preview())
    expect(r.ok).toBe(false)
    expect(applied).toHaveLength(0)
    expect(state()).toEqual(empty())
    expect(c.canUndo()).toBe(false)
  })
})

describe('store racine : import de bout en bout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  it('un fichier invalide ne change rien et n’écrit rien', () => {
    const storage = spyStorage()
    const app = useAppStore()
    app.boot({ storage, session: createMemoryStorage(), win: null })
    usePinsStore().pin('weapon:moonveil')
    vi.advanceTimersByTime(300)
    const before = storage.writes
    const stored = storage.raw.get(STORAGE_KEYS.state)
    const r = app.previewImportText('{"app":"codex-entre-terre","schemaVersion":99}')
    expect(r.ok).toBe(false)
    expect(storage.writes).toBe(before)
    expect(storage.raw.get(STORAGE_KEYS.state)).toBe(stored)
    expect(usePinsStore().items).toHaveLength(1)
  })

  it('import confirmé : remplacement complet et écriture ; Annuler depuis la notification', () => {
    const storage = spyStorage()
    const app = useAppStore()
    app.boot({ storage, session: createMemoryStorage(), win: null })
    usePinsStore().pin('talisman:radagons-scarseal')
    const r = app.previewImportText(file(sampleState()))
    if (!r.ok) throw new Error('valide')
    expect(app.confirmImport(r.value).ok).toBe(true)
    expect(usePinsStore().items.map((p) => p.ref)).toEqual(['weapon:moonveil', 'boss:margit-the-fell-omen'])
    expect(JSON.parse(storage.raw.get(STORAGE_KEYS.state)!).state.preferences.theme).toBe('parchemin')
    expect(app.canUndoImport).toBe(true)

    const toasts = useToastsStore()
    const toast = toasts.items.find((t) => t.action?.label === 'Annuler' && t.message.includes('importée'))
    expect(toast).toBeDefined()
    toasts.runAction(toast!.id)
    expect(usePinsStore().items.map((p) => p.ref)).toEqual(['talisman:radagons-scarseal'])
    expect(app.canUndoImport).toBe(false)
    expect(JSON.parse(storage.raw.get(STORAGE_KEYS.state)!).state.pins).toHaveLength(1)
  })

  it('stockage indisponible : l’application démarre et le signale', () => {
    const app = useAppStore()
    app.boot({ storage: null, session: null, win: null })
    expect(app.storage).toBe('unavailable')
    usePinsStore().pin('weapon:moonveil')
    expect(usePinsStore().items).toHaveLength(1)
  })

  it('version stockée plus récente : lecture seule, import refusé', () => {
    const raw = JSON.stringify({ app: 'codex-entre-terre', schemaVersion: 4, state: {} })
    const storage = spyStorage({ [STORAGE_KEYS.state]: raw })
    const app = useAppStore()
    app.boot({ storage, session: null, win: null })
    expect(app.storage).toBe('readonly-newer')
    const r = app.previewImportText(file(sampleState()))
    if (!r.ok) throw new Error('valide')
    expect(app.confirmImport(r.value).ok).toBe(false)
    vi.advanceTimersByTime(1000)
    // Seul le document d'origine est présent : ni écrasement, ni copie (la sonde d'écriture du démarrage est supprimée aussitôt).
    expect([...storage.raw.keys()]).toEqual([STORAGE_KEYS.state])
    expect(storage.raw.get(STORAGE_KEYS.state)).toBe(raw)
  })

  it('exporte l’état courant dans un fichier nommé par la date', () => {
    const app = useAppStore()
    app.boot({ storage: spyStorage(), session: null, win: null })
    const out = app.exportFile(new Date(2026, 10, 1))
    expect(out.fileName).toBe('codex-entre-terre-2026-11-01.json')
    const again = app.previewImportText(out.content)
    expect(again.ok).toBe(true)
  })
})
