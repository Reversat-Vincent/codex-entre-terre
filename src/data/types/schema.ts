// Petit langage de schémas : chaque schéma décrit une forme de data/ et sert à la fois de type TypeScript (Infer) et de contrôle à l'exécution.
// Une seule source pour les types et pour le contrôle « champs et types conformes aux types » de docs/architecture.md § 3.5 : ils ne peuvent pas diverger.
// Aucune dépendance (bibliothèques de validation refusées, § 14) ; seul scripts/ l'exécute, l'application n'en importe que les types.

/** Écart trouvé par un schéma : chemin JSON et attendu. */
export interface SchemaIssue {
  readonly path: string
  readonly message: string
}

/**
 * Schéma d'une valeur de type `T`.
 * `check` ajoute les écarts à `issues` sans lever d'exception ; `_type` n'existe que pour l'inférence.
 */
export interface Schema<T> {
  readonly describe: string
  readonly check: (value: unknown, path: string, issues: SchemaIssue[]) => void
  readonly _type?: T
}

/** Marque d'une clé facultative dans `obj` (clé parfois absente de data/). */
export interface OptionalSchema<T> {
  readonly optional: Schema<T>
}

/** Type décrit par un schéma. */
export type Infer<S> = S extends Schema<infer T> ? T : S extends OptionalSchema<infer U> ? U : never

/** Forme d'objet : clé → schéma, ou `opt(schéma)` pour une clé facultative. */
export type Shape = Readonly<Record<string, Schema<unknown> | OptionalSchema<unknown>>>

type RequiredKeys<S extends Shape> = { [K in keyof S]: S[K] extends OptionalSchema<unknown> ? never : K }[keyof S]
type OptionalKeys<S extends Shape> = { [K in keyof S]: S[K] extends OptionalSchema<unknown> ? K : never }[keyof S]
type Simplify<T> = { [K in keyof T]: T[K] } & {}

/** Objet décrit par une forme : clés obligatoires et facultatives, toutes en lecture seule. */
export type ObjectOf<S extends Shape> = Simplify<
  { readonly [K in RequiredKeys<S>]: Infer<S[K]> } & { readonly [K in OptionalKeys<S>]?: Infer<S[K]> }
>

const typeName = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function primitive<T>(name: 'string' | 'number' | 'boolean'): Schema<T> {
  return {
    describe: name,
    check(value, path, issues) {
      // Un nombre de data/ est toujours fini : NaN ou Infinity trahiraient une lecture défaillante.
      if (typeof value !== name || (name === 'number' && !Number.isFinite(value))) {
        issues.push({ path, message: `${name} attendu, ${typeName(value)} trouvé` })
      }
    },
  }
}

/** Chaîne quelconque. */
export const str: Schema<string> = primitive<string>('string')

/** Nombre fini. */
export const num: Schema<number> = primitive<number>('number')

/** Booléen. */
export const bool: Schema<boolean> = primitive<boolean>('boolean')

/**
 * Chaîne prise dans une liste fermée.
 * @param values Valeurs admises.
 * @returns Le schéma de l'union de ces chaînes.
 */
export function lit<const T extends string>(...values: readonly T[]): Schema<T> {
  const allowed = new Set<string>(values)
  return {
    describe: values.map((v) => JSON.stringify(v)).join(' | '),
    check(value, path, issues) {
      if (typeof value !== 'string' || !allowed.has(value)) {
        issues.push({ path, message: `une valeur parmi ${values.join(', ')} attendue, ${JSON.stringify(value)} trouvé` })
      }
    },
  }
}

/**
 * Chaîne qui commence par un préfixe donné (adresses du wiki).
 * @param prefix Préfixe obligatoire.
 * @returns Le schéma de chaîne.
 */
export function prefixed(prefix: string): Schema<string> {
  return {
    describe: `string commençant par ${prefix}`,
    check(value, path, issues) {
      if (typeof value !== 'string' || !value.startsWith(prefix)) {
        issues.push({ path, message: `chaîne commençant par ${prefix} attendue, ${JSON.stringify(value)} trouvé` })
      }
    },
  }
}

/**
 * Valeur nullable : `null` signifie « non documenté par le wiki ».
 * @param inner Schéma de la valeur non nulle.
 * @returns Le schéma de `T | null`.
 */
export function nullable<T>(inner: Schema<T>): Schema<T | null> {
  return {
    describe: `${inner.describe} | null`,
    check(value, path, issues) {
      if (value !== null) inner.check(value, path, issues)
    },
  }
}

/**
 * Union de schémas : la valeur doit satisfaire l'un d'eux.
 * @param options Schémas admis.
 * @returns Le schéma de l'union.
 */
export function union<const S extends readonly Schema<unknown>[]>(...options: S): Schema<Infer<S[number]>> {
  return {
    describe: options.map((o) => o.describe).join(' | '),
    check(value, path, issues) {
      for (const option of options) {
        const local: SchemaIssue[] = []
        option.check(value, path, local)
        if (local.length === 0) return
      }
      issues.push({ path, message: `${options.map((o) => o.describe).join(' ou ')} attendu, ${typeName(value)} trouvé` })
    },
  }
}

/**
 * Liste en lecture seule.
 * @param item Schéma de chaque élément.
 * @returns Le schéma de la liste.
 */
export function arr<T>(item: Schema<T>): Schema<readonly T[]> {
  return {
    describe: `${item.describe}[]`,
    check(value, path, issues) {
      if (!Array.isArray(value)) {
        issues.push({ path, message: `liste attendue, ${typeName(value)} trouvé` })
        return
      }
      value.forEach((v, i) => item.check(v, `${path}[${i}]`, issues))
    },
  }
}

/**
 * Dictionnaire à clés libres (infobox, sections nommées par le wiki, comptes).
 * @param value Schéma de chaque valeur.
 * @returns Le schéma de l'objet.
 */
export function rec<T>(value: Schema<T>): Schema<Readonly<Record<string, T>>> {
  return {
    describe: `Record<string, ${value.describe}>`,
    check(v, path, issues) {
      if (!isPlainObject(v)) {
        issues.push({ path, message: `objet attendu, ${typeName(v)} trouvé` })
        return
      }
      for (const [k, x] of Object.entries(v)) value.check(x, `${path}[${JSON.stringify(k)}]`, issues)
    },
  }
}

/**
 * Clé facultative d'un objet : absente de certaines entrées de data/.
 * @param inner Schéma de la valeur quand la clé est présente.
 * @returns La marque à placer dans une forme `obj`.
 */
export function opt<T>(inner: Schema<T>): OptionalSchema<T> {
  return { optional: inner }
}

/**
 * Objet à clés fixes. Contrôle strict : une clé inconnue est un écart, pour que les types restent fidèles à data/.
 * @param shape Forme de l'objet.
 * @returns Le schéma de l'objet.
 */
export function obj<const S extends Shape>(shape: S): Schema<ObjectOf<S>> {
  const entries = Object.entries(shape)
  return {
    describe: `{ ${entries.map(([k]) => k).join(', ')} }`,
    check(value, path, issues) {
      if (!isPlainObject(value)) {
        issues.push({ path, message: `objet attendu, ${typeName(value)} trouvé` })
        return
      }
      for (const [key, s] of entries) {
        const childPath = `${path}.${key}`
        if ('optional' in s) {
          if (key in value) s.optional.check(value[key], childPath, issues)
        } else if (!(key in value)) {
          issues.push({ path: childPath, message: 'clé obligatoire absente' })
        } else {
          s.check(value[key], childPath, issues)
        }
      }
      for (const key of Object.keys(value)) {
        if (!(key in shape)) issues.push({ path: `${path}.${key}`, message: 'clé inconnue du type' })
      }
    },
  }
}

/**
 * Applique un schéma à une valeur.
 * @param schema Schéma attendu.
 * @param value Valeur lue.
 * @param path Chemin de départ dans les messages (nom du fichier, par exemple).
 * @returns La liste des écarts, vide si la valeur est conforme.
 */
export function validate<T>(schema: Schema<T>, value: unknown, path: string): SchemaIssue[] {
  const issues: SchemaIssue[] = []
  schema.check(value, path, issues)
  return issues
}
