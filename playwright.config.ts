// Configuration de Playwright : un seul projet « chromium » (le Chromium de Playwright, jamais un navigateur du système), serveur `vite preview`, sorties dans .cache/.
import { defineConfig } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'tests/e2e',
  // L'audit de mise en page est long : il est lancé à part (`npm run e2e:audit`, playwright.audit.config.ts).
  testIgnore: ['**/audit.spec.ts'],
  // Vérifie que dist/ est compilé avant de lancer les tests.
  globalSetup: './tests/e2e/global-setup.ts',
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
    reuseExistingServer: true,
  },
})
