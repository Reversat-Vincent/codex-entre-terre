<!-- Contenu d'une rencontre de la fiche boss : tuiles, absorption, statuts, notes de combat, profil, butin et position dans l'histoire. -->
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { BossEntry } from '../../../data/types/bosses.ts'
import type { Explanation } from '../../../engine/types.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import CxDamageChip from '../../ds/CxDamageChip.vue'
import CxNote from '../../ds/CxNote.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWhyPanel from '../../ds/CxWhyPanel.vue'
import AbsorptionBars from '../AbsorptionBars.vue'
import WikiText from '../WikiText.vue'
import BossLootSection from './BossLootSection.vue'
import BossProfileSection from './BossProfileSection.vue'
import BossSection from './BossSection.vue'
import BossStatTiles from './BossStatTiles.vue'
import BossStatusSection from './BossStatusSection.vue'
import { bossFlags, combatFacts, dealtChips, noteGroups, notesFor, stageText, statusRows, storyStage } from './bossSheetModel.ts'
import type { EncounterModel } from './types.ts'

/**
 * Panneau d'une rencontre (écran Fiche boss) : les valeurs changent d'une rencontre à l'autre, l'en-tête de la page reste commun.
 * Les valeurs du wiki sont lues dans `data/` ; le niveau recommandé et la préparation viennent du store `analysis`.
 * Un seul panneau « Pourquoi ? » est ouvert à la fois (niveau recommandé ou préparation), en pleine largeur sous les tuiles.
 * Cas limites : sans absorption (Mohg), « Non documenté » et aucune suggestion d'arme ; sans donnée de combat, PV et runes « Non documenté ».
 */
const props = defineProps<{
  /** Page de boss. */
  boss: BossEntry
  /** Rencontre affichée. */
  model: EncounterModel
}>()

const analysis = useAnalysisStore()

const enc = computed(() => props.model.encounter)
const level = computed(() => analysis.bossLevel(props.model.key))
const rows = computed(() => statusRows(enc.value))
const hasWeaknesses = computed(() => enc.value?.damage_negation_percent !== undefined)
const hasRunes = computed(() => (enc.value?.runes_values.length ?? 0) > 0)
const dealt = computed(() => dealtChips(enc.value?.damage_types_dealt))
const facts = computed(() => combatFacts(enc.value))
const notes = computed(() => notesFor(noteGroups(props.boss.fight_notes), enc.value))
const stage = computed(() => storyStage(props.boss, props.model.key))
const flags = computed(() => bossFlags(props.boss))
const hasCombatData = computed(() => enc.value !== null && (enc.value.hp_values.length > 0 || enc.value.runes_values.length > 0 || hasWeaknesses.value))

/** Explication affichée dans le panneau « Pourquoi ? » ; `null` = panneau fermé. */
const why = ref<{ explanation: Explanation; subject: string } | null>(null)
const whyBox = ref<HTMLElement | null>(null)

/**
 * Ouvre le panneau « Pourquoi ? » sur une explication et le ramène dans la vue (il s'ouvre sous les tuiles, parfois loin du bouton).
 * @param explanation Explication du moteur.
 * @param subject Objet de l'explication, pour le titre.
 */
async function openWhy(explanation: Explanation, subject: string): Promise<void> {
  why.value = { explanation, subject }
  await nextTick()
  whyBox.value?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <div class="panel">
    <CxNote
      v-if="model.encounter && !hasCombatData"
      tone="partial"
      title="Aucune donnée de combat."
    >
      PV, runes, faiblesses et immunités sont absents du wiki pour cette rencontre. Le niveau recommandé n’est estimé qu’à partir de la position dans l’histoire, quand elle est connue.
    </CxNote>
    <CxNote
      v-else-if="!model.encounter"
      tone="partial"
      title="Aucune donnée de combat."
    >
      Le wiki n’a pas de fiche de combat pour ce boss : PV, runes, faiblesses et immunités sont « Non documenté ».
    </CxNote>
    <CxNote
      v-else-if="!hasWeaknesses"
      tone="partial"
      title="Données partielles."
    >
      Les faiblesses et les immunités ne sont pas documentées pour cette rencontre : le Codex affiche « Non documenté », jamais 0.
    </CxNote>
    <CxNote
      v-if="boss.encounter_data_note"
      tone="info"
    >
      {{ boss.encounter_data_note }}
    </CxNote>

    <BossStatTiles
      :encounter="enc"
      :level="level"
      @why="openWhy($event, 'le niveau recommandé')"
    />

    <div
      v-if="why"
      ref="whyBox"
    >
      <CxWhyPanel
        :explanation="why.explanation"
        :subject="why.subject"
        :estimate="level?.estimate?.confidence ?? null"
        :toggle="false"
        :open="true"
        @close="why = null"
      />
    </div>

    <div class="cols">
      <div class="main">
        <BossSection
          title="Absorption par type de dégâts"
          subtitle="Plus la valeur est basse, plus le type de dégâts est efficace. Négatif : dégâts amplifiés."
        >
          <AbsorptionBars :negation="enc?.damage_negation_percent ?? null" />
        </BossSection>

        <BossStatusSection :rows="rows" />

        <BossSection title="Notes de combat">
          <template v-if="notes.length > 0">
            <div
              v-for="(group, i) in notes"
              :key="i"
              class="notes-group"
            >
              <h3
                v-if="group.title && notes.length > 1"
                class="notes-title"
              >
                {{ group.title }}
              </h3>
              <WikiText
                :lines="group.lines"
                :heading-level="4"
                :skip-ref="`boss:${boss.id}`"
              />
            </div>
          </template>
          <CxValue
            v-else
            :value="null"
          />

          <template v-if="dealt.length > 0">
            <h3 class="sub-h3">
              Dégâts infligés par le boss
            </h3>
            <div class="cx-row">
              <template
                v-for="(chip, i) in dealt"
                :key="i"
              >
                <CxDamageChip
                  v-if="chip.kind === 'damage'"
                  :damage="chip.key"
                />
                <CxDamageChip
                  v-else-if="chip.kind === 'status'"
                  :status="chip.key"
                />
                <span
                  v-else
                  class="cx-flag"
                >{{ chip.text }}</span>
              </template>
            </div>
          </template>

          <dl
            v-if="facts.length > 0"
            class="facts"
          >
            <div
              v-for="fact in facts"
              :key="fact.label"
            >
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </BossSection>
      </div>

      <aside
        class="side"
        aria-label="Profil, butin et position dans l’histoire"
      >
        <BossProfileSection
          :encounter-key="model.key"
          :has-weaknesses="hasWeaknesses"
          @why="openWhy($event, 'la préparation')"
        />
        <BossLootSection
          :drops="enc?.drops"
          :has-runes="hasRunes"
        />
        <BossSection title="Dans l’histoire">
          <dl class="story">
            <div>
              <dt>Étape</dt>
              <dd v-if="stage">
                {{ stageText(stage) }}
              </dd>
              <dd v-else>
                <CxValue :value="null" />
              </dd>
            </div>
            <div v-if="model.location">
              <dt>Lieu</dt>
              <dd>{{ model.location }}</dd>
            </div>
            <div v-if="enc?.type">
              <dt>Type</dt>
              <dd>{{ enc.type }}</dd>
            </div>
            <div v-if="flags.length > 0">
              <dt>Indicateurs</dt>
              <dd>{{ flags.map((f) => f.label).join(', ') }}</dd>
            </div>
          </dl>
          <p class="story-link">
            <RouterLink :to="{ name: 'dashboard' }">
              Voir la frise des boss
            </RouterLink>
          </p>
        </BossSection>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.panel { display: grid; gap: var(--space-4); min-width: 0; }
.cols { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-5); }
.main { flex: 999 1 600px; min-width: 0; display: grid; gap: var(--space-4); }
.side { flex: 1 1 320px; min-width: 0; display: grid; gap: var(--space-4); }
.notes-group + .notes-group { margin-top: var(--space-4); }
.notes-title, .sub-h3 { margin: 0 0 var(--space-2); color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.sub-h3 { margin-top: var(--space-4); }
.facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-2) var(--space-4); margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--line); font-size: 13px; line-height: 18px; }
.facts dt { color: var(--ink-3); font-size: 12px; }
.facts dd { color: var(--ink); overflow-wrap: anywhere; }
.story { display: grid; gap: 8px; font-size: 13px; line-height: 18px; }
.story > div { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 8px; }
.story dt { color: var(--ink-3); }
.story dd { color: var(--ink); overflow-wrap: anywhere; }
.story-link { margin-top: var(--space-3); font-size: 13px; }
@media (max-width: 1279px) {
  .main { flex-basis: 100%; }
}
</style>
