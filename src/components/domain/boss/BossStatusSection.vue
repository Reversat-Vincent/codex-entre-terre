<!-- Résistances d'une rencontre aux sept statuts : accumulation du wiki ou « Immunisé » avec l'icône barrée. -->
<script setup lang="ts">
import { formatInt } from '../../../ui/format.ts'
import CxDamageChip from '../../ds/CxDamageChip.vue'
import CxValue from '../../ds/CxValue.vue'
import BossSection from './BossSection.vue'
import type { StatusRowModel } from './types.ts'

/**
 * Section « Résistances aux statuts » (écran Fiche boss, note `spec-boss` : « valeur chiffrée ou Immunisé avec icône barrée »).
 * La valeur est celle du wiki, telle quelle (nombre, texte à plusieurs valeurs, « no ») ; l'immunité est la valeur exacte « Immune ».
 * `null` : le wiki ne donne aucune résistance pour cette rencontre (« Non documenté »).
 */
defineProps<{
  /** Une ligne par statut, ou `null` si les résistances ne sont pas documentées. */
  rows: readonly StatusRowModel[] | null
}>()
</script>

<template>
  <BossSection
    title="Résistances aux statuts"
    subtitle="Accumulation nécessaire pour déclencher l’effet (NG)"
  >
    <ul
      v-if="rows !== null"
      class="st"
    >
      <li
        v-for="row in rows"
        :key="row.key"
      >
        <CxDamageChip
          :status="row.key"
          :immune="row.kind === 'immune'"
        />
        <span
          v-if="row.kind === 'immune'"
          class="st-v is-imm"
        >Immunisé</span>
        <span
          v-else-if="row.kind === 'value'"
          class="st-v"
          :title="row.number === null ? 'Valeur du wiki, telle quelle' : undefined"
        >{{ row.number !== null ? formatInt(row.number) : row.text }}</span>
        <CxValue
          v-else
          :value="null"
        />
      </li>
    </ul>
    <p
      v-else
      class="st-none"
    >
      <CxValue :value="null" />
      <span class="cx-muted">Ni immunités ni résistances sur le wiki pour cette rencontre.</span>
    </p>
  </BossSection>
</template>

<style scoped>
.st { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px 16px; }
.st li { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--radius-s); }
.st-v { color: var(--ink); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; overflow-wrap: anywhere; }
.st-v.is-imm { color: var(--ink-2); }
.st-none { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); font-size: 13px; }
</style>
