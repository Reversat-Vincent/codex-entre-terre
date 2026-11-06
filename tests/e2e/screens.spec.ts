// Captures de chaque écran : chaque route de src/router/routes.ts à 390 × 844 (mobile), 768 × 1024 (tablette basse), 1024 × 768 (tablette)
// et 1440 × 900 (desktop), en pleine page dans .cache/e2e/screens/. Le test échoue sur une erreur de console, sur une requête vers un autre domaine
// que le serveur local, ou sur un débordement horizontal de la page (`scrollWidth > innerWidth` : seuls les tableaux défilants le tolèrent, dans leur cadre).
import { mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { DATASETS } from '../../src/data/datasets.ts'
import type { DatasetKey } from '../../src/data/datasets.ts'
import { routes } from '../../src/router/routes.ts'
import { WIDGET_IDS } from '../../src/widgets/ids.ts'
import { readEntryIds, watchPage } from './support.ts'

/** Largeurs testées : mobile, tablette basse (début de la plage 768–1279 px), tablette, desktop. */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablette basse', width: 768, height: 1024 },
  { name: 'tablette', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

const SCREENS_DIR = '.cache/e2e/screens'

// Les captures doivent refléter un chargement réseau normal : pas de service worker qui répondrait à la place du serveur.
test.use({ serviceWorkers: 'block' })

/**
 * Premier jeu de données dont la fiche porte ce nom de route (les armes et les objets viennent de plusieurs fichiers).
 * @param sheet Nom de la route de fiche.
 * @returns La clé du jeu de données.
 */
function datasetOfSheet(sheet: string): DatasetKey {
  const found = (Object.keys(DATASETS) as DatasetKey[]).find((key) => DATASETS[key].routes.sheet === sheet)
  if (!found) throw new Error(`Aucun jeu de données pour la fiche « ${sheet} ».`)
  return found
}

/**
 * Remplace les paramètres d'un chemin de route par des identifiants réels lus dans les données préparées.
 * @param name Nom de la route.
 * @param path Chemin de la route, avec ses paramètres (`:id`, `:widgetId`).
 * @returns Le chemin concret ; pour la route « page introuvable », un chemin qui n'existe pas.
 */
function concretePath(name: string, path: string): string {
  if (path.includes('pathMatch')) return '/page-qui-n-existe-pas'
  if (name === 'widgetFullscreen') return path.replace(':widgetId', WIDGET_IDS[0])
  if (!path.includes(':')) return path
  const key = datasetOfSheet(name)
  const id = readEntryIds(key)[0]
  if (!id) throw new Error(`Le jeu de données « ${key} » est vide.`)
  return path.replace(':id', encodeURIComponent(id))
}

const screens = routes.map((route) => ({ name: String(route.name), hash: concretePath(String(route.name), route.path) }))

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const screen of screens) {
      test(`écran ${screen.name}`, async ({ page, baseURL }) => {
        const watcher = watchPage(page, baseURL ?? '')
        await page.goto(`./#${screen.hash}`, { waitUntil: 'networkidle' })
        await expect(page.locator('main')).toBeVisible()
        // Polices chargées avant la capture, sinon la mise en page change entre deux exécutions.
        await page.evaluate(() => document.fonts.ready)

        // Aucun défilement horizontal de la page : un élément qui dépasse la fenêtre (info-bulle fermée, texte pour lecteur d'écran dans un tableau) la ferait défiler.
        const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }))
        expect(widths.scroll, `débordement horizontal de la page (${widths.scroll} px pour une fenêtre de ${widths.inner} px)`).toBeLessThanOrEqual(widths.inner)

        mkdirSync(SCREENS_DIR, { recursive: true })
        await page.screenshot({ path: `${SCREENS_DIR}/${screen.name}.${viewport.width}x${viewport.height}.png`, fullPage: true })

        expect(watcher.problems, 'erreurs de console, exceptions ou requêtes échouées').toEqual([])
        expect(watcher.foreign, 'requêtes vers un autre domaine que le serveur local').toEqual([])
      })
    }
  })
}
