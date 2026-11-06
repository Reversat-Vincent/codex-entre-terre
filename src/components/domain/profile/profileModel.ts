// Logique d'affichage pure de la page Profil : date et heure en français, textes d'état du stockage, lignes du comparatif d'import.
// Aucun accès au stockage ni aux stores : les composants lui passent des valeurs.

import type { StorageMode } from '../../../persistence/bridge.ts'
import type { ImportSummary } from '../../../persistence/importer.ts'
import type { ValidationIssue } from '../../../persistence/model.ts'
import { formatInt } from '../../../ui/format.ts'

/** Nombre maximal d'écarts du validateur détaillés dans un refus d'import (le message général dit déjà le reste). */
export const MAX_ISSUES_SHOWN = 5

/**
 * Date et heure d'un horodatage ISO, en français (« 5 novembre 2026 à 14:30 »).
 * @param iso Horodatage ISO 8601, ou `null`.
 * @returns Le texte, ou `null` si l'horodatage est absent ou illisible (l'appelant affiche « Non documenté »).
 */
export function formatDateTime(iso: string | null): string | null {
  if (iso === null) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

/** Explication de l'état du stockage : phrase d'état, ton du bandeau et conséquences concrètes. */
export interface StorageReport {
  /** Phrase d'état, en tête du bandeau. */
  title: string
  /** `info` quand tout va bien, `warn` en mode dégradé. */
  tone: 'info' | 'warn'
  /** Icône du bandeau (le ton ne porte jamais seul le sens). */
  icon: string
  /** Ce que cet état implique pour l'utilisateur, une phrase par entrée. */
  implications: string[]
}

/**
 * Décrit l'état du stockage (docs/architecture.md § 7, mode dégradé).
 * @param mode État fourni par le store `app`.
 * @returns Le rapport à afficher.
 */
export function describeStorage(mode: StorageMode): StorageReport {
  if (mode === 'unavailable') {
    return {
      title: 'Le stockage de ce navigateur est indisponible.',
      tone: 'warn',
      icon: 'alert',
      implications: [
        'Vos réglages ne seront pas conservés sur cet appareil : ils disparaissent quand vous fermez ou rechargez la page.',
        'L’application fonctionne normalement tant que la page reste ouverte.',
        'Exportez une sauvegarde avant de partir pour retrouver vos profils, Ma liste et votre disposition.',
        'Causes fréquentes : navigation privée, stockage plein, ou réglage du navigateur qui bloque les données de site.',
      ],
    }
  }
  if (mode === 'readonly-newer') {
    return {
      title: 'Vos données viennent d’une version plus récente du Codex.',
      tone: 'warn',
      icon: 'lock',
      implications: [
        'Cette version les lit sans les modifier : vos changements ne sont pas enregistrés, pour ne rien écraser.',
        'L’import d’une sauvegarde est désactivé tant que les données sont en lecture seule.',
        'Rechargez la page pour obtenir la dernière version de l’application ; l’export reste possible.',
      ],
    }
  }
  return {
    title: 'Vos réglages sont enregistrés dans ce navigateur.',
    tone: 'info',
    icon: 'check-c',
    implications: [
      'Profils, Ma liste, boss vaincus, disposition du tableau de bord, préférences et recherches récentes restent sur cet appareil.',
      'Rien n’est envoyé sur un serveur et rien n’est synchronisé avec vos autres appareils : utilisez l’export et l’import pour les déplacer.',
      'Vider les données du site dans le navigateur efface aussi ces réglages : pensez à exporter une sauvegarde.',
    ],
  }
}

/** Ligne du comparatif affiché avant la confirmation d'un import. */
export interface CompareRow {
  label: string
  /** Valeur de l'état actuel, déjà formatée. */
  current: string
  /** Valeur de l'état importé, déjà formatée. */
  imported: string
}

/** Quantités de l'état actuel, lues dans les stores par la vue. */
export interface CurrentCounts {
  profiles: number
  pins: number
  defeatedBosses: number
  recentSearches: number
}

/**
 * Construit le comparatif « actuellement / après l'import ».
 * @param current Quantités de l'état actuel.
 * @param summary Résumé du fichier validé.
 * @returns Une ligne par famille de données remplacée.
 */
export function compareRows(current: CurrentCounts, summary: ImportSummary): CompareRow[] {
  const row = (label: string, now: number, next: number): CompareRow => ({ label, current: formatInt(now), imported: formatInt(next) })
  return [
    row('Profils enregistrés', current.profiles, summary.profiles),
    row('Éléments de Ma liste', current.pins, summary.pins),
    row('Boss vaincus', current.defeatedBosses, summary.defeatedBosses),
    row('Recherches récentes', current.recentSearches, summary.recentSearches),
  ]
}

/**
 * Écarts du validateur à détailler dans un refus.
 * @param issues Tous les écarts relevés.
 * @returns Les premiers écarts, et le nombre de ceux qui ne sont pas listés.
 */
export function shownIssues(issues: readonly ValidationIssue[]): { shown: ValidationIssue[]; more: number } {
  return { shown: issues.slice(0, MAX_ISSUES_SHOWN), more: Math.max(0, issues.length - MAX_ISSUES_SHOWN) }
}
