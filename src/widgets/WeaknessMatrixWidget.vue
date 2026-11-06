<!-- Corps du widget « matrice des faiblesses » (D1, `weakness-matrix`) : absorption par type de dégâts et immunités des boss de la frise. -->
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import CxAbsorptionHeatmap from '../components/ds/CxAbsorptionHeatmap.vue'
import CxEmptyState from '../components/ds/CxEmptyState.vue'
import CxNote from '../components/ds/CxNote.vue'
import CxSelect from '../components/ds/CxSelect.vue'
import type { SelectOption } from '../components/ds/types.ts'
import { NEGATION_KEYS } from '../data/keys.ts'
import type { NegationKey } from '../data/keys.ts'
import { useAnalysisStore } from '../stores/analysis.ts'
import { formatInt } from '../ui/format.ts'
import { DAMAGE_LABELS } from '../ui/labels.ts'
import { heatmapRows, sortRows } from './misc/weaknessModel.ts'
import type { BossHref } from './misc/weaknessModel.ts'
import type { WidgetBodyProps } from './types.ts'

/**
 * Corps du widget `weakness-matrix` (D1 ; brief § 5.2 D ; calculs.md, « Frise des boss » : « seuls les nœuds dont l'absorption et les résistances
 * sont documentées peuvent l'afficher »). Contrat d'un corps : voir `src/widgets/types.ts`.
 * - `dashboard` : les boss de la frise dont l'absorption est documentée, dans l'ordre de la frise ; boss vaincus atténués ; un bandeau dit combien
 *   de boss de la frise sont affichés.
 * - `fullscreen` : toutes les rencontres de `bosses.json` qui ont des données d'absorption (dans la limite du contenu activé).
 * Le tri par type de dégâts remplace les en-têtes cliquables du prototype : `CxAbsorptionHeatmap` n'a pas de tri, un sélecteur le porte ici.
 * Aucun calcul : les lignes viennent de `analysis.weaknessRows` (sans adresse), `misc/weaknessModel.ts` y ajoute l'adresse de la fiche.
 */
const props = defineProps<WidgetBodyProps>()

const analysis = useAnalysisStore()
const router = useRouter()

/** Tri choisi : l'ordre d'origine (`story`) ou un type de dégâts, du plus vulnérable au plus résistant. */
const sortBy = ref<'story' | NegationKey>('story')
const sortId = useId()

/** Adresse de la fiche d'un boss, ouverte sur la rencontre de la ligne (le routeur est en mode hash). */
const href: BossHref = (bossId, encounterId) => router.resolve({ name: 'boss', params: { id: bossId }, query: { rencontre: encounterId } }).href

const isFullscreen = computed(() => props.mode === 'fullscreen')

/** Lignes du store : la frise (tableau de bord) ou toutes les rencontres (plein écran) ; `null` tant que les données ne sont pas prêtes. */
const source = computed(() => analysis.weaknessRows(isFullscreen.value ? 'all' : 'timeline'))
const rows = computed(() => heatmapRows(source.value?.rows ?? [], href))
const sorted = computed(() => sortRows(rows.value, sortBy.value === 'story' ? null : sortBy.value))

const sortOptions = computed<SelectOption[]>(() => [
  { value: 'story', label: isFullscreen.value ? 'Ordre des données' : "Ordre de l'histoire" },
  ...NEGATION_KEYS.map((key) => ({ value: key, label: `${DAMAGE_LABELS[key]} : du plus faible au plus résistant` })),
])
/** Le sélecteur ne propose que les valeurs de `sortOptions` : la conversion rend au modèle son type étroit. */
const sortModel = computed<string>({
  get: () => sortBy.value,
  set: (value) => {
    sortBy.value = (NEGATION_KEYS as readonly string[]).includes(value) ? (value as NegationKey) : 'story'
  },
})
</script>

<template>
  <div
    class="wd-matrix"
    :data-mode="mode"
  >
    <CxEmptyState
      v-if="rows.length === 0"
      title="Aucun boss à afficher"
      text="Le wiki ne donne l'absorption d'aucun boss de la frise pour le contenu activé."
    />
    <template v-else>
      <div class="wd-matrix-tools">
        <p class="cx-muted wd-matrix-hint">
          Boss vaincus atténués. Les cases hachurées ne sont pas documentées par le wiki.
        </p>
        <span class="wd-matrix-sort">
          <label
            :for="sortId"
            class="cx-label"
          >Classer par</label>
          <CxSelect
            :id="sortId"
            v-model="sortModel"
            :options="sortOptions"
          />
        </span>
      </div>
      <CxAbsorptionHeatmap :rows="sorted" />
      <CxNote
        v-if="!isFullscreen && source !== null"
        tone="partial"
        title="Données partielles."
      >
        {{ formatInt(source.rows.length) }} boss de la frise sur {{ formatInt(source.total) }} ont une absorption documentée ;
        les autres n'apparaissent pas. Le plein écran liste toutes les rencontres documentées.
      </CxNote>
      <p
        v-else-if="isFullscreen"
        class="cx-muted"
      >
        {{ formatInt(rows.length) }} rencontres avec une absorption documentée.
      </p>
    </template>
  </div>
</template>

<style scoped>
.wd-matrix { display: grid; gap: var(--space-3); min-width: 0; }
.wd-matrix-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); }
.wd-matrix-hint { margin: 0; font-size: 12px; line-height: 16px; }
.wd-matrix-sort { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
</style>
