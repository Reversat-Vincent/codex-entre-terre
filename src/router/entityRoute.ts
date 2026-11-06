// Route de la fiche d'une entité : les noms de route des fiches sont les genres d'entité (architecture § 9), l'identifiant est le paramètre `id`.

import type { RouteLocationRaw } from 'vue-router'
import type { EntityRef } from '../data/datasets.ts'

/**
 * Emplacement de la fiche d'une entité.
 * @param ref Référence stable `genre:id` (par exemple `weapon:moonveil`).
 * @returns Une route nommée (`weapon`, `boss`…) avec son `id`, utilisable par `RouterLink` et `router.push`.
 */
export function entityRoute(ref: EntityRef): RouteLocationRaw {
  const separator = ref.indexOf(':')
  return { name: ref.slice(0, separator), params: { id: ref.slice(separator + 1) } }
}
