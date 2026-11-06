<!-- Le fil d'or : les étapes de partie reliées par une ligne, passées en or, à venir en gris, étape courante en halo. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ThreadStage } from './types.ts'

/**
 * Fil d'or (README du design system, composant ProgressThread) : étapes passées (losange plein, ligne `gold`),
 * étape courante (`aria-current="step"`, halo `gold-wash`, libellé `gold-text`), étapes à venir (losange creux, ligne `line-strong`).
 * L'étape courante vient du critère Progression ; sans étape courante connue, aucune n'est passée.
 * Le passé et le courant se distinguent aussi par la forme (losange plein ou creux) et par `aria-current` : jamais la couleur seule.
 */
const props = defineProps<{
  /** Étapes dans l'ordre de la progression. */
  stages: readonly ThreadStage[]
  /** Identifiant de l'étape courante ; `null` = inconnue. */
  current: string | null
}>()

const currentIndex = computed(() => (props.current === null ? -1 : props.stages.findIndex((s) => s.id === props.current)))
const items = computed(() =>
  props.stages.map((stage, index) => ({
    stage,
    state: currentIndex.value < 0 ? 'todo' : index < currentIndex.value ? 'past' : index === currentIndex.value ? 'now' : 'todo',
  })),
)
</script>

<template>
  <ol
    class="cx-thread"
    :style="{ '--n': stages.length }"
  >
    <li
      v-for="item in items"
      :key="item.stage.id"
      class="cx-thread-stage"
      :class="{ 'is-past': item.state === 'past', 'is-now': item.state === 'now' }"
      :aria-current="item.state === 'now' ? 'step' : undefined"
    >
      <span
        class="cx-thread-dot"
        aria-hidden="true"
      />
      <span class="cx-thread-label">
        {{ item.stage.label }}
        <span
          v-if="item.state === 'past'"
          class="cx-sr"
        > (passée)</span>
        <span
          v-if="item.stage.regions"
          class="cx-thread-regions"
        >{{ item.stage.regions }}</span>
      </span>
    </li>
  </ol>
</template>

<style>
.cx-thread { display: grid; grid-template-columns: repeat(var(--n, 5), minmax(0, 1fr)); gap: var(--space-3); }
.cx-thread-stage { position: relative; display: flex; align-items: center; gap: var(--space-2); padding: 4px 0 10px; color: var(--ink-2); font-weight: 600; font-size: 13px; }
.cx-thread-stage::before { content: ""; position: absolute; left: 0; right: calc(-1 * var(--space-3)); bottom: 2px; height: 2px; background: var(--line-strong); }
.cx-thread-stage:last-child::before { right: 0; }
.cx-thread-stage.is-past::before, .cx-thread-stage.is-now::before { background: var(--gold); }
.cx-thread-stage.is-now::before { background: linear-gradient(90deg, var(--gold) 0 50%, var(--line-strong) 50%); }
.cx-thread-dot { position: absolute; left: 0; bottom: -2px; width: 10px; height: 10px; border: 2px solid var(--control-border); background: var(--surface); transform: rotate(45deg); z-index: 1; }
.cx-thread-stage.is-past .cx-thread-dot { background: var(--gold); border-color: var(--gold); }
.cx-thread-stage.is-now .cx-thread-dot { border-color: var(--gold); background: var(--gold); box-shadow: 0 0 0 4px var(--gold-wash), 0 0 14px var(--gold); }
.cx-thread-stage.is-now { color: var(--gold-text); }
.cx-thread-label { padding-left: 18px; }
.cx-thread-stage .cx-thread-regions { display: block; color: var(--ink-3); font-weight: 400; font-size: 11px; line-height: 14px; }
@media (max-width: 767px) { .cx-thread { grid-template-columns: minmax(0, 1fr); } }
</style>
