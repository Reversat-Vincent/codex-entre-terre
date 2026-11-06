<!-- Encart « Qualité des données » : fiabilité champ par champ (wiki, déduit, estimation, non documenté, incohérence, calculé), puis la source du wiki. -->
<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '../../../ui/format.ts'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import WeaponSection from './WeaponSection.vue'
import type { QualityRow } from './weaponModel.ts'

/**
 * Récapitulatif de fiabilité : une ligne par champ, un badge (forme, icône et mot) à droite. Les lignes viennent de `qualityRows` ; la vue y ajoute celle du score.
 * Le pied rappelle la source (page du wiki, licence CC BY-SA 4.0) et la date d'extraction des données.
 */
const props = defineProps<{
  rows: readonly QualityRow[]
  /** Nom de la page du wiki. */
  pageName: string
  /** Date d'extraction du wiki (`metadata.retrieved`, AAAA-MM-JJ). */
  retrieved: string | null
}>()

/** Date d'extraction en toutes lettres (« 31 octobre 2026 ») ; une date absente ou illisible n'est pas affichée. */
const retrievedText = computed(() => formatDate(props.retrieved, 'long'))
</script>

<template>
  <WeaponSection
    title="Qualité des données"
    subtitle="Fiabilité champ par champ"
  >
    <ul class="wp-q">
      <li
        v-for="r in rows"
        :key="r.id"
      >
        <span>{{ r.label }}</span>
        <span class="wp-q-badge">
          <CxReliabilityBadge
            :kind="r.kind"
            :confidence="r.confidence ?? null"
            :tip="r.tip"
          />
          <span
            v-if="r.note"
            class="cx-muted wp-q-note"
          >{{ r.note }}</span>
        </span>
      </li>
    </ul>
    <p class="wp-src">
      Source : page « {{ pageName }} » sur eldenring.wiki.gg, sous licence CC BY-SA 4.0.
      <template v-if="retrievedText">
        Dernière synchronisation des données : {{ retrievedText }}.
      </template>
    </p>
  </WeaponSection>
</template>

<style scoped>
.wp-q { display: grid; gap: 8px; }
.wp-q li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; color: var(--ink-2); font-size: 13px; line-height: 18px; }
.wp-q-badge { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.wp-q-note { font-size: 12px; }
.wp-src { color: var(--ink-3); font-size: 12px; line-height: 17px; }
</style>
