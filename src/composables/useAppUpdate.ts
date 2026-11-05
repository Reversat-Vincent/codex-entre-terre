// Composable `useAppUpdate` : état « une nouvelle version est prête », lu par `AppUpdatePrompt`.
// Point de raccord avec le service worker (architecture § 11, `src/pwa/registerSW.ts`) : la tâche PWA appelle `announceUpdate` quand `needRefresh` passe à vrai.

import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'

const needRefresh = ref(false)
const dismissed = ref(false)
let reloader: (() => void | Promise<void>) | null = null

/**
 * Signale qu'une nouvelle version de l'application est disponible (appelé par l'enregistrement du service worker).
 * @param reload Fonction qui active la nouvelle version et recharge la page (`update()` de `virtual:pwa-register/vue`).
 */
export function announceUpdate(reload: () => void | Promise<void>): void {
  reloader = reload
  dismissed.value = false
  needRefresh.value = true
}

/** Valeur renvoyée par `useAppUpdate`. */
export interface AppUpdateState {
  /** Vrai tant qu'une mise à jour est disponible et que l'utilisateur n'a pas choisi « Plus tard ». */
  visible: ComputedRef<boolean>
  /** Active la nouvelle version (recharge la page). */
  reload: () => Promise<void>
  /** Masque l'invite jusqu'à la prochaine annonce. */
  dismiss: () => void
}

/**
 * Donne accès à l'état de la mise à jour.
 * @returns La visibilité de l'invite et ses deux actions.
 */
export function useAppUpdate(): AppUpdateState {
  return {
    visible: computed(() => needRefresh.value && !dismissed.value),
    reload: async () => {
      await reloader?.()
    },
    dismiss: () => {
      dismissed.value = true
    },
  }
}
