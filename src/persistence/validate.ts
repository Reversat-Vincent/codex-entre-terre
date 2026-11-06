// Validation complète d'un document d'état (stockage local ou fichier importé) : chemins, types, énumérations, bornes.
// Un document n'est jamais fiable : l'objet renvoyé est reconstruit clé par clé depuis les clés connues, jamais copié ;
// toute clé inconnue est ignorée et `__proto__` n'est jamais lu (docs/architecture.md § 7, règles de sécurité).

import { ENTITY_KINDS } from '../data/datasets.ts'
import type { EntityRef } from '../data/datasets.ts'
import { ATTRIBUTE_KEYS, STATUS_KEYS } from '../data/keys.ts'
import { ARCHETYPE_IDS } from '../engine/config/archetypes.ts'
import { isWidgetId } from '../widgets/ids.ts'
import type { WidgetId } from '../widgets/ids.ts'
import { CURRENT_SCHEMA } from './schema.ts'
import { CATALOG_VIEWS, LIMITS, LOADS, NAV_RAIL_MODES, PROGRESS_MODES, STAGE_IDS, STONE_PREFERENCES, STYLE_MODES, THEMES } from './model.ts'
import type { Attributes, CatalogView, Criteria, LayoutSlice, PersistedState, PinRecord, PreferencesSlice, ProfileRecord, ProfilesSlice, QuestsSlice, Result, ValidationIssue } from './model.ts'

/** Nombre maximal d'écarts conservés : au-delà, le fichier est de toute façon refusé. */
const MAX_ISSUES = 50

/** Contexte de validation : accumule les écarts. */
interface Ctx {
  issues: ValidationIssue[]
  /** Nombre total d'écarts, y compris ceux qui ne sont plus listés. */
  count: number
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const typeName = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'liste' : typeof v)

function fail(ctx: Ctx, path: string, message: string): void {
  ctx.count++
  if (ctx.issues.length < MAX_ISSUES) ctx.issues.push({ path, message })
}

/** Lit une clé propre d'un objet : jamais la chaîne de prototypes, jamais `__proto__`. */
function own(obj: Record<string, unknown>, key: string): unknown {
  return key !== '__proto__' && Object.hasOwn(obj, key) ? obj[key] : undefined
}

function readRecord(v: unknown, path: string, ctx: Ctx): Record<string, unknown> | null {
  if (isRecord(v)) return v
  fail(ctx, path, `objet attendu, ${typeName(v)} trouvé`)
  return null
}

function readString(v: unknown, path: string, ctx: Ctx, opts: { min?: number } = {}): string | null {
  if (typeof v !== 'string') {
    fail(ctx, path, `chaîne attendue, ${typeName(v)} trouvé`)
    return null
  }
  if (v.length > LIMITS.maxString) {
    fail(ctx, path, `chaîne trop longue (${v.length} caractères, ${LIMITS.maxString} au plus)`)
    return null
  }
  // Longueur minimale facultative : 0 veut dire « pas de seuil » (borne de validation, pas une valeur du jeu).
  if (v.length < (opts.min ?? 0)) {
    fail(ctx, path, 'chaîne vide')
    return null
  }
  return v
}

function readDate(v: unknown, path: string, ctx: Ctx): string | null {
  const s = readString(v, path, ctx, { min: 1 })
  if (s !== null && Number.isNaN(Date.parse(s))) {
    fail(ctx, path, 'date illisible')
    return null
  }
  return s
}

function readBool(v: unknown, path: string, ctx: Ctx): boolean | null {
  if (typeof v === 'boolean') return v
  fail(ctx, path, `booléen attendu, ${typeName(v)} trouvé`)
  return null
}

function readInt(v: unknown, path: string, ctx: Ctx, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    fail(ctx, path, `entier attendu, ${typeof v === 'number' ? String(v) : typeName(v)} trouvé`)
    return null
  }
  if (v < min || v > max) {
    fail(ctx, path, `valeur ${v} hors des bornes ${min} à ${max}`)
    return null
  }
  return v
}

function readEnum<T extends string>(v: unknown, path: string, ctx: Ctx, values: readonly T[]): T | null {
  if (typeof v === 'string' && (values as readonly string[]).includes(v)) return v as T
  fail(ctx, path, `valeur attendue parmi ${values.join(', ')}`)
  return null
}

/** Liste bornée dont chaque élément est lu par `item` ; les éléments invalides sont signalés et écartés. */
function readList<T>(v: unknown, path: string, ctx: Ctx, max: number, item: (x: unknown, p: string) => T | null): T[] | null {
  if (!Array.isArray(v)) {
    fail(ctx, path, `liste attendue, ${typeName(v)} trouvé`)
    return null
  }
  if (v.length > max) {
    fail(ctx, path, `liste trop longue (${v.length} éléments, ${max} au plus)`)
    return null
  }
  const out: T[] = []
  v.forEach((x, i) => {
    const r = item(x, `${path}[${i}]`)
    if (r !== null) out.push(r)
  })
  return out
}

const stringList = (v: unknown, path: string, ctx: Ctx, max: number): string[] | null =>
  readList(v, path, ctx, max, (x, p) => readString(x, p, ctx, { min: 1 }))

/** Forme d'une référence : genre connu, identifiant slug (l'existence dans les données n'est pas contrôlée, § 7). */
const REF_PATTERN = new RegExp(`^(${ENTITY_KINDS.join('|')}):[a-z0-9]+(?:-[a-z0-9]+)*$`)

function readRef(v: unknown, path: string, ctx: Ctx): EntityRef | null {
  const s = readString(v, path, ctx, { min: 1 })
  if (s === null) return null
  if (!REF_PATTERN.test(s)) {
    fail(ctx, path, 'référence invalide (attendu « genre:identifiant »)')
    return null
  }
  return s as EntityRef
}

function readAttributes(v: unknown, path: string, ctx: Ctx): Attributes | null {
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const out = {} as Attributes
  let ok = true
  for (const key of ATTRIBUTE_KEYS) {
    const n = readInt(own(rec, key), `${path}.${key}`, ctx, LIMITS.attributeMin, LIMITS.attributeMax)
    if (n === null) ok = false
    else out[key] = n
  }
  return ok ? out : null
}

/**
 * Valide des critères et les reconstruit.
 * @param v Valeur lue.
 * @param path Chemin pour les messages.
 * @param ctx Contexte d'accumulation des écarts.
 * @returns Les critères reconstruits, ou `null` s'il y a un écart.
 */
function readCriteria(v: unknown, path: string, ctx: Ctx): Criteria | null {
  const root = readRecord(v, path, ctx)
  if (!root) return null
  const before = ctx.count

  const contentRec = readRecord(own(root, 'content'), `${path}.content`, ctx)
  let content: Criteria['content'] | null = null
  if (contentRec) {
    if (own(contentRec, 'base') !== true) fail(ctx, `${path}.content.base`, 'le jeu de base est toujours actif (true attendu)')
    const sote = readBool(own(contentRec, 'sote'), `${path}.content.sote`, ctx)
    const tp = readBool(own(contentRec, 'tp'), `${path}.content.tp`, ctx)
    if (sote !== null && tp !== null) content = { base: true, sote, tp }
  }

  const charRec = readRecord(own(root, 'character'), `${path}.character`, ctx)
  let character: Criteria['character'] | null = null
  if (charRec) {
    const origin = readString(own(charRec, 'origin'), `${path}.character.origin`, ctx, { min: 1 })
    const attributes = readAttributes(own(charRec, 'attributes'), `${path}.character.attributes`, ctx)
    if (origin !== null && attributes) character = { origin, attributes }
  }

  const targetRec = readRecord(own(root, 'target'), `${path}.target`, ctx)
  let target: Criteria['target'] | null = null
  if (targetRec) {
    const rawArch = own(targetRec, 'archetype')
    // Ensemble connu (config/archetypes.ts) : `constructor`, `__proto__`, `toString`… sont refusés au lieu de passer pour une chaîne non vide.
    const archetype = rawArch === null ? null : readEnum(rawArch, `${path}.target.archetype`, ctx, ARCHETYPE_IDS)
    const level = readInt(own(targetRec, 'level'), `${path}.target.level`, ctx, LIMITS.levelMin, LIMITS.levelMax)
    if ((rawArch === null || archetype !== null) && level !== null) target = { archetype, level }
  }

  const styleRec = readRecord(own(root, 'style'), `${path}.style`, ctx)
  let style: Criteria['style'] | null = null
  if (styleRec) {
    const mode = readEnum(own(styleRec, 'mode'), `${path}.style.mode`, ctx, STYLE_MODES)
    const classes = stringList(own(styleRec, 'classes'), `${path}.style.classes`, ctx, LIMITS.maxCriteriaList)
    const rawHands = own(styleRec, 'hands')
    const hands = rawHands === 1 || rawHands === 2 ? rawHands : null
    if (hands === null) fail(ctx, `${path}.style.hands`, 'nombre 1 ou 2 attendu')
    const rawStatus = own(styleRec, 'status')
    const status = rawStatus === null ? null : readEnum(rawStatus, `${path}.style.status`, ctx, STATUS_KEYS)
    const load = readEnum(own(styleRec, 'load'), `${path}.style.load`, ctx, LOADS)
    if (mode && classes && hands && (rawStatus === null || status !== null) && load) {
      style = { mode, classes, hands, status, load }
    }
  }

  const progRec = readRecord(own(root, 'progress'), `${path}.progress`, ctx)
  let progress: Criteria['progress'] | null = null
  if (progRec) {
    const mode = readEnum(own(progRec, 'mode'), `${path}.progress.mode`, ctx, PROGRESS_MODES)
    const stage = readEnum(own(progRec, 'stage'), `${path}.progress.stage`, ctx, STAGE_IDS)
    const regions = stringList(own(progRec, 'regions'), `${path}.progress.regions`, ctx, LIMITS.maxCriteriaList)
    const defeated = stringList(own(progRec, 'defeated'), `${path}.progress.defeated`, ctx, LIMITS.maxCriteriaList)
    if (mode && stage && regions && defeated) progress = { mode, stage, regions, defeated }
  }

  const consRec = readRecord(own(root, 'constraints'), `${path}.constraints`, ctx)
  let constraints: Criteria['constraints'] | null = null
  if (consRec) {
    const excludeRemembrance = readBool(own(consRec, 'excludeRemembrance'), `${path}.constraints.excludeRemembrance`, ctx)
    const excludeRandomDrop = readBool(own(consRec, 'excludeRandomDrop'), `${path}.constraints.excludeRandomDrop`, ctx)
    const excludeQuest = readBool(own(consRec, 'excludeQuest'), `${path}.constraints.excludeQuest`, ctx)
    const stonePreference = readEnum(own(consRec, 'stonePreference'), `${path}.constraints.stonePreference`, ctx, STONE_PREFERENCES)
    if (excludeRemembrance !== null && excludeRandomDrop !== null && excludeQuest !== null && stonePreference) {
      constraints = { excludeRemembrance, excludeRandomDrop, excludeQuest, stonePreference }
    }
  }

  const relRec = readRecord(own(root, 'reliability'), `${path}.reliability`, ctx)
  let reliability: Criteria['reliability'] | null = null
  if (relRec) {
    const includeEstimates = readBool(own(relRec, 'includeEstimates'), `${path}.reliability.includeEstimates`, ctx)
    if (includeEstimates !== null) reliability = { includeEstimates }
  }

  if (ctx.count > before || !content || !character || !target || !style || !progress || !constraints || !reliability) return null
  return { content, character, target, style, progress, constraints, reliability }
}

function readProfiles(v: unknown, path: string, ctx: Ctx): ProfilesSlice | null {
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const seen = new Set<string>()
  const items = readList<ProfileRecord>(own(rec, 'items'), `${path}.items`, ctx, LIMITS.maxProfiles, (x, p) => {
    const r = readRecord(x, p, ctx)
    if (!r) return null
    const id = readString(own(r, 'id'), `${p}.id`, ctx, { min: 1 })
    const name = readString(own(r, 'name'), `${p}.name`, ctx, { min: 1 })
    const criteria = readCriteria(own(r, 'criteria'), `${p}.criteria`, ctx)
    const savedAt = readDate(own(r, 'savedAt'), `${p}.savedAt`, ctx)
    if (id !== null && seen.has(id)) {
      fail(ctx, `${p}.id`, 'identifiant de profil en double')
      return null
    }
    if (id === null || name === null || !criteria || savedAt === null) return null
    seen.add(id)
    return { id, name, criteria, savedAt }
  })
  const rawActive = own(rec, 'activeId')
  const activeId = rawActive === null ? null : readString(rawActive, `${path}.activeId`, ctx, { min: 1 })
  if (activeId !== null && !seen.has(activeId)) fail(ctx, `${path}.activeId`, 'le profil actif n’existe pas')
  if (!items || (rawActive !== null && activeId === null) || (activeId !== null && !seen.has(activeId))) return null
  return { items, activeId }
}

function readPins(v: unknown, path: string, ctx: Ctx): PinRecord[] | null {
  const seen = new Set<string>()
  return readList<PinRecord>(v, path, ctx, LIMITS.maxPins, (x, p) => {
    const r = readRecord(x, p, ctx)
    if (!r) return null
    const ref = readRef(own(r, 'ref'), `${p}.ref`, ctx)
    const addedAt = readDate(own(r, 'addedAt'), `${p}.addedAt`, ctx)
    const done = readBool(own(r, 'done'), `${p}.done`, ctx)
    if (ref !== null && seen.has(ref)) {
      fail(ctx, `${p}.ref`, 'élément épinglé en double')
      return null
    }
    if (ref === null || addedAt === null || done === null) return null
    seen.add(ref)
    return { ref, addedAt, done }
  })
}

/**
 * Étapes de quête cochées : objet borné (300 PNJ), clé de PNJ non vide de 200 caractères au plus, liste de 200 clés d'étape au plus
 * (non vides, 100 caractères au plus, sans doublon). Un PNJ sans étape est écarté sans écart signalé ; l'objet rendu n'a pas de prototype partagé
 * avec le fichier lu et `__proto__` n'est jamais copié.
 * Une tranche absente du document (enregistré avant l'ajout des quêtes, le schéma n'ayant pas changé de version) vaut « aucune étape cochée ».
 */
function readQuests(v: unknown, path: string, ctx: Ctx): QuestsSlice | null {
  if (v === undefined) return {}
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const keys = Object.keys(rec)
  if (keys.length > LIMITS.maxQuestNpcs) {
    fail(ctx, path, `trop de PNJ (${keys.length}, ${LIMITS.maxQuestNpcs} au plus)`)
    return null
  }
  const out: QuestsSlice = {}
  let ok = true
  for (const key of keys) {
    if (key === '__proto__') continue
    const at = `${path}[${JSON.stringify(key.slice(0, 40))}]`
    if (key.length === 0 || key.length > LIMITS.maxString) {
      fail(ctx, path, 'identifiant de PNJ invalide')
      ok = false
      continue
    }
    const seen = new Set<string>()
    const steps = readList<string>(rec[key], at, ctx, LIMITS.maxQuestSteps, (x, p) => {
      if (typeof x !== 'string' || x.length === 0) {
        fail(ctx, p, typeof x === 'string' ? 'clé d’étape vide' : `chaîne attendue, ${typeName(x)} trouvé`)
        return null
      }
      if (x.length > LIMITS.maxQuestKey) {
        fail(ctx, p, `clé d’étape trop longue (${x.length} caractères, ${LIMITS.maxQuestKey} au plus)`)
        return null
      }
      if (seen.has(x)) {
        fail(ctx, p, 'étape cochée en double')
        return null
      }
      seen.add(x)
      return x
    })
    if (steps === null) ok = false
    else if (steps.length > 0) Object.defineProperty(out, key, { value: steps, enumerable: true, writable: true, configurable: true })
  }
  return ok ? out : null
}

function readWidgetList(v: unknown, path: string, ctx: Ctx): WidgetId[] | null {
  const seen = new Set<string>()
  return readList<WidgetId>(v, path, ctx, 100, (x, p) => {
    if (!isWidgetId(x)) {
      fail(ctx, p, 'identifiant de widget inconnu')
      return null
    }
    if (seen.has(x)) {
      fail(ctx, p, 'identifiant de widget en double')
      return null
    }
    seen.add(x)
    return x
  })
}

function readLayout(v: unknown, path: string, ctx: Ctx): LayoutSlice | null {
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const order = readWidgetList(own(rec, 'order'), `${path}.order`, ctx)
  const hidden = readWidgetList(own(rec, 'hidden'), `${path}.hidden`, ctx)
  const collapsed = readWidgetList(own(rec, 'collapsed'), `${path}.collapsed`, ctx)
  const collapsedMobile = readWidgetList(own(rec, 'collapsedMobile'), `${path}.collapsedMobile`, ctx)
  if (order && hidden) {
    for (const id of hidden) if (order.includes(id)) fail(ctx, `${path}.hidden`, `le widget « ${id} » est à la fois affiché et retiré`)
  }
  if (!order || !hidden || !collapsed || !collapsedMobile) return null
  return { order, hidden, collapsed, collapsedMobile }
}

/** Affichage par catalogue (D32) : objet borné, clés non vides de 200 caractères au plus, valeurs `table` ou `grid`. */
function readCatalogViews(v: unknown, path: string, ctx: Ctx): Record<string, CatalogView> | null {
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const keys = Object.keys(rec)
  if (keys.length > LIMITS.maxCatalogs) {
    fail(ctx, path, `trop de catalogues (${keys.length}, ${LIMITS.maxCatalogs} au plus)`)
    return null
  }
  const out: Record<string, CatalogView> = {}
  let ok = true
  for (const key of keys) {
    if (key === '__proto__') continue
    if (key.length > LIMITS.maxString || key.length === 0) {
      fail(ctx, path, 'nom de catalogue invalide')
      ok = false
      continue
    }
    const view = readEnum(rec[key], `${path}[${JSON.stringify(key)}]`, ctx, CATALOG_VIEWS)
    if (view) out[key] = view
    else ok = false
  }
  return ok ? out : null
}

function readPreferences(v: unknown, path: string, ctx: Ctx): PreferencesSlice | null {
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const theme = readEnum(own(rec, 'theme'), `${path}.theme`, ctx, THEMES)
  const navRail = readEnum(own(rec, 'navRail'), `${path}.navRail`, ctx, NAV_RAIL_MODES)
  const criteriaCollapsed = readBool(own(rec, 'criteriaCollapsed'), `${path}.criteriaCollapsed`, ctx)
  const catalogView = readCatalogViews(own(rec, 'catalogView'), `${path}.catalogView`, ctx)

  let catalogColumns: Record<string, string[]> | null = null
  const colsRec = readRecord(own(rec, 'catalogColumns'), `${path}.catalogColumns`, ctx)
  if (colsRec) {
    const keys = Object.keys(colsRec)
    if (keys.length > LIMITS.maxCatalogs) {
      fail(ctx, `${path}.catalogColumns`, `trop de catalogues (${keys.length}, ${LIMITS.maxCatalogs} au plus)`)
    } else {
      const out: Record<string, string[]> = {}
      let ok = true
      for (const key of keys) {
        if (key === '__proto__') continue
        if (key.length > LIMITS.maxString || key.length === 0) {
          fail(ctx, `${path}.catalogColumns`, 'nom de catalogue invalide')
          ok = false
          continue
        }
        const list = stringList(colsRec[key], `${path}.catalogColumns[${JSON.stringify(key)}]`, ctx, LIMITS.maxCatalogColumns)
        if (list) out[key] = list
        else ok = false
      }
      if (ok) catalogColumns = out
    }
  }
  if (!theme || !navRail || criteriaCollapsed === null || !catalogView || !catalogColumns) return null
  return { theme, navRail, criteriaCollapsed, catalogView, catalogColumns }
}

function readRecentSearches(v: unknown, path: string, ctx: Ctx): string[] | null {
  return stringList(v, path, ctx, LIMITS.maxRecentSearches)
}

/**
 * Valide la valeur `state` d'un document et la reconstruit.
 * @param v Valeur lue (`document.state`).
 * @param path Chemin de départ dans les messages.
 * @param ctx Contexte d'accumulation des écarts.
 * @returns L'état reconstruit, ou `null` s'il y a au moins un écart.
 */
function readState(v: unknown, path: string, ctx: Ctx): PersistedState | null {
  const rec = readRecord(v, path, ctx)
  if (!rec) return null
  const before = ctx.count
  const criteria = readCriteria(own(rec, 'criteria'), `${path}.criteria`, ctx)
  const profiles = readProfiles(own(rec, 'profiles'), `${path}.profiles`, ctx)
  const pins = readPins(own(rec, 'pins'), `${path}.pins`, ctx)
  const quests = readQuests(own(rec, 'quests'), `${path}.quests`, ctx)
  const layout = readLayout(own(rec, 'layout'), `${path}.layout`, ctx)
  const preferences = readPreferences(own(rec, 'preferences'), `${path}.preferences`, ctx)
  const recentSearches = readRecentSearches(own(rec, 'recentSearches'), `${path}.recentSearches`, ctx)
  if (ctx.count > before || !criteria || !profiles || !pins || !quests || !layout || !preferences || !recentSearches) return null
  return { criteria, profiles, pins, quests, layout, preferences, recentSearches }
}

function finish<T>(value: T | null, ctx: Ctx): Result<T, ValidationIssue[]> {
  if (value !== null && ctx.count === 0) return { ok: true, value }
  const issues = ctx.issues.slice()
  if (ctx.count > issues.length) issues.push({ path: '', message: `… et ${ctx.count - issues.length} autre(s) écart(s)` })
  return { ok: false, error: issues }
}

/**
 * Valide un état seul (sans enveloppe de document) : copie d'annulation, tranche déjà extraite d'un document.
 * @param x Valeur inconnue.
 * @returns L'état reconstruit, ou la liste des écarts.
 */
export function validateState(x: unknown): Result<PersistedState, ValidationIssue[]> {
  const ctx: Ctx = { issues: [], count: 0 }
  return finish(readState(x, 'state', ctx), ctx)
}

/**
 * Valide entièrement un document d'état, enregistré (`savedAt`) ou exporté (`kind: 'export'`, `exportedAt`), de la version de schéma indiquée.
 * Aucune écriture ni effet de bord : le résultat est un objet neuf, reconstruit depuis les clés connues (`__proto__` ignoré, clés inconnues écartées).
 * Les versions différentes de `schema` doivent être migrées avant (voir `parseDocument`).
 * @param x Valeur inconnue (typiquement le résultat de `JSON.parse`).
 * @param schema Version de schéma attendue ; `CURRENT_SCHEMA` par défaut.
 * @returns L'état validé, ou tous les écarts (chemin, explication).
 */
export function validateDocument(x: unknown, schema: number = CURRENT_SCHEMA): Result<PersistedState, ValidationIssue[]> {
  const ctx: Ctx = { issues: [], count: 0 }
  const doc = readRecord(x, 'document', ctx)
  if (!doc) return finish<PersistedState>(null, ctx)
  if (own(doc, 'app') !== 'codex-entre-terre') fail(ctx, 'document.app', 'ce fichier n’est pas une sauvegarde du Codex de l’Entre-terre')
  if (own(doc, 'schemaVersion') !== schema) fail(ctx, 'document.schemaVersion', `version de schéma ${schema} attendue`)
  const kind = own(doc, 'kind')
  if (kind !== undefined && kind !== 'export') fail(ctx, 'document.kind', 'type de document inconnu')
  const stamp = kind === 'export' ? 'exportedAt' : 'savedAt'
  readDate(own(doc, stamp), `document.${stamp}`, ctx)
  readString(own(doc, 'appVersion'), 'document.appVersion', ctx, { min: 1 })
  const state = readState(own(doc, 'state'), 'document.state', ctx)
  return finish(state, ctx)
}
