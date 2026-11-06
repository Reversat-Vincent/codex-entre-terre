<!-- Nœud de la frise des boss : nom, lieu, PV et runes du wiki, faiblesses, immunités, prérequis, case « Vaincu » et jauge de préparation. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { TimelineBossView, TimelineNodeView } from '../../engine/timeline.ts'
import type { Explanation } from '../../engine/types.ts'
import { formatInt } from '../../ui/format.ts'
import type { BossNodeData } from '../../ui/bossNode.ts'
import { labelText } from '../../ui/explainText.ts'
import type { EstimateConfidence } from '../../ui/labels.ts'
import CxButton from './CxButton.vue'
import CxDamageChip from './CxDamageChip.vue'
import CxFlag from './CxFlag.vue'
import CxIcon from './CxIcon.vue'
import CxReadinessGauge from './CxReadinessGauge.vue'
import CxReadinessStatus from './CxReadinessStatus.vue'
import CxReliabilityBadge from './CxReliabilityBadge.vue'
import CxSourceBadge from './CxSourceBadge.vue'
import CxValue from './CxValue.vue'

/**
 * Nœud `.cx-boss` de la frise (README du design system, composant BossTimeline ; calculs.md, « Frise des boss » et « Niveau recommandé d'un boss et préparation »).
 * Colonne de gauche : nom (lien vers la fiche si `href`), rang, lieu, source, drapeaux Grande Rune et Remembrance ; PV et runes du wiki (« Non documenté »
 * si `null`, jamais 0) ; meilleurs types de dégâts et immunités ; prérequis (boss avec sa case à basculer, ou texte).
 * Colonne de droite : état et jauge de préparation, niveau recommandé (Calculé, Estimation, « Pourquoi ? »), bénédiction de l'Arbre-Ombre pour le DLC,
 * puis la case « Vaincu ». Un boss sans donnée de combat affiche « Non estimé » et « Aucune donnée de combat sur le wiki ».
 * Aucun store ni calcul : les données (`details`) et l'état (`node`) viennent de l'appelant, la case « Vaincu » est un événement.
 */
const props = withDefaults(
  defineProps<{
    /** Nœud de la frise avec son état (`TimelineView`). */
    node: TimelineNodeView
    /** Données affichées de chaque rencontre, par clé de rencontre (`levelKey`) ; sert aussi aux noms des prérequis boss. */
    details: Readonly<Record<string, BossNodeData | null | undefined>>
    /** Niveau du joueur, pour la jauge. */
    playerLevel: number
    /** Prochain boss à affronter : bordure `gold-line`. */
    next?: boolean
    /** Option non retenue d'une alternative « ou » dont l'autre est vaincue : bordure pointillée. */
    optional?: boolean
    /** Accès verrouillé (voie DLC avant Radahn et Mohg) : mention sous l'état. */
    locked?: boolean
    /** Nœud sans ordre imposé avec d'autres (Messmer et Romina) : drapeau « Ordre libre ». */
    freeOrder?: boolean
  }>(),
  { next: false, optional: false, locked: false, freeOrder: false },
)

const emit = defineEmits<{
  /** La case « Vaincu » du nœud ou d'un prérequis boss a changé : nœud concerné et nouvel état. */
  defeat: [node: TimelineBossView, defeated: boolean]
  /** Demande du détail du niveau recommandé : explication à afficher dans « Pourquoi ? » et confiance de son estimation (`null` si non estimé). */
  why: [explanation: Explanation, confidence: EstimateConfidence | null]
}>()

const data = computed(() => props.details[props.node.levelKey] ?? null)
const state = computed(() => props.node.defeated)
const blessing = computed(() => data.value?.level?.value?.blessing ?? null)
const recommended = computed(() => data.value?.level?.value?.level ?? null)
const readinessState = computed(() => data.value?.readiness?.value ?? null)
const confidence = computed(() => data.value?.level?.estimate?.confidence ?? null)

/** Nom d'un prérequis boss : celui des données, sinon l'identifiant lisible du nœud. */
function prereqName(node: TimelineBossView): string {
  return props.details[node.levelKey]?.name ?? node.boss
}

/**
 * Relaie le changement d'une case « Vaincu ».
 * @param target Nœud (ou prérequis boss) concerné.
 * @param event Événement `change` de la case.
 */
function onToggle(target: TimelineBossView, event: Event): void {
  emit('defeat', target, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div
    class="cx-boss"
    :class="{ 'is-done': state, 'is-next': next, 'is-optional': optional }"
  >
    <div>
      <template v-if="data">
        <component
          :is="data.href ? 'a' : 'span'"
          class="cx-boss-name"
          :href="data.href"
        >
          {{ data.name }}
        </component>
        <div class="cx-boss-meta">
          <span v-if="data.rank">{{ data.rank }}<template v-if="data.location">,</template></span>
          <span v-if="data.location">{{ data.location }}</span>
          <CxSourceBadge :source="data.source" />
          <CxFlag
            v-if="data.greatRune"
            icon="rune"
            label="Grande Rune"
            title="Porteur de Grande Rune"
          />
          <CxFlag
            v-if="data.remembrance"
            icon="trade"
            label="Remembrance"
            title="Laisse une Remembrance"
          />
          <CxFlag
            v-if="freeOrder"
            icon="swap"
            label="Ordre libre"
            title="Le wiki exige ces deux boss sans imposer d'ordre entre eux"
          />
        </div>
        <div
          v-if="data.hasCombatData"
          class="cx-boss-stats"
        >
          <span>PV
            <CxValue
              v-if="data.hp === null"
              :value="null"
            /><template v-else><b>{{ formatInt(data.hp) }}</b><span
              v-if="data.hpExtra > 0"
              class="cx-muted"
            > (+{{ data.hpExtra }} autre{{ data.hpExtra > 1 ? 's' : '' }} valeur{{ data.hpExtra > 1 ? 's' : '' }})</span></template>
          </span>
          <span>Runes
            <CxValue
              v-if="data.runes === null"
              :value="null"
            /><template v-else><b>{{ formatInt(data.runes) }}</b><span
              v-if="data.runesExtra > 0"
              class="cx-muted"
            > (+{{ data.runesExtra }} autre{{ data.runesExtra > 1 ? 's' : '' }} valeur{{ data.runesExtra > 1 ? 's' : '' }})</span></template>
          </span>
        </div>
        <div
          v-else
          class="cx-boss-stats"
        >
          <span class="cx-null"><CxIcon
            name="empty"
            size="sm"
          /> Aucune donnée de combat sur le wiki</span>
        </div>
        <div
          v-if="data.hasCombatData"
          class="cx-boss-tags"
        >
          <template v-if="data.weak">
            <CxDamageChip
              v-for="w in data.weak"
              :key="w.type"
              :damage="w.type"
              :value="w.value"
            />
          </template>
          <template v-if="data.immunities">
            <CxDamageChip
              v-for="s in data.immunities"
              :key="s"
              :status="s"
              immune
            />
          </template>
          <span
            v-if="data.weak === null && data.immunities === null"
            class="cx-null"
          ><CxIcon
            name="empty"
            size="sm"
          /> Faiblesses et immunités non documentées</span>
        </div>
      </template>
      <template v-else>
        <span class="cx-boss-name">{{ node.boss }}</span>
        <div class="cx-boss-stats">
          <span class="cx-null"><CxIcon
            name="empty"
            size="sm"
          /> Élément introuvable dans les données</span>
        </div>
      </template>

      <div
        v-for="(p, i) in node.prereqs"
        :key="i"
        class="cx-sub"
        :class="{ 'is-done': p.kind === 'boss' && p.node.defeated }"
      >
        <template v-if="p.kind === 'boss'">
          <CxIcon
            :name="p.node.defeated ? 'check' : 'clock'"
            size="sm"
          />
          <span>Après <b>{{ prereqName(p.node) }}</b></span>
          <label class="cx-boss-check">
            <input
              type="checkbox"
              :checked="p.node.defeated"
              @change="onToggle(p.node, $event)"
            >
            Vaincu<span class="cx-sr"> : {{ prereqName(p.node) }}</span>
          </label>
        </template>
        <template v-else>
          <CxIcon
            name="info"
            size="sm"
          />
          <span>Prérequis : <b>{{ labelText(p.code) }}</b></span>
          <span />
        </template>
      </div>
    </div>

    <div class="cx-boss-side">
      <CxReadinessStatus
        v-if="state"
        state="defeated"
      />
      <template v-else-if="data && data.readiness && readinessState">
        <CxReadinessGauge
          :state="readinessState"
          :level="playerLevel"
          :recommended="recommended"
          :max="data.gaugeMax ?? undefined"
        >
          <template #extra>
            <span class="cx-row tight">
              <CxReliabilityBadge
                v-if="recommended !== null"
                kind="calculated"
              />
              <CxReliabilityBadge
                v-if="confidence"
                kind="estimate"
                :confidence="confidence"
              />
              <CxButton
                v-if="data.level"
                variant="ghost"
                size="sm"
                icon="help"
                @click="emit('why', data.level.explanation, confidence)"
              >Pourquoi ?<span class="cx-sr"> : niveau recommandé de {{ data.name }}</span></CxButton>
            </span>
          </template>
        </CxReadinessGauge>
      </template>
      <span
        v-if="blessing && !state"
        class="cx-boss-note"
      >
        Bénédiction de l'Arbre-Ombre recommandée :
        <CxValue
          v-if="blessing.level === null"
          :value="null"
        />
        <b v-else>niveau {{ formatInt(blessing.level) }}</b>
        <template v-if="blessing.fragments !== null"> ({{ formatInt(blessing.fragments) }} fragments)</template>
      </span>
      <span
        v-if="locked && !state"
        class="cx-boss-note"
      ><CxIcon
        name="lock"
        size="xs"
      /> Accès verrouillé tant que Radahn et Mohg ne sont pas vaincus.</span>
      <label class="cx-boss-check">
        <input
          type="checkbox"
          :checked="state"
          @change="onToggle(node, $event)"
        >
        Vaincu<span class="cx-sr"> : {{ data?.name ?? node.boss }}</span>
      </label>
    </div>
  </div>
</template>

<style>
/* `align-content: start` : sans lui, la hauteur imposée par la rangée d'une grille (carte voisine plus haute) est répartie entre les rangées du nœud et ouvre un vide entre ses prérequis et sa case « Vaincu ». */
.cx-boss { display: grid; align-content: start; grid-template-columns: minmax(0, 1fr) minmax(168px, 220px); gap: var(--space-2) var(--space-4); padding: var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface-raised); }
.cx-boss.is-done { border-color: var(--line); background: var(--surface); }
.cx-boss.is-next { border-color: var(--gold-line); }
.cx-boss.is-optional { border-style: dashed; }
.cx-boss-name, .cx a.cx-boss-name { color: var(--ink); font: 700 17px/22px var(--font-display); text-decoration: none; overflow-wrap: anywhere; }
.cx a.cx-boss-name:hover { color: var(--gold-text); text-decoration: underline; text-decoration-thickness: 1px; }
.cx-boss-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-top: 3px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-boss-stats { display: flex; flex-wrap: wrap; gap: 4px var(--space-3); margin-top: 6px; font-size: 12px; line-height: 16px; color: var(--ink-2); }
.cx-boss-stats b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.cx-boss-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.cx-boss-side { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cx-boss-note { color: var(--ink-3); font-size: 11px; line-height: 15px; }
.cx-boss-note b { color: var(--ink-2); font-weight: 600; }
.cx-boss-check { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 12px; cursor: pointer; }
.cx-boss-check input { width: 14px; height: 14px; margin: 0; }
.cx-sub { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--space-2); margin-top: 8px; padding: 6px var(--space-2); border: 1px dashed var(--line-strong); border-radius: var(--radius-s); color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-sub.is-done { border-style: solid; border-color: var(--line); }
.cx-sub b { color: var(--ink); font-weight: 600; }
.cx-or .cx-boss, .cx-lane .cx-boss, .cx-choice-grid .cx-boss { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 767px) {
  .cx-boss { grid-template-columns: minmax(0, 1fr); }
  .cx-boss-check { min-height: var(--size-cible); }
  .cx-boss-check input { width: 20px; height: 20px; }
}
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { .cx a.cx-boss-name { padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
