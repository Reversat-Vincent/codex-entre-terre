// Textes français des explications de calcul : un texte pour chaque code de composante, de limite et de libellé du moteur (`src/engine/codes.ts`),
// avec interpolation de leurs paramètres, et un titre et un résumé pour chaque méthode de `docs/design/ds/calculs.md`.
// Le moteur ne renvoie que des codes (docs/architecture.md § 5.1) ; `CxWhyPanel` et les widgets passent par ici pour afficher du texte.
// Les noms propres (objets, boss, régions, champs de données) restent en anglais, comme dans `data/` ; tout le reste est en français, au vouvoiement.

import { LABEL_CODES } from '../engine/codes.ts'
import type { ComponentCode, LabelCode, LimitCode } from '../engine/codes.ts'
import { UPGRADE } from '../engine/config/upgrade.ts'
import { METHODS } from '../engine/methods.ts'
import type { CodeParams, DataValue, ExplanationComponent, MethodId } from '../engine/types.ts'
import { formatDecimal, formatInt, formatPercent, formatSigned } from './format.ts'
import {
  ATTRIBUTE_LABELS,
  DAMAGE_LABELS,
  DLC_ZONE_LABELS,
  LOAD_LABELS,
  STAGE_LABELS,
  STATUS_BY_DATA_KEY,
  STATUS_LABELS,
} from './labels.ts'
import type { DamageLabelKey, StatusKey } from './labels.ts'

// ─── Paramètres ────────────────────────────────────────────────────────────────

/** Noms de paramètres que le moteur passe à ses codes (`CodeParams`) ; chacun a sa mise en forme. */
export type ParamName =
  | 'attr' | 'attrs' | 'type' | 'stage' | 'player' | 'node' | 'region' | 'zone' | 'path' | 'basis' | 'level' | 'from' | 'to' | 'max' | 'cost'
  | 'points' | 'table' | 'stat' | 'before' | 'after' | 'item' | 'tier' | 'material' | 'category' | 'weight' | 'budget' | 'field' | 'status'
  | 'encounter' | 'load' | 'row' | 'confidence' | 'actual' | 'required' | 'effective' | 'place'

/** Lecteur de paramètres : rend le paramètre mis en forme pour la phrase, ou une chaîne vide s'il manque. */
type ParamReader = (name: ParamName) => string

/** Paramètres numériques affichés avec décimales (poids, budget, gains moyens) ; les autres nombres sont des entiers. */
const DECIMAL_PARAMS: ReadonlySet<string> = new Set<ParamName>(['weight', 'budget', 'before', 'after'])

/** Noms des statistiques du rendement des attributs (`YieldStat`). */
const STAT_LABELS: Readonly<Record<string, string>> = {
  hp: 'PV',
  fp: 'FP',
  stamina: "endurance (jauge d'endurance)",
  equipLoad: "charge d'équipement",
}

/** Tables de calcul lues par les statistiques dérivées (`CalcTableKey`), nommées pour le lecteur. */
const TABLE_LABELS: Readonly<Record<string, string>> = {
  hpByVigor: 'des PV selon Vigor',
  fpByMind: 'des FP selon Mind',
  staminaByEndurance: "de l'endurance selon Endurance",
  equipLoadByEndurance: 'de la charge selon Endurance',
  levelCosts: 'des coûts en runes',
}

/** Provenance du palier de zone d'une rencontre (`TierBasis`). */
const BASIS_LABELS: Readonly<Record<string, string>> = {
  wiki: 'fait du wiki',
  deduced: 'déduction',
  choice: 'plus bas palier retenu parmi plusieurs',
  parent: 'région parente',
}

/** Champs d'arme lus par le score, nommés pour le lecteur (le nom du champ de données reste en anglais entre parenthèses). */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  sorcery_scaling: 'puissance de sort (sorcery_scaling)',
  incantation_scaling: "puissance d'incantation (incantation_scaling)",
  attack_power: 'attaque de base totale (attack_power)',
}

/** Matériaux d'amélioration, par type de pierres. */
const MATERIAL_LABELS: Readonly<Record<string, string>> = {
  somber: 'pierres sombres',
  normal: 'pierres normales',
  'Somber Smithing Stones': 'pierres sombres (Somber Smithing Stones)',
  'Smithing Stones': 'pierres normales (Smithing Stones)',
}

/** Confiance d'une estimation, en toutes lettres. */
const CONFIDENCE_LABELS: Readonly<Record<string, string>> = { high: 'haute', medium: 'moyenne' }

/**
 * Met un identifiant de données (slug) sous une forme lisible : tirets en espaces, majuscule à chaque mot.
 * @param slug Identifiant en minuscules et tirets (`draconic-tree-sentinel`).
 * @returns Le texte (`Draconic Tree Sentinel`) ; les noms exacts viennent de `data/`, ceci n'est qu'un repli lisible.
 */
function humanize(slug: string): string {
  return slug
    .split('-')
    .filter((w) => w !== '')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Noms exacts des pierres et Bell Bearings de la configuration, par référence `item:<id>`. */
const ITEM_NAMES: ReadonlyMap<string, string> = new Map([
  ...Object.values(UPGRADE.materials).flatMap((m) => [...m.stones, m.ancient].map((s): [string, string] => [s.item, s.name])),
  ...UPGRADE.bellBearings.map((b): [string, string] => [b.item, b.name]),
])

/**
 * Met en forme un paramètre selon son nom : attribut en abréviation, type de dégâts, étape, zone et statut en français, nombres à la française.
 * @param name Nom du paramètre.
 * @param raw Valeur reçue du moteur.
 * @returns Le texte à insérer dans la phrase ; une valeur inconnue est reprise telle quelle, jamais perdue.
 */
function formatParam(name: ParamName, raw: string | number): string {
  if (typeof raw === 'number') return DECIMAL_PARAMS.has(name) ? formatDecimal(raw, 1) : formatInt(raw)
  if (raw === '') return ''
  switch (name) {
    case 'attr':
      return ATTRIBUTE_LABELS[raw as keyof typeof ATTRIBUTE_LABELS]?.abbr ?? raw
    case 'attrs':
      return raw
        .split(',')
        .map((a) => ATTRIBUTE_LABELS[a as keyof typeof ATTRIBUTE_LABELS]?.abbr ?? a)
        .join(', ')
    case 'type':
      return DAMAGE_LABELS[raw as DamageLabelKey]?.toLowerCase() ?? raw
    case 'stage':
    case 'player':
      return STAGE_LABELS[raw as keyof typeof STAGE_LABELS] ?? raw
    case 'zone':
      return DLC_ZONE_LABELS[raw as keyof typeof DLC_ZONE_LABELS] ?? raw
    case 'status': {
      const style = STATUS_BY_DATA_KEY[raw as StatusKey]
      return style === undefined ? raw : STATUS_LABELS[style].toLowerCase()
    }
    case 'load':
      return LOAD_LABELS[raw as keyof typeof LOAD_LABELS]?.toLowerCase() ?? raw
    case 'stat':
      return STAT_LABELS[raw] ?? raw
    case 'table':
      return TABLE_LABELS[raw] ?? raw
    case 'basis':
      return BASIS_LABELS[raw] ?? raw
    case 'field':
      return FIELD_LABELS[raw] ?? raw
    case 'material':
      return MATERIAL_LABELS[raw] ?? raw
    case 'confidence':
      return CONFIDENCE_LABELS[raw] ?? raw
    case 'item':
      return ITEM_NAMES.get(raw) ?? humanize(raw.replace(/^item:/, ''))
    case 'node':
      return humanize(raw)
    case 'encounter':
      // Clé `bossId/encounterId` : le nom de la rencontre est son second segment.
      return humanize(raw.split('/').pop() ?? raw)
    case 'row':
      return (LABEL_CODES as readonly string[]).includes(raw) ? labelText(raw as LabelCode) : raw
    default:
      return raw
  }
}

/**
 * Construit le lecteur des paramètres d'un code.
 * @param params Paramètres reçus du moteur, ou `undefined`.
 * @returns Une fonction qui rend chaque paramètre mis en forme (chaîne vide s'il manque).
 */
function reader(params: CodeParams | undefined): ParamReader {
  return (name) => {
    const raw = params?.[name]
    return raw === undefined ? '' : formatParam(name, raw)
  }
}

// ─── Composantes ───────────────────────────────────────────────────────────────

/**
 * Mise en forme de la valeur d'une composante : `int` entier, `decimal` une à deux décimales, `signed` entier signé (bonus et pénalités),
 * `fraction` fraction affichée en pourcentage (0,35 → 35 %), `tier` palier de zone (T12), `hidden` pas de valeur (le texte dit tout).
 */
export type ValueFormat = 'int' | 'decimal' | 'signed' | 'fraction' | 'tier' | 'hidden'

/** Texte d'une composante : sa phrase (avec paramètres) et la mise en forme de sa valeur. */
interface ComponentSpec {
  readonly label: (p: ParamReader) => string
  readonly format?: ValueFormat
}

/** Entrée de composante d'un nombre entier : raccourci. */
const c = (label: (p: ParamReader) => string, format: ValueFormat = 'int'): ComponentSpec => ({ label, format })

/**
 * Texte et mise en forme de chaque composante, regroupés comme dans `codes.ts` ; décrit les composantes de `calculs.md`.
 * Un `Record` complet : ajouter un code au moteur sans son texte ne compile plus.
 */
export const COMPONENT_SPECS: Readonly<Record<ComponentCode, ComponentSpec>> = {
  // Niveau d'un jeu d'attributs (Origine optimale).
  'attribute-sum': c(() => 'Somme des attributs'),
  'level-offset': c(() => 'Constante retirée de la somme pour obtenir le niveau'),
  level: c(() => 'Niveau'),
  // Coût en runes d'un niveau.
  'rune-cost': c((p) => `Runes pour passer du niveau ${p('level')} au suivant`),
  'runes-total': c(() => 'Total de runes'),
  'level-from': c(() => 'Niveau de départ'),
  'level-to': c(() => 'Niveau visé'),
  // Statistiques dérivées.
  hp: c((p) => `PV à ${p('attr')} ${p('points')}`),
  fp: c((p) => `FP à ${p('attr')} ${p('points')}`),
  stamina: c((p) => `Endurance (jauge) à ${p('attr')} ${p('points')}`),
  'equip-load': c((p) => `Charge d'équipement à ${p('attr')} ${p('points')}`, 'decimal'),
  // Prérequis comparés au profil.
  requirement: c((p) => `Écart ${p('attr')} (demandé ${p('required')}, profil ${p('actual')}, effectif ${p('effective')})`),
  'effective-strength': c((p) => `Force effective à deux mains (Force réelle ${p('actual')})`),
  // Plan d'amélioration.
  stones: c((p) => `${p('item') || 'Pierres'}${p('tier') === '' ? '' : ` (palier ${p('tier')})`}`),
  'ancient-stones': c((p) => p('item') || 'Pierre ancienne'),
  'total-stones': c(() => 'Total de pierres, pierre ancienne exclue'),
  'bell-bearing': c((p) => `${p('item')} : achat de pierres en quantité illimitée`, 'hidden'),
  // Origine optimale : classement.
  'final-level': c(() => 'Niveau final avec cette origine'),
  'wasted-points': c(() => 'Points gaspillés'),
  'early-fit': c(() => 'Adéquation précoce'),
  'starting-weapon-bonus': c(() => "Bonus d'une arme de départ recommandée", 'signed'),
  rank: c(() => 'Rang'),
  // Puissance d'attaque calculée.
  base: c((p) => `Base ${p('type')}`),
  coef: c((p) => `Coefficient de ${p('attr')} pour ${p('type')}`, 'decimal'),
  curve: c((p) => `Courbe de ${p('attr')} à ${p('points')} points (en %)`, 'decimal'),
  'scaling-bonus': c((p) => `Bonus de scaling ${p('type')}`, 'fraction'),
  'requirement-penalty': c((p) => `Facteur appliqué à ${p('type')} (prérequis non atteint)`, 'decimal'),
  'attack-type': c((p) => `Puissance ${p('type')}`),
  'attack-total': c(() => "Puissance d'attaque totale"),
  // Préparation et jauge.
  'player-level': c(() => 'Votre niveau'),
  'recommended-level': c(() => 'Niveau recommandé'),
  'limit-margin': c(() => 'Marge de la zone Limite (niveaux sous le recommandé)'),
  'gauge-max': c(() => "Maximum de l'échelle de la jauge"),
  // Étape de progression.
  'stage-index': c(
    (p) =>
      `Étape retenue : ${p('stage')}${p('region') === '' ? '' : ` (région ${p('region')})`}${p('node') === '' ? '' : ` (prochain boss : ${p('node')})`}`,
    'hidden',
  ),
  // Niveau recommandé d'un boss.
  'zone-tier': c((p) => `Palier de zone${p('region') === '' ? '' : ` (${p('region')})`}, ${p('basis')}`, 'tier'),
  m1: c(() => 'M1 : niveau du palier de zone'),
  runes: c(() => 'Runes de la rencontre'),
  'rune-anchor': c((p) => `Calage de M2 : ce nombre de runes correspond au niveau ${p('level')} (coût de ${p('cost')} runes)`),
  m2: c(() => 'M2 : niveau tiré des runes'),
  m3: c(() => 'M3 : moyenne de M1 et M2, niveau recommandé'),
  'dlc-entry-source': c((p) => `Niveau recommandé de ${p('encounter')}, qui ouvre le DLC`),
  'dlc-entry-level': c(() => "Niveau d'entrée du DLC (le plus haut des deux)"),
  'blessing-fragments': c(
    (p) => `Fragments de l'Arbre-Ombre recommandés (${p('zone')} : ${p('path')} fragments sur le chemin)`,
  ),
  'blessing-level': c(() => "Niveau de bénédiction de l'Arbre-Ombre recommandé"),
  'blessing-max-level': c(() => 'Niveau de bénédiction avec tous les fragments du chemin'),
  // Build cible.
  'target-level': c(() => 'Niveau cible'),
  'target-attribute': c((p) => `${p('attr')} cible`),
  // Budget de charge.
  'load-ratio': c((p) => `Part de la charge maximale pour une charge ${p('load')}`, 'decimal'),
  'weapon-share': c(() => "Part de la charge réservée à l'arme", 'decimal'),
  'load-budget': c(() => "Budget de poids d'une arme", 'decimal'),
  // Score de recommandation.
  'score-fit': c(() => 'Adéquation au build'),
  'scaling-mean': c(() => 'Moyenne pondérée des lettres de scaling', 'decimal'),
  'off-build-penalty': c(() => "Pénalité des prérequis d'attributs hors build", 'signed'),
  'status-bonus': c((p) => `Bonus du statut privilégié${p('status') === '' ? '' : ` (${p('status')})`}`, 'signed'),
  'class-bonus': c((p) => `Bonus ou malus de classe${p('category') === '' ? '' : ` (${p('category')})`}`, 'signed'),
  'score-power': c(() => 'Puissance et scaling'),
  'base-power': c((p) => `Puissance de base à +0, ${p('field')}`),
  'scaling-sum': c(() => 'Somme des lettres de scaling', 'decimal'),
  'overweight-penalty': c((p) => `Pénalité de poids (arme ${p('weight')}, budget ${p('budget') === '' ? 'inconnu' : p('budget')})`, 'signed'),
  'score-access': c(() => 'Accessibilité à votre étape'),
  'stages-ahead': c((p) => `Étapes d'avance sur la vôtre (${p('stage')} contre ${p('player')})`),
  'missing-points': c(() => "Points d'attribut manquants"),
  'remembrance-penalty': c(() => 'Pénalité des échanges de Remembrance', 'signed'),
  'invader-penalty': c(() => "Pénalité d'un butin de PNJ envahisseur", 'signed'),
  'starting-bonus': c(() => "Bonus de l'équipement de départ de l'origine", 'signed'),
  'score-upgrade': c(() => "Coût d'amélioration"),
  'upgrade-base': c((p) => `Base du type d'amélioration${p('material') === '' ? '' : ` (${p('material')})`}`),
  'stone-preference': c(() => 'Préférence de pierres', 'signed'),
  'estimate-penalty': c(() => "Pénalité d'un type d'amélioration estimé", 'signed'),
  'score-total': c(() => 'Score de recommandation'),
  // Armes efficaces contre une rencontre.
  'weakness-absorption': c((p) => `Absorption ${p('type')} de la rencontre (en %)`, 'signed'),
  // Couverture des données.
  'coverage-documented': c((p) => `Documenté par le wiki : ${p('row')}`),
  // Rendement des attributs.
  'yield-next-gain': c((p) => `Gain du point suivant pour ${p('stat')}, à ${p('points')} points`, 'decimal'),
  'yield-soft-cap': c((p) => `Palier de ${p('stat')} : le gain moyen par point passe de ${p('before')} à ${p('after')}, à partir de`),
}

/** Mise en forme d'une valeur de composante selon son format. */
const VALUE_FORMATTERS: Readonly<Record<Exclude<ValueFormat, 'hidden'>, (n: number) => string>> = {
  int: (n) => formatInt(n),
  decimal: (n) => formatDecimal(n, 2),
  signed: (n) => formatSigned(n),
  fraction: (n) => formatPercent(n * 100),
  tier: (n) => `T${formatInt(n)}`,
}

/** Composante prête à afficher. */
export interface ComponentView {
  /** Phrase de la composante, paramètres interpolés. */
  readonly label: string
  /** Valeur mise en forme ; `null` = non documenté (la composante n'a pas pu être calculée). Absente si `hidden`. */
  readonly value: string | null
  /** Maximum mis en forme (« 25 »), si la composante en a un. */
  readonly max: string | null
  /** Vrai si la composante n'affiche pas de valeur (le texte suffit). */
  readonly hidden: boolean
  /** Part de la valeur dans son maximum, de 0 à 1, pour la barre ; `null` sans maximum ou sans valeur. */
  readonly ratio: number | null
}

/**
 * Texte d'une composante.
 * @param code Code de la composante.
 * @param params Paramètres du code.
 * @returns La phrase de la composante.
 */
export function componentLabel(code: ComponentCode, params?: CodeParams): string {
  return COMPONENT_SPECS[code].label(reader(params))
}

/**
 * Prépare une composante pour l'affichage : phrase, valeur sur maximum et rapport pour la barre. Une valeur `null` reste `null` (« Non documenté »), jamais 0.
 * @param component Composante d'une `Explanation`.
 * @returns La composante mise en forme.
 */
export function describeComponent(component: ExplanationComponent): ComponentView {
  const spec = COMPONENT_SPECS[component.code]
  const format = spec.format ?? 'int'
  const label = spec.label(reader(component.params))
  if (format === 'hidden') return { label, value: null, max: null, hidden: true, ratio: null }
  const fmt = VALUE_FORMATTERS[format]
  const { value, max } = component
  const ratio = value !== null && max !== undefined && max > 0 ? Math.min(1, Math.max(0, value / max)) : null
  return {
    label,
    value: value === null ? null : fmt(value),
    max: max === undefined ? null : fmt(max),
    hidden: false,
    ratio,
  }
}

// ─── Limites ───────────────────────────────────────────────────────────────────

/**
 * Texte de chaque limite : hypothèse, approximation ou donnée manquante. Un `Record` complet, comme les composantes.
 * Les phrases disent ce qui est approché ou absent, jamais comment s'en servir.
 */
export const LIMIT_TEXTS: Readonly<Record<LimitCode, (p: ParamReader) => string>> = {
  // Communs.
  'attribute-out-of-range': (p) => `L'attribut ${p('attr')} n'est pas un entier de 1 à 99 : le niveau n'est pas calculé.`,
  'level-out-of-range': (p) =>
    p('max') === ''
      ? `Le niveau ${p('level')} est hors des bornes de la méthode : rien n'est calculé.`
      : `Le plan demandé, de +${p('from')} à +${p('to')}, dépasse le niveau maximal +${p('max')} de cette arme : rien n'est calculé.`,
  'input-estimated': () => "Une donnée de départ est une estimation : le résultat en est une aussi.",
  // Coût en runes d'un niveau.
  'level-out-of-table': (p) =>
    p('level') === ''
      ? `Les niveaux de ${p('from')} à ${p('to')} sortent de la table officielle des coûts (niveaux 1 à 713).`
      : `Le niveau ${p('level')} n'est pas dans la table officielle des coûts (niveaux 1 à 713).`,
  'invalid-range': (p) => `La plage de ${p('from')} à ${p('to')} est invalide : le niveau d'arrivée doit dépasser celui de départ.`,
  'max-level-unconfirmed': (p) => `Le plafond de ${p('level')} niveaux n'est pas confirmé par le wiki.`,
  // Statistiques dérivées.
  'table-row-missing': (p) => `La table ${p('table')} n'a pas de ligne pour ${p('points')} points : valeur non documentée.`,
  'base-values-only': () => "Valeurs de base des tables : ni talismans, ni Great Runes, ni Physick, ni armure ne sont comptés.",
  // Prérequis à deux mains.
  'two-hand-no-stance': () => "Cette arme n'a pas de posture à deux mains : la Force ne reçoit pas de bonus.",
  'two-hand-always': (p) => `Les armes de classe ${p('category')} se manient toujours à deux mains : la Force effective s'applique d'office.`,
  'two-hand-bonus-exception': () => 'Exception connue du wiki : cette arme reçoit le bonus de Force à deux mains.',
  // Plan d'amélioration.
  'upgrade-type-undocumented': (p) =>
    `Le wiki ne documente pas le type d'amélioration de cette arme${p('material') === '' ? '' : ` (matériau « ${p('material')} »)`}, et aucune estimation n'existe.`,
  'not-upgradeable': () => "Cette arme n'est pas améliorable.",
  'upgrade-type-estimated': (p) => `Le type d'amélioration est une estimation${p('confidence') === '' ? '' : ` (confiance ${p('confidence')})`}, pas un fait du wiki.`,
  'upgrade-type-deduced': () => "Le type d'amélioration est déduit d'une règle du wiki, et non lu sur la page de l'arme.",
  'material-unknown': (p) => `Le matériau « ${p('material')} » n'est pas reconnu par le plan : rien n'est calculé.`,
  'prices-not-in-data': () => "Les prix et l'inventaire que débloquent les Bell Bearings ne sont pas dans les données : le plan n'en affiche pas.",
  'ancient-stones-not-purchasable': () => "Les pierres anciennes ne s'achètent pas en quantité illimitée.",
  // Origine optimale.
  'target-out-of-range': (p) =>
    p('attr') === '' ? 'Un attribut cible est hors de 1 à 99 : les origines ne sont pas classées.' : `L'attribut cible ${p('attr')} est hors de 1 à 99 : l'origine n'est pas classée.`,
  'wasted-points-not-tiebreak': () => 'Les points gaspillés sont affichés, mais ne départagent jamais deux origines pour une même cible.',
  'early-fit-uses-recommended-weapons': () => "L'adéquation précoce compte un bonus quand l'équipement de départ contient une arme recommandée par le widget des armes.",
  // Puissance d'attaque calculée.
  'estimate-method': () => "Puissance estimée par une méthode approchée : le wiki ne publie pas la formule exacte du jeu.",
  'generic-curve': () => "Le bonus de scaling suit les deux courbes génériques du wiki, pas celles de chaque arme.",
  'curve-non-physical': () => "Affinité non physique : la courbe « non physique » du wiki s'applique à tous les types de dégâts de l'arme, physique compris.",
  'curve-below-10': (p) => `À ${p('points')} points, sous 10, le wiki ne documente pas la courbe : interpolation proposée entre (1 ; 0) et (10 ; 15).`,
  'curve-above-99': (p) => `À ${p('points')} points, au-delà de 99, la valeur de la courbe à 99 est conservée.`,
  'base-interpolated': (p) => `Base interpolée entre +${p('from')} et +${p('to')} : valeur estimée.`,
  'coef-interpolated': () => 'Coefficient interpolé entre deux niveaux documentés : valeur estimée.',
  'scaling-coef-missing': (p) => `Bonus de scaling non calculable pour ${p('type')} : le wiki ne publie que la lettre de scaling, pas le coefficient.`,
  'scaling-missing-at-level': (p) => `Le tableau d'amélioration n'a pas de scaling au niveau +${p('level')} : coefficient non déterminable.`,
  'elemental-scaling-undocumented': (p) => `Scaling élémentaire non documenté pour ${p('type')} : la base seule est comptée.`,
  'scaling-attribute-ignored': (p) => `Le scaling de ${p('attr')} n'est rattaché à aucun type de dégâts par la méthode : son effet n'est pas compté.`,
  'requirement-not-met': (p) => `Prérequis non atteint (${p('attrs')}) : les dégâts ${p('type')} sont réduits et sans bonus de scaling.`,
  'requirement-effect-undocumented': (p) => `L'effet d'un prérequis non atteint sur les dégâts ${p('type')} n'est pas documenté : la base seule est comptée.`,
  'penalty-exception': (p) => `Exception connue du wiki : les dégâts ${p('type')} ne sont pas réduits par le prérequis manquant.`,
  'table-inconsistent': () => "Le wiki se contredit sur le tableau d'amélioration de cette arme : les valeurs de l'infobox font foi.",
  'attack-value-unparsed': (p) => `La valeur ${p('type')} du tableau du wiki n'est pas lisible : elle n'est pas calculée.`,
  'attack-type-missing': (p) => `Le tableau du wiki ne donne pas de valeur ${p('type')} à ce niveau : elle n'est pas calculée.`,
  'infobox-base': () => "Base lue dans l'infobox de l'arme, à +0, et non dans le tableau d'amélioration.",
  // Préparation et jauge.
  'boss-not-estimated': () => "Ce boss n'a ni palier de zone ni runes dans les données : son niveau recommandé n'est pas estimé.",
  // Étape de progression.
  'encounter-missing': (p) => `La rencontre ${p('encounter')} est absente des données : étape non déterminée.`,
  'stage-unclassified': () => "Aucune région exploitable ne donne d'étape : « Non classé », sans score et hors des colonnes.",
  'stage-from-regions-mentioned': () => "Étape déduite des régions citées dans le texte de l'arme, faute d'acquisition localisée.",
  'stage-override': (p) => `Étape fixée par une condition d'obtention documentée par le wiki (${p('stage')}${p('zone') === '' ? '' : `, ${p('zone')}`}), avant toute autre règle.`,
  'remembrance-encounter-unavailable': () => "Le fichier des boss n'est pas chargé : l'étape de la Remembrance n'est pas déterminée.",
  'remembrance-encounter-missing': (p) => `La rencontre ${p('encounter')}, liée à cette Remembrance, est absente des données.`,
  'dlc-unlocated': () => "Rencontre ou arme du DLC sans sous-zone connue : classée « DLC non localisé », en fin de colonne.",
  'region-unknown': (p) => `La région ${p('region')} n'est pas dans la table des étapes : elle est ignorée.`,
  'no-region-reached': () => 'Aucune région atteinte : étape Début par défaut.',
  'timeline-unavailable': () => "La frise des boss n'est pas disponible : l'étape choisie dans vos critères est reprise.",
  'stage-from-next-boss': (p) => `Étape tirée du prochain boss de la frise${p('node') === '' ? '' : ` (${p('node')})`}.`,
  'story-complete': () => "L'histoire principale est terminée.",
  'next-boss-stage-unknown': () => "L'étape du prochain boss n'est pas connue.",
  // Niveau recommandé d'un boss.
  'tier-missing': () => "Aucun palier de zone pour cette rencontre (DLC, Deeproot Depths…) : M1 n'existe pas.",
  'runes-missing': () => 'Runes absentes ou nulles : M2 n\'existe pas.',
  'runes-excluded': () => "Les runes de cette rencontre ne mesurent pas ce combat (celles de Radagon sont celles d'Elden Beast) : M2 est exclu.",
  'runes-beyond-table': () => 'Les runes dépassent la table des coûts : M2 n\'est pas calculé.',
  'hp-not-used': () => "Les PV s'affichent mais n'entrent pas dans le calcul : ils ne suivent pas la progression.",
  'dlc-entry-level-used': () => "Boss du DLC : le niveau recommandé est le niveau d'entrée du DLC ; la difficulté passe par la bénédiction de l'Arbre-Ombre.",
  'blessing-table-unavailable': () => "La table de bénédiction n'est pas chargée : les fragments sont affichés sans niveau.",
  // Build cible.
  'no-archetype': () => "Aucun archétype n'est choisi : il n'y a pas de build cible.",
  'template-design-choice': () => 'Le gabarit de répartition des attributs est un choix de conception du projet, pas une donnée du jeu.',
  'target-capped': (p) => `Au niveau ${p('level')}, un attribut atteint la borne de 99 : la somme des attributs n'atteint plus le niveau visé.`,
  'target-below-current': (p) => `Votre ${p('attr')} actuel dépasse déjà la valeur du gabarit.`,
  // Score de recommandation.
  'score-base-values': () => "Score calculé à +0 : il ne tient compte ni du niveau d'amélioration ni des Cendres de guerre.",
  'load-budget-unavailable': () => "La table de charge n'est pas chargée : le budget de poids est inconnu et aucune pénalité de poids n'est appliquée.",
  'spell-power-missing': (p) => `La puissance de sort de cette arme (${p('field')}) manque dans les données : la composante n'est pas calculée.`,
  // Armes efficaces contre une rencontre.
  'absorption-undocumented': () => "L'absorption de cette rencontre n'est pas documentée : aucune arme n'est suggérée.",
  'weakness-weapons-base-values': () => "Types de dégâts lus à +0 : ni l'affinité, ni les Cendres de guerre, ni les sorts ne sont comptés.",
  /** Rendement des attributs : les paliers sont ceux publiés par le wiki (D39), les gains viennent des tables. */
  'soft-caps-published': () => 'Paliers de rendement publiés par le wiki ; les gains moyens autour de chaque palier sont lus dans les tables.',
}

/**
 * Texte d'une limite.
 * @param code Code de la limite.
 * @param params Paramètres du code.
 * @returns La phrase de la limite.
 */
export function limitText(code: LimitCode, params?: CodeParams): string {
  return LIMIT_TEXTS[code](reader(params))
}

// ─── Libellés ──────────────────────────────────────────────────────────────────

/**
 * Texte de chaque libellé renvoyé par la configuration et les modules sans `Explanation` : étapes et prérequis de la frise, lignes de couverture,
 * titres et lignes « comment c'est calculé » des widgets, liens externes. Titres et descriptions des widgets : prototype `Main.dc.html`.
 */
export const LABEL_TEXTS: Readonly<Record<LabelCode, (p: ParamReader) => string>> = {
  // Frise des boss.
  'timeline-step-shardbearers': () => 'Porteurs de Grande Rune',
  'timeline-step-leyndell-access': () => 'Accès à Leyndell',
  'timeline-step-place': (p) => p('place'),
  'timeline-step-erdtree': () => "Intérieur de l'Erdtree",
  'prereq-radahn-jerren': () => 'Parler à Jerren, à Redmane Castle',
  'prereq-rykard-tanith-or-godskin-noble': () => 'Tanith (ses trois contrats) ou Godskin Noble',
  'prereq-mohg-varre-or-snowfield': () => 'Varré, ou Consecrated Snowfield',
  'prereq-messmers-kindling': () => "Messmer's Kindling, pour brûler l'arbre-sceau",
  // Couverture des données.
  'coverage-upgrade-melee': () => "Type d'amélioration des armes de mêlée",
  'coverage-upgrade-ranged': () => "Type d'amélioration des armes à distance et catalyseurs",
  'coverage-upgrade-shields': () => "Type d'amélioration des boucliers et torches",
  'coverage-timeline-hp': () => 'PV des boss de la frise',
  'coverage-timeline-runes': () => 'Runes des boss de la frise',
  'coverage-timeline-negation': () => 'Absorption des boss de la frise',
  'coverage-encounters-hp': () => 'PV de toutes les rencontres',
  'coverage-encounters-negation': () => 'Absorption de toutes les rencontres',
  // Widgets : titre et ligne « comment c'est calculé ».
  'widget-title-weapons-by-stage': () => 'Armes recommandées au fil de la partie',
  'widget-how-weapons-by-stage': () =>
    "Score sur 100 : adéquation au build, puissance et scaling, accessibilité à votre étape, coût d'amélioration. Étape déduite des régions d'obtention.",
  'widget-title-optimal-origin': () => 'Configuration de départ optimale',
  'widget-how-optimal-origin': () =>
    'Niveau pour la cible = somme des maxima (départ, cible) − 79. Points gaspillés = attributs de départ au-delà de la cible.',
  'widget-title-boss-order': () => "Ordre des boss de l'histoire principale",
  'widget-how-boss-order': () =>
    "Ordre du wiki. Niveau recommandé estimé d'après le palier de zone et les runes NG ; Prêt, Limite (8 niveaux ou moins) ou Trop tôt.",
  'widget-title-weakness-matrix': () => 'Matrice des faiblesses des boss',
  'widget-how-weakness-matrix': () =>
    "Absorption de chaque type de dégâts en % (damage_negation_percent), immunités aux statuts (status_resistance). Plus la valeur est basse, plus le boss est vulnérable.",
  'widget-title-upgrade-plan': () => "Plan d'amélioration",
  'widget-how-upgrade-plan': () =>
    "Pierres normales : 2, 4 puis 6 pierres par palier de trois niveaux, +25 avec une pierre ancienne. Pierres sombres : une par niveau, +10 avec une pierre ancienne.",
  'widget-title-rune-calculator': () => 'Calculateur de runes',
  'widget-how-rune-calculator': () => 'Somme des coûts de niveau, lus dans la table officielle (niveaux 1 à 713).',
  'widget-title-attribute-yield': () => 'Rendement des attributs',
  'widget-how-attribute-yield': () =>
    "Valeur de chaque point de Vigor, Mind et Endurance lue dans les tables officielles, gain du point suivant et paliers où le gain baisse.",
  'widget-title-data-coverage': () => 'Couverture des données',
  'widget-how-data-coverage': () => 'Part documentée par le wiki, estimée ou absente, champ par champ.',
  // Liens externes.
  'link-wiki': () => 'Voir sur le wiki',
  'link-fextralife-search': () => 'Voir sur Fextralife',
  'link-map-wiki-gg': () => 'Carte interactive (eldenring.wiki.gg)',
  'link-map-fextralife': () => 'Carte interactive (Fextralife)',
  'link-guide-elden-ring-guide': () => "Guide d'Elden Ring (eldenring.wiki.gg)",
  'link-guide-recommended-level': () => 'Niveau recommandé par zone (eldenring.wiki.gg)',
  'link-guide-walkthrough-wiki-gg': () => 'Pas à pas (eldenring.wiki.gg)',
  'link-guide-progress-route': () => 'Route de progression (Fextralife)',
  'link-guide-walkthrough-fextralife': () => 'Pas à pas (Fextralife)',
  /** Lien de recherche du wiki (état « aucun résultat » de la recherche globale). */
  'link-wiki-search': () => 'Chercher sur le wiki',
}

/**
 * Texte d'un libellé de la configuration ou d'un module.
 * @param code Code du libellé.
 * @param params Paramètres du code (le lieu d'une étape de la frise, par exemple).
 * @returns Le texte du libellé.
 */
export function labelText(code: LabelCode, params?: CodeParams): string {
  return LABEL_TEXTS[code](reader(params))
}

// ─── Méthodes ──────────────────────────────────────────────────────────────────

/** Titre et résumé d'une méthode de calcul. */
export interface MethodText {
  /** Titre court de la méthode (« Niveau recommandé d'un boss »). */
  readonly title: string
  /** Résumé d'une phrase, qui cite la section de `calculs.md`. */
  readonly summary: string
  /** Titre exact de la section de `calculs.md` (« Origine optimale »). */
  readonly section: string
}

/** Titre et phrase de résumé de chaque méthode, sans la citation de section (ajoutée par `methodText`). */
const METHOD_SUMMARIES: Readonly<Record<MethodId, { readonly title: string; readonly summary: string }>> = {
  stage: {
    title: 'Étape de progression',
    summary: "L'étape d'une arme est celle de son lieu d'obtention le plus précoce, parmi les cinq étapes de la partie",
  },
  'weapon-score': {
    title: "Score de recommandation d'une arme",
    summary: "Le score sur 100 additionne quatre composantes de 25 points : adéquation au build, puissance et scaling, accessibilité, coût d'amélioration",
  },
  requirements: {
    title: 'Prérequis comparés au profil',
    summary: "Chaque prérequis est atteint si l'attribut du profil est au moins égal à la valeur demandée, la Force comptant 1,5 fois à deux mains",
  },
  'optimal-origin': {
    title: 'Origine optimale',
    summary: "Le niveau d'un jeu d'attributs est la somme des attributs moins 79, et la meilleure origine est celle qui demande le niveau final le plus bas",
  },
  'target-attributes': {
    title: 'Build cible',
    summary: "Les attributs cibles se déduisent d'un gabarit d'archétype mis à l'échelle du niveau visé, par un choix de conception du projet",
  },
  'boss-level': {
    title: "Niveau recommandé d'un boss",
    summary: "Le niveau recommandé est une estimation : la moyenne du palier de zone du wiki et du niveau que représentent les runes du boss",
  },
  readiness: {
    title: 'Préparation et jauge',
    summary: 'Vous êtes prêt si votre niveau atteint le niveau recommandé, à la limite jusqu\'à 8 niveaux en dessous, trop tôt au-delà',
  },
  'rune-cost': {
    title: "Coût en runes d'un niveau",
    summary: 'Le coût de chaque niveau est lu dans la table officielle des niveaux 1 à 713, et les totaux additionnent ces coûts niveau par niveau',
  },
  'upgrade-plan': {
    title: "Plan d'amélioration",
    summary: "Les pierres nécessaires se déduisent du type d'amélioration de l'arme : paliers de pierres normales jusqu'à +25, pierres sombres jusqu'à +10",
  },
  'derived-stats': {
    title: 'Statistiques dérivées',
    summary: "PV, FP, endurance et charge d'équipement se lisent directement dans les tables officielles, sans formule ni interpolation",
  },
  'attack-power': {
    title: "Puissance d'attaque calculée",
    summary: "La puissance est une estimation approchée à partir du tableau d'amélioration, des coefficients de scaling et des courbes génériques du wiki",
  },
  level: {
    title: "Niveau d'un jeu d'attributs",
    summary: 'Le niveau du personnage est la somme de ses huit attributs moins 79',
  },
  coverage: {
    title: 'Couverture des données',
    summary: 'Simple décompte, champ par champ, des valeurs documentées par le wiki, déduites, estimées ou absentes dans les données chargées',
  },
  'attribute-yield': {
    title: 'Rendement des attributs',
    summary: 'Le gain de chaque point de Vigor, Mind et Endurance est lu dans les tables officielles, et les paliers où il baisse en sont déduits',
  },
}

/**
 * Titre, résumé et section de `calculs.md` d'une méthode.
 * @param id Identifiant de la méthode d'une `Explanation`.
 * @returns Le titre, le résumé d'une phrase qui cite la section, et le titre exact de la section.
 */
export function methodText(id: MethodId): MethodText {
  const { title, summary } = METHOD_SUMMARIES[id]
  const section = METHODS[id].section ?? title
  return { title, summary: `${summary} (calculs.md, « ${section} »).`, section }
}

// ─── Données utilisées ─────────────────────────────────────────────────────────

/**
 * Valeur d'une donnée citée dans une explication, mise en forme.
 * @param value Valeur de la donnée ; `undefined` = non citée.
 * @returns Le texte (nombres à la française, « oui » ou « non » pour un booléen), ou `null` si la donnée est `null` (non documentée) ou non citée.
 */
export function dataValueText(value: DataValue | undefined): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return formatDecimal(value, 2)
  if (typeof value === 'boolean') return value ? 'oui' : 'non'
  return value
}
