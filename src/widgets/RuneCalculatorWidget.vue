<!-- Corps du widget « calculateur de runes » (D5, `rune-calculator`) : runes à gagner du niveau actuel au niveau visé, lues dans la table officielle. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import CxCalcValue from '../components/ds/CxCalcValue.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSegmented from '../components/ds/CxSegmented.vue'
import CxValue from '../components/ds/CxValue.vue'
import CxWhyPanel from '../components/ds/CxWhyPanel.vue'
import type { SegmentedOption } from '../components/ds/types.ts'
import { LIMITS } from '../persistence/model.ts'
import { entityRoute } from '../router/entityRoute.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { useCriteriaStore } from '../stores/criteria.ts'
import { useDataStore } from '../stores/data.ts'
import { limitText } from '../ui/explainText.ts'
import { formatInt } from '../ui/format.ts'
import { costBars } from './misc/runeModel.ts'
import WidgetFoot from './misc/WidgetFoot.vue'
import WidgetStepper from './misc/WidgetStepper.vue'
import type { WidgetBodyProps } from './types.ts'

/**
 * Corps du widget `rune-calculator` (D5 ; calculs.md, « Coût en runes d'un niveau », décision D4). Contrat d'un corps : voir `src/widgets/types.ts`.
 * Trois sources du niveau visé : le niveau recommandé du prochain boss de la frise (`analysis.nextBoss` et `analysis.bossLevel`), le niveau cible
 * des critères, ou une saisie. Le total vient de `analysis.runesTo(niveau)` (somme des coûts lus dans la table officielle 1–713) et s'affiche avec
 * le badge Calculé et « Pourquoi ? » (`CxCalcValue`, `CxWhyPanel`). Le détail (niveaux à gagner, prochain niveau, dernier niveau, petite courbe du coût
 * par niveau) vient de `analysis.runeCostsBetween(de, à)`. Aucun calcul ici : une plage invalide ou hors table est dite par la limite
 * que le moteur renvoie, jamais par un 0.
 */
defineProps<WidgetBodyProps>()

/** Source du niveau visé. */
type Source = 'next' | 'target' | 'other'

const analysis = useAnalysisStore()
const criteria = useCriteriaStore()
const data = useDataStore()

const source = ref<Source>('next')
/** Niveau saisi (mode « Autre ») ; `null` tant que l'utilisateur n'a rien saisi : le niveau actuel sert alors de point de départ. */
const typed = ref<number | null>(null)
const whyOpen = ref(false)

const sources: SegmentedOption<Source>[] = [
  { value: 'next', label: 'Prochain boss' },
  { value: 'target', label: 'Build cible' },
  { value: 'other', label: 'Autre' },
]

const current = computed(() => analysis.level.value)

// Mode « Prochain boss ».
const next = computed(() => analysis.nextBoss)
const nextRecommendation = computed(() => (next.value === null ? null : analysis.bossLevel(next.value.node.levelKey)))
const nextName = computed(() => {
  const node = next.value?.node
  if (node === undefined) return null
  const entry = data.entity(`boss:${node.boss}`)
  return entry !== null && 'name' in entry ? entry.name : null
})
const nextLevel = computed(() => nextRecommendation.value?.value?.level ?? null)
const nextLimit = computed(() => {
  const limit = nextRecommendation.value?.explanation.limits.at(-1)
  return limit === undefined ? null : limitText(limit.code, limit.params)
})
const bossesLoaded = computed(() => data.dataset('bosses') !== null)

// Mode « Autre » : saisie bornée aux niveaux de la table.
const typedLevel = computed({
  get: () => typed.value ?? Math.min(LIMITS.levelMax, (current.value ?? LIMITS.levelMin) + 5),
  set: (value: number) => {
    typed.value = value
  },
})

/** Niveau visé selon la source ; `null` si la source n'en donne pas (pas de prochain boss, boss non estimé). */
const targetLevel = computed((): number | null => {
  if (source.value === 'next') return nextLevel.value
  if (source.value === 'target') return criteria.criteria.target.level
  return typedLevel.value
})

const runes = computed(() => (targetLevel.value === null ? null : analysis.runesTo(targetLevel.value)))
/** Raison pour laquelle le moteur n'a pas pu calculer (plage invalide, niveau hors table) : sa dernière limite. */
const runesLimit = computed(() => {
  const limit = runes.value?.explanation.limits.at(-1)
  return runes.value?.value === null && limit !== undefined ? limitText(limit.code, limit.params) : null
})

/** Coût de chaque niveau de l'actuel au niveau visé (calculs.md, « Coût en runes d'un niveau »), pour le détail sous le total. */
const costs = computed(() => (current.value === null || targetLevel.value === null ? null : analysis.runeCostsBetween(current.value, targetLevel.value)))
const costList = computed(() => costs.value?.value ?? [])
const bars = computed(() => costBars(costList.value))
const barsLabel = computed(() => {
  const first = costList.value[0]
  const last = costList.value.at(-1)
  if (first === undefined || last === undefined) return ''
  return `Coût en runes par niveau, du niveau ${formatInt(first.level)} (${formatInt(first.cost)}) au niveau ${formatInt(last.level)} (${formatInt(last.cost)})${bars.value.step > 1 ? `, un niveau sur ${bars.value.step}` : ''}`
})
</script>

<template>
  <div class="wd-runes">
    <CxSegmented
      v-model="source"
      :options="sources"
      label="Niveau visé"
      full
    />

    <div
      v-if="source === 'next'"
      class="wd-runes-ctx"
    >
      <template v-if="next !== null">
        <span>
          Prochain boss :
          <RouterLink
            v-if="nextName !== null"
            class="wd-runes-link"
            :to="entityRoute(`boss:${next.node.boss}`)"
          >{{ nextName }}</RouterLink>
          <template v-else>{{ next.node.boss }}</template>
        </span>
        <span class="wd-runes-rec">
          Niveau recommandé :
          <CxValue
            v-if="nextLevel !== null"
            :value="nextLevel"
            calculated
            :why="false"
            :estimate="nextRecommendation?.estimate?.confidence ?? null"
          />
          <span
            v-else
            class="cx-null"
          >Non estimé</span>
        </span>
        <span
          v-if="nextLevel === null && nextLimit !== null"
          class="cx-muted"
        >{{ nextLimit }}</span>
      </template>
      <span
        v-else-if="!bossesLoaded"
        class="cx-muted"
      >Les données des boss ne sont pas lues : choisissez « Build cible » ou « Autre ».</span>
      <span
        v-else
        class="cx-muted"
      >Aucun boss à affronter : la frise est terminée.</span>
    </div>

    <div
      v-else-if="source === 'target'"
      class="wd-runes-ctx"
    >
      <span>Niveau cible de vos critères : <b class="cx-num">{{ formatInt(criteria.criteria.target.level) }}</b></span>
      <span
        v-if="criteria.criteria.target.archetype === null"
        class="cx-muted"
      >Aucun build cible choisi : c'est le niveau cible par défaut.</span>
    </div>

    <div
      v-else
      class="wd-runes-ctx wd-runes-input"
    >
      <span class="cx-label">Niveau visé</span>
      <WidgetStepper
        v-model="typedLevel"
        label="Niveau visé"
        :min="LIMITS.levelMin"
        :max="LIMITS.levelMax"
        :step="5"
      />
    </div>

    <div class="wd-runes-result">
      <template v-if="current === null">
        <CxNote
          tone="warn"
          title="Niveau actuel indisponible."
        >
          Vos attributs ne donnent pas de niveau : vérifiez-les dans le panneau de critères.
        </CxNote>
      </template>
      <template v-else-if="runes !== null && runes.value !== null && targetLevel !== null">
        <div class="wd-runes-total">
          <CxCalcValue
            :calc="runes"
            method="Somme des coûts de niveau, lus dans la table officielle (niveaux 1 à 713)."
            @why="whyOpen = !whyOpen"
          />
        </div>
        <p class="cx-muted wd-runes-text">
          runes pour passer du niveau {{ formatInt(current) }} au niveau {{ formatInt(targetLevel) }}
        </p>
        <dl
          v-if="costList.length > 0"
          class="wd-runes-kv"
        >
          <div>
            <dt>Niveaux à gagner</dt>
            <dd class="cx-num">
              {{ formatInt(costList.length) }}
            </dd>
          </div>
          <div>
            <dt>Prochain niveau</dt>
            <dd class="cx-num">
              {{ formatInt(costList[0]!.cost) }}
            </dd>
          </div>
          <div>
            <dt>Dernier niveau</dt>
            <dd class="cx-num">
              {{ formatInt(costList[costList.length - 1]!.cost) }}
            </dd>
          </div>
        </dl>
        <template v-if="bars.bars.length > 1">
          <div
            class="wd-runes-bars"
            role="img"
            :aria-label="barsLabel"
          >
            <span
              v-for="bar in bars.bars"
              :key="bar.level"
              :style="{ height: `${bar.height}%` }"
              :title="`Niveau ${formatInt(bar.level)} : ${formatInt(bar.cost)} runes`"
            />
          </div>
          <p class="wd-runes-axis cx-num">
            <span>Coût par niveau, niv. {{ formatInt(costList[0]!.level) }}</span>
            <span>niv. {{ formatInt(costList[costList.length - 1]!.level) }}</span>
          </p>
        </template>
        <div class="wd-runes-why">
          <CxWhyPanel
            v-model:open="whyOpen"
            :explanation="runes.explanation"
            :toggle="false"
            subject="ce total de runes"
          />
        </div>
      </template>
      <CxNote
        v-else-if="runesLimit !== null"
        tone="info"
        title="Aucun total à afficher."
      >
        {{ runesLimit }}
      </CxNote>
      <p
        v-else
        class="cx-muted"
      >
        Choisissez un niveau visé pour voir les runes nécessaires.
      </p>
    </div>

    <WidgetFoot>La table officielle du fichier mechanics fait foi en cas d'écart.</WidgetFoot>
  </div>
</template>

<style scoped>
.wd-runes { display: grid; gap: var(--space-3); min-width: 0; }
.wd-runes-ctx { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-4); color: var(--ink-2); font-size: 13px; line-height: 18px; }
.wd-runes-ctx b { color: var(--ink); font-weight: 600; }
.wd-runes-rec { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); }
.wd-runes-link { color: var(--gold-text); text-decoration: none; font-weight: 600; }
.wd-runes-link:hover { text-decoration: underline; }
.wd-runes-input { justify-content: space-between; }
.wd-runes-result { display: grid; gap: var(--space-1); min-width: 0; }
/* Seul le nombre prend la taille `chiffre-xl` : les badges et « Pourquoi ? » gardent leur taille. */
.wd-runes-total { overflow-wrap: anywhere; }
.wd-runes-total :deep(.cx-value > .cx-num) { font-size: 44px; line-height: 48px; font-weight: 600; }
.wd-runes-text { margin: 0; }
.wd-runes-kv { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: var(--space-3) 0 0; }
.wd-runes-kv div { display: grid; gap: 2px; }
.wd-runes-kv dt { color: var(--ink-3); font-size: 11px; line-height: 14px; }
.wd-runes-kv dd { margin: 0; color: var(--ink); font: 600 15px/18px var(--font-sans); }
/* Courbe en barres : la hauteur est relative à la plus haute barre ; couleur de la donnée calculée, jamais seule (valeurs en info-bulle et en légende). */
.wd-runes-bars { display: flex; align-items: flex-end; gap: 2px; height: 56px; margin-top: var(--space-3); }
.wd-runes-bars > span { flex: 1 1 0; min-width: 2px; border-radius: 2px 2px 0 0; background: var(--gold); }
.wd-runes-axis { display: flex; justify-content: space-between; margin: 0; color: var(--ink-3); font-size: 11px; line-height: 14px; }
/* Le panneau « Pourquoi ? » est pensé pour trois colonnes ; dans un widget de 5 colonnes, il se lit mieux en une seule. */
.wd-runes-why { margin-top: var(--space-2); }
.wd-runes-why :deep(.cx-why) { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); padding: var(--space-3); }
</style>
