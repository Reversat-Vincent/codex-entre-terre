<!-- Panneau d'une statistique du widget « Rendement des attributs » : courbe, valeur actuelle, gain du point suivant, paliers cités, tableau des gains. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import CxButton from '../../components/ds/CxButton.vue'
import CxLineChart from '../../components/ds/CxLineChart.vue'
import CxValue from '../../components/ds/CxValue.vue'
import CxWikiLink from '../../components/ds/CxWikiLink.vue'
import type { ChartSeries } from '../../components/ds/types.ts'
import type { YieldCurve } from '../../engine/attributeYield.ts'
import type { ChartMarker } from '../../ui/chart.ts'
import { formatInt } from '../../ui/format.ts'
import { curveView } from './yieldModel.ts'

/**
 * Panneau d'une statistique (PV, FP, endurance ou charge ; calculs.md, « Rendement des attributs »). Il ne lit aucun store : le widget lui passe la courbe
 * du moteur, et `yieldModel.ts` la met en forme. Le curseur du graphique part du niveau du profil ; les boutons de repère le déplacent sur un palier publié
 * ou sur le niveau du profil ; les paliers sont aussi tracés en repères permanents sur la courbe (`markers` de `CxLineChart`). Le gain du point suivant est
 * la seule valeur « Calculée » : son bouton « Pourquoi ? » est relayé au widget par l'événement `why`.
 */
const props = withDefaults(
  defineProps<{
    /** Courbe de `analysis.attributeYield`. */
    curve: YieldCurve
    /** Affiche un titre de section (plein écran : plusieurs panneaux côte à côte). */
    heading?: boolean
  }>(),
  { heading: false },
)

const emit = defineEmits<{
  /** L'utilisateur demande le détail du calcul du gain du point suivant. */
  why: []
}>()

const view = computed(() => curveView(props.curve))

/** Niveau affiché par le graphique ; part du niveau du profil. */
const cursor = ref<number | null>(props.curve.position.points)

const series = computed<ChartSeries[]>(() => [{ id: view.value.meta.stat, label: view.value.meta.label, values: view.value.values }])
/** Paliers publiés, tracés en repères permanents sur la courbe (lisibles sans couleur : pointillés et libellé). */
const markers = computed<ChartMarker[]>(() => view.value.paliers.map((p) => ({ x: p.points, label: `Palier ${p.points}` })))
const chartTitle = computed(() => `${view.value.meta.name} selon ${view.value.attrName}, niveaux ${view.value.x[0] ?? 1} à ${view.value.x.at(-1) ?? 99}`)

/** Les abscisses sont des niveaux d'attribut : le nombre seul, sans le « + » des niveaux d'amélioration. */
function levelLabel(level: number): string {
  return String(level)
}

/** Le tableau est monté à l'ouverture seulement : il compte 99 lignes par statistique. */
const tableOpen = ref(false)
function onTableToggle(event: Event): void {
  tableOpen.value = (event.target as HTMLDetailsElement).open
}

const nextText = computed(() => {
  const v = view.value
  if (v.paliers.length === 0) return null
  if (v.next === null || v.pointsToNext === null) return 'Tous atteints'
  return `${formatInt(v.next.points)} (dans ${formatInt(v.pointsToNext)} ${v.pointsToNext > 1 ? 'points' : 'point'})`
})
</script>

<template>
  <section
    class="wd-yp"
    :data-stat="curve.stat"
  >
    <h3
      v-if="heading"
      class="wd-yp-title"
    >
      {{ view.meta.name }}
      <span class="cx-muted">selon {{ view.attrName }}</span>
    </h3>

    <div class="wd-yp-chart">
      <CxLineChart
        v-model:cursor="cursor"
        :x="view.x"
        :series="series"
        :title="chartTitle"
        :x-label="levelLabel"
        :x-name="view.attrName"
        :digits="view.meta.digits"
        :markers="markers"
      />
    </div>

    <dl class="wd-yp-now">
      <div>
        <dt>{{ view.attrName }} actuel</dt>
        <dd>
          <span class="cx-num">{{ formatInt(view.profilePoints) }}</span>
          <span class="cx-muted"> : </span>
          <CxValue
            :value="view.profileValue"
            format="decimal"
            :digits="view.meta.digits"
          />
          <span class="cx-muted"> {{ view.meta.label }}</span>
        </dd>
      </div>
      <div>
        <dt>Gain du point suivant</dt>
        <dd>
          <CxValue
            :value="view.nextGain"
            format="decimal"
            :digits="view.meta.digits"
            calculated
            method="Valeur du niveau suivant moins valeur du niveau actuel, lues dans la table du wiki."
            @why="emit('why')"
          />
        </dd>
      </div>
      <div>
        <dt>Palier suivant</dt>
        <dd>
          <CxValue :value="nextText" />
        </dd>
      </div>
    </dl>

    <p class="wd-yp-sentence">
      {{ view.sentence }}
    </p>

    <div
      v-if="view.paliers.length > 0"
      class="wd-yp-marks"
    >
      <span class="wd-yp-marks-label">Repères sur la courbe</span>
      <div
        class="wd-yp-marks-row"
        role="group"
        :aria-label="`Repères de ${view.meta.label} sur la courbe`"
      >
        <CxButton
          size="sm"
          :pressed="cursor === view.profilePoints"
          @click="cursor = view.profilePoints"
        >
          Mon niveau ({{ formatInt(view.profilePoints) }})
        </CxButton>
        <CxButton
          v-for="p in view.paliers"
          :key="p.points"
          size="sm"
          :pressed="cursor === p.points"
          @click="cursor = p.points"
        >
          Palier {{ formatInt(p.points) }}{{ p.reached ? ' (atteint)' : '' }}
        </CxButton>
      </div>
      <ul class="wd-yp-gains">
        <li
          v-for="p in view.paliers"
          :key="p.points"
        >
          <b>{{ formatInt(p.points) }}</b> :
          <template v-if="p.before !== null && p.after !== null">
            gain moyen de {{ p.before }} à {{ p.after }} {{ view.meta.perPoint }}
          </template>
          <CxValue
            v-else
            :value="null"
          />
        </li>
      </ul>
      <p class="wd-yp-source">
        Paliers publiés par le wiki, page {{ view.source.page }}.
        <CxWikiLink
          :href="view.source.url"
          size="sm"
        />
      </p>
      <details class="wd-yp-details">
        <summary>Phrase citée du wiki</summary>
        <blockquote
          lang="en"
          class="wd-yp-quote"
        >
          {{ view.source.quote }}
        </blockquote>
      </details>
    </div>

    <details
      class="wd-yp-details"
      @toggle="onTableToggle"
    >
      <summary>Tableau des gains par niveau</summary>
      <div
        v-if="tableOpen"
        class="cx-chart-table-wrap"
      >
        <table class="cx-chart-table">
          <caption class="cx-sr">
            {{ view.meta.name }} et gain du point suivant, par niveau de {{ view.attrName }}
          </caption>
          <thead>
            <tr>
              <th scope="col">
                Niveau
              </th>
              <th
                scope="col"
                class="num"
              >
                {{ view.meta.name }}
              </th>
              <th
                scope="col"
                class="num"
              >
                Gain du point suivant
              </th>
              <th scope="col">
                Repère
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in view.rows"
              :key="row.points"
              :class="{ 'is-active': row.isProfile || row.isCap }"
            >
              <th scope="row">
                {{ row.points }}
              </th>
              <td class="num">
                <CxValue
                  :value="row.value"
                  format="decimal"
                  :digits="view.meta.digits"
                  cell
                />
              </td>
              <td class="num">
                <CxValue
                  v-if="row.gain !== null"
                  :value="row.gain"
                  format="decimal"
                  :digits="view.meta.digits"
                  cell
                />
                <template v-else>
                  <span aria-hidden="true">–</span><span class="cx-sr">Pas de niveau suivant</span>
                </template>
              </td>
              <td>{{ [row.isProfile ? 'Mon niveau' : '', row.isCap ? 'Palier' : ''].filter(Boolean).join(', ') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<style scoped>
.wd-yp { display: grid; gap: var(--space-3); min-width: 0; }
.wd-yp-title { margin: 0; color: var(--ink); font: 600 15px/20px var(--font-sans); }
.wd-yp-now { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-2) var(--space-4); margin: 0; }
.wd-yp-now dt { color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wd-yp-now dd { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0; color: var(--ink); font-size: 14px; line-height: 20px; }
.wd-yp-sentence { margin: 0; color: var(--ink-2); font-size: 13px; line-height: 18px; }
.wd-yp-marks { display: grid; gap: var(--space-2); min-width: 0; }
.wd-yp-marks-label { color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.wd-yp-marks-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.wd-yp-gains { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; color: var(--ink-2); font-size: 12px; line-height: 16px; }
.wd-yp-gains b { color: var(--ink); font-variant-numeric: tabular-nums; }
.wd-yp-source { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); margin: 0; color: var(--ink-3); font-size: 12px; line-height: 16px; }
.wd-yp-details { color: var(--ink-2); font-size: 12px; line-height: 16px; }
.wd-yp-details summary { cursor: pointer; color: var(--ink-2); font-weight: 600; }
.wd-yp-details[open] summary { margin-bottom: var(--space-2); }
.wd-yp-quote { margin: 0; padding-left: var(--space-3); border-left: 2px solid var(--line-strong); color: var(--ink-2); font-style: italic; }
/* Mobile : zone de frappe de 44 px (`--size-cible`) autour du texte du lien ; la marge négative annule le remplissage pour que la mise en page ne bouge pas. */
@media (max-width: 767px) { .wd-yp-details summary { padding-block: calc((var(--size-cible) - 1lh) / 2); margin-block: calc((var(--size-cible) - 1lh) / -2); } }
</style>
