// Rendement des attributs (widget D23) : valeur par niveau d'attribut (PV, FP, endurance, charge), gain du point suivant, paliers où le gain
// baisse (publiés par le wiki, D39) et position du profil ; la détection des paliers dans les tables reste comme contrôle.
// Méthode : docs/design/ds/calculs.md, « Rendement des attributs » ; paliers : config/softCaps.ts ; fenêtre et seuils : config/weights.ts.

import type { AttributeRow, CalcTable, CalcTableKey, CalcTables } from '../data/types/tables.ts'
import { PUBLISHED_SOFT_CAPS } from './config/softCaps.ts'
import { ATTRIBUTE_YIELD } from './config/weights.ts'
import { attributeTableValue } from './derivedStats.ts'
import { makeCalc } from './types.ts'
import type { Attributes, Calc, DataRef, ExplanationComponent, ExplanationLimit } from './types.ts'

/** Statistique suivie. */
export type YieldStat = 'hp' | 'fp' | 'stamina' | 'equipLoad'

/** Point d'une courbe. */
export interface YieldPoint {
  readonly points: number
  readonly value: number
  /** Gain du point suivant (`valeur(p + 1) − valeur(p)`), `null` au dernier point. */
  readonly gain: number | null
}

/** Palier de rendement : à partir de ce niveau d'attribut, le gain moyen baisse nettement. */
export interface SoftCap {
  readonly points: number
  /** Gain moyen par point avant et après le palier, sur la fenêtre `ATTRIBUTE_YIELD.window` ; `null` si la table ne couvre pas la fenêtre. */
  readonly gainBefore: number | null
  readonly gainAfter: number | null
}

/** Courbe d'une statistique. */
export interface YieldCurve {
  readonly stat: YieldStat
  readonly attr: 'vig' | 'mnd' | 'end'
  readonly table: Exclude<CalcTableKey, 'levelCosts'>
  readonly points: readonly YieldPoint[]
  readonly softCaps: readonly SoftCap[]
  /** Position du profil : valeur et gain du point suivant ; `null` si l'attribut est hors de la table. */
  readonly position: { readonly points: number; readonly value: number | null; readonly nextGain: number | null }
}

/** Statistiques suivies et leur table (calculs.md, « Statistiques dérivées »). */
const CURVES: readonly { readonly stat: YieldStat; readonly attr: 'vig' | 'mnd' | 'end'; readonly table: Exclude<CalcTableKey, 'levelCosts'> }[] = [
  { stat: 'hp', attr: 'vig', table: 'hpByVigor' },
  { stat: 'fp', attr: 'mnd', table: 'fpByMind' },
  { stat: 'stamina', attr: 'end', table: 'staminaByEndurance' },
  { stat: 'equipLoad', attr: 'end', table: 'equipLoadByEndurance' },
]

/**
 * Nombre de décimales d'un nombre tel qu'écrit dans la table.
 * @param x Nombre.
 * @returns Le nombre de décimales.
 */
function decimals(x: number): number {
  const s = String(x)
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}

/**
 * Paliers de rendement détectés dans une table (calculs.md, « Rendement des attributs », contrôle) : points où le gain moyen des `window` points suivants tombe
 * à `dropRatio` fois celui des `window` points précédents ou moins, avec une baisse d'au moins `roundingSteps` pas d'arrondi divisés par
 * `window` ; dans une suite de points consécutifs, celui de plus forte baisse.
 * @param rows Lignes continues de la table (points croissants).
 * @param cfg Seuils de détection.
 * @returns Les paliers détectés, croissants ; depuis D39 ils ne sont plus affichés (contrôle des paliers publiés, dans les tests).
 */
export function softCaps(rows: readonly AttributeRow[], cfg: typeof ATTRIBUTE_YIELD = ATTRIBUTE_YIELD): SoftCap[] {
  const v = rows.map((r) => r.value)
  const W = cfg.window
  const step = 10 ** -Math.max(0, ...v.map(decimals))
  const minDrop = (cfg.roundingSteps * step) / W
  const found: { points: number; ratio: number; before: number; after: number }[] = []
  for (let i = W; i + W < v.length; i++) {
    const before = (v[i]! - v[i - W]!) / W
    const after = (v[i + W]! - v[i]!) / W
    if (before <= 0) continue
    const ratio = after / before
    if (ratio <= cfg.dropRatio && before - after >= minDrop) found.push({ points: rows[i]!.points, ratio, before, after })
  }
  const out: SoftCap[] = []
  let cluster: typeof found = []
  const flush = (): void => {
    if (cluster.length === 0) return
    const best = cluster.reduce((m, x) => (x.ratio < m.ratio ? x : m))
    const round = (x: number): number => Math.round(x * 100) / 100
    out.push({ points: best.points, gainBefore: round(best.before), gainAfter: round(best.after) })
    cluster = []
  }
  for (const f of found) {
    const last = cluster.at(-1)
    if (last !== undefined && f.points - last.points > 1) flush()
    cluster.push(f)
  }
  flush()
  return out
}

/**
 * Gains moyens autour des paliers publiés par le wiki (config/softCaps.ts) : `(valeur(p) − valeur(p − window)) / window` avant,
 * `(valeur(p + window) − valeur(p)) / window` après, arrondis à 2 décimales.
 * @param table Table d'attribut.
 * @param points Paliers publiés.
 * @param window Fenêtre des gains moyens.
 * @returns Les paliers avec leurs gains ; un gain vaut `null` si une ligne de la fenêtre manque (jamais 0).
 */
export function publishedSoftCaps(table: CalcTable<AttributeRow>, points: readonly number[], window: number = ATTRIBUTE_YIELD.window): SoftCap[] {
  const round = (x: number): number => Math.round(x * 100) / 100
  const at = (p: number): number | null => attributeTableValue(table, p)
  return points.map((p) => {
    const lo = at(p - window)
    const mid = at(p)
    const hi = at(p + window)
    return {
      points: p,
      gainBefore: lo === null || mid === null ? null : round((mid - lo) / window),
      gainAfter: hi === null || mid === null ? null : round((hi - mid) / window),
    }
  })
}

/**
 * Points d'une courbe et gain du point suivant, arrondi à la précision de la table (évite les restes de la virgule flottante).
 * @param table Table d'attribut.
 * @returns Les points.
 */
function curvePoints(table: CalcTable<AttributeRow>): YieldPoint[] {
  const scale = 10 ** Math.max(0, ...table.rows.map((r) => decimals(r.value)))
  return table.rows.map((r, i) => {
    const next = table.rows[i + 1]
    return { points: r.points, value: r.value, gain: next === undefined ? null : Math.round((next.value - r.value) * scale) / scale }
  })
}

/**
 * Rendement des attributs (calculs.md, « Rendement des attributs ») : pour Vigor (PV), Mind (FP) et Endurance (endurance, charge),
 * valeur par niveau 1–99 lue dans les tables, gain du point suivant, paliers publiés par le wiki (D39) et position du profil.
 * @param attrs Attributs du profil.
 * @param tables Tables de calcul.
 * @returns Les quatre courbes.
 */
export function attributeYield(attrs: Pick<Attributes, 'vig' | 'mnd' | 'end'>, tables: CalcTables): Calc<YieldCurve[]> {
  const components: ExplanationComponent[] = []
  const inputs: DataRef[] = []
  const limits: ExplanationLimit[] = [{ code: 'base-values-only' }, { code: 'soft-caps-published' }]
  const curves = CURVES.map((c): YieldCurve => {
    const table = tables[c.table]
    const points = curvePoints(table)
    const published = PUBLISHED_SOFT_CAPS[c.stat]
    const caps = publishedSoftCaps(table, published.points)
    const at = attrs[c.attr]
    const value = attributeTableValue(table, at)
    const nextGain = points.find((p) => p.points === at)?.gain ?? null
    if (value === null) limits.push({ code: 'table-row-missing', params: { table: c.table, points: at } })
    components.push({ code: 'yield-next-gain', value: nextGain, params: { stat: c.stat, points: at } })
    for (const cap of caps) {
      components.push({ code: 'yield-soft-cap', value: cap.points, params: { stat: c.stat, before: cap.gainBefore ?? '', after: cap.gainAfter ?? '' } })
    }
    inputs.push({ file: 'tables', entry: c.table, field: 'rows', value: table.source.title, reliability: 'wiki' })
    inputs.push({ file: 'config', entry: 'softCaps', field: `PUBLISHED_SOFT_CAPS.${c.stat}`, value: published.source, reliability: 'wiki' })
    return { ...c, points, softCaps: caps, position: { points: at, value, nextGain } }
  })
  return makeCalc('attribute-yield', curves, { components, inputs, limits })
}
