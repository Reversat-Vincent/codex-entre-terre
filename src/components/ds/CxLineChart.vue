<!-- Graphique en courbes maison (SVG) : jusqu'à 4 séries, réticule au survol et au curseur, valeurs en légende, vue tableau équivalente. -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { buildGeometry, nearestIndex, placeMarkers, type ChartLayout, type ChartMarker } from '../../ui/chart.ts'
import { formatDecimal, formatInt } from '../../ui/format.ts'
import CxRange from './CxRange.vue'
import CxReliabilityBadge from './CxReliabilityBadge.vue'
import CxSegmented from './CxSegmented.vue'
import CxValue from './CxValue.vue'
import type { ChartSeries, SegmentedOption } from './types.ts'

/**
 * Courbes d'une valeur selon l'abscisse, par exemple l'attaque par niveau d'amélioration et par affinité (README du design system, composant LineChart).
 * - Quatre séries au plus (`cat-1` à `cat-4`, ordre fixe) ; le choix des séries est fait par l'appelant (sélecteur d'affinités). La couleur est attachée à la série.
 * - Lecture sans couleur : légende au-dessus (valeurs de l'abscisse affichée), étiquettes en bout de ligne, info-bulle au survol, vue tableau équivalente.
 * - Réticule au survol (souris, toucher) et au curseur « Niveau affiché » (curseur natif, utilisable au clavier). Texte du graphique dans les encres.
 * - Repères verticaux permanents (`markers`, par exemple des paliers) : ligne en pointillés et libellé écrit, lisibles sans couleur.
 * - Mise en page adaptée à la largeur réelle : le `viewBox` suit la largeur mesurée du conteneur (une unité = un pixel), donc le texte garde sa taille
 *   à 390 px au lieu d'être réduit avec le dessin ; sous 520 px, marges et étiquettes de fin de ligne se resserrent.
 * - Un `null` interrompt la ligne (jamais 0 ni interpolation). Aucune animation : le mouvement réduit n'a donc rien à désactiver.
 * Le composant ne calcule aucune valeur de jeu ; la géométrie (échelles, graduations rondes) est dans `src/ui/chart.ts`.
 */
const props = withDefaults(
  defineProps<{
    /** Abscisses numériques croissantes (niveaux d'amélioration). */
    x: readonly number[]
    /** Séries à tracer (les quatre premières seulement), chacune avec une valeur par abscisse. */
    series: readonly ChartSeries[]
    /** Nom accessible du graphique (« Attaque physique par niveau et par affinité »). */
    title: string
    /** Libellé d'une abscisse (« +18 ») ; par défaut `+` suivi du nombre. */
    xLabel?: (x: number) => string
    /** Nom de l'abscisse, pour le curseur et la colonne du tableau. */
    xName?: string
    /** Nombre maximal de décimales des valeurs (0 par défaut). */
    digits?: number
    /** Les valeurs sont calculées par l'application : le badge Calculé accompagne l'info-bulle. */
    calculated?: boolean
    /** Affiche le curseur « Niveau affiché » sous le graphique (vrai par défaut). */
    showCursorControl?: boolean
    /** Repères verticaux permanents (abscisse et libellé), par exemple les paliers de rendement ; ceux hors des abscisses sont ignorés. */
    markers?: readonly ChartMarker[]
  }>(),
  {
    xLabel: (x: number) => `+${x}`,
    xName: 'Niveau',
    digits: 0,
    calculated: false,
    showCursorControl: true,
    markers: () => [],
  },
)

/** Abscisse affichée par le curseur ; `null` = aucun réticule tant que l'utilisateur ne survole pas. */
const cursor = defineModel<number | null>('cursor', { default: null })

/** Largeur de départ (avant la première mesure, et hors navigateur), en unités du `viewBox`. */
const DEFAULT_WIDTH = 600
/** Sous cette largeur (px), le graphique passe en mise en page resserrée. */
const COMPACT_BELOW = 520
const HEIGHT = 220
/** Largeur estimée d'un caractère du texte du graphique (12 px), pour tronquer les étiquettes et espacer les repères. */
const CHAR_WIDTH = 6.6
/** Hauteur d'une rangée d'étiquettes de repères. */
const MARKER_ROW = 13
const MAX_SERIES = 4

const uid = useId()
const view = ref<'chart' | 'table'>('chart')
const hoverIndex = ref<number | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)
const plotEl = ref<HTMLElement | null>(null)
const tipEl = ref<HTMLElement | null>(null)
/** Largeur mesurée de la zone de tracé ; le `viewBox` la reprend pour que le dessin ne soit jamais mis à l'échelle. */
const plotWidth = ref(DEFAULT_WIDTH)
/** Largeur de l'info-bulle affichée, mesurée pour la garder dans le graphique. */
const tipWidth = ref(0)
let observer: ResizeObserver | null = null

/** Mesure la zone de tracé ; une zone masquée (vue tableau, largeur 0) garde la dernière mesure. */
function measure(): void {
  // Géométrie : élément absent = largeur nulle, donc mesure ignorée.
  const width = Math.round(plotEl.value?.clientWidth ?? 0)
  if (width > 0) plotWidth.value = width
}
onMounted(() => {
  measure()
  // Absent de certains environnements de test : la largeur par défaut reste alors en vigueur.
  if (typeof ResizeObserver !== 'undefined' && plotEl.value) {
    observer = new ResizeObserver(measure)
    observer.observe(plotEl.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

const viewOptions: SegmentedOption<'chart' | 'table'>[] = [
  { value: 'chart', label: 'Courbe' },
  { value: 'table', label: 'Tableau' },
]

const shown = computed(() =>
  props.series.slice(0, MAX_SERIES).map((s, index) => ({ ...s, cls: `cx-cat-${s.color ?? (index % MAX_SERIES) + 1}` })),
)
const compact = computed(() => plotWidth.value < COMPACT_BELOW)
/** Marges latérales : l'axe vertical et les étiquettes de fin de ligne ont moins de place sur un petit écran. */
const sides = computed(() => (compact.value ? { left: 38, right: 60 } : { left: 44, right: 96 }))
// Géométrie : sans abscisse, la plage est réduite au point 0 (le graphique n'est alors pas tracé).
const xRange = computed(() => ({ first: props.x[0] ?? 0, last: props.x[props.x.length - 1] ?? 0 }))
/** Repères placés (étiquettes sur une ou plusieurs rangées) : leur nombre de rangées fixe la marge haute du dessin. */
const placedMarkers = computed(() => {
  const { left, right } = sides.value
  const span = xRange.value.last - xRange.value.first
  const xAt = (v: number): number => (span > 0 ? left + ((v - xRange.value.first) / span) * (plotWidth.value - left - right) : (left + plotWidth.value - right) / 2)
  return placeMarkers(props.markers, xAt, xRange.value, plotWidth.value, CHAR_WIDTH)
})
const markerRows = computed(() => placedMarkers.value.reduce((rows, m) => Math.max(rows, m.row + 1), 0))
const layout = computed<ChartLayout>(() => ({
  width: plotWidth.value,
  height: HEIGHT,
  ...sides.value,
  top: markerRows.value > 0 ? 18 + (markerRows.value - 1) * MARKER_ROW : 14,
  bottom: 30,
}))
const geometry = computed(() =>
  buildGeometry(
    props.x,
    shown.value.map((s) => s.values),
    layout.value,
    { maxXLabels: compact.value ? 5 : 7 },
  ),
)
/** Nom accessible du dessin : le titre, puis les repères (le texte du SVG n'est pas lu à travers `role="img"`). */
const svgLabel = computed(() =>
  placedMarkers.value.length === 0 ? props.title : `${props.title}. Repères : ${placedMarkers.value.map((m) => m.marker.label).join(', ')}.`,
)

const cursorIndex = computed(() => {
  if (cursor.value === null) return null
  const i = props.x.indexOf(cursor.value)
  return i < 0 ? null : i
})
/** Indice affiché : le survol prime sur le curseur. */
const activeIndex = computed(() => hoverIndex.value ?? cursorIndex.value)
const activeX = computed(() => (activeIndex.value === null ? null : (geometry.value.xs[activeIndex.value] ?? null)))

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'non documenté'
  return props.digits > 0 ? formatDecimal(value, props.digits) : formatInt(value)
}

/** Valeur de chaque série à l'indice affiché, avec la valeur de base de la première abscisse rappelée. */
const readings = computed(() => {
  const i = activeIndex.value
  if (i === null) return []
  return shown.value.map((s, k) => ({
    id: s.id,
    label: s.label,
    cls: s.cls,
    value: s.values[i] ?? null,
    base: s.values[0] ?? null,
    // Pas de point à tracer pour une valeur absente (`null`) : le repère n'a alors pas d'ordonnée.
    y: s.values[i] == null ? null : geometry.value.yAt(s.values[i] as number),
    k,
  }))
})
// Étiquettes d'abscisse : sans abscisse, l'étiquette est celle du point 0 (graphique non tracé).
const activeLabel = computed(() => (activeIndex.value === null ? '' : props.xLabel(props.x[activeIndex.value] ?? 0)))
// Idem pour l'étiquette de base et la lecture vocale : sans abscisse, rien n'est tracé ni annoncé.
const baseLabel = computed(() => props.xLabel(props.x[0] ?? 0))

/** Lecture lue aux lecteurs d'écran quand le curseur change (le survol à la souris n'annonce rien). */
const liveText = computed(() => {
  const i = cursorIndex.value
  if (i === null) return ''
  return `${props.xName} ${props.xLabel(props.x[i] ?? 0)} : ${shown.value.map((s) => `${s.label} ${fmt(s.values[i])}`).join(', ')}`
})

/**
 * Position de l'info-bulle : à droite du réticule s'il y a la place, sinon à gauche, sinon calée dans le graphique. La largeur de la bulle est
 * mesurée après chaque rendu (son texte change avec l'abscisse) : une estimation la ferait sortir du cadre sur un écran étroit.
 */
const tooltipStyle = computed(() => {
  const x = activeX.value
  if (x === null) return {}
  const w = tipWidth.value
  const total = plotWidth.value
  const left = x + 8 + w <= total ? x + 8 : x - 8 - w >= 0 ? x - 8 - w : Math.max(0, total - w)
  // Sous les étiquettes de repères (marge haute du dessin), pour ne pas les cacher.
  return { left: `${left}px`, top: `${layout.value.top}px` }
})
watch([activeIndex, view, plotWidth, shown], async () => {
  await nextTick()
  // Géométrie : infobulle absente = largeur nulle.
  tipWidth.value = tipEl.value?.offsetWidth ?? 0
})

/** Étiquettes de fin de ligne, tronquées à ce que la marge droite peut porter (le nom complet reste dans la légende et le `title`). */
const endLabels = computed(() => {
  const maxChars = Math.max(3, Math.floor((sides.value.right - 8) / CHAR_WIDTH))
  return geometry.value.endLabels.map((e) => {
    const s = shown.value[e.seriesIndex]
    const full = s?.label ?? ''
    return { key: s?.id ?? String(e.seriesIndex), y: e.y, text: full.length > maxChars ? `${full.slice(0, maxChars - 1)}…` : full, full }
  })
})

function onPointer(event: PointerEvent): void {
  const svg = svgEl.value
  if (!svg || props.x.length === 0) return
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0) return
  const vx = ((event.clientX - rect.left) / rect.width) * layout.value.width
  const i = nearestIndex(vx, geometry.value.xs)
  hoverIndex.value = i < 0 ? null : i
}
function onLeave(): void {
  hoverIndex.value = null
}

/** Valeur du curseur natif : l'abscisse affichée, ou la première (0 sans abscisse : le curseur n'est alors pas affiché). */
const sliderValue = computed({
  // Abscisse absente : le curseur n'est pas affiché, 0 sert seulement de valeur neutre.
  get: () => cursor.value ?? props.x[0] ?? 0,
  set: (v: number) => {
    // Le curseur natif avance au pas de 1 : on retient l'abscisse existante la plus proche.
    // Même valeur neutre qu'au-dessus quand il n'y a aucune abscisse.
    let best = props.x[0] ?? 0
    for (const candidate of props.x) if (Math.abs(candidate - v) < Math.abs(best - v)) best = candidate
    cursor.value = best
  },
})
</script>

<template>
  <div class="cx-linechart">
    <div class="cx-linechart-head">
      <div
        v-if="shown.length > 0"
        class="cx-legend"
      >
        <span
          v-for="s in shown"
          :key="s.id"
          :class="s.cls"
        >
          <span class="cx-legend-key" />{{ s.label }}
          <b
            v-if="activeIndex !== null"
            class="cx-num"
          > {{ fmt(s.values[activeIndex]) }}</b>
        </span>
      </div>
      <CxSegmented
        v-model="view"
        :options="viewOptions"
        label="Affichage du graphique"
      />
    </div>

    <div
      v-show="view === 'chart'"
      ref="plotEl"
      class="cx-linechart-plot"
    >
      <svg
        ref="svgEl"
        class="cx-chart"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        width="100%"
        :height="layout.height"
        role="img"
        :aria-label="svgLabel"
        @pointermove="onPointer"
        @pointerdown="onPointer"
        @pointerleave="onLeave"
      >
        <g>
          <template
            v-for="t in geometry.yTicks"
            :key="t.value"
          >
            <line
              :class="t.value === geometry.yMin ? 'axis' : 'grid'"
              :x1="geometry.plot.x0"
              :x2="geometry.plot.x1"
              :y1="t.y"
              :y2="t.y"
            />
            <text
              :x="geometry.plot.x0 - 6"
              :y="t.y + 4"
              text-anchor="end"
            >{{ fmt(t.value) }}</text>
          </template>
          <text
            v-for="t in geometry.xTicks"
            :key="t.index"
            :x="t.x"
            :y="geometry.plot.y1 + 18"
            :text-anchor="t.index === 0 ? 'start' : t.index === x.length - 1 ? 'end' : 'middle'"
          >{{ xLabel(x[t.index] as number) }}</text>
        </g>
        <g class="markers">
          <template
            v-for="m in placedMarkers"
            :key="`${m.marker.x}-${m.marker.label}`"
          >
            <!-- Pointillés et texte : le repère se lit sans la couleur. La ligne monte jusqu'à son étiquette quand celle-ci est sur une rangée haute. -->
            <line
              class="marker"
              :x1="m.x"
              :x2="m.x"
              :y1="geometry.plot.y0 - m.row * MARKER_ROW - 2"
              :y2="geometry.plot.y1"
            />
            <text
              class="marker-label"
              :x="m.x"
              :y="geometry.plot.y0 - 5 - m.row * MARKER_ROW"
              :text-anchor="m.anchor"
            >{{ m.marker.label }}</text>
          </template>
        </g>
        <g
          v-for="(s, k) in shown"
          :key="s.id"
          :class="s.cls"
        >
          <path
            v-for="(d, j) in geometry.paths[k] ?? []"
            :key="j"
            class="series"
            :d="d"
          />
        </g>
        <text
          v-for="e in endLabels"
          :key="e.key"
          :x="geometry.plot.x1 + 8"
          :y="e.y + 4"
        ><title>{{ e.full }}</title>{{ e.text }}</text>
        <g v-if="activeIndex !== null && activeX !== null">
          <line
            class="reticle"
            :x1="activeX"
            :x2="activeX"
            :y1="geometry.plot.y0"
            :y2="geometry.plot.y1"
          />
          <template
            v-for="r in readings"
            :key="r.id"
          >
            <circle
              v-if="r.y !== null"
              class="dot"
              :class="r.cls"
              :cx="activeX"
              :cy="r.y"
              r="4.5"
            />
          </template>
        </g>
      </svg>
      <div
        v-if="activeIndex !== null"
        ref="tipEl"
        class="cx-tip-body is-open cx-linechart-tip"
        :style="tooltipStyle"
        aria-hidden="true"
      >
        <b>{{ activeLabel }}</b>
        <span
          v-for="r in readings"
          :key="r.id"
          class="cx-linechart-row"
          :class="r.cls"
        >
          <span class="cx-legend-key" />{{ r.label }} : <span class="cx-num">{{ fmt(r.value) }}</span>
          <span
            v-if="activeIndex !== 0 && r.base !== null"
            class="cx-muted"
          >(base {{ baseLabel }} : {{ fmt(r.base) }})</span>
        </span>
        <CxReliabilityBadge
          v-if="calculated"
          kind="calculated"
        />
      </div>
    </div>

    <div
      v-if="view === 'table'"
      class="cx-chart-table-wrap"
    >
      <table class="cx-chart-table">
        <caption class="cx-sr">
          {{ title }}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              {{ xName }}
            </th>
            <th
              v-for="s in shown"
              :key="s.id"
              scope="col"
              class="num"
            >
              {{ s.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(xv, i) in x"
            :key="xv"
            :class="{ 'is-active': i === activeIndex }"
          >
            <th scope="row">
              {{ xLabel(xv) }}
            </th>
            <td
              v-for="s in shown"
              :key="s.id"
              class="num"
            >
              <CxValue
                :value="s.values[i] ?? null"
                :format="digits > 0 ? 'decimal' : 'int'"
                :digits="digits"
                cell
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="showCursorControl && view === 'chart' && x.length > 1"
      class="cx-linechart-cursor"
    >
      <label :for="`${uid}-cursor`">{{ xName }} affiché</label>
      <CxRange
        :id="`${uid}-cursor`"
        v-model="sliderValue"
        :min="xRange.first"
        :max="xRange.last"
        :step="1"
        :value-text="xLabel(sliderValue)"
      />
    </div>
    <p
      class="cx-sr"
      aria-live="polite"
    >
      {{ liveText }}
    </p>
  </div>
</template>

<style>
.cx-linechart { display: grid; gap: var(--space-2); min-width: 0; }
.cx-linechart-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); }
.cx-linechart-plot { position: relative; }
.cx-chart { display: block; touch-action: pan-y; overflow: visible; }
.cx-chart text { fill: var(--ink-3); font: 400 12px var(--font-sans); font-variant-numeric: tabular-nums; }
.cx-chart .marker { stroke: var(--ink-2); stroke-width: 1; stroke-dasharray: 4 3; }
.cx-chart text.marker-label { fill: var(--ink-2); font-weight: 600; }
.cx-chart .grid { stroke: var(--line); stroke-width: 1; }
.cx-chart .axis { stroke: var(--line-strong); stroke-width: 1; }
.cx-chart .series { fill: none; stroke: var(--cat); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.cx-chart .reticle { stroke: var(--ink-3); stroke-width: 1; }
.cx-chart .dot { fill: var(--cat); stroke: var(--surface); stroke-width: 2; }
.cx-legend { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); color: var(--ink-2); font-size: 12px; line-height: 16px; }
.cx-legend b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.cx-legend-key { display: inline-block; width: 14px; height: 3px; margin-right: 6px; border-radius: 2px; background: var(--cat, var(--ink-3)); vertical-align: 3px; }
.cx-cat-1 { --cat: var(--cat-1); } .cx-cat-2 { --cat: var(--cat-2); } .cx-cat-3 { --cat: var(--cat-3); } .cx-cat-4 { --cat: var(--cat-4); }
.cx-linechart .cx-linechart-tip { top: 0; bottom: auto; right: auto; display: grid; gap: 2px; max-width: 100%; pointer-events: none; transform: none; }
.cx-linechart-row { display: block; font-variant-numeric: tabular-nums; }
.cx-linechart-cursor { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--space-3); color: var(--ink-3); font: 600 12px/16px var(--font-sans); }
.cx-chart-table-wrap { position: relative; max-height: 360px; overflow: auto; border: 1px solid var(--line-strong); border-radius: var(--radius-m); background: var(--surface); }
.cx-chart-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; line-height: 18px; font-variant-numeric: tabular-nums; }
.cx-chart-table th, .cx-chart-table td { padding: 6px 10px; border-bottom: 1px solid var(--line); text-align: left; }
.cx-chart-table thead th { position: sticky; top: 0; z-index: var(--z-sticky); background: var(--surface-raised); color: var(--ink-2); font: 600 12px/16px var(--font-sans); border-bottom-color: var(--line-strong); }
.cx-chart-table tbody th { color: var(--ink-2); font-weight: 600; }
.cx-chart-table .num { text-align: right; }
.cx-chart-table tr.is-active th, .cx-chart-table tr.is-active td { background: var(--gold-wash); }
</style>
