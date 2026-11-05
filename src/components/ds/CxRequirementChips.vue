<!-- Prérequis d'attribut d'une arme comparés au profil actif : atteint, écart « +14 INT », mention « 2M » à deux mains. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { RequirementCheck } from '../../engine/requirements.ts'
import { formatInt } from '../../ui/format.ts'
import { ATTRIBUTE_LABELS } from '../../ui/labels.ts'
import CxIcon from './CxIcon.vue'

/**
 * Puces de prérequis (README du design system, composant RequirementChip) à partir des `RequirementCheck` du moteur
 * (`compareRequirements`, calculs.md « Prérequis comparés au profil ») ; le composant ne calcule rien.
 * - Atteint : coche et « STR 11 ». Manquant : triangle, valeur demandée puis écart « +14 INT » en points réels à ajouter.
 * - « 2M » quand la Force effective à deux mains est ce qui rend le prérequis atteint ; l'écart reste en Force réelle.
 * - Sans profil configuré (`profileConfigured` faux) : puces neutres et message « Configurez votre profil pour comparer ».
 * Forme (icône), mot (écart) et couleur vont ensemble : jamais la couleur seule.
 */
const props = withDefaults(
  defineProps<{
    /** Comparaisons du moteur, une par prérequis non nul. Vide : l'arme n'a aucun prérequis. */
    checks: readonly RequirementCheck[]
    /** Faux quand aucun profil n'est configuré : la comparaison n'a pas de sens, les puces restent neutres. */
    profileConfigured?: boolean
  }>(),
  { profileConfigured: true },
)

const chips = computed(() =>
  props.checks.map((c) => {
    const { abbr, name } = ATTRIBUTE_LABELS[c.attr]
    // La mention 2M n'a de sens que si le bonus a rendu le prérequis atteint (Force réelle insuffisante, effective suffisante).
    const twoHand = c.twoHandApplied && c.met && c.actual < c.required
    const state = !props.profileConfigured ? 'neutral' : c.met ? 'ok' : 'miss'
    let tip = `${name} : demandé ${formatInt(c.required)}`
    if (props.profileConfigured) {
      tip += `, profil ${formatInt(c.actual)}`
      if (c.twoHandApplied) tip += `, effectif à deux mains ${formatInt(c.effective)} (Force × 1,5, arrondie à l'entier inférieur)`
      tip += c.met ? ' : atteint' : ` : manque ${formatInt(c.gap)}${c.twoHandApplied ? ' en Force réelle' : ''}`
    }
    return { attr: c.attr, abbr, required: c.required, gap: c.gap, state, twoHand, tip }
  }),
)
</script>

<template>
  <span
    v-if="chips.length > 0"
    class="cx-req-list"
  >
    <span
      v-for="chip in chips"
      :key="chip.attr"
      class="cx-req"
      :class="{ 'is-ok': chip.state === 'ok', 'is-miss': chip.state === 'miss' }"
      role="img"
      :aria-label="`${chip.abbr} ${chip.required} : ${chip.tip}`"
      :title="chip.tip"
    >
      <CxIcon
        v-if="chip.state !== 'neutral'"
        :name="chip.state === 'ok' ? 'check' : 'alert'"
      />
      {{ chip.abbr }} {{ formatInt(chip.required) }}
      <span
        v-if="chip.twoHand"
        class="cx-req-2h"
      >2M</span>
      <span
        v-if="chip.state === 'miss'"
        class="cx-req-gap"
      >+{{ formatInt(chip.gap) }} {{ chip.abbr }}</span>
    </span>
    <span
      v-if="!profileConfigured"
      class="cx-muted cx-req-hint"
    >Configurez votre profil pour comparer</span>
  </span>
  <span
    v-else
    class="cx-muted"
  >Aucun prérequis</span>
</template>

<style>
.cx-req-list { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); vertical-align: middle; }
.cx-req-hint { font-size: 12px; }
.cx-req { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px; border: 1px solid var(--line-strong); border-radius: var(--radius-s); color: var(--ink-2); font: 600 11px/14px var(--font-sans); font-variant-numeric: tabular-nums; white-space: nowrap; vertical-align: middle; }
.cx-req .cx-i { width: 12px; height: 12px; vertical-align: 0; }
.cx-req.is-ok { border-color: color-mix(in srgb, var(--ready) 40%, transparent); background: var(--ready-wash); color: var(--ready); }
.cx-req.is-miss { border-color: color-mix(in srgb, var(--warn) 50%, transparent); background: var(--warn-wash); color: var(--warn); }
.cx-req-gap { margin-left: 2px; padding-left: 5px; border-left: 1px solid currentColor; font-weight: 700; }
.cx-req-2h { padding: 0 3px; border-radius: 2px; background: color-mix(in srgb, currentColor 18%, transparent); font-size: 10px; }
</style>
