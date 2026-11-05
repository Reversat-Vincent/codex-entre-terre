<!-- Étapes de quête d'un PNJ en liste à cocher : groupes par lieu, coche locale à la page (non enregistrée), progression et remise à zéro. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EntityRef } from '../../../../data/datasets.ts'
import CxButton from '../../../ds/CxButton.vue'
import CxCheckbox from '../../../ds/CxCheckbox.vue'
import WikiInline from '../../WikiInline.vue'
import WikiText from '../../WikiText.vue'
import SheetSection from '../SheetSection.vue'
import { questGroups, questStepCount } from './npcModel.ts'

/**
 * Progression de quête du wiki (`questline`) en liste à cocher. La coche est un état local de la page : elle n'est pas enregistrée (aucun store de l'application
 * ne prévoit de suivi de quête), elle repart de zéro quand on quitte la fiche. Le texte des étapes est celui du wiki, en anglais ; un nom exact d'entité
 * devient un lien. Les précisions (`→`) sont affichées sous leur étape, sans case propre : une étape = une case.
 */
const props = defineProps<{
  /** Lignes de `questline.text`. */
  lines: readonly string[]
  /** Référence du PNJ : jamais lié à lui-même. */
  entityRef: EntityRef
}>()

const groups = computed(() => questGroups(props.lines))
const total = computed(() => questStepCount(groups.value))
const done = ref<ReadonlySet<string>>(new Set())

/**
 * Coche ou décoche une étape.
 * @param id Identifiant de l'étape.
 * @param checked Nouvel état.
 */
function setDone(id: string, checked: boolean): void {
  const next = new Set(done.value)
  if (checked) next.add(id)
  else next.delete(id)
  done.value = next
}

/** Décoche toutes les étapes. */
function reset(): void {
  done.value = new Set()
}
</script>

<template>
  <SheetSection
    v-if="groups.length > 0"
    title="Étapes de la quête"
    subtitle="Les cases ne servent qu’à suivre votre lecture : elles ne sont pas enregistrées."
  >
    <template #aside>
      <span
        class="sh-q-count cx-num"
        role="status"
      >{{ done.size }} / {{ total }} cochées</span>
      <CxButton
        size="sm"
        variant="ghost"
        icon="refresh"
        :disabled="done.size === 0"
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
          :class="{ 'is-done': done.has(s.id) }"
        >
          <CxCheckbox
            :model-value="done.has(s.id)"
            @update:model-value="setDone(s.id, $event)"
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
