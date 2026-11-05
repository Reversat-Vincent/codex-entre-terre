// Préparation en mémoire : contrôles bloquants, transformations et champs dérivés, puis fichiers produits (sans écriture disque).
// Fonction pure de `RawDataset` vers les fichiers : la préparation (prepare-data.ts) et les tests l'appellent de la même façon.
// Références : docs/architecture.md § 3.2 à § 3.5, docs/contenu/decisions-progression.md § 1.4.

import { DATASETS, DATASET_KEYS, ENTITY_KINDS, datasetsOfKind } from '../../src/data/datasets.ts'
import type { DatasetKey } from '../../src/data/datasets.ts'
import { ORIGIN_ATTRIBUTE_FIELD, ATTRIBUTE_KEYS, WEAPON_ATTRIBUTE_KEYS } from '../../src/data/keys.ts'
import type { BossRaw, EncounterIdentity } from '../../src/data/types/bosses.ts'
import type {
  Acquisition,
  AcquisitionDerived,
  AcquisitionMethod,
  DatasetFile,
  InvaderDrop,
  Transform,
} from '../../src/data/types/common.ts'
import type { DatasetFileMap } from '../../src/data/types/index.ts'
import type { KeyItemRaw } from '../../src/data/types/keyItems.ts'
import type { LocationRaw } from '../../src/data/types/locations.ts'
import type { NpcRaw } from '../../src/data/types/npcs.ts'
import { NPC_RICH_FIELDS } from '../../src/data/types/npcs.ts'
import type { OriginRaw } from '../../src/data/types/origins.ts'
import { validate } from '../../src/data/types/schema.ts'
import type { SearchDoc } from '../../src/data/types/searchIndex.ts'
import type { CalcTables } from '../../src/data/types/tables.ts'
import type { WeaponMeta, WeaponRaw } from '../../src/data/types/weapon.ts'
import { extractCalcTables } from './calcTables.ts'
import { assertNoFailures, bump, emptyReport } from './checks.ts'
import type { DataReport } from './checks.ts'
import { displayNames, duplicatesOf, encounterIds, entryId } from './ids.ts'
import type { RawDataset } from './io.ts'
import { KNOWN_REGIONS, KNOWN_REGION_COUNT } from './knownRegions.ts'
import { normalizeMethod } from './methods.ts'
import { buildRegionContext, deriveRegions } from './regions.ts'
import type { RegionNotes } from './regions.ts'
import { DATASET_SCHEMAS } from './schemas.ts'
import { buildSearchIndex } from './searchIndex.ts'
import { mergeKeyItemDuplicates, toRichSection } from './transforms.ts'
import { deriveInconsistent, deriveUpgrade } from './upgrade.ts'

/** Plafond du coefficient de scaling d'un tableau d'amélioration (docs/architecture.md § 3.5, cas Horn Bow). */
export const MAX_SCALING_COEF = 3
/** Constante de la méthode « Origine optimale » de calculs.md : niveau = Σ attributs − 79. */
export const LEVEL_OFFSET = 79
/** Rang des boss dont le butin alimente `invaderDrop`. */
export const INVADER_TIER = 'Invaders and other minibosses'

const WEAPON_KEYS = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const

/** Résultat de la préparation. */
export interface PreparedData {
  readonly datasets: DatasetFileMap
  readonly tables: CalcTables
  readonly search: SearchDoc[]
  /** Date d'extraction commune (`metadata.retrieved`). */
  readonly retrieved: string
  readonly report: DataReport
}

type AnyRaw = Record<string, unknown> & { readonly name?: string; readonly wiki_page?: string; readonly title?: string }

/**
 * Prépare toutes les données.
 * @param raw Les 18 fichiers bruts lus par `readRawDatasets`.
 * @returns Les fichiers préparés, les tables, l'index de recherche et le rapport non bloquant.
 * @throws DataCheckError au premier contrôle bloquant échoué (message clair, rien n'est corrigé).
 */
export function prepareAll(raw: Readonly<Record<DatasetKey, RawDataset>>): PreparedData {
  const report = emptyReport()

  // 1. Champs et types conformes aux types (schémas), `source` dans l'énumération, `url` vers le wiki.
  const schemaFailures: string[] = []
  const idCollisions: string[] = []
  for (const key of DATASET_KEYS) {
    const { entry, meta } = DATASET_SCHEMAS[key]
    const ds = raw[key]
    for (const i of validate(meta, ds.metadata, `${key}.metadata`)) schemaFailures.push(`${i.path} : ${i.message}`)
    ds.entries.forEach((e, n) => {
      if (typeof e === 'object' && e !== null && ('id' in e || 'derived' in e)) {
        idCollisions.push(`${key}[${n}] : l'entrée a déjà une clé id ou derived`)
      }
      for (const i of validate(entry, e, `${key}[${n}]`)) schemaFailures.push(`${i.path} : ${i.message}`)
    })
  }
  assertNoFailures('aucune entrée ne porte déjà id ou derived', idCollisions)
  assertNoFailures('champs et types conformes aux types, source dans l’énumération, url vers eldenring.wiki.gg', schemaFailures)

  const entriesOf = <T>(key: DatasetKey): readonly T[] => raw[key].entries as readonly T[]
  const metaOf = <M>(key: DatasetKey): M => raw[key].metadata as M

  // Date d'extraction commune.
  const dates = [...new Set(DATASET_KEYS.map((k) => (raw[k].metadata as { retrieved: string }).retrieved))].sort()
  const retrieved = dates[dates.length - 1] ?? ''

  // 2. Doublons de key_items fusionnés (contenu différent : échec).
  const merged = mergeKeyItemDuplicates(entriesOf<KeyItemRaw>('key_items'))
  assertNoFailures('doublons de key_items identiques hors category', merged.conflicts)
  const listOf = (key: DatasetKey): readonly AnyRaw[] =>
    key === 'key_items' ? (merged.entries as unknown as readonly AnyRaw[]) : entriesOf<AnyRaw>(key)

  // 3. Identifiants uniques par genre ; rencontres uniques par boss.
  const ids: Partial<Record<DatasetKey, string[]>> = {}
  const idFailures: string[] = []
  for (const kind of ENTITY_KINDS) {
    const all: { key: DatasetKey; id: string }[] = []
    for (const key of datasetsOfKind(kind)) {
      const list = listOf(key).map((e) => entryId(e))
      ids[key] = list
      list.forEach((id, n) => {
        if (id === '') idFailures.push(`${key}[${n}] : identifiant vide`)
        all.push({ key, id })
      })
    }
    for (const [id, n] of duplicatesOf(all.map((a) => a.id))) {
      const where = [...new Set(all.filter((a) => a.id === id).map((a) => a.key))].join(', ')
      idFailures.push(`genre ${kind} : identifiant « ${id} » porté ${n} fois (${where})`)
    }
  }
  const bosses = entriesOf<BossRaw>('bosses')
  const encounterIdsByBoss = bosses.map((b, n) => {
    const r = encounterIds(b.encounters)
    for (const d of r.duplicates) idFailures.push(`bosses[${n}] ${b.name} : rencontre « ${d} » en double`)
    return r.ids
  })
  assertNoFailures('unicité des id par genre et des rencontres par boss', idFailures)

  // 4. Coefficients de scaling ≤ 3 dans les trois fichiers d'armes (décimales mal lues, cas Horn Bow).
  const coefFailures: string[] = []
  for (const key of WEAPON_KEYS) {
    for (const w of entriesOf<WeaponRaw>(key)) {
      for (const [affinity, table] of Object.entries(w.upgrade.tables ?? {})) {
        for (const [level, row] of Object.entries(table)) {
          if (level === 'growth_per_level' || !('scaling' in row)) continue
          for (const attr of WEAPON_ATTRIBUTE_KEYS) {
            const coef = row.scaling[attr]?.coef
            if (typeof coef === 'number' && coef > MAX_SCALING_COEF) {
              coefFailures.push(`${key} ${w.name} ${affinity} ${level} ${attr} : coef ${coef} > ${MAX_SCALING_COEF}`)
            }
          }
        }
      }
    }
  }
  assertNoFailures(`scaling.<attr>.coef des tableaux d'amélioration ≤ ${MAX_SCALING_COEF}`, coefFailures)

  // 4b. Chaque arme de `material_inconsistencies_flagged` existe, une seule fois, dans son fichier et a un matériau documenté.
  const flagFailures: string[] = []
  for (const key of WEAPON_KEYS) {
    const weapons = entriesOf<WeaponRaw>(key)
    for (const flag of metaOf<WeaponMeta>(key).material_inconsistencies_flagged) {
      const found = weapons.filter((w) => w.name === flag.name)
      if (found.length !== 1) flagFailures.push(`${key} : « ${flag.name} » trouvée ${found.length} fois`)
      else if (found[0]?.upgrade.material == null) flagFailures.push(`${key} : « ${flag.name} » signalée mais son upgrade.material est null`)
    }
  }
  assertNoFailures('armes de material_inconsistencies_flagged présentes, avec un matériau documenté', flagFailures)

  // 5. Σ attributs − 79 = level pour chaque origine (méthode « Origine optimale » de calculs.md).
  const originFailures: string[] = []
  for (const o of entriesOf<OriginRaw>('origins')) {
    const sum = ATTRIBUTE_KEYS.reduce((s, k) => s + o.attributes[ORIGIN_ATTRIBUTE_FIELD[k]], 0)
    if (sum - LEVEL_OFFSET !== o.level) originFailures.push(`${o.name} : Σ attributs ${sum} − ${LEVEL_OFFSET} = ${sum - LEVEL_OFFSET} ≠ level ${o.level}`)
  }
  assertNoFailures('Σ attributs − 79 = level pour chaque origine', originFailures)

  // 6. Tables continues (contrôle bloquant dans extractCalcTables).
  const tables = extractCalcTables(entriesOf('mechanics'))

  // 7. Liste des valeurs de région connues.
  assertNoFailures('79 valeurs de région connues (decisions-progression.md § 1.3)', [
    ...(KNOWN_REGIONS.length === KNOWN_REGION_COUNT ? [] : [`${KNOWN_REGIONS.length} valeurs au lieu de ${KNOWN_REGION_COUNT}`]),
    ...duplicatesOf([...KNOWN_REGIONS]).map(([v]) => `valeur en double : ${v}`),
  ])
  const regionCtx = buildRegionContext(entriesOf<LocationRaw>('locations'), entriesOf<NpcRaw>('npcs'), KNOWN_REGIONS)
  report.knownRegionsNotFound.push(...knownRegionsAbsent(raw))

  // 8. Noms affichés, par genre.
  const names: Partial<Record<DatasetKey, string[]>> = {}
  for (const kind of ENTITY_KINDS) {
    const keys = datasetsOfKind(kind)
    const all = keys.flatMap((k) => listOf(k))
    const shown = displayNames(all)
    let at = 0
    for (const k of keys) {
      const n = listOf(k).length
      names[k] = shown.slice(at, at + n)
      at += n
    }
  }

  // 9. Butins d'envahisseurs : drop exact → rencontres.
  const invaderIndex = new Map<string, InvaderDrop[]>()
  bosses.forEach((b, n) => {
    if (!b.tier.includes(INVADER_TIER)) return
    const bossId = ids.bosses?.[n] ?? ''
    b.encounters.forEach((enc, m) => {
      for (const drop of enc.drops) {
        const list = invaderIndex.get(drop) ?? []
        list.push({ boss: bossId, encounter: `${bossId}/${encounterIdsByBoss[n]?.[m] ?? ''}` })
        invaderIndex.set(drop, list)
      }
    })
  })
  const matchedDrops = new Set<string>()

  // 10. Entrées préparées.
  const regionNotes: RegionNotes = { unresolved: [], prefix: [], residues: [] }
  const datasets = {} as Record<DatasetKey, DatasetFile<unknown, unknown>>
  for (const key of DATASET_KEYS) {
    const info = DATASETS[key]
    const list = listOf(key)
    const keyIds = ids[key] ?? []
    const keyNames = names[key] ?? []
    const before = regionNotes.unresolved.length
    let withoutRegion = 0
    const entries = list.map((e, n) => {
      const derived: Record<string, unknown> = { displayName: keyNames[n] ?? '' }
      if (Array.isArray(e.acquisition)) {
        const acquisition = e.acquisition as readonly Acquisition[]
        const methods: (AcquisitionMethod | null)[] = acquisition.map((a) => {
          const r = normalizeMethod(a.method)
          if (!r.known && a.method !== null) bump(report.unknownMethods, a.method)
          return r.method
        })
        const regions = deriveRegions(regionCtx, acquisition, methods, (e.regions_mentioned ?? []) as readonly string[], regionNotes)
        if (regions.values.length === 0) withoutRegion++
        const drops = [...(invaderIndex.get(e.name ?? '') ?? [])]
        if (drops.length > 0) matchedDrops.add(e.name ?? '')
        const acq: Omit<AcquisitionDerived, 'displayName'> = { regions, methods, invaderDrop: drops }
        Object.assign(derived, acq)
      }
      if (info.kind === 'weapon') {
        derived.upgrade = deriveUpgrade(e as unknown as WeaponRaw)
        derived.inconsistent = deriveInconsistent(e as unknown as WeaponRaw, metaOf<WeaponMeta>(key).material_inconsistencies_flagged)
      }
      if (key === 'key_items') derived.alsoListedIn = merged.alsoListedIn[n] ?? []
      if (key === 'bosses') {
        const b = e as unknown as BossRaw
        const encIds = encounterIdsByBoss[n] ?? []
        const identities: EncounterIdentity[] = b.encounters.map((_, m) => ({
          id: encIds[m] ?? '',
          key: `${keyIds[n] ?? ''}/${encIds[m] ?? ''}`,
        }))
        derived.encounters = identities
        derived.pageKey = b.encounters.length === 0 ? (keyIds[n] ?? '') : null
      }
      const out: Record<string, unknown> = { ...e }
      if (key === 'npcs') {
        for (const f of NPC_RICH_FIELDS) {
          const v = out[f]
          if (v !== undefined) out[f] = toRichSection(v as Parameters<typeof toRichSection>[0])
        }
      }
      out.id = keyIds[n] ?? ''
      out.derived = derived
      return out
    })
    if (Array.isArray(list[0]?.acquisition)) {
      const unresolved: Record<string, number> = {}
      for (const u of regionNotes.unresolved.slice(before)) bump(unresolved, u)
      if (Object.keys(unresolved).length > 0) report.unresolvedNames[key] = unresolved
      report.entriesWithoutRegion[key] = withoutRegion
    }
    datasets[key] = {
      schema: 1,
      key,
      kind: info.kind,
      listKey: info.listKey,
      meta: metaOf(key),
      transforms: transformsOf(key, list, merged.merged),
      entries,
    }
  }
  for (const p of regionNotes.prefix) bump(report.prefixRuleApplied, p)
  for (const r of regionNotes.residues) bump(report.extractionResidues, r)
  for (const key of DATASET_KEYS) {
    for (const e of datasets[key].entries as readonly { derived: { regions?: { values: readonly string[] } } }[]) {
      for (const v of e.derived.regions?.values ?? []) if (!regionCtx.known.has(v)) bump(report.regionsOutsideStageTable, v)
    }
  }
  for (const [drop, list] of invaderIndex) if (!matchedDrops.has(drop)) report.invaderDropsUnmatched[drop] = list.length
  for (const key of DATASET_KEYS) {
    const found = markupResidues(raw[key].entries)
    if (found.length > 0) report.markupResidues[key] = { count: found.length, examples: found.slice(0, 5) }
  }

  const typed = datasets as unknown as DatasetFileMap
  return { datasets: typed, tables, search: buildSearchIndex(typed), retrieved, report }
}

/**
 * Transformations consignées dans un fichier préparé.
 * @param key Jeu de données.
 * @param list Entrées d'origine gardées.
 * @param mergedPages Pages de `key_items` fusionnées.
 * @returns La liste `transforms`.
 */
function transformsOf(key: DatasetKey, list: readonly AnyRaw[], mergedPages: readonly string[]): Transform[] {
  const info = DATASETS[key]
  const derivedFields = ['displayName']
  if (Array.isArray(list[0]?.acquisition)) derivedFields.push('regions', 'methods', 'invaderDrop')
  if (info.kind === 'weapon') derivedFields.push('upgrade', 'inconsistent')
  if (key === 'key_items') derivedFields.push('alsoListedIn')
  if (key === 'bosses') derivedFields.push('encounters', 'pageKey')
  const out: Transform[] = [
    {
      code: 'id',
      field: 'id',
      count: list.length,
      note: key === 'mechanics' ? 'Identifiant ajouté : slug(title).' : 'Identifiant ajouté : slug(wiki_page).',
    },
    { code: 'derived', field: 'derived', count: list.length, note: `Champs dérivés ajoutés : ${derivedFields.join(', ')}.` },
  ]
  if (key === 'npcs') {
    for (const f of NPC_RICH_FIELDS) {
      const lists = list.filter((e) => Array.isArray(e[f])).length
      const sections = list.filter((e) => e[f] !== undefined && !Array.isArray(e[f])).length
      out.push({
        code: 'rich-section',
        field: f,
        count: lists + sections,
        note: `Ramené à RichSection { text, tables } : ${lists} liste(s) de lignes (tables vide), ${sections} section(s) gardée(s) telles quelles (tables vide si absente).`,
      })
    }
  }
  if (key === 'key_items' && mergedPages.length > 0) {
    out.push({
      code: 'merge-duplicates',
      field: null,
      count: mergedPages.length,
      note: `Entrées en double fusionnées (même wiki_page, seule category diffère ; l'autre catégorie est dans derived.alsoListedIn) : ${mergedPages.join(', ')}.`,
    })
  }
  return out
}

/**
 * Valeurs connues qui n'apparaissent nulle part dans data/ (contrôle de la liste des 79, non bloquant).
 * @param raw Fichiers bruts.
 * @returns Les valeurs introuvables.
 */
function knownRegionsAbsent(raw: Readonly<Record<DatasetKey, RawDataset>>): string[] {
  const text = DATASET_KEYS.map((k) => JSON.stringify(raw[k].entries)).join('\n')
  return KNOWN_REGIONS.filter((v) => !text.includes(JSON.stringify(v)))
}

const MARKUP = /ER Icon [^"|\n]*?\.png/

/**
 * Chaînes contenant un reste de balisage d'image du wiki (`ER Icon … .png`).
 * @param value Valeur à parcourir.
 * @param path Chemin courant.
 * @param out Chemins trouvés, complétés en place.
 * @returns Les chemins trouvés.
 */
function markupResidues(value: unknown, path = '', out: string[] = []): string[] {
  if (typeof value === 'string') {
    if (MARKUP.test(value)) out.push(path)
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => markupResidues(v, `${path}[${i}]`, out))
  } else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) markupResidues(v, `${path}.${k}`, out)
  }
  return out
}
