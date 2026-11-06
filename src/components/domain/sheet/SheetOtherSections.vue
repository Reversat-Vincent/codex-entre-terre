<!-- Sections annexes de la page du wiki (stratégies, conseils…) : titre du wiki, texte et tableaux éventuels, sans les doublons des notes. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import type { WikiSection } from '../../../data/types/common.ts'
import WikiTable from '../WikiTable.vue'
import WikiText from '../WikiText.vue'
import SheetSection from './SheetSection.vue'
import { otherSectionViews } from './sheetModel.ts'

/**
 * Rend `other_sections` : un cadre par section du wiki, titre en anglais tel quel. Texte et tableaux sont rendus par interpolation
 * (`WikiText`, `WikiTable`) ; les liens ne visent que des noms exacts d'entités.
 */
const props = defineProps<{
  sections: Readonly<Record<string, WikiSection>> | undefined
  /** Notes de l'entrée : une section qui les répète mot pour mot est omise. */
  notes: readonly string[] | undefined
  entityRef: EntityRef
  linkKinds?: readonly EntityKind[]
}>()

const views = computed(() => otherSectionViews(props.sections, props.notes))
</script>

<template>
  <template v-if="views.length > 0">
    <SheetSection
      v-for="v in views"
      :key="v.title"
      :title="v.title"
      subtitle="Section de la page du wiki"
    >
      <WikiText
        v-if="v.section.text.length > 0"
        :lines="v.section.text"
        :preferred-kinds="linkKinds"
        :skip-ref="entityRef"
      />
      <WikiTable
        v-for="(t, i) in v.section.tables ?? []"
        :key="i"
        :rows="t"
        :caption="`${v.title}, tableau ${i + 1}`"
        :preferred-kinds="linkKinds"
        :skip-ref="entityRef"
      />
    </SheetSection>
  </template>
</template>
