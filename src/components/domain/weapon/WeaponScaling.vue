<!-- Section « Scaling et prérequis » : lettres de scaling à +0, prérequis comparés au profil, bascule une main / deux mains (Force × 1,5, mention « 2M »). -->
<script setup lang="ts">
import { computed } from 'vue'
import { WEAPON_ATTRIBUTE_KEYS } from '../../../data/keys.ts'
import type { WeaponAttributeKey } from '../../../data/keys.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import type { RequirementCheck, RequirementsResult, TwoHandMode } from '../../../engine/requirements.ts'
import type { Attributes, Calc, Hands } from '../../../engine/types.ts'
import { limitText } from '../../../ui/explainText.ts'
import { formatInt } from '../../../ui/format.ts'
import { ATTRIBUTE_LABELS } from '../../../ui/labels.ts'
import CxNote from '../../ds/CxNote.vue'
import CxRequirementChips from '../../ds/CxRequirementChips.vue'
import CxScalingChips from '../../ds/CxScalingChips.vue'
import CxSegmented from '../../ds/CxSegmented.vue'
import CxWhyPanel from '../../ds/CxWhyPanel.vue'
import type { SegmentedOption } from '../../ds/types.ts'
import WeaponSection from './WeaponSection.vue'

/**
 * « Scaling et prérequis » : les lettres de scaling sont celles du wiki à +0 en Standard (`null` = pas de scaling, donc aucune puce, décision D17) ;
 * les prérequis sont comparés aux attributs du profil par le moteur, lus dans le store d'analyse (calculs.md « Prérequis comparés au profil »).
 * À deux mains, la Force effective vaut `floor(STR × 1,5)` : la ligne Force le dit (« ×1,5 = N ») et la puce porte « 2M » ; l'écart reste en Force réelle.
 * Le composant ne calcule rien : écarts et Force effective viennent du moteur.
 */
const props = defineProps<{
  weapon: WeaponEntry
  /** Comparaison du moteur ; `null` tant que l'arme n'est pas chargée (la colonne État dit alors « Non calculé »). */
  requirements: Calc<RequirementsResult> | null
  /** Attributs du profil actif. */
  attrs: Attributes
  /** Force effective à deux mains (moteur), `null` si le bonus ne s'applique pas. */
  effectiveStrength: number | null
  /** Maniement à deux mains de l'arme. */
  twoHandMode: TwoHandMode
  /** Sous-titre : profil comparé. */
  profileLabel: string
}>()

/** Maniement choisi. */
const hands = defineModel<Hands>('hands', { required: true })

const options = computed((): SegmentedOption<Hands>[] => [
  { value: 'one', label: 'Une main' },
  {
    value: 'two',
    label: 'Deux mains',
    disabled: props.twoHandMode === 'none',
    title: props.twoHandMode === 'none' ? "Cette arme n'a pas de posture à deux mains : la Force ne reçoit pas de bonus." : undefined,
  },
])

/** Ligne du tableau : un attribut d'arme. */
interface Row {
  attr: WeaponAttributeKey
  name: string
  grade: WeaponEntry['scaling'][WeaponAttributeKey]
  check: RequirementCheck | null
  twoHand: boolean
  state: string
}

const rows = computed((): Row[] =>
  WEAPON_ATTRIBUTE_KEYS.map((attr) => {
    const check = props.requirements?.value?.checks.find((c) => c.attr === attr) ?? null
    const state = props.requirements === null ? 'Non calculé' : check === null ? 'Sans prérequis' : check.met ? 'Atteint' : `Manque ${formatInt(check.gap)} point${check.gap > 1 ? 's' : ''}`
    return {
      attr,
      name: ATTRIBUTE_LABELS[attr].name,
      grade: props.weapon.scaling[attr],
      check,
      twoHand: attr === 'str' && props.effectiveStrength !== null,
      state,
    }
  }),
)

const missing = computed(() => (props.requirements?.value?.checks ?? []).filter((c) => !c.met))
const gapText = computed(() => missing.value.map((c) => `+${formatInt(c.gap)} ${ATTRIBUTE_LABELS[c.attr].abbr}`).join(', '))
const handsText = computed(() => (props.effectiveStrength !== null ? 'à deux mains' : 'à une main'))
const limits = computed(() => (props.requirements?.explanation.limits ?? []).map((l) => limitText(l.code, l.params)))
</script>

<template>
  <WeaponSection
    title="Scaling et prérequis"
    :subtitle="`Comparés au profil ${profileLabel}`"
  >
    <template #aside>
      <CxSegmented
        v-if="twoHandMode !== 'always'"
        v-model="hands"
        :options="options"
        label="Maniement"
      />
      <span
        v-else
        class="cx-chip"
      >Toujours à deux mains</span>
    </template>

    <div
      class="wp-table-wrap"
      role="region"
      aria-label="Scaling et prérequis par attribut"
      tabindex="0"
    >
      <table class="wp-table">
        <thead>
          <tr>
            <th scope="col">
              Attribut
            </th>
            <th scope="col">
              Scaling à +0
            </th>
            <th scope="col">
              Prérequis
            </th>
            <th
              scope="col"
              class="num"
            >
              Votre profil
            </th>
            <th
              scope="col"
              class="wp-col-state"
            >
              État
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rows"
            :key="r.attr"
          >
            <th scope="row">
              {{ r.name }}
            </th>
            <td>
              <CxScalingChips
                v-if="r.grade"
                :scaling="{ [r.attr]: r.grade }"
              />
              <span
                v-else
                class="cx-muted"
              >Aucun</span>
            </td>
            <td>
              <CxRequirementChips
                v-if="r.check"
                :checks="[r.check]"
              />
              <span
                v-else
                class="cx-muted"
              >Aucun</span>
            </td>
            <td class="num">
              {{ formatInt(attrs[r.attr]) }}
              <span class="wp-state-inline">{{ r.state }}</span>
              <span
                v-if="r.twoHand"
                class="wp-2h"
                title="Force × 1,5 à deux mains, arrondie à l'entier inférieur"
              >2M ×1,5 = {{ formatInt(effectiveStrength ?? 0) }}</span>
            </td>
            <td class="wp-state wp-col-state">
              {{ r.state }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <CxNote
      v-if="requirements === null"
      tone="partial"
      title="Prérequis non calculés."
    >
      Les données de cette arme ne sont pas encore chargées.
    </CxNote>
    <CxNote
      v-else-if="missing.length > 0"
      tone="warn"
      title="Prérequis non atteints."
    >
      Il manque {{ gapText }}{{ missing.some((c) => c.twoHandApplied) ? ' (Force réelle)' : '' }}. L'arme reste utilisable, mais l'attaque calculée est réduite de 40 % pour les types de dégâts concernés, sans bonus de scaling.
    </CxNote>
    <CxNote
      v-else
      title="Prérequis atteints."
    >
      {{ requirements.value && requirements.value.checks.length > 0 ? `Tous les prérequis sont atteints ${handsText}.` : "Cette arme n'a aucun prérequis." }}
    </CxNote>
    <ul
      v-if="limits.length > 0"
      class="wp-limits"
    >
      <li
        v-for="(text, i) in limits"
        :key="i"
      >
        {{ text }}
      </li>
    </ul>
    <CxWhyPanel
      v-if="requirements !== null"
      :explanation="requirements.explanation"
      subject="cette comparaison des prérequis"
    />
  </WeaponSection>
</template>

<style scoped>
.wp-table-wrap { position: relative; overflow-x: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.wp-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; line-height: 18px; }
.wp-table th, .wp-table td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; text-align: left; }
.wp-table thead th { background: var(--surface-raised); border-bottom-color: var(--line-strong); color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.wp-table tbody th { color: var(--ink); font-weight: 400; }
.wp-table tbody tr:last-child th, .wp-table tbody tr:last-child td { border-bottom: 0; }
.wp-table .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.wp-2h { display: inline-block; margin-left: 6px; padding: 0 4px; border-radius: var(--radius-xs); background: var(--gold-wash); color: var(--gold-text); font-size: 11px; line-height: 16px; }
.wp-state { font-size: 12px; }
.wp-state-inline { display: none; }
/* Sous 768 px, la colonne « État » passe sous la valeur du profil : le tableau tient dans l'écran sans défilement horizontal. */
@media (max-width: 767px) {
  .wp-table th, .wp-table td { padding: 8px 6px; }
  .wp-col-state { display: none; }
  .wp-table .num { white-space: normal; }
  .wp-state-inline { display: block; color: var(--ink-3); font-size: 11px; line-height: 14px; }
  .wp-2h { display: block; margin: 2px 0 0; }
}
.wp-limits { display: grid; gap: 4px; color: var(--ink-3); font-size: 12px; line-height: 17px; }
</style>
