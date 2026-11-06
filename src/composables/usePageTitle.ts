// Composable `usePageTitle` : titre de l'onglet fourni par une vue (nom d'une entité), au format « <titre> — Codex de l'Entre-terre ».

import { toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/** Nom de l'application, suffixe des titres de page. */
export const APP_TITLE = "Codex de l'Entre-terre"

/**
 * Compose le titre d'une page.
 * @param title Titre de l'écran ; vide ou absent : le nom de l'application seul.
 * @returns `<titre> — Codex de l'Entre-terre`.
 */
export function formatPageTitle(title: string | null | undefined): string {
  return title ? `${title} \u2014 ${APP_TITLE}` : APP_TITLE
}

/**
 * Fixe le titre de la page tant que la vue est montée, et le met à jour quand il change (fiche dont le nom arrive avec les données).
 * Le routeur pose d'abord le titre générique de la route ; la vue le précise ensuite.
 * @param title Titre, ou fonction/référence qui le renvoie (`null` tant que l'entité n'est pas chargée : le titre de la route reste).
 */
export function usePageTitle(title: MaybeRefOrGetter<string | null | undefined>): void {
  watchEffect(() => {
    const value = toValue(title)
    if (value && typeof document !== 'undefined') document.title = formatPageTitle(value)
  })
}
