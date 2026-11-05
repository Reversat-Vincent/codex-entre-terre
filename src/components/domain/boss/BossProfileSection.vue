<!-- « Pour votre profil » : préparation face à la rencontre (jauge), case « Rencontre vaincue » et armes du profil efficaces contre ses faiblesses. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDatasets } from '../../../composables/useDatasets.ts'
import { entityRoute } from '../../../router/entityRoute.ts'
import { useAnalysisStore } from '../../../stores/analysis.ts'
import { useCriteriaStore } from '../../../stores/criteria.ts'
import { useProfilesStore } from '../../../stores/profiles.ts'
import { formatInt } from '../../../ui/format.ts'
import type { Explanation } from '../../../engine/types.ts'
import CxButton from '../../ds/CxButton.vue'
import CxCheckbox from '../../ds/CxCheckbox.vue'
import CxDamageChip from '../../ds/CxDamageChip.vue'
import CxReadinessGauge from '../../ds/CxReadinessGauge.vue'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxRequirementChips from '../../ds/CxRequirementChips.vue'
import BossSection from './BossSection.vue'
import { readWeaponSuggestions } from './bossSheetModel.ts'

/**
 * Section « Pour votre profil » (écran Fiche boss, note `spec-boss`) :
 * - jauge niveau du profil / niveau recommandé (valeurs du store `analysis.bossReadiness`, Calculé et « Pourquoi ? ») ;
 * - case « Rencontre vaincue », reliée à la frise du tableau de bord par `criteria.toggleDefeated` (même clé de rencontre) ;
 * - armes du profil efficaces contre les faiblesses, avec leurs prérequis comparés au profil (getter `analysis.weaponsAgainst(clé)`).
 * Faiblesses non documentées (Mohg) : aucune suggestion d'arme. Le getter est demandé à la logique : tant qu'il n'existe pas, le bloc rend l'état « indisponible ».
 */
const props = defineProps<{
  /** Clé de la rencontre (`bossId/encounterId`, ou `bossId`). */
  encounterKey: string
  /** Vrai si le wiki donne l'absorption de la rencontre : sans elle, aucune suggestion d'arme. */
  hasWeaknesses: boolean
}>()

const emit = defineEmits<{
  /** Demande du détail du calcul de préparation. */
  why: [explanation: Explanation]
}>()

const analysis = useAnalysisStore()
const criteria = useCriteriaStore()
const profiles = useProfilesStore()

// Les fichiers d'armes ne sont lus que si des suggestions peuvent être faites.
useDatasets(() => (props.hasWeaknesses ? (['melee_armaments', 'ranged_weapons_catalysts', 'shields_torches'] as const) : []))

const prep = computed(() => analysis.bossReadiness(props.encounterKey))
const playerLevel = computed(() => analysis.level.value ?? 1)
const recommended = computed(() => prep.value?.level.value?.level ?? null)
const state = computed(() => prep.value?.readiness.value ?? 'unknown')
const profileName = computed(() => profiles.active?.name ?? null)

const defeated = computed({
  get: () => criteria.criteria.progress.defeated.includes(props.encounterKey),
  set: (value: boolean) => {
    if (value !== defeated.value) criteria.toggleDefeated(props.encounterKey)
  },
})

/** Le getter `weaponsAgainst` n'est pas encore dans le store `analysis` : lu sans présumer de son existence (voir `readWeaponSuggestions`). */
const suggestions = computed(() => {
  const getter = (analysis as unknown as { weaponsAgainst?: unknown }).weaponsAgainst
  return props.hasWeaknesses ? readWeaponSuggestions(getter, props.encounterKey) : null
})
</script>

<template>
  <BossSection
    title="Pour votre profil"
    :subtitle="`${profileName ? `« ${profileName} », ` : ''}niveau ${formatInt(playerLevel)}`"
  >
    <div class="prof">
      <CxReadinessGauge
        v-if="prep"
        :state="state"
        :level="playerLevel"
        :recommended="recommended"
        :max="prep.gaugeMax"
      >
        <template #extra>
          <span class="prof-calc">
            <CxReliabilityBadge kind="calculated" />
            <CxButton
              variant="ghost"
              size="sm"
              icon="help"
              @click="emit('why', prep.readiness.explanation)"
            >Pourquoi ?</CxButton>
          </span>
        </template>
      </CxReadinessGauge>
      <p
        v-else
        class="cx-muted prof-wait"
      >
        Préparation en cours de calcul…
      </p>

      <div>
        <CxCheckbox
          v-model="defeated"
          label="Rencontre vaincue"
        />
        <p class="prof-sub prof-sync">
          Synchronisé avec la frise du tableau de bord.
        </p>
      </div>

      <h3 class="prof-h3">
        Vos armes contre ses faiblesses
      </h3>
      <p
        v-if="suggestions === null"
        class="prof-note"
      >
        Faiblesses non documentées : aucune suggestion d’arme pour cette rencontre.
      </p>
      <p
        v-else-if="!suggestions.available"
        class="prof-note"
      >
        Suggestions d’armes indisponibles pour le moment : les fichiers d’armes ne sont pas encore lus.
      </p>
      <p
        v-else-if="suggestions.items.length === 0"
        class="prof-note"
      >
        Aucune arme de votre sélection ne ressort contre ses faiblesses.
      </p>
      <template v-else>
        <ul class="eff">
          <li
            v-for="weapon in suggestions.items"
            :key="weapon.ref"
          >
            <RouterLink :to="entityRoute(weapon.ref)">
              {{ weapon.name }}
            </RouterLink>
            <CxDamageChip
              :damage="weapon.damage"
              :value="weapon.attack"
              format="int"
            />
            <span class="eff-req"><CxRequirementChips :checks="weapon.requirements" /></span>
          </li>
        </ul>
        <p class="prof-sub">
          Valeur d’attaque du type de dégâts à +0 ; prérequis comparés à votre profil.
        </p>
      </template>
    </div>
  </BossSection>
</template>

<style scoped>
.prof { display: grid; gap: var(--space-3); min-width: 0; }
.prof-calc { display: inline-flex; align-items: center; gap: var(--space-1); }
.prof-wait { font-size: 12px; }
.prof-sub { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.prof-sync { margin: 0 0 0 23px; }
.prof-h3 { margin-top: var(--space-2); color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.prof-note { color: var(--ink-3); font-size: 13px; }
.eff { display: grid; gap: 2px; }
.eff li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line); font-size: 13px; }
.eff li:first-child { border-top: 0; }
.eff a { font-weight: 600; overflow-wrap: anywhere; }
.eff-req { grid-column: 1 / -1; }
</style>
