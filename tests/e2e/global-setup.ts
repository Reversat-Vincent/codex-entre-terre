// Préparation commune des tests e2e : vérifie que dist/ a été compilé (service worker et manifeste compris), faute de quoi `vite preview` ne sert rien d'utile.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Fichiers que `npm run build` doit avoir produits. */
const REQUIRED = ['index.html', 'sw.js', 'manifest.webmanifest', 'data/manifest.json']

/** Arrête l'exécution avec un message clair si `dist/` est absent ou incomplet. */
export default function globalSetup(): void {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url))
  const missing = REQUIRED.filter((file) => !existsSync(join(dist, file)))
  if (missing.length > 0) {
    throw new Error(`dist/ est absent ou incomplet (manquant : ${missing.join(', ')}). Lancez « npm run build » avant « npm run e2e ».`)
  }
}
