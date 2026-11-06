<!-- Étapes de quête d'un PNJ en liste à cocher : groupes par lieu, coches enregistrées par le store `quests`, progression et remise à zéro. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityRef } from '../../../../data/datasets.ts'
import { questStepKeys, useQuestsStore } from '../../../../stores/quests.ts'
import { useToastsStore } from '../../../../stores/toasts.ts'
import CxButton from '../../../ds/CxButton.vue'
import CxCheckbox from '../../../ds/CxCheckbox.vue'
import WikiInline from '../../WikiInline.vue'
import WikiText from '../../WikiText.vue'
import SheetSection from '../SheetSection.vue'
import { questGroups, questStepCount } from './npcModel.ts'

/**
 * Progression de quête du wiki (`questline`) en liste à cocher. Les coches sont enregistrées avec le reste de l'état de l'utilisateur (store `quests`, D45) :
 * chaque étape a une clé tirée de son texte, calculée sur toutes les étapes du PNJ dans l'ordre d'affichage, groupes confondus (deux étapes identiques de
 * groupes différents ont donc deux clés). Le compteur ne compte que les étapes affichées : une coche orpheline (texte du wiki changé) ne le gonfle pas.
 * Le texte des étapes est celui du wiki, en anglais ; un nom exact d'entité devient un lien. Les précisions (`→`) sont affichées sous leur étape,
 * sans case propre : une étape = une case.
 */
const props = defineProps<{
  /** Lignes de `questline.text`. */
  lines: readonly string[]
  /** Référence du PNJ : jamais lié à lui-même. */
  entityRef: EntityRef
}>()

const groups = computed(() => questGroups(props.lines))
const total = computed(() => questStepCount(groups.value))
const quests = useQuestsStore()
const toasts = useToastsStore()

/** Identifiant du PNJ dans le store : la partie de la référence après `npc:`. */
const npcId = computed(() => props.entityRef.slice(props.entityRef.indexOf(':') + 1))
/** Clé de chaque étape affichée, par identifiant d'étape de la page. */
const keyOf = computed(() => {
  const steps = groups.value.flatMap((g) => g.steps)
  const keys = questStepKeys(steps.map((s) => s.text))
  return new Map(steps.map((s, i) => [s.id, keys[i] ?? s.id]))
})
const doneCount = computed(() => quests.doneCount(npcId.value, [...keyOf.value.values()]))

/**
 * Indique si une étape est cochée.
 * @param id Identifiant de l'étape dans la page.
 * @returns Vrai si sa clé est enregistrée comme cochée.
 */
function isDone(id: string): boolean {
  const key = keyOf.value.get(id)
  return key !== undefined && quests.isDone(npcId.value, key)
}

/**
 * Coche ou décoche une étape ; un refus du store (bornes de stockage atteintes) est dit dans une notification.
 * @param id Identifiant de l'étape dans la page.
 */
function toggle(id: string): void {
  const key = keyOf.value.get(id)
  if (key === undefined) return
  const wasDone = quests.isDone(npcId.value, key)
  if (!quests.toggle(npcId.value, key) && !wasDone) {
    toasts.push({ message: 'Cette étape ne peut pas être enregistrée : la limite de quêtes suivies est atteinte.', kind: 'warning' })
  }
}

/** Décoche toutes les étapes de ce PNJ. */
function reset(): void {
  quests.reset(npcId.value)
}
</script>

<template>
  <SheetSection
    v-if="groups.length > 0"
    title="Étapes de la quête"
    subtitle="Vos cases sont enregistrées sur cet appareil avec le reste de vos réglages."
  >
    <template #aside>
      <span
        class="sh-q-count cx-num"
        role="status"
      >{{ doneCount }} / {{ total }} cochées</span>
      <CxButton
        size="sm"
        variant="ghost"
        icon="refresh"
        :disabled="doneCount === 0"
        @click="reset"
      >
        Tout décocher
      </CxButton>
    </template>

    <section
      v-for="g in groups"
      :key="g.id"
      class="sh-q-group"
    >
      <h3
        v-if="g.title"
        class="sh-q-title"
      >
        {{ g.title }}
        <span
          v-if="g.optional"
          class="sh-q-opt"
        >Facultatif</span>
      </h3>
      <ol class="sh-q-steps">
        <li
          v-for="s in g.steps"
          :key="s.id"
          :class="{ 'is-done': isDone(s.id) }"
        >
          <CxCheckbox
            :model-value="isDone(s.id)"
            @update:model-value="toggle(s.id)"
          >
            <span
              v-if="s.optional"
              class="sh-q-opt"
            >Facultatif</span>
            <WikiInline
              :text="s.text"
              :preferred-kinds="['location', 'boss', 'npc', 'item']"
              :skip-ref="entityRef"
            />
          </CxCheckbox>
          <WikiText
            v-if="s.sub.length > 0"
            class="sh-q-sub"
            :lines="s.sub"
            mode="list"
            :preferred-kinds="['location', 'boss', 'npc', 'item']"
            :skip-ref="entityRef"
          />
        </li>
      </ol>
    </section>
  </SheetSection>
</template>

<style scoped>
.sh-q-count { color: var(--ink-2); font-size: 13px; }
.sh-q-group { display: grid; gap: var(--space-2); }
.sh-q-title { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding-bottom: var(--space-1); border-bottom: 1px solid var(--line); color: var(--ink); font: 600 15px/22px var(--font-sans); }
.sh-q-opt { display: inline-block; margin-right: var(--space-2); padding: 0 var(--space-2); border: 1px solid var(--line-strong); border-radius: var(--radius-s); color: var(--ink-2); font: 600 11px/18px var(--font-sans); letter-spacing: .02em; }
.sh-q-steps { display: grid; gap: var(--space-2); }
.sh-q-steps li { display: grid; gap: var(--space-1); }
.sh-q-steps :deep(.cx-check) { align-items: flex-start; font-size: 14px; line-height: 21px; }
.sh-q-steps :deep(.cx-check input) { margin-top: 3px; }
.sh-q-steps li.is-done :deep(.cx-check) { color: var(--ink-3); }
.sh-q-sub { margin-left: 23px; max-width: 72ch; font-size: 13px; line-height: 19px; color: var(--ink-2); }
@media (max-width: 767px) {
  .sh-q-sub { margin-left: 28px; }
}
</style>
