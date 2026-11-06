// Modèle de la fiche d'objet : type d'objet selon le fichier d'origine, valeurs clés de l'infobox, attaque d'une munition, recette, résumé et alertes de qualité.
// Les valeurs sont celles du wiki, sans conversion : les champs d'infobox absents sont omis (le wiki n'a pas de ligne pour eux), les `null` du schéma restent « Non documenté ».

import type { RouteLocationRaw } from 'vue-router'
import { DATASETS } from '../../../../data/datasets.ts'
import type { DatasetKey } from '../../../../data/datasets.ts'
import type { StatusKey } from '../../../../data/keys.ts'
import type { AmmunitionEntry } from '../../../../data/types/ammunition.ts'
import type { DamageLabelKey } from '../../../../ui/labels.ts'
import { ATTRIBUTE_LABELS } from '../../../../ui/labels.ts'
import type { AttributeKey } from '../../../../ui/labels.ts'
import { acquisitionAlert, acquisitionViews, descriptionParagraphs, missingFieldsAlert, presentAlerts, splitNameEntries } from '../sheetModel.ts'
import type { NameEntry, SheetAlert, SheetCrumb, SheetFact } from '../sheetModel.ts'
import type { ItemEntry } from '../useSheetEntry.ts'

/** Type d'objet de l'interface : un par fichier d'objets de `data/`. */
export type ItemType = 'tool' | 'upgrade' | 'key' | 'crafting' | 'ammo'

/** Description d'un type d'objet. */
export interface ItemTypeInfo {
  readonly type: ItemType
  /** Libellé français du type (en-tête et fil d'Ariane). */
  readonly label: string
  /** Valeur du filtre `?type=` du catalogue des objets. */
  readonly filter: string
  /** Titre de la section d'effet : l'usage d'un matériau, l'effet des autres objets. */
  readonly effectTitle: string
}

const TYPE_BY_DATASET: Readonly<Partial<Record<DatasetKey, Omit<ItemTypeInfo, 'filter'>>>> = {
  tools: { type: 'tool', label: 'Outils et consommables', effectTitle: 'Effet' },
  upgrade_materials: { type: 'upgrade', label: 'Matériaux d’amélioration', effectTitle: 'Usage' },
  key_items: { type: 'key', label: 'Objets clés', effectTitle: 'Effet' },
  crafting_materials: { type: 'crafting', label: 'Matériaux d’artisanat', effectTitle: 'Usage' },
  ammunition: { type: 'ammo', label: 'Munitions', effectTitle: 'Effet' },
}

/**
 * Type d'un objet d'après le fichier qui le contient.
 * @param dataset Clé du fichier de l'entrée (`useSheetEntry`), ou `null` tant qu'elle n'est pas trouvée.
 * @returns Le type d'objet ; `null` si le fichier n'est pas un fichier d'objets.
 */
export function itemTypeOf(dataset: DatasetKey | null): ItemTypeInfo | null {
  if (dataset === null) return null
  const base = TYPE_BY_DATASET[dataset]
  const filter = DATASETS[dataset].routes.query?.value
  return base === undefined || filter === undefined ? null : { ...base, filter }
}

/**
 * Maillons du fil d'Ariane d'un objet, entre « Objets » et son nom : le type (lien vers le catalogue filtré), puis la catégorie du wiki.
 * @param type Type d'objet.
 * @param category Catégorie du wiki (« Throwing Pots »), telle que dans data/.
 * @returns Un ou deux maillons.
 */
export function itemTrail(type: ItemTypeInfo, category: string): SheetCrumb[] {
  const to: RouteLocationRaw = { name: 'items', query: { type: type.filter } }
  return [{ label: type.label, to }, ...(category === '' || category === type.label ? [] : [{ label: category }])]
}

// ─── Valeurs clés ──────────────────────────────────────────────────────────────

/** Valeur d'un champ d'infobox (texte ou nombre). */
type InfoValue = string | number

/**
 * Première valeur présente parmi plusieurs écritures d'un même champ (le wiki écrit `sub_type` et `sub-type`, `sell_price` et `sell+price`).
 * @param infobox Infobox de l'entrée.
 * @param keys Clés possibles, par ordre de préférence.
 * @returns La valeur, ou `undefined` si l'infobox n'a aucune de ces clés.
 */
function field(infobox: Readonly<Record<string, InfoValue>>, keys: readonly string[]): InfoValue | undefined {
  for (const key of keys) {
    const value = infobox[key]
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

/**
 * Nettoie une liste du wiki écrite sur une cellule (« *Loot\n*Craftable » → « Loot ; Craftable »).
 * @param text Texte d'infobox.
 * @returns Les éléments joints par « ; ».
 */
export function joinList(text: string): string {
  return text
    .split(/[\n;]+/)
    .map((part) => part.trim().replace(/^[*•]\s*/, ''))
    .filter((part) => part !== '')
    .join(' ; ')
}

/** Définition d'une valeur clé lue dans l'infobox. */
interface FactDef {
  readonly id: string
  readonly label: string
  readonly keys: readonly string[]
  readonly format?: SheetFact['format']
  /** Prix en runes : un nombre reçoit l'unité, un texte du wiki (« 2,000 - 5,000 ») la reçoit après lui. */
  readonly money?: boolean
  /** Liste écrite sur plusieurs lignes ou séparée par des points-virgules. */
  readonly list?: boolean
  readonly linkKinds?: SheetFact['linkKinds']
  readonly nameList?: boolean
}

const FACT_DEFS: readonly FactDef[] = [
  { id: 'sub', label: 'Sous-type', keys: ['sub_type', 'sub-type'] },
  { id: 'attack-type', label: 'Type d’attaque', keys: ['attack_type'] },
  { id: 'held', label: 'Détenu au maximum', keys: ['max_held'], format: 'int' },
  { id: 'stored', label: 'Stocké au maximum', keys: ['max_stored'], format: 'int' },
  { id: 'buy', label: 'Prix d’achat', keys: ['buy_price'], money: true },
  { id: 'sell', label: 'Prix de revente', keys: ['sell_price', 'sell+price'], money: true },
  { id: 'fp', label: 'Coût en FP', keys: ['fp_cost'] },
  { id: 'hp', label: 'Coût en PV', keys: ['hp_cost'] },
  { id: 'duration', label: 'Durée', keys: ['duration', 'status_duration'] },
  { id: 'container', label: 'Contenant', keys: ['container'], linkKinds: ['item'] },
  { id: 'cookbook', label: 'Livre de recettes', keys: ['cookbook'], linkKinds: ['item'] },
  { id: 'seller', label: 'Vendeur', keys: ['seller'], linkKinds: ['npc'], nameList: true },
  { id: 'trade', label: 'Échangeable', keys: ['trade'] },
  { id: 'parry', label: 'Parable', keys: ['parryable'] },
  { id: 'deflect', label: 'Déviable', keys: ['deflectable'] },
  { id: 'reflect', label: 'Réfléchissable', keys: ['reflectable'] },
  { id: 'obtained', label: 'Obtention (infobox)', keys: ['obtained'], list: true },
]

/** Clés d'infobox de la mise à l'échelle d'un outil (`str_scale`…) et attribut correspondant. */
const SCALE_KEYS: readonly (readonly [string, AttributeKey])[] = [
  ['str_scale', 'str'],
  ['dex_scale', 'dex'],
  ['int_scale', 'int'],
  ['fai_scale', 'fai'],
  ['arc_scale', 'arc'],
]

/**
 * Valeurs clés d'un objet : type, puis les champs d'infobox que le wiki donne pour cette page (stockage, prix, coûts, recette…).
 * Un champ que la page ne donne pas est omis ; seul le type, qui existe pour tout objet, s'affiche « Non documenté » quand il manque.
 * @param entry Objet.
 * @returns Les valeurs dans l'ordre d'affichage.
 */
export function itemFacts(entry: ItemEntry): SheetFact[] {
  const info = entry.infobox
  const type = ('type' in entry ? entry.type : undefined) ?? field(info, ['type'])
  const facts: SheetFact[] = [{ id: 'type', label: 'Type', value: type ?? null }]
  for (const def of FACT_DEFS) {
    const value = field(info, def.keys)
    if (value === undefined) continue
    if (def.money) {
      facts.push({ id: def.id, label: def.label, value: typeof value === 'number' ? value : `${value} runes`, ...(typeof value === 'number' ? { unit: 'runes' } : {}) })
      continue
    }
    const text = def.list && typeof value === 'string' ? joinList(value) : value
    facts.push({
      id: def.id,
      label: def.label,
      value: text,
      ...(def.format === undefined ? {} : { format: def.format }),
      ...(def.linkKinds === undefined ? {} : { linkKinds: def.linkKinds }),
      ...(def.nameList === undefined ? {} : { nameList: def.nameList }),
    })
  }
  const scale = SCALE_KEYS.flatMap(([key, attribute]) => {
    const value = info[key]
    return value === undefined ? [] : [`${ATTRIBUTE_LABELS[attribute].abbr} ${value}`]
  })
  if (scale.length > 0) facts.push({ id: 'scale', label: 'Mise à l’échelle', value: scale.join(' · ') })
  return facts
}

// ─── Attaque ───────────────────────────────────────────────────────────────────

/** Type de dégâts d'une attaque d'objet. */
export type ItemDamageKey = Extract<DamageLabelKey, 'physical' | 'magic' | 'fire' | 'lightning' | 'holy'>

/** Dégâts d'un type : `null` si le wiki ne le documente pas. */
export interface ItemDamage {
  readonly key: ItemDamageKey
  readonly value: number | null
}

/** Accumulation d'un statut portée par l'objet (flèche de poison, de putréfaction…). */
export interface ItemStatus {
  readonly key: StatusKey
  readonly value: number
}

/** Attaque d'un objet : puissance par type de dégâts, critique, statuts. */
export interface ItemAttack {
  readonly damages: readonly ItemDamage[]
  /** Critique (munition) : `null` si non documenté ; `undefined` : l'objet n'en a pas. */
  readonly critical: number | null | undefined
  readonly statuses: readonly ItemStatus[]
  /** Effets passifs du wiki (« Causes poison buildup (60) »), tels quels. */
  readonly passive: string | null
}

const DAMAGE_KEYS: readonly ItemDamageKey[] = ['physical', 'magic', 'fire', 'lightning', 'holy']

/** Clé d'infobox → clé de statut de `data/` pour l'accumulation portée par une munition. */
const STATUS_FIELDS: readonly (readonly [string, StatusKey])[] = [
  ['blood_loss', 'blood_loss'],
  ['frost', 'frostbite'],
  ['poison', 'poison'],
  ['scarlet_rot', 'scarlet_rot'],
  ['sleep', 'sleep'],
  ['madness', 'madness'],
]

/**
 * Attaque d'un objet. Une munition la porte dans `attack_power` (chaque type peut être `null`) ; quelques outils (pots) la portent dans l'infobox
 * (`fire_power`, `magic_power`…), seuls les types présents sont alors listés.
 * @param entry Objet.
 * @returns L'attaque, ou `null` si l'objet n'en a pas.
 */
export function itemAttack(entry: ItemEntry): ItemAttack | null {
  const info = entry.infobox
  const statuses = STATUS_FIELDS.flatMap(([key, status]): ItemStatus[] => {
    const value = info[key]
    return typeof value === 'number' ? [{ key: status, value }] : []
  })
  const passive = field(info, ['passive_effects', 'passive effects'])
  const passiveText = typeof passive === 'string' ? passive : null
  if ('attack_power' in entry) {
    const ammo: AmmunitionEntry = entry
    return {
      damages: DAMAGE_KEYS.map((key) => ({ key, value: ammo.attack_power[key] })),
      critical: ammo.critical,
      statuses,
      passive: passiveText,
    }
  }
  const damages = DAMAGE_KEYS.flatMap((key): ItemDamage[] => {
    const value = info[`${key}_power`]
    return typeof value === 'number' ? [{ key, value }] : []
  })
  if (damages.length === 0) return null
  return { damages, critical: undefined, statuses, passive: passiveText }
}

// ─── Recette ───────────────────────────────────────────────────────────────────

/**
 * Ingrédients d'un objet à fabriquer : le champ `required_items` de l'infobox (« *Empty Cracked Pot x1\n*Mushroom x1 » ou « Thin Beast Bones x3; Fulgurbloom x1 »),
 * sinon le texte de la section `crafting` quand elle ne liste que des noms.
 * @param entry Objet.
 * @returns Les ingrédients avec leur quantité ; vide si le wiki n'en donne pas.
 */
export function itemIngredients(entry: ItemEntry): NameEntry[] {
  const required = entry.infobox.required_items
  if (typeof required === 'string') return splitNameEntries(required)
  return []
}

/**
 * Texte de la section « Fabrication » du wiki (`crafting`) qui n'est pas déjà la liste des ingrédients.
 * @param entry Objet.
 * @param ingredients Ingrédients déjà lus (`itemIngredients`).
 * @returns Les lignes à afficher en plus de la liste ; vide si la section répète les ingrédients ou n'existe pas.
 */
export function craftingExtra(entry: ItemEntry, ingredients: readonly NameEntry[]): string[] {
  const section = 'crafting' in entry ? entry.crafting : undefined
  if (section === undefined) return []
  const known = new Set(ingredients.map((i) => i.name.toLowerCase()))
  const lines = section.text.filter((line) => {
    const parsed = splitNameEntries(line)
    return !(parsed.length === 1 && parsed[0] !== undefined && known.has(parsed[0].name.toLowerCase()))
  })
  return lines
}

// ─── Résumé et état ────────────────────────────────────────────────────────────

/**
 * Paragraphes du résumé du wiki, sans la phrase d'amorce qui répète le type de l'objet (« Fire Pot is a craftable Throwing Pot in Elden Ring. »).
 * Cette phrase n'apprend rien que l'en-tête ne dise déjà ; un paragraphe qui porte un chiffre est toujours gardé.
 * @param summary Résumé (`summary`), ou `null` / `undefined`.
 * @returns Les paragraphes à afficher, dans l'ordre.
 */
export function summaryParagraphs(summary: string | null | undefined): string[] {
  const all = descriptionParagraphs(summary)
  const [first, ...rest] = all
  if (first !== undefined && /\bin Elden Ring\.?$/.test(first) && !/\d/.test(first) && first.length < 200) return rest
  return all
}

/**
 * L'objet a-t-il un effet à afficher (ligne d'effet, détails du wiki ou description du jeu) ?
 * @param entry Objet.
 * @returns Vrai si au moins l'un des trois existe.
 */
export function hasItemEffect(entry: ItemEntry): boolean {
  // Longueur : l'absence de détails d'effet veut dire « aucun détail », pas une valeur à afficher.
  return Boolean(entry.effect) || (entry.effect_details?.length ?? 0) > 0 || Boolean(entry.description)
}

/**
 * Un objet est-il une Bell Bearing (objet clé qui débloque des articles chez les Twin Maiden Husks ou un marchand) ?
 * @param entry Objet.
 * @returns Vrai pour une Bell Bearing.
 */
export function isBellBearing(entry: ItemEntry): boolean {
  return ('type' in entry && entry.type === 'Bell Bearing') || /Bell Bearings/.test(entry.category)
}

/**
 * Alertes de qualité d'un objet : effet absent, munition sans valeur d'attaque ou de critique, obtention absente.
 * L'obtention n'est signalée absente que si l'infobox ne dit rien non plus (« Obtention (infobox) » suffit alors à orienter).
 * @param entry Objet.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function itemAlerts(entry: ItemEntry): SheetAlert[] {
  const attack = itemAttack(entry)
  const ammo = 'attack_power' in entry
  const hasObtained = field(entry.infobox, ['obtained', 'loot', 'drop']) !== undefined
  return presentAlerts([
    missingFieldsAlert([
      { label: 'effet', missing: !hasItemEffect(entry) },
      { label: 'puissance d’attaque', missing: ammo && (attack?.damages.some((d) => d.value === null) ?? false) },
      { label: 'critique', missing: ammo && attack?.critical === null },
    ]),
    hasObtained ? null : acquisitionAlert(acquisitionViews(entry)),
  ])
}
