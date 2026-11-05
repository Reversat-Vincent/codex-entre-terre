// Paliers de rendement des attributs publiés par le wiki (décision D39, S5 de docs/contenu/verification-socle.md), affichés par le widget
// « Rendement des attributs » à la place des paliers déduits des tables. Méthode : docs/design/ds/calculs.md, « Rendement des attributs ».

/** Paliers publiés d'une statistique : niveaux d'attribut, page du wiki et phrase citée (copie dans `data/mechanics.json`). */
export interface PublishedSoftCaps {
  /** Niveaux de l'attribut à partir desquels le gain baisse, croissants. */
  readonly points: readonly number[]
  readonly source: string
  readonly quote: string
}

/**
 * Paliers publiés par statistique (`YieldStat` d'attributeYield.ts) [wiki]. Les mêmes phrases sont dans `data/mechanics.json`
 * (sujets Vigor, Mind et Endurance). Les paliers de la Focus, de la Robustness et des défenses ne sont pas suivis par le widget.
 */
export const PUBLISHED_SOFT_CAPS: Readonly<Record<'hp' | 'fp' | 'stamina' | 'equipLoad', PublishedSoftCaps>> = {
  hp: {
    points: [40, 60],
    source: 'https://eldenring.wiki.gg/wiki/Vigor',
    quote: 'Vigor has two soft cap points, 40 and 60',
  },
  fp: {
    points: [50, 60],
    source: 'https://eldenring.wiki.gg/wiki/Mind',
    quote: 'Mind has a soft cap of 50 and 60 for increasing FP',
  },
  stamina: {
    points: [15, 30, 50],
    source: 'https://eldenring.wiki.gg/wiki/Endurance',
    quote: 'Endurance has three soft cap points for increasing Stamina, at 15, 30 and 50',
  },
  equipLoad: {
    points: [25, 60],
    source: 'https://eldenring.wiki.gg/wiki/Endurance',
    quote: 'Increasing Equip Load sees soft caps at 25 and 60 Endurance',
  },
}
