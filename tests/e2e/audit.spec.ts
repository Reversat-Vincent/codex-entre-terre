// Audit de mise en page (lancé à part par `npm run e2e:audit`, exclu de `npm run e2e` et de `check`) : sur chaque écran et chaque largeur, il relève
// le débordement horizontal, les cibles tactiles sous 44 px (en dessous de 768 px) et les textes tronqués (ellipse, `line-clamp`).
// Il ne fait pas échouer la suite : il écrit un rapport JSON par mode et largeur, puis un résumé, dans `.cache/e2e/audit/`.
// Variables d'environnement facultatives : WIDTHS (ex. « 390,1440 »), MODES (« base,rich »), ONLY (expression sur le nom d'écran), AUDIT_OUT, SHOTS (dossier de captures).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { DATASETS, DATASET_KEYS } from '../../src/data/datasets.ts'
import type { DatasetKey } from '../../src/data/datasets.ts'
import { CATALOG_KEYS } from '../../src/catalog/registry.ts'
import { routes } from '../../src/router/routes.ts'
import { WIDGET_IDS } from '../../src/widgets/ids.ts'
import { readDataManifest } from './support.ts'
import { defaultCriteria } from '../../src/stores/criteria.ts'
import { defaultLayout } from '../../src/stores/layout.ts'
import { defaultPreferences } from '../../src/stores/preferences.ts'

const WIDTHS = (process.env.WIDTHS ?? '390,768,1024,1440').split(',').map(Number)
const MODES = (process.env.MODES ?? 'base,rich').split(',')
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const OUT = process.env.AUDIT_OUT ?? '.cache/e2e/audit'

// Seuils d'exemption des cibles tactiles (WCAG 2.5.8, « Taille de la cible (minimum) », et recommandation de 44 px du cahier des charges).
/** Côté minimal d'une cible tactile, en px (la tolérance d'arrondi de 0,5 px est déjà retranchée). */
const TARGET_MIN = 43.5
/** Largeur d'écran (px) en dessous de laquelle les cibles sont mesurées : le mobile. */
const TOUCH_MAX_WIDTH = 768
/** Exemption « en ligne » : un lien `inline` dont le paragraphe contient plus de texte que le lien lui-même de ce nombre de caractères est un lien dans une phrase. */
const INLINE_LINK_EXTRA_CHARS = 3
const SHOTS = process.env.SHOTS ?? ''
test.use({ serviceWorkers: 'block' })
// Mode série : le test de résumé, en dernier, s'exécute dans le même processus que les audits et lit leurs rapports.
test.describe.configure({ mode: 'serial' })

interface Ent { id: string; name: string }
const root = join(import.meta.dirname, '..', '..')
function entries(key: DatasetKey): Ent[] {
  const file = readDataManifest().files[key]!.path
  return (JSON.parse(readFileSync(join(root, 'public', 'data', file), 'utf-8')) as { entries: Ent[] }).entries
}
const nm = (e: Ent): string => e.name ?? (e as unknown as { title?: string }).title ?? e.id
function longest(key: DatasetKey): Ent { return entries(key).reduce((a, b) => (nm(b).length > nm(a).length ? b : a)) }
function datasetOfSheet(sheet: string): DatasetKey {
  return DATASET_KEYS.find((key) => DATASETS[key].routes.sheet === sheet)!
}
const SHEETS = routes.filter((r) => r.path.endsWith('/:id') && !String(r.name).includes('mechanic'))
const screens: { name: string; hash: string }[] = []
for (const r of routes) {
  const name = String(r.name)
  if (r.path.includes('pathMatch')) screens.push({ name, hash: '/page-qui-n-existe-pas' })
  else if (name === 'widgetFullscreen') for (const id of WIDGET_IDS) screens.push({ name: 'fs-' + id, hash: '/plein-ecran/' + id })
  else if (name === 'mechanic') {
    screens.push({ name: 'mechanic', hash: '/mecaniques/' + encodeURIComponent(entries('mechanics')[0]!.id) })
    screens.push({ name: 'mechanicLong', hash: '/mecaniques/' + encodeURIComponent(longest('mechanics').id) })
  } else if (!r.path.includes(':')) screens.push({ name, hash: r.path })
}
for (const r of SHEETS) {
  const name = String(r.name)
  const ds = datasetOfSheet(name)
  screens.push({ name: name + 'First', hash: r.path.replace(':id', encodeURIComponent(entries(ds)[0]!.id)) })
  screens.push({ name: name + 'Long', hash: r.path.replace(':id', encodeURIComponent(longest(ds).id)) })
}
for (const ds of ['ranged_weapons_catalysts', 'shields_torches'] as DatasetKey[]) {
  screens.push({ name: ds + 'Sheet', hash: '/armes/' + encodeURIComponent(entries(ds)[0]!.id) })
}
const weaponIds = entries('melee_armaments').slice(0, 3).map((e) => 'weapon:' + e.id)
screens.push({ name: 'compareFilled', hash: '/comparateur?e=' + weaponIds.map(encodeURIComponent).join(',') })
screens.push({ name: 'searchQ', hash: '/recherche?q=sword' })
const picked = ONLY ? screens.filter((s) => ONLY.test(s.name)) : screens

/** État riche : toutes les listes en grille, Ma liste remplie. */
function richState(doc: Record<string, unknown>): Record<string, unknown> {
  const state = doc.state as Record<string, Record<string, unknown>>
  const catalogView: Record<string, string> = {}
  for (const k of CATALOG_KEYS) catalogView[k] = 'grid'
  state.preferences!.catalogView = catalogView
  const pins: unknown[] = []
  for (const key of DATASET_KEYS) {
    const kind = DATASETS[key].kind
    if (kind === 'mechanic') continue
    for (const e of [entries(key)[0]!, longest(key)]) pins.push({ ref: `${kind}:${e.id}`, addedAt: '2026-01-02T10:00:00.000Z', done: pins.length % 3 === 0 })
  }
  state.pins = pins as unknown as Record<string, unknown>
  return doc
}

for (const mode of MODES) {
  for (const width of WIDTHS) {
    test(`audit ${mode} ${width}`, async ({ browser }) => {
      test.setTimeout(900000)
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
      context.setDefaultTimeout(15000)
      const page = await context.newPage()
      await page.goto('./', { waitUntil: 'networkidle' })
      if (mode === 'rich') {
        const base = { app: 'codex-entre-terre', schemaVersion: 1, savedAt: '2026-01-01T00:00:00.000Z', appVersion: '0.1.0', state: { criteria: defaultCriteria(), profiles: { items: [], activeId: null }, pins: [], quests: {}, layout: defaultLayout(), preferences: defaultPreferences(), recentSearches: [] } }
        const doc = richState(base as unknown as Record<string, unknown>)
        await page.evaluate((s) => localStorage.setItem('codex-entre-terre:state', s), JSON.stringify(doc))
      }
      const results: unknown[] = []
      for (const s of picked) {
        await page.goto(`./#${s.hash}`)
        await page.reload({ waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(120)
        const r = await page.evaluate(({ w, TARGET_MIN, TOUCH_MAX_WIDTH, extra }) => {
          const doc = document.documentElement
          const desc = (e: Element): string => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')
          const clipped = (e: Element): boolean => {
            // Un élément absolu n'est rogné que par les ancêtres qui sont son bloc conteneur ou au-dessus.
            const start = getComputedStyle(e).position === 'absolute' ? ((e as HTMLElement).offsetParent as HTMLElement | null) : e.parentElement
            for (let p: HTMLElement | null = start; p && p !== doc; p = p.parentElement) {
              if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true
            }
            return false
          }
          const visible = (e: Element): boolean => {
            const cs = getComputedStyle(e)
            if (cs.visibility === 'hidden' || cs.display === 'none') return false
            const r = e.getBoundingClientRect()
            return r.width > 0 && r.height > 0
          }
          const overflowing: string[] = []
          for (const e of Array.from(document.body.querySelectorAll('*'))) {
            const r = e.getBoundingClientRect()
            if (r.right > w + 1 && r.width > 0 && visible(e) && !clipped(e) && getComputedStyle(e).position !== 'fixed') {
              overflowing.push(desc(e) + ' right=' + Math.round(r.right) + ' "' + (e.textContent ?? '').trim().slice(0, 30) + '"')
            }
          }
          const inner: string[] = []
          for (const e of Array.from(document.body.querySelectorAll('*'))) {
            const el = e as HTMLElement
            const r = e.getBoundingClientRect()
            if (r.width > 0 && r.left + el.scrollWidth > w + 1 && r.right <= w + 1 && getComputedStyle(e).overflowX === 'visible' && !clipped(e) && getComputedStyle(e).position !== 'fixed') {
              inner.push(desc(e) + ' left=' + Math.round(r.left) + ' sw=' + el.scrollWidth + ' "' + (e.textContent ?? '').trim().slice(0, 30) + '"')
            }
          }
          const small: string[] = []
          if (w < TOUCH_MAX_WIDTH) {
            const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=checkbox], [role=switch], [role=option], summary, [tabindex="0"]'
            for (const e of Array.from(document.body.querySelectorAll(sel))) {
              if (!visible(e) || e.closest('.cx-sr') || (e as HTMLElement).classList.contains('cx-skip')) continue
              const el = e as HTMLElement
              if (el instanceof HTMLInputElement && el.type === 'file') continue
              // Case à cocher ou radio : la cible est son libellé.
              const target = el instanceof HTMLInputElement && /checkbox|radio/.test(el.type) ? (el.closest('label') ?? el) : el
              const r = target.getBoundingClientRect()
              if (r.height >= TARGET_MIN && r.width >= TARGET_MIN) continue
              // Zone de frappe étendue par un pseudo-élément (`::after`) d'au moins 44 px.
              const after = getComputedStyle(el, '::after')
              if (after.content !== 'none' && parseFloat(after.width) >= TARGET_MIN && parseFloat(after.height) >= TARGET_MIN) continue
              // Lien dans une phrase : exempté (WCAG 2.5.8, cas « en ligne »).
              if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.parentElement?.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + extra) continue
              small.push(desc(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 25) + '"')
            }
          }
          const truncated: string[] = []
          for (const e of Array.from(document.body.querySelectorAll('*'))) {
            if (!visible(e)) continue
            const cs = getComputedStyle(e)
            const el = e as HTMLElement
            const ell = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1
            const lc = cs.getPropertyValue('-webkit-line-clamp')
            const clamp = lc !== '' && lc !== 'none' && el.scrollHeight > el.clientHeight + 1
            if (ell || clamp) truncated.push(desc(e) + ' "' + (e.textContent ?? '').trim().slice(0, 40) + '"')
          }
          return { sw: doc.scrollWidth, iw: window.innerWidth, overflowing: overflowing.slice(0, 6), inner: inner.slice(0, 6), small, truncated }
        }, { w: width, TARGET_MIN, TOUCH_MAX_WIDTH, extra: INLINE_LINK_EXTRA_CHARS })
        results.push({ screen: s.name, ...r })
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true })
          await page.screenshot({ path: `${SHOTS}/${mode}-${s.name}.${width}.png`, fullPage: true })
        }
      }
      mkdirSync(OUT, { recursive: true })
      writeFileSync(`${OUT}/${mode}-${width}.json`, JSON.stringify(results, null, 1))
      await context.close()
    })
  }
}

/** Agrège les rapports JSON du dossier de sortie dans `summary.txt` et `summary.json` : nombre de relevés par catégorie et par écran. */
test('résumé de l’audit', () => {
  mkdirSync(OUT, { recursive: true })
  const categories = ['overflowing', 'inner', 'small', 'truncated'] as const
  const totals: Record<string, number> = { overflowing: 0, inner: 0, small: 0, truncated: 0, pageOverflow: 0 }
  const lines: string[] = []
  const byReport: Record<string, unknown> = {}
  for (const file of readdirSync(OUT).filter((f) => /^(base|rich)-\d+\.json$/.test(f)).sort()) {
    const rows = JSON.parse(readFileSync(join(OUT, file), 'utf-8')) as ({ screen: string; sw: number; iw: number } & Record<(typeof categories)[number], string[]>)[]
    const counts: Record<string, number> = { screens: rows.length, overflowing: 0, inner: 0, small: 0, truncated: 0, pageOverflow: 0 }
    for (const row of rows) {
      if (row.sw > row.iw) counts.pageOverflow!++
      for (const c of categories) counts[c]! += row[c].length
      const found = categories.filter((c) => row[c].length > 0).map((c) => `${c}=${row[c].length}`)
      if (row.sw > row.iw) found.push(`page ${row.sw}>${row.iw}`)
      if (found.length > 0) lines.push(`${file.replace('.json', '')} ${row.screen} : ${found.join(', ')}`)
    }
    for (const k of Object.keys(totals)) totals[k]! += counts[k]!
    byReport[file] = counts
    lines.unshift(`${file} : ${rows.length} écrans, ${Object.entries(counts).filter(([k]) => k !== 'screens').map(([k, v]) => `${k}=${v}`).join(', ')}`)
  }
  const text = [`Audit de mise en page — totaux : ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(', ')}`, ...lines, ''].join('\n')
  writeFileSync(join(OUT, 'summary.txt'), text)
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify({ totals, reports: byReport }, null, 1))
})
