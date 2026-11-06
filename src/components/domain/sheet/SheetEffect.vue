<!-- Section « Effet » commune : phrase d'effet de l'infobox, détails du wiki (valeurs exactes) et, s'il y en a, description du jeu en paragraphes. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import CxValue from '../../ds/CxValue.vue'
import WikiText from '../WikiText.vue'
import SheetSection from './SheetSection.vue'
import { descriptionParagraphs } from './sheetModel.ts'

/**
 * Effet d'un élément. `effect` est la ligne d'effet de l'infobox, `details` le contenu des sections d'effet du wiki (valeurs exactes, en anglais, tel quel),
 * `description` le texte du jeu. Chaque partie absente s'affiche « Non documenté » quand `requireEffect` / `requireDetails` l'exigent, sinon elle est omise.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    /** Ligne d'effet de l'infobox ; `null` : non documentée. */
    effect?: string | null
    /** Exiger la ligne d'effet : sans elle, « Non documenté » s'affiche. */
    requireEffect?: boolean
    /** Détails du wiki (`effect_details`). */
    details?: readonly string[]
    /** Titre du bloc de détails. */
    detailsLabel?: string
    /** Exiger les détails : sans eux, « Non documenté » s'affiche. */
    requireDetails?: boolean
    /** Description du jeu (retours à la ligne de mise en page joints). */
    description?: string | null
    entityRef: EntityRef
    linkKinds?: readonly EntityKind[]
  }>(),
  {
    title: 'Effet',
    effect: undefined,
    requireEffect: false,
    details: undefined,
    detailsLabel: 'Détails du wiki',
    requireDetails: false,
    description: undefined,
    linkKinds: () => [],
  },
)

const paragraphs = computed(() => descriptionParagraphs(props.description))
// Longueur : l'absence de détails veut dire « aucun détail » (la section est alors omise).
const hasDetails = computed(() => (props.details?.length ?? 0) > 0)
</script>

<template>
  <SheetSection :title="title">
    <p
      v-if="effect"
      class="sh-effect"
    >
      {{ effect }}
    </p>
    <p
      v-else-if="requireEffect"
      class="sh-effect"
    >
      <CxValue :value="null" />
    </p>

    <div
      v-if="hasDetails"
      class="sh-block"
    >
      <h3 class="cx-label">
        {{ detailsLabel }}
      </h3>
      <WikiText
        :lines="details ?? []"
        :preferred-kinds="linkKinds"
        :skip-ref="entityRef"
      />
    </div>
    <div
      v-else-if="requireDetails"
      class="sh-block"
    >
      <h3 class="cx-label">
        {{ detailsLabel }}
      </h3>
      <p><CxValue :value="null" /></p>
    </div>

    <div
      v-if="paragraphs.length > 0"
      class="sh-block"
    >
      <h3 class="cx-label">
        Description du jeu
      </h3>
      <div class="sh-desc">
        <p
          v-for="(p, i) in paragraphs"
          :key="i"
        >
          {{ p }}
        </p>
      </div>
    </div>
  </SheetSection>
</template>

<style scoped>
.sh-effect { color: var(--ink); font: 600 16px/24px var(--font-sans); overflow-wrap: anywhere; }
.sh-block { display: grid; gap: var(--space-2); min-width: 0; }
.sh-desc { display: grid; gap: var(--space-3); max-width: 72ch; color: var(--ink-2); font-size: 14px; line-height: 22px; overflow-wrap: anywhere; }
</style>
