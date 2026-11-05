<!-- Frise verticale des boss de l'histoire principale : étapes, groupes « N parmi M », alternatives « ou », voie DLC parallèle, variante compacte mobile. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { TimelineBossView, TimelineNodeView, TimelineStepView } from '../../engine/timeline.ts'
import type { TimelineView } from '../../engine/timeline.ts'
import type { Explanation } from '../../engine/types.ts'
import type { BossNodeData } from '../../ui/bossNode.ts'
import { formatInt } from '../../ui/format.ts'
import { labelText } from '../../ui/explainText.ts'
import BossNode from './BossNode.vue'
import CxButton from './CxButton.vue'
import CxEmptyState from './CxEmptyState.vue'
import CxFlag from './CxFlag.vue'
import CxIcon from './CxIcon.vue'
import CxReadinessStatus from './CxReadinessStatus.vue'
import CxSourceBadge from './CxSourceBadge.vue'

/**
 * Frise des boss de l'histoire principale (README du design system, composant BossTimeline ; notes `spec-main` et `spec-mobile` ; calculs.md, « Frise des boss »).
 * Le fil d'or relie les étapes : passées en `gold`, à venir en `line-strong`, prochaine avec un halo. Une étape peut être un boss seul, un groupe
 * « N au choix parmi M » avec son compteur, ou deux boss séparés par « ou » (l'option non retenue passe en pointillés dès que l'autre est vaincue).
 * Chaque nœud (`BossNode`) garde ses prérequis (boss ou texte). La voie DLC se place à droite sur grand écran et sous la frise ailleurs ; sans le DLC activé,
 * elle devient un état vide avec « Activer Shadow of the Erdtree ».
 * La variante `compact` (mobile) met en avant le prochain boss, liste les suivants et propose « Voir la frise complète ».
 * Aucun store ni calcul : l'état de la frise (`TimelineView`) et les données de chaque boss (`details`) viennent de l'appelant ; cocher « Vaincu »
 * émet `defeat` (l'appelant bascule alors le critère Progression en mode « Boss vaincus »).
 */
const props = withDefaults(
  defineProps<{
    /** Frise construite par le moteur (`buildTimeline`). */
    timeline: TimelineView
    /** Données affichées de chaque rencontre, par clé `levelKey` (`bossNodeData`) ; une valeur absente donne « Élément introuvable ». */
    details: Readonly<Record<string, BossNodeData | null | undefined>>
    /** Niveau du joueur, pour les jauges de préparation. */
    playerLevel: number
    /** Variante mobile : prochain boss mis en avant, frise compacte. */
    compact?: boolean
    /** Nombre de boss suivants listés en variante compacte. */
    upcomingCount?: number
  }>(),
  { compact: false, upcomingCount: 5 },
)

const emit = defineEmits<{
  /** Un nœud ou un prérequis boss est coché ou décoché « Vaincu » : nœud concerné et nouvel état. */
  defeat: [node: TimelineBossView, defeated: boolean]
  /** Demande du détail d'un niveau recommandé : explication à afficher dans « Pourquoi ? ». */
  why: [explanation: Explanation]
  /** « Activer Shadow of the Erdtree » depuis l'état vide de la voie DLC. */
  enableDlc: []
  /** « Voir la frise complète » (variante compacte). */
  full: []
}>()

const next = computed(() => props.timeline.next)

/** Nom d'un nœud d'après les données, sinon son identifiant. */
function nameOf(node: TimelineBossView): string {
  return props.details[node.levelKey]?.name ?? node.boss
}

/**
 * Classes d'une étape : terminée, ou prochaine à traiter.
 * @param step Étape de l'histoire.
 * @returns Les classes `is-done` et `is-next` du rail.
 */
function stepClass(step: TimelineStepView): Record<string, boolean> {
  const isNext = next.value?.lane === 'story' && next.value.step === step.n
  return { 'is-done': step.done, 'is-next': isNext && !step.done }
}

/**
 * Indique si un nœud est le prochain boss, ou le nœud dont le prochain boss est le prérequis.
 * @param step Étape du nœud.
 * @param node Nœud.
 * @returns Vrai si le nœud porte le halo « prochain ».
 */
function isNextNode(step: TimelineStepView, node: TimelineNodeView): boolean {
  const n = next.value
  return n?.lane === 'story' && n.step === step.n && (n.node.id === node.id || n.prereqOf === node.id)
}

/** Compteur d'avancement d'un groupe : « 1 sur 2 vaincu ». */
function progressText(step: TimelineStepView): string {
  return `${formatInt(step.defeatedCount)} sur ${formatInt(step.need)} ${step.defeatedCount > 1 ? 'vaincus' : 'vaincu'}`
}

/** Une alternative « ou » dont un nœud est vaincu : l'autre devient facultatif. */
function isOptional(step: TimelineStepView, node: TimelineNodeView): boolean {
  return step.kind === 'or' && step.done && !node.defeated
}

// Variante compacte : le prochain boss sous forme de nœud, et la liste des suivants.

/** Nœud du prochain boss ; un prérequis boss (sans prérequis propre) est complété pour avoir la forme d'un nœud. */
const nextNode = computed((): TimelineNodeView | null => {
  const n = next.value
  if (n === null) return null
  const all = [...props.timeline.steps.flatMap((s) => s.nodes), ...props.timeline.dlc.nodes]
  return all.find((x) => x.id === n.node.id) ?? { ...n.node, prereqs: [], prereqsMet: true }
})
const nextStep = computed(() => {
  const n = next.value
  return n === null || n.step === null ? null : (props.timeline.steps.find((s) => s.n === n.step) ?? null)
})
const upcoming = computed(() => {
  const t = props.timeline
  const nodes = [
    ...t.steps.filter((s) => !s.done).flatMap((s) => s.nodes),
    ...(t.dlc.enabled ? t.dlc.nodes : []),
  ].filter((n) => !n.defeated && n.id !== next.value?.node.id && n.id !== next.value?.prereqOf)
  return nodes.slice(0, props.upcomingCount)
})
const gateText = computed(() => {
  const gate = props.timeline.dlc.gate.map(nameOf).join(' et ')
  const lane = props.timeline.dlc.nodes.map(nameOf)
  return `Voie DLC : vaincre ${gate} pour accéder à ${lane.length > 1 ? `${lane.slice(0, -1).join(', ')} puis ${lane[lane.length - 1]}` : (lane[0] ?? 'ses boss')}.`
})
</script>

<template>
  <div
    v-if="compact"
    class="cx-tl-compact"
  >
    <section
      v-if="nextNode && next"
      class="cx-tl-next"
      aria-label="Prochain boss"
    >
      <span class="cx-label">Prochain boss
        <template v-if="nextStep"> · étape {{ nextStep.n }}, {{ labelText(nextStep.labelCode, nextStep.labelParams) }}</template>
        <template v-else-if="next.lane === 'dlc'"> · voie DLC</template>
      </span>
      <BossNode
        :node="nextNode"
        :details="details"
        :player-level="playerLevel"
        next
        @defeat="(n, v) => emit('defeat', n, v)"
        @why="(e) => emit('why', e)"
      />
      <p
        v-if="nextStep && nextStep.kind === 'choice'"
        class="cx-muted cx-tl-note"
      >
        {{ nextStep.need }} au choix parmi {{ nextStep.nodes.length }} : {{ progressText(nextStep) }}.
      </p>
    </section>
    <p
      v-else
      class="cx-muted"
    >
      {{ timeline.complete ? "Tous les boss de la frise sont vaincus." : "Aucun boss à venir n'est connu." }}
    </p>

    <ul
      v-if="upcoming.length > 0"
      class="cx-tl-list"
      aria-label="Boss suivants"
    >
      <li
        v-for="n in upcoming"
        :key="n.id"
        class="cx-tl-row"
      >
        <div>
          <b>{{ nameOf(n) }}</b>
          <small>
            {{ details[n.levelKey]?.location ?? '' }}
            <template v-if="details[n.levelKey]?.level?.value">, recommandé {{ formatInt(details[n.levelKey]!.level!.value!.level) }}</template>
          </small>
        </div>
        <CxReadinessStatus
          v-if="details[n.levelKey]?.readiness?.value"
          :state="details[n.levelKey]!.readiness!.value!"
        />
      </li>
    </ul>

    <div
      v-if="timeline.dlc.enabled"
      class="cx-lane-gate cx-lane-gate-compact"
    >
      <span><CxIcon
        name="lock"
        size="xs"
      /> {{ gateText }}</span>
    </div>
    <CxEmptyState
      v-else
      title="Shadow of the Erdtree est désactivé"
      text="Activez le DLC dans Contenu pour afficher sa voie."
      :actions="[{ id: 'enable', label: 'Activer Shadow of the Erdtree', icon: 'plus' }]"
      @action="emit('enableDlc')"
    />
    <CxButton
      class="cx-tl-full"
      @click="emit('full')"
    >
      Voir la frise complète
    </CxButton>
  </div>

  <div
    v-else
    class="cx-tl-layout"
  >
    <ol
      class="cx-tl"
      aria-label="Boss de l'histoire principale"
    >
      <li
        v-for="step in timeline.steps"
        :key="step.n"
        class="cx-tl-step"
        :class="stepClass(step)"
      >
        <div
          class="cx-tl-rail"
          aria-hidden="true"
        >
          <span class="cx-tl-dot" /><span class="cx-tl-line" />
        </div>
        <div class="cx-tl-body">
          <div class="cx-tl-label">
            <b>Étape {{ step.n }}</b> {{ labelText(step.labelCode, step.labelParams) }}
            <span
              v-if="step.done"
              class="cx-sr"
            >(terminée)</span>
          </div>
          <div :class="{ 'cx-choice': step.kind === 'choice' }">
            <div
              v-if="step.kind === 'choice'"
              class="cx-choice-head"
            >
              <span class="cx-choice-title">{{ step.need }} au choix parmi {{ step.nodes.length }}</span>
              <span
                class="cx-status"
                :class="step.done ? 'ready' : 'done'"
              ><CxIcon :name="step.done ? 'check-c' : 'check'" />{{ progressText(step) }}</span>
            </div>
            <div :class="step.kind === 'choice' ? 'cx-choice-grid' : step.kind === 'or' ? 'cx-or' : ''">
              <template
                v-for="(node, j) in step.nodes"
                :key="node.id"
              >
                <span
                  v-if="step.kind === 'or' && j === 1"
                  class="cx-or-sep"
                  aria-label="ou"
                ><span>ou</span></span>
                <BossNode
                  :node="node"
                  :details="details"
                  :player-level="playerLevel"
                  :next="isNextNode(step, node)"
                  :optional="isOptional(step, node)"
                  @defeat="(n, v) => emit('defeat', n, v)"
                  @why="(e) => emit('why', e)"
                />
              </template>
            </div>
          </div>
        </div>
      </li>
    </ol>

    <aside
      class="cx-lane"
      aria-label="Voie DLC"
    >
      <div class="cx-row">
        <CxSourceBadge source="Shadow of the Erdtree" />
        <span class="cx-choice-title">Voie DLC</span>
      </div>
      <CxEmptyState
        v-if="!timeline.dlc.enabled"
        title="Shadow of the Erdtree est désactivé"
        text="Activez le DLC dans Contenu pour afficher sa voie."
        :actions="[{ id: 'enable', label: 'Activer Shadow of the Erdtree', icon: 'plus' }]"
        @action="emit('enableDlc')"
      />
      <template v-else>
        <div class="cx-lane-gate">
          <span><b>Accès au DLC</b> : vaincre {{ timeline.dlc.gate.map(nameOf).join(' et ') }}.</span>
          <span class="cx-row tight">
            <span
              v-for="g in timeline.dlc.gate"
              :key="g.id"
              class="cx-status"
              :class="g.defeated ? 'ready' : 'early'"
            ><CxIcon :name="g.defeated ? 'check-c' : 'clock'" />{{ nameOf(g) }} {{ g.defeated ? 'vaincu' : 'à faire' }}</span>
          </span>
        </div>
        <ol
          class="cx-tl"
          aria-label="Boss de la voie DLC"
        >
          <li
            v-for="(node, i) in timeline.dlc.nodes"
            :key="node.id"
            class="cx-tl-step"
            :class="{ 'is-done': node.defeated, 'is-next': next?.lane === 'dlc' && next.node.id === node.id }"
          >
            <div
              class="cx-tl-rail"
              aria-hidden="true"
            >
              <span class="cx-tl-dot" /><span class="cx-tl-line" />
            </div>
            <div class="cx-tl-body">
              <div class="cx-tl-label">
                <b>DLC {{ i + 1 }}</b>
                <CxFlag
                  v-if="timeline.dlc.freeOrder.includes(node.id)"
                  icon="swap"
                  label="Ordre libre"
                  title="Le wiki exige Messmer et Romina sans imposer d'ordre entre eux"
                />
              </div>
              <BossNode
                :node="node"
                :details="details"
                :player-level="playerLevel"
                :next="next?.lane === 'dlc' && next.node.id === node.id"
                :locked="!timeline.dlc.open"
                @defeat="(n, v) => emit('defeat', n, v)"
                @why="(e) => emit('why', e)"
              />
            </div>
          </li>
        </ol>
      </template>
    </aside>
  </div>
</template>

<style>
.cx-tl-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 330px); gap: var(--space-5); align-items: start; }
.cx-tl { display: flex; flex-direction: column; }
.cx-tl-step { display: grid; grid-template-columns: 24px minmax(0, 1fr); column-gap: var(--space-3); }
.cx-tl-rail { position: relative; display: flex; flex-direction: column; align-items: center; }
.cx-tl-dot { flex: none; width: 12px; height: 12px; margin-top: 15px; border: 2px solid var(--control-border); background: var(--surface); transform: rotate(45deg); z-index: 1; }
.cx-tl-line { flex: 1 1 auto; width: 2px; margin-top: 4px; background: var(--line-strong); }
.cx-tl-step:last-child .cx-tl-line { display: none; }
.cx-tl-step.is-done .cx-tl-dot { border-color: var(--gold); background: var(--gold); }
.cx-tl-step.is-done .cx-tl-line { background: var(--gold); }
.cx-tl-step.is-next .cx-tl-dot { border-color: var(--gold); box-shadow: 0 0 0 4px var(--gold-wash); }
.cx-tl-body { min-width: 0; padding-bottom: var(--space-3); }
.cx-tl-label { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); min-height: 40px; color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.cx-tl-label b { color: var(--ink-2); }
.cx-choice { display: grid; gap: var(--space-3); padding: var(--space-3); border: 1px dashed var(--gold-line); border-radius: var(--radius-l); }
.cx-choice-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
.cx-choice-title { color: var(--ink); font: 600 16px/20px var(--font-display); }
.cx-choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr)); gap: var(--space-2); }
.cx-or { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: var(--space-2); }
.cx-or-sep { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--gold-line); background: var(--surface); color: var(--gold-text); font: 600 italic 15px/1 var(--font-display); transform: rotate(45deg); }
.cx-or-sep > span { transform: rotate(-45deg); }
.cx-lane { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3); border: 1px solid color-mix(in srgb, var(--src-sote) 35%, transparent); border-radius: var(--radius-l); background: var(--src-sote-wash); }
.cx-lane .cx-boss { background: var(--surface-raised); }
.cx-lane-gate { display: grid; gap: 6px; padding: var(--space-2) var(--space-3); border: 1px dashed color-mix(in srgb, var(--src-sote) 45%, transparent); border-radius: var(--radius-s); color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-lane-gate-compact { background: var(--src-sote-wash); }
.cx-tl-compact { display: grid; gap: var(--space-3); }
.cx-tl-next { display: grid; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--gold-line); border-radius: var(--radius-m); background: var(--surface-raised); }
.cx-tl-next .cx-boss { padding: 0; border: 0; background: transparent; }
.cx-tl-note { font-size: 12px; }
.cx-tl-list { display: grid; }
.cx-tl-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-2); min-height: 48px; padding: 6px 0; border-top: 1px solid var(--line); }
.cx-tl-row b { display: block; color: var(--ink); font: 700 15px/19px var(--font-display); overflow-wrap: anywhere; }
.cx-tl-row small { display: block; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-tl-full { width: 100%; }
@media (max-width: 1279px) { .cx-tl-layout { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 767px) { .cx-or { grid-template-columns: minmax(0, 1fr); justify-items: center; } .cx-or .cx-boss { justify-self: stretch; } }
</style>
