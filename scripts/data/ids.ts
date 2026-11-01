// Identifiants des entrées et des rencontres, et nom affiché (docs/architecture.md § 3.3 et § 3.2, `displayName`).

import { slug } from '../../src/data/slug.ts'

/** Champs utiles à l'identité d'une entrée (les mécaniques n'ont que `title`). */
export interface IdentitySource {
  readonly name?: string
  readonly wiki_page?: string
  readonly title?: string
}

/**
 * Identifiant d'une entrée : `slug(wiki_page)`, ou `slug(title)` pour une mécanique.
 * @param entry Entrée d'origine.
 * @returns L'identifiant, chaîne vide si aucun titre n'est disponible (le contrôle d'unicité le signale).
 */
export function entryId(entry: IdentitySource): string {
  return slug(entry.wiki_page ?? entry.title ?? '')
}

/** Champs d'une rencontre utiles à son identifiant. */
export interface EncounterIdentitySource {
  readonly name: string
  readonly variant?: string
  readonly location: string | null
}

/**
 * Identifiants des rencontres d'une page de boss : `slug(name)` ; en cas de doublon, `slug(name + ' ' + variant)`,
 * puis `slug(name + ' ' + variant + ' ' + location)`.
 * @param encounters Rencontres de la page, dans leur ordre.
 * @returns Les identifiants au même indice, et les doublons qui subsistent (vide si tous sont uniques).
 */
export function encounterIds(encounters: readonly EncounterIdentitySource[]): { ids: string[]; duplicates: string[] } {
  const step = (e: EncounterIdentitySource, level: number): string => {
    const parts = [e.name]
    if (level >= 1 && e.variant !== undefined) parts.push(e.variant)
    if (level >= 2 && e.location !== null) parts.push(e.location)
    return slug(parts.join(' '))
  }
  const ids = encounters.map((e) => step(e, 0))
  for (let level = 1; level <= 2; level++) {
    const counts = countValues(ids)
    encounters.forEach((e, i) => {
      if ((counts.get(ids[i] ?? '') ?? 0) > 1) ids[i] = step(e, level)
    })
  }
  const counts = countValues(ids)
  const duplicates = [...counts].filter(([, n]) => n > 1).map(([id]) => id)
  return { ids, duplicates }
}

/**
 * Noms affichés d'un genre : `name`, ou `wiki_page` quand plusieurs entrées du genre portent le même `name` ; `title` pour une mécanique.
 * @param entries Entrées d'un même genre (tous fichiers confondus, doublons de `key_items` déjà fusionnés).
 * @returns Le nom affiché de chaque entrée, au même indice.
 */
export function displayNames(entries: readonly IdentitySource[]): string[] {
  const counts = countValues(entries.map((e) => e.name ?? e.title ?? ''))
  return entries.map((e) => {
    const name = e.name ?? e.title ?? ''
    return (counts.get(name) ?? 0) > 1 && e.wiki_page !== undefined ? e.wiki_page : name
  })
}

/**
 * Valeurs présentes plusieurs fois.
 * @param values Valeurs à examiner.
 * @returns Les valeurs en double, avec leur nombre d'occurrences.
 */
export function duplicatesOf(values: readonly string[]): [string, number][] {
  return [...countValues(values)].filter(([, n]) => n > 1)
}

function countValues(values: readonly string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1)
  return m
}
