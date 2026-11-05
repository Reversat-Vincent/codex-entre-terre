// Modèle d'affichage du widget B (configuration de départ optimale) : lignes du classement, origine détaillée, équipement et armes de début.
// Aucun calcul propre : les rangs viennent de `useAnalysisStore().originRanking`, les armes de `recommendations` ; seule exception signalée
// plus bas, les statistiques dérivées de l'origine affichée (méthode : calculs.md, « Statistiques dérivées »).

import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import type { EntityRef } from '../../data/datasets.ts'
import type { OriginEntry } from '../../data/types/origins.ts'
import { derivedStats } from '../../engine/derivedStats.ts'
import type { DerivedStats } from '../../engine/derivedStats.ts'
import { originAttributes } from '../../engine/level.ts'
import type { OriginRank } from '../../engine/origins.ts'
import type { ScoredWeapon } from '../../engine/score.ts'
import type { Attributes, Calc } from '../../engine/types.ts'
import { useAnalysisStore } from '../../stores/analysis.ts'
import { useCriteriaStore } from '../../stores/criteria.ts'
import { useDataStore } from '../../stores/data.ts'

/** Ligne du classement : l'origine, son rang calculé par le moteur et l'explication de ce rang. */
export interface OriginRow {
  readonly ref: EntityRef
  readonly origin: OriginEntry
  readonly rank: OriginRank
  /** Rang du moteur avec son explication (« Pourquoi ? »). */
  readonly calc: Calc<OriginRank>
  /** Rang 1 : l'origine recommandée. */
  readonly top: boolean
  /** Armes de départ qui sont aussi des armes recommandées par le widget A (noms exacts). */
  readonly recommendedStarting: readonly string[]
}

/** Groupe de l'équipement de départ (libellé français du groupe, entrées en anglais comme dans les données). */
export interface EquipmentGroup {
  readonly key: 'Armaments' | 'Spells' | 'Gear' | 'Misc'
  readonly label: string
  readonly items: readonly { readonly name: string; readonly recommended: boolean }[]
}

/** Libellés des groupes de `starting_equipment`. */
const EQUIPMENT_LABELS: Readonly<Record<EquipmentGroup['key'], string>> = {
  Armaments: 'Armes',
  Spells: 'Sorts',
  Gear: 'Armure',
  Misc: 'Divers',
}

/** Valeur du composable `useOriginWidget`. */
export interface OriginWidgetModel {
  /** Un build cible est défini et le classement est calculé. */
  readonly hasTarget: ComputedRef<boolean>
  /** Les 12 origines (ou 10 sans le Tarnished Pack) classées. */
  readonly rows: ComputedRef<readonly OriginRow[]>
  /** Origine recommandée (rang 1). */
  readonly top: ComputedRef<OriginRow | null>
  /** Origine détaillée : celle que le joueur a cliquée, sinon l'origine retenue (choisie ou rang 1). */
  readonly shown: ComputedRef<OriginRow | null>
  /** Attributs de départ de l'origine détaillée. */
  readonly startAttributes: ComputedRef<Attributes | null>
  /** Attributs du build cible. */
  readonly targetAttributes: ComputedRef<Attributes | null>
  /** Choisit l'origine détaillée. */
  readonly select: (ref: EntityRef) => void
  /** Nombre d'origines masquées parce que le Tarnished Pack est désactivé. */
  readonly hiddenCount: ComputedRef<number>
  /** Statistiques dérivées de l'origine détaillée. */
  readonly derived: ComputedRef<Calc<DerivedStats> | null>
  /** Équipement de départ de l'origine détaillée. */
  readonly equipment: ComputedRef<readonly EquipmentGroup[]>
  /** Armes de l'étape Début du widget A. */
  readonly earlyWeapons: ComputedRef<readonly ScoredWeapon[]>
  /** Faux tant que les fichiers d'armes ne sont pas lus : la liste des armes de début est alors vide faute de données. */
  readonly weaponsLoaded: ComputedRef<boolean>
  /** Libellé de l'archétype du build cible et niveau cible, pour la ligne d'en-tête. */
  readonly target: ComputedRef<{ archetype: string | null; level: number }>
}

/**
 * Prépare ce que le widget B affiche, à partir des stores `analysis`, `criteria` et `data`.
 * Écart signalé : les statistiques dérivées de l'origine affichée appellent `derivedStats` (moteur) ici, faute de getter
 * `analysis.derivedOf(attributs)` ; le store ne calcule que celles du profil. À déplacer dans le store sans changer ce composable.
 * @returns Le modèle réactif du widget.
 */
export function useOriginWidget(): OriginWidgetModel {
  const analysis = useAnalysisStore()
  const criteria = useCriteriaStore()
  const data = useDataStore()
  const clicked = ref<EntityRef | null>(null)

  const rows = computed((): OriginRow[] => {
    const byRef = new Map<EntityRef, OriginEntry>(analysis.origins.map((o) => [`origin:${o.id}` as EntityRef, o]))
    const out: OriginRow[] = []
    for (const calc of analysis.originRanking) {
      const rank = calc.value
      if (rank === null) continue
      const origin = byRef.get(rank.origin)
      if (origin === undefined) continue
      out.push({ ref: rank.origin, origin, rank, calc, top: rank.rank === 1, recommendedStarting: rank.recommendedStartingWeapons })
    }
    return out
  })
  const hasTarget = computed(() => analysis.target.value !== null && rows.value.length > 0)
  const top = computed(() => rows.value[0] ?? null)
  const shown = computed((): OriginRow | null => {
    const wanted = clicked.value ?? analysis.effectiveOrigin
    return rows.value.find((r) => r.ref === wanted) ?? top.value
  })
  const startAttributes = computed(() => (shown.value === null ? null : originAttributes(shown.value.origin)))
  const hiddenCount = computed(() => {
    const all = data.dataset('origins')?.entries ?? []
    return all.length - analysis.origins.length
  })

  const derived = computed((): Calc<DerivedStats> | null => {
    const tables = data.file('tables')?.tables ?? null
    const attrs = startAttributes.value
    return tables === null || attrs === null ? null : derivedStats(attrs, tables)
  })

  const equipment = computed((): EquipmentGroup[] => {
    const row = shown.value
    if (row === null) return []
    const recommended = new Set(row.recommendedStarting)
    const groups: EquipmentGroup[] = []
    for (const key of ['Armaments', 'Spells', 'Gear', 'Misc'] as const) {
      const items = row.origin.starting_equipment[key].map((name) => ({
        name,
        // Une entrée d'armes peut grouper plusieurs objets (« Shortbow + Bone Arrow ») : elle est recommandée si l'un d'eux l'est.
        recommended: key === 'Armaments' && [...recommended].some((w) => name.includes(w)),
      }))
      if (items.length > 0) groups.push({ key, label: EQUIPMENT_LABELS[key], items })
    }
    return groups
  })

  const earlyWeapons = computed((): ScoredWeapon[] => [...(analysis.recommendations.columns.find((c) => c.stage === 'early')?.weapons ?? [])])
  const weaponsLoaded = computed(() => analysis.candidates.length > 0)
  const target = computed(() => ({ archetype: criteria.criteria.target.archetype, level: criteria.criteria.target.level }))

  return {
    hasTarget,
    rows,
    top,
    shown,
    startAttributes,
    targetAttributes: computed(() => analysis.target.value),
    select: (ref) => {
      clicked.value = ref
    },
    hiddenCount,
    derived,
    equipment,
    earlyWeapons,
    weaponsLoaded,
    target,
  }
}
