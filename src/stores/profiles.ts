// Store des profils de critères enregistrés (docs/architecture.md § 6) : enregistrer, charger, renommer, supprimer.
// Le profil actif sert de référence à « Réinitialiser » et à l'indicateur de modifications non enregistrées (`dirty`).

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LIMITS } from '../persistence/model.ts'
import type { ProfileRecord, ProfilesSlice } from '../persistence/model.ts'
import { cloneCriteria, criteriaEqual, useCriteriaStore } from './criteria.ts'
import { useToastsStore } from './toasts.ts'

/** Nom proposé quand l'utilisateur n'en saisit pas. */
const DEFAULT_NAME = 'Profil sans nom'

/** Motifs de refus d'un enregistrement. */
export type ProfileRefusal = 'limit' | 'no-active'

/**
 * Normalise un nom de profil : espaces de bord retirés, longueur bornée, nom par défaut si vide.
 * @param name Nom saisi.
 * @returns Le nom à enregistrer.
 */
export function normalizeProfileName(name: string): string {
  const trimmed = name.trim().slice(0, LIMITS.maxString).trim()
  return trimmed === '' ? DEFAULT_NAME : trimmed
}

/**
 * Store des profils.
 * Actions : `save()` (met à jour le profil actif), `saveAs(nom)` (crée un profil et l'active), `load(id)` (remplace les critères, avec « Annuler »),
 * `rename(id, nom)`, `remove(id)` (avec « Annuler »), `snapshot()` et `hydrate(slice)` pour la persistance.
 * Le getter `dirty` est vrai quand les critères de travail diffèrent du profil actif ; sans profil actif il est faux.
 */
export const useProfilesStore = defineStore('profiles', () => {
  const items = ref<ProfileRecord[]>([])
  const activeId = ref<string | null>(null)

  const active = computed(() => items.value.find((p) => p.id === activeId.value) ?? null)
  const dirty = computed(() => {
    const profile = active.value
    return profile !== null && !criteriaEqual(profile.criteria, useCriteriaStore().criteria)
  })

  function newId(): string {
    // Identifiant opaque et unique dans la liste ; `crypto.randomUUID` n'existe pas hors contexte sécurisé.
    let id: string
    do {
      id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    } while (items.value.some((p) => p.id === id))
    return id
  }

  function save(): { ok: true } | { ok: false; reason: ProfileRefusal } {
    const profile = active.value
    if (!profile) return { ok: false, reason: 'no-active' }
    profile.criteria = cloneCriteria(useCriteriaStore().criteria)
    profile.savedAt = new Date().toISOString()
    useToastsStore().push({ message: `Profil « ${profile.name} » enregistré`, kind: 'success', icon: 'check' })
    return { ok: true }
  }

  function saveAs(name: string): { ok: true; id: string } | { ok: false; reason: ProfileRefusal } {
    if (items.value.length >= LIMITS.maxProfiles) {
      useToastsStore().push({ message: `Limite de ${LIMITS.maxProfiles} profils atteinte : supprimez-en un d’abord.`, kind: 'warning' })
      return { ok: false, reason: 'limit' }
    }
    const profile: ProfileRecord = {
      id: newId(),
      name: normalizeProfileName(name),
      criteria: cloneCriteria(useCriteriaStore().criteria),
      savedAt: new Date().toISOString(),
    }
    items.value = [...items.value, profile]
    activeId.value = profile.id
    useToastsStore().push({ message: `Profil « ${profile.name} » enregistré`, kind: 'success', icon: 'check' })
    return { ok: true, id: profile.id }
  }

  function load(id: string): boolean {
    const profile = items.value.find((p) => p.id === id)
    if (!profile) return false
    const criteriaStore = useCriteriaStore()
    const previousCriteria = cloneCriteria(criteriaStore.criteria)
    const previousActive = activeId.value
    criteriaStore.hydrate(profile.criteria)
    activeId.value = profile.id
    // Charger écarte les modifications non enregistrées : « Annuler » les rend.
    useToastsStore().undoable(
      `Profil « ${profile.name} » chargé`,
      () => {
        criteriaStore.hydrate(previousCriteria)
        activeId.value = items.value.some((p) => p.id === previousActive) ? previousActive : null
      },
      'refresh',
    )
    return true
  }

  function rename(id: string, name: string): boolean {
    const profile = items.value.find((p) => p.id === id)
    if (!profile) return false
    profile.name = normalizeProfileName(name)
    return true
  }

  function remove(id: string): boolean {
    const index = items.value.findIndex((p) => p.id === id)
    const profile = items.value[index]
    if (!profile) return false
    const wasActive = activeId.value === id
    items.value = items.value.filter((p) => p.id !== id)
    if (wasActive) activeId.value = null
    useToastsStore().undoable(
      `Profil « ${profile.name} » supprimé`,
      () => {
        if (items.value.length >= LIMITS.maxProfiles || items.value.some((p) => p.id === profile.id)) return
        const restored = [...items.value]
        restored.splice(Math.min(index, restored.length), 0, profile)
        items.value = restored
        if (wasActive && activeId.value === null) activeId.value = profile.id
      },
      'x',
    )
    return true
  }

  function snapshot(): ProfilesSlice {
    return JSON.parse(JSON.stringify({ items: items.value, activeId: activeId.value })) as ProfilesSlice
  }

  function hydrate(slice: ProfilesSlice): void {
    const copy = JSON.parse(JSON.stringify(slice)) as ProfilesSlice
    items.value = copy.items
    activeId.value = copy.activeId
  }

  return { items, activeId, active, dirty, save, saveAs, load, rename, remove, snapshot, hydrate }
})
