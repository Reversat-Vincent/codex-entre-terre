// Configuration de l'audit de mise en page (`npm run e2e:audit`) : celle de `playwright.config.ts`, mais seul `audit.spec.ts` est lancé.
import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/audit.spec.ts'],
  outputDir: '.cache/playwright/audit-results',
  reporter: [['list']],
})
