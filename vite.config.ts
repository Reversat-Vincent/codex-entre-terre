// Configuration de Vite et de Vitest : base de GitHub Pages, plugin Vue, version injectée, PWA (hors ligne, installable), sortie dans dist/.
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineConfig({
  base: '/codex-entre-terre/',
  plugins: [
    vue(),
    VitePWA({
      // « prompt » : une nouvelle version attend ; l'utilisateur choisit quand recharger (AppUpdatePrompt), jamais de rechargement imposé.
      registerType: 'prompt',
      // L'enregistrement est fait par src/pwa/registerSW.ts (branché au démarrage), pas par un script injecté dans index.html.
      injectRegister: false,
      workbox: {
        // Site, polices (woff2), icônes et données (data/, copiées depuis public/) : une version servie est complète hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Le plus gros fichier de données fait environ 1,6 Mio ; 4 Mio laissent de la marge sans autoriser d'excès.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Toute navigation (rechargement hors ligne compris) reçoit la page d'entrée précachée ; le routeur lit le « hash ».
        navigateFallback: 'index.html',
      },
      manifest: {
        name: "Codex de l'Entre-terre",
        short_name: 'Codex',
        description: 'Outil de fan non officiel pour s’orienter dans les données d’Elden Ring.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        // Exception aux tokens (comme `theme-color` dans index.html) : le manifeste est lu hors de la page, avant tout CSS.
        // Valeurs de `--bg` (barre de titre) et `--surface` (écran de lancement) du thème sombre, dans src/styles/tokens.css.
        theme_color: '#13110e',
        background_color: '#1b1814',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
  },
})
