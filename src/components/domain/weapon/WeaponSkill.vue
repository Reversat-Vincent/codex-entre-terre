<!-- Section « Compétence et effets passifs » : nom, type, coût, description du wiki, accumulation de statut et effets passifs. -->
<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_KEYS } from '../../../data/keys.ts'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import CxDamageChip from '../../ds/CxDamageChip.vue'
import CxIcon from '../../ds/CxIcon.vue'
import CxValue from '../../ds/CxValue.vue'
import { parseSkillCost } from '../../../ui/skillCost.ts'
import { NO_SKILL_TYPE, skillTypeLabel } from '../../../ui/skillTypes.ts'
import type { SkillCost } from '../../../ui/skillCost.ts'
import WikiText from '../WikiText.vue'
import WeaponSection from './WeaponSection.vue'

/**
 * Compétence de l'arme et effets passifs. Le nom, la description et les effets sont des données du wiki : ils restent en anglais, tels quels.
 * Les coûts suivent la notation du wiki « X (Y Z) » (`data/README.md`) : X la compétence, Y et Z les suites légère et lourde ; une notation
 * inconnue est affichée telle quelle plutôt que devinée.
 */
const props = defineProps<{
  weapon: WeaponEntry
}>()

const skill = computed(() => props.weapon.skill)
const typeLabel = computed(() => skillTypeLabel(skill.value.type))
/** Arme sans compétence (`No skill`) : « Aucune » ; un nom `null` avec un autre type reste « Non documenté ». */
const hasNoSkill = computed(() => skill.value.type === NO_SKILL_TYPE)
const fp = computed(() => (skill.value.fp_cost === null ? null : parseSkillCost(skill.value.fp_cost)))
const stamina = computed(() => (skill.value.stamina_cost_wiki === undefined ? null : parseSkillCost(skill.value.stamina_cost_wiki)))
const statuses = computed(() =>
  STATUS_KEYS.flatMap((key) => {
    const v = props.weapon.status_buildup?.[key]
    return v === undefined ? [] : [{ key, value: v }]
  }),
)
/** Effets passifs en texte : ceux que les puces de statut ne disent pas déjà (« Causes blood loss buildup (50) »). */
const passiveTexts = computed(() => props.weapon.passive_effects.filter((t) => !/buildup/i.test(t) || statuses.value.length === 0))

/**
 * Texte lisible d'un coût.
 * @param cost Coût lu.
 * @returns Les parties présentes (« suite légère 15 »), vide si aucune.
 */
function costParts(cost: SkillCost): string[] {
  return [
    ...(cost.skill === null ? [] : [cost.skill]),
    ...(cost.light === null ? [] : [`suite légère ${cost.light}`]),
    ...(cost.heavy === null ? [] : [`suite lourde ${cost.heavy}`]),
  ]
}
</script>

<template>
  <WeaponSection title="Compétence et effets passifs">
    <div class="wp-skill">
      <div class="wp-skill-name">
        <CxIcon
          name="skill"
          class="wp-gold"
        />
        <b
          v-if="skill.name"
          class="wp-skill-title"
        >{{ skill.name }}</b>
        <span
          v-else-if="hasNoSkill"
          class="cx-muted"
        >Aucune</span>
        <CxValue
          v-else
          :value="null"
        />
        <span
          v-if="skill.name && typeLabel"
          class="cx-chip"
        >{{ typeLabel }}</span>
      </div>

      <template v-if="skill.name">
        <p
          v-if="skill.description"
          class="wp-desc"
        >
          {{ skill.description }}
        </p>
        <dl class="wp-costs">
          <div>
            <dt>Coût en FP</dt>
            <dd>
              <CxValue
                v-if="skill.fp_cost === null"
                :value="null"
              />
              <template v-else-if="fp === null">
                {{ skill.fp_cost }}
              </template>
              <template v-else>
                {{ costParts(fp).join(' · ') || 'Aucun' }}
              </template>
            </dd>
          </div>
          <div>
            <dt>Coût en endurance</dt>
            <dd>
              <CxValue
                v-if="skill.stamina_cost_wiki === undefined"
                :value="null"
              />
              <template v-else-if="stamina === null">
                {{ skill.stamina_cost_wiki }}
              </template>
              <template v-else>
                {{ costParts(stamina).join(' · ') || 'Aucun' }}
              </template>
            </dd>
          </div>
          <div v-if="skill.default_affinity">
            <dt>Affinité par défaut</dt>
            <dd>{{ skill.default_affinity }}</dd>
          </div>
        </dl>
      </template>

      <div class="wp-passive">
        <span class="wp-passive-label">Effets passifs</span>
        <template v-if="statuses.length > 0 || passiveTexts.length > 0">
          <CxDamageChip
            v-for="s in statuses"
            :key="s.key"
            :status="s.key"
            :value="s.value"
            format="int"
          />
          <span
            v-if="statuses.length > 0"
            class="cx-muted wp-small"
          >accumulation par coup à +0</span>
        </template>
        <span
          v-else
          class="cx-muted"
        >Aucun</span>
      </div>
      <WikiText
        v-if="passiveTexts.length > 0"
        :lines="passiveTexts"
        mode="list"
        :skip-ref="`weapon:${weapon.id}`"
      />
      <WikiText
        v-if="weapon.effects_details && weapon.effects_details.length > 0"
        :lines="weapon.effects_details"
        mode="list"
        :skip-ref="`weapon:${weapon.id}`"
      />
    </div>
  </WeaponSection>
</template>

<style scoped>
.wp-skill { display: grid; gap: var(--space-3); min-width: 0; }
.wp-skill-name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.wp-skill-title { color: var(--ink); font: 600 18px/22px var(--font-display); }
.wp-gold { color: var(--gold-text); }
.wp-desc { max-width: 68ch; color: var(--ink-2); font-size: 13px; line-height: 20px; }
.wp-costs { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: var(--space-3) var(--space-4); }
.wp-costs > div { display: grid; gap: 3px; align-content: start; }
.wp-costs dt { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wp-costs dd { color: var(--ink); font-size: 13px; line-height: 18px; }
.wp-passive { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); color: var(--ink-2); font-size: 13px; }
.wp-small { font-size: 12px; }
</style>
