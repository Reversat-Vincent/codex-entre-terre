// Liens croisés : résolution d'un nom cité dans les données (butin, équipement, lieu…) vers une entité, par l'index de recherche.
// Référence : docs/architecture.md § 8 (nom exact normalisé → `EntityRef[]`, `resolveName(name, preferredKinds)`, sinon texte simple).

import type { EntityKind, EntityRef } from './datasets.ts'
import { normalizeText } from './slug.ts'
import type { SearchDoc, SearchIndexFile } from './types/searchIndex.ts'

/** Index des noms : nom normalisé → références des entités qui portent exactement ce nom. */
export interface NameIndex {
  readonly byName: ReadonlyMap<string, readonly EntityRef[]>
}

/**
 * Genre d'une référence (`weapon:moonveil` → `weapon`).
 * @param ref Référence d'entité.
 * @returns Son genre.
 */
export function kindOf(ref: EntityRef): EntityKind {
  return ref.slice(0, ref.indexOf(':')) as EntityKind
}

/**
 * Construit l'index des noms depuis l'index de recherche. Les documents du groupe « Compétences » sont ignorés : leur nom est celui de la
 * compétence, pas de l'entité visée.
 * @param index Fichier `search-index` ou ses documents.
 * @returns L'index, à construire une fois.
 */
export function buildNameIndex(index: SearchIndexFile | readonly SearchDoc[]): NameIndex {
  const docs = 'docs' in index ? index.docs : index
  const byName = new Map<string, EntityRef[]>()
  for (const d of docs) {
    if (d.group === 'skill') continue
    const list = byName.get(d.norm) ?? []
    if (!list.includes(d.ref)) list.push(d.ref)
    byName.set(d.norm, list)
  }
  return { byName }
}

/**
 * Toutes les entités qui portent exactement un nom (comparaison normalisée : accents, casse, apostrophes).
 * @param index Index des noms.
 * @param name Nom cité.
 * @returns Les références, vide si aucune.
 */
export function resolveAll(index: NameIndex, name: string): readonly EntityRef[] {
  return index.byName.get(normalizeText(name)) ?? []
}

/**
 * Résout un nom en une entité : parmi les entités de ce nom, la première du premier genre préféré qui en a une ; sinon l'entité
 * seulement si le nom est univoque. Un nom ambigu ou inconnu reste du texte simple.
 * @param index Index des noms.
 * @param name Nom cité.
 * @param preferredKinds Genres préférés, du plus au moins probable (par exemple `['weapon']` pour un butin d'arme).
 * @returns La référence, ou `null` (texte simple).
 */
export function resolveName(index: NameIndex, name: string, preferredKinds: readonly EntityKind[] = []): EntityRef | null {
  const refs = resolveAll(index, name)
  for (const kind of preferredKinds) {
    const found = refs.find((r) => kindOf(r) === kind)
    if (found !== undefined) return found
  }
  return refs.length === 1 ? (refs[0] ?? null) : null
}
