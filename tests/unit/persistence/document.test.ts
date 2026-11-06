// Tests de l'export, de la lecture et de la validation d'un document : aller-retour, refus, bornes, migrations.
import { describe, expect, it } from 'vitest'
import { buildExportFile, exportFileName, parseDocument } from '../../../src/persistence/document.ts'
import type { ParseOptions } from '../../../src/persistence/document.ts'
import { canMigrate, migrateState, MigrationError } from '../../../src/persistence/migrations.ts'
import { LIMITS } from '../../../src/persistence/model.ts'
import { CURRENT_SCHEMA } from '../../../src/persistence/schema.ts'
import { validateDocument } from '../../../src/persistence/validate.ts'
import { sampleState } from './helpers.ts'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const NOW = new Date(2026, 10, 1, 9, 30)

function exportedJson(mutate?: (doc: Doc) => void): string {
  const doc = JSON.parse(buildExportFile(sampleState(), '0.1.0', NOW).content) as Doc
  mutate?.(doc)
  return JSON.stringify(doc)
}

function refusal(text: string, options: ParseOptions = {}) {
  const r = parseDocument(text, options)
  if (r.ok) throw new Error('refus attendu')
  return r.error
}

describe('export', () => {
  it('nomme le fichier avec la date locale', () => {
    expect(exportFileName(NOW)).toBe('codex-entre-terre-2026-11-01.json')
    expect(exportFileName(new Date(2027, 0, 5))).toBe('codex-entre-terre-2027-01-05.json')
  })

  it('contient version du schéma, date, version de l’application et état', () => {
    const doc = JSON.parse(buildExportFile(sampleState(), '0.1.0', NOW).content) as Doc
    expect(doc).toMatchObject({ app: 'codex-entre-terre', kind: 'export', schemaVersion: CURRENT_SCHEMA, appVersion: '0.1.0' })
    expect(typeof doc.exportedAt).toBe('string')
    expect(Object.keys(doc.state).sort()).toEqual(['criteria', 'layout', 'pins', 'preferences', 'profiles', 'quests', 'recentSearches'])
  })

  it('export puis import redonne exactement le même état', () => {
    const state = sampleState()
    const { content } = buildExportFile(state, '0.1.0', NOW)
    const parsed = parseDocument(content)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.state).toEqual(state)
      expect(parsed.value.migrated).toBe(false)
      expect(parsed.value.appVersion).toBe('0.1.0')
    }
  })
})

describe('refus sans effet', () => {
  it('refuse un JSON invalide, un tableau, un autre fichier', () => {
    expect(refusal('{pas du json').reason).toBe('json')
    expect(refusal('[1,2]').reason).toBe('not-codex')
    expect(refusal('{"app":"autre"}').reason).toBe('not-codex')
  })

  it('refuse une version inconnue', () => {
    for (const v of [0, -1, 1.5, '1', null]) {
      expect(refusal(exportedJson((d) => (d.schemaVersion = v))).reason).toBe('unknown-version')
    }
    expect(refusal(exportedJson((d) => delete d.schemaVersion)).reason).toBe('unknown-version')
  })

  it('refuse une version plus récente avec un message clair', () => {
    const r = refusal(exportedJson((d) => (d.schemaVersion = CURRENT_SCHEMA + 1)))
    expect(r.reason).toBe('newer-version')
    expect(r.message).toContain('plus récente')
  })

  it('refuse un fichier de plus de 1 Mo', () => {
    const big = JSON.stringify({ app: 'codex-entre-terre', padding: 'x'.repeat(LIMITS.maxImportBytes) })
    expect(refusal(big).reason).toBe('too-large')
  })

  it('refuse un document incomplet et liste les chemins fautifs', () => {
    const r = refusal(exportedJson((d) => delete d.state.pins))
    expect(r.reason).toBe('invalid')
    expect(r.issues.some((i) => i.path === 'document.state.pins')).toBe(true)
  })
})

describe('bornes', () => {
  const bad = (mutate: (d: Doc) => void): string[] => {
    const r = validateDocument(JSON.parse(exportedJson(mutate)))
    return r.ok ? [] : r.error.map((i) => i.path)
  }

  it('attributs de 1 à 99', () => {
    expect(bad((d) => (d.state.criteria.character.attributes.vig = 100))).toContain('document.state.criteria.character.attributes.vig')
    expect(bad((d) => (d.state.criteria.character.attributes.str = 0))).toContain('document.state.criteria.character.attributes.str')
    expect(bad((d) => (d.state.criteria.character.attributes.int = 12.5))).toContain('document.state.criteria.character.attributes.int')
    expect(bad((d) => (d.state.criteria.character.attributes.arc = '10'))).toContain('document.state.criteria.character.attributes.arc')
    expect(bad((d) => (d.state.criteria.character.attributes.arc = 99))).toEqual([])
  })

  it('niveau cible de 1 à 713', () => {
    expect(bad((d) => (d.state.criteria.target.level = 714))).toContain('document.state.criteria.target.level')
    expect(bad((d) => (d.state.criteria.target.level = 0))).toContain('document.state.criteria.target.level')
    expect(bad((d) => (d.state.criteria.target.level = 713))).toEqual([])
  })

  it('50 profils et 2 000 épinglés au plus', () => {
    const profiles = (d: Doc, n: number) => Array.from({ length: n }, (_, i) => ({ ...d.state.profiles.items[0], id: `p${i}` }))
    expect(bad((d) => (d.state.profiles.items = profiles(d, 51)))).toContain('document.state.profiles.items')
    expect(bad((d) => ((d.state.profiles.items = profiles(d, 50)), (d.state.profiles.activeId = 'p0')))).toEqual([])
    const pins = (n: number) => Array.from({ length: n }, (_, i) => ({ ref: `item:objet-${i}`, addedAt: '2026-11-01T10:00:00.000Z', done: false }))
    expect(bad((d) => (d.state.pins = pins(2001)))).toContain('document.state.pins')
    expect(bad((d) => (d.state.pins = pins(2000)))).toEqual([])
  })

  it('chaînes de 200 caractères au plus', () => {
    expect(bad((d) => (d.state.profiles.items[0].name = 'x'.repeat(201)))).toContain('document.state.profiles.items[0].name')
    expect(bad((d) => (d.state.profiles.items[0].name = 'x'.repeat(200)))).toEqual([])
    expect(bad((d) => (d.state.criteria.style.classes = ['y'.repeat(201)]))).toContain('document.state.criteria.style.classes[0]')
  })

  it('énumérations, références, doublons, profil actif', () => {
    expect(bad((d) => (d.state.criteria.style.mode = 'sword'))).toContain('document.state.criteria.style.mode')
    expect(bad((d) => (d.state.criteria.style.hands = 3))).toContain('document.state.criteria.style.hands')
    expect(bad((d) => (d.state.criteria.style.status = 'burn'))).toContain('document.state.criteria.style.status')
    expect(bad((d) => (d.state.criteria.progress.stage = 'tomorrow'))).toContain('document.state.criteria.progress.stage')
    expect(bad((d) => (d.state.criteria.content.base = false))).toContain('document.state.criteria.content.base')
    expect(bad((d) => (d.state.pins[0].ref = 'weapon:<script>'))).toContain('document.state.pins[0].ref')
    expect(bad((d) => (d.state.pins[0].ref = 'gadget:abc'))).toContain('document.state.pins[0].ref')
    expect(bad((d) => (d.state.pins[1].ref = d.state.pins[0].ref))).toContain('document.state.pins[1].ref')
    expect(bad((d) => (d.state.profiles.activeId = 'absent'))).toContain('document.state.profiles.activeId')
    expect(bad((d) => (d.state.layout.order = ['inconnu']))).toContain('document.state.layout.order[0]')
    expect(bad((d) => (d.state.layout.hidden = ['boss-order']))).toContain('document.state.layout.hidden')
    expect(bad((d) => (d.state.preferences.theme = 'rose'))).toContain('document.state.preferences.theme')
    expect(bad((d) => (d.state.preferences.catalogView = 'table'))).toContain('document.state.preferences.catalogView')
    expect(bad((d) => (d.state.preferences.catalogView = { weapons: 'mosaic' }))).toContain('document.state.preferences.catalogView["weapons"]')
    expect(bad((d) => (d.state.criteria.style.load = 'medium'))).toContain('document.state.criteria.style.load')
    expect(bad((d) => (d.state.recentSearches = Array.from({ length: 9 }, (_, i) => `r${i}`)))).toContain('document.state.recentSearches')
  })

  it('une référence absente des données ne bloque pas', () => {
    expect(bad((d) => (d.state.pins[0].ref = 'weapon:arme-qui-nexiste-pas'))).toEqual([])
  })
})

describe('quêtes cochées', () => {
  const bad = (mutate: (d: Doc) => void): string[] => {
    const r = validateDocument(JSON.parse(exportedJson(mutate)))
    return r.ok ? [] : r.error.map((i) => i.path)
  }
  const npcs = (n: number): Record<string, string[]> => Object.fromEntries(Array.from({ length: n }, (_, i) => [`pnj-${i}`, ['etape']]))

  it('300 PNJ, 200 étapes par PNJ, clés de 100 caractères au plus', () => {
    expect(bad((d) => (d.state.quests = npcs(301)))).toContain('document.state.quests')
    expect(bad((d) => (d.state.quests = npcs(300)))).toEqual([])
    const steps = (n: number): string[] => Array.from({ length: n }, (_, i) => `etape-${i}`)
    expect(bad((d) => (d.state.quests = { melina: steps(201) }))).toContain('document.state.quests["melina"]')
    expect(bad((d) => (d.state.quests = { melina: steps(200) }))).toEqual([])
    expect(bad((d) => (d.state.quests = { melina: ['x'.repeat(101)] }))).toContain('document.state.quests["melina"][0]')
    expect(bad((d) => (d.state.quests = { melina: ['x'.repeat(100)] }))).toEqual([])
  })

  it('refuse les types faux, les clés vides et les doublons', () => {
    expect(bad((d) => (d.state.quests = []))).toContain('document.state.quests')
    expect(bad((d) => (d.state.quests = { melina: 'a' }))).toContain('document.state.quests["melina"]')
    expect(bad((d) => (d.state.quests = { melina: [1] }))).toContain('document.state.quests["melina"][0]')
    expect(bad((d) => (d.state.quests = { melina: [''] }))).toContain('document.state.quests["melina"][0]')
    expect(bad((d) => (d.state.quests = { melina: ['a', 'a'] }))).toContain('document.state.quests["melina"][1]')
    expect(bad((d) => (d.state.quests = { ['x'.repeat(201)]: ['a'] }))).toContain('document.state.quests')
  })

  it('une tranche absente vaut « rien de coché » ; un PNJ sans étape est écarté', () => {
    const r = parseDocument(exportedJson((d) => delete d.state.quests))
    expect(r.ok && r.value.state.quests).toEqual({})
    const r2 = parseDocument(exportedJson((d) => (d.state.quests = { melina: [], boc: ['a'] })))
    expect(r2.ok && r2.value.state.quests).toEqual({ boc: ['a'] })
  })

  it('ignore __proto__ et reconstruit les listes', () => {
    const text = exportedJson().replace('"quests":{', '"quests":{"__proto__":["polluted"],')
    expect(text).toContain('"__proto__":["polluted"]')
    const r = parseDocument(text)
    expect(r.ok).toBe(true)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    if (r.ok) {
      expect(Object.hasOwn(r.value.state.quests, '__proto__')).toBe(false)
      expect(Object.getPrototypeOf(r.value.state.quests)).toBe(Object.prototype)
      expect(r.value.state.quests).toEqual(sampleState().quests)
    }
  })
})

describe('objets non fiables', () => {
  it('ignore __proto__ et les clés inconnues, sans pollution', () => {
    // JSON.stringify ne produit jamais « __proto__ » comme clé propre : le texte est assemblé à la main.
    const text = exportedJson()
      .replace('"catalogColumns":{', '"catalogColumns":{"__proto__":["polluted"],')
      .replace('{"app"', '{"__proto__":{"polluted":true},"extra":1,"app"')
    expect(text).toContain('"__proto__":{"polluted":true}')
    const r = parseDocument(text)
    expect(r.ok).toBe(true)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    if (r.ok) {
      expect(Object.keys(r.value.state)).not.toContain('extra')
      expect(Object.hasOwn(r.value.state.preferences.catalogColumns, '__proto__')).toBe(false)
      expect(Object.getPrototypeOf(r.value.state.preferences.catalogColumns)).toBe(Object.prototype)
      expect(Object.getPrototypeOf(r.value.state)).toBe(Object.prototype)
    }
  })

  it('reconstruit un objet neuf : les clés inconnues d’une section sont écartées', () => {
    const r = parseDocument(exportedJson((d) => (d.state.criteria.style.surprise = 'x')))
    expect(r.ok && 'surprise' in r.value.state.criteria.style).toBe(false)
  })
})

describe('migrations', () => {
  const step1 = (s: unknown) => ({ ...(s as object), one: true })
  const step2 = (s: unknown) => ({ ...(s as object), two: true })

  it('applique les étapes en chaîne, dans l’ordre', () => {
    const order: number[] = []
    const result = migrateState({ a: 1 }, 1, 3, {
      1: (s) => (order.push(1), step1(s)),
      2: (s) => (order.push(2), step2(s)),
    })
    expect(order).toEqual([1, 2])
    expect(result).toEqual({ a: 1, one: true, two: true })
  })

  it('ne fait rien si la version est déjà la bonne', () => {
    expect(migrateState({ a: 1 }, 2, 2, { 1: step1, 2: step2 })).toEqual({ a: 1 })
  })

  it('échoue si une étape manque ou lève', () => {
    expect(canMigrate(1, 3, { 1: step1 })).toBe(false)
    expect(canMigrate(1, 3, { 1: step1, 2: step2 })).toBe(true)
    expect(() => migrateState({}, 1, 3, { 1: step1 })).toThrow(MigrationError)
    expect(() =>
      migrateState({}, 1, 2, {
        1: () => {
          throw new Error('boum')
        },
      }),
    ).toThrow(/boum/)
  })

  it('importe un document d’une version plus ancienne après migration', () => {
    // Schéma fictif 2 : la version 1 stockait le thème sous « dark » ou « light ».
    const v1 = exportedJson((d) => (d.state.preferences.theme = 'dark'))
    const only = {
      1: (state: unknown) => {
        const s = structuredClone(state) as Doc
        s.preferences.theme = s.preferences.theme === 'dark' ? 'sombre' : 'parchemin'
        return s
      },
    }
    const r = parseDocument(v1, { currentSchema: 2, migrations: only })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.migrated).toBe(true)
      expect(r.value.fromVersion).toBe(1)
      expect(r.value.state.preferences.theme).toBe('sombre')
    }
    // Sans la chaîne complète, la version est refusée comme inconnue, sans migration partielle.
    expect(refusal(v1, { currentSchema: 3, migrations: only }).reason).toBe('unknown-version')
  })

  it('refuse le résultat d’une migration qui produit un état invalide', () => {
    const r = refusal(exportedJson(), { currentSchema: 2, migrations: { 1: () => ({ cassé: true }) } })
    expect(r.reason).toBe('invalid')
  })
})
