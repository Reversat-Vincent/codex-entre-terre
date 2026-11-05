// Étapes de progression : identifiants (source unique du projet), table région → étape, sous-zones du DLC, surcharges d'étape documentées
// et hiérarchie des régions connues.
// Source : docs/contenu/decisions-progression.md § 1.3 (table complète, option A) et § 1.4 (règles), décisions D10 et D11 ; méthode : calculs.md,
// « Étape de progression d'une arme ». Les noms sont ceux de data/ ; un test contrôle que chaque valeur est l'une des 79 régions relevées.

/** Identifiants des cinq étapes, dans l'ordre de progression ; seule définition du projet (D32), reprise par la persistance. */
export const STAGE_IDS = ['early', 'mid', 'late', 'endgame', 'dlc'] as const

/** Étape de progression : Début, Milieu, Fin, Fin de jeu, DLC. */
export type StageId = (typeof STAGE_IDS)[number]

/**
 * Rang d'une étape (0 = Début) ; sert à compter les étapes d'avance (score, composante 3).
 * @param stage Étape.
 * @returns Son indice dans `STAGE_IDS`.
 */
export function stageIndex(stage: StageId): number {
  return STAGE_IDS.indexOf(stage)
}

/** Sous-zones du DLC, dans l'ordre de progression : clé de tri dans la colonne DLC, pas une étape (D11). */
export const DLC_ZONES = ['entry', 'core', 'enir-ilim'] as const

/** Sous-zone du DLC : Entrée, Cœur, Enir-Ilim. */
export type DlcZone = (typeof DLC_ZONES)[number]

/** Étiquette de source qui impose l'étape DLC (règle 5 : l'icône DLC du wiki est un fait). */
export const DLC_SOURCE = 'Shadow of the Erdtree'

/**
 * Table région → étape (decisions-progression.md § 1.3, colonne « Étape (option A) ») : les 79 valeurs exactes de data/.
 * Placements [conception] appuyés sur les paliers du wiki et l'ordre du guide : Mt. Gelmir en Milieu et Volcano Manor en Fin, Dragonbarrow en Fin,
 * Consecrated Snowfield et Mohgwyn Palace en Fin de jeu, Roundtable Hold en Début (D10).
 */
export const REGION_STAGE: Readonly<Record<string, StageId>> = {
  // Début
  'Castle Morne': 'early',
  Limgrave: 'early',
  'Roundtable Hold': 'early',
  Stormhill: 'early',
  'Stormveil Castle': 'early',
  'Weeping Peninsula': 'early',
  'Weeping Peninsula (Limgrave)': 'early',
  // Milieu
  'Academy of Raya Lucaria': 'mid',
  'Ainsel River': 'mid',
  'Ainsel River Main': 'mid',
  'Altus Plateau': 'mid',
  'Bellum Highway': 'mid',
  Caelid: 'mid',
  'Capital Outskirts': 'mid',
  'Deeproot Depths': 'mid',
  'Grand Lift of Dectus': 'mid',
  'Lake of Rot': 'mid',
  'Liurnia of the Lakes': 'mid',
  'Moonlight Altar': 'mid',
  'Mt. Gelmir': 'mid',
  'Nokron, Eternal City': 'mid',
  'Redmane Castle': 'mid',
  'Siofra River': 'mid',
  'Swamp of Aeonia': 'mid',
  'Three Sisters': 'mid',
  'Writheblood Ruins': 'mid',
  // Fin
  'Castle Sol': 'late',
  Dragonbarrow: 'late',
  'Flame Peak': 'late',
  'Forbidden Lands': 'late',
  'Forge of the Giants': 'late',
  "Greyoll's Dragonbarrow": 'late',
  'Leyndell, Royal Capital': 'late',
  'Leyndell, Royal Capital/Leyndell, Ashen Capital': 'late',
  'Mountaintops of the Giants': 'late',
  'Nokstella, Eternal City': 'late',
  'Subterranean Shunning-Grounds': 'late',
  'Volcano Manor': 'late',
  // Fin de jeu
  'Accessed via Mountaintops of the Giants': 'endgame',
  'Consecrated Snowfield': 'endgame',
  'Crumbling Farum Azula': 'endgame',
  'Elphael, Brace of the Haligtree': 'endgame',
  'Leyndell, Ashen Capital': 'endgame',
  "Miquella's Haligtree": 'endgame',
  'Mohgwyn Dynasty Mausoleum': 'endgame',
  'Mohgwyn Palace': 'endgame',
  'Mohgwyn Palace (Siofra River)': 'endgame',
  // DLC (sous-zone : DLC_ZONE)
  'Abyssal Woods': 'dlc',
  'Abyssal Woods (Scadu Altus)': 'dlc',
  'Ancient Ruins of Rauh': 'dlc',
  'Belurat, Tower Settlement': 'dlc',
  'Castle Ensis': 'dlc',
  'Cerulean Coast': 'dlc',
  "Charo's Hidden Grave": 'dlc',
  'Enir-Ilim': 'dlc',
  'Fog Rift Catacombs': 'dlc',
  'Foot of the Jagged Peak': 'dlc',
  'Gate of Divinity': 'dlc',
  'Gravesite Plain': 'dlc',
  Hinterland: 'dlc',
  'Jagged Peak': 'dlc',
  'Land of the Tower': 'dlc',
  "Midra's Manse": 'dlc',
  'Rauh Base': 'dlc',
  'Rauh Base (Land of the Tower)': 'dlc',
  'Realm of Shadow': 'dlc',
  'Scadu Altus': 'dlc',
  'Scadu Altus (Abyssal Woods)': 'dlc',
  'Scadutree Base': 'dlc',
  'Scadutree Chalice': 'dlc',
  Scaduview: 'dlc',
  'Shadow Keep': 'dlc',
  'Shadow Keep, Church District': 'dlc',
  'Shaman Village': 'dlc',
  'Specimen Storehouse': 'dlc',
  'Stone Coffin Fissure': 'dlc',
  'accessed through Rauh Base': 'dlc',
  'accessed through Scadu Altus': 'dlc',
  'through Rauh Base': 'dlc',
}

/**
 * Sous-zone de chaque valeur DLC (decisions-progression.md § 1.3, colonne « Zone DLC ») : Entrée (accès libre depuis l'arrivée),
 * Cœur (après Rellana ou le Spiritspring ; Rauh au rang de Scadu Altus Est d'après la page Great Runes), Enir-Ilim (après Messmer's Kindling).
 * `Land of the Tower` et `Realm of Shadow`, trop génériques, sont rattachés à Entrée par la règle du plus précoce (calculs.md).
 */
export const DLC_ZONE: Readonly<Record<string, DlcZone>> = {
  'Belurat, Tower Settlement': 'entry',
  'Castle Ensis': 'entry',
  'Cerulean Coast': 'entry',
  "Charo's Hidden Grave": 'entry',
  'Fog Rift Catacombs': 'entry',
  'Foot of the Jagged Peak': 'entry',
  'Gravesite Plain': 'entry',
  'Jagged Peak': 'entry',
  'Land of the Tower': 'entry',
  'Realm of Shadow': 'entry',
  'Stone Coffin Fissure': 'entry',
  'Abyssal Woods': 'core',
  'Abyssal Woods (Scadu Altus)': 'core',
  'Ancient Ruins of Rauh': 'core',
  Hinterland: 'core',
  "Midra's Manse": 'core',
  'Rauh Base': 'core',
  'Rauh Base (Land of the Tower)': 'core',
  'Scadu Altus': 'core',
  'Scadu Altus (Abyssal Woods)': 'core',
  'Scadutree Base': 'core',
  'Scadutree Chalice': 'core',
  Scaduview: 'core',
  'Shadow Keep': 'core',
  'Shadow Keep, Church District': 'core',
  'Shaman Village': 'core',
  'Specimen Storehouse': 'core',
  'accessed through Rauh Base': 'core',
  'accessed through Scadu Altus': 'core',
  'through Rauh Base': 'core',
  'Enir-Ilim': 'enir-ilim',
  'Gate of Divinity': 'enir-ilim',
}

/** Surcharge d'étape d'un objet : étape, sous-zone DLC, et page du wiki qui documente la condition d'obtention. */
export interface StageOverride {
  readonly stage: StageId
  /** Sous-zone du DLC ; `null` hors DLC. */
  readonly dlcZone: DlcZone | null
  /** Page du wiki qui justifie l'étape (citée dans le « Pourquoi ? »). */
  readonly source: string
}

/**
 * Surcharges d'étape (décision D39, S1 et S2 de docs/contenu/verification-socle.md ; calculs.md, « Étape de progression d'une arme », règle 0) :
 * une condition de quête documentée par le wiki rend l'objet obtenable plus tard que son lieu ne l'indique. Appliquées avant toute autre règle.
 * Les lieux de data/ restent exacts : c'est la condition qui manque aux données, d'où une surcharge plutôt qu'un correctif de données.
 */
export const STAGE_OVERRIDES: Readonly<Record<string, StageOverride>> = {
  // [wiki] « After retrieving the Haligtree Secret Medallion (Right) from Old Albus in the Village of the Albinaurics, or the Haligtree
  // Secret Medallion (Left) from Castle Sol, Ensha will invade the player. Upon death, he drops the Clinging Bone. »
  // [déduction] Village of the Albinaurics est en Liurnia of the Lakes (locations.json), donc Milieu au plus tôt.
  'weapon:clinging-bone': { stage: 'mid', dlcZone: null, source: 'https://eldenring.wiki.gg/wiki/Ensha_of_the_Royal_Remains' },
  // [wiki] « only acquire this item after having burned the sealing tree past the Church of the Bud » : accès d'Enir-Ilim.
  'weapon:spiraltree-seal': { stage: 'dlc', dlcZone: 'enir-ilim', source: 'https://eldenring.wiki.gg/wiki/Spiraltree_Seal' },
}

/**
 * Région parente directe de chaque région connue qui en a une, d'après `locations.json` (`region` sans sa parenthèse).
 * Le moteur ne charge pas `locations` : cette copie sert à garder la région la plus précise des rencontres de boss (`encounters[].regions`,
 * calculs.md, « Remembrances » : règle 2 appliquée à la rencontre). Les armes ont déjà leurs régions parentes retirées par la préparation
 * (`derived.regions`). Un test vérifie chaque lien contre `locations.json`.
 */
export const REGION_PARENT: Readonly<Record<string, string>> = {
  'Castle Morne': 'Limgrave',
  Stormhill: 'Limgrave',
  'Stormveil Castle': 'Limgrave',
  'Weeping Peninsula': 'Limgrave',
  'Academy of Raya Lucaria': 'Liurnia of the Lakes',
  'Ainsel River Main': 'Ainsel River',
  'Bellum Highway': 'Liurnia of the Lakes',
  'Capital Outskirts': 'Altus Plateau',
  'Grand Lift of Dectus': 'Liurnia of the Lakes',
  'Lake of Rot': 'Ainsel River',
  'Moonlight Altar': 'Liurnia of the Lakes',
  'Mt. Gelmir': 'Altus Plateau',
  'Nokron, Eternal City': 'Siofra River',
  'Redmane Castle': 'Caelid',
  'Swamp of Aeonia': 'Caelid',
  'Three Sisters': 'Liurnia of the Lakes',
  'Writheblood Ruins': 'Altus Plateau',
  'Castle Sol': 'Mountaintops of the Giants',
  'Flame Peak': 'Mountaintops of the Giants',
  'Forbidden Lands': 'Mountaintops of the Giants',
  'Forge of the Giants': 'Flame Peak',
  "Greyoll's Dragonbarrow": 'Caelid',
  'Leyndell, Royal Capital': 'Altus Plateau',
  'Nokstella, Eternal City': 'Ainsel River Main',
  'Subterranean Shunning-Grounds': 'Leyndell, Royal Capital',
  'Volcano Manor': 'Mt. Gelmir',
  'Consecrated Snowfield': 'Mountaintops of the Giants',
  'Crumbling Farum Azula': 'Mountaintops of the Giants',
  'Elphael, Brace of the Haligtree': "Miquella's Haligtree",
  'Leyndell, Ashen Capital': 'Altus Plateau',
  'Mohgwyn Dynasty Mausoleum': 'Mohgwyn Palace',
  'Mohgwyn Palace': 'Siofra River',
  'Abyssal Woods': 'Scadu Altus',
  'Ancient Ruins of Rauh': 'Land of the Tower',
  'Belurat, Tower Settlement': 'Land of the Tower',
  'Castle Ensis': 'Gravesite Plain',
  'Cerulean Coast': 'Gravesite Plain',
  "Charo's Hidden Grave": 'Gravesite Plain',
  'Enir-Ilim': 'Land of the Tower',
  'Fog Rift Catacombs': 'Gravesite Plain',
  'Foot of the Jagged Peak': 'Gravesite Plain',
  'Gate of Divinity': 'Enir-Ilim',
  'Jagged Peak': 'Gravesite Plain',
  "Midra's Manse": 'Scadu Altus',
  'Rauh Base': 'Land of the Tower',
  'Scadutree Base': 'Shadow Keep',
  'Scadutree Chalice': 'Scaduview',
  Scaduview: 'Shadow Keep',
  'Shadow Keep, Church District': 'Shadow Keep',
  'Shaman Village': 'Scaduview',
  'Specimen Storehouse': 'Shadow Keep',
  'Stone Coffin Fissure': 'Gravesite Plain',
}
