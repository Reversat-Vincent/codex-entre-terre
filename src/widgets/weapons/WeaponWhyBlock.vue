<!-- Panneau d'une arme du widget A : « Pourquoi ? » (explication du score) ou « Alternatives » (armes proches), sous les colonnes. -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import CxButton from '../../components/ds/CxButton.vue'
import CxReliabilityBadge from '../../components/ds/CxReliabilityBadge.vue'
import CxSourceBadge from '../../components/ds/CxSourceBadge.vue'
import CxWhyPanel from '../../components/ds/CxWhyPanel.vue'
import type { EntityRef } from '../../data/datasets.ts'
import type { ScoredWeapon } from '../../engine/score.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { formatInt } from '../../ui/format.ts'
import { STAGE_LABELS } from '../../ui/labels.ts'
import type { SourceName } from '../../ui/labels.ts'

/**
 * Panneau unique du widget A (design `Main.dc.html`) : une seule arme à la fois, dans l'un de ses deux modes.
 * - `why` : `CxWhyPanel` rend l'`Explanation` du score (composantes, données lues, limites) ; le slot `extra` propose les alternatives ;
 * - `alts` : les armes proches (`analysis.alternativesOf` : même étape ou étape voisine, 4 au plus, triées par proximité puis score), chacune avec son
 *   propre « Pourquoi ? ».
 * Le focus passe au panneau à l'ouverture (il s'affiche sous les colonnes, loin du bouton qui l'a ouvert) ; l'appelant le rend au bouton à la fermeture.
 * Aucun calcul : les alternatives, scores et explications viennent du store `analysis`.
 */
const props = defineProps<{
  /** Arme concernée. */
  weapon: EntityRef
  /** `why` : explication du score ; `alts` : armes proches. */
  mode: 'why' | 'alts'
}>()

const emit = defineEmits<{
  /** Fermeture (croix ou Échap). */
  close: []
  /** Passe à un autre panneau : une autre arme ou l'autre mode. */
  select: [ref: EntityRef, mode: 'why' | 'alts']
  /** Ouvre la fiche d'une arme. */
  open: [ref: EntityRef]
}>()

const analysis = useAnalysisStore()
const root = ref<HTMLElement | null>(null)

const target = computed(() => analysis.scored.find((s) => s.candidate.ref === props.weapon) ?? null)
const alternatives = computed(() => analysis.alternativesOf(props.weapon))
const name = computed(() => target.value?.candidate.weapon.name ?? '')

/**
 * Total du score d'une arme proche.
 * @param alt Arme évaluée.
 * @returns Le total, ou `null` pour une arme sans score (« Non classé », D18).
 */
function totalOf(alt: ScoredWeapon): number | null {
  return alt.score.value?.total ?? null
}

/** Donne le focus au panneau et le rend visible quand il s'ouvre ou change d'arme ou de mode. */
async function reveal(): Promise<void> {
  await nextTick()
  root.value?.focus({ preventScroll: false })
}
onMounted(() => void reveal())
watch(() => [props.weapon, props.mode], () => void reveal())

/**
 * Échap ferme le panneau « Alternatives » (le panneau « Pourquoi ? » gère déjà sa propre touche Échap).
 * @param event Événement clavier.
 */
function onEscape(event: KeyboardEvent): void {
  if (props.mode !== 'alts') return
  event.stopPropagation()
  emit('close')
}
</script>

<template>
  <div
    v-if="target"
    ref="root"
    class="wa-block"
    tabindex="-1"
    @keydown.esc="onEscape"
  >
    <CxWhyPanel
      v-if="mode === 'why'"
      :explanation="target.score.explanation"
      :subject="name"
      :estimate="target.score.estimate?.confidence ?? null"
      :toggle="false"
      :open="true"
      @close="emit('close')"
    >
      <template #extra>
        <CxButton
          variant="ghost"
          size="sm"
          icon="swap"
          @click="emit('select', weapon, 'alts')"
        >
          Voir les alternatives
        </CxButton>
      </template>
    </CxWhyPanel>

    <section
      v-else
      class="cx-why"
      :aria-label="`Alternatives à ${name}`"
    >
      <div class="cx-why-h">
        <h3 class="titre-s">
          Alternatives à {{ name }}
        </h3>
        <CxButton
          variant="ghost"
          size="sm"
          icon="x"
          icon-only
          label="Fermer"
          @click="emit('close')"
        />
      </div>
      <div class="wa-alts-wrap">
        <h4>Armes proches pour votre build : même étape ou étape voisine, triées par proximité puis par score</h4>
        <ul
          v-if="alternatives.length > 0"
          class="wa-alts"
        >
          <li
            v-for="alt in alternatives"
            :key="alt.candidate.ref"
            class="wa-alt"
          >
            <div class="wa-alt-main">
              <button
                type="button"
                class="cx-wcard-name wa-alt-name"
                @click="emit('open', alt.candidate.ref)"
              >
                {{ alt.candidate.weapon.name }}
              </button>
              <div class="cx-wcard-sub">
                <span>{{ alt.candidate.weapon.category }}</span>
                <span v-if="alt.stage.value">étape {{ STAGE_LABELS[alt.stage.value.stage] }}</span>
                <CxSourceBadge :source="alt.candidate.weapon.source as SourceName" />
              </div>
            </div>
            <span class="wa-alt-score">
              <span
                v-if="totalOf(alt) !== null"
                class="cx-score-num"
              >{{ formatInt(totalOf(alt) ?? 0) }}<span class="cx-sr"> sur 100</span></span>
              <span
                v-else
                class="cx-null"
              >Non classé</span>
              <CxReliabilityBadge :kind="totalOf(alt) !== null ? 'calculated' : 'null'" />
            </span>
            <CxButton
              variant="ghost"
              size="sm"
              icon="help"
              @click="emit('select', alt.candidate.ref, 'why')"
            >
              Pourquoi ?
            </CxButton>
          </li>
        </ul>
        <p
          v-else
          class="cx-muted wa-none"
        >
          Aucune autre arme ne correspond à vos critères.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.wa-block { margin-top: var(--space-4); }
.wa-block:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: var(--radius-m); }
.wa-alts-wrap { grid-column: 1 / -1; }
.wa-alts { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-2); margin-top: var(--space-2); padding: 0; list-style: none; }
.wa-alt { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.wa-alt-name { font-size: 16px; line-height: 20px; }
.wa-alt-score { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.wa-none { font-size: 12px; }
</style>
