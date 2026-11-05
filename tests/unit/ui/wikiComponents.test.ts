// Rendu de contrôle (côté serveur) de WikiText et WikiTable : blocs, liens exacts seulement, aucune injection de HTML, « Non documenté » pour `null`.

import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import WikiTable from '../../../src/components/domain/WikiTable.vue'
import WikiText from '../../../src/components/domain/WikiText.vue'
import { buildNameIndex } from '../../../src/data/links.ts'
import type { SearchDoc } from '../../../src/data/types/searchIndex.ts'
import { routes } from '../../../src/router/routes.ts'

const docs: SearchDoc[] = [
  { ref: 'weapon:dagger', group: 'weapon', name: 'Dagger', norm: 'dagger', source: 'Base game', ctx: [] },
  { ref: 'mechanic:poison', group: 'mechanic', name: 'Poison', norm: 'poison', source: 'Base game', ctx: [] },
]
const names = buildNameIndex(docs)

/** Rend un composant avec ses propriétés, dans une application munie de Pinia et du routeur. */
async function render(component: object, props: Record<string, unknown>): Promise<string> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/')
  await router.isReady()
  const app = createSSRApp({ render: () => h(component as never, props) })
  app.use(createPinia()).use(router)
  return renderToString(app)
}

describe('WikiText', () => {
  it('rend sous-titres, paragraphes et puces imbriquées', async () => {
    const html = await render(WikiText, { lines: ['[Effects]', 'Intro text', '→ First', '→→ Nested'], names })
    expect(html).toContain('<h3')
    expect(html).toContain('Effects')
    expect(html).toContain('<p class="wiki-p">')
    expect(html.match(/<ul/g)).toHaveLength(2)
  })
  it('lie un nom exact et laisse le reste en texte', async () => {
    const html = await render(WikiText, { lines: ['Poison', 'Poisoned by Dagger'], names })
    expect(html).toContain('href="/mecaniques/poison"')
    expect(html).not.toContain('armes/dagger')
  })
  it("n'interprète jamais du HTML", async () => {
    const html = await render(WikiText, { lines: ['<img src=x onerror=alert(1)>'], names })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
  it('ne lie pas une entité à sa propre page', async () => {
    const html = await render(WikiText, { lines: ['Poison'], names, skipRef: 'mechanic:poison' })
    expect(html).not.toContain('<a')
  })
})

describe('WikiTable', () => {
  it("rend l'en-tête à deux niveaux, les chiffres formatés et « Non documenté »", async () => {
    const html = await render(WikiTable, { rows: [{ 'HP / Vigor': 1500, 'HP / HP': null, Note: 'Dagger' }], names })
    expect(html).toContain('colspan="2"')
    expect(html).toContain('1 500')
    expect(html).toContain('Non documenté')
    expect(html).toContain('<table')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('href="/armes/dagger"')
  })
  it('rend un tableau en listes sans en-tête, première colonne en en-tête de ligne', async () => {
    const html = await render(WikiTable, { rows: [['', 'Vigor', 'HP']], names })
    expect(html).not.toContain('<thead')
    expect(html).toContain('scope="row"')
  })
})
