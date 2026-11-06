<!-- Barres des huit attributs de départ d'une origine face au build cible : remplissage = départ, repère or = cible, hachures = points gaspillés. -->
<script setup lang="ts">
import { computed } from 'vue'
import { ATTRIBUTE_KEYS } from '../../data/keys.ts'
import type { AttributeKey } from '../../data/keys.ts'
import type { Attributes } from '../../engine/types.ts'
import { ATTRIBUTE_LABELS } from '../../ui/labels.ts'

/**
 * Compare les attributs de départ d'une origine à la cible (note `spec-main`, widget B). Les valeurs viennent du moteur : le départ est lu dans
 * `origins`, la cible est celle de `analysis.target`. Les largeurs en pourcentage ne sont qu'une mise à l'échelle d'affichage (échelle commune
 * aux huit barres : la plus grande valeur du départ ou de la cible). Le texte de chaque ligne dit les deux valeurs et l'écart : la barre n'est
 * jamais le seul porteur de l'information.
 */
const props = defineProps<{
  /** Attributs de départ de l'origine. */
  start: Attributes
  /** Attributs du build cible. */
  target: Attributes
  /** Points gaspillés par attribut, tels que le moteur les rend (`OriginRank.wastedBy`) ; un attribut absent n'en gaspille aucun. */
  wastedBy: Readonly<Partial<Record<AttributeKey, number>>>
}>()

/** Échelle des barres : la plus grande valeur parmi le départ et la cible. */
const scale = computed(() => Math.max(1, ...ATTRIBUTE_KEYS.flatMap((k) => [props.start[k], props.target[k]])))
const pct = (n: number): number => (n / scale.value) * 100

const rows = computed(() =>
  ATTRIBUTE_KEYS.map((key) => {
    const start = props.start[key]
    const target = props.target[key]
    // Table partielle : un attribut absent de `wastedBy` n'a aucun point perdu.
    const wasted = props.wastedBy[key] ?? 0
    return {
      key,
      abbr: ATTRIBUTE_LABELS[key].abbr,
      name: ATTRIBUTE_LABELS[key].name,
      start,
      target,
      wasted,
      fill: pct(start),
      targetAt: pct(target),
      wasteAt: pct(target),
      wasteWidth: pct(wasted),
    }
  }),
)
</script>

<template>
  <div class="cx-ob-bars">
    <div
      v-for="row in rows"
      :key="row.key"
      class="cx-ob-bar"
    >
      <abbr
        class="cx-ob-k"
        :title="row.name"
      >{{ row.abbr }}</abbr>
      <span
        class="cx-ob-track"
        aria-hidden="true"
      >
        <span
          class="cx-ob-fill"
          :style="{ width: `${row.fill}%` }"
        />
        <span
          v-if="row.wasted > 0"
          class="cx-ob-waste"
          :style="{ left: `${row.wasteAt}%`, width: `${row.wasteWidth}%` }"
        />
        <span
          class="cx-ob-tgt"
          :style="{ left: `${row.targetAt}%` }"
        />
      </span>
      <span class="cx-ob-v">
        {{ row.start }} sur {{ row.target }}<template v-if="row.wasted > 0"><span class="cx-ob-w"> (+{{ row.wasted }} gaspillé<template v-if="row.wasted > 1">s</template>)</span></template>
      </span>
    </div>
  </div>
</template>

<style>
.cx-ob-bars { display: grid; gap: 7px; }
.cx-ob-bar { display: grid; grid-template-columns: 34px minmax(0, 1fr) minmax(96px, auto); align-items: center; gap: var(--space-2); font-size: 12px; line-height: 16px; }
.cx-ob-k { color: var(--ink-2); font-weight: 700; text-decoration: none; letter-spacing: .02em; }
.cx-ob-track { position: relative; height: 8px; border-radius: 4px; background: var(--surface-sunken); box-shadow: inset 0 0 0 1px var(--line); }
.cx-ob-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--ink-3); transition: width .15s ease; }
.cx-ob-waste { position: absolute; top: 0; bottom: 0; background: repeating-linear-gradient(135deg, var(--warn) 0 2px, transparent 2px 5px); transition: width .15s ease, left .15s ease; }
.cx-ob-tgt { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--gold); transition: left .15s ease; }
.cx-ob-v { color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }
.cx-ob-w { color: var(--warn); }
@media (prefers-reduced-motion: reduce) { .cx-ob-fill, .cx-ob-waste, .cx-ob-tgt { transition: none; } }
</style>
