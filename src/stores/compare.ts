// Store du comparateur : 2 à 4 éléments du même genre, en mémoire seulement (docs/architecture.md § 6 et § 15, P7).
// L'adresse `?e=<ref>,<ref>` reflète la liste ; le routeur appelle `replace` pour la lire.

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ENTITY_KINDS } from '../data/datasets.ts'
import type { EntityKind, EntityRef } from '../data/datasets.ts'

/** Nombre maximal d'éléments comparés. */
export const COMPARE_MAX = 4

/** Nombre minimal d'éléments pour ouvrir le comparateur. */
export const COMPARE_MIN = 2

/** Motif d'un refus d'ajout. */
export type CompareRefusalReason = 'full' | 'kind-mismatch' | 'duplicate' | 'invalid'

/** Refus d'ajout, avec un message en français prêt à afficher. */
export interface CompareRefusal {
  ok: false
  reason: CompareRefusalReason
  message: string
}

/**
 * Genre d'une référence.
 * @param entity Référence `genre:id`.
 * @returns Le genre, ou `null` si la référence est mal formée.
 */
export function kindOfRef(entity: string): EntityKind | null {
  const separator = entity.indexOf(':')
  if (separator < 1 || separator === entity.length - 1) return null
  const kind = entity.slice(0, separator)
  return (ENTITY_KINDS as readonly string[]).includes(kind) ? (kind as EntityKind) : null
}

/**
 * Store du comparateur.
 * Actions : `add(ref)` (renvoie `{ ok: true }` ou un refus motivé : liste pleine, genre différent, doublon), `remove(ref)`, `toggle(ref)`, `clear()`,
 * `replace(refs)` (adresse `?e=` : ne garde que les références valides du genre du premier, sans doublon, 4 au plus).
 * Getters : `kind` (genre commun ou `null`), `canCompare` (au moins 2 éléments), `has(ref)`.
 */
export const useCompareStore = defineStore('compare', () => {
  const items = ref<EntityRef[]>([])
  const kind = computed<EntityKind | null>(() => {
    const first = items.value[0]
    return first ? kindOfRef(first) : null
  })
  const canCompare = computed(() => items.value.length >= COMPARE_MIN)
  const has = computed(() => (entity: EntityRef): boolean => items.value.includes(entity))

  function add(entity: EntityRef): { ok: true } | CompareRefusal {
    const entityKind = kindOfRef(entity)
    if (!entityKind) return { ok: false, reason: 'invalid', message: 'Cet élément ne peut pas être comparé.' }
    if (items.value.includes(entity)) return { ok: false, reason: 'duplicate', message: 'Cet élément est déjà dans le comparateur.' }
    if (items.value.length >= COMPARE_MAX) {
      return { ok: false, reason: 'full', message: `Le comparateur contient déjà ${COMPARE_MAX} éléments : retirez-en un pour en ajouter un autre.` }
    }
    if (kind.value !== null && kind.value !== entityKind) {
      return { ok: false, reason: 'kind-mismatch', message: 'Le comparateur ne mélange pas les genres : videz-le pour comparer un autre genre d’élément.' }
    }
    items.value = [...items.value, entity]
    return { ok: true }
  }

  function remove(entity: EntityRef): void {
    items.value = items.value.filter((e) => e !== entity)
  }

  function toggle(entity: EntityRef): { ok: true } | CompareRefusal {
    if (items.value.includes(entity)) {
      remove(entity)
      return { ok: true }
    }
    return add(entity)
  }

  function clear(): void {
    items.value = []
  }

  function replace(refs: readonly string[]): void {
    const next: EntityRef[] = []
    let commonKind: EntityKind | null = null
    for (const candidate of refs) {
      const candidateKind = kindOfRef(candidate)
      if (!candidateKind || next.includes(candidate as EntityRef)) continue
      if (commonKind !== null && candidateKind !== commonKind) continue
      commonKind = candidateKind
      next.push(candidate as EntityRef)
      if (next.length === COMPARE_MAX) break
    }
    items.value = next
  }

  return { items, kind, canCompare, has, add, remove, toggle, clear, replace }
})
