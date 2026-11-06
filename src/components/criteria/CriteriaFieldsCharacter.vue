<!-- Champs de la section « Personnage » : origine, huit attributs, niveau calculé, build cible et attributs cibles. -->
<script setup lang="ts">
import { computed } from 'vue'
import { originAttributes } from '../../engine/level.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { useToastsStore } from '../../stores/toasts.ts'
import { formatInt } from '../../ui/format.ts'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from '../../ui/labels.ts'
import type { AttributeKey } from '../../ui/labels.ts'
import CxAttributeStepper from '../ds/CxAttributeStepper.vue'
import CxReliabilityBadge from '../ds/CxReliabilityBadge.vue'
import CxWhyPanel from '../ds/CxWhyPanel.vue'
import CxSelect from '../ds/CxSelect.vue'
import CriteriaLevelStepper from './CriteriaLevelStepper.vue'
import { archetypeOptions, originOptions } from './criteriaModel.ts'
import { useCriteriaData } from './useCriteriaData.ts'

/**
 * Personnage (design `Main.dc.html`) : l'origine (ou « Automatique »), les huit attributs en steppers dont le minimum est la valeur de départ de
 * l'origine choisie, le niveau (Calculé : somme des attributs − 79, `calculs.md` « Origine optimale »), le build cible (archétype et niveau cible)
 * et les attributs cibles calculés. Les valeurs calculées viennent du store `analysis` ; chaque modification s'écrit dans le store `criteria`.
 */
const criteria = useCriteriaStore()
const analysis = useAnalysisStore()
const toasts = useToastsStore()
const { origins, entityName } = useCriteriaData()

const c = computed(() => criteria.criteria)
const idOrigin = 'crit-origin'
const idArchetype = 'crit-arch'

const originChoices = computed(() => originOptions(analysis.origins, origins.value, c.value.character.origin))
const archetypeChoices = archetypeOptions()

/** Origine choisie dans les données, `null` en mode automatique ou si l'identifiant est inconnu. */
const chosenOrigin = computed(() => origins.value.find((o) => o.id === c.value.character.origin) ?? null)
/** Valeur de départ de chaque attribut pour l'origine choisie : minimum du stepper (1 sans origine). */
const minimums = computed(() => (chosenOrigin.value === null ? null : originAttributes(chosenOrigin.value)))

const origin = computed({
  get: () => c.value.character.origin,
  set: (id: string) => {
    // Le store décide s'il reprend les attributs de départ de l'origine (seulement si le joueur ne les a pas modifiés). Quand il le fait,
    // l'interface le dit et propose « Annuler » : la copie prise avant l'appel rétablit l'origine et les attributs précédents.
    const previous = { origin: c.value.character.origin, attributes: { ...c.value.character.attributes } }
    if (!criteria.setOrigin(id)) return
    toasts.undoable(
      'Attributs de départ de l’origine repris.',
      () => criteria.set({ character: { origin: previous.origin, attributes: previous.attributes } }),
      'refresh',
    )
  },
})
const archetype = computed({
  get: () => c.value.target.archetype ?? '',
  set: (id: string) => criteria.set({ target: { archetype: id === '' ? null : id } }),
})
const targetLevel = computed({
  get: () => c.value.target.level,
  set: (v: number) => criteria.set({ target: { level: v } }),
})

/** Valeur d'un attribut et son écriture dans le store. */
function attributeModel(key: AttributeKey) {
  return computed({
    get: () => c.value.character.attributes[key],
    set: (v: number) => criteria.setAttribute(key, v),
  })
}
const attributeModels = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, attributeModel(k)])) as Record<AttributeKey, ReturnType<typeof attributeModel>>

const retainedName = computed(() => (analysis.effectiveOrigin === null ? null : entityName.value(analysis.effectiveOrigin)))
const target = computed(() => analysis.target.value)
const levelText = computed(() => (analysis.level.value === null ? 'Non calculé' : formatInt(analysis.level.value)))
</script>

<template>
  <div class="cx-crit-field">
    <label :for="idOrigin">Origine</label>
    <CxSelect
      :id="idOrigin"
      v-model="origin"
      :options="originChoices"
    />
    <span
      v-if="c.character.origin === 'auto' && retainedName"
      class="cx-crit-note"
    >Origine retenue : <b>{{ retainedName }}</b> (rang 1 du widget B).</span>
  </div>
  <div class="cx-crit-grid2">
    <CxAttributeStepper
      v-for="key in ATTRIBUTE_KEYS"
      :key="key"
      v-model="attributeModels[key].value"
      :attribute="key"
      :min="minimums?.[key] ?? 1"
    />
  </div>
  <div class="cx-crit-derived">
    Niveau <b>{{ levelText }}</b>
    <CxReliabilityBadge kind="calculated" />
    <span class="cx-muted">somme des attributs − 79 ; appui long sur ± : 5 points</span>
  </div>
  <CxWhyPanel
    :explanation="analysis.level.explanation"
    :estimate="analysis.level.estimate?.confidence ?? null"
  />
  <hr class="cx-crit-hr">
  <div class="cx-crit-field">
    <label :for="idArchetype">Build cible</label>
    <CxSelect
      :id="idArchetype"
      v-model="archetype"
      :options="archetypeChoices"
    />
  </div>
  <template v-if="c.target.archetype !== null">
    <CriteriaLevelStepper v-model="targetLevel" />
    <div
      v-if="target"
      class="cx-crit-target"
      role="group"
      aria-label="Attributs cibles calculés"
    >
      <span
        v-for="key in ATTRIBUTE_KEYS"
        :key="key"
        :title="`${ATTRIBUTE_LABELS[key].name} cible : ${target[key]} (actuel ${c.character.attributes[key]})`"
      ><i>{{ ATTRIBUTE_LABELS[key].abbr }}</i>{{ target[key] }}</span>
    </div>
    <div class="cx-crit-derived">
      <CxReliabilityBadge kind="calculated" />
      <span class="cx-muted">répartition de l’archétype au niveau cible</span>
    </div>
    <CxWhyPanel
      :explanation="analysis.target.explanation"
      :estimate="analysis.target.estimate?.confidence ?? null"
    />
  </template>
</template>

<style>
.cx-crit-target { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-1); }
.cx-crit-target > span { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-1); padding: 3px var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-xs); background: var(--surface-sunken); color: var(--gold-text); font-weight: 700; font-size: 12px; font-variant-numeric: tabular-nums; }
.cx-crit-target i { color: var(--ink-3); font-style: normal; font-weight: 600; font-size: 11px; }
</style>
