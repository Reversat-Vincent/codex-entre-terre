<!-- Corps du widget « plan d'amélioration » (D2, `upgrade-plan`) : pierres à réunir pour une arme, de +n à +m, et Bell Bearings utiles. -->
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import CxButton from '../components/ds/CxButton.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxIcon from '../components/ds/CxIcon.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxReliabilityBadge from '../components/ds/CxReliabilityBadge.vue'
import CxSelect from '../components/ds/CxSelect.vue'
import CxSourceBadge from '../components/ds/CxSourceBadge.vue'
import CxValue from '../components/ds/CxValue.vue'
import CxWhyPanel from '../components/ds/CxWhyPanel.vue'
import type { SelectOption } from '../components/ds/types.ts'
import type { EntityRef } from '../data/datasets.ts'
import { entityRoute } from '../router/entityRoute.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { useDataStore } from '../stores/data.ts'
import { usePinsStore } from '../stores/pins.ts'
import { limitText } from '../ui/explainText.ts'
import { formatInt } from '../ui/format.ts'
import { STAGE_LABELS } from '../ui/labels.ts'
import type { SourceName } from '../ui/labels.ts'
import { stoneLines, weaponChoices } from './misc/upgradeModel.ts'
import type { BellInfo, Availability } from './misc/upgradeModel.ts'
import WidgetFoot from './misc/WidgetFoot.vue'
import WidgetStepper from './misc/WidgetStepper.vue'
import type { WidgetBodyProps } from './types.ts'

/**
 * Corps du widget `upgrade-plan` (D2 ; calculs.md, « Plan d'amélioration » ; brief § 5.2 D.2). Contrat d'un corps : voir `src/widgets/types.ts`.
 * L'arme se choisit parmi Ma liste (`pins`) puis les recommandations du widget A (`analysis.recommendations`) ; les niveaux de départ et d'arrivée sont
 * réglés ici. Le plan (pierres par palier, pierre ancienne, Bell Bearings) vient de `analysis.upgradePlanFor` ; l'étape de chaque Bell Bearing, de
 * `analysis.bellBearingStages`. Le widget affiche :
 * - le badge Estimation hérité quand le type d'amélioration est estimé ;
 * - « Non documenté » ou « Non améliorable » quand le moteur ne calcule pas de plan (sans jamais afficher 0) ;
 * - le badge Calculé et « Pourquoi ? » du plan.
 * Les prix ne sont pas dans `data/` : aucun prix n'est affiché (limite `prices-not-in-data`).
 */
defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()
const data = useDataStore()
const pins = usePinsStore()

const weaponId = useId()
const chosen = ref<EntityRef | ''>('')
/** Niveau de départ saisi ; l'arrivée vaut le niveau maximal de l'arme tant que l'utilisateur n'en a pas choisi une. */
const fromLevel = ref(0)
const toLevel = ref<number | null>(null)
const whyOpen = ref(false)

/** Nom d'une entité chargée, ou `null`. */
function nameOf(ref: EntityRef): string | null {
  const entry = data.entity(ref)
  return entry !== null && 'name' in entry ? entry.name : null
}

const recommended = computed(() =>
  analysis.recommendations.columns.flatMap((column) => column.weapons.map((w) => ({ ref: w.candidate.ref, name: w.candidate.weapon.name }))),
)
const choices = computed(() =>
  weaponChoices(
    pins.items.map((p) => p.ref),
    recommended.value,
    nameOf,
  ),
)
const options = computed<SelectOption[]>(() =>
  choices.value.map((c) => ({ value: c.ref, label: `${c.name} (${c.origin === 'list' ? 'Ma liste' : 'recommandée'})` })),
)

/** Arme retenue : le choix de l'utilisateur s'il existe encore, sinon la première proposition. */
const weaponRef = computed<EntityRef | ''>(() => choices.value.find((c) => c.ref === chosen.value)?.ref ?? choices.value[0]?.ref ?? '')
const weaponModel = computed<string>({
  get: () => weaponRef.value,
  set: (value) => {
    chosen.value = value as EntityRef
  },
})
const weapon = computed(() => (weaponRef.value === '' ? null : data.entity(weaponRef.value)))
const weaponSource = computed<SourceName | null>(() => (weapon.value !== null && 'source' in weapon.value ? (weapon.value.source as SourceName) : null))

/** Niveau maximal de l'arme : lu sur le plan de +0 à +0, que le moteur ne produit que pour une arme dont le type d'amélioration est connu. */
const maxLevel = computed(() => (weaponRef.value === '' ? null : (analysis.upgradePlanFor(weaponRef.value, 0, 0)?.value?.maxLevel ?? null)))
const upper = computed(() => Math.min(toLevel.value ?? maxLevel.value ?? 0, maxLevel.value ?? 0))
const lower = computed(() => Math.min(fromLevel.value, upper.value))
const fromModel = computed({
  get: () => lower.value,
  set: (value: number) => {
    fromLevel.value = value
  },
})
const toModel = computed({
  get: () => upper.value,
  set: (value: number) => {
    toLevel.value = value
  },
})

const plan = computed(() => (weaponRef.value === '' ? null : analysis.upgradePlanFor(weaponRef.value, lower.value, upper.value)))
const planValue = computed(() => plan.value?.value ?? null)
/** Dernière limite d'un plan non calculé : « non documenté », « non améliorable », niveaux hors bornes. */
const refusal = computed(() => {
  const calc = plan.value
  const limit = calc?.value === null ? calc.explanation.limits.at(-1) : undefined
  return limit === undefined ? null : { code: limit.code, text: limitText(limit.code, limit.params) }
})
const estimateNote = computed(() => {
  const limit = plan.value?.explanation.limits.find((l) => l.code === 'upgrade-type-estimated')
  return limit === undefined ? null : limitText(limit.code, limit.params)
})
/** Limites qui accompagnent un plan calculé, sauf l'estimation déjà dite dans son bandeau. */
const notes = computed(() =>
  (plan.value?.explanation.limits ?? []).filter((l) => l.code !== 'upgrade-type-estimated').map((l) => limitText(l.code, l.params)),
)

/**
 * Lieux et étape d'un Bell Bearing.
 * @param item Référence de l'objet.
 * @returns Les régions des données et l'étape déterminée par le moteur.
 */
function bellInfo(item: EntityRef): BellInfo {
  const entry = data.entity(item)
  const places = entry !== null && 'derived' in entry && 'regions' in entry.derived ? entry.derived.regions.values : []
  return { places, stage: analysis.bellBearingStages.get(item)?.value?.stage ?? null }
}
const playerStage = computed(() => analysis.stage.value)
const lines = computed(() => (planValue.value === null ? [] : stoneLines(planValue.value, bellInfo, playerStage.value)))
/** Source d'une pierre ou d'un Bell Bearing, pour le badge ; `null` si l'entité n'est pas chargée. */
function sourceOf(ref: EntityRef): SourceName | null {
  const entry = data.entity(ref)
  return entry !== null && 'source' in entry ? (entry.source as SourceName) : null
}

const AVAILABILITY: Readonly<Record<Availability, { icon: string; label: string; cls: string }>> = {
  available: { icon: 'check-c', label: 'Disponible', cls: 'is-ready' },
  later: { icon: 'clock', label: 'Plus tard', cls: 'is-later' },
  unknown: { icon: 'help', label: 'Étape inconnue', cls: 'is-unknown' },
}
const stageName = computed(() => (playerStage.value === null ? null : STAGE_LABELS[playerStage.value]))
</script>

<template>
  <div class="wd-up">
    <CxEmptyState
      v-if="choices.length === 0"
      title="Aucune arme à améliorer"
      text="Épinglez une arme à Ma liste, ou élargissez vos critères pour obtenir des recommandations."
    />
    <template v-else>
      <div class="wd-up-ctl">
        <span class="wd-up-field wd-up-weapon">
          <label
            :for="weaponId"
            class="cx-label"
          >Arme</label>
          <CxSelect
            :id="weaponId"
            v-model="weaponModel"
            :options="options"
          />
        </span>
        <span class="wd-up-field">
          <span class="cx-label">Niveau actuel</span>
          <WidgetStepper
            v-model="fromModel"
            label="Niveau actuel"
            prefix="+"
            :min="0"
            :max="upper"
            :disabled="maxLevel === null"
          />
        </span>
        <span class="wd-up-field">
          <span class="cx-label">Objectif</span>
          <WidgetStepper
            v-model="toModel"
            label="Objectif"
            prefix="+"
            :min="lower"
            :max="maxLevel ?? 0"
            :disabled="maxLevel === null"
          />
        </span>
      </div>

      <p
        v-if="weapon !== null && 'name' in weapon"
        class="wd-up-who"
      >
        <RouterLink
          class="wd-up-link"
          :to="entityRoute(weaponRef as EntityRef)"
        >
          {{ weapon.name }}
        </RouterLink>
        <CxSourceBadge
          v-if="weaponSource !== null"
          :source="weaponSource"
        />
      </p>

      <!-- Plan non calculé : le moteur dit pourquoi, jamais 0. -->
      <template v-if="plan !== null && planValue === null">
        <div
          v-if="refusal?.code === 'not-upgradeable'"
          class="wd-up-state"
        >
          <span class="wd-up-state-title">Non améliorable</span>
          <span class="cx-muted">{{ refusal.text }}</span>
        </div>
        <div
          v-else-if="refusal?.code === 'upgrade-type-undocumented'"
          class="wd-up-state"
        >
          <CxValue :value="null" />
          <span class="cx-muted">{{ refusal.text }}</span>
        </div>
        <CxNote
          v-else
          tone="warn"
          title="Plan indisponible."
        >
          {{ refusal?.text ?? "Le moteur n'a pas pu calculer ce plan." }}
        </CxNote>
      </template>

      <template v-else-if="plan !== null && planValue !== null">
        <div class="cx-row wd-up-sum">
          <span class="ui-fort">
            <template v-if="planValue.steps.length === 0">
              Aucune pierre : choisissez un objectif supérieur au niveau actuel.
            </template>
            <template v-else>
              {{ formatInt(planValue.totalStones) }} pierres
              <template v-if="planValue.ancientStones > 0"> et {{ formatInt(planValue.ancientStones) }} pierre ancienne</template>
              de +{{ formatInt(planValue.from) }} à +{{ formatInt(planValue.to) }}
            </template>
          </span>
          <CxReliabilityBadge kind="calculated" />
          <CxReliabilityBadge
            v-if="plan.estimate !== null"
            kind="estimate"
            :confidence="plan.estimate.confidence"
          />
          <CxButton
            variant="ghost"
            size="sm"
            icon="help"
            :aria-expanded="whyOpen ? 'true' : 'false'"
            @click="whyOpen = !whyOpen"
          >
            Pourquoi ?
          </CxButton>
        </div>

        <CxNote
          v-if="plan.estimate !== null"
          tone="est"
          title="Plan basé sur une estimation."
        >
          {{ estimateNote }}
        </CxNote>

        <div
          v-if="whyOpen"
          class="wd-up-why"
        >
          <CxWhyPanel
            v-model:open="whyOpen"
            :explanation="plan.explanation"
            :estimate="plan.estimate?.confidence ?? null"
            :toggle="false"
            :subject="weapon !== null && 'name' in weapon ? `le plan de ${weapon.name}` : 'ce plan'"
          />
        </div>

        <div
          v-if="lines.length > 0"
          class="wd-up-wrap"
        >
          <table
            class="wd-up-table"
            role="table"
          >
            <caption class="cx-sr">
              Pierres à réunir, Bell Bearing qui les rend achetables sans limite, et disponibilité selon votre étape
            </caption>
            <thead role="rowgroup">
              <tr role="row">
                <th
                  scope="col"
                  role="columnheader"
                >
                  Pierres à réunir
                </th>
                <th
                  scope="col"
                  role="columnheader"
                >
                  Achat illimité
                </th>
                <th
                  scope="col"
                  role="columnheader"
                >
                  Disponibilité
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              <tr
                v-for="line in lines"
                :key="line.item"
                role="row"
              >
                <td
                  class="wd-up-stone"
                  role="cell"
                  data-label="Pierres à réunir"
                >
                  <b class="cx-num">{{ formatInt(line.quantity) }}</b>
                  <RouterLink
                    v-if="sourceOf(line.item) !== null"
                    class="wd-up-link"
                    :to="entityRoute(line.item)"
                  >
                    {{ line.name }}
                  </RouterLink>
                  <span v-else>{{ line.name }}</span>
                </td>
                <td
                  role="cell"
                  data-label="Achat illimité"
                >
                  <template v-if="line.bell !== null">
                    <span class="wd-up-bell">
                      <RouterLink
                        v-if="sourceOf(line.bell.item) !== null"
                        class="wd-up-link"
                        :to="entityRoute(line.bell.item)"
                      >
                        {{ line.bell.name }}
                      </RouterLink>
                      <span v-else>{{ line.bell.name }}</span>
                      <CxSourceBadge
                        v-if="sourceOf(line.bell.item) !== null"
                        :source="sourceOf(line.bell.item) as SourceName"
                      />
                    </span>
                    <span
                      v-if="line.bell.places.length > 0"
                      class="cx-muted wd-up-place"
                    >{{ line.bell.places.join(', ') }}</span>
                    <CxValue
                      v-else
                      :value="null"
                    />
                  </template>
                  <span
                    v-else
                    class="cx-muted"
                  >Ne s'achète pas en quantité illimitée</span>
                </td>
                <td
                  role="cell"
                  data-label="Disponibilité"
                >
                  <span
                    v-if="line.bell !== null"
                    class="wd-up-avail"
                    :class="AVAILABILITY[line.bell.availability].cls"
                  >
                    <CxIcon
                      :name="AVAILABILITY[line.bell.availability].icon"
                      size="sm"
                    />
                    {{ AVAILABILITY[line.bell.availability].label }}
                    <span
                      v-if="line.bell.stage !== null"
                      class="wd-up-stage"
                    >({{ STAGE_LABELS[line.bell.stage] }})</span>
                  </span>
                  <span
                    v-else
                    class="cx-muted"
                  >
                    <span aria-hidden="true">—</span>
                    <span class="cx-sr">Sans objet</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul
          v-if="notes.length > 0"
          class="wd-up-notes"
        >
          <li
            v-for="note in notes"
            :key="note"
          >
            {{ note }}
          </li>
        </ul>
      </template>

      <WidgetFoot v-if="planValue !== null">
        <template v-if="stageName !== null">
          Disponibilité comparée à votre étape ({{ stageName }}).
        </template>
        <template v-else>
          Votre étape n'est pas déterminée : la disponibilité n'est pas comparée.
        </template>
      </WidgetFoot>
    </template>
  </div>
</template>

<style scoped>
.wd-up { display: grid; gap: var(--space-3); min-width: 0; }
.wd-up-ctl { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3); }
.wd-up-field { display: grid; gap: 4px; min-width: 0; }
.wd-up-weapon { flex: 1 1 220px; }
.wd-up-who { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0; }
.wd-up-link { color: var(--ink); font-weight: 600; text-decoration: none; }
.wd-up-link:hover { color: var(--gold-text); text-decoration: underline; }
.wd-up-state { display: grid; gap: var(--space-1); padding: var(--space-3); border: 1px dashed var(--line-strong); border-radius: var(--radius-m); font-size: 13px; line-height: 18px; }
.wd-up-state-title { color: var(--ink); font: 600 17px/22px var(--font-display); }
.wd-up-sum { gap: var(--space-2); }
.wd-up-why :deep(.cx-why) { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: var(--space-3); }
.wd-up-wrap { overflow-x: auto; }
.wd-up-table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 18px; }
.wd-up-table th { padding: var(--space-2); border-bottom: 1px solid var(--line-strong); color: var(--ink-3); font: 600 12px/16px var(--font-sans); text-align: left; }
.wd-up-table td { padding: var(--space-2); border-bottom: 1px solid var(--line); vertical-align: top; }
.wd-up-stone { white-space: nowrap; }
.wd-up-stone b { margin-right: 6px; color: var(--ink); }
.wd-up-bell { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); }
.wd-up-place { display: block; font-size: 12px; line-height: 16px; }
.wd-up-avail { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 7px 0 5px; border-radius: var(--radius-s); font: 600 12px/16px var(--font-sans); white-space: nowrap; }
.wd-up-avail.is-ready { background: var(--ready-wash); color: var(--ready); }
.wd-up-avail.is-later { background: var(--warn-wash); color: var(--warn); }
.wd-up-avail.is-unknown { border: 1px dashed var(--line-strong); color: var(--ink-2); }
.wd-up-stage { font-weight: 400; }
/* Sous 768 px, chaque ligne devient une fiche : trois colonnes ne tiennent pas en 360 px. Les rôles ARIA gardent la sémantique de tableau. */
@media (max-width: 767px) {
  .wd-up-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .wd-up-table, .wd-up-table tbody, .wd-up-table tr, .wd-up-table td { display: block; }
  .wd-up-table tr { padding: var(--space-2) 0; border-bottom: 1px solid var(--line); }
  .wd-up-table td { padding: 2px var(--space-2); border: 0; }
  .wd-up-table td::before { content: attr(data-label); display: block; color: var(--ink-3); font: 600 11px/14px var(--font-sans); }
}
.wd-up-notes { display: grid; gap: var(--space-1); margin: 0; padding-left: var(--space-4); color: var(--ink-3); font-size: 12px; line-height: 16px; }
</style>
