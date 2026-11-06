// Tests de la logique d'affichage de la page Profil : date et heure, état du stockage, comparatif d'import, écarts détaillés.
import { describe, expect, it } from 'vitest'
import { MAX_ISSUES_SHOWN, compareRows, describeStorage, formatDateTime, shownIssues } from '../../../src/components/domain/profile/profileModel.ts'
import type { ImportSummary } from '../../../src/persistence/importer.ts'
import type { ValidationIssue } from '../../../src/persistence/model.ts'

describe('formatDateTime', () => {
  it('met un horodatage ISO en français, avec l’heure', () => {
    const text = formatDateTime('2026-11-05T14:30:00')
    expect(text).toContain('5 novembre 2026')
    expect(text).toMatch(/14[:h]30/)
  })
  it('rend null pour une valeur absente ou illisible', () => {
    expect(formatDateTime(null)).toBeNull()
    expect(formatDateTime('pas une date')).toBeNull()
  })
})

describe('describeStorage', () => {
  it('stockage disponible : bandeau d’information sans alerte', () => {
    const report = describeStorage('ok')
    expect(report.tone).toBe('info')
    expect(report.implications.length).toBeGreaterThan(0)
  })
  it('stockage indisponible : avertissement qui dit que rien n’est conservé', () => {
    const report = describeStorage('unavailable')
    expect(report.tone).toBe('warn')
    expect(report.implications.join(' ')).toContain('ne seront pas conservés')
  })
  it('version plus récente : lecture seule, import désactivé', () => {
    const report = describeStorage('readonly-newer')
    expect(report.tone).toBe('warn')
    expect(report.implications.join(' ')).toContain('lecture seule')
  })
  it('chaque état a une icône et un titre', () => {
    for (const mode of ['ok', 'unavailable', 'readonly-newer'] as const) {
      const report = describeStorage(mode)
      expect(report.icon).not.toBe('')
      expect(report.title).not.toBe('')
    }
  })
})

describe('compareRows', () => {
  const summary: ImportSummary = { exportedAt: null, appVersion: null, schemaVersion: 1, migratedFrom: null, profiles: 3, pins: 1200, defeatedBosses: 0, recentSearches: 8 }
  it('une ligne par famille de données, avec les nombres formatés', () => {
    const rows = compareRows({ profiles: 1, pins: 4, defeatedBosses: 2, recentSearches: 0 }, summary)
    expect(rows.map((r) => r.label)).toEqual(['Profils enregistrés', 'Éléments de Ma liste', 'Boss vaincus', 'Recherches récentes'])
    expect(rows[0]).toMatchObject({ current: '1', imported: '3' })
    // Séparateur de milliers : espace fine insécable (format.ts).
    expect(rows[1]?.imported).toBe('1\u202f200')
    expect(rows[2]).toMatchObject({ current: '2', imported: '0' })
  })
})

describe('shownIssues', () => {
  const issue = (i: number): ValidationIssue => ({ path: `state.pins[${i}]`, message: `écart ${i}` })
  it('garde tous les écarts quand ils sont peu nombreux', () => {
    const issues = [issue(1), issue(2)]
    expect(shownIssues(issues)).toEqual({ shown: issues, more: 0 })
  })
  it('limite la liste et compte les écarts non listés', () => {
    const issues = Array.from({ length: MAX_ISSUES_SHOWN + 4 }, (_, i) => issue(i))
    const { shown, more } = shownIssues(issues)
    expect(shown).toHaveLength(MAX_ISSUES_SHOWN)
    expect(more).toBe(4)
  })
})
