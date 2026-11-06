// Store des étapes de quête cochées sur les fiches de PNJ, enregistrées avec le reste de l'état de l'utilisateur (décision D45).
// Référence : docs/architecture.md § 6 (snapshot/hydrate) et § 7 (persistance). Aucun calcul de `calculs.md` ici.

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { normalizeText } from '../data/slug.ts'
import { LIMITS } from '../persistence/model.ts'
import type { NpcId, QuestsSlice } from '../persistence/model.ts'

/** Longueur maximale de la partie « texte » d'une clé d'étape, avant tout suffixe (`-2`, `-3`…). */
export const QUEST_KEY_TEXT_LENGTH = 80

/**
 * Clé stable d'une étape, tirée de son texte : `normalizeText` (sans accents, minuscules, signes retirés), mots joints par des tirets, 80 caractères au plus.
 * Une clé suit le texte du wiki, pas la position : une étape déplacée garde sa coche ; une étape dont le texte change la perd (limite assumée).
 * @param text Texte de l'étape (`QuestStep.text`, sans le préfixe « (Optional) »).
 * @returns La clé ; `etape` si le texte ne contient ni lettre ni chiffre.
 * @example questStepKey("Speak to Boc at Limgrave") === "speak-to-boc-at-limgrave"
 */
export function questStepKey(text: string): string {
  const key = normalizeText(text).replace(/ /g, '-').slice(0, QUEST_KEY_TEXT_LENGTH).replace(/-+$/, '')
  return key === '' ? 'etape' : key
}

/**
 * Clés de toutes les étapes d'un PNJ, dans l'ordre : deux étapes de même texte reçoivent un suffixe `-2`, `-3`…
 * Une clé déjà prise (même par un suffixe) est sautée, de sorte que les clés d'une liste sont toujours distinctes.
 * @param texts Textes des étapes d'un même PNJ, dans l'ordre d'affichage.
 * @returns Une clé par texte, dans le même ordre.
 * @example questStepKeys(["Go", "Go", "Stop"]) → ["go", "go-2", "stop"]
 */
export function questStepKeys(texts: readonly string[]): string[] {
  const used = new Set<string>()
  return texts.map((text) => {
    const base = questStepKey(text)
    let key = base
    for (let n = 2; used.has(key); n++) key = `${base}-${n}`
    used.add(key)
    return key
  })
}

/** Les clés `__proto__` ne sont jamais stockées : elles ne peuvent pas atteindre un objet sans prototype dédié. */
const isUnsafeKey = (key: string): boolean => key === '__proto__'

/** Copie d'une tranche sans PNJ vide ni clé dangereuse ; les objets sont reconstruits clé par clé. */
function cloneSlice(slice: QuestsSlice): QuestsSlice {
  const out: QuestsSlice = {}
  for (const npcId of Object.keys(slice)) {
    const steps = slice[npcId]
    if (isUnsafeKey(npcId) || !steps || steps.length === 0) continue
    Object.defineProperty(out, npcId, { value: [...steps], enumerable: true, writable: true, configurable: true })
  }
  return out
}

/**
 * Store des quêtes : `state` (PNJ → clés d'étapes cochées), `toggle(npcId, stepKey)` (renvoie vrai si l'étape est maintenant cochée),
 * `reset(npcId)` (décoche tout), `snapshot()` et `hydrate(slice)` pour la persistance.
 * Getters : `isDone(npcId, stepKey)` et `doneCount(npcId, among?)`. `among` restreint le compte aux clés données (les étapes encore présentes
 * dans la page) : une clé orpheline, dont le texte du wiki a changé, ne gonfle alors pas le compteur.
 * Bornes de `LIMITS` : 300 PNJ, 200 étapes par PNJ, clés de 100 caractères ; au-delà, `toggle` refuse de cocher.
 */
export const useQuestsStore = defineStore('quests', () => {
  const state = ref<QuestsSlice>({})

  const isDone = computed(
    () =>
      (npcId: NpcId, stepKey: string): boolean =>
        Object.hasOwn(state.value, npcId) && state.value[npcId]!.includes(stepKey),
  )

  const doneCount = computed(
    () =>
      (npcId: NpcId, among?: readonly string[]): number => {
        if (!Object.hasOwn(state.value, npcId)) return 0
        const done = state.value[npcId]!
        if (among === undefined) return done.length
        const keys = new Set(among)
        return done.filter((k) => keys.has(k)).length
      },
  )

  function setSteps(npcId: NpcId, steps: string[]): void {
    const next = cloneSlice(state.value)
    if (steps.length > 0) Object.defineProperty(next, npcId, { value: steps, enumerable: true, writable: true, configurable: true })
    else delete next[npcId]
    state.value = next
  }

  function toggle(npcId: NpcId, stepKey: string): boolean {
    if (isUnsafeKey(npcId) || npcId === '' || stepKey === '' || stepKey.length > LIMITS.maxQuestKey) return false
    const current = Object.hasOwn(state.value, npcId) ? state.value[npcId]! : []
    if (current.includes(stepKey)) {
      setSteps(npcId, current.filter((k) => k !== stepKey))
      return false
    }
    const isNew = current.length === 0
    if (current.length >= LIMITS.maxQuestSteps || (isNew && Object.keys(state.value).length >= LIMITS.maxQuestNpcs)) return false
    setSteps(npcId, [...current, stepKey])
    return true
  }

  function reset(npcId: NpcId): void {
    if (Object.hasOwn(state.value, npcId)) setSteps(npcId, [])
  }

  function snapshot(): QuestsSlice {
    return cloneSlice(state.value)
  }

  function hydrate(slice: QuestsSlice): void {
    state.value = cloneSlice(slice)
  }

  return { state, isDone, doneCount, toggle, reset, snapshot, hydrate }
})
