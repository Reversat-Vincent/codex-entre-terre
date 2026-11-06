// Type du manifeste `public/data/manifest.json` : liste des fichiers produits, tailles et empreintes (docs/architecture.md § 3.6).

import type { FileKey } from '../datasets.ts'

/** Fichier produit décrit par le manifeste. */
export interface ManifestFileEntry {
  /** Nom du fichier, relatif au manifeste (`melee_armaments.<sha256 sur 10>.json`). */
  readonly path: string
  /** Taille en octets du fichier servi (JSON minifié, avant compression). */
  readonly bytes: number
  /** Empreinte SHA-256 complète, en hexadécimal. */
  readonly sha256: string
  /** Nombre d'entrées (documents pour l'index, tables pour `tables`). */
  readonly entries: number
  /** Libellé français. */
  readonly label: string
}

/** Manifeste des données préparées. */
export interface DataManifest {
  readonly schema: 1
  /** Empreinte globale des données (16 caractères hexadécimaux), change dès qu'un fichier change. */
  readonly dataVersion: string
  /** Date d'extraction du wiki (`metadata.retrieved`), AAAA-MM-JJ. */
  readonly retrieved: string
  readonly files: Readonly<Record<FileKey, ManifestFileEntry>>
}
