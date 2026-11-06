// Modèle de la fiche de PNJ : valeurs clés de l'infobox, rangement des tableaux hétérogènes du wiki (boutique, équipement, rencontres, objets de quête),
// étapes de quête en groupes cochables et alertes. Le wiki range ces tableaux de façon variable selon la page : la classification se lit sur les en-têtes,
// jamais sur la position, et un tableau inconnu est gardé tel quel plutôt que perdu.

import type { WikiTableData } from '../../../../data/types/common.ts'
import type { NpcEntry } from '../../../../data/types/npcs.ts'
import type { RawWikiCell, RawWikiRow } from '../../../../ui/wikiTable.ts'
import { isShopTable } from '../shop/shopModel.ts'
import { parseNameEntry, presentAlerts, missingFieldsAlert } from '../sheetModel.ts'
import type { NameEntry, SheetAlert, SheetFact } from '../sheetModel.ts'

// ─── Valeurs clés ──────────────────────────────────────────────────────────────

/**
 * Valeurs clés d'un PNJ : rôle, type, lieu, régions, statut, alias, race, appartenance, invocation, runes lâchées et butin (infobox du wiki).
 * Le rôle et le lieu absents s'affichent « Non documenté » ; les autres lignes sont omises quand le wiki ne les écrit pas.
 * @param npc PNJ.
 * @returns Les valeurs dans l'ordre d'affichage.
 */
export function npcFacts(npc: NpcEntry): SheetFact[] {
  const info = npc.infobox
  const text = (key: string): string | null => {
    const value = info[key]
    return typeof value === 'string' && value !== '' ? value : null
  }
  const regions = npc.regions.length > 0 ? npc.regions.join(' / ') : npc.listed_region
  const facts: SheetFact[] = [
    { id: 'role', label: 'Rôle', value: text('role') },
    { id: 'location', label: 'Lieu', value: text('location'), linkKinds: ['location'] },
    { id: 'regions', label: 'Région', value: regions, linkKinds: ['location'], nameList: true },
  ]
  const optional: readonly (readonly [string, string, SheetFact['linkKinds']?])[] = [
    ['type', 'Type'],
    ['status', 'Statut'],
    ['aka', 'Alias'],
    ['race', 'Race'],
    ['affiliation', 'Appartenance'],
    ['summon', 'Invocation'],
  ]
  for (const [key, label, linkKinds] of optional) {
    const value = text(key)
    if (value !== null) facts.push({ id: key, label, value, ...(linkKinds ? { linkKinds } : {}) })
  }
  const runes = info.runes
  if (typeof runes === 'number') facts.push({ id: 'runes', label: 'Runes lâchées', value: runes, unit: 'runes' })
  const hp = info.hp
  if (typeof hp === 'number' || typeof hp === 'string') facts.push({ id: 'hp', label: 'PV', value: hp })
  const drops = text('drops')
  if (drops !== null) facts.push({ id: 'drops', label: 'Butin', value: drops.replace(/\s*[\n;]+\s*/g, ' ; '), linkKinds: ['item', 'weapon', 'armor'] })
  return facts
}

/**
 * Alertes de qualité d'un PNJ : rôle ou lieu non documentés, et note de « PNJ critique » du wiki.
 * @param npc PNJ.
 * @returns Les alertes, dans l'ordre d'affichage.
 */
export function npcAlerts(npc: NpcEntry): SheetAlert[] {
  const info = npc.infobox
  const critical: SheetAlert | null =
    npc.critical_npc_note === undefined
      ? null
      : {
          id: 'critical-npc',
          tone: 'info',
          title: 'PNJ critique.',
          text: 'Le wiki le range parmi les PNJ à ne pas manquer.',
          detail: npc.critical_npc_note,
        }
  return presentAlerts([
    critical,
    missingFieldsAlert([
      { label: 'le rôle', missing: typeof info.role !== 'string' },
      { label: 'le lieu', missing: typeof info.location !== 'string' },
    ]),
  ])
}

// ─── Tableaux hétérogènes ──────────────────────────────────────────────────────

/** Rôle d'un tableau d'une page de PNJ, lu sur ses en-têtes. */
export type NpcTableRole = 'shop' | 'quest-items' | 'equipment' | 'encounters' | 'other'

/** Tableau d'un PNJ avec son rôle. */
export interface NpcTable {
  readonly role: NpcTableRole
  readonly rows: WikiTableData
}

/** En-têtes de colonne du wiki (anglais) → libellés de l'interface (français). */
const HEADER_LABELS: Readonly<Record<string, string>> = {
  'right hand': 'Main droite',
  'left hand': 'Main gauche',
  armor: 'Armure',
  items: 'Objets',
  spells: 'Sorts',
  talismans: 'Talismans',
  location: 'Lieu',
  hp: 'PV',
  runes: 'Runes',
  drops: 'Butin',
  notes: 'Notes',
  item: 'Objet',
  'item name': 'Objet',
  requirements: 'Condition',
}

/**
 * Classe un tableau d'après les en-têtes de sa première ligne.
 * @param rows Lignes du tableau.
 * @returns Le rôle : boutique (objet et prix), objets de quête (objet et conditions), équipement (mains, armure, sorts), rencontres (lieu), ou autre.
 */
export function classifyNpcTable(rows: WikiTableData): NpcTableRole {
  if (isShopTable(rows)) return 'shop'
  const first = rows[0]
  if (first === undefined || Array.isArray(first)) return 'other'
  const names = Object.keys(first as Readonly<Record<string, RawWikiCell>>).map((k) => k.trim().toLowerCase())
  const has = (...keys: string[]): boolean => keys.some((k) => names.includes(k))
  if (has('item', 'item name') && has('requirements')) return 'quest-items'
  if (has('right hand', 'left hand', 'armor', 'spells', 'talismans')) return 'equipment'
  if (has('location')) return 'encounters'
  return 'other'
}

/**
 * Traduit les en-têtes connus d'un tableau en libellés français ; les en-têtes inconnus et les cellules sont gardés tels quels.
 * @param rows Lignes d'un tableau (listes de cellules inchangées).
 * @returns Les mêmes lignes avec les en-têtes traduits.
 */
export function translateHeaders(rows: WikiTableData): RawWikiRow[] {
  return rows.map((row): RawWikiRow => {
    if (Array.isArray(row)) return row as readonly RawWikiCell[]
    const out: Record<string, RawWikiCell> = {}
    for (const [key, value] of Object.entries(row as Readonly<Record<string, RawWikiCell>>)) {
      out[HEADER_LABELS[key.trim().toLowerCase()] ?? key] = value
    }
    return out
  })
}

/**
 * Tous les tableaux d'une page de PNJ, avec leur rôle : boutique, informations de base (`character_information`), équipement, aperçu et quête.
 * La position d'un tableau ne dit pas à quel intertitre `[Equipment]` il se rapporte (les intertitres sans tableau sont omis par l'extraction) : seul son contenu compte.
 * @param npc PNJ.
 * @returns Les tableaux, dans l'ordre : boutique, informations, équipement.
 */
export function npcTables(npc: NpcEntry): NpcTable[] {
  const sources: readonly (readonly WikiTableData[] | undefined)[] = [
    npc.shop_inventory?.tables,
    npc.character_information?.tables,
    npc.equipment?.tables,
  ]
  return sources.flatMap((tables) => (tables ?? []).filter((t) => t.length > 0).map((rows): NpcTable => ({ role: classifyNpcTable(rows), rows })))
}

/** Intertitres vides que le wiki place avant ses tableaux (`[Basic Info]`, `[Equipment]`…) : sans leur tableau, ils ne disent rien. */
const PLACEHOLDER_HEADING = /^\[(basic info|equipment|quest items?|summon sign|shop inventory|questline[^\]]*|encounters)\]$/i

/**
 * Lignes de texte d'une section qui disent quelque chose : les intertitres vides du wiki sont retirés, les phrases (« Goldmask cannot be made hostile… ») restent.
 * @param section Section du wiki, ou `undefined`.
 * @returns Les lignes à afficher.
 */
export function meaningfulLines(section: { readonly text: readonly string[] } | readonly string[] | undefined): string[] {
  if (section === undefined) return []
  const lines = Array.isArray(section) ? (section as readonly string[]) : (section as { readonly text: readonly string[] }).text
  return lines.filter((line) => line.trim() !== '' && !PLACEHOLDER_HEADING.test(line.trim()))
}

/** Objet de quête : nom, et ce qu'il faut faire pour l'obtenir. */
export interface QuestItemRow {
  readonly item: NameEntry
  /** Condition d'obtention, telle que dans le wiki ; `null` : non documentée. */
  readonly requirement: string | null
}

/**
 * Lignes d'un tableau d'objets de quête (« Item / Requirements »).
 * @param rows Lignes du tableau.
 * @returns Une ligne par objet, avec sa quantité éventuelle (« Festering Bloody Finger x5 »).
 */
export function questItemRows(rows: WikiTableData): QuestItemRow[] {
  const out: QuestItemRow[] = []
  for (const row of rows) {
    if (Array.isArray(row)) continue
    const rec = row as Readonly<Record<string, RawWikiCell>>
    const read = (...keys: string[]): RawWikiCell | undefined => {
      for (const [name, value] of Object.entries(rec)) if (keys.includes(name.trim().toLowerCase())) return value
      return undefined
    }
    const item = read('item', 'item name')
    if (typeof item !== 'string' || item.trim() === '') continue
    const requirement = read('requirements')
    out.push({ item: parseNameEntry(item), requirement: typeof requirement === 'string' && requirement !== '' ? requirement : null })
  }
  return out
}

// ─── Quête ─────────────────────────────────────────────────────────────────────

/** Étape d'une quête : texte du wiki et lignes imbriquées (`→`). */
export interface QuestStep {
  /** Identifiant stable dans la page (`groupe-étape`), clé de la coche locale. */
  readonly id: string
  readonly text: string
  /** L'étape commence par « (Optional) » : le préfixe est retiré du texte et signalé par un badge. */
  readonly optional: boolean
  /** Lignes qui précisent l'étape, avec leur préfixe `→` (une puce par ligne, imbriquée selon le nombre de flèches). */
  readonly sub: readonly string[]
}

/** Groupe d'étapes sous un titre de lieu de la quête (« Murkwater Cave », « (Optional) Liurnia of the Lakes »). */
export interface QuestGroup {
  readonly id: string
  /** Titre du groupe, sans « (Optional) » ; `null` pour les étapes qui précèdent tout titre. */
  readonly title: string | null
  readonly optional: boolean
  readonly steps: readonly QuestStep[]
}

const OPTIONAL_PREFIX = /^\(optional\)\s*/i

/**
 * Une ligne de questline est un titre de lieu si elle est courte, sans ponctuation finale de phrase, ne ressemble pas à une instruction numérotée
 * ni à une flèche (« A -> B »), et commence par une majuscule ou « ( ». Lecture de présentation : un titre pris pour une étape reste affiché, rien n'est perdu.
 * @param line Ligne de texte de la quête, sans espaces de bord.
 * @returns Vrai pour un titre de lieu.
 */
export function isQuestHeading(line: string): boolean {
  if (line.length === 0 || line.length > 60) return false
  if (/^→/.test(line) || /^\d+[.)]\s/.test(line) || line.includes('->')) return false
  if (/[.!?:;,]$/.test(line)) return false
  return /^[A-Z(]/.test(line)
}

/**
 * Découpe la progression de quête du wiki en groupes d'étapes cochables.
 * Une ligne `[Titre]` ou un titre de lieu (`isQuestHeading`) ouvre un groupe ; une autre ligne est une étape ; une ligne `→` précise l'étape qui la précède.
 * Les intertitres vides du wiki (`[Questline steps]`) sont ignorés.
 * @param lines Texte de `questline`.
 * @returns Les groupes non vides, dans l'ordre.
 */
export function questGroups(lines: readonly string[]): QuestGroup[] {
  interface MutableStep { text: string; optional: boolean; sub: string[] }
  interface MutableGroup { title: string | null; optional: boolean; steps: MutableStep[] }
  const groups: MutableGroup[] = []
  let current: MutableGroup | null = null

  const open = (title: string | null, optional: boolean): MutableGroup => {
    const group: MutableGroup = { title, optional, steps: [] }
    groups.push(group)
    return group
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const bracket = /^\[([^\]]+)\]$/.exec(line)
    if (bracket) {
      if (!PLACEHOLDER_HEADING.test(line)) current = open(bracket[1]!.trim(), false)
      continue
    }
    if (line.startsWith('→')) {
      const last = current?.steps[current.steps.length - 1]
      if (last) last.sub.push(line)
      else {
        current ??= open(null, false)
        current.steps.push({ text: line.replace(/^→+\s*/, ''), optional: false, sub: [] })
      }
      continue
    }
    if (isQuestHeading(line)) {
      current = open(line.replace(OPTIONAL_PREFIX, ''), OPTIONAL_PREFIX.test(line))
      continue
    }
    current ??= open(null, false)
    current.steps.push({ text: line.replace(OPTIONAL_PREFIX, ''), optional: OPTIONAL_PREFIX.test(line), sub: [] })
  }

  return groups
    .filter((g) => g.steps.length > 0)
    .map((g, gi): QuestGroup => ({
      id: String(gi),
      title: g.title,
      optional: g.optional,
      steps: g.steps.map((s, si): QuestStep => ({ id: `${gi}-${si}`, text: s.text, optional: s.optional, sub: s.sub })),
    }))
}

/**
 * Nombre d'étapes d'une quête.
 * @param groups Groupes de `questGroups`.
 * @returns Le total des étapes.
 */
export function questStepCount(groups: readonly QuestGroup[]): number {
  return groups.reduce((n, g) => n + g.steps.length, 0)
}
