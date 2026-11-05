<!-- Classement des origines du widget B : tableau (tablette et desktop) ou liste compacte (mobile), une ligne par origine, sélection pour le détail. -->
<script setup lang="ts">
import CxIcon from '../../components/ds/CxIcon.vue'
import CxSourceBadge from '../../components/ds/CxSourceBadge.vue'
import { formatInt } from '../../ui/format.ts'
import type { EntityRef } from '../../data/datasets.ts'
import type { OriginRow } from './useOriginWidget.ts'

/**
 * Classement des origines pour le build cible (brief § 5.2 B ; calculs.md, « Origine optimale »). Les rangs, niveaux finaux et points gaspillés
 * sont ceux de `rankOrigins` ; rien n'est recalculé ici. Le tri du moteur est conservé : niveau final croissant, puis adéquation précoce, puis nom.
 * Le nom d'une origine est un vrai `button` (`aria-pressed`) qui choisit l'origine détaillée ; la recommandation porte un mot et une icône.
 */
defineProps<{
  /** Lignes triées du classement. */
  rows: readonly OriginRow[]
  /** Origine actuellement détaillée. */
  selected: EntityRef | null
  /** Présentation en liste (mobile) plutôt qu'en tableau. */
  compact: boolean
}>()

const emit = defineEmits<{
  /** L'utilisateur choisit l'origine à détailler. */
  select: [ref: EntityRef]
}>()

/**
 * Résumé d'une ligne de la liste compacte.
 * @param row Ligne du classement.
 * @returns Une phrase : niveau pour la cible, points gaspillés, arme de départ recommandée.
 */
function summary(row: OriginRow): string {
  const wasted = row.rank.wastedPoints
  const parts = [
    `Niveau ${formatInt(row.rank.finalLevel)} pour la cible`,
    wasted === 0 ? 'aucun point gaspillé' : `${formatInt(wasted)} point${wasted > 1 ? 's' : ''} gaspillé${wasted > 1 ? 's' : ''}`,
  ]
  if (row.recommendedStarting.length > 0) parts.push(`départ avec ${row.recommendedStarting.join(', ')}`)
  return parts.join(', ')
}
</script>

<template>
  <ul
    v-if="compact"
    class="cx-or-list"
    aria-label="Classement des origines"
  >
    <li
      v-for="row in rows"
      :key="row.ref"
      class="cx-or-item"
      :class="{ 'is-selected': row.ref === selected }"
    >
      <button
        type="button"
        class="cx-or-pick"
        :aria-pressed="row.ref === selected"
        @click="emit('select', row.ref)"
      >
        <span class="cx-or-pick-main">
          <b>{{ row.origin.name }}</b>
          <CxSourceBadge :source="row.origin.source" />
          <small>{{ summary(row) }}</small>
        </span>
        <span
          v-if="row.top"
          class="cx-status ready"
        ><CxIcon name="check-c" />Recommandée</span>
        <span
          v-else
          class="cx-muted"
        >Rang {{ row.rank.rank }}</span>
      </button>
    </li>
  </ul>

  <div
    v-else
    class="cx-or-wrap"
  >
    <table class="cx-or-tbl">
      <caption class="cx-sr">
        Classement des origines pour le build cible
      </caption>
      <thead>
        <tr>
          <th
            scope="col"
            class="num"
          >
            Rang
          </th>
          <th scope="col">
            Origine
          </th>
          <th
            scope="col"
            class="num"
          >
            Niv. de départ
          </th>
          <th
            scope="col"
            class="num"
            aria-sort="ascending"
          >
            Niv. pour la cible
          </th>
          <th
            scope="col"
            class="num"
          >
            Points gaspillés
          </th>
          <th
            scope="col"
            class="num"
            title="Somme des attributs de départ utiles au build, plus un bonus si une arme de départ est recommandée : elle départage les niveaux égaux."
          >
            Adéquation précoce
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.ref"
          :class="{ 'is-selected': row.ref === selected }"
        >
          <td class="num">
            {{ row.rank.rank }}
          </td>
          <td>
            <div class="cx-or-cell">
              <button
                type="button"
                class="cx-or-name"
                :aria-pressed="row.ref === selected"
                @click="emit('select', row.ref)"
              >
                {{ row.origin.name }}
              </button>
              <CxSourceBadge :source="row.origin.source" />
              <span
                v-if="row.top"
                class="cx-status ready"
              ><CxIcon name="check-c" />Recommandée</span>
            </div>
          </td>
          <td class="num">
            {{ formatInt(row.origin.level) }}
          </td>
          <td class="num">
            <b>{{ formatInt(row.rank.finalLevel) }}</b>
          </td>
          <td class="num">
            {{ formatInt(row.rank.wastedPoints) }}
          </td>
          <td class="num">
            {{ formatInt(row.rank.earlyFit) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
.cx-or-tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; line-height: 18px; }
.cx-or-tbl th { padding: 6px 8px; border-bottom: 1px solid var(--line-strong); background: var(--surface-raised); color: var(--ink-2); font: 600 12px/16px var(--font-sans); text-align: left; vertical-align: bottom; }
.cx-or-tbl th.num { text-align: right; }
.cx-or-tbl th[aria-sort] { color: var(--gold-text); }
.cx-or-tbl td { padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.cx-or-wrap { overflow: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.cx-or-cell { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.cx-or-tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.cx-or-tbl tbody tr:last-child td { border-bottom: 0; }
.cx-or-tbl tbody tr:hover td { background: var(--surface-hover); }
.cx-or-tbl tr.is-selected td { background: var(--gold-wash); }
.cx-or-name { padding: 0; border: 0; background: none; color: var(--ink); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
.cx-or-name:hover, .cx-or-name[aria-pressed="true"] { color: var(--gold-text); }
.cx-or-list { display: grid; }
.cx-or-item { border-top: 1px solid var(--line); }
.cx-or-item:first-child { border-top: 0; }
.cx-or-item.is-selected { background: var(--gold-wash); }
.cx-or-pick { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); width: 100%; min-height: 48px; padding: 6px var(--space-2); border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.cx-or-pick-main { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; min-width: 0; }
.cx-or-pick-main b { color: var(--ink); font-weight: 600; }
.cx-or-pick-main small { flex-basis: 100%; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.cx-or-pick[aria-pressed="true"] b { color: var(--gold-text); }
</style>
