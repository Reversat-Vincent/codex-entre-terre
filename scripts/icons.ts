// Génération des icônes de l'application (architecture § 2 et § 11) : rend le symbole `i-mark` du sprite en or sur fond sombre,
// avec le Chromium de Playwright, puis écrit les PNG 192 et 512, une version « maskable » et le favicon SVG dans public/icons/.
// Les couleurs sont lues dans src/styles/tokens.css (bloc du thème sombre) : aucune valeur n'est recopiée ici.
// Usage : `npm run icons` (nécessite `npx playwright install chromium`). La sortie est commitée ; elle n'est pas régénérée à la compilation.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'public', 'icons')

/** Largeur du trait du symbole, en unités de la grille 24 (docs/design/ds/README.md, « Iconographie »). */
const STROKE_WIDTH = 1.6

/**
 * Lit une variable CSS dans le premier bloc de tokens.css (thème sombre, par défaut).
 * @param css Contenu de tokens.css.
 * @param name Nom de la variable, sans `--`.
 * @returns La valeur, par exemple `#13110e`.
 */
function readToken(css: string, name: string): string {
  const block = /:root\s*,\s*\[data-theme="sombre"\]\s*\{([^}]*)\}/.exec(css)?.[1]
  const value = block ? new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim() : undefined
  if (!value) throw new Error(`Variable --${name} introuvable dans le bloc sombre de src/styles/tokens.css.`)
  return value
}

/**
 * Lit le contenu (tracés) du symbole `i-mark` dans le sprite d'icônes, source unique de la marque.
 * @returns Les éléments `<path>` du symbole, sur une grille de 24.
 */
function readMarkPaths(): string {
  const sprite = readFileSync(join(root, 'src', 'components', 'ds', 'IconSprite.vue'), 'utf-8')
  const inner = /<symbol id="i-mark" viewBox="0 0 24 24">(.*?)<\/symbol>/s.exec(sprite)?.[1]
  if (!inner) throw new Error('Symbole i-mark introuvable dans src/components/ds/IconSprite.vue.')
  return inner.replaceAll('></path>', '/>')
}

/**
 * Construit un document SVG carré : fond plein et marque centrée.
 * @param size Côté du carré, en pixels.
 * @param markRatio Part du côté occupée par la grille de 24 du symbole (le losange en occupe environ 79 %).
 * @param colors Couleurs du fond et du trait.
 * @param colors.background Couleur du fond.
 * @param colors.stroke Couleur de la marque.
 * @param rounded Rayon des coins du fond, en part du côté (0 : carré, pour les icônes recadrées par le système).
 * @returns Le SVG.
 */
function buildSvg(size: number, markRatio: number, colors: { background: string; stroke: string }, rounded: number): string {
  const scale = (size * markRatio) / 24
  const offset = (size - size * markRatio) / 2
  const radius = size * rounded
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${colors.background}"/>`,
    `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${colors.stroke}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">`,
    readMarkPaths(),
    '</g>',
    '</svg>',
  ].join('')
}

/** Point d'entrée : lit les tokens, rend les PNG avec le Chromium de Playwright, écrit le favicon. */
async function main(): Promise<void> {
  const css = readFileSync(join(root, 'src', 'styles', 'tokens.css'), 'utf-8')
  const colors = { background: readToken(css, 'bg'), stroke: readToken(css, 'gold') }
  mkdirSync(outDir, { recursive: true })

  // Icône « any » : la marque occupe l'essentiel du carré. « maskable » : la marque reste dans la zone de sécurité (cercle de 80 % du côté),
  // car le système recadre l'icône selon sa propre forme ; le fond est donc plein, sans coins arrondis.
  const targets = [
    { file: 'icon-192.png', size: 192, ratio: 0.92, rounded: 0 },
    { file: 'icon-512.png', size: 512, ratio: 0.92, rounded: 0 },
    { file: 'icon-maskable-512.png', size: 512, ratio: 0.64, rounded: 0 },
  ]

  // Chromium de Playwright uniquement (jamais un navigateur du système : ni `channel`, ni `executablePath`).
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    for (const { file, size, ratio, rounded } of targets) {
      await page.setViewportSize({ width: size, height: size })
      await page.setContent(`<style>html,body{margin:0}svg{display:block}</style>${buildSvg(size, ratio, colors, rounded)}`)
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } })
      writeFileSync(join(outDir, file), png)
      console.log(`public/icons/${file} (${png.length} octets)`)
    }
  } finally {
    await browser.close()
  }

  // Favicon : même symbole, coins arrondis, grille de 64 px (taille indicative : le SVG s'adapte à l'onglet).
  writeFileSync(join(outDir, 'favicon.svg'), `${buildSvg(64, 0.92, colors, 0.16)}\n`)
  console.log('public/icons/favicon.svg')
}

await main()
