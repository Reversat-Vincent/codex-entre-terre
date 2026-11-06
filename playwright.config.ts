// Configuration de Playwright : un seul projet « chromium » (le Chromium de Playwright, jamais un navigateur du système), serveur `vite preview`, sorties dans .cache/.
import { defineConfig } from '@playwright/test'

/**
 * Port dédié aux tests e2e. Il diffère du port par défaut de `vite preview` (4173), que le développeur peut avoir ouvert, et de celui de l'audit (4274) :
 * avec `reuseExistingServer: false`, une exécution ne réutilise jamais le serveur d'une autre, qui pourrait être arrêté en cours de test.
 * Si le port est pris, Playwright échoue tout de suite au lieu de produire des erreurs de connexion intermittentes.
 */
export const PORT = 4273

export default defineConfig({
  testDir: 'tests/e2e',
  // L'audit de mise en page est long : il est lancé à part (`npm run e2e:audit`, playwright.audit.config.ts).
  testIgnore: ['**/audit.spec.ts'],
  // Vérifie que dist/ est compilé avant de lancer les tests.
  globalSetup: './tests/e2e/global-setup.ts',
  // Deux workers au plus en local : chaque worker ouvre un Chromium, et davantage de parallélisme a fait arrêter des serveurs par le système faute de mémoire.
  workers: 2,
  // Marge pour les machines chargées : les attentes d'écran (h1) et les tests complets ne doivent pas échouer sous charge.
  timeout: 60000,
  expect: { timeout: 15000 },
  outputDir: '.cache/playwright/results',
  reporter: [['list'], ['html', { outputFolder: '.cache/playwright/report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}/codex-entre-terre/`,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // `vite preview` sert dist/ : il faut l'avoir compilé (npm run build) avant.
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/codex-entre-terre/`,
    reuseExistingServer: false,
  },
})
