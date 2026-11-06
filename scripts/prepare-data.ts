// Préparation des données pour le navigateur (`npm run data`) : lit data/*.json, contrôle, dérive et écrit public/data/ et son manifeste.
// Contrôles bloquants : arrêt avec un message clair, code de sortie 1, public/data/ laissé intact. Rapport non bloquant : .cache/data/report.json.
// Référence : docs/architecture.md § 3.

import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DataCheckError } from './data/checks.ts'
import { readRawDatasets, resetDir, writeText } from './data/io.ts'
import { MANIFEST_NAME, serialize } from './data/output.ts'
import { prepareAll } from './data/pipeline.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'data')
const outDir = join(root, 'public', 'data')
const reportDir = join(root, '.cache', 'data')

const formatBytes = (n: number): string => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} Mo` : `${(n / 1024).toFixed(1)} Ko`)

function main(): void {
  const prepared = prepareAll(readRawDatasets(dataDir))
  const { files, manifest, manifestText } = serialize(prepared)
  // Tous les contrôles sont passés : on peut remplacer la génération précédente.
  resetDir(outDir)
  for (const f of files) writeText(outDir, f.name, f.text)
  writeText(outDir, MANIFEST_NAME, manifestText)
  writeText(reportDir, 'report.json', `${JSON.stringify(prepared.report, null, 2)}\n`)

  const rows = files.map((f) => {
    const bytes = Buffer.byteLength(f.text, 'utf-8')
    return { key: f.key, entries: f.entries, bytes, gzip: gzipSync(f.text).length }
  })
  const width = Math.max(...rows.map((r) => r.key.length), 'manifest'.length)
  console.log(`Données préparées dans public/data/ (version ${manifest.dataVersion}, extraction du ${manifest.retrieved})`)
  for (const r of rows) {
    console.log(`  ${r.key.padEnd(width)}  ${String(r.entries).padStart(5)} entrées  ${formatBytes(r.bytes).padStart(10)}  gzip ${formatBytes(r.gzip).padStart(9)}`)
  }
  const total = rows.reduce((s, r) => ({ bytes: s.bytes + r.bytes, gzip: s.gzip + r.gzip }), { bytes: 0, gzip: 0 })
  console.log(`  ${'manifest'.padEnd(width)}  ${''.padStart(5)}         ${formatBytes(Buffer.byteLength(manifestText)).padStart(10)}`)
  console.log(`  ${'total'.padEnd(width)}  ${''.padStart(5)}         ${formatBytes(total.bytes).padStart(10)}  gzip ${formatBytes(total.gzip).padStart(9)}`)
  const r = prepared.report
  const unresolved = Object.values(r.unresolvedNames).reduce((s, m) => s + Object.values(m).reduce((a, b) => a + b, 0), 0)
  const outside = Object.values(r.regionsOutsideStageTable).reduce((a, b) => a + b, 0)
  const markup = Object.values(r.markupResidues).reduce((a, b) => a + b.count, 0)
  console.log(`Contrôles non bloquants (.cache/data/report.json) : ${unresolved} noms non résolus, ${outside} régions hors table d'étapes, ${markup} restes de balisage.`)
}

try {
  main()
} catch (e) {
  if (e instanceof DataCheckError) {
    console.error(e.message)
    console.error('Préparation arrêtée : public/data/ n’a pas été modifié. Corriger data/ (décision du chef de projet, data/CHANGELOG.md) ou le type concerné.')
    process.exit(1)
  }
  throw e
}
