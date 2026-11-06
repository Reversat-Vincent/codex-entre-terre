// Modèle des fiches communes (cendres de guerre, armures, talismans, sorts, esprits) : obtentions, alertes de qualité, paragraphes de description,
// notation de coût du wiki « X (Y) », noms de vendeurs et sections annexes. Fonctions pures, sans état ni accès aux données chargées.

import type { RouteLocationRaw } from 'vue-router'
import type { EntityKind } from '../../../data/datasets.ts'
import type { Acquisition, AcquisitionDerived, WikiSection } from '../../../data/types/common.ts'
import { formatDate } from '../../../ui/format.ts'

/** Une valeur clé : libellé français, valeur du wiki telle quelle, mise en forme du nombre et noms à relier aux fiches. */
export interface SheetFact {
  readonly id: string
  /** Libellé français. */
  readonly label: string
  /** Valeur de data/ : nombre (formaté), texte (affiché tel quel), `null` ou absente (« Non documenté »). */
  readonly value: number | string | null | undefined
  /** Mise en forme d'un nombre (`CxValue`). */
  readonly format?: 'int' | 'decimal' | 'percent' | 'weight' | 'signed'
  /** Nombre maximal de décimales pour `decimal`, `percent` et `signed`. */
  readonly digits?: number
  /** Unité écrite après un nombre (« runes »). */
  readonly unit?: string
  /** Explication visible sous la valeur (jamais cachée dans une info-bulle). */
  readonly hint?: string
  /** Un texte qui cite des noms d'entités : genres préférés pour les relier aux fiches (nom exact seulement). */
  readonly linkKinds?: readonly EntityKind[]
  /** Le texte est une liste de noms séparés par « / » ou « or » (vendeurs) : chaque nom est relié séparément. */
  readonly nameList?: boolean
}

/** Maillon du fil d'Ariane entre le catalogue et le nom : libellé, et destination s'il mène quelque part (région parente, type d'objet). */
export interface SheetCrumb {
  readonly label: string
  /** Destination du maillon ; absente : simple texte. */
  readonly to?: RouteLocationRaw
}

// ─── Obtention ─────────────────────────────────────────────────────────────────

/** Champs d'une entrée dont les obtentions sont lues (toute entrée des fichiers de la galerie du wiki). */
export interface AcquisitionSource {
  readonly acquisition: readonly Acquisition[]
  readonly derived: AcquisitionDerived
}

/** Une obtention prête à afficher. */
export interface AcquisitionView {
  readonly index: number
  /** Méthode, telle que dans les données ; `null` : non documentée. */
  readonly method: string | null
  /** Icône de la méthode normalisée (`derived.methods`). */
  readonly icon: string
  /** Lieu, tel que dans les données ; `null` : non documenté. */
  readonly location: string | null
  /** Région du wiki, ou à défaut région déduite par la préparation des données ; `null` : aucune. */
  readonly region: string | null
  /** Vrai si la région vient de la préparation des données (déduction) et non du wiki. */
  readonly regionDeduced: boolean
  /** Équipement ou sort de départ : le lieu est une origine. */
  readonly starting: boolean
  readonly details: readonly string[]
}

/** Icône de chaque méthode normalisée (`derived.methods`). */
const METHOD_ICONS: Readonly<Record<string, string>> = {
  purchase: 'trade',
  trade: 'trade',
  drop: 'drop',
  'guaranteed-drop': 'drop',
  loot: 'drop',
  quest: 'npc',
  starting: 'start',
  other: 'map',
}

/**
 * Obtentions d'une entrée prêtes à afficher : méthode brute, icône de la méthode normalisée, région du wiki ou déduite (docs/architecture.md § 3.2, D10).
 * @param entry Entrée de data/ avec ses acquisitions et ses champs dérivés.
 * @returns Une entrée par acquisition de `data/`, dans l'ordre.
 */
export function acquisitionViews(entry: AcquisitionSource): AcquisitionView[] {
  return entry.acquisition.map((a, index): AcquisitionView => {
    const normalized = entry.derived.methods[index] ?? null
    const derivedRegions = entry.derived.regions.acquisitions.find((r) => r.index === index)?.values.map((v) => v.value) ?? []
    const starting = normalized === 'starting'
    return {
      index,
      method: a.method,
      icon: normalized === null ? 'map' : (METHOD_ICONS[normalized] ?? 'map'),
      location: a.location,
      region: a.region ?? (derivedRegions.length > 0 && !starting ? derivedRegions.join(', ') : null),
      regionDeduced: a.region === null && derivedRegions.length > 0 && !starting,
      starting,
      details: a.details,
    }
  })
}

// ─── Alertes de qualité ────────────────────────────────────────────────────────

/** Alerte de qualité des données en tête de fiche. */
export interface SheetAlert {
  readonly id: string
  /** Ton du bandeau `CxNote` : `partial` pour des données manquantes, `warn` pour une incohérence, `info` pour une précision. */
  readonly tone: 'info' | 'partial' | 'warn' | 'est'
  /** Phrase d'accroche en gras. */
  readonly title: string
  readonly text: string
  /** Raison ou valeur du wiki, en anglais, telle quelle. */
  readonly detail?: string
}

/** Un champ à contrôler : son libellé français et s'il manque (`null` dans les données). */
export interface FieldCheck {
  readonly label: string
  readonly missing: boolean
}

/**
 * Alerte « données partielles » : liste les champs que le wiki ne documente pas (`null`).
 * @param fields Champs contrôlés.
 * @returns L'alerte, ou `null` si aucun champ ne manque.
 */
export function missingFieldsAlert(fields: readonly FieldCheck[]): SheetAlert | null {
  const missing = fields.filter((f) => f.missing).map((f) => f.label)
  if (missing.length === 0) return null
  return {
    id: 'missing-fields',
    tone: 'partial',
    title: 'Données partielles.',
    text: `Le wiki ne documente pas : ${missing.join(', ')}. Ces valeurs s’affichent « Non documenté », jamais 0.`,
  }
}

/**
 * Alerte « obtention non documentée » : le wiki ne donne aucune obtention, ou aucune qui nomme une méthode, un lieu ou un détail.
 * @param views Obtentions de l'entrée.
 * @returns L'alerte, ou `null` si au moins une obtention porte une information.
 */
export function acquisitionAlert(views: readonly AcquisitionView[]): SheetAlert | null {
  const informative = views.some((v) => v.method !== null || v.location !== null || v.details.length > 0)
  if (informative) return null
  return {
    id: 'no-acquisition',
    tone: 'partial',
    title: 'Obtention non documentée.',
    text: 'Le wiki ne dit pas où se procurer cet élément.',
  }
}

/**
 * Retire les alertes absentes d'une liste d'alertes optionnelles.
 * @param alerts Alertes éventuelles, `null` quand il n'y a rien à signaler.
 * @returns Les alertes présentes, dans l'ordre.
 */
export function presentAlerts(alerts: readonly (SheetAlert | null)[]): SheetAlert[] {
  return alerts.filter((a): a is SheetAlert => a !== null)
}

// ─── Textes ────────────────────────────────────────────────────────────────────

/**
 * Découpe une description du jeu en paragraphes : une ligne vide sépare deux paragraphes, un simple retour à la ligne est un retour de mise en page
 * du texte d'origine et devient une espace. Le texte reste celui des données (anglais, mots inchangés).
 * @param text Description, ou `null` / `undefined` si absente.
 * @returns Les paragraphes non vides, dans l'ordre.
 */
export function descriptionParagraphs(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p !== '')
}

/** Section annexe d'une fiche : titre du wiki (anglais) et contenu. */
export interface OtherSectionView {
  readonly title: string
  readonly section: WikiSection
}

/**
 * Sections annexes d'une page du wiki (`other_sections`), sans celles qui répètent les notes (la section « Note » reprend parfois mot pour mot `notes`).
 * @param sections `other_sections` de l'entrée.
 * @param notes `notes` de l'entrée, pour écarter les doublons.
 * @returns Les sections à afficher, dans l'ordre du wiki.
 */
export function otherSectionViews(
  sections: Readonly<Record<string, WikiSection>> | undefined,
  notes: readonly string[] | undefined,
): OtherSectionView[] {
  if (!sections) return []
  const same = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((line, i) => line === b[i])
  return Object.entries(sections)
    .filter(([, s]) => !(notes && (s.tables === undefined || s.tables.length === 0) && same(s.text, notes)))
    .filter(([, s]) => s.text.length > 0 || (s.tables?.length ?? 0) > 0)
    .map(([title, section]) => ({ title, section }))
}

/**
 * Noms cités dans une liste de vendeurs du wiki (« Sorceress Sellen / Count Ymir », « Brother Corhyn or Miriel, Pastor of Vows »).
 * Seuls « / » et « or » séparent : une virgule fait partie d'un nom (« Miriel, Pastor of Vows »).
 * @param text Valeur de l'infobox (`seller`).
 * @returns Les noms, un par vendeur.
 */
export function splitNames(text: string): string[] {
  return text
    .split(/\s+\/\s+|\s+or\s+/)
    .map((n) => n.trim())
    .filter((n) => n !== '')
}

/** Un nom d'objet ou d'équipement cité par le wiki, avec la quantité qui l'accompagne (« Thin Beast Bones x3 »). */
export interface NameEntry {
  /** Nom, sans la quantité ni le marqueur de puce. */
  readonly name: string
  /** Quantité écrite après le nom (`x3`) ; `null` : aucune. */
  readonly count: number | null
}

/**
 * Lit un nom avec sa quantité.
 * @param text Une entrée : « Thin Beast Bones x3 », « * Poisonbloom x1 », « Flask of Crimson Tears ».
 * @returns Le nom nettoyé de son éventuelle puce `*` et la quantité (`x3`) ; seule la quantité est retirée, un `+7` ou un crochet fait partie du nom
 *   (« Smithing Stone [3] », « Crimson Seed Talisman +1 » sont des noms d'objets).
 */
export function parseNameEntry(text: string): NameEntry {
  const clean = text.trim().replace(/^[*•]\s*/, '')
  const counted = /^(.*\S)\s+[x×](\d+)$/i.exec(clean)
  return counted ? { name: counted[1]!.trim(), count: Number(counted[2]) } : { name: clean, count: null }
}

/**
 * Découpe une liste de noms écrite sur une cellule : une entrée par ligne ou après un point-virgule (« A x3; B x2 », une puce par ligne).
 * @param text Texte du wiki (champ d'infobox ou cellule de tableau).
 * @returns Les entrées non vides, dans l'ordre.
 */
export function splitNameEntries(text: string): NameEntry[] {
  return text
    .split(/[\n;]+/)
    .map((part) => part.trim())
    .filter((part) => part !== '' && part !== '*')
    .map(parseNameEntry)
}

/**
 * Entrées d'une liste de noms déjà séparés (butin, sites de grâce, équipement de départ).
 * @param names Noms, tels que dans data/.
 * @returns Une entrée par nom non vide.
 */
export function toNameEntries(names: readonly string[]): NameEntry[] {
  return names.filter((n) => n.trim() !== '').map(parseNameEntry)
}

/**
 * Date d'extraction en toutes lettres.
 * @param retrieved Date AAAA-MM-JJ (`metadata.retrieved`), ou `null`.
 * @returns « 31 octobre 2026 », ou `null` si la date est absente ou illisible.
 */
export function retrievedText(retrieved: string | null | undefined): string | null {
  return formatDate(retrieved, 'long')
}

// ─── Notation de coût « X (Y) » ─────────────────────────────────────────────────

/**
 * Coût lu dans la notation du wiki. Pour un sort, `X (Y)` : X par lancement, Y par tick quand le sort est maintenu
 * (docs/contenu/verification-socle.md, Rock Blaster `22 (4)` : « Costs 22 FP per cast. Costs 4 FP per tick when channeling. »).
 */
export type CastCost =
  | { readonly kind: 'none' }
  | { readonly kind: 'plain'; readonly cast: number; readonly raw: string }
  | { readonly kind: 'channel'; readonly cast: number; readonly tick: number; readonly raw: string }
  | { readonly kind: 'text'; readonly raw: string }

/**
 * Lit un coût de sort (FP ou endurance) : un nombre, « X (Y) », ou un texte inconnu gardé tel quel plutôt que deviné.
 * @param raw Valeur de `fp_cost` ou `stamina_cost` ; `null` ou `undefined` : aucun coût documenté.
 * @returns Le coût lu.
 */
export function parseCastCost(raw: number | string | null | undefined): CastCost {
  if (raw === null || raw === undefined) return { kind: 'none' }
  if (typeof raw === 'number') return { kind: 'plain', cast: raw, raw: String(raw) }
  const text = raw.trim()
  const plain = /^(\d+(?:\.\d+)?)$/.exec(text)
  if (plain) return { kind: 'plain', cast: Number(plain[1]), raw: text }
  const channel = /^(\d+(?:\.\d+)?)\s*\(\s*(\d+(?:\.\d+)?)\s*\)$/.exec(text)
  if (channel) return { kind: 'channel', cast: Number(channel[1]), tick: Number(channel[2]), raw: text }
  return { kind: 'text', raw: text }
}
