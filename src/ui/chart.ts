// Géométrie de `CxLineChart` : graduations rondes, échelles, tracés par segments (un `null` interrompt la ligne), étiquettes de bout de ligne sans chevauchement.
// Logique pure, sans Vue ni DOM, pour être testée ; aucune méthode de calculs.md (mise à l'échelle d'affichage seulement, aucune valeur de jeu produite).

/** Marges et taille de la zone de dessin, en unités du `viewBox` SVG. */
export interface ChartLayout {
  readonly width: number
  readonly height: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

/** Repère vertical permanent d'un graphique (palier, niveau du profil) : abscisse et libellé, lisibles sans couleur. */
export interface ChartMarker {
  /** Abscisse du repère, dans l'unité de `x` du graphique ; hors de l'étendue des abscisses, il n'est pas dessiné. */
  readonly x: number
  /** Libellé court écrit au-dessus de la ligne (« Palier 40 »). */
  readonly label: string
}

/** Repère placé : position, ancrage du texte et rangée de l'étiquette (0 = la plus proche du tracé). */
export interface PlacedMarker {
  readonly marker: ChartMarker
  /** Position horizontale de la ligne, dans le repère du `viewBox`. */
  readonly x: number
  /** Ancrage du texte : centré sur la ligne, ou calé pour ne pas sortir du `viewBox`. */
  readonly anchor: 'start' | 'middle' | 'end'
  /** Rangée de l'étiquette : les étiquettes qui se chevaucheraient montent d'une rangée. */
  readonly row: number
}

/** Graduation de l'axe vertical. */
export interface YTick {
  readonly value: number
  readonly y: number
}

/** Graduation de l'axe horizontal : indice dans les abscisses et position. */
export interface XTick {
  readonly index: number
  readonly x: number
}

/** Étiquette de bout de ligne d'une série : indice de la série et ordonnée où l'écrire. */
export interface EndLabel {
  readonly seriesIndex: number
  readonly y: number
}

/** Géométrie complète d'un graphique, prête à être rendue. */
export interface ChartGeometry {
  /** Rectangle de tracé. */
  readonly plot: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }
  /** Bornes de l'axe vertical après arrondi aux graduations. */
  readonly yMin: number
  readonly yMax: number
  readonly yTicks: readonly YTick[]
  readonly xTicks: readonly XTick[]
  /** Position horizontale de chaque abscisse. */
  readonly xs: readonly number[]
  /** Données du tracé de chaque série : un chemin par plage continue de valeurs. */
  readonly paths: readonly (readonly string[])[]
  /** Étiquettes de bout de ligne, déjà espacées ; une série sans aucune valeur n'en a pas. */
  readonly endLabels: readonly EndLabel[]
  /** Ordonnée de la valeur donnée. */
  readonly yAt: (value: number) => number
  /** Position horizontale d'une abscisse quelconque (interpolée linéairement entre la première et la dernière). */
  readonly xAt: (value: number) => number
}

/**
 * Arrondit un nombre positif à 1, 2, 5 ou 10 fois une puissance de dix (algorithme des graduations rondes de Heckbert).
 * @param range Nombre à arrondir, strictement positif.
 * @param round Vrai pour l'arrondi au plus proche, faux pour l'arrondi par excès.
 * @returns Le nombre « rond » correspondant.
 */
function niceNumber(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let nice: number
  if (round) nice = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
  else nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * 10 ** exponent
}

/**
 * Graduations rondes couvrant un intervalle.
 * @param min Plus petite valeur à couvrir.
 * @param max Plus grande valeur à couvrir.
 * @param target Nombre de graduations visé (4 par défaut) ; le résultat en compte quelques-unes de plus ou de moins.
 * @returns Les bornes arrondies et la liste croissante des graduations ; pour `min === max`, un intervalle de largeur 1.
 */
export function niceTicks(min: number, max: number, target = 4): { min: number; max: number; ticks: number[] } {
  let lo = min
  let hi = max
  if (!(hi > lo)) {
    hi = lo + 1
  }
  const step = niceNumber((hi - lo) / Math.max(1, target - 1), true)
  const niceMin = Math.floor(lo / step) * step
  const niceMax = Math.ceil(hi / step) * step
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(Number(v.toFixed(decimals)))
  lo = ticks[0] ?? niceMin
  hi = ticks[ticks.length - 1] ?? niceMax
  return { min: lo, max: hi, ticks }
}

/**
 * Espace des étiquettes d'au moins `minGap` unités sans les sortir de `[lower, upper]` : les étiquettes proches se repoussent mutuellement.
 * @param ys Ordonnées souhaitées, dans un ordre quelconque.
 * @param minGap Écart minimal entre deux étiquettes.
 * @param lower Borne haute de la zone (ordonnée la plus petite permise).
 * @param upper Borne basse de la zone (ordonnée la plus grande permise).
 * @returns Les ordonnées ajustées, dans l'ordre d'entrée.
 */
export function spreadLabels(ys: readonly number[], minGap: number, lower: number, upper: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y || a.i - b.i)
  const placed = order.map((o) => o.y)
  for (let k = 0; k < placed.length; k++) {
    const prev = placed[k - 1]
    const cur = placed[k] as number
    placed[k] = Math.max(cur, lower, prev === undefined ? lower : prev + minGap)
  }
  // Si le bas déborde, on remonte la pile en gardant les écarts.
  for (let k = placed.length - 1; k >= 0; k--) {
    const next = placed[k + 1]
    const cur = placed[k] as number
    placed[k] = Math.min(cur, upper, next === undefined ? upper : next - minGap)
  }
  const out: number[] = new Array<number>(ys.length).fill(0)
  order.forEach((o, k) => {
    out[o.i] = placed[k] as number
  })
  return out
}

/**
 * Indice de l'abscisse la plus proche d'une position horizontale (survol, curseur).
 * @param x Position dans le repère du `viewBox`.
 * @param positions Positions des abscisses, croissantes.
 * @returns L'indice le plus proche, ou -1 s'il n'y a aucune abscisse.
 */
export function nearestIndex(x: number, positions: readonly number[]): number {
  let best = -1
  let bestDistance = Infinity
  positions.forEach((p, i) => {
    const d = Math.abs(p - x)
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  })
  return best
}

/**
 * Indices des abscisses à graduer : au plus `maxLabels`, toujours la première et la dernière.
 * @param count Nombre d'abscisses.
 * @param maxLabels Nombre maximal de graduations.
 * @returns Les indices croissants.
 */
export function xTickIndices(count: number, maxLabels = 7): number[] {
  if (count <= 0) return []
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i)
  const step = Math.ceil((count - 1) / (maxLabels - 1))
  const out: number[] = []
  for (let i = 0; i < count - 1; i += step) out.push(i)
  // La dernière graduation prend la place d'une avant-dernière trop proche.
  const last = count - 1
  const prev = out[out.length - 1]
  if (prev !== undefined && last - prev < step / 2) out.pop()
  out.push(last)
  return out
}

/**
 * Place les repères verticaux d'un graphique : position, ancrage de l'étiquette et rangée. Deux étiquettes qui se chevaucheraient ne sont jamais
 * superposées : la seconde monte d'une rangée (au plus `maxRows` ; au-delà, elle reste sur la dernière). Un repère hors de `[first, last]` est écarté.
 * @param markers Repères demandés, dans un ordre quelconque.
 * @param xAt Position horizontale d'une abscisse (`ChartGeometry.xAt`).
 * @param range Première et dernière abscisse du graphique.
 * @param width Largeur du `viewBox` : l'étiquette n'en sort pas.
 * @param charWidth Largeur estimée d'un caractère de l'étiquette, dans le repère du `viewBox`.
 * @param maxRows Nombre maximal de rangées d'étiquettes (3 par défaut).
 * @returns Les repères placés, par abscisse croissante.
 */
export function placeMarkers(
  markers: readonly ChartMarker[],
  xAt: (value: number) => number,
  range: { readonly first: number; readonly last: number },
  width: number,
  charWidth = 6.6,
  maxRows = 3,
): PlacedMarker[] {
  const GAP = 6
  const rowEnds: number[] = []
  return markers
    .filter((m) => Number.isFinite(m.x) && m.x >= range.first && m.x <= range.last)
    .sort((a, b) => a.x - b.x)
    .map((marker) => {
      const x = xAt(marker.x)
      const w = marker.label.length * charWidth
      const anchor = x - w / 2 < 0 ? 'start' : x + w / 2 > width ? 'end' : 'middle'
      const start = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
      let row = rowEnds.findIndex((end) => start >= end + GAP)
      if (row < 0) row = rowEnds.length < maxRows ? rowEnds.length : maxRows - 1
      rowEnds[row] = start + w
      return { marker, x, anchor, row } satisfies PlacedMarker
    })
}

/**
 * Calcule la géométrie d'un graphique en courbes.
 * @param xValues Abscisses numériques (niveaux d'amélioration), croissantes ; l'échelle est proportionnelle aux valeurs.
 * @param series Valeurs de chaque série, une par abscisse ; `null` interrompt la ligne (jamais interpolé, jamais 0).
 * @param layout Taille et marges.
 * @param options `zeroBased` (vrai par défaut) ancre l'axe vertical à 0 quand toutes les valeurs sont positives ; `labelGap` écart minimal des étiquettes de bout de ligne.
 * @param options.zeroBased Ancre l'axe vertical à 0.
 * @param options.labelGap Écart minimal entre deux étiquettes de bout de ligne.
 * @param options.maxXLabels Nombre maximal de graduations de l'axe horizontal (7 par défaut) ; moins sur un graphique étroit.
 * @returns La géométrie : échelles, graduations, chemins par plage continue et étiquettes de bout de ligne.
 */
export function buildGeometry(
  xValues: readonly number[],
  series: readonly (readonly (number | null)[])[],
  layout: ChartLayout,
  options: { readonly zeroBased?: boolean; readonly labelGap?: number; readonly maxXLabels?: number } = {},
): ChartGeometry {
  const x0 = layout.left
  const x1 = layout.width - layout.right
  const y0 = layout.top
  const y1 = layout.height - layout.bottom
  const all = series.flatMap((s) => s.filter((v): v is number => v !== null && Number.isFinite(v)))
  const dataMin = all.length > 0 ? Math.min(...all) : 0
  const dataMax = all.length > 0 ? Math.max(...all) : 1
  const low = options.zeroBased === false ? dataMin : Math.min(0, dataMin)
  const nice = niceTicks(low, dataMax)
  const span = nice.max - nice.min || 1
  const yAt = (value: number): number => y1 - ((value - nice.min) / span) * (y1 - y0)

  // Géométrie : sans abscisse, la plage est réduite au point 0 et le tracé reste vide.
  const first = xValues[0] ?? 0
  const last = xValues[xValues.length - 1] ?? first
  const xSpan = last - first
  const xAt = (v: number): number => (xSpan > 0 ? x0 + ((v - first) / xSpan) * (x1 - x0) : (x0 + x1) / 2)
  const xs = xValues.map(xAt)

  const paths = series.map((values) => {
    const runs: string[] = []
    let current = ''
    let length = 0
    const close = (): void => {
      if (current) runs.push(length === 1 ? `${current} l0 0` : current)
      current = ''
      length = 0
    }
    values.forEach((value, i) => {
      const x = xs[i]
      if (value === null || !Number.isFinite(value) || x === undefined) {
        close()
        return
      }
      current += `${current ? ' L' : 'M'}${round(x)} ${round(yAt(value))}`
      length++
    })
    close()
    return runs
  })

  const ends = series.flatMap((values, seriesIndex) => {
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i]
      if (v !== null && v !== undefined && Number.isFinite(v)) return [{ seriesIndex, y: yAt(v) }]
    }
    return []
  })
  const spread = spreadLabels(ends.map((e) => e.y), options.labelGap ?? 13, y0, y1)
  const endLabels = ends.map((e, k) => ({ seriesIndex: e.seriesIndex, y: spread[k] as number }))

  return {
    plot: { x0, x1, y0, y1 },
    yMin: nice.min,
    yMax: nice.max,
    yTicks: nice.ticks.map((value) => ({ value, y: yAt(value) })),
    xTicks: xTickIndices(xValues.length, options.maxXLabels).map((index) => ({ index, x: xs[index] as number })),
    xs,
    paths,
    endLabels,
    yAt,
    xAt,
  }
}

/** Arrondit à deux décimales pour garder des chemins SVG courts. */
function round(n: number): number {
  return Math.round(n * 100) / 100
}
