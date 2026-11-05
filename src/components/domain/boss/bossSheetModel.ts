// Modèle de la fiche boss : lecture des rencontres, indicateurs, PV et runes, statuts, butin, notes de combat et suggestions d'armes.
// Fonctions pures (aucun store, aucune interface) : elles transforment les données de `data/` et les résultats du moteur en objets prêts à afficher.
// Références : docs/architecture.md § 3.3 (clés de rencontre), § 3.4 (sémantique des champs), docs/design/ds/calculs.md, « Niveau recommandé d'un boss et préparation ».

import type { EntityKind } from '../../../data/datasets.ts'
import { NEGATION_KEYS, STATUS_KEYS } from '../../../data/keys.ts'
import type { NegationKey, StatusKey } from '../../../data/keys.ts'
import { resolveName } from '../../../data/links.ts'
import type { NameIndex } from '../../../data/links.ts'
import { normalizeText } from '../../../data/slug.ts'
import type { BossEntry, Encounter } from '../../../data/types/bosses.ts'
import type { BossLevel } from '../../../engine/bossLevel.ts'
import { indexEncounters } from '../../../engine/encounters.ts'
import { encounterStage } from '../../../engine/stage.ts'
import type { StageInfo } from '../../../engine/stage.ts'
import type { Calc } from '../../../engine/types.ts'
import { formatDecimal } from '../../../ui/format.ts'
import { DLC_ZONE_LABELS, STAGE_LABELS } from '../../../ui/labels.ts'
import type { BossFlagModel, BossWeaponSuggestion, CountModel, EncounterModel, LootGroupModel, LootItemModel, NoteGroupModel, StatusRowModel } from './types.ts'

/** Indicateurs de la page « Bosses » du wiki, en français (icônes du sprite du design system). */
const FLAGS: Readonly<Record<string, { label: string; icon: string; title: string }>> = {
  shardbearer: { label: 'Porteur de Grande Rune', icon: 'rune', title: 'Ce boss laisse une Grande Rune' },
  remembrance_base_game: { label: 'Remembrance', icon: 'trade', title: 'Ce boss laisse une Remembrance (jeu de base)' },
  remembrance_dlc: { label: 'Remembrance', icon: 'trade', title: 'Ce boss laisse une Remembrance (Shadow of the Erdtree)' },
  required_to_access_dlc: { label: 'Requis pour le DLC', icon: 'key', title: 'À vaincre pour accéder à Shadow of the Erdtree' },
  mandatory_base_game: { label: 'Obligatoire', icon: 'check-c', title: 'Boss obligatoire du jeu de base' },
  mandatory_dlc: { label: 'Obligatoire (DLC)', icon: 'check-c', title: 'Boss obligatoire de Shadow of the Erdtree' },
}

/**
 * Indicateurs d'un boss, dans l'ordre des données, sans doublon de libellé (deux indicateurs « Remembrance » ne s'affichent qu'une fois).
 * @param boss Page de boss.
 * @returns Les indicateurs à afficher ; vide si le boss n'en a aucun.
 */
export function bossFlags(boss: Pick<BossEntry, 'flags'>): BossFlagModel[] {
  const out: BossFlagModel[] = []
  for (const id of boss.flags) {
    const flag = FLAGS[id]
    if (flag !== undefined && !out.some((f) => f.label === flag.label)) out.push({ id, ...flag })
  }
  return out
}

/**
 * Rang(s) du boss, tels que la navbox du wiki les nomme (affichés en anglais, comme les données).
 * @param boss Page de boss.
 * @returns Les rangs séparés par une virgule, ou `null` si la page n'en a pas.
 */
export function bossRank(boss: Pick<BossEntry, 'tier'>): string | null {
  return boss.tier.length > 0 ? boss.tier.join(', ') : null
}

/**
 * Complément qui distingue une rencontre d'une autre dans les onglets : variante, suite du nom après un tiret, sinon première région.
 * @param enc Rencontre.
 * @param location Lieu affiché de la rencontre.
 * @returns Le complément, ou `null` s'il répète le lieu.
 */
function distinguishingNote(enc: Encounter, location: string | null): string | null {
  const same = (text: string): boolean => location !== null && normalizeText(location).includes(normalizeText(text))
  if (enc.variant !== undefined && enc.variant !== '' && !same(enc.variant)) return enc.variant
  const parts = enc.name.split(/\s[–-]\s/)
  if (parts.length > 1) return parts.slice(1).join(' – ')
  const region = enc.regions[0]
  return region !== undefined && !same(region) ? region : null
}

/**
 * Rencontres d'une page de boss, dans l'ordre des données. Une page sans rencontre (12 boss) donne une rencontre unique sans données de combat.
 * @param boss Page de boss préparée.
 * @returns Les rencontres, vide si la page n'a ni rencontre ni clé de page.
 */
export function encounterModels(boss: BossEntry): EncounterModel[] {
  if (boss.encounters.length === 0) {
    const key = boss.derived.pageKey
    const location = boss.character_location ?? null
    return key === null ? [] : [{ id: boss.id, key, location, note: null, source: boss.source, encounter: null }]
  }
  return boss.encounters.map((encounter, i) => {
    const identity = boss.derived.encounters[i]
    const location = encounter.location ?? encounter.regions[0] ?? null
    return {
      id: identity?.id ?? String(i + 1),
      key: identity?.key ?? `${boss.id}/${i + 1}`,
      location,
      note: distinguishingNote(encounter, location),
      source: encounter.source,
      encounter,
    }
  })
}

/**
 * Rencontre demandée par `?rencontre=` : la rencontre dont l'identifiant correspond, sinon la première (valeur absente ou inconnue).
 * @param models Rencontres de la page.
 * @param requested Valeur brute du paramètre de requête.
 * @returns La rencontre à afficher, ou `null` si la page n'en a aucune.
 */
export function pickEncounter(models: readonly EncounterModel[], requested: unknown): EncounterModel | null {
  const wanted = Array.isArray(requested) ? requested[0] : requested
  return models.find((m) => m.id === wanted) ?? models[0] ?? null
}

/**
 * PV ou runes d'une rencontre : nombres trouvés par la préparation des données et texte du wiki qui complète (lieux, phases, « jusqu'à 65 % »).
 * `null` au wiki → aucune valeur : l'interface écrit « Non documenté », jamais 0.
 * @param raw Texte du wiki (`hp`, `runes`), ou `null`.
 * @param values Nombres trouvés dans ce texte (`hp_values`, `runes_values`).
 * @returns Les valeurs, le texte nettoyé s'il dit plus que les nombres, et le texte brut.
 */
export function countModel(raw: string | null | undefined, values: readonly number[]): CountModel {
  const text = raw ?? null
  if (values.length === 0 || text === null) return { values: [], note: null, raw: text }
  const cleaned = text.replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const plain = cleaned.replace(/[,\s]/g, '')
  const onlyNumber = values.length === 1 && plain === String(values[0])
  return { values, note: onlyNumber ? null : cleaned, raw: text }
}

/**
 * Résistances aux statuts d'une rencontre, un statut par ligne. Immunité : valeur exactement `"Immune"`. Les autres valeurs sont reprises telles quelles
 * du wiki (nombre, `"no"`, texte à plusieurs valeurs : docs/architecture.md § 3.4) ; un champ absent est « Non documenté ».
 * @param enc Rencontre (`status_resistance`).
 * @returns Les sept statuts, ou `null` si le wiki ne donne aucune résistance pour cette rencontre.
 */
export function statusRows(enc: Pick<Encounter, 'status_resistance'> | null): StatusRowModel[] | null {
  const res = enc?.status_resistance
  if (res === undefined) return null
  return STATUS_KEYS.map((key): StatusRowModel => {
    const value = res[key]
    if (value === undefined) return { key, kind: 'missing', text: null, number: null }
    if (value === 'Immune') return { key, kind: 'immune', text: null, number: null }
    if (typeof value === 'number') return { key, kind: 'value', text: String(value), number: value }
    const simple = /^\d+$/.test(value.trim()) ? Number(value.trim()) : null
    return { key, kind: 'value', text: value, number: simple }
  })
}

/**
 * Oui, Non ou `null` pour un indicateur booléen du wiki (`parryable`, `critable`) ; `undefined` = non documenté.
 * @param value Valeur de la donnée.
 * @returns « Oui », « Non », ou `null` (« Non documenté »).
 */
export function yesNo(value: boolean | undefined): 'Oui' | 'Non' | null {
  if (value === undefined) return null
  return value ? 'Oui' : 'Non'
}

/**
 * Butin d'une rencontre en groupes : le wiki glisse des titres de lieu (« Limgrave: ») parmi les objets quand les lieux se partagent la rencontre.
 * @param drops Liste `drops` de la rencontre.
 * @returns Les groupes non vides ; un seul groupe sans titre quand la liste n'a pas de titre.
 */
export function lootGroups(drops: readonly string[]): LootGroupModel[] {
  const groups: { title: string | null; items: string[] }[] = []
  for (const line of drops) {
    const text = line.trim()
    if (text === '') continue
    if (text.endsWith(':')) {
      groups.push({ title: text.slice(0, -1).trim(), items: [] })
      continue
    }
    let current = groups[groups.length - 1]
    if (current === undefined) {
      current = { title: null, items: [] }
      groups.push(current)
    }
    current.items.push(text)
  }
  return groups.filter((g) => g.items.length > 0)
}

/** Genres préférés pour résoudre un nom de butin ambigu : objets d'abord, puis équipement. */
const LOOT_KINDS: readonly EntityKind[] = ['item', 'weapon', 'talisman', 'ash', 'armor', 'spell', 'spirit']

/** Libellés français des genres d'entité, pour la mention à côté d'un élément de butin. */
export const KIND_LABELS: Readonly<Record<EntityKind, string>> = {
  weapon: 'Arme',
  ash: 'Cendre de guerre',
  armor: 'Armure',
  talisman: 'Talisman',
  spell: 'Sort',
  spirit: 'Cendre d’esprit',
  item: 'Objet',
  boss: 'Boss',
  location: 'Lieu',
  npc: 'PNJ',
  origin: 'Origine',
  mechanic: 'Mécanique',
}

/**
 * Résout un élément de butin en lien vers sa fiche. Le nom doit correspondre exactement à une entité (`resolveName`) ; deux écritures du wiki
 * sont acceptées en repli : « Ash of War: <nom> » (cendre de guerre) et « <nom> +1 » (niveau d'amélioration ajouté au nom).
 * @param name Nom de l'objet dans `drops`.
 * @param index Index des noms (fichier `search-index`), ou `null` s'il n'est pas chargé (texte simple).
 * @returns L'élément, avec sa référence quand le nom se résout.
 */
export function resolveLootItem(name: string, index: NameIndex | null): LootItemModel {
  if (index === null) return { name, ref: null, kind: null }
  const attempts: { text: string; kinds: readonly EntityKind[] }[] = [{ text: name, kinds: LOOT_KINDS }]
  const ash = /^Ash of War:\s*(.+)$/i.exec(name)
  if (ash?.[1] !== undefined) attempts.push({ text: ash[1], kinds: ['ash'] })
  const upgraded = /^(.+?)\s\+\d+$/.exec(name)
  if (upgraded?.[1] !== undefined) attempts.push({ text: upgraded[1], kinds: LOOT_KINDS })
  for (const attempt of attempts) {
    const ref = resolveName(index, attempt.text, attempt.kinds)
    if (ref !== null) return { name, ref, kind: ref.slice(0, ref.indexOf(':')) as EntityKind }
  }
  return { name, ref: null, kind: null }
}

/**
 * Coupe les notes de combat d'une page en groupes : une ligne qui finit par « = » ouvre le groupe d'une variante ou d'un lieu (« Mohg, the Omen= »).
 * @param notes `fight_notes` de la page, ou `undefined`.
 * @returns Les groupes non vides, dans l'ordre ; le premier est sans titre quand des notes précèdent tout titre.
 */
export function noteGroups(notes: readonly string[] | undefined): NoteGroupModel[] {
  const groups: { title: string | null; lines: string[] }[] = [{ title: null, lines: [] }]
  for (const line of notes ?? []) {
    const text = line.trim()
    if (text === '') continue
    if (text.endsWith('=')) {
      groups.push({ title: text.slice(0, -1).trim(), lines: [] })
      continue
    }
    groups[groups.length - 1]?.lines.push(line)
  }
  return groups.filter((g) => g.lines.length > 0)
}

/**
 * Notes à afficher pour une rencontre : les notes générales, puis le groupe dont le titre est la variante, le nom ou le lieu de la rencontre ;
 * si aucun titre ne correspond, tous les groupes (le titre aide alors à les distinguer).
 * @param groups Groupes de `noteGroups`.
 * @param enc Rencontre affichée, ou `null`.
 * @returns Les groupes à afficher.
 */
export function notesFor(groups: readonly NoteGroupModel[], enc: Pick<Encounter, 'name' | 'variant' | 'location'> | null): NoteGroupModel[] {
  const general = groups.filter((g) => g.title === null)
  const titled = groups.filter((g) => g.title !== null)
  if (enc === null || titled.length === 0) return [...groups]
  const wanted = [enc.variant, enc.name, enc.location].filter((x): x is string => typeof x === 'string' && x !== '').map(normalizeText)
  const matching = titled.filter((g) => wanted.includes(normalizeText(g.title ?? '')))
  return matching.length > 0 ? [...general, ...matching] : [...groups]
}

/**
 * Niveau recommandé sous forme de `Calc<number>` pour `CxCalcValue` : même explication et même estimation, valeur réduite au niveau.
 * @param calc Résultat de `recommendedLevel`.
 * @returns Le niveau calculé.
 */
export function levelCalc(calc: Calc<BossLevel>): Calc<number> {
  return { value: calc.value?.level ?? null, estimate: calc.estimate, explanation: calc.explanation }
}

/** Origine du niveau recommandé d'une rencontre. */
export type LevelBasis = 'dlc-entry' | 'position-and-runes' | 'position' | 'runes' | 'none'

/**
 * Sur quoi repose le niveau recommandé (calculs.md, M1, M2, M3 et « Boss du DLC ») : lecture des composantes déjà calculées, aucun nouveau calcul.
 * @param calc Résultat de `recommendedLevel`.
 * @returns `dlc-entry` (niveau d'entrée du DLC), `position-and-runes` (M3), `position` (M1 seul), `runes` (M2 seul) ou `none` (non estimé).
 */
export function levelBasis(calc: Calc<BossLevel> | null): LevelBasis {
  const level = calc?.value
  if (level === null || level === undefined) return 'none'
  if (level.dlcEntry) return 'dlc-entry'
  if (level.m1 !== null && level.m2 !== null) return 'position-and-runes'
  if (level.m1 !== null) return 'position'
  return level.m2 !== null ? 'runes' : 'none'
}

/**
 * Étape de partie de la rencontre, pour « Dans l'histoire » (calculs.md, règle 2 de l'étape d'une arme appliquée aux régions de la rencontre).
 * @param boss Page de boss.
 * @param key Clé de la rencontre.
 * @returns L'étape et la région qui la décide, ou `null` si les régions ne sont pas classées.
 */
export function storyStage(boss: BossEntry, key: string): StageInfo | null {
  return encounterStage(indexEncounters([boss]), key).value
}

/**
 * Libellé français d'une étape : « Début, Limgrave », « DLC, Entrée ».
 * @param stage Étape de la rencontre.
 * @returns Le texte à afficher.
 */
export function stageText(stage: StageInfo): string {
  const parts = [STAGE_LABELS[stage.stage]]
  if (stage.dlcZone !== null) parts.push(DLC_ZONE_LABELS[stage.dlcZone])
  else if (stage.region !== null) parts.push(stage.region)
  return parts.join(', ')
}

/** Résultat de la lecture des suggestions d'armes. */
export interface WeaponSuggestions {
  /** Faux tant que le getter `weaponsAgainst` n'existe pas ou n'a pas pu répondre (fichiers d'armes non chargés). */
  readonly available: boolean
  readonly items: readonly BossWeaponSuggestion[]
}

/**
 * Lit les armes du profil efficaces contre une rencontre, par le getter `weaponsAgainst(clé de rencontre)` du store `analysis`.
 * Le getter est demandé à la logique : tant qu'il manque, l'état « indisponible » est rendu. Une réponse est acceptée si c'est une liste
 * ou un `Calc` dont la valeur est une liste ; les entrées incomplètes sont écartées.
 * @param getter Le getter du store (fonction), ou toute autre valeur si le store ne l'expose pas encore.
 * @param key Clé de la rencontre.
 * @returns Les suggestions et leur disponibilité.
 */
export function readWeaponSuggestions(getter: unknown, key: string): WeaponSuggestions {
  if (typeof getter !== 'function') return { available: false, items: [] }
  const result: unknown = (getter as (k: string) => unknown)(key)
  const list = Array.isArray(result) ? result : isCalcLike(result) && Array.isArray(result.value) ? result.value : null
  if (list === null) return { available: false, items: [] }
  const items = list.filter(
    (x): x is BossWeaponSuggestion =>
      typeof x === 'object' && x !== null && typeof (x as { ref?: unknown }).ref === 'string' && typeof (x as { name?: unknown }).name === 'string' && Array.isArray((x as { requirements?: unknown }).requirements),
  )
  return { available: true, items }
}

/** Vrai pour un objet qui porte une propriété `value` (forme d'un `Calc`). */
function isCalcLike(x: unknown): x is { value: unknown } {
  return typeof x === 'object' && x !== null && 'value' in x
}

/** Type de dégâts infligé par le boss : type de dégâts, statut, ou texte du wiki non reconnu. */
export type DealtChip =
  | { readonly kind: 'damage'; readonly key: NegationKey }
  | { readonly kind: 'status'; readonly key: StatusKey }
  | { readonly kind: 'text'; readonly text: string }

/** Valeurs de `damage_types_dealt` qui sont des statuts (clés abrégées du wiki) vers les clés de statut des données. */
const DEALT_STATUS: Readonly<Record<string, StatusKey>> = { poison: 'poison', frost: 'frostbite', bleed: 'blood_loss' }

/**
 * Dégâts infligés par la rencontre (`damage_types_dealt`) : un type de dégâts ou un statut reconnu devient une puce, le reste reste du texte.
 * @param dealt Valeurs du wiki, ou `undefined`.
 * @returns Les puces, vide si le wiki ne donne rien.
 */
export function dealtChips(dealt: readonly string[] | undefined): DealtChip[] {
  return (dealt ?? []).map((value): DealtChip => {
    const key = value.trim().toLowerCase()
    if ((NEGATION_KEYS as readonly string[]).includes(key)) return { kind: 'damage', key: key as NegationKey }
    const status = DEALT_STATUS[key]
    return status === undefined ? { kind: 'text', text: value } : { kind: 'status', key: status }
  })
}

/** Donnée de combat du wiki affichée en liste : libellé français, valeur telle que dans les données. */
export interface CombatFact {
  readonly label: string
  readonly value: string
}

/**
 * Autres données de combat de la rencontre, seulement celles que le wiki documente (un champ absent n'est pas listé).
 * @param enc Rencontre, ou `null`.
 * @returns Les lignes, dans un ordre fixe.
 */
export function combatFacts(enc: Encounter | null): CombatFact[] {
  if (enc === null) return []
  const out: CombatFact[] = []
  const add = (label: string, value: string | number | undefined): void => {
    if (value !== undefined && String(value).trim() !== '') out.push({ label, value: typeof value === 'number' ? formatDecimal(value) : value })
  }
  add('Faiblesse indiquée par le wiki', enc.weakness)
  add('Point faible', enc.weak_spot)
  add('Défense', enc.defense)
  add('Posture', enc.poise)
  add('Cendres d’esprit autorisées', yesNo(enc.spirit_ashes_allowed) ?? undefined)
  add('Invocation de PNJ possible', yesNo(enc.npc_summon_available) ?? undefined)
  add('Invocations disponibles', enc.summons_available)
  return out
}
