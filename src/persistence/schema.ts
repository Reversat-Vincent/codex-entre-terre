// Constantes du format persisté : version du schéma, identité du document et clés de stockage (docs/architecture.md § 7).
// Changer la forme de l'état ou le calcul des identifiants (`slug`) impose d'incrémenter `CURRENT_SCHEMA` et d'ajouter une migration.

/** Version courante du schéma de l'état persisté. */
export const CURRENT_SCHEMA = 1

/** Valeur du champ `app` de tout document du Codex. */
export const APP_ID = 'codex-entre-terre'

/** Clés de stockage. */
export const STORAGE_KEYS = {
  /** Document d'état courant. */
  state: 'codex-entre-terre:state',
  /** Copie brute de l'état avant migration depuis la version `n`. */
  backup: (version: number): string => `codex-entre-terre:backup-v${version}`,
  /** Copie brute d'un état stocké illisible, conservée avant qu'il soit remplacé. */
  backupInvalid: 'codex-entre-terre:backup-invalid',
  /** Instantané d'avant import, pour « Annuler » (stockage de session). */
  undoImport: 'codex-entre-terre:undo-import',
} as const
