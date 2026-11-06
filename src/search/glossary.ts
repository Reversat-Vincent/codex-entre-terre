// Petit glossaire français → anglais de mots courants des noms d'objets, pour les suggestions quand une recherche ne donne rien (docs/architecture.md § 8 et § 15, P13).
// Ce n'est pas un fait du jeu : les noms restent ceux de data/ (en anglais) ; le glossaire ne sert qu'à proposer des requêtes, qui ne sont montrées que si elles trouvent des résultats.

import { normalizeText } from '../data/slug.ts'

/** Nombre maximal de requêtes anglaises proposées pour une même saisie. */
export const MAX_TRANSLATIONS = 6

/**
 * Mots français (sans accent, minuscules : forme de `normalizeText`) et leurs équivalents anglais, tels qu'on les lit dans les noms de l'index.
 * Un mot peut avoir plusieurs équivalents (« glace » : `ice`, `frost`). Chaque équivalent a été relevé comme mot de nom dans l'index de recherche.
 */
export const GLOSSARY: Readonly<Record<string, readonly string[]>> = {
  // Armes et équipement
  epee: ['sword'],
  lame: ['blade'],
  hache: ['axe'],
  lance: ['spear', 'lance'],
  arc: ['bow'],
  arbalete: ['crossbow'],
  bouclier: ['shield'],
  dague: ['dagger'],
  marteau: ['hammer'],
  masse: ['club'],
  fouet: ['whip'],
  faux: ['scythe'],
  hallebarde: ['halberd'],
  fleau: ['flail'],
  katana: ['katana'],
  griffe: ['claw'],
  poing: ['fist'],
  torche: ['torch'],
  baton: ['staff'],
  sceau: ['seal'],
  couteau: ['knife'],
  aiguille: ['needle'],
  armure: ['armor'],
  casque: ['helm'],
  gantelet: ['gauntlet', 'gloves'],
  gants: ['gloves'],
  jambieres: ['greaves'],
  bottes: ['boots'],
  cape: ['cloak'],
  capuche: ['hood'],
  masque: ['mask'],
  anneau: ['ring'],
  cloche: ['bell'],
  lanterne: ['lantern'],
  // Éléments et statuts
  lune: ['moon'],
  etoile: ['star'],
  soleil: ['sun'],
  nuit: ['night'],
  ombre: ['shadow'],
  feu: ['fire'],
  flamme: ['flame'],
  glace: ['ice', 'frost'],
  givre: ['frost', 'frostbite'],
  foudre: ['lightning'],
  eclair: ['lightning'],
  sacre: ['holy', 'sacred'],
  sombre: ['dark'],
  noir: ['black'],
  blanc: ['white'],
  rouge: ['red', 'crimson'],
  bleu: ['blue'],
  ecarlate: ['scarlet'],
  or: ['gold', 'golden'],
  argent: ['silver'],
  sang: ['blood'],
  poison: ['poison'],
  pourriture: ['rot', 'rotten'],
  sommeil: ['sleep'],
  folie: ['madness', 'frenzy'],
  mort: ['death'],
  // Mécaniques (tâche « comprendre une mécanique ») : équivalents relevés dans les noms de mécaniques de l'index (Blood Loss, Status Effects,
  // Skill: Parry, Guard Boost, Affinity/…, Stamina, Endurance, Frostbite, Scarlet Rot, Poise, Equip Load). « Bleed » n'est un mot d'aucun nom
  // de l'index : le wiki intitule la mécanique « Blood Loss », donc « saignement » ne propose que « blood loss ».
  saignement: ['blood loss'],
  hemorragie: ['blood loss'],
  statut: ['status'],
  parade: ['parry'],
  garde: ['guard'],
  affinite: ['affinity'],
  endurance: ['stamina', 'endurance'],
  putrefaction: ['rot', 'scarlet rot'],
  equilibre: ['poise'],
  charge: ['equip load'],
  // Créatures et personnages
  dragon: ['dragon'],
  loup: ['wolf'],
  lion: ['lion'],
  serpent: ['serpent'],
  oiseau: ['bird'],
  crabe: ['crab'],
  rat: ['rat'],
  mouche: ['fly'],
  bete: ['beast'],
  geant: ['giant'],
  dieu: ['god'],
  fantome: ['ghost'],
  chevalier: ['knight'],
  reine: ['queen'],
  roi: ['king'],
  seigneur: ['lord'],
  prince: ['prince'],
  sorcier: ['sorcerer'],
  sorciere: ['witch', 'sorceress'],
  pretre: ['priest'],
  soldat: ['soldier'],
  guerrier: ['warrior'],
  marchand: ['merchant'],
  marionnette: ['puppet'],
  esprit: ['spirit'],
  cendre: ['ash'],
  // Corps, matières, objets
  ame: ['soul'],
  os: ['bone'],
  crane: ['skull'],
  main: ['hand'],
  oeil: ['eye'],
  coeur: ['heart'],
  larme: ['tear'],
  cle: ['key'],
  rune: ['rune'],
  cristal: ['crystal'],
  pierre: ['stone'],
  corne: ['horn'],
  plume: ['feather'],
  aile: ['wing'],
  fleur: ['flower'],
  champignon: ['mushroom'],
  epine: ['thorn'],
  magie: ['magic'],
  // Lieux
  arbre: ['tree'],
  foret: ['forest'],
  lac: ['lake'],
  riviere: ['river'],
  chateau: ['castle'],
  tour: ['tower'],
  eglise: ['church'],
  cathedrale: ['cathedral'],
  grotte: ['cave'],
  tunnel: ['tunnel'],
  catacombes: ['catacombs'],
  ville: ['city'],
  village: ['village'],
  pont: ['bridge'],
  tombe: ['grave', 'tomb'],
  // Qualificatifs
  grand: ['great'],
  petit: ['small'],
  vieux: ['old'],
  ancien: ['ancient'],
}

/** Articles et prépositions ignorés dans une saisie dont au moins un mot est traduit (« épée de lune » → `sword moon`). */
export const STOPWORDS: ReadonlySet<string> = new Set(['de', 'du', 'des', 'd', 'la', 'le', 'les', 'l', 'un', 'une', 'au', 'aux'])

/**
 * Équivalents anglais d'un mot français normalisé.
 * Essaie le mot tel quel, puis sans `s` ou `x` final (pluriel), puis sans `l` ou `d` initial (élision : `l'épée` devient `lepee` une fois normalisé).
 * @param word Mot normalisé par `normalizeText`.
 * @returns Les équivalents, ou `null` si le glossaire ne connaît pas ce mot.
 */
export function lookupWord(word: string): readonly string[] | null {
  const direct = GLOSSARY[word]
  if (direct) return direct
  if (word.length > 3 && (word.endsWith('s') || word.endsWith('x'))) {
    const singular = GLOSSARY[word.slice(0, -1)]
    if (singular) return singular
  }
  if (word.length > 2 && (word.startsWith('l') || word.startsWith('d'))) {
    const bare = GLOSSARY[word.slice(1)]
    if (bare) return bare
  }
  return null
}

/**
 * Traduit une saisie française en requêtes anglaises possibles.
 * Les mots inconnus sont gardés tels quels, les articles sont retirés ; aucune requête n'est produite si aucun mot n'est traduit.
 * @param query Saisie de l'utilisateur, brute.
 * @returns Au plus `MAX_TRANSLATIONS` requêtes normalisées, différentes de la saisie normalisée.
 */
export function translateQuery(query: string): string[] {
  const words = normalizeText(query).split(' ').filter((w) => w !== '')
  const options = words.map((w) => lookupWord(w))
  if (options.every((o) => o === null)) return []
  let combos: string[][] = [[]]
  words.forEach((w, i) => {
    const opt = options[i] ?? null
    if (opt === null && STOPWORDS.has(w)) return
    const choices = opt ?? [w]
    combos = combos.flatMap((c) => choices.map((x) => [...c, x])).slice(0, MAX_TRANSLATIONS * 4)
  })
  const original = words.join(' ')
  const out: string[] = []
  for (const c of combos) {
    const q = c.join(' ')
    if (q !== '' && q !== original && !out.includes(q)) out.push(q)
    if (out.length === MAX_TRANSLATIONS) break
  }
  return out
}
