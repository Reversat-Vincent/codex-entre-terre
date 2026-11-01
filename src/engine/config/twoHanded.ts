// Maniement à deux mains : catégories et armes sans posture à deux mains, exception, armes toujours à deux mains.
// Source : docs/design/ds/calculs.md, « Prérequis comparés au profil » (pages Strength, Paired Weapons, Starscourge Greatsword, Greatbow du wiki ; D5).
// Aucun champ de data/ n'indique ces cas : ils se déduisent de `category` et de cette liste ; un test contrôle que chaque id existe dans data/.

/** Configuration du maniement à deux mains. */
export interface TwoHandedConfig {
  /** Catégories (`weapons[].category`) sans posture à deux mains : pas de bonus de Force. */
  readonly noStanceCategories: readonly string[]
  /** Armes (id = slug de `wiki_page`) de la liste « Armaments without a two-handed stance » de la page Paired Weapons. */
  readonly noStanceWeapons: readonly string[]
  /** Armes appariées qui reçoivent quand même le bonus (prioritaires sur les deux listes précédentes). */
  readonly bonusExceptions: readonly string[]
  /** Catégories toujours maniées à deux mains : Force effective d'office, bascule 1M / 2M masquée. */
  readonly alwaysTwoHandedCategories: readonly string[]
  /** Multiplicateur de la Force à deux mains, arrondi à l'entier inférieur (`floor(STR × 1,5)`, pages Igon's Greatbow et Greatbow). */
  readonly strengthFactor: { readonly numerator: number; readonly denominator: number }
}

/** Valeurs retenues (calculs.md, « Prérequis comparés au profil »). */
export const TWO_HANDED: TwoHandedConfig = {
  noStanceCategories: [
    'Fists',
    'Claws',
    'Hand-to-Hand',
    'Throwing Blades',
    'Backhand Blades',
    'Beast Claws',
    'Perfume Bottles',
  ],
  noStanceWeapons: [
    'smithscript-dagger',
    'ornamental-straight-sword',
    'rellanas-twin-blades',
    'greatsword-of-radahn-lord',
    'greatsword-of-radahn-light',
    'falx',
    'dancing-blade-of-ranah',
    'horned-warriors-sword',
    'smithscript-cirque',
    'curseblades-cirque',
    'death-knights-twin-axes',
  ],
  // Page Starscourge Greatsword : arme appariée qui reçoit le bonus. Sa catégorie (Colossal Swords) ne l'exclut pas ; l'exception est gardée
  // explicite pour qu'un ajout futur à `noStanceWeapons` ne la retire pas.
  bonusExceptions: ['starscourge-greatsword'],
  alwaysTwoHandedCategories: ['Greatbows', 'Ballistas'],
  strengthFactor: { numerator: 3, denominator: 2 },
}
