// Test de fumée : la page s'ouvre sous la base du site, avec la consigne de non-indexation et le titre.
import { test, expect } from '@playwright/test'

test('la page s’ouvre, non indexable, avec son titre (suffixe commun à tous les écrans)', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/Codex de l'Entre-terre$/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(new URL(page.url()).pathname).toBe('/codex-entre-terre/')
})
