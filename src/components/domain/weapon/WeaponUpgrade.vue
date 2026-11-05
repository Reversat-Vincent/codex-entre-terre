<!-- Section « Amélioration » : matériau, niveau maximal, Cendre de guerre et affinité modifiables ou non (avec leur fiabilité), coût jusqu'au maximum, puis le graphique d'évolution. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import type { UpgradePlan } from '../../../engine/upgradePlan.ts'
import type { Calc } from '../../../engine/types.ts'
import { formatInt } from '../../../ui/format.ts'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWhyPanel from '../../ds/CxWhyPanel.vue'
import WeaponSection from './WeaponSection.vue'
import { changeabilityKind } from './weaponModel.ts'

/**
 * Amélioration d'une arme : type (matériau et niveau maximal, avec le badge de fiabilité de `derived.upgrade.reliability`), modifiabilité de la Cendre de guerre
 * et de l'affinité (badge « Wiki (déduit) » quand la source est une déduction), coût jusqu'au niveau maximal (plan du moteur, valeur calculée à côté des faits).
 * Le slot par défaut accueille le graphique d'évolution. Une estimation garde son badge Estimation, y compris sur le coût calculé qui en hérite.
 */
const props = defineProps<{
  weapon: WeaponEntry
  /** Plan d'amélioration de +0 au niveau maximal, `null` si le plan n'est pas calculé. */
  plan: Calc<UpgradePlan> | null
}>()

const up = computed(() => props.weapon.derived.upgrade)
const materialIssue = computed(() => props.weapon.derived.inconsistent.find((i) => i.field === 'upgrade.material'))
const confidence = computed(() => (up.value.reliability === 'estimate' ? (up.value.confidence ?? 'medium') : null))
/** Badge de fiabilité sur la valeur : incohérence du matériau, ou déduction du type d'amélioration. */
const reliability = computed(() => (materialIssue.value ? 'inconsistent' : up.value.reliability === 'deduced' ? 'deduced' : null))
const source = computed(() => props.weapon.upgrade.changeability_info_source)

/**
 * Modifiabilité lisible.
 * @param value Valeur du champ (`null` : non documenté).
 * @returns « Modifiable », « Non modifiable » ou `null`.
 */
function changeable(value: boolean | null): string | null {
  return value === null ? null : value ? 'Modifiable' : 'Non modifiable'
}

const ash = computed(() => ({ text: changeable(props.weapon.upgrade.ash_of_war_changeable), kind: changeabilityKind(props.weapon.upgrade.ash_of_war_changeable, source.value, 'ash') }))
const affinity = computed(() => ({ text: changeable(props.weapon.upgrade.affinity_changeable), kind: changeabilityKind(props.weapon.upgrade.affinity_changeable, source.value, 'affinity') }))

const planText = computed(() => {
  const p = props.plan?.value
  if (!p) return null
  const stones = `${formatInt(p.totalStones)} pierre${p.totalStones > 1 ? 's' : ''}`
  return p.ancientStones > 0 ? `${stones} et ${formatInt(p.ancientStones)} pierre ancienne` : stones
})
const notUpgradeable = computed(() => up.value.reliability === 'not-upgradeable')
const whyOpen = ref(false)
</script>

<template>
  <WeaponSection
    title="Amélioration"
    subtitle="Matériau, niveau maximal et évolution de l'attaque"
  >
    <template #aside>
      <CxReliabilityBadge
        :kind="up.reliability === 'not-upgradeable' ? 'wiki' : up.reliability"
        :confidence="confidence"
        :tip="weapon.upgrade.material_info_source ?? undefined"
      />
    </template>

    <dl class="wp-dl">
      <div>
        <dt>Matériau</dt>
        <dd>
          <CxValue
            :value="notUpgradeable ? 'Non améliorable' : up.material"
            :reliability="reliability"
            :reliability-note="materialIssue?.reason"
            :estimate="confidence"
          />
        </dd>
      </div>
      <div>
        <dt>Niveau maximal</dt>
        <dd>
          <CxValue
            :value="notUpgradeable ? '+0' : up.maxLevel === null ? null : `+${up.maxLevel}`"
            :estimate="confidence"
          />
        </dd>
      </div>
      <div>
        <dt>Cendre de guerre</dt>
        <dd>
          <CxValue
            :value="ash.text"
            :reliability="ash.kind === 'deduced' ? 'deduced' : null"
            :reliability-note="source ?? undefined"
          />
        </dd>
      </div>
      <div>
        <dt>Affinité</dt>
        <dd>
          <CxValue
            :value="affinity.text"
            :reliability="affinity.kind === 'deduced' ? 'deduced' : null"
            :reliability-note="source ?? undefined"
          />
        </dd>
      </div>
      <div>
        <dt>Coût jusqu'au maximum</dt>
        <dd>
          <CxValue
            v-if="planText"
            :value="planText"
            calculated
            :estimate="plan?.estimate?.confidence ?? null"
            method="Somme des pierres de chaque niveau, de +0 au niveau maximal (calculs.md, « Plan d'amélioration »)."
            @why="whyOpen = !whyOpen"
          />
          <span
            v-else-if="notUpgradeable"
            class="cx-muted"
          >Non améliorable</span>
          <CxValue
            v-else
            :value="null"
          />
        </dd>
      </div>
    </dl>
    <CxWhyPanel
      v-if="plan && planText"
      v-model:open="whyOpen"
      :explanation="plan.explanation"
      :estimate="plan.estimate?.confidence ?? null"
      subject="ce coût d'amélioration"
      :toggle="false"
    />

    <slot />
  </WeaponSection>
</template>

<style scoped>
.wp-dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: var(--space-3) var(--space-4); }
.wp-dl > div { display: grid; gap: 3px; align-content: start; min-width: 0; }
.wp-dl dt { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wp-dl dd { color: var(--ink); font-size: 13px; line-height: 18px; }
</style>
