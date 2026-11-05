<!-- Bandeau de comparaison du widget A : armes choisies (2 à 4), « Ouvrir le comparateur » et « Vider ». -->
<script setup lang="ts">
import { computed } from 'vue'
import CxButton from '../../components/ds/CxButton.vue'
import CxNote from '../../components/ds/CxNote.vue'
import { COMPARE_MIN, useCompareStore } from '../../stores/compare.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useWeaponActions } from './useWeaponActions.ts'

/**
 * Bandeau sous les colonnes quand au moins une arme est à comparer (design `Main.dc.html`, `cmp`) : « N armes à comparer : noms ».
 * Le comparateur s'ouvre à partir de 2 armes (`COMPARE_MIN`) ; avec une seule, le bouton est inactif et dit pourquoi. Les noms viennent des armes
 * évaluées ; une référence inconnue de ce widget (ajoutée depuis un catalogue) garde son identifiant.
 */
const compare = useCompareStore()
const analysis = useAnalysisStore()
const actions = useWeaponActions()

const names = computed(() => {
  const byRef = new Map(analysis.scored.map((s) => [s.candidate.ref, s.candidate.weapon.name]))
  return compare.items.map((ref) => byRef.get(ref) ?? ref.slice(ref.indexOf(':') + 1))
})
const title = computed(() => `${compare.items.length} ${compare.items.length > 1 ? 'armes à comparer :' : 'arme à comparer :'}`)
</script>

<template>
  <CxNote
    v-if="compare.items.length > 0"
    tone="calc"
    icon="compare"
    class="wa-compare"
  >
    <div class="wa-compare-row">
      <span><b>{{ title }}</b> {{ names.join(', ') }}</span>
      <span class="cx-row tight wa-compare-acts">
        <CxButton
          size="sm"
          :disabled="compare.items.length < COMPARE_MIN"
          :title="compare.items.length < COMPARE_MIN ? 'Ajoutez au moins 2 armes' : 'Comparer côte à côte'"
          @click="actions.openComparator()"
        >
          Ouvrir le comparateur
        </CxButton>
        <CxButton
          variant="ghost"
          size="sm"
          @click="compare.clear()"
        >
          Vider
        </CxButton>
      </span>
    </div>
  </CxNote>
</template>

<style scoped>
.wa-compare { margin-top: var(--space-3); align-items: center; }
.wa-compare :deep(.cx-note-body) { flex: 1 1 auto; }
.wa-compare-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.wa-compare-acts { margin-left: auto; }
</style>
