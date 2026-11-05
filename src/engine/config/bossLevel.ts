// Niveau recommandé d'un boss : paliers de zone du wiki et ancres (M1), calage des runes NG (M2), niveau d'entrée du DLC, bénédiction par sous-zone.
// Source : docs/contenu/decisions-progression.md § 4.2 à § 4.5 et § 5 (décision D14, précision D18) ; méthode : calculs.md, « Niveau recommandé d'un boss
// et préparation ». Aucune de ces valeurs n'est un niveau publié par le wiki : le résultat est une estimation.

import type { DlcZone } from './stages.ts'

/** Ancre de la méthode M1 : palier du tableau « Enemy "Leveling" System » → niveau. */
export interface TierAnchor {
  readonly tier: number
  readonly level: number
}

/** Provenance d'un palier : `wiki` fait du tableau, `deduced` déduction, `choice` plus bas palier quand il y en a plusieurs, `parent` région parente. */
export type TierBasis = 'wiki' | 'deduced' | 'choice' | 'parent'

/** Palier d'une rencontre fixé par la configuration. */
export interface EncounterTier {
  readonly tier: number
  readonly basis: TierBasis
}

/** Configuration du niveau recommandé. */
export interface BossLevelConfig {
  /**
   * Palier de chaque zone du tableau du wiki (page Recommended Level by Location, T1 à T21), sur les noms de région de data/.
   * Quand une zone couvre plusieurs paliers, le plus bas est retenu [conception].
   */
  readonly zoneTier: Readonly<Record<string, EncounterTier>>
  /** Palier des rencontres de la frise (decisions-progression.md § 4.2) : prioritaire sur la zone. */
  readonly encounterTier: Readonly<Record<string, EncounterTier>>
  /** Ancres de l'interpolation linéaire ; au-delà de la dernière, la pente du dernier segment est prolongée. */
  readonly anchors: readonly TierAnchor[]
  /** Calage de M2 : `anchorRunes` runes valent `anchorLevel` (Elden Beast, 500 000 runes = 120) [conception]. */
  readonly runeAnchor: { readonly runes: number; readonly level: number }
  /** Rencontres dont les runes ne mesurent pas le combat (M2 exclue). */
  readonly excludedRunes: readonly string[]
  /** Rencontres dont le M3 le plus haut donne le niveau d'entrée du DLC (le DLC exige ces boss). */
  readonly dlcEntryFrom: readonly string[]
  /** Bénédiction de l'Arbre-Ombre recommandée (méthode B2, simplifiée par sous-zone, D14). */
  readonly blessing: BlessingConfig
}

/** Configuration de la bénédiction recommandée. */
export interface BlessingConfig {
  /** Seule recommandation du wiki : environ 13 fragments pour Messmer (« more or less »), dont le chemin compte 33 fragments. */
  readonly anchor: { readonly fragments: number; readonly pathFragments: number }
  /** Fragments des zones principales du chemin jusqu'à chaque sous-zone (page Scadutree Fragment) [conception]. */
  readonly pathFragments: Readonly<Record<DlcZone, number>>
  /** Table de bénédiction de `mechanics.json` : entrée, section et colonnes lues. */
  readonly table: { readonly entry: string; readonly section: string; readonly levelColumn: string; readonly totalColumn: string }
}

/** Valeurs retenues (decisions-progression.md § 4, D14). */
export const BOSS_LEVEL: BossLevelConfig = {
  zoneTier: {
    // T2 à T4 : Limgrave (Middle, South, North).
    Limgrave: { tier: 2, basis: 'choice' },
    // « Limgrave (North) » = Stormhill [déduction].
    Stormhill: { tier: 4, basis: 'deduced' },
    'Stormveil Castle': { tier: 5, basis: 'wiki' },
    'Siofra River': { tier: 6, basis: 'wiki' },
    // T7 (South) et T8 (North).
    'Liurnia of the Lakes': { tier: 7, basis: 'choice' },
    // T9 (Lower Region) et T10 (Upper Region).
    'Mt. Gelmir': { tier: 9, basis: 'choice' },
    'Ainsel River': { tier: 9, basis: 'wiki' },
    // T10 (West), T11 (South), T13 (North = Dragonbarrow).
    Caelid: { tier: 10, basis: 'choice' },
    'Altus Plateau': { tier: 11, basis: 'wiki' },
    'Leyndell, Royal Capital': { tier: 12, basis: 'wiki' },
    'Nokstella, Eternal City': { tier: 12, basis: 'wiki' },
    'Volcano Manor': { tier: 13, basis: 'wiki' },
    "Greyoll's Dragonbarrow": { tier: 13, basis: 'deduced' },
    Dragonbarrow: { tier: 13, basis: 'deduced' },
    // « Leyndell Sewers ».
    'Subterranean Shunning-Grounds': { tier: 14, basis: 'deduced' },
    'Mountaintops of the Giants': { tier: 15, basis: 'wiki' },
    // T15 (Farum Azula) et T16 (Late Farum Azula).
    'Crumbling Farum Azula': { tier: 15, basis: 'choice' },
    'Leyndell, Ashen Capital': { tier: 17, basis: 'wiki' },
    'Consecrated Snowfield': { tier: 17, basis: 'wiki' },
    // T19 (Haligtree) et T21 (Roots).
    "Miquella's Haligtree": { tier: 19, basis: 'choice' },
    'Mohgwyn Palace': { tier: 19, basis: 'wiki' },
    'Elphael, Brace of the Haligtree': { tier: 20, basis: 'wiki' },
  },
  encounterTier: {
    'margit-the-fell-omen/margit-the-fell-omen': { tier: 4, basis: 'deduced' },
    'godrick-the-grafted/godrick-the-grafted-phase-1': { tier: 5, basis: 'wiki' },
    'red-wolf-of-radagon/red-wolf-of-radagon': { tier: 7, basis: 'choice' },
    'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-1': { tier: 7, basis: 'choice' },
    'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2': { tier: 7, basis: 'choice' },
    'starscourge-radahn/starscourge-radahn': { tier: 10, basis: 'choice' },
    'rykard-lord-of-blasphemy/rykard-lord-of-blasphemy-phase-1': { tier: 13, basis: 'wiki' },
    'mohg-lord-of-blood/mohg-lord-of-blood-phase-1': { tier: 19, basis: 'wiki' },
    'draconic-tree-sentinel/draconic-tree-sentinel-outskirts-draconic-tree-sentinel': { tier: 11, basis: 'parent' },
    'godfrey-first-elden-lord/godfrey-first-elden-lord-leyndell-royal-capital': { tier: 12, basis: 'wiki' },
    'morgott-the-omen-king/morgott-the-omen-king': { tier: 12, basis: 'wiki' },
    'fire-giant/fire-giant': { tier: 15, basis: 'wiki' },
    'godskin-duo/godskin-duo': { tier: 15, basis: 'choice' },
    // Boss de fin de zone = « Late Farum Azula ».
    'maliketh-the-black-blade/maliketh-the-black-blade': { tier: 16, basis: 'deduced' },
    'sir-gideon-ofnir-the-all-knowing/sir-gideon-ofnir-the-all-knowing': { tier: 17, basis: 'wiki' },
    'godfrey-first-elden-lord/godfrey-first-elden-lord-leyndell-ashen-capital': { tier: 17, basis: 'wiki' },
    // « Inside the Erdtree » = Elden Throne.
    'radagon-of-the-golden-order/radagon-of-the-golden-order': { tier: 18, basis: 'deduced' },
    'elden-beast/elden-beast': { tier: 18, basis: 'deduced' },
  },
  anchors: [
    // Niveau maximal d'une origine [conception].
    { tier: 1, level: 10 },
    // Minimum du guide à Dragonbarrow (« Caelid (North) ») [wiki + déduction].
    { tier: 13, level: 60 },
    // Guide, étape 19 : « around level 100 » aux Mountaintops [wiki].
    { tier: 15, level: 100 },
    // « Level 120 (+/- 10) » pour finir le jeu, Elden Throne [wiki + déduction].
    { tier: 18, level: 120 },
  ],
  runeAnchor: { runes: 500_000, level: 120 },
  excludedRunes: ['radagon-of-the-golden-order/radagon-of-the-golden-order'],
  dlcEntryFrom: ['starscourge-radahn/starscourge-radahn', 'mohg-lord-of-blood/mohg-lord-of-blood-phase-1'],
  blessing: {
    anchor: { fragments: 13, pathFragments: 33 },
    // Entrée : Gravesite Plain (10) ; Cœur : + Scadu Altus (12) + Shadow Keep (11) ; Enir-Ilim : + Rauh Base (1) + Ancient Ruins of Rauh (4) + Enir-Ilim (4).
    // Zones annexes exclues : Cerulean Coast, Charo's Hidden Grave, Stone Coffin Fissure, Jagged Peak, Abyssal Woods.
    pathFragments: { entry: 10, core: 33, 'enir-ilim': 42 },
    table: {
      entry: 'scadutree-fragment',
      section: 'Scadutree Blessing Level',
      levelColumn: 'Scadutree Blessing Level',
      totalColumn: 'Total Fragments Required',
    },
  },
}
