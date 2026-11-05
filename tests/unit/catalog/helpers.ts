// Accès communs des tests de catalogue : fixtures réelles de tests/fixtures (armes, boss) et recherche d'une option dans un état de facette.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BossEntry, WeaponEntry } from '../../../src/data/types/index.ts'
import type { FacetOptionState, FacetState } from '../../../src/catalog/facets.ts'

function entries<T>(name: string): T[] {
  const file = JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', `${name}.json`), 'utf-8')) as { entries: T[] }
  return file.entries
}

/** Les 13 armes des fixtures : 10 de mêlée, 2 à distance ou catalyseurs, 1 bouclier. */
export function weapons(): WeaponEntry[] {
  return [...entries<WeaponEntry>('melee_armaments'), ...entries<WeaponEntry>('ranged_weapons_catalysts'), ...entries<WeaponEntry>('shields_torches')]
}

/** Les 7 boss des fixtures. */
export function bosses(): BossEntry[] {
  return entries<BossEntry>('bosses')
}

/** Option d'une facette, par valeur ; échoue si elle est absente. */
export function option(facets: readonly FacetState[], facet: string, value: string): FacetOptionState {
  const f = facets.find((x) => x.id === facet)
  if (!f) throw new Error(`facette absente : ${facet}`)
  const o = f.options.find((x) => x.value === value)
  if (!o) throw new Error(`option absente : ${facet}/${value}`)
  return o
}

/** Valeurs des options d'une facette, dans l'ordre. */
export function values(facets: readonly FacetState[], facet: string): string[] {
  const f = facets.find((x) => x.id === facet)
  if (!f) throw new Error(`facette absente : ${facet}`)
  return f.options.map((o) => o.value)
}
