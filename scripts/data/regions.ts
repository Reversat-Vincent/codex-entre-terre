// Champ dérivé `regions` : régions d'une entrée déduites de ses acquisitions, avec provenance (décision D10).
// Règles : docs/contenu/decisions-progression.md § 1.4 (règles 2 et 4) et docs/architecture.md § 3.2. L'étape n'est pas calculée ici : elle appartient au moteur.

import type {
  Acquisition,
  AcquisitionMethod,
  AcquisitionRegions,
  DerivedRegions,
  RegionResolution,
} from '../../src/data/types/common.ts'
import type { LocationRaw } from '../../src/data/types/locations.ts'
import type { NpcRaw } from '../../src/data/types/npcs.ts'

/** Données de référence de la résolution : valeurs connues, régions des lieux et des PNJ, hiérarchie. */
export interface RegionContext {
  readonly known: ReadonlySet<string>
  /** `locations.json` : `name` → `region` (brut). */
  readonly locationRegion: ReadonlyMap<string, string | null>
  /** `npcs.json` : `name` → `listed_region`. */
  readonly npcRegion: ReadonlyMap<string, string | null>
  /** Région parente directe d'un lieu, d'après `locations.json` (`region` sans sa parenthèse). */
  readonly parent: ReadonlyMap<string, string>
}

/** Constats de la résolution, pour le rapport non bloquant. */
export interface RegionNotes {
  unresolved: string[]
  prefix: string[]
  residues: string[]
}

const PAREN_SUFFIX = /^(.*?)\s*\(([^()]+)\)$/
// Restes d'extraction relevés dans `acquisition[].region` (« accessed through Rauh Base », « through Rauh Base »).
const RESIDUE = /^(?:accessed\s+)?through\s+(.+)$/i

/**
 * Retire la parenthèse finale d'un nom (`Weeping Peninsula (Limgrave)` → `Weeping Peninsula`).
 * @param name Nom d'origine.
 * @returns Le nom sans sa parenthèse finale.
 */
export function stripParen(name: string): string {
  return name.replace(/\s*\([^()]*\)\s*$/, '').trim()
}

/**
 * Construit le contexte de résolution.
 * @param locations Entrées de `locations.json`.
 * @param npcs Entrées de `npcs.json`.
 * @param known Valeurs de région connues (les 79 de decisions-progression.md § 1.3).
 * @returns Le contexte, à réutiliser pour toutes les entrées.
 */
export function buildRegionContext(
  locations: readonly LocationRaw[],
  npcs: readonly NpcRaw[],
  known: readonly string[],
): RegionContext {
  const locationRegion = new Map<string, string | null>()
  const parent = new Map<string, string>()
  for (const l of locations) {
    if (!locationRegion.has(l.name)) locationRegion.set(l.name, l.region)
    if (l.region !== null) {
      const p = stripParen(l.region)
      if (p !== l.name && !parent.has(l.name)) parent.set(l.name, p)
    }
  }
  const npcRegion = new Map<string, string | null>()
  for (const n of npcs) if (!npcRegion.has(n.name)) npcRegion.set(n.name, n.listed_region)
  return { known: new Set(known), locationRegion, npcRegion, parent }
}

/**
 * Ancêtres d'une valeur dans la hiérarchie de `locations.json` (`Volcano Manor` → `Mt. Gelmir` → `Altus Plateau`).
 * @param ctx Contexte de résolution.
 * @param value Valeur de départ.
 * @returns Les ancêtres, du plus proche au plus lointain.
 */
export function ancestorsOf(ctx: RegionContext, value: string): string[] {
  const out: string[] = []
  let cur = ctx.parent.get(value)
  // La garde évite une boucle si data/ contenait un cycle de régions.
  while (cur !== undefined && !out.includes(cur) && cur !== value) {
    out.push(cur)
    cur = ctx.parent.get(cur)
  }
  return out
}

/**
 * Résout un morceau de texte de lieu ou de région en régions (règle 2 du § 1.4) :
 * valeur connue, sinon `X (Région)` (partie entre parenthèses, et partie `X` si elle est elle-même connue : la plus précise
 * l'emporte ensuite au retrait des parents), sinon région du lieu de ce nom, sinon `listed_region` du PNJ de ce nom.
 * @param ctx Contexte de résolution.
 * @param raw Morceau de texte.
 * @param from Champ lu.
 * @param notes Constats, complétés en place.
 * @returns Les régions trouvées, vide si le morceau n'est pas résolu.
 */
export function resolvePart(
  ctx: RegionContext,
  raw: string,
  from: RegionResolution['from'],
  notes: RegionNotes,
): RegionResolution[] {
  let text = raw.trim()
  if (text === '') return []
  let residue = false
  // Le reste est retiré avant tout, même si le texte complet figure parmi les 79 valeurs : on rattache au lieu cité.
  const r = RESIDUE.exec(text)
  if (r?.[1] !== undefined) {
    residue = true
    text = r[1].trim()
    notes.residues.push(raw)
  }
  const make = (value: string, rule: RegionResolution['rule']): RegionResolution => ({
    value,
    from,
    raw,
    rule,
    residue,
    known: ctx.known.has(value),
  })
  if (ctx.known.has(text)) return [make(text, 'known')]
  const p = PAREN_SUFFIX.exec(text)
  if (p?.[1] !== undefined && p[2] !== undefined) {
    const out: RegionResolution[] = []
    const inner = p[2].trim()
    const outer = p[1].trim()
    if (ctx.known.has(inner)) out.push(make(inner, 'suffix'))
    if (ctx.known.has(outer)) {
      out.push(make(outer, 'prefix'))
      notes.prefix.push(raw)
    }
    if (out.length > 0) return out
  }
  if (ctx.locationRegion.has(text)) {
    const region = ctx.locationRegion.get(text) ?? null
    if (region !== null) return [make(stripParen(region), 'location')]
  }
  if (ctx.npcRegion.has(text)) {
    const region = ctx.npcRegion.get(text) ?? null
    if (region !== null) return [make(region, 'npc')]
  }
  notes.unresolved.push(raw)
  return []
}

/**
 * Retire les doublons puis les régions parentes d'une autre valeur de la liste.
 * @param ctx Contexte de résolution.
 * @param values Régions résolues.
 * @returns Les valeurs gardées et les parents retirés.
 */
export function removeParents(
  ctx: RegionContext,
  values: readonly RegionResolution[],
): { values: RegionResolution[]; parentsRemoved: string[] } {
  const unique: RegionResolution[] = []
  for (const v of values) if (!unique.some((u) => u.value === v.value)) unique.push(v)
  const ancestors = new Set(unique.flatMap((v) => ancestorsOf(ctx, v.value)))
  const kept = unique.filter((v) => !ancestors.has(v.value))
  const parentsRemoved = unique.filter((v) => ancestors.has(v.value)).map((v) => v.value)
  return { values: kept, parentsRemoved }
}

/**
 * Régions d'une acquisition : `location` découpé sur ` / `, `region` découpé sur `/`, parents retirés lieu par lieu ; équipement de départ ignoré.
 * @param ctx Contexte de résolution.
 * @param acquisition Acquisition d'origine.
 * @param index Indice dans `acquisition`.
 * @param method Méthode normalisée de cette acquisition.
 * @param notes Constats, complétés en place.
 * @returns Les régions de l'acquisition.
 */
export function resolveAcquisition(
  ctx: RegionContext,
  acquisition: Acquisition,
  index: number,
  method: AcquisitionMethod | null,
  notes: RegionNotes,
): AcquisitionRegions {
  if (method === 'starting') return { index, starting: true, values: [], parentsRemoved: [], unresolved: [] }
  const local: RegionNotes = { unresolved: [], prefix: notes.prefix, residues: notes.residues }
  // Un groupe = un lieu : le retrait des parents ne joue qu'à l'intérieur d'un groupe (D37), jamais entre deux lieux séparés par ` / `.
  const locationParts = acquisition.location?.split(' / ') ?? []
  const groups: RegionResolution[][] = locationParts.map((part) => resolvePart(ctx, part, 'location', local))
  const regionFound = (acquisition.region?.split('/') ?? []).flatMap((part) => resolvePart(ctx, part, 'region', local))
  // Avec un seul lieu, `region` le précise (même lieu). Avec plusieurs, elle ne se rattache à aucun en particulier : groupe à part.
  if (groups.length === 1) groups[0]?.push(...regionFound)
  else if (regionFound.length > 0) groups.push(regionFound)
  notes.unresolved.push(...local.unresolved)
  const values: RegionResolution[] = []
  const parentsRemoved: string[] = []
  for (const group of groups) {
    const reduced = removeParents(ctx, group)
    for (const v of reduced.values) if (!values.some((u) => u.value === v.value)) values.push(v)
    for (const p of reduced.parentsRemoved) if (!parentsRemoved.includes(p)) parentsRemoved.push(p)
  }
  // Une valeur retirée comme parente dans un lieu mais gardée dans un autre n'est pas un retrait de l'acquisition.
  const kept = new Set(values.map((v) => v.value))
  return { index, starting: false, values, parentsRemoved: parentsRemoved.filter((p) => !kept.has(p)), unresolved: local.unresolved }
}

/**
 * Régions d'une entrée : par acquisition, puis repli sur `regions_mentioned` si aucune acquisition n'en donne (règle 4 du § 1.4).
 * Les faux `Altus Plateau` de `regions_mentioned` ont été retirés de data/ par le correctif C6 (data/CHANGELOG.md).
 * @param ctx Contexte de résolution.
 * @param acquisitions Acquisitions de l'entrée.
 * @param methods Méthodes normalisées, au même indice.
 * @param regionsMentioned `regions_mentioned` de l'entrée.
 * @param notes Constats, complétés en place.
 * @returns Le champ dérivé `regions`.
 */
export function deriveRegions(
  ctx: RegionContext,
  acquisitions: readonly Acquisition[],
  methods: readonly (AcquisitionMethod | null)[],
  regionsMentioned: readonly string[],
  notes: RegionNotes,
): DerivedRegions {
  const perAcquisition = acquisitions.map((a, i) => resolveAcquisition(ctx, a, i, methods[i] ?? null, notes))
  const fromAcquisitions = uniqueValues(perAcquisition.flatMap((a) => a.values.map((v) => v.value)))
  if (fromAcquisitions.length > 0) {
    return { acquisitions: perAcquisition, fallback: null, basis: 'acquisition', values: fromAcquisitions }
  }
  if (regionsMentioned.length === 0) return { acquisitions: perAcquisition, fallback: null, basis: 'none', values: [] }
  const found = regionsMentioned.flatMap((r) => resolvePart(ctx, r, 'regions_mentioned', notes))
  const fallback = removeParents(ctx, found)
  const values = uniqueValues(fallback.values.map((v) => v.value))
  return { acquisitions: perAcquisition, fallback, basis: values.length > 0 ? 'regions_mentioned' : 'none', values }
}

const uniqueValues = (values: readonly string[]): string[] => [...new Set(values)]
