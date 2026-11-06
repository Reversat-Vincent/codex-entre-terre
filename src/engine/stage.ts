// Étape de progression d'une arme, d'un objet ou d'une rencontre, et étape courante du joueur selon son mode de progression.
// Méthode : docs/design/ds/calculs.md, « Étape de progression d'une arme » (règles D10, table des Remembrances D12, étiquette DLC D11 et D18,
// surcharges d'étape D39) ; configuration : config/stages.ts, config/remembrances.ts. Les régions des objets viennent de `derived.regions` (préparation des données).

import type { DatasetKey, EntityRef } from '../data/datasets.ts'
import type { AcquisitionDerived, SourceTag } from '../data/types/common.ts'
import { DLC_SOURCE, DLC_ZONE, DLC_ZONES, REGION_PARENT, REGION_STAGE, STAGE_IDS, STAGE_OVERRIDES, stageIndex } from './config/stages.ts'
import type { DlcZone, StageId } from './config/stages.ts'
import { REMEMBRANCES } from './config/remembrances.ts'
import type { RemembranceLink } from './config/remembrances.ts'
import type { EncounterIndex } from './encounters.ts'
import { makeCalc, nullCalc, ownValue } from './types.ts'
import type { Calc, DataRef, ExplanationLimit } from './types.ts'

/** Provenance de l'étape : règle de calculs.md qui l'a donnée (`override` = surcharge documentée de config/stages.ts, règle 0). */
export type StageBasis = 'override' | 'remembrance' | 'acquisition' | 'regions_mentioned' | 'starting' | 'encounter' | 'dlc-label'

/** Étape d'un objet ou d'une rencontre. */
export interface StageInfo {
  readonly stage: StageId
  /** Sous-zone du DLC (clé de tri) ; `null` hors DLC ou pour « DLC non localisé ». */
  readonly dlcZone: DlcZone | null
  readonly basis: StageBasis
  /** Région qui a décidé de l'étape (la plus précoce), `null` si l'étape vient d'une surcharge, de l'étiquette DLC ou de l'équipement de départ. */
  readonly region: string | null
  /** Rencontre de la Remembrance, quand la règle 1 s'applique. */
  readonly remembrance: RemembranceLink | null
}

/**
 * Étape d'une région (config/stages.ts, table du § 1.3).
 * @param region Nom exact de data/ ; une région venue de l'état de l'utilisateur est lue par clé propre seulement (`constructor` n'est pas une région).
 * @returns L'étape, ou `null` si la région n'est pas dans la table.
 */
export function stageOfRegion(region: string): StageId | null {
  return ownValue(REGION_STAGE, region) ?? null
}

/**
 * Sous-zone DLC d'une région (config/stages.ts).
 * @param region Nom exact de data/.
 * @returns La sous-zone, ou `null` hors DLC.
 */
export function dlcZoneOfRegion(region: string): DlcZone | null {
  return ownValue(DLC_ZONE, region) ?? null
}

/**
 * Rang de tri d'une sous-zone DLC dans la colonne : Entrée, Cœur, Enir-Ilim, puis « DLC non localisé » en fin de colonne (D18).
 * @param zone Sous-zone, ou `null`.
 * @returns Un rang croissant.
 */
export function dlcZoneRank(zone: DlcZone | null): number {
  return zone === null ? DLC_ZONES.length : DLC_ZONES.indexOf(zone)
}

/**
 * Ancêtres d'une région connue (config/stages.ts, `REGION_PARENT`), du plus proche au plus lointain.
 * @param region Région.
 * @returns Ses régions parentes.
 */
function ancestors(region: string): string[] {
  const out: string[] = []
  let cur = ownValue(REGION_PARENT, region)
  while (cur !== undefined && !out.includes(cur)) {
    out.push(cur)
    cur = ownValue(REGION_PARENT, cur)
  }
  return out
}

/**
 * Régions les plus précises d'une liste (calculs.md, règle 2) : retire les doublons et les régions parentes d'une autre valeur de la liste.
 * @param regions Régions brutes (par exemple `encounters[].regions`).
 * @returns Les régions gardées, dans l'ordre reçu.
 */
export function mostPrecise(regions: readonly string[]): string[] {
  const unique = [...new Set(regions)]
  const parents = new Set(unique.flatMap(ancestors))
  return unique.filter((r) => !parents.has(r))
}

/** Étape la plus précoce d'une liste de régions, sans sa provenance. */
interface Earliest {
  readonly stage: StageId
  readonly region: string
  readonly dlcZone: DlcZone | null
}

/**
 * Étape la plus précoce parmi des régions (calculs.md, règles 2 à 4) ; en DLC, la sous-zone la plus précoce.
 * @param regions Régions déjà réduites aux plus précises.
 * @returns L'étape et la région décisive, ou `null` si aucune région n'est dans la table.
 */
export function earliestStage(regions: readonly string[]): Earliest | null {
  let best: Earliest | null = null
  for (const region of regions) {
    const stage = stageOfRegion(region)
    if (stage === null) continue
    const dlcZone = stage === 'dlc' ? dlcZoneOfRegion(region) : null
    if (
      best === null ||
      stageIndex(stage) < stageIndex(best.stage) ||
      (stage === 'dlc' && best.stage === 'dlc' && dlcZoneRank(dlcZone) < dlcZoneRank(best.dlcZone))
    ) {
      best = { stage, region, dlcZone }
    }
  }
  return best
}

/**
 * Étape d'une rencontre de boss (calculs.md, « Remembrances » : règle 2 appliquée à `encounters[].regions`).
 * @param index Index des rencontres.
 * @param key Clé `bossId/encounterId`.
 * @returns L'étape ; `null` avec `encounter-missing` si la rencontre n'existe pas, `stage-unclassified` si aucune région n'est dans la table.
 */
export function encounterStage(index: EncounterIndex, key: string): Calc<StageInfo> {
  const ref = index.byKey.get(key)
  if (ref === undefined || ref.encounter === null) return nullCalc('stage', { code: 'encounter-missing', params: { encounter: key } })
  const regions = ref.encounter.regions
  const inputs: DataRef[] = [{ file: 'bosses', entry: key, field: 'encounters[].regions', value: regions.join(', '), reliability: 'wiki' }]
  const found = earliestStage(mostPrecise(regions))
  if (found === null) return nullCalc('stage', { code: 'stage-unclassified' }, { inputs })
  return makeCalc<StageInfo>('stage', { ...found, basis: 'encounter', remembrance: null }, {
    components: [{ code: 'stage-index', value: stageIndex(found.stage), params: { stage: found.stage, region: found.region } }],
    inputs,
  })
}

/** Entrée qui a une étape : arme ou objet préparé avec ses régions dérivées. */
export interface StageEntry {
  readonly id: string
  readonly name: string
  readonly source: SourceTag
  readonly derived: Pick<AcquisitionDerived, 'regions'>
}

/** Contexte du calcul d'étape d'une entrée. */
export interface StageContext {
  /** Référence de l'entrée (`weapon:id`…) : clé de la table des Remembrances. */
  readonly ref: EntityRef
  /** Jeu de données de l'entrée (références de données du « Pourquoi ? »). */
  readonly file: DatasetKey
  /** Index des rencontres (règle 1) ; `null` si `bosses` n'est pas chargé : la règle 1 est alors sautée et signalée. */
  readonly encounters: EncounterIndex | null
  /** Noms des armes de départ de l'origine retenue (règle 7) ; `null` sans origine retenue. */
  readonly startingArmaments: ReadonlySet<string> | null
}

/**
 * Applique l'étiquette DLC (calculs.md, règle 5) : `source = "Shadow of the Erdtree"` impose l'étape DLC ; sans sous-zone, « DLC non localisé ».
 * @param info Étape trouvée par les règles précédentes, ou `null`.
 * @param source Étiquette de source de l'entrée.
 * @param limits Limites, complétées en place.
 * @returns L'étape corrigée.
 */
function applyDlcLabel(info: StageInfo | null, source: SourceTag, limits: ExplanationLimit[]): StageInfo | null {
  if (source !== DLC_SOURCE) return info
  if (info !== null && info.stage === 'dlc' && info.dlcZone !== null) return info
  limits.push({ code: 'dlc-unlocated' })
  return { stage: 'dlc', dlcZone: null, basis: 'dlc-label', region: null, remembrance: info?.remembrance ?? null }
}

/**
 * Étape d'une arme ou d'un objet (calculs.md, « Étape de progression d'une arme ») : 0. surcharge documentée (config/stages.ts,
 * `STAGE_OVERRIDES`, D39), qui passe avant toute autre règle ; 1. Remembrance (étape de la rencontre de la table) ;
 * 2-3. acquisitions, région la plus précise, étape la plus précoce ; 4. repli `regions_mentioned` ; 5. étiquette DLC ; 7. équipement de départ
 * de l'origine retenue = Début. Sinon « Non classé » : valeur `null` avec la limite `stage-unclassified` (hors des colonnes, D10).
 * @param entry Entrée préparée.
 * @param ctx Référence, fichier, index des rencontres et armes de départ de l'origine retenue.
 * @returns L'étape et sa provenance, ou `null` (Non classé).
 */
export function entryStage(entry: StageEntry, ctx: StageContext): Calc<StageInfo> {
  const override = STAGE_OVERRIDES[ctx.ref]
  if (override !== undefined) {
    const params = { stage: override.stage, zone: override.dlcZone ?? '' }
    return makeCalc<StageInfo>('stage', { stage: override.stage, dlcZone: override.dlcZone, basis: 'override', region: null, remembrance: null }, {
      components: [{ code: 'stage-index', value: stageIndex(override.stage), params }],
      // La condition d'obtention est un fait du wiki ; l'étape qui en découle est une déduction (lieu de la condition → étape).
      inputs: [{ file: 'config', entry: 'stages', field: `STAGE_OVERRIDES["${ctx.ref}"]`, value: override.source, reliability: 'deduced' }],
      limits: [{ code: 'stage-override', params }],
    })
  }
  const limits: ExplanationLimit[] = []
  const inputs: DataRef[] = []
  let info: StageInfo | null = null

  const link = REMEMBRANCES[ctx.ref]
  if (link !== undefined) {
    inputs.push({ file: 'config', entry: 'remembrances', field: ctx.ref, value: link.encounter, reliability: 'calculated' })
    if (ctx.encounters === null) limits.push({ code: 'remembrance-encounter-unavailable' })
    else {
      const enc = encounterStage(ctx.encounters, link.encounter)
      inputs.push(...enc.explanation.inputs)
      if (enc.value !== null) info = { ...enc.value, basis: 'remembrance', remembrance: link }
      else limits.push({ code: 'remembrance-encounter-missing', params: { encounter: link.encounter } })
    }
  }

  if (info === null && ctx.startingArmaments?.has(entry.name) === true) {
    inputs.push({ file: 'origins', field: 'starting_equipment.Armaments', value: entry.name, reliability: 'wiki' })
    info = { stage: 'early', dlcZone: null, basis: 'starting', region: null, remembrance: null }
  }

  if (info === null) {
    const regions = entry.derived.regions
    if (regions.values.length > 0) {
      inputs.push({ file: ctx.file, entry: entry.id, field: 'derived.regions.values', value: regions.values.join(', '), reliability: 'deduced' })
      const found = earliestStage(regions.values)
      if (found !== null) {
        info = { ...found, basis: regions.basis === 'regions_mentioned' ? 'regions_mentioned' : 'acquisition', remembrance: null }
      }
    }
  }

  info = applyDlcLabel(info, entry.source, limits)
  if (entry.source === DLC_SOURCE) inputs.push({ file: ctx.file, entry: entry.id, field: 'source', value: entry.source, reliability: 'wiki' })
  if (info === null) return nullCalc('stage', { code: 'stage-unclassified' }, { inputs, limits })
  if (info.basis === 'regions_mentioned') limits.push({ code: 'stage-from-regions-mentioned' })
  return makeCalc<StageInfo>('stage', info, {
    components: [{ code: 'stage-index', value: stageIndex(info.stage), params: { stage: info.stage, region: info.region ?? '' } }],
    inputs,
    limits,
  })
}

/** Progression saisie par le joueur (tranche `progress` des critères). */
export interface ProgressInput {
  readonly mode: 'stage' | 'boss' | 'region'
  readonly stage: StageId
  readonly regions: readonly string[]
}

/** Repères de la frise pour le mode « Boss vaincus ». */
export interface ProgressTimeline {
  /** Étape du prochain boss de la frise (`null` si l'histoire est finie ou si l'étape du prochain boss est inconnue). */
  readonly nextStage: StageId | null
  /** Nom de nœud du prochain boss, pour le « Pourquoi ? ». */
  readonly nextNode: string | null
  /** Vrai si toutes les étapes de l'histoire (et la voie DLC si elle est activée) sont terminées. */
  readonly complete: boolean
  /** Vrai si le DLC est activé dans les critères. */
  readonly dlcEnabled: boolean
}

/**
 * Étape courante du joueur (calculs.md, « Étape de progression d'une arme », « Étape courante ») : mode « étape » = étape choisie ;
 * « régions » = étape la plus avancée des régions atteintes ; « boss vaincus » = étape du prochain boss de la frise, Fin de jeu (ou DLC
 * s'il est activé) une fois l'histoire finie.
 * @param progress Progression saisie.
 * @param timeline Repères de la frise ; `null` si `bosses` n'est pas chargé (mode « boss » ramené à l'étape choisie, avec une limite).
 * @returns L'étape courante.
 */
export function currentStage(progress: ProgressInput, timeline: ProgressTimeline | null): Calc<StageId> {
  if (progress.mode === 'stage') {
    return makeCalc('stage', progress.stage, { components: [{ code: 'stage-index', value: stageIndex(progress.stage), params: { stage: progress.stage } }] })
  }
  if (progress.mode === 'region') {
    let best: StageId | null = null
    const unknown: string[] = []
    for (const r of progress.regions) {
      const s = stageOfRegion(r)
      if (s === null) unknown.push(r)
      else if (best === null || stageIndex(s) > stageIndex(best)) best = s
    }
    const limits: ExplanationLimit[] = unknown.map((r) => ({ code: 'region-unknown', params: { region: r } }))
    const inputs: DataRef[] = [{ file: 'config', entry: 'stages', field: 'REGION_STAGE', value: progress.regions.join(', '), reliability: 'calculated' }]
    if (best === null) {
      limits.push({ code: 'no-region-reached' })
      return makeCalc('stage', STAGE_IDS[0], { components: [{ code: 'stage-index', value: 0, params: { stage: STAGE_IDS[0] } }], inputs, limits })
    }
    return makeCalc('stage', best, { components: [{ code: 'stage-index', value: stageIndex(best), params: { stage: best } }], inputs, limits })
  }
  if (timeline === null) {
    return makeCalc('stage', progress.stage, {
      components: [{ code: 'stage-index', value: stageIndex(progress.stage), params: { stage: progress.stage } }],
      limits: [{ code: 'timeline-unavailable' }],
    })
  }
  if (timeline.nextStage !== null) {
    return makeCalc('stage', timeline.nextStage, {
      components: [{ code: 'stage-index', value: stageIndex(timeline.nextStage), params: { stage: timeline.nextStage, node: timeline.nextNode ?? '' } }],
      limits: [{ code: 'stage-from-next-boss', params: { node: timeline.nextNode ?? '' } }],
    })
  }
  const stage: StageId = timeline.complete && timeline.dlcEnabled ? 'dlc' : 'endgame'
  return makeCalc('stage', stage, {
    components: [{ code: 'stage-index', value: stageIndex(stage), params: { stage } }],
    limits: [{ code: timeline.complete ? 'story-complete' : 'next-boss-stage-unknown' }],
  })
}

/**
 * Étapes d'avance d'un objet sur le joueur (score, composante 3 : −4 par étape d'avance).
 * @param item Étape de l'objet.
 * @param player Étape courante.
 * @returns `max(0, rang(objet) − rang(joueur))`.
 */
export function stagesAhead(item: StageId, player: StageId): number {
  return Math.max(0, stageIndex(item) - stageIndex(player))
}
