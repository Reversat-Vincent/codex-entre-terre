<!-- Lettres de scaling d'une arme (S à E) attribut par attribut, avec les couleurs `grade-*` du design system. -->
<script setup lang="ts">
import { computed } from 'vue'
import { WEAPON_ATTRIBUTE_KEYS, type Grade, type WeaponAttributeKey } from '../../data/keys.ts'
import { ATTRIBUTE_LABELS } from '../../ui/labels.ts'

/**
 * Puces de scaling (README du design system, composant ScalingChip), dans l'ordre STR, DEX, INT, FAI, ARC.
 * Décision D17 : un attribut à `null` ou absent n'a pas de scaling, donc pas de puce (écart au README, qui affiche « ? »).
 * Les lettres décrivent l'arme à +0 ; pour un autre niveau, l'appelant ajoute le badge Calculé. La lettre porte le sens, la couleur le renforce.
 */
const props = defineProps<{
  /** Lettre de scaling par attribut ; `null` ou absent = pas de scaling pour cet attribut. */
  scaling: Readonly<Partial<Record<WeaponAttributeKey, Grade | null>>>
}>()

const chips = computed(() =>
  WEAPON_ATTRIBUTE_KEYS.flatMap((attr) => {
    const grade = props.scaling[attr]
    return grade ? [{ attr, grade, abbr: ATTRIBUTE_LABELS[attr].abbr, name: ATTRIBUTE_LABELS[attr].name }] : []
  }),
)
</script>

<template>
  <span
    v-if="chips.length > 0"
    class="cx-scl-list"
  >
    <span
      v-for="chip in chips"
      :key="chip.attr"
      class="cx-scl"
      :title="`${chip.name} : scaling ${chip.grade}`"
    >
      <span class="cx-scl-attr">{{ chip.abbr }}</span>
      <span
        class="cx-scl-g"
        :class="`g-${chip.grade.toLowerCase()}`"
      >{{ chip.grade }}</span>
    </span>
  </span>
</template>

<style>
.cx-scl-list { display: inline-flex; flex-wrap: wrap; gap: var(--space-1); vertical-align: middle; }
.cx-scl { display: inline-flex; align-items: stretch; height: 20px; overflow: hidden; border: 1px solid var(--line-strong); border-radius: var(--radius-xs); font: 600 11px/18px var(--font-sans); vertical-align: middle; }
.cx-scl-attr { padding: 0 5px; background: var(--surface); color: var(--ink-2); letter-spacing: .02em; }
.cx-scl-g { min-width: 18px; padding: 0 4px; text-align: center; font-weight: 700; }
.g-s { background: var(--grade-s); color: var(--on-grade-s); }
.g-a { background: var(--grade-a); color: var(--on-grade-a); }
.g-b { background: var(--grade-b); color: var(--on-grade-b); }
.g-c { background: var(--grade-c); color: var(--on-grade-c); }
.g-d { background: var(--grade-d); color: var(--on-grade-d); }
.g-e { background: var(--grade-e); color: var(--on-grade-e); }
</style>
