// Types partagés des composants de la fiche boss : onglets de rencontre, lignes de statut, groupes de butin.
// Aucune logique : les fonctions qui les remplissent sont dans `bossSheetModel.ts`.

import type { EntityKind, EntityRef } from '../../../data/datasets.ts'
import type { StatusKey } from '../../../data/keys.ts'
import type { Encounter } from '../../../data/types/bosses.ts'
import type { SourceName } from '../../../ui/labels.ts'

/** Rencontre d'une page de boss, prête pour un onglet. */
export interface EncounterModel {
  /** Identifiant de la rencontre dans sa page (`derived.encounters[].id`) : valeur de `?rencontre=`. */
  readonly id: string
  /** Clé de la rencontre (`bossId/encounterId`, ou `bossId` pour une page sans rencontre) : clé du moteur et de la frise. */
  readonly key: string
  /** Lieu (champ `location`, sinon première région), `null` si le wiki n'en donne pas. */
  readonly location: string | null
  /** Complément qui distingue deux rencontres d'un même lieu (variante, suite du nom, région), `null` si inutile. */
  readonly note: string | null
  /** Source propre à la rencontre. */
  readonly source: SourceName
  /** Données du wiki ; `null` pour une page de boss sans aucune rencontre. */
  readonly encounter: Encounter | null
}

/** Indicateur d'un boss (Grande Rune, Remembrance, obligatoire, requis pour le DLC). */
export interface BossFlagModel {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly title: string
}

/** Valeurs chiffrées d'un champ texte du wiki (PV, runes) et ce que le texte ajoute. */
export interface CountModel {
  /** Nombres trouvés dans le texte du wiki, dans l'ordre ; vide = non documenté. */
  readonly values: readonly number[]
  /** Texte du wiki nettoyé, seulement s'il dit plus que les nombres (lieux, « jusqu'à 65 % »). */
  readonly note: string | null
  /** Texte du wiki tel quel, pour l'info-bulle. */
  readonly raw: string | null
}

/** Statut affiché : valeur du wiki, immunité ou absence de donnée. */
export interface StatusRowModel {
  readonly key: StatusKey
  /** `immune` : valeur exactement `"Immune"` ; `value` : nombre ou texte du wiki ; `missing` : champ absent. */
  readonly kind: 'immune' | 'value' | 'missing'
  /** Texte du wiki, entier ou texte à plusieurs valeurs, tel que dans les données ; `null` pour `immune` et `missing`. */
  readonly text: string | null
  /** Nombre quand la valeur est un entier simple, pour le formatage ; `null` sinon. */
  readonly number: number | null
}

/** Groupe de butin : titre de lieu (« Limgrave: ») ou `null`, et noms d'objets. */
export interface LootGroupModel {
  readonly title: string | null
  readonly items: readonly string[]
}

/** Groupe de notes de combat : titre de la variante ou du lieu (« Mohg, the Omen= ») ou `null`, et lignes du wiki. */
export interface NoteGroupModel {
  readonly title: string | null
  readonly lines: readonly string[]
}

/** Élément de butin résolu : lien vers sa fiche quand le nom correspond exactement à une entité. */
export interface LootItemModel {
  readonly name: string
  readonly ref: EntityRef | null
  /** Genre de l'entité liée, pour le libellé « Arme », « Objet »… ; `null` sans lien. */
  readonly kind: EntityKind | null
}
