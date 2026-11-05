// Données d'un nœud de la frise des boss prêtes à afficher : nom, rang, lieu, PV et runes du wiki, Remembrance, faiblesses, immunités, niveau recommandé.
// Rassemble des lectures de `data/` et des résultats du moteur pour `BossNode.vue` ; aucun calcul propre (méthode : calculs.md, « Frise des boss »).

import type { StatusKey } from '../data/keys.ts'
import type { EncounterRef } from '../engine/encounters.ts'
import type { BossLevel } from '../engine/bossLevel.ts'
import type { ReadinessId } from '../engine/readiness.ts'
import type { Calc } from '../engine/types.ts'
import { bestDamageTypes, immunities } from '../engine/weakness.ts'
import type { DamageAbsorption } from '../engine/weakness.ts'
import type { SourceName } from './labels.ts'

/** Nombre de types de dégâts mis en avant dans un nœud (« meilleurs types de dégâts »). */
export const WEAK_COUNT = 2

/** Préparation d'une rencontre telle que la rend le store d'analyse (`bossReadiness(clé)`) ; structure identique à `BossReadiness`. */
export interface NodeReadiness {
  readonly level: Calc<BossLevel>
  readonly readiness: Calc<ReadinessId>
  readonly gaugeMax: number
}

/** Données affichées pour un nœud de la frise ; clé de `details` de `CxBossTimeline` : la rencontre `levelKey` du nœud. */
export interface BossNodeData {
  /** Nom de la page du boss, en anglais comme dans les données. */
  readonly name: string
  /** Adresse de la fiche du boss ; sans elle le nom n'est pas un lien. */
  readonly href?: string
  /** Rang(s) du wiki (« Demigods, Great Enemies »), `null` si absent. */
  readonly rank: string | null
  /** Lieu de la rencontre (champ `location`, sinon ses régions), `null` si absent. */
  readonly location: string | null
  /** Étiquette de source de la rencontre. */
  readonly source: SourceName
  /** Première valeur de PV du wiki ; `null` = non documenté (jamais 0). */
  readonly hp: number | null
  /** Autres valeurs de PV publiées (Margit en a deux). */
  readonly hpExtra: number
  /** Première valeur de runes du wiki ; `null` = non documenté. */
  readonly runes: number | null
  /** Autres valeurs de runes publiées. */
  readonly runesExtra: number
  /** La rencontre laisse une Remembrance. */
  readonly remembrance: boolean
  /** La rencontre laisse une Grande Rune. */
  readonly greatRune: boolean
  /** Types de dégâts les moins absorbés ; `null` si l'absorption n'est pas documentée. */
  readonly weak: readonly DamageAbsorption[] | null
  /** Statuts auxquels la rencontre est immunisée ; `null` si les résistances ne sont pas documentées. */
  readonly immunities: readonly StatusKey[] | null
  /** Vrai si le wiki donne au moins les PV, les runes ou l'absorption de cette rencontre. */
  readonly hasCombatData: boolean
  /** Niveau recommandé (M3, ou niveau d'entrée du DLC avec sa bénédiction) ; `null` si le fichier des boss n'est pas chargé. */
  readonly level: Calc<BossLevel> | null
  /** Préparation face à ce boss ; `null` si elle n'est pas disponible. */
  readonly readiness: Calc<ReadinessId> | null
  /** Maximum de la jauge de préparation. */
  readonly gaugeMax: number | null
}

/**
 * Données d'un nœud de la frise.
 * @param ref Rencontre `levelKey` du nœud (`EncounterIndex.byKey`), ou `undefined` si elle manque dans les données.
 * @param prep Préparation de la rencontre (`useAnalysisStore().bossReadiness(clé)`), ou `null`.
 * @param href Adresse de la fiche du boss, si elle existe.
 * @returns Les données du nœud, ou `null` si la rencontre manque (le nœud affiche « Élément introuvable »).
 */
export function bossNodeData(ref: EncounterRef | undefined, prep: NodeReadiness | null, href?: string): BossNodeData | null {
  if (ref === undefined) return null
  const enc = ref.encounter
  const hpValues = enc?.hp_values ?? []
  const runeValues = enc?.runes_values ?? []
  const drops = enc?.drops ?? []
  const weak = enc === null ? null : bestDamageTypes(enc, WEAK_COUNT)
  const imm = enc === null ? null : immunities(enc)
  return {
    name: ref.boss.name,
    ...(href === undefined ? {} : { href }),
    rank: ref.boss.tier.length > 0 ? ref.boss.tier.join(', ') : null,
    location: enc?.location ?? (enc !== null && enc.regions.length > 0 ? enc.regions.join(', ') : null),
    source: enc?.source ?? ref.boss.source,
    hp: hpValues[0] ?? null,
    hpExtra: Math.max(0, hpValues.length - 1),
    runes: runeValues[0] ?? null,
    runesExtra: Math.max(0, runeValues.length - 1),
    remembrance: drops.some((d) => /remembrance/i.test(d)),
    greatRune: drops.some((d) => /great rune/i.test(d)),
    weak,
    immunities: imm,
    hasCombatData: hpValues.length > 0 || runeValues.length > 0 || weak !== null,
    level: prep?.level ?? null,
    readiness: prep?.readiness ?? null,
    gaugeMax: prep?.gaugeMax ?? null,
  }
}
