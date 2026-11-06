// Persistance : un réglage survit à un rechargement ; un export puis un import restituent le même état, un fichier invalide est refusé, un import s'annule (cahier des charges § 8).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('le thème choisi survit à un rechargement', async ({ page }) => {
  await page.goto('./', { waitUntil: 'networkidle' })
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'sombre')

  await page.getByRole('button', { name: 'Passer au thème parchemin' }).click()
  await expect(html).toHaveAttribute('data-theme', 'parchemin')

  await page.reload({ waitUntil: 'networkidle' })
  await expect(html).toHaveAttribute('data-theme', 'parchemin')

  // Le retour au thème sombre est aussi conservé.
  await page.getByRole('button', { name: 'Passer au thème sombre' }).click()
  await page.reload({ waitUntil: 'networkidle' })
  await expect(html).toHaveAttribute('data-theme', 'sombre')
})

/** Exporte depuis la page Profil, en interceptant le téléchargement. */
async function exportState(page: Page, file: string): Promise<{ state: unknown; content: string }> {
  await page.goto('./#/profil')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter ma sauvegarde' }).click()
  await (await download).saveAs(file)
  const content = readFileSync(file, 'utf-8')
  return { state: (JSON.parse(content) as { state: unknown }).state, content }
}

/** Choisit un fichier dans le champ d'import de la page Profil. */
async function chooseFile(page: Page, file: string): Promise<void> {
  await page.getByLabel('Fichier de sauvegarde à importer').setInputFiles(file)
}

test('export puis import depuis la page Profil restituent le même état', async ({ page }, testInfo) => {
  const dir = join(testInfo.config.rootDir, '..', '..', '.cache', 'e2e', 'persistence')
  mkdirSync(dir, { recursive: true })
  const html = page.locator('html')

  // 1. Réglages : un critère (Vigor, panneau du tableau de bord), un épinglé et une étape de quête (fiche PNJ), le thème.
  await page.goto('./', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Augmenter Vigor' }).click()
  await expect(page.getByRole('spinbutton', { name: 'Vigor' })).not.toHaveText('10')
  await page.goto('./#/pnj/melina')
  await page.getByRole('button', { name: /^Épingler dans Ma liste/ }).click()
  await expect(page.getByRole('button', { name: 'Dans Ma liste' })).toBeVisible()
  await page.getByRole('checkbox').first().check()
  await expect(page.getByRole('status').filter({ hasText: /^1 \/ \d+ cochées/ })).toBeVisible()
  await page.getByRole('button', { name: 'Passer au thème parchemin' }).click()
  await expect(html).toHaveAttribute('data-theme', 'parchemin')

  // 2. Export.
  const exported = await exportState(page, join(dir, 'export.json'))
  const pinned = (exported.state as { pins: unknown[] }).pins
  expect(pinned).toHaveLength(1)
  expect(Object.keys((exported.state as { quests: object }).quests)).toHaveLength(1)

  // 3. Modification de l'état : thème, quête décochée, épinglé retiré.
  await page.getByRole('button', { name: 'Passer au thème sombre' }).click()
  await page.goto('./#/pnj/melina')
  await page.getByRole('button', { name: 'Tout décocher' }).click()
  await page.getByRole('button', { name: 'Dans Ma liste' }).click()
  await page.goto('./#/profil')
  const modified = await exportState(page, join(dir, 'modified.json'))
  expect(modified.state).not.toEqual(exported.state)

  // 4. Import du fichier exporté et confirmation : l'état initial revient.
  await chooseFile(page, join(dir, 'export.json'))
  const dialog = page.getByRole('dialog', { name: 'Remplacer votre état par cette sauvegarde ?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Remplacer mes données' }).click()
  await expect(page.getByText('Sauvegarde importée.')).toBeVisible()
  await expect(html).toHaveAttribute('data-theme', 'parchemin')
  const restored = await exportState(page, join(dir, 'restored.json'))
  expect(restored.state).toEqual(exported.state)

  // 5. Annulation d'un import : l'état précédent revient.
  await page.getByRole('button', { name: 'Passer au thème sombre' }).click()
  const before = await exportState(page, join(dir, 'before-undo.json'))
  await chooseFile(page, join(dir, 'export.json'))
  await page.getByRole('dialog').getByRole('button', { name: 'Remplacer mes données' }).click()
  await expect(html).toHaveAttribute('data-theme', 'parchemin')
  await page.getByRole('button', { name: 'Annuler l’import' }).click()
  await expect(html).toHaveAttribute('data-theme', 'sombre')
  expect((await exportState(page, join(dir, 'after-undo.json'))).state).toEqual(before.state)

  // 6. Fermer la confirmation (Annuler) n'écrit rien.
  await chooseFile(page, join(dir, 'export.json'))
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(html).toHaveAttribute('data-theme', 'sombre')

  // 7. Fichiers invalides : refus affiché, rien n'est modifié.
  const bad = join(dir, 'invalid.json')
  const parsed = JSON.parse(exported.content) as Record<string, unknown>
  const invalids: [string, string][] = [
    ['pas du JSON', '{ ceci n’est pas du JSON'],
    ['mauvaise application', JSON.stringify({ ...parsed, app: 'autre-application' })],
    ['état absent', JSON.stringify({ app: parsed.app, schemaVersion: parsed.schemaVersion })],
  ]
  for (const [, content] of invalids) {
    writeFileSync(bad, content)
    await chooseFile(page, bad)
    const alert = page.getByRole('alert').filter({ hasText: 'Import refusé.' })
    await expect(alert).toBeVisible()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(html).toHaveAttribute('data-theme', 'sombre')
  }
  expect((await exportState(page, join(dir, 'after-invalid.json'))).state).toEqual(before.state)
})
