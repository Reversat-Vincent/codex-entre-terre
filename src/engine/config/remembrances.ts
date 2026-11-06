// Rattachement des objets d'échange de Remembrance à leur boss : objet → Remembrance → rencontre (décision D12).
// Source : docs/contenu/decisions-progression.md § 2.2 (52 objets, 25 Remembrances) ; méthode : calculs.md, « Remembrances ».
// Références : `kind:id` des données préparées et clés de rencontre `bossId/encounterId` ; un test vérifie que chacune existe dans data/.

import type { EntityRef } from '../../data/datasets.ts'

/** Lien d'un objet d'échange vers sa Remembrance et la rencontre qui la donne. */
export interface RemembranceLink {
  /** Remembrance (`tools.json`, catégorie `Remembrances`). */
  readonly remembrance: EntityRef
  /** Identifiant du boss (`bosses.json`). */
  readonly boss: string
  /** Rencontre qui donne la Remembrance (`encounters[].drops`), clé `bossId/encounterId`. */
  readonly encounter: string
}

/** Une Remembrance, sa rencontre et les objets qu'elle permet d'obtenir. */
interface RemembranceRow {
  readonly remembrance: string
  readonly encounter: string
  readonly items: readonly EntityRef[]
}

/**
 * Table du § 2.2, dans son ordre. Cas particuliers : la Remembrance of the Regal Ancestor est aussi dans le butin de la page `ancestor-spirit`,
 * on garde la page qui porte l'indicateur ; l'Elden Remembrance est aussi citée par Radagon, on retient Elden Beast ; celle de Hoarah Loux vient
 * de la seconde rencontre de Godfrey ; celle de Rennala de sa phase 2.
 */
const TABLE: readonly RemembranceRow[] = [
  { remembrance: 'remembrance-of-the-regal-ancestor', encounter: 'regal-ancestor-spirit/regal-ancestor-spirit', items: ['talisman:ancestral-spirits-horn', 'weapon:winged-greathorn'] },
  { remembrance: 'remembrance-of-the-naturalborn', encounter: 'astel/astel-naturalborn-of-the-void', items: ['ash:ash-of-war-waves-of-darkness', 'weapon:bastards-stars'] },
  { remembrance: 'remembrance-of-the-lichdragon', encounter: 'lichdragon-fortissax/lichdragon-fortissax', items: ['spell:death-lightning', 'spell:fortissaxs-lightning-spear'] },
  { remembrance: 'remembrance-of-the-fire-giant', encounter: 'fire-giant/fire-giant', items: ['spell:burn-o-flame', 'weapon:giants-red-braid'] },
  { remembrance: 'remembrance-of-the-grafted', encounter: 'godrick-the-grafted/godrick-the-grafted-phase-1', items: ['weapon:axe-of-godrick', 'weapon:grafted-dragon'] },
  { remembrance: 'remembrance-of-the-full-moon-queen', encounter: 'rennala-queen-of-the-full-moon/rennala-queen-of-the-full-moon-phase-2', items: ['weapon:carian-regal-scepter', 'spell:rennalas-full-moon'] },
  { remembrance: 'remembrance-of-the-blasphemous', encounter: 'rykard-lord-of-blasphemy/rykard-lord-of-blasphemy-phase-1', items: ['weapon:blasphemous-blade', 'spell:rykards-rancor'] },
  { remembrance: 'remembrance-of-the-starscourge', encounter: 'starscourge-radahn/starscourge-radahn', items: ['weapon:lion-greatbow', 'weapon:starscourge-greatsword'] },
  { remembrance: 'remembrance-of-the-omen-king', encounter: 'morgott-the-omen-king/morgott-the-omen-king', items: ['weapon:morgotts-cursed-sword', 'item:regal-omen-bairn'] },
  { remembrance: 'remembrance-of-the-blood-lord', encounter: 'mohg-lord-of-blood/mohg-lord-of-blood-phase-1', items: ['spell:bloodboon', 'weapon:mohgwyns-sacred-spear'] },
  { remembrance: 'remembrance-of-the-rot-goddess', encounter: 'malenia-blade-of-miquella/malenia-goddess-of-rot', items: ['weapon:hand-of-malenia', 'spell:scarlet-aeonia'] },
  { remembrance: 'remembrance-of-the-black-blade', encounter: 'maliketh-the-black-blade/maliketh-the-black-blade', items: ['spell:black-blade', 'weapon:malikeths-black-blade'] },
  { remembrance: 'remembrance-of-hoarah-loux', encounter: 'godfrey-first-elden-lord/godfrey-first-elden-lord-leyndell-ashen-capital', items: ['ash:ash-of-war-hoarah-louxs-earthshaker', 'weapon:axe-of-godfrey'] },
  { remembrance: 'remembrance-of-the-dragonlord', encounter: 'dragonlord-placidusax/dragonlord-placidusax', items: ['weapon:dragon-kings-cragblade', 'spell:placidusaxs-ruin'] },
  { remembrance: 'elden-remembrance', encounter: 'elden-beast/elden-beast', items: ['weapon:marikas-hammer', 'weapon:sacred-relic-sword'] },
  { remembrance: 'remembrance-of-the-dancing-lion', encounter: 'divine-beast-dancing-lion/divine-beast-dancing-lion', items: ['ash:ash-of-war-divine-beast-frost-stomp', 'talisman:enraged-divine-beast'] },
  { remembrance: 'remembrance-of-the-twin-moon-knight', encounter: 'rellana-twin-moon-knight/rellana-twin-moon-knight', items: ['weapon:rellanas-twin-blades', 'spell:rellanas-twin-moons'] },
  { remembrance: 'remembrance-of-putrescence', encounter: 'putrescent-knight/putrescent-knight', items: ['weapon:putrescence-cleaver', 'spell:vortex-of-putrescence'] },
  { remembrance: 'remembrance-of-the-wild-boar-rider', encounter: 'commander-gaius/commander-gaius', items: ['ash:ash-of-war-spinning-gravity-thrust', 'spell:blades-of-stone', 'weapon:sword-lance'] },
  { remembrance: 'remembrance-of-the-shadow-sunflower', encounter: 'scadutree-avatar/scadutree-avatar', items: ['spell:land-of-shadow-spell', 'weapon:shadow-sunflower-blossom'] },
  { remembrance: 'remembrance-of-the-saint-of-the-bud', encounter: 'romina-saint-of-the-bud/romina-saint-of-the-bud', items: ['weapon:poleblade-of-the-bud', 'spell:rotten-butterflies'] },
  { remembrance: 'remembrance-of-the-lord-of-frenzied-flame', encounter: 'midra-lord-of-frenzied-flame/midra-lord-of-frenzied-flame', items: ['weapon:greatsword-of-damnation', 'spell:midras-flame-of-frenzy'] },
  { remembrance: 'remembrance-of-the-mother-of-fingers', encounter: 'metyr-mother-of-fingers/metyr-mother-of-fingers', items: ['weapon:gazing-finger', 'weapon:staff-of-the-great-beyond'] },
  { remembrance: 'remembrance-of-the-impaler', encounter: 'messmer-the-impaler/messmer-the-impaler-base-serpent-messmer', items: ['spell:messmers-orb', 'weapon:spear-of-the-impaler'] },
  { remembrance: 'remembrance-of-a-god-and-a-lord', encounter: 'promised-consort-radahn/promised-consort-radahn-radahn-consort-of-miquella', items: ['weapon:greatsword-of-radahn-light', 'weapon:greatsword-of-radahn-lord', 'spell:light-of-miquella'] },
]

/** Objets d'échange (52) → Remembrance et rencontre. */
export const REMEMBRANCES: Readonly<Record<EntityRef, RemembranceLink>> = Object.fromEntries(
  TABLE.flatMap((row) =>
    row.items.map((item): [EntityRef, RemembranceLink] => [
      item,
      { remembrance: `item:${row.remembrance}`, boss: row.encounter.split('/')[0] ?? row.encounter, encounter: row.encounter },
    ]),
  ),
)

/** Remembrances (25) → rencontre qui les donne. */
export const REMEMBRANCE_ENCOUNTERS: Readonly<Record<EntityRef, string>> = Object.fromEntries(
  TABLE.map((row): [EntityRef, string] => [`item:${row.remembrance}`, row.encounter]),
)
