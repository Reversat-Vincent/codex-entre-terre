// Facettes des catalogues (docs/architecture.md § 2, § 15 P5 ; note `spec-catalog` ; brief § 6) : définitions par type de catalogue, filtrage et compteurs.
// Les compteurs d'une facette ignorent sa propre sélection et appliquent celles des autres ; une option à 0 reste présente, marquée vide.
// Au sein d'une facette les valeurs choisies s'additionnent (OU), entre facettes elles se cumulent (ET). Logique pure : aucune Vue, aucun store.

import { STATUS_KEYS, WEAPON_ATTRIBUTE_KEYS, GRADES } from '../data/keys.ts'
import type { StatusKey, WeaponAttributeKey } from '../data/keys.ts'
import { ATTRIBUTE_LABELS, SOURCE_LABELS, STATUS_BY_DATA_KEY, STATUS_LABELS } from '../ui/labels.ts'

/** Clé de statut du design system (`bleed`, `frost`…), clé de `STATUS_LABELS`. */
type StatusLabelKey = keyof typeof STATUS_LABELS

// ---------------------------------------------------------------------------------------------
// Types génériques

/** Valeur réservée à « aucune valeur » d'une facette (donnée `null`, liste vide, scaling absent). */
export const NONE_VALUE = '__none__'

/** Valeur de l'unique option d'une facette à case (« Prérequis atteints »). */
export const TOGGLE_VALUE = 'yes'

/** Option d'une facette : valeur stable (stockée dans les filtres actifs) et libellé affiché. */
export interface FacetOptionDef {
  readonly value: string
  readonly label: string
}

/**
 * Définition d'une facette sur des lignes de type `R`.
 * @typeParam R Ligne du catalogue (entrée préparée de `data/`).
 */
export interface FacetDef<R> {
  /** Identifiant stable, utilisé dans les filtres actifs et l'adresse. */
  readonly id: string
  /** Libellé français du groupe d'options. */
  readonly label: string
  /** `toggle` : une seule case (« Prérequis atteints ») ; `options` : liste d'options à cocher. */
  readonly presentation: 'options' | 'toggle'
  /** Options fixes, dans l'ordre d'affichage ; absent = options déduites des lignes, de la plus fréquente à la moins fréquente. */
  readonly fixedOptions?: readonly FacetOptionDef[]
  /** Libellé d'une valeur déduite des lignes (la valeur elle-même par défaut : les données s'affichent telles quelles). */
  readonly labelOf?: (value: string) => string
  /** Libellé de `NONE_VALUE` (« Non documenté » par défaut). */
  readonly noneLabel?: string
  /** Valeurs de la ligne pour cette facette ; `[NONE_VALUE]` si elle n'en a pas. Plusieurs valeurs possibles (régions, statuts). */
  readonly values: (row: R) => readonly string[]
}

/** Définition d'un catalogue : ses facettes et, s'il y en a, le prédicat « estimation » de l'option « Inclure les estimations ». */
export interface CatalogDef<R> {
  readonly id: CatalogId
  readonly facets: readonly FacetDef<R>[]
  /** Vrai si la ligne repose sur une estimation ; absent = le catalogue n'a pas d'option « Inclure les estimations ». */
  readonly isEstimate?: (row: R) => boolean
}

/** Types de catalogue qui ont leurs facettes propres ; `generic` sert aux autres (source et catégorie). */
export type CatalogId = 'weapons' | 'armors' | 'spells' | 'bosses' | 'locations' | 'generic'

/** Filtre actif : une valeur d'une facette. La liste des filtres actifs garde l'ordre d'ajout (puces de la barre de filtres). */
export interface ActiveFilter {
  readonly facet: string
  readonly value: string
}

/** Entrées du filtrage : filtres actifs et case « Inclure les estimations ». */
export interface CatalogQuery {
  readonly filters: readonly ActiveFilter[]
  /** Case « Inclure les estimations » (cochée par défaut côté interface) ; sans effet si le catalogue n'a pas de prédicat d'estimation. */
  readonly includeEstimates: boolean
}

/** Option d'une facette avec ses compteurs. */
export interface FacetOptionState {
  readonly value: string
  readonly label: string
  /** Lignes qui ont cette valeur, les autres facettes appliquées et la sienne ignorée. */
  readonly count: number
  /** Lignes qui ont cette valeur dans tout le catalogue (ordre stable des options, « cinq plus fréquentes »). */
  readonly total: number
  readonly selected: boolean
  /** Compteur à 0 : l'option reste visible. */
  readonly empty: boolean
  /** Option à désactiver : vide et non cochée (une option cochée reste décochable). */
  readonly disabled: boolean
}

/** Facette avec ses options et leurs compteurs, prête à afficher. */
export interface FacetState {
  readonly id: string
  readonly label: string
  readonly presentation: 'options' | 'toggle'
  readonly options: readonly FacetOptionState[]
  /** Nombre de valeurs cochées dans cette facette. */
  readonly selectedCount: number
}

/** État d'ensemble d'un catalogue filtré. */
export interface CatalogState<R> {
  /** Lignes qui passent tous les filtres, dans l'ordre d'entrée. */
  readonly rows: readonly R[]
  readonly facets: readonly FacetState[]
  /** Option « Inclure les estimations » : nombre de lignes estimées parmi celles qui passent les filtres (case ignorée) ; `null` sans prédicat. */
  readonly estimates: { readonly count: number; readonly included: boolean } | null
}

// ---------------------------------------------------------------------------------------------
// Configuration des tranches numériques (choix de présentation d'après la répartition des données, pas des faits du jeu)

/** Tranche numérique : bornes `min` incluse et `max` exclue (`null` = sans borne). */
export interface Band {
  readonly value: string
  readonly label: string
  readonly min: number
  readonly max: number | null
}

/**
 * Tranches des facettes numériques, regroupées ici. Bornes choisies sur les quartiles des données du 31/10/2026
 * (poids : 3,2 · 5,1 · 7,9 ; équilibre : 2 · 5 · 11 ; absorption physique : 3,1 · 4,8 · 8 ; coût en FP : 10 · 20 · 30) ; à revoir si les données changent.
 */
export const BANDS = {
  /** Poids d'une pièce d'armure (`weight`). */
  armorWeight: [
    { value: 'w0', label: 'Moins de 3', min: 0, max: 3 },
    { value: 'w1', label: '3 à moins de 5', min: 3, max: 5 },
    { value: 'w2', label: '5 à moins de 8', min: 5, max: 8 },
    { value: 'w3', label: '8 à moins de 11', min: 8, max: 11 },
    { value: 'w4', label: '11 et plus', min: 11, max: null },
  ],
  /** Équilibre d'une pièce d'armure (`poise`, entier). */
  armorPoise: [
    { value: 'p0', label: '0 à 2', min: 0, max: 3 },
    { value: 'p1', label: '3 à 5', min: 3, max: 6 },
    { value: 'p2', label: '6 à 10', min: 6, max: 11 },
    { value: 'p3', label: '11 à 20', min: 11, max: 21 },
    { value: 'p4', label: '21 et plus', min: 21, max: null },
  ],
  /** Absorption physique d'une pièce d'armure (`damage_negation.physical`, en %). */
  armorAbsorption: [
    { value: 'a0', label: 'Moins de 3\u00a0%', min: -Infinity, max: 3 },
    { value: 'a1', label: '3 à moins de 5\u00a0%', min: 3, max: 5 },
    { value: 'a2', label: '5 à moins de 8\u00a0%', min: 5, max: 8 },
    { value: 'a3', label: '8 à moins de 12\u00a0%', min: 8, max: 12 },
    { value: 'a4', label: '12\u00a0% et plus', min: 12, max: null },
  ],
  /** Coût en PF d'un sort (premier nombre de `fp_cost`). */
  spellFp: [
    { value: 'f0', label: 'Moins de 10', min: 0, max: 10 },
    { value: 'f1', label: '10 à 19', min: 10, max: 20 },
    { value: 'f2', label: '20 à 29', min: 20, max: 30 },
    { value: 'f3', label: '30 et plus', min: 30, max: null },
  ],
} as const satisfies Record<string, readonly Band[]>

/**
 * Valeur de tranche d'un nombre.
 * @param bands Tranches ordonnées.
 * @param n Nombre, ou `null` s'il n'est pas documenté.
 * @returns La valeur de la tranche, ou `NONE_VALUE` si `n` est `null`, non fini ou hors de toutes les tranches.
 */
export function bandOf(bands: readonly Band[], n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NONE_VALUE
  for (const b of bands) if (n >= b.min && (b.max === null || n < b.max)) return b.value
  return NONE_VALUE
}

// ---------------------------------------------------------------------------------------------
// Lignes attendues par chaque catalogue (sous-ensembles structurels des entrées préparées de src/data/types/)

/** Contenus d'un catalogue : libellés des trois sources simples ; une source double compte pour ses deux moitiés. */
const SOURCE_OPTIONS: readonly FacetOptionDef[] = (['Base game', 'Shadow of the Erdtree', 'Tarnished Pack'] as const).map((s) => ({
  value: s,
  label: SOURCE_LABELS[s].title,
}))

function sourceValues(source: string): readonly string[] {
  return source === 'Base game + Shadow of the Erdtree' ? ['Base game', 'Shadow of the Erdtree'] : [source]
}

const orNone = (values: readonly string[]): readonly string[] => (values.length > 0 ? values : [NONE_VALUE])

/** Ligne d'un catalogue d'armes (`WeaponEntry`). */
export interface WeaponRow {
  readonly category: string
  readonly source: string
  /** Lettre de scaling à +0 de chaque attribut ; `null` = pas de scaling (P3). */
  readonly scaling: Readonly<Record<WeaponAttributeKey, string | null>>
  readonly passive_effects: readonly string[]
  readonly status_buildup?: Readonly<Partial<Record<StatusKey, number>>>
  readonly derived: {
    readonly upgrade: { readonly material: string | null; readonly reliability: string }
    readonly regions: { readonly values: readonly string[] }
  }
}

/** Ligne d'un catalogue d'armures (`ArmorEntry`). */
export interface ArmorRow {
  readonly slot: string
  readonly weight: number | null
  readonly poise: number
  readonly damage_negation: { readonly physical: number | null }
}

/** Ligne d'un catalogue de sorts (`SpellEntry`). */
export interface SpellRow {
  readonly type: string
  readonly sub_type?: string
  readonly fp_cost: number | string
  readonly requirements: { readonly int: number; readonly fai: number; readonly arc: number }
}

/** Ligne d'un catalogue de boss (`BossEntry`). */
export interface BossRow {
  readonly tier: readonly string[]
  readonly flags: readonly string[]
  readonly encounters: readonly { readonly regions: readonly string[] }[]
}

/** Ligne d'un catalogue de lieux (`LocationEntry`). */
export interface LocationRow {
  readonly kind: string | null
  readonly region: string | null
  readonly source: string
}

/** Ligne d'un catalogue sans facettes propres : source et, si l'entrée en a une, catégorie. */
export interface GenericRow {
  readonly source: string
  readonly category?: string | null
}

// ---------------------------------------------------------------------------------------------
// Catalogues

/** Paramètres du catalogue d'armes : prédicats fournis par le moteur de calcul (écrit en parallèle). */
export interface WeaponCatalogOptions {
  /** Vrai si le profil actif atteint les prérequis de l'arme (facette « Prérequis atteints »). */
  readonly meetsRequirements: (row: WeaponRow) => boolean
  /** Vrai si l'arme repose sur une estimation (option « Inclure les estimations »). Par défaut : `derived.upgrade.reliability === 'estimate'`. */
  readonly isEstimate?: (row: WeaponRow) => boolean
}

/** Les grades de scaling, du plus fort au plus faible, comme rang numérique (S = 0). */
const GRADE_RANK: ReadonlyMap<string, number> = new Map(GRADES.map((g, i) => [g, i]))

/**
 * Attributs dominants d'une arme à +0 : ceux qui portent la meilleure lettre de scaling (S > A > B > C > D > E) ; ex æquo, tous.
 * @param scaling Lettres de scaling à +0 ; `null` = pas de scaling.
 * @returns Les clés d'attribut dominantes, ou `[NONE_VALUE]` si l'arme n'a aucun scaling.
 */
export function dominantScaling(scaling: Readonly<Record<WeaponAttributeKey, string | null>>): readonly string[] {
  let best = Infinity
  const keys: string[] = []
  for (const k of WEAPON_ATTRIBUTE_KEYS) {
    const g = scaling[k]
    const rank = g === null ? undefined : GRADE_RANK.get(g)
    if (rank === undefined) continue
    if (rank < best) {
      best = rank
      keys.length = 0
    }
    if (rank === best) keys.push(k)
  }
  return orNone(keys)
}

const UPGRADE_NOT_UPGRADEABLE = 'not-upgradeable'

/**
 * Facettes d'armes : classe, contenu, scaling dominant à +0, prérequis atteints, type d'amélioration, effet passif, région (note `spec-catalog`).
 * @param options Prédicats du moteur de calcul.
 * @returns La définition du catalogue.
 */
export function weaponCatalog(options: WeaponCatalogOptions): CatalogDef<WeaponRow> {
  const statusOptions: FacetOptionDef[] = STATUS_KEYS.map((k) => ({ value: k, label: STATUS_LABELS[STATUS_BY_DATA_KEY[k] as StatusLabelKey] }))
  return {
    id: 'weapons',
    isEstimate: options.isEstimate ?? ((r) => r.derived.upgrade.reliability === 'estimate'),
    facets: [
      { id: 'class', label: 'Classe', presentation: 'options', values: (r) => [r.category] },
      { id: 'content', label: 'Contenu', presentation: 'options', fixedOptions: SOURCE_OPTIONS, values: (r) => sourceValues(r.source) },
      {
        id: 'scaling',
        label: 'Scaling dominant à +0',
        presentation: 'options',
        fixedOptions: WEAPON_ATTRIBUTE_KEYS.map((k) => ({ value: k, label: ATTRIBUTE_LABELS[k].abbr })),
        noneLabel: 'Aucun scaling',
        values: (r) => dominantScaling(r.scaling),
      },
      {
        id: 'requirements',
        label: 'Prérequis atteints',
        presentation: 'toggle',
        fixedOptions: [{ value: TOGGLE_VALUE, label: 'Prérequis atteints' }],
        values: (r) => (options.meetsRequirements(r) ? [TOGGLE_VALUE] : []),
      },
      {
        id: 'upgrade',
        label: 'Type d’amélioration',
        presentation: 'options',
        labelOf: (v) => (v === UPGRADE_NOT_UPGRADEABLE ? 'Non améliorable' : v),
        values: (r) => {
          const u = r.derived.upgrade
          if (u.reliability === UPGRADE_NOT_UPGRADEABLE) return [UPGRADE_NOT_UPGRADEABLE]
          return [u.material ?? NONE_VALUE]
        },
      },
      {
        id: 'passive',
        label: 'Effet passif',
        presentation: 'options',
        // Statuts d'après `status_buildup` (donnée structurée) ; « autre » = texte d'effet passif sans statut ; une arme qui cumule les deux n'est comptée que sous son statut.
        fixedOptions: [...statusOptions, { value: 'other', label: 'Autre effet passif' }],
        noneLabel: 'Aucun effet passif',
        values: (r) => {
          // Statut absent de `status_buildup` = aucune accumulation documentée : test de présence, aucune valeur 0 affichée. Une arme qui ne
          // décrit son accumulation qu'en texte (Spiked Club, Death's Poker…) tombe sous « Autre effet passif », pas sous « Aucun ».
          const statuses = STATUS_KEYS.filter((k) => (r.status_buildup?.[k] ?? 0) > 0)
          if (statuses.length > 0) return statuses
          return r.passive_effects.length > 0 ? ['other'] : [NONE_VALUE]
        },
      },
      { id: 'region', label: 'Région', presentation: 'options', values: (r) => orNone(r.derived.regions.values) },
    ],
  }
}

/** Libellés français des emplacements d'armure (`slot`). */
const SLOT_OPTIONS: readonly FacetOptionDef[] = [
  { value: 'Head', label: 'Tête' },
  { value: 'Chest', label: 'Torse' },
  { value: 'Arms', label: 'Bras' },
  { value: 'Legs', label: 'Jambes' },
]

const bandOptions = (bands: readonly Band[]): readonly FacetOptionDef[] => bands.map((b) => ({ value: b.value, label: b.label }))

/**
 * Facettes d'armures : emplacement, poids, équilibre, absorption physique (brief § 6 ; tranches dans `BANDS`).
 * @returns La définition du catalogue.
 */
export function armorCatalog(): CatalogDef<ArmorRow> {
  return {
    id: 'armors',
    facets: [
      { id: 'slot', label: 'Emplacement', presentation: 'options', fixedOptions: SLOT_OPTIONS, values: (r) => [r.slot] },
      { id: 'weight', label: 'Poids', presentation: 'options', fixedOptions: bandOptions(BANDS.armorWeight), values: (r) => [bandOf(BANDS.armorWeight, r.weight)] },
      { id: 'poise', label: 'Équilibre', presentation: 'options', fixedOptions: bandOptions(BANDS.armorPoise), values: (r) => [bandOf(BANDS.armorPoise, r.poise)] },
      {
        id: 'absorption',
        label: 'Absorption physique',
        presentation: 'options',
        fixedOptions: bandOptions(BANDS.armorAbsorption),
        values: (r) => [bandOf(BANDS.armorAbsorption, r.damage_negation.physical)],
      },
    ],
  }
}

/** Paramètres du catalogue de sorts. */
export interface SpellCatalogOptions {
  /** Vrai si le profil actif atteint les prérequis du sort (facette « Prérequis atteints »). */
  readonly meetsRequirements: (row: SpellRow) => boolean
}

/**
 * Premier nombre du coût en PF d'un sort (`"22 (4)"` → 22).
 * @param cost Coût du wiki : nombre, ou texte quand il varie.
 * @returns Le coût, ou `null` si le texte ne commence pas par un nombre.
 */
export function spellFpCost(cost: number | string): number | null {
  if (typeof cost === 'number') return Number.isFinite(cost) ? cost : null
  const m = /^\s*(\d+(?:[.,]\d+)?)/.exec(cost)
  return m ? Number((m[1] as string).replace(',', '.')) : null
}

/**
 * Facettes de sorts : type, école (`sub_type`), attribut requis, prérequis atteints, coût en PF (brief § 6 ; tranches dans `BANDS`).
 * @param options Prédicat du moteur de calcul.
 * @returns La définition du catalogue.
 */
export function spellCatalog(options: SpellCatalogOptions): CatalogDef<SpellRow> {
  return {
    id: 'spells',
    facets: [
      { id: 'type', label: 'Type', presentation: 'options', values: (r) => [r.type] },
      { id: 'school', label: 'École', presentation: 'options', values: (r) => [r.sub_type ?? NONE_VALUE] },
      {
        id: 'attribute',
        label: 'Attribut requis',
        presentation: 'options',
        fixedOptions: (['int', 'fai', 'arc'] as const).map((k) => ({ value: k, label: ATTRIBUTE_LABELS[k].abbr })),
        noneLabel: 'Aucun prérequis',
        values: (r) => orNone((['int', 'fai', 'arc'] as const).filter((k) => r.requirements[k] > 0)),
      },
      {
        id: 'requirements',
        label: 'Prérequis atteints',
        presentation: 'toggle',
        fixedOptions: [{ value: TOGGLE_VALUE, label: 'Prérequis atteints' }],
        values: (r) => (options.meetsRequirements(r) ? [TOGGLE_VALUE] : []),
      },
      { id: 'fp', label: 'Coût en PF', presentation: 'options', fixedOptions: bandOptions(BANDS.spellFp), values: (r) => [bandOf(BANDS.spellFp, spellFpCost(r.fp_cost))] },
    ],
  }
}

/** Rangs de boss, du plus élevé au moins élevé (noms de la navbox du wiki, affichés tels quels). */
export const BOSS_TIER_ORDER = ['Gods', 'Demigods', 'Legends', 'Great Enemies', 'Enemies', 'Invaders and other minibosses'] as const

/** Indicateurs `flags` qui rendent un boss obligatoire (jeu de base, extension, accès à l'extension). */
const MANDATORY_FLAGS: ReadonlySet<string> = new Set(['mandatory_base_game', 'mandatory_dlc', 'required_to_access_dlc'])

/** Indicateurs `flags` d'une Remembrance (jeu de base, extension). */
const REMEMBRANCE_FLAGS: ReadonlySet<string> = new Set(['remembrance_base_game', 'remembrance_dlc'])

/**
 * Facettes de boss : rang, région, obligatoire, Remembrance (brief § 6). Un boss est « obligatoire » si l'un de ses indicateurs `mandatory_*` ou `required_to_access_dlc` est posé.
 * @returns La définition du catalogue.
 */
export function bossCatalog(): CatalogDef<BossRow> {
  return {
    id: 'bosses',
    facets: [
      { id: 'tier', label: 'Rang', presentation: 'options', fixedOptions: BOSS_TIER_ORDER.map((t) => ({ value: t, label: t })), values: (r) => orNone(r.tier) },
      {
        id: 'region',
        label: 'Région',
        presentation: 'options',
        values: (r) => orNone([...new Set(r.encounters.flatMap((e) => e.regions))]),
      },
      {
        id: 'mandatory',
        label: 'Obligatoire',
        presentation: 'options',
        fixedOptions: [
          { value: 'yes', label: 'Obligatoire' },
          { value: 'no', label: 'Facultatif' },
        ],
        values: (r) => [r.flags.some((f) => MANDATORY_FLAGS.has(f)) ? 'yes' : 'no'],
      },
      {
        id: 'remembrance',
        label: 'Remembrance',
        presentation: 'options',
        fixedOptions: [
          { value: 'yes', label: 'Avec Remembrance' },
          { value: 'no', label: 'Sans Remembrance' },
        ],
        values: (r) => [r.flags.some((f) => REMEMBRANCE_FLAGS.has(f)) ? 'yes' : 'no'],
      },
    ],
  }
}

/**
 * Facettes de lieux : type (`kind`) et région (brief § 6).
 * @returns La définition du catalogue.
 */
export function locationCatalog(): CatalogDef<LocationRow> {
  return {
    id: 'locations',
    facets: [
      { id: 'kind', label: 'Type', presentation: 'options', values: (r) => [r.kind ?? NONE_VALUE] },
      { id: 'region', label: 'Région', presentation: 'options', values: (r) => [r.region ?? NONE_VALUE] },
    ],
  }
}

/**
 * Facettes des autres catalogues (objets, talismans, Cendres, PNJ…) : source et catégorie. La catégorie n'est proposée que si une ligne en a une.
 * @param hasCategory Vrai si les lignes de ce catalogue portent une `category`.
 * @returns La définition du catalogue.
 */
export function genericCatalog(hasCategory = true): CatalogDef<GenericRow> {
  const facets: FacetDef<GenericRow>[] = [
    { id: 'content', label: 'Contenu', presentation: 'options', fixedOptions: SOURCE_OPTIONS, values: (r) => sourceValues(r.source) },
  ]
  if (hasCategory) facets.push({ id: 'category', label: 'Catégorie', presentation: 'options', values: (r) => [r.category ?? NONE_VALUE] })
  return { id: 'generic', facets }
}

// ---------------------------------------------------------------------------------------------
// Filtres actifs

/**
 * Ajoute ou retire un filtre (clic sur une option) ; un ajout se place en fin de liste, pour garder l'ordre d'ajout des puces.
 * @param filters Filtres actifs.
 * @param facet Identifiant de facette.
 * @param value Valeur de l'option.
 * @returns La nouvelle liste (l'ancienne n'est pas modifiée).
 */
export function toggleFilter(filters: readonly ActiveFilter[], facet: string, value: string): ActiveFilter[] {
  const present = filters.some((f) => f.facet === facet && f.value === value)
  return present ? filters.filter((f) => !(f.facet === facet && f.value === value)) : [...filters, { facet, value }]
}

/**
 * Libellé et facette d'un filtre actif, pour sa puce.
 * @param def Catalogue.
 * @param filter Filtre actif.
 * @returns Les libellés de la facette et de la valeur ; la valeur brute si la facette ou l'option est inconnue.
 */
export function describeFilter<R>(def: CatalogDef<R>, filter: ActiveFilter): { facet: string; value: string } {
  const facet = def.facets.find((f) => f.id === filter.facet)
  if (!facet) return { facet: filter.facet, value: filter.value }
  return { facet: facet.label, value: optionLabel(facet, filter.value) }
}

function optionLabel<R>(facet: FacetDef<R>, value: string): string {
  if (value === NONE_VALUE) return facet.noneLabel ?? 'Non documenté'
  const fixed = facet.fixedOptions?.find((o) => o.value === value)
  if (fixed) return fixed.label
  return facet.labelOf ? facet.labelOf(value) : value
}

// ---------------------------------------------------------------------------------------------
// Filtrage et compteurs

/** Valeurs choisies par facette, en ensembles. */
function selectionByFacet(filters: readonly ActiveFilter[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const f of filters) {
    const set = map.get(f.facet)
    if (set) set.add(f.value)
    else map.set(f.facet, new Set([f.value]))
  }
  return map
}

/** Valeurs de chaque ligne pour chaque facette, calculées une seule fois par passe. */
function valuesTable<R>(def: CatalogDef<R>, rows: readonly R[]): Set<string>[][] {
  return def.facets.map((f) => rows.map((r) => new Set(f.values(r))))
}

function passesFacet(values: ReadonlySet<string>, chosen: ReadonlySet<string> | undefined): boolean {
  if (!chosen || chosen.size === 0) return true
  for (const v of chosen) if (values.has(v)) return true
  return false
}

/**
 * Lignes qui passent tous les filtres (et la case « Inclure les estimations »).
 * @param def Catalogue.
 * @param rows Toutes les lignes du catalogue.
 * @param query Filtres actifs et case des estimations.
 * @returns Les lignes retenues, dans l'ordre d'entrée.
 */
export function filterRows<R>(def: CatalogDef<R>, rows: readonly R[], query: CatalogQuery): R[] {
  return computeCatalog(def, rows, query).rows as R[]
}

/**
 * Nombre de lignes obtenues si l'on retire chaque filtre actif, pour les suggestions d'un catalogue sans résultat
 * (« Retirer « Saignement » : 1 arme »).
 * @param def Catalogue.
 * @param rows Toutes les lignes du catalogue.
 * @param query Filtres actifs et case des estimations.
 * @returns Un élément par filtre actif qui rendrait au moins une ligne, du plus fructueux au moins fructueux.
 */
export function relaxations<R>(def: CatalogDef<R>, rows: readonly R[], query: CatalogQuery): { filter: ActiveFilter; count: number }[] {
  const out: { filter: ActiveFilter; count: number }[] = []
  for (const filter of query.filters) {
    const rest = query.filters.filter((f) => f !== filter)
    const count = computeCatalog(def, rows, { ...query, filters: rest }).rows.length
    if (count > 0) out.push({ filter, count })
  }
  return out.sort((a, b) => b.count - a.count)
}

const collator = new Intl.Collator('en')

/**
 * Filtre un catalogue et calcule les compteurs de toutes ses facettes.
 * Le compteur d'une option compte les lignes qui la portent et passent les filtres des autres facettes (pas ceux de sa propre facette) ;
 * la case « Inclure les estimations », décochée, retire les lignes estimées de tous les compteurs.
 * Options : celles de `fixedOptions` dans l'ordre, sinon celles des lignes de la plus fréquente à la moins fréquente (puis ordre alphabétique) ; `NONE_VALUE` en dernier, seulement si une ligne en a besoin.
 * Une option à 0 reste présente (`empty`) ; une option cochée dont la valeur n'existe plus reste listée pour pouvoir être décochée.
 * @param def Catalogue.
 * @param rows Toutes les lignes du catalogue.
 * @param query Filtres actifs et case des estimations.
 * @returns Les lignes retenues, les facettes avec leurs compteurs et le compteur d'estimations.
 */
export function computeCatalog<R>(def: CatalogDef<R>, rows: readonly R[], query: CatalogQuery): CatalogState<R> {
  const selection = selectionByFacet(query.filters)
  const table = valuesTable(def, rows)
  const nFacets = def.facets.length
  const isEstimate = def.isEstimate
  const estimated = isEstimate ? rows.map((r) => isEstimate(r)) : null
  const hideEstimates = estimated !== null && !query.includeEstimates

  const counts: Map<string, number>[] = def.facets.map(() => new Map())
  const totals: Map<string, number>[] = def.facets.map(() => new Map())
  const kept: R[] = []
  let estimateCount = 0

  for (let r = 0; r < rows.length; r++) {
    // Une ligne qui échoue à une seule facette ne compte que dans les compteurs de cette facette ; à aucune, dans tous.
    let failures = 0
    let failedFacet = -1
    for (let f = 0; f < nFacets; f++) {
      const facet = def.facets[f] as FacetDef<R>
      if (!passesFacet((table[f] as Set<string>[])[r] as Set<string>, selection.get(facet.id))) {
        failures++
        failedFacet = f
      }
    }
    for (let f = 0; f < nFacets; f++) {
      const total = totals[f] as Map<string, number>
      // Compteurs de lignes par valeur de facette : une valeur pas encore vue en est à 0 ligne (dénombrement, pas une donnée du jeu).
      for (const v of (table[f] as Set<string>[])[r] as Set<string>) total.set(v, (total.get(v) ?? 0) + 1)
    }
    if (failures === 0 && estimated?.[r]) estimateCount++
    if (hideEstimates && estimated[r]) continue
    if (failures === 0) kept.push(rows[r] as R)
    if (failures > 1) continue
    for (let f = 0; f < nFacets; f++) {
      if (failures === 1 && f !== failedFacet) continue
      const c = counts[f] as Map<string, number>
      // Même dénombrement, sur les lignes qui passent les autres facettes.
      for (const v of (table[f] as Set<string>[])[r] as Set<string>) c.set(v, (c.get(v) ?? 0) + 1)
    }
  }

  const facets: FacetState[] = def.facets.map((facet, f) => {
    // Aucune sélection pour cette facette = ensemble vide (filtre inactif), pas une valeur du jeu.
    const chosen = selection.get(facet.id) ?? new Set<string>()
    const total = totals[f] as Map<string, number>
    const count = counts[f] as Map<string, number>
    const values: string[] = facet.fixedOptions ? facet.fixedOptions.map((o) => o.value) : [...total.keys()].filter((v) => v !== NONE_VALUE)
    if (!facet.fixedOptions) {
      // Tri par effectif décroissant : une valeur sans effectif compte 0 (dénombrement, pas une donnée du jeu).
      values.sort((a, b) => (total.get(b) ?? 0) - (total.get(a) ?? 0) || collator.compare(optionLabel(facet, a), optionLabel(facet, b)))
    }
    // Valeur jamais comptée = 0 ligne : « Non documenté » n'est proposé que si au moins une ligne y est.
    if ((total.get(NONE_VALUE) ?? 0) > 0 || chosen.has(NONE_VALUE)) values.push(NONE_VALUE)
    for (const v of chosen) if (!values.includes(v)) values.push(v)
    const options: FacetOptionState[] = values.map((value) => {
      // Option absente des lignes filtrées ou comptée nulle part : 0 résultat (dénombrement) ; l'option reste affichée, grisée.
      const n = count.get(value) ?? 0
      const selected = chosen.has(value)
      return {
        value,
        label: optionLabel(facet, value),
        count: n,
        // Valeur choisie mais absente des lignes : effectif 0 (dénombrement).
        total: total.get(value) ?? 0,
        selected,
        empty: n === 0,
        disabled: n === 0 && !selected,
      }
    })
    return { id: facet.id, label: facet.label, presentation: facet.presentation, options, selectedCount: chosen.size }
  })

  return {
    rows: kept,
    facets,
    estimates: estimated ? { count: estimateCount, included: query.includeEstimates } : null,
  }
}
