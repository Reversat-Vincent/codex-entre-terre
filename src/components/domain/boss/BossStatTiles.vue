<!-- Tuiles de la fiche boss : PV et runes NG (wiki), niveau recommandé (calculé, « Pourquoi ? »), parade et critique. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Encounter } from '../../../data/types/bosses.ts'
import type { BossLevel } from '../../../engine/bossLevel.ts'
import type { Calc, Explanation } from '../../../engine/types.ts'
import { formatInt } from '../../../ui/format.ts'
import { DLC_ZONE_LABELS } from '../../../ui/labels.ts'
import CxButton from '../../ds/CxButton.vue'
import CxCalcValue from '../../ds/CxCalcValue.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import { countModel, levelBasis, levelCalc, yesNo } from './bossSheetModel.ts'

/**
 * Cinq tuiles (écran Fiche boss, note `spec-boss`) : PV et runes de nouvelle partie telles que le wiki les publie (`null` → « Non documenté », jamais 0),
 * niveau recommandé (valeur calculée : badge Calculé, estimation héritée, « Pourquoi ? » ; bénédiction de l'Arbre-Ombre pour le DLC),
 * parade et critique possibles. Aucun calcul : le niveau vient du moteur (`recommendedLevel`), le composant l'affiche et relaie la demande d'explication.
 */
const props = defineProps<{
  /** Rencontre affichée ; `null` pour une page de boss sans rencontre (aucune donnée de combat). */
  encounter: Encounter | null
  /** Niveau recommandé de la rencontre (store `analysis`) ; `null` tant que les données ne sont pas chargées. */
  level: Calc<BossLevel> | null
}>()

const emit = defineEmits<{
  /** Demande du détail d'un calcul : explication à afficher dans « Pourquoi ? ». */
  why: [explanation: Explanation]
}>()

const hp = computed(() => countModel(props.encounter?.hp, props.encounter?.hp_values ?? []))
const runes = computed(() => countModel(props.encounter?.runes, props.encounter?.runes_values ?? []))
const hasCombatData = computed(() => hp.value.values.length > 0 || runes.value.values.length > 0 || props.encounter?.damage_negation_percent !== undefined)
const levelValue = computed(() => (props.level === null ? null : levelCalc(props.level)))
const basis = computed(() => levelBasis(props.level))
const blessing = computed(() => props.level?.value?.blessing ?? null)
const parry = computed(() => yesNo(props.encounter?.parryable))
const crit = computed(() => yesNo(props.encounter?.critable))

/** Phrase qui dit sur quoi repose le niveau recommandé (calculs.md, M1, M2, M3 et « Boss du DLC »). */
const BASIS_TEXT = {
  'dlc-entry': 'Niveau d’entrée du DLC',
  'position-and-runes': 'Position dans l’histoire et runes',
  position: 'Position dans l’histoire seule',
  runes: 'Runes seules',
  none: '',
} as const

/** Joint des nombres à la française avec une barre oblique. */
const joined = (values: readonly number[]): string => values.map((v) => formatInt(v)).join(' / ')
</script>

<template>
  <div class="tiles">
    <div class="tile">
      <span class="tile-k">Points de vie (NG)</span>
      <template v-if="hp.values.length > 0">
        <span
          class="tile-v"
          :title="hp.raw ? `Texte du wiki : ${hp.raw}` : undefined"
        >{{ joined(hp.values) }}</span>
        <span class="tile-s"><CxReliabilityBadge kind="wiki" /><span v-if="hp.note">{{ hp.note }}</span></span>
      </template>
      <template v-else>
        <CxValue :value="null" />
        <span class="tile-s">{{ hasCombatData ? 'Non publiés par le wiki' : 'Aucune donnée de combat sur le wiki' }}</span>
      </template>
    </div>

    <div class="tile">
      <span class="tile-k">Runes (NG)</span>
      <template v-if="runes.values.length > 0">
        <span
          class="tile-v"
          :title="runes.raw ? `Texte du wiki : ${runes.raw}` : undefined"
        >{{ joined(runes.values) }}</span>
        <span class="tile-s"><CxReliabilityBadge kind="wiki" /><span v-if="runes.note">{{ runes.note }}</span></span>
      </template>
      <template v-else>
        <CxValue :value="null" />
        <span class="tile-s">{{ hasCombatData ? 'Non publiées par le wiki' : 'Aucune donnée de combat sur le wiki' }}</span>
      </template>
    </div>

    <div class="tile">
      <span class="tile-k">Niveau recommandé</span>
      <span
        v-if="levelValue !== null && levelValue.value !== null"
        class="tile-v"
      >
        <CxCalcValue
          :calc="levelValue"
          method="Moyenne du palier de la zone et des runes ; niveau d’entrée du DLC pour Shadow of the Erdtree."
          @why="emit('why', $event)"
        />
      </span>
      <span
        v-else
        class="tile-v is-txt"
      >
        <span class="cx-null"><CxIcon
          name="empty"
          size="sm"
        /> Non estimé</span>
        <CxButton
          v-if="levelValue !== null"
          variant="ghost"
          size="sm"
          icon="help"
          @click="emit('why', levelValue.explanation)"
        >Pourquoi ?</CxButton>
      </span>
      <span
        v-if="basis !== 'none'"
        class="tile-s"
      >{{ BASIS_TEXT[basis] }}</span>
      <span
        v-if="blessing !== null"
        class="tile-s"
      >
        Bénédiction de l’Arbre-Ombre recommandée :
        <b v-if="blessing.level !== null">niveau {{ formatInt(blessing.level) }}</b>
        <span
          v-else
          class="cx-null"
        >niveau non calculé</span>
        <template v-if="blessing.fragments !== null"> ({{ formatInt(blessing.fragments) }} fragments<template v-if="blessing.zone"> · {{ DLC_ZONE_LABELS[blessing.zone] }}</template>)</template>
      </span>
    </div>

    <div class="tile">
      <span class="tile-k">Parade possible</span>
      <span
        v-if="parry !== null"
        class="tile-v is-txt"
      >{{ parry }}</span>
      <CxValue
        v-else
        :value="null"
      />
    </div>

    <div class="tile">
      <span class="tile-k">Critique possible</span>
      <template v-if="crit !== null">
        <span class="tile-v is-txt">{{ crit }}</span>
        <span
          v-if="crit === 'Oui'"
          class="tile-s"
        >après une posture brisée</span>
      </template>
      <CxValue
        v-else
        :value="null"
      />
    </div>
  </div>
</template>

<style scoped>
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--space-3); }
.tile { display: grid; align-content: start; gap: 4px; min-width: 0; padding: var(--space-3) var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.tile-k { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.tile-v { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--ink); font: 600 26px/30px var(--font-sans); font-variant-numeric: tabular-nums; }
.tile-v.is-txt { font-size: 20px; line-height: 30px; }
.tile-s { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.tile-s b { color: var(--ink-2); }
.tile :deep(.cx-null) { font-size: 15px; line-height: 30px; }
.tile-v :deep(.cx-num) { font-size: 26px; }
.tile-v :deep(.cx-btn) { font-size: 12px; line-height: 16px; font-weight: 600; }
</style>
