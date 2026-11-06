// Composable `usePaletteActions` : exécute l'effet d'une action de la palette (écran, critères, thème, export, import).
// Les effets sont des données (`src/search/actions.ts`) ; ce module fait le lien avec le routeur et les stores, sans calcul.

import { nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { hasCriteriaPanel } from '../router/meta.ts'
import type { ActionEffect } from '../search/actions.ts'
import { useAppStore } from '../stores/app.ts'
import { usePreferencesStore } from '../stores/preferences.ts'
import { useToastsStore } from '../stores/toasts.ts'
import { useBreakpoint } from './useBreakpoint.ts'
import { useCriteriaPanel } from './useCriteriaPanel.ts'

/** Valeur renvoyée par `usePaletteActions`. */
export interface PaletteActions {
  /** Exécute l'effet d'une action ; ne rejette jamais (une erreur devient une notification). */
  run: (effect: ActionEffect) => Promise<void>
}

/**
 * Télécharge un texte comme fichier : lien temporaire sur un `Blob`, révoqué aussitôt (aucune requête réseau).
 * @param fileName Nom du fichier proposé.
 * @param content Contenu texte.
 */
function download(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Fournit l'exécution des actions de la palette.
 * - `navigate` : ouvre l'écran ;
 * - `open-criteria` : revient au tableau de bord si l'écran n'a pas de panneau, puis déplie la colonne (desktop) ou ouvre le tiroir/la feuille ;
 * - `toggle-theme` : bascule le thème ;
 * - `export-state` : télécharge la sauvegarde, avec une notification ;
 * - `import-state` : ouvre la page Profil, où l'import est confirmé avec son résumé (l'import ne s'exécute jamais sans cet écran).
 * @returns L'exécuteur d'effets.
 */
export function usePaletteActions(): PaletteActions {
  const router = useRouter()
  const app = useAppStore()
  const prefs = usePreferencesStore()
  const toasts = useToastsStore()
  const { isDesktop } = useBreakpoint()
  const { openOverlay } = useCriteriaPanel()

  async function run(effect: ActionEffect): Promise<void> {
    switch (effect.type) {
      case 'navigate':
        await router.push(effect.to)
        return
      case 'open-criteria':
        if (!hasCriteriaPanel(router.currentRoute.value)) {
          await router.push('/')
          await nextTick()
        }
        if (isDesktop.value) prefs.setCriteriaCollapsed(false)
        else openOverlay()
        return
      case 'toggle-theme':
        prefs.toggleTheme()
        return
      case 'export-state':
        try {
          const file = app.exportFile()
          download(file.fileName, file.content)
          toasts.push({ message: `Sauvegarde exportée : ${file.fileName}`, kind: 'success', icon: 'check' })
        } catch {
          toasts.push({ message: 'L’export a échoué : la sauvegarde n’a pas pu être créée.', kind: 'error' })
        }
        return
      case 'import-state':
        await router.push('/profil')
        return
    }
  }

  return { run }
}
