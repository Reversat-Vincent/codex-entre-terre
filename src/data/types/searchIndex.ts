// Types du fichier `search-index` : documents de recherche produits par la préparation (docs/architecture.md § 8).

import type { EntityKind, EntityRef } from '../datasets.ts'
import type { SourceTag } from './common.ts'

/** Groupe de résultats : un genre d'entité, ou `skill` pour les compétences. */
export type SearchGroup = EntityKind | 'skill'

/** Terme secondaire d'un document, cherché au rang 3. */
export interface SearchTerm {
  readonly field: 'skill' | 'acquisition' | 'region'
  readonly text: string
  /** `text` normalisé (`normalizeText` de src/data/slug.ts). */
  readonly norm: string
}

/** Document de recherche. */
export interface SearchDoc {
  readonly ref: EntityRef
  readonly group: SearchGroup
  /** `derived.displayName` de l'entité (nom de la compétence pour le groupe `skill`). */
  readonly name: string
  /** `name` normalisé. */
  readonly norm: string
  readonly source: SourceTag | null
  /** Contexte brut (classe, région, rang), à joindre par « · ». */
  readonly ctx: readonly string[]
  readonly terms?: readonly SearchTerm[]
}

/** Fichier produit `search-index`. */
export interface SearchIndexFile {
  readonly schema: 1
  readonly key: 'search-index'
  readonly docs: readonly SearchDoc[]
}
