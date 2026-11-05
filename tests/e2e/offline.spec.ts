// Hors ligne : première visite en ligne, service worker actif et précache terminé, coupure du réseau, rechargement ;
// la coquille s'affiche et les données se chargent depuis le cache, sans requête échouée.
import { test, expect } from '@playwright/test'
import { readDataManifest, watchPage } from './support.ts'

test('le site se recharge sans réseau, données comprises', async ({ page, context, baseURL }) => {
  const watcher = watchPage(page, baseURL ?? '')
  await page.goto('./', { waitUntil: 'networkidle' })
  await expect(page.locator('main')).toBeVisible()

  // Première visite : le service worker s'enregistre, s'installe (précache complet) puis s'active.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })

  // Le précache (clés suffixées de ?__WB_REVISION__=, d'où ignoreSearch) doit contenir la page d'entrée, le manifeste de l'application et tous les fichiers de données du manifeste.
  const manifest = readDataManifest()
  const dataPaths = ['manifest.json', ...Object.values(manifest.files).map((file) => file.path)]
  const missing = await page.evaluate(async (paths) => {
    const base = new URL('./', location.href)
    const wanted = [new URL('index.html', base).href, new URL('manifest.webmanifest', base).href, ...paths.map((p) => new URL(`data/${p}`, base).href)]
    const absent: string[] = []
    for (const url of wanted) if (!(await caches.match(url, { ignoreSearch: true }))) absent.push(url)
    return absent
  }, dataPaths)
  expect(missing, 'éléments absents du précache').toEqual([])
  expect(watcher.problems, 'première visite').toEqual([])
  expect(watcher.foreign).toEqual([])

  // Coupure du réseau, puis rechargement : la page est contrôlée par le service worker.
  await context.setOffline(true)
  const served: string[] = []
  page.on('response', (response) => {
    if (response.url().includes('/data/') && response.fromServiceWorker() && response.ok()) served.push(response.url())
  })
  watcher.problems.length = 0
  await page.reload({ waitUntil: 'load' })

  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('header').first()).toBeVisible()
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null), 'page contrôlée par le service worker').toBe(true)

  // Le manifeste de données est demandé au démarrage : il vient du cache.
  await expect.poll(() => served.some((url) => url.endsWith('/data/manifest.json')), { message: 'manifeste de données servi par le service worker' }).toBe(true)

  // Tous les fichiers de données se chargent sans réseau.
  const failures = await page.evaluate(async (paths) => {
    const bad: string[] = []
    for (const p of paths) {
      try {
        const response = await fetch(`data/${p}`)
        if (!response.ok) bad.push(`${p} : HTTP ${response.status}`)
        else await response.json()
      } catch (error) {
        bad.push(`${p} : ${String(error)}`)
      }
    }
    return bad
  }, dataPaths)
  expect(failures, 'fichiers de données illisibles hors ligne').toEqual([])

  expect(watcher.problems, 'après rechargement hors ligne').toEqual([])
  expect(watcher.foreign).toEqual([])
})
