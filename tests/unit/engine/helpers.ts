// Accès communs des tests du moteur : fixtures réelles (tests/fixtures/) et lecture ciblée de data/ pour les armes absentes des fixtures.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { slug } from '../../../src/data/slug.ts'
import type { BossEntry, BossFile } from '../../../src/data/types/bosses.ts'
import type { OriginEntry, OriginFile } from '../../../src/data/types/origins.ts'
import type { CalcTables, TablesFile } from '../../../src/data/types/tables.ts'
import type { WeaponEntry, WeaponFile, WeaponRaw } from '../../../src/data/types/weapon.ts'
import type { Attributes, WeaponFileKey } from '../../../src/engine/types.ts'

const ROOT = process.cwd()

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(ROOT, ...parts), 'utf-8')) as T
}

/**
 * Tables de calcul de la fixture `tables.json` (coûts en runes, PV, FP, endurance, charge, bénédiction).
 * @returns Les tables.
 */
export function tables(): CalcTables {
  return readJson<TablesFile>('tests', 'fixtures', 'tables.json').tables
}

/**
 * Arme préparée d'une fixture d'armes.
 * @param file Fichier d'armes.
 * @param id Identifiant de l'arme.
 * @returns L'arme ; lève une erreur si elle est absente de la fixture.
 */
export function weapon(file: WeaponFileKey, id: string): WeaponEntry {
  const found = readJson<WeaponFile>('tests', 'fixtures', `${file}.json`).entries.find((w) => w.id === id)
  if (found === undefined) throw new Error(`fixture : arme ${id} absente de ${file}`)
  return found
}

/**
 * Origines de la fixture `origins.json`.
 * @returns Les dix origines du jeu de base et les deux du Tarnished Pack.
 */
export function origins(): readonly OriginEntry[] {
  return readJson<OriginFile>('tests', 'fixtures', 'origins.json').entries
}

/**
 * Page de boss de la fixture `bosses.json`.
 * @param id Identifiant de la page.
 * @returns La page et ses rencontres ; lève une erreur si elle est absente.
 */
export function boss(id: string): BossEntry {
  const found = readJson<BossFile>('tests', 'fixtures', 'bosses.json').entries.find((b) => b.id === id)
  if (found === undefined) throw new Error(`fixture : boss ${id} absent`)
  return found
}

/**
 * Arme brute de data/ (sans `derived`), avec son id calculé comme la préparation (slug de `wiki_page`).
 * @param file Fichier d'armes.
 * @param name Nom exact de l'arme.
 * @returns L'arme brute et son id ; lève une erreur si elle est absente.
 */
export function rawWeapon(file: WeaponFileKey, name: string): WeaponRaw & { id: string } {
  const found = readJson<{ weapons: WeaponRaw[] }>('data', `${file}.json`).weapons.find((w) => w.name === name)
  if (found === undefined) throw new Error(`data : arme ${name} absente de ${file}`)
  return { ...found, id: slug(found.wiki_page) }
}

/**
 * Liste brute d'un fichier de data/.
 * @param file Nom du fichier, sans `.json`.
 * @param listKey Clé de la liste dans le fichier (`weapons`, `bosses`…).
 * @returns Les entrées, ou une liste vide si la clé manque.
 */
export function rawList<T>(file: string, listKey: string): T[] {
  return readJson<Record<string, T[]>>('data', `${file}.json`)[listKey] ?? []
}

/**
 * Profil de test : 10 partout, sauf les valeurs données.
 * @param over Attributs à remplacer.
 * @returns Les huit attributs.
 */
export function attrs(over: Partial<Attributes> = {}): Attributes {
  return { vig: 10, mnd: 10, end: 10, str: 10, dex: 10, int: 10, fai: 10, arc: 10, ...over }
}

/**
 * Attributs dans l'ordre VIG, MND, END, STR, DEX, INT, FAI, ARC (ordre des cas de test de calculs.md).
 * @param values Huit valeurs ; une valeur manquante vaut 0, ce qui rend la cible invalide (cas de test volontaires).
 * @returns Les attributs en clés courtes.
 */
export function ordered(values: readonly number[]): Attributes {
  const [vig = 0, mnd = 0, end = 0, str = 0, dex = 0, int = 0, fai = 0, arc = 0] = values
  return { vig, mnd, end, str, dex, int, fai, arc }
}
