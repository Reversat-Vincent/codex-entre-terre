// Normalisation de `acquisition[].method` (champ dérivé `methods`, docs/architecture.md § 3.2).
// Table explicite construite sur les 49 valeurs brutes de data/ ; une valeur inconnue est classée `other` et comptée dans le rapport.

import type { AcquisitionMethod } from '../../src/data/types/common.ts'

/**
 * Méthode normalisée de chaque valeur brute, en minuscules.
 * Choix : « Equipped », « Equip », « Equipment », « Origin » et « Keepsake » désignent dans data/ un équipement de départ ou un souvenir choisi
 * à la création du personnage (vérifié dans `details`) ; « Area » et « Location » un objet ramassé sur place ; « Remembrance Item » et
 * « Dragon Communion » un échange. Les valeurs composées (« Quest Item / Purchase ») ou étrangères à une méthode (« NOTE », un nom de région)
 * restent `other` : la valeur brute est affichée.
 */
const METHOD_TABLE: Readonly<Record<string, AcquisitionMethod>> = {
  purchase: 'purchase',
  purchased: 'purchase',
  purhase: 'purchase',
  merchant: 'purchase',
  drop: 'drop',
  'random drop': 'drop',
  'random drop & alter garment': 'drop',
  'random drop & alter garments': 'drop',
  'guaranteed drop': 'guaranteed-drop',
  'guaranteed drops': 'guaranteed-drop',
  'guranteed drop': 'guaranteed-drop',
  loot: 'loot',
  'guaranteed loot': 'loot',
  'missable loot': 'loot',
  'loot & alter garments': 'loot',
  area: 'loot',
  location: 'loot',
  trade: 'trade',
  'remembrance item': 'trade',
  'dragon communion': 'trade',
  quest: 'quest',
  'quest reward': 'quest',
  'quest item': 'quest',
  'starting equipment': 'starting',
  'starting weapon': 'starting',
  starting: 'starting',
  origin: 'starting',
  equipped: 'starting',
  equip: 'starting',
  equipment: 'starting',
  keepsake: 'starting',
  craftable: 'other',
  crafting: 'other',
  craft: 'other',
  'quest item / purchase': 'other',
  'quest item/ purchase': 'other',
  'quest/purchase': 'other',
  'quest item / loot': 'other',
  'painting item': 'other',
  note: 'other',
  warning: 'other',
}

/**
 * Normalise une méthode d'acquisition.
 * @param raw Valeur brute de `acquisition[].method`.
 * @returns La méthode normalisée, `null` si la valeur brute est `null`, et `known: false` si la valeur est absente de la table.
 */
export function normalizeMethod(raw: string | null): { method: AcquisitionMethod | null; known: boolean } {
  if (raw === null) return { method: null, known: true }
  const hit = METHOD_TABLE[raw.trim().toLowerCase()]
  return hit === undefined ? { method: 'other', known: false } : { method: hit, known: true }
}
