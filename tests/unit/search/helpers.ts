// Accès communs des tests de recherche : extrait réel de l'index (`index-extract.json`, 148 documents tirés de public/data/search-index) et fabrique de documents.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeText } from '../../../src/data/slug.ts'
import type { EntityKind } from '../../../src/data/datasets.ts'
import type { SearchDoc, SearchGroup, SearchIndexFile } from '../../../src/data/types/searchIndex.ts'

/** Extrait réel de l'index de recherche. */
export function realIndex(): SearchIndexFile {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests', 'unit', 'search', 'index-extract.json'), 'utf-8')) as SearchIndexFile
}

/** Document synthétique (tests de départage), dont le champ `norm` vient de `normalizeText`. */
export function doc(name: string, group: SearchGroup = 'item', ctx: string[] = []): SearchDoc {
  const kind: EntityKind = group === 'skill' ? 'ash' : group
  return { ref: `${kind}:${normalizeText(name).replace(/ /g, '-')}`, group, name, norm: normalizeText(name), source: 'Base game', ctx }
}

/** Noms des résultats d'un groupe, dans l'ordre. */
export function names(hits: readonly { doc: SearchDoc }[]): string[] {
  return hits.map((h) => h.doc.name)
}
