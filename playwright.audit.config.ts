// Configuration de l'audit de mise en page (`npm run e2e:audit`) : celle de `playwright.config.ts`, mais seul `audit.spec.ts` est lancé.
import { defineConfig } from '@playwright/test'
import base, { PORT as E2E_PORT } from './playwright.config.ts'

/** Port propre à l'audit, distinct de celui des tests e2e (4273) : les deux commandes peuvent tourner en même temps sans partager de serveur. */
const PORT = E2E_PORT + 1

export default defineConfig({
  ...base,
  testIgnore: [],
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}/codex-entre-terre/` },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/codex-entre-terre/`,
    reuseExistingServer: false,
  },
  testMatch: ['**/audit.spec.ts'],
  outputDir: '.cache/playwright/audit-results',
  reporter: [['list']],
})
