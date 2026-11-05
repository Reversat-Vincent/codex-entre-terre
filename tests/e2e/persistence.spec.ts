// Persistance : un réglage (le thème) survit à un rechargement ; l'export et l'import passent par la page Profil, pas encore construite.
import { test, expect } from '@playwright/test'

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

// À COMPLÉTER quand la page Profil existera : modifier un réglage et un critère, exporter (téléchargement JSON),
// vider le stockage, importer le fichier exporté, vérifier que l'état est identique, puis « Annuler » et vérifier le retour à l'état précédent.
test.fixme('export puis import depuis la page Profil restituent le même état', async ({ page }) => {
  await page.goto('./#/profil')
})
