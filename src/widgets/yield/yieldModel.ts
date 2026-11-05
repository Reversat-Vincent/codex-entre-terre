// Modèle d'affichage du widget « Rendement des attributs » : met en forme les courbes du store `analysis.attributeYield` (libellés, paliers, phrase, lignes du tableau).
// Aucun calcul de jeu : valeurs, gains et gains moyens autour des paliers viennent du moteur (calculs.md, « Rendement des attributs ») ; ici, seulement du texte et du tri.

import { PUBLISHED_SOFT_CAPS } from '../../engine/config/softCaps.ts'
import { ATTRIBUTE_YIELD } from '../../engine/config/weights.ts'
import type { SoftCap, YieldCurve, YieldStat } from '../../engine/attributeYield.ts'
import { formatDecimal } from '../../ui/format.ts'
import { ATTRIBUTE_LABELS } from '../../ui/labels.ts'

/** Libellés et précision d'affichage d'une statistique suivie. */
export interface StatMeta {
  readonly stat: YieldStat
  /** Libellé court du segment et de la légende (« PV »). */
  readonly label: string
  /** Nom complet pour les titres et les lecteurs d'écran. */
  readonly name: string
  /** Fin de phrase pour un gain (« PV par point »). */
  readonly perPoint: string
  /** Décimales des valeurs de la table (la charge en a une, le reste est entier). */
  readonly digits: number
}

/** Statistiques dans l'ordre d'affichage, avec leurs libellés français. */
export const STAT_META: readonly StatMeta[] = [
  { stat: 'hp', label: 'PV', name: 'Points de vie', perPoint: 'PV par point', digits: 0 },
  { stat: 'fp', label: 'FP', name: 'Points de concentration', perPoint: 'FP par point', digits: 0 },
  { stat: 'stamina', label: 'Endurance', name: "Jauge d'endurance", perPoint: "d'endurance par point", digits: 0 },
  { stat: 'equipLoad', label: 'Charge', name: "Charge d'équipement", perPoint: "de charge par point", digits: 1 },
]

/**
 * Libellés d'une statistique.
 * @param stat Statistique du moteur.
 * @returns Ses libellés.
 */
export function metaOf(stat: YieldStat): StatMeta {
  return STAT_META.find((m) => m.stat === stat) ?? STAT_META[0]!
}

/** Palier publié, prêt à afficher. */
export interface PalierView {
  /** Niveau d'attribut du palier. */
  readonly points: number
  /** Gain moyen par point avant et après, mis en forme ; `null` si le moteur ne le donne pas (jamais 0). */
  readonly before: string | null
  readonly after: string | null
  /** Le profil a atteint ou dépassé ce palier. */
  readonly reached: boolean
}

/** Ligne du tableau des gains. */
export interface YieldRow {
  readonly points: number
  readonly value: number
  /** Gain du point suivant ; `null` au dernier niveau. */
  readonly gain: number | null
  /** Le niveau est un palier publié. */
  readonly isCap: boolean
  /** Le niveau est celui du profil. */
  readonly isProfile: boolean
}

/** Citation du wiki qui fonde les paliers d'une statistique. */
export interface CapSource {
  readonly url: string
  /** Nom de la page du wiki (dernier segment de l'adresse). */
  readonly page: string
  /** Phrase publiée, en anglais, telle quelle. */
  readonly quote: string
}

/** Vue d'une statistique : tout ce que le panneau affiche, sans rien recalculer. */
export interface CurveView {
  readonly meta: StatMeta
  /** Nom de l'attribut qui commande la statistique (« Vigor »). */
  readonly attrName: string
  /** Abscisses de la courbe : niveaux 1 à 99. */
  readonly x: readonly number[]
  /** Valeur par niveau, une par abscisse. */
  readonly values: readonly number[]
  readonly profilePoints: number
  readonly profileValue: number | null
  readonly nextGain: number | null
  readonly paliers: readonly PalierView[]
  /** Premier palier au-delà du profil ; `null` s'ils sont tous atteints. */
  readonly next: PalierView | null
  /** Nombre de points à ajouter pour atteindre `next` (différence de niveaux d'attribut). */
  readonly pointsToNext: number | null
  /** Phrase courte qui dit où le gain baisse. */
  readonly sentence: string
  readonly source: CapSource
  readonly rows: readonly YieldRow[]
}

/**
 * Gain moyen formaté : deux décimales au plus, `null` conservé.
 * @param value Gain moyen du moteur ou `null`.
 * @returns Le texte ou `null`.
 */
function gainText(value: number | null): string | null {
  return value === null ? null : formatDecimal(value, 2)
}

/**
 * Palier mis en forme.
 * @param cap Palier du moteur.
 * @param profile Niveau d'attribut du profil.
 * @returns La vue du palier.
 */
function palierView(cap: SoftCap, profile: number): PalierView {
  return { points: cap.points, before: gainText(cap.gainBefore), after: gainText(cap.gainAfter), reached: profile >= cap.points }
}

/**
 * Phrase qui dit où le gain baisse, sans recopier de guide : le palier suivant et les gains moyens avant et après (fenêtre `ATTRIBUTE_YIELD.window`).
 * @param meta Libellés de la statistique.
 * @param attrName Nom de l'attribut.
 * @param paliers Paliers publiés.
 * @param next Palier suivant, ou `null`.
 * @returns Le texte.
 */
function sentenceOf(meta: StatMeta, attrName: string, paliers: readonly PalierView[], next: PalierView | null): string {
  if (paliers.length === 0) return `Le wiki ne publie aucun palier pour ${meta.label}.`
  if (next === null) return `Les paliers publiés pour ${meta.label} sont atteints : au-delà, chaque point de ${attrName} rapporte moins.`
  const gains =
    next.before !== null && next.after !== null
      ? ` : le gain moyen passe de ${next.before} à ${next.after} ${meta.perPoint} (moyenne sur ${ATTRIBUTE_YIELD.window} points)`
      : ''
  return `Le gain baisse à partir de ${next.points} en ${attrName}${gains}.`
}

/**
 * Adresse du wiki convertie en nom de page.
 * @param url Adresse de la page.
 * @returns Le dernier segment, décodé.
 */
function pageName(url: string): string {
  const last = url.split('/').filter(Boolean).pop() ?? url
  try {
    return decodeURIComponent(last).replaceAll('_', ' ')
  } catch {
    return last
  }
}

/**
 * Met en forme une courbe du store pour le panneau.
 * @param curve Courbe de `analysis.attributeYield`.
 * @returns La vue d'affichage.
 */
export function curveView(curve: YieldCurve): CurveView {
  const meta = metaOf(curve.stat)
  const profile = curve.position.points
  const paliers = curve.softCaps.map((cap) => palierView(cap, profile))
  const next = paliers.find((p) => !p.reached) ?? null
  const published = PUBLISHED_SOFT_CAPS[curve.stat]
  const attrName = ATTRIBUTE_LABELS[curve.attr].name
  return {
    meta,
    attrName,
    x: curve.points.map((p) => p.points),
    values: curve.points.map((p) => p.value),
    profilePoints: profile,
    profileValue: curve.position.value,
    nextGain: curve.position.nextGain,
    paliers,
    next,
    pointsToNext: next === null ? null : next.points - profile,
    sentence: sentenceOf(meta, attrName, paliers, next),
    source: { url: published.source, page: pageName(published.source), quote: published.quote },
    rows: curve.points.map((p) => ({
      points: p.points,
      value: p.value,
      gain: p.gain,
      isCap: published.points.includes(p.points),
      isProfile: p.points === profile,
    })),
  }
}
