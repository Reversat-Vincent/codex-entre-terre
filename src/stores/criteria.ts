// Store des critères de travail (docs/architecture.md § 6) : contenu, personnage, build cible, style, progression, contraintes, fiabilité.
// Les boss vaincus en font partie : ils suivent le personnage et entrent dans les profils. Persisté via `snapshot()`/`hydrate()` (pont de persistance).

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ATTRIBUTE_KEYS } from '../data/keys.ts'
import type { AttributeKey } from '../data/keys.ts'
import { originAttributes } from '../engine/level.ts'
import { LIMITS } from '../persistence/model.ts'
import type { Attributes, Criteria } from '../persistence/model.ts'
import { useDataStore } from './data.ts'
import { useProfilesStore } from './profiles.ts'
import { useToastsStore } from './toasts.ts'

export type { Criteria } from '../persistence/model.ts'

/** Modification partielle des critères : chaque section est fusionnée clé à clé, les listes sont remplacées. */
export type CriteriaPatch = {
  [S in keyof Criteria]?: Partial<Criteria[S]>
}

/**
 * Critères par défaut d'un nouvel utilisateur, neutres plutôt que le profil de démonstration du prototype (D31) : jeu de base et
 * Shadow of the Erdtree, sans Tarnished Pack ; origine automatique ; attributs à 10 (niveau 1) ; pas de build cible (état vide du
 * widget B), niveau cible 150 ; mêlée, aucune classe préférée, une main, aucun statut, charge moyenne ; progression par étape, Début,
 * aucun boss vaincu ; aucune contrainte ; estimations incluses.
 * @returns Un objet neuf à chaque appel.
 */
export function defaultCriteria(): Criteria {
  return {
    content: { base: true, sote: true, tp: false },
    character: {
      origin: 'auto',
      attributes: { vig: 10, mnd: 10, end: 10, str: 10, dex: 10, int: 10, fai: 10, arc: 10 },
    },
    target: { archetype: null, level: 150 },
    style: { mode: 'melee', classes: [], hands: 1, status: null, load: 'mid' },
    progress: { mode: 'stage', stage: 'early', regions: [], defeated: [] },
    constraints: { excludeRemembrance: false, excludeRandomDrop: false, excludeQuest: false, stonePreference: 'none' },
    reliability: { includeEstimates: true },
  }
}

/**
 * Copie profonde de critères (les critères ne contiennent que du JSON).
 * @param c Critères à copier.
 * @returns Une copie indépendante.
 */
export function cloneCriteria(c: Criteria): Criteria {
  return JSON.parse(JSON.stringify(c)) as Criteria
}

/**
 * Compare deux critères par valeur.
 * @param a Premiers critères.
 * @param b Seconds critères.
 * @returns Vrai si leur contenu est identique.
 */
export function criteriaEqual(a: Criteria, b: Criteria): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Vrai si les huit attributs de `a` et de `b` sont égaux. */
const sameAttributes = (a: Attributes, b: Attributes): boolean => ATTRIBUTE_KEYS.every((k) => a[k] === b[k])

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(n)))

/**
 * Store des critères de travail.
 * Actions : `set(patch)` (fusion par section, valeurs numériques bornées), `setOrigin(id)` (choix de l'origine, avec ses attributs de départ si
 * le joueur ne les a pas déjà modifiés), `setAttribute(clé, valeur)`, `toggleDefeated(clé)` (bascule la progression en mode « boss »),
 * `reset()` (retour au profil actif ou aux valeurs par défaut, avec « Annuler »), `snapshot()` et `hydrate(slice)` pour la persistance.
 */
export const useCriteriaStore = defineStore('criteria', () => {
  const criteria = ref<Criteria>(defaultCriteria())

  function set(patch: CriteriaPatch): void {
    const next = cloneCriteria(criteria.value)
    for (const section of Object.keys(patch) as (keyof Criteria)[]) {
      const part = patch[section]
      if (part) Object.assign(next[section], JSON.parse(JSON.stringify(part)))
    }
    // Attributs et niveau cible restent dans les bornes de la validation : un état sorti des bornes ne pourrait plus être exporté puis importé.
    for (const key of ATTRIBUTE_KEYS) {
      next.character.attributes[key] = clamp(next.character.attributes[key], LIMITS.attributeMin, LIMITS.attributeMax)
    }
    next.target.level = clamp(next.target.level, LIMITS.levelMin, LIMITS.levelMax)
    next.content.base = true
    next.style.classes = [...new Set(next.style.classes)]
    criteria.value = next
  }

  function setAttribute(key: AttributeKey, value: number): void {
    set({ character: { attributes: { ...criteria.value.character.attributes, [key]: value } } })
  }

  /**
   * Choisit l'origine du personnage (calculs.md, « Origine optimale » : le niveau est la somme des attributs − 79, donc les attributs de départ
   * de l'origine comptent). Si les attributs actuels sont encore ceux par défaut, ou exactement ceux de départ de l'origine précédente, ils sont
   * remplacés par ceux de départ de la nouvelle origine ; sinon (le joueur les a modifiés) seule l'origine change. `auto`, une origine absente
   * des données ou des données non chargées ne touchent jamais aux attributs. La recherche passe par `find` sur la liste des origines, jamais
   * par une clé d'objet : un identifiant venu d'ailleurs ne peut pas désigner autre chose qu'une origine.
   * @param id Identifiant d'origine (`origins[].id`) ou `auto`.
   * @returns Vrai si les attributs ont été remplacés (l'interface propose alors « Annuler »), faux sinon.
   */
  function setOrigin(id: string): boolean {
    const current = criteria.value.character
    const origins = useDataStore().dataset('origins')?.entries ?? []
    const chosen = id === 'auto' ? undefined : origins.find((o) => o.id === id)
    if (chosen === undefined) {
      set({ character: { origin: id } })
      return false
    }
    const previous = current.origin === 'auto' ? undefined : origins.find((o) => o.id === current.origin)
    const untouched = sameAttributes(current.attributes, defaultCriteria().character.attributes) || (previous !== undefined && sameAttributes(current.attributes, originAttributes(previous)))
    if (!untouched) {
      set({ character: { origin: id } })
      return false
    }
    const start = originAttributes(chosen)
    const replaced = !sameAttributes(current.attributes, start)
    set({ character: { origin: id, attributes: start } })
    return replaced
  }

  function toggleDefeated(key: string): void {
    const defeated = criteria.value.progress.defeated
    set({ progress: { mode: 'boss', defeated: defeated.includes(key) ? defeated.filter((k) => k !== key) : [...defeated, key] } })
  }

  function reset(): void {
    const previous = cloneCriteria(criteria.value)
    const profiles = useProfilesStore()
    const active = profiles.active
    criteria.value = active ? cloneCriteria(active.criteria) : defaultCriteria()
    useToastsStore().undoable(
      'Critères réinitialisés',
      () => {
        criteria.value = previous
      },
      'refresh',
    )
  }

  function snapshot(): Criteria {
    return cloneCriteria(criteria.value)
  }

  function hydrate(slice: Criteria): void {
    criteria.value = cloneCriteria(slice)
  }

  return { criteria, set, setOrigin, setAttribute, toggleDefeated, reset, snapshot, hydrate }
})
