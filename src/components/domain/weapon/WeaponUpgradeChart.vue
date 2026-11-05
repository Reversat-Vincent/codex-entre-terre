<!-- Évolution de l'attaque par niveau : courbes par affinité (4 au plus) ou par type de dégâts, curseur « Niveau affiché », vue tableau, états « tableau partiel » et « Non documenté ». -->
<script setup lang="ts">
import { computed, useId } from 'vue'
import type { WeaponEntry } from '../../../data/types/weapon.ts'
import { formatInt } from '../../../ui/format.ts'
import CxChip from '../../ds/CxChip.vue'
import CxEmptyState from '../../ds/CxEmptyState.vue'
import CxLineChart from '../../ds/CxLineChart.vue'
import CxNote from '../../ds/CxNote.vue'
import CxRange from '../../ds/CxRange.vue'
import CxReliabilityBadge from '../../ds/CxReliabilityBadge.vue'
import CxValue from '../../ds/CxValue.vue'
import CxWikiLink from '../../ds/CxWikiLink.vue'
import {
  MAX_AFFINITY_SERIES,
  MIN_CHART_POINTS,
  affinityChart,
  damageChart,
  partialTable,
} from './weaponModel.ts'
import type { UpgradeTables } from './weaponModel.ts'

/**
 * Graphique d'évolution de l'attaque (design FicheArme, note `spec-weapon`, architecture § 15 P6).
 * - Deux affinités documentées ou plus : une courbe d'attaque totale par affinité, 4 au plus, la couleur restant attachée à l'affinité ; arme à une seule
 *   affinité documentée (pierres sombres) : une courbe par type de dégâts.
 * - Seuls les niveaux documentés par le wiki sont tracés (aucune interpolation dans le graphique) ; moins de 3 points : pas de courbe, un tableau et la note
 *   « Tableau partiel ». L'interpolation reste dans la colonne Calculé de « Attaque et garde ».
 * - Sans tableau d'amélioration : état « Non documenté » à la place du graphique, calcul limité à +0.
 * - Le curseur « Niveau affiché » pilote le niveau de la colonne Calculé ; il couvre tous les niveaux de l'arme, documentés ou non.
 * Les valeurs tracées sont celles du wiki (aucun calcul de l'application dans la courbe) ; la vue tableau est celle de `CxLineChart`.
 */
const props = defineProps<{
  weapon: WeaponEntry
  /** Description des tableaux (`describeUpgradeTables`). */
  tables: UpgradeTables
  /** Niveau maximal du curseur. */
  levelMax: number
  /** Adresse de la page du wiki, proposée quand le tableau manque. */
  wikiUrl: string | null
}>()

/** Niveau affiché, partagé avec la colonne Calculé. */
const level = defineModel<number>('level', { required: true })
/** Affinités affichées (4 emplacements) ; la couleur d'une affinité est celle de son emplacement. */
const slots = defineModel<(string | null)[]>('slots', { required: true })

const emit = defineEmits<{
  /** Une affinité est ajoutée ou retirée du graphique. */
  toggle: [affinity: string]
}>()

const uid = useId()

const data = computed(() => (props.tables.mode === 'damage' ? damageChart(props.weapon, props.tables.single ?? 'Standard') : affinityChart(props.weapon, slots.value)))
const drawable = computed(() => data.value.x.length >= MIN_CHART_POINTS)
const partial = computed(() => partialTable(props.weapon))
// Le réticule n'apparaît qu'une fois le curseur déplacé : à +0 son info-bulle recouvrirait la courbe sur un écran étroit (la vue tableau donne toutes les valeurs).
const cursor = computed(() => (level.value > 0 && data.value.x.includes(level.value) ? level.value : null))
const shownCount = computed(() => slots.value.filter((s) => s !== null).length)
const title = computed(() =>
  props.tables.mode === 'damage'
    ? `Attaque par niveau et par type de dégâts (affinité ${props.tables.single ?? 'Standard'})`
    : 'Attaque totale par niveau et par affinité',
)
const levelsText = computed(() => partial.value.levels.map((n) => `+${n}`).join(', '))
const colorOf = (affinity: string): number => slots.value.indexOf(affinity) + 1
</script>

<template>
  <div class="wp-chart">
    <template v-if="tables.mode === 'none'">
      <div class="wp-nodata">
        <CxReliabilityBadge kind="null" />
        <CxEmptyState
          title="Pas de tableau d'amélioration sur le wiki"
          :text="`Le wiki ne fournit pas l'évolution de l'attaque de ${weapon.name} par niveau : le calcul est limité à +0.`"
        />
        <CxWikiLink
          :href="wikiUrl"
          size="sm"
        />
      </div>
    </template>

    <template v-else>
      <div class="wp-chart-head">
        <b class="wp-chart-title">{{ title }}</b>
      </div>
      <CxNote
        v-if="tables.inconsistent"
        tone="warn"
        title="Incohérence wiki."
      >
        Le tableau ne concorde pas avec l'infobox à +0 : l'infobox fait foi pour la base, les autres niveaux sont ceux du tableau.
      </CxNote>

      <template v-if="drawable">
        <div
          v-if="tables.mode === 'affinity'"
          class="wp-affs"
          role="group"
          :aria-label="`Affinités affichées, ${MAX_AFFINITY_SERIES} au maximum`"
        >
          <CxChip
            v-for="a in tables.affinities"
            :key="a"
            :pressed="slots.includes(a)"
            :title="slots.includes(a) ? `Masquer ${a}` : shownCount >= MAX_AFFINITY_SERIES ? `${MAX_AFFINITY_SERIES} affinités au maximum : retirez-en une` : `Afficher ${a}`"
            :disabled="!slots.includes(a) && shownCount >= MAX_AFFINITY_SERIES"
            @open="emit('toggle', a)"
          >
            <span
              v-if="slots.includes(a)"
              class="cx-legend-key"
              :class="`cx-cat-${colorOf(a)}`"
            />{{ a }}
          </CxChip>
        </div>
        <p
          v-else
          class="wp-sub"
        >
          Une seule affinité documentée par le wiki : une courbe par type de dégâts.
        </p>
        <CxLineChart
          :x="data.x"
          :series="data.series"
          :title="title"
          :cursor="cursor"
          :show-cursor-control="false"
        />
      </template>

      <template v-else>
        <CxNote
          tone="partial"
          title="Tableau partiel."
        >
          Le wiki ne publie que {{ partial.levels.length === 1 ? 'le niveau' : 'les niveaux' }} {{ levelsText }} : trop peu pour tracer une courbe.
          Les niveaux intermédiaires ne sont pas inventés ici ; le curseur ci-dessous les interpole dans la colonne Calculé, avec le badge Estimation.
        </CxNote>
        <div
          class="wp-table-wrap"
          role="region"
          :aria-label="title"
          tabindex="0"
        >
          <table class="wp-table">
            <caption class="cx-sr">
              Attaque totale aux niveaux documentés, par affinité
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  Affinité
                </th>
                <th
                  v-for="n in partial.levels"
                  :key="n"
                  scope="col"
                  class="num"
                >
                  +{{ n }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in partial.rows"
                :key="row.affinity"
              >
                <th scope="row">
                  {{ row.affinity }}
                </th>
                <td
                  v-for="cell in row.cells"
                  :key="cell.level"
                  class="num"
                >
                  <CxValue
                    :value="cell.total"
                    cell
                  />
                  <span
                    v-if="cell.split && cell.total !== null"
                    class="wp-split"
                  >{{ cell.split }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div
        v-if="levelMax > 0"
        class="wp-range"
      >
        <label
          :for="`${uid}-level`"
          class="cx-label"
        >Niveau affiché</label>
        <CxRange
          :id="`${uid}-level`"
          v-model="level"
          :min="0"
          :max="levelMax"
          :step="1"
          :value-text="`+${formatInt(level)}`"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.wp-chart { display: grid; gap: var(--space-3); min-width: 0; }
.wp-chart-title { color: var(--ink); font-size: 13px; }
.wp-sub { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wp-affs { display: flex; flex-wrap: wrap; gap: 6px; }
.wp-nodata { display: grid; justify-items: start; gap: var(--space-2); }
.wp-range { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--space-3); }
.wp-table-wrap { overflow: auto; max-height: 320px; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.wp-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; line-height: 18px; }
.wp-table th, .wp-table td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
.wp-table thead th { position: sticky; top: 0; background: var(--surface-raised); border-bottom-color: var(--line-strong); color: var(--ink-2); font: 600 12px/16px var(--font-sans); }
.wp-table tbody th { color: var(--ink); font-weight: 600; }
.wp-table tbody tr:last-child th, .wp-table tbody tr:last-child td { border-bottom: 0; }
.wp-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.wp-split { display: block; color: var(--ink-3); font-size: 11px; line-height: 14px; }
</style>
