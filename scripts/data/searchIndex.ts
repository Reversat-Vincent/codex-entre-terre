// Construction de l'index de recherche (`search-index`) depuis les fichiers préparés : un document par entité, plus les compétences (docs/architecture.md § 8).

import { DATASETS, DATASET_KEYS, entityRef } from '../../src/data/datasets.ts'
import type { EntityKind } from '../../src/data/datasets.ts'
import { normalizeText } from '../../src/data/slug.ts'
import type { AnyEntry, DatasetFileMap } from '../../src/data/types/index.ts'
import type { SearchDoc, SearchTerm } from '../../src/data/types/searchIndex.ts'

const term = (field: SearchTerm['field'], text: string): SearchTerm => ({ field, text, norm: normalizeText(text) })

const present = (values: readonly (string | null | undefined)[]): string[] =>
  values.filter((v): v is string => typeof v === 'string' && v !== '')

const uniqueTerms = (terms: readonly SearchTerm[]): SearchTerm[] => {
  const seen = new Set<string>()
  return terms.filter((t) => {
    const k = `${t.field}\u0000${t.norm}`
    if (t.norm === '' || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Contexte brut et termes secondaires d'une entrée selon son genre.
 * @param kind Genre de l'entrée.
 * @param e Entrée préparée.
 * @returns Le contexte (classe, région, rang) et les termes (compétence, lieux d'acquisition, régions).
 */
function describe(kind: EntityKind, e: AnyEntry): { ctx: string[]; terms: SearchTerm[] } {
  const terms: SearchTerm[] = []
  if ('acquisition' in e) {
    for (const a of e.acquisition) if (a.location !== null) terms.push(term('acquisition', a.location))
  }
  if ('derived' in e && 'regions' in e.derived) for (const r of e.derived.regions.values) terms.push(term('region', r))
  switch (kind) {
    case 'weapon':
      if ('weapon_type' in e) {
        if (e.skill.name !== null) terms.push(term('skill', e.skill.name))
        return { ctx: present([e.category]), terms }
      }
      break
    case 'ash':
      if ('skill' in e && typeof e.skill === 'string') {
        terms.push(term('skill', e.skill))
        return { ctx: present([e.category]), terms }
      }
      break
    case 'spell':
      if ('spell_type' in e) return { ctx: present([e.category, e.sub_type]), terms }
      break
    case 'boss':
      if ('encounters' in e) {
        for (const enc of e.encounters) for (const r of enc.regions) terms.push(term('region', r))
        return { ctx: [...e.tier], terms }
      }
      break
    case 'location':
      if ('kind' in e) return { ctx: present([e.kind, e.region]), terms }
      break
    case 'npc':
      if ('listed_region' in e) {
        for (const r of e.regions) terms.push(term('region', r))
        return { ctx: present([e.listed_region]), terms }
      }
      break
    case 'mechanic':
      if ('topic' in e) return { ctx: [e.topic], terms }
      break
    case 'origin':
    case 'talisman':
      return { ctx: [], terms }
    case 'armor':
    case 'spirit':
    case 'item':
      break
  }
  return { ctx: 'category' in e && typeof e.category === 'string' ? [e.category] : [], terms }
}

/**
 * Construit les documents de recherche.
 * Compétences (groupe `skill`) : un document par Cendre de guerre ; pour une compétence sans Cendre, un document par arme qui la porte.
 * @param files Fichiers préparés des 18 jeux de données.
 * @returns Les documents, dans l'ordre du registre puis des entrées.
 */
export function buildSearchIndex(files: DatasetFileMap): SearchDoc[] {
  const docs: SearchDoc[] = []
  for (const key of DATASET_KEYS) {
    const kind = DATASETS[key].kind
    for (const e of files[key].entries as readonly AnyEntry[]) {
      const { ctx, terms } = describe(kind, e)
      const t = uniqueTerms(terms)
      const name = e.derived.displayName
      docs.push({
        ref: entityRef(kind, e.id),
        group: kind,
        name,
        norm: normalizeText(name),
        source: e.source,
        ctx,
        ...(t.length > 0 ? { terms: t } : {}),
      })
    }
  }
  const ashSkills = new Set<string>()
  for (const ash of files.ashes_of_war.entries) {
    ashSkills.add(normalizeText(ash.skill))
    docs.push({
      ref: entityRef('ash', ash.id),
      group: 'skill',
      name: ash.skill,
      norm: normalizeText(ash.skill),
      source: ash.source,
      ctx: [ash.derived.displayName],
    })
  }
  const weaponKeys = ['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const
  for (const key of weaponKeys) {
    for (const w of files[key].entries) {
      const skill = w.skill.name
      if (skill === null || ashSkills.has(normalizeText(skill))) continue
      docs.push({
        ref: entityRef('weapon', w.id),
        group: 'skill',
        name: skill,
        norm: normalizeText(skill),
        source: w.source,
        ctx: [w.derived.displayName],
      })
    }
  }
  return docs
}
