// Modèle de la fiche de lieu : hiérarchie de régions (fil d'Ariane), sous-lieux, valeurs clés et alertes. La hiérarchie vient du champ `region` de `locations.json`
// (région parente) ; aucune relation n'est inventée : un lieu dont la région ne se résout pas garde le nom du wiki en texte simple.

import type { RouteLocationRaw } from 'vue-router'
import { normalizeText } from '../../../../data/slug.ts'
import type { LocationEntry } from '../../../../data/types/locations.ts'
import { entityRoute } from '../../../../router/entityRoute.ts'
import { missingFieldsAlert, presentAlerts } from '../sheetModel.ts'
import type { SheetAlert, SheetCrumb, SheetFact } from '../sheetModel.ts'

/** Libellés français du type de lieu (`kind`, type d'infobox du wiki). */
export const LOCATION_KIND_LABELS: Readonly<Record<string, string>> = {
  Region: 'Région',
  Subregion: 'Sous-région',
  'Legacy Dungeon': 'Donjon principal',
  Location: 'Lieu',
  Dungeon: 'Donjon',
  Evergaol: 'Evergaol',
}

/**
 * Libellé français du type d'un lieu.
 * @param kind Valeur de `kind` ; `null` si le wiki ne la donne pas.
 * @returns Le libellé ; un type inconnu est repris tel quel, `null` reste `null`.
 */
export function locationKindLabel(kind: string | null): string | null {
  if (kind === null) return null
  return LOCATION_KIND_LABELS[kind] ?? kind
}

/** Index des lieux par nom normalisé (accents, casse et apostrophes ignorés), pour résoudre les noms cités par la hiérarchie et les listes. */
export type LocationIndex = ReadonlyMap<string, LocationEntry>

/**
 * Construit l'index des lieux par nom. Si deux pages portent le même nom, la première du fichier est gardée (aucun doublon dans les données actuelles).
 * @param entries Lieux du fichier `locations`.
 * @returns L'index, à construire une fois par fichier.
 */
export function buildLocationIndex(entries: readonly LocationEntry[]): LocationIndex {
  const map = new Map<string, LocationEntry>()
  for (const entry of entries) {
    const key = normalizeText(entry.name)
    if (!map.has(key)) map.set(key, entry)
  }
  return map
}

/**
 * Résout un nom de lieu. Le wiki écrit parfois « Weeping Peninsula (Limgrave) » ou « Mohgwyn Palace (Siofra River) », et la liste des sous-régions d'une région
 * contient des phrases (« Stormhill, a foggy and windy area… ») : le nom exact est essayé d'abord, puis la partie avant la parenthèse, puis la partie entre
 * parenthèses, enfin la partie avant la première virgule (un nom qui contient une virgule, « Leyndell, Royal Capital », est résolu avant par le nom exact).
 * @param index Index des lieux.
 * @param name Nom cité.
 * @returns Le lieu, ou `null` si aucun nom ne correspond.
 */
export function resolveLocation(index: LocationIndex, name: string): LocationEntry | null {
  const exact = index.get(normalizeText(name))
  if (exact) return exact
  const split = /^(.*\S)\s*\(([^)]+)\)\s*$/.exec(name)
  if (split) return index.get(normalizeText(split[1]!)) ?? index.get(normalizeText(split[2]!)) ?? null
  const comma = name.indexOf(',')
  return comma > 0 ? (index.get(normalizeText(name.slice(0, comma))) ?? null) : null
}

/** Profondeur maximale de la hiérarchie suivie : région, sous-région, donjon ; le plafond protège d'un cycle dans les données. */
const MAX_DEPTH = 5

/** Ancêtres d'un lieu, du plus large au plus proche, et région non résolue éventuelle. */
export interface LocationAncestry {
  /** Lieux parents, de la région au parent direct. */
  readonly chain: readonly LocationEntry[]
  /** Nom de région du wiki qui ne correspond à aucune page de lieu : gardé en texte simple, en tête du fil. */
  readonly unresolved: string | null
}

/**
 * Hiérarchie de régions d'un lieu : on remonte le champ `region` (région parente) tant qu'il mène à un autre lieu.
 * Une région dont `region` est elle-même (cas des régions) arrête la remontée.
 * @param entry Lieu.
 * @param index Index des lieux.
 * @returns Les ancêtres, du plus large au plus proche.
 */
export function locationAncestry(entry: LocationEntry, index: LocationIndex): LocationAncestry {
  const chain: LocationEntry[] = []
  const seen = new Set<string>([entry.id])
  let current: LocationEntry = entry
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const region = current.region
    if (region === null) return { chain: chain.reverse(), unresolved: null }
    const parent = resolveLocation(index, region)
    if (parent === null) return { chain: chain.reverse(), unresolved: region }
    if (seen.has(parent.id)) break
    seen.add(parent.id)
    chain.push(parent)
    current = parent
  }
  return { chain: chain.reverse(), unresolved: null }
}

/**
 * Fil d'Ariane d'un lieu : ses ancêtres, de la région au parent direct ; chaque maillon mène à la fiche du lieu.
 * @param entry Lieu.
 * @param index Index des lieux.
 * @returns Les maillons, sans le lieu lui-même (le nom est le dernier maillon de la page).
 */
export function locationTrail(entry: LocationEntry, index: LocationIndex): SheetCrumb[] {
  const { chain, unresolved } = locationAncestry(entry, index)
  return [
    ...(unresolved === null ? [] : [{ label: unresolved }]),
    ...chain.map((l): SheetCrumb => ({ label: l.name, to: entityRoute(`location:${l.id}`) })),
  ]
}

/** Lieu cité par une liste, relié à sa fiche quand il est dans les données. */
export interface LocationLink {
  readonly name: string
  /** Fiche du lieu ; `null` : le nom ne correspond à aucune page de lieu. */
  readonly to: RouteLocationRaw | null
  /** Type du lieu en français, si la page existe. */
  readonly kind: string | null
  /** Reste du texte du wiki quand l'entrée est une phrase qui commence par le nom du lieu (« a foggy and windy area… ») ; `null` sinon. */
  readonly note: string | null
}

/**
 * Relie des noms de lieux à leurs fiches.
 * @param names Noms cités (sous-régions, donjons, points de repère).
 * @param index Index des lieux.
 * @returns Un maillon par nom.
 */
export function locationLinks(names: readonly string[], index: LocationIndex): LocationLink[] {
  return names.map((raw): LocationLink => {
    const found = resolveLocation(index, raw)
    // Une phrase résolue par son premier nom (« Stormhill, a foggy… ») : le nom du lieu porte le lien, le reste devient une précision.
    const sentence = found !== null && raw.startsWith(`${found.name},`)
    const name = sentence && found ? found.name : raw
    const note = sentence && found ? raw.slice(found.name.length + 1).trim() : null
    return { name, to: found ? entityRoute(`location:${found.id}`) : null, kind: found ? locationKindLabel(found.kind) : null, note }
  })
}

/** Groupe de lieux rattachés à un lieu, par type. */
export interface LocationGroup {
  readonly id: string
  /** Libellé français du groupe (« Donjons »). */
  readonly label: string
  readonly links: readonly LocationLink[]
}

/** Ordre et libellé des groupes de lieux rattachés. */
const CHILD_GROUPS: readonly { readonly kind: string; readonly label: string }[] = [
  { kind: 'Subregion', label: 'Sous-régions' },
  { kind: 'Legacy Dungeon', label: 'Donjons principaux' },
  { kind: 'Dungeon', label: 'Donjons' },
  { kind: 'Evergaol', label: 'Evergaols' },
  { kind: 'Location', label: 'Autres lieux' },
]

/**
 * Lieux rattachés à un lieu : ceux dont la région parente (`region`) est ce lieu, groupés par type. Les noms déjà cités par ses propres listes
 * (`sub_regions`, `dungeons`, `landmarks`) sont écartés pour ne pas être répétés.
 * @param entry Lieu.
 * @param entries Tous les lieux.
 * @param index Index des lieux.
 * @returns Les groupes non vides, dans l'ordre des types.
 */
export function locationChildren(entry: LocationEntry, entries: readonly LocationEntry[], index: LocationIndex): LocationGroup[] {
  const cited = new Set(
    [...(entry.sub_regions ?? []), ...(entry.dungeons ?? []), ...(entry.landmarks ?? [])].flatMap((n) => {
      const found = resolveLocation(index, n)
      return found ? [found.id] : []
    }),
  )
  const children = entries.filter((e) => {
    if (e.id === entry.id || e.region === null || cited.has(e.id)) return false
    return resolveLocation(index, e.region)?.id === entry.id
  })
  return CHILD_GROUPS.flatMap(({ kind, label }) => {
    const ofKind = children.filter((c) => (c.kind ?? 'Location') === kind)
    return ofKind.length === 0
      ? []
      : [{ id: kind, label, links: ofKind.map((c): LocationLink => ({ name: c.name, to: entityRoute(`location:${c.id}`), kind: locationKindLabel(c.kind), note: null })) }]
  })
}

/**
 * Valeurs clés d'un lieu : type, sous-type, région et caractère facultatif (infobox).
 * @param entry Lieu.
 * @param index Index des lieux.
 * @returns Les valeurs dans l'ordre d'affichage ; `null` : non documenté.
 */
export function locationFacts(entry: LocationEntry, index: LocationIndex): SheetFact[] {
  const facts: SheetFact[] = [
    { id: 'kind', label: 'Type', value: locationKindLabel(entry.kind) },
    ...(entry.subtype === undefined ? [] : [{ id: 'subtype', label: 'Sous-type', value: entry.subtype }]),
    // La région d'une région est elle-même : la ligne n'apprend rien, elle est omise.
    ...(entry.kind === 'Region' || (entry.region !== null && resolveLocation(index, entry.region)?.id === entry.id)
      ? []
      : [{ id: 'region', label: 'Région', value: entry.region, linkKinds: ['location'] as const }]),
  ]
  const optional = entry.infobox?.optional
  if (optional !== undefined) facts.push({ id: 'optional', label: 'Facultatif', value: optional })
  return facts
}

/**
 * Alertes de qualité d'un lieu : type, région ou résumé non documentés.
 * @param entry Lieu.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function locationAlerts(entry: LocationEntry): SheetAlert[] {
  return presentAlerts([
    missingFieldsAlert([
      { label: 'le type de lieu', missing: entry.kind === null },
      { label: 'la région', missing: entry.region === null },
      { label: 'le résumé', missing: entry.summary === null },
    ]),
  ])
}
