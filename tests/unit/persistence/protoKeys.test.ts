// Tests de la validation face aux clés de prototype : chaque champ qui désigne une valeur d'un ensemble connu refuse `constructor`, `__proto__`,
// `toString`, `valueOf` et `hasOwnProperty` ; les champs dont l'ensemble dépend des données gardent la validation de forme (le moteur les lit par clé propre).
import { describe, expect, it } from 'vitest'
import { buildExportFile, parseDocument } from '../../../src/persistence/document.ts'
import { validateDocument } from '../../../src/persistence/validate.ts'
import { sampleState } from './helpers.ts'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const PROTO_KEYS = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'] as const

/** Document d'export d'exemple, modifié par `mutate`, passé par JSON comme un vrai fichier. */
function doc(mutate: (d: Doc) => void): unknown {
  const d = JSON.parse(buildExportFile(sampleState(), '0.1.0', new Date(2026, 10, 1)).content) as Doc
  mutate(d)
  return JSON.parse(JSON.stringify(d))
}

/** Chemins en écart du document modifié (liste vide = document accepté). */
function paths(mutate: (d: Doc) => void): string[] {
  const r = validateDocument(doc(mutate))
  return r.ok ? [] : r.error.map((i) => i.path)
}

/** Champs à valeur d'un ensemble connu : chemin attendu dans les écarts et écriture de la valeur. */
const ENUM_FIELDS: readonly { name: string; path: string; set: (d: Doc, v: string) => void }[] = [
  { name: 'archétype', path: 'document.state.criteria.target.archetype', set: (d, v) => (d.state.criteria.target.archetype = v) },
  { name: 'mode de style', path: 'document.state.criteria.style.mode', set: (d, v) => (d.state.criteria.style.mode = v) },
  { name: 'statut', path: 'document.state.criteria.style.status', set: (d, v) => (d.state.criteria.style.status = v) },
  { name: 'charge', path: 'document.state.criteria.style.load', set: (d, v) => (d.state.criteria.style.load = v) },
  { name: 'mode de progression', path: 'document.state.criteria.progress.mode', set: (d, v) => (d.state.criteria.progress.mode = v) },
  { name: 'étape', path: 'document.state.criteria.progress.stage', set: (d, v) => (d.state.criteria.progress.stage = v) },
  { name: 'préférence de pierres', path: 'document.state.criteria.constraints.stonePreference', set: (d, v) => (d.state.criteria.constraints.stonePreference = v) },
  { name: 'thème', path: 'document.state.preferences.theme', set: (d, v) => (d.state.preferences.theme = v) },
  { name: 'rail', path: 'document.state.preferences.navRail', set: (d, v) => (d.state.preferences.navRail = v) },
  { name: 'vue de catalogue', path: 'document.state.preferences.catalogView["weapons"]', set: (d, v) => (d.state.preferences.catalogView = { weapons: v }) },
  { name: 'widget de l’ordre', path: 'document.state.layout.order[0]', set: (d, v) => (d.state.layout.order = [v]) },
  { name: 'widget retiré', path: 'document.state.layout.hidden[0]', set: (d, v) => (d.state.layout.hidden = [v]) },
  { name: 'widget réduit', path: 'document.state.layout.collapsed[0]', set: (d, v) => (d.state.layout.collapsed = [v]) },
  { name: 'widget réduit (mobile)', path: 'document.state.layout.collapsedMobile[0]', set: (d, v) => (d.state.layout.collapsedMobile = [v]) },
]

describe.each(ENUM_FIELDS)('champ « $name »', ({ path, set }) => {
  it.each(PROTO_KEYS)('refuse « %s »', (key) => {
    expect(paths((d) => set(d, key))).toContain(path)
  })
})

describe('archétype', () => {
  it('accepte null et chacun des dix archétypes, refuse un nom inconnu', () => {
    expect(paths((d) => (d.state.criteria.target.archetype = null))).toEqual([])
    for (const id of ['str', 'dex', 'qual', 'int', 'fai', 'arc', 'dexarc', 'intdex', 'intfai', 'strfai']) {
      expect(paths((d) => (d.state.criteria.target.archetype = id)), id).toEqual([])
    }
    expect(paths((d) => (d.state.criteria.target.archetype = 'mage'))).toContain('document.state.criteria.target.archetype')
  })

  it('refuse aussi les profils enregistrés et le fichier lu de bout en bout', () => {
    expect(paths((d) => (d.state.profiles.items[0].criteria.target.archetype = 'constructor'))).toContain(
      'document.state.profiles.items[0].criteria.target.archetype',
    )
    const text = JSON.stringify(doc((d) => (d.state.criteria.target.archetype = 'constructor')))
    const r = parseDocument(text)
    expect(r.ok).toBe(false)
  })
})

describe('identifiants qui dépendent des données', () => {
  it('gardent la validation de forme : un nom de prototype est une chaîne comme une autre', () => {
    for (const key of PROTO_KEYS) {
      const r = validateDocument(
        doc((d) => {
          d.state.criteria.character.origin = key
          d.state.criteria.style.classes = [key]
          d.state.criteria.progress.regions = [key]
          d.state.criteria.progress.defeated = [key]
        }),
      )
      expect(r.ok, key).toBe(true)
      if (r.ok) {
        expect(r.value.criteria.character.origin).toBe(key)
        expect(r.value.criteria.progress.regions).toEqual([key])
      }
    }
  })

  it('un nom de prototype n’est jamais une référence d’entité valide', () => {
    for (const key of PROTO_KEYS) expect(paths((d) => (d.state.pins[0].ref = key)), key).toContain('document.state.pins[0].ref')
  })
})
