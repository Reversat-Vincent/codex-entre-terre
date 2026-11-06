/// <reference types="vite-plugin-pwa/vue" />
// Enregistrement du service worker (architecture § 11) : branché au démarrage par `registerBootHook`, il signale une nouvelle version à l'interface.
// Le plugin PWA est en mode « prompt » : la nouvelle version attend jusqu'à ce que l'utilisateur choisisse « Recharger » (AppUpdatePrompt).

import { useRegisterSW } from 'virtual:pwa-register/vue'
import { announceUpdate } from '../composables/useAppUpdate.ts'

/** Intervalle de recherche d'une nouvelle version pour un onglet resté ouvert : une heure. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Enregistre le service worker et relaie l'arrivée d'une nouvelle version vers `announceUpdate`.
 * N'enregistre rien en développement : un service worker y servirait des fichiers périmés et masquerait le rechargement à chaud.
 * Effets : enregistrement du service worker au chargement de la page ; contrôle périodique d'une nouvelle version quand le réseau répond.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return

  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      // `true` : active la version en attente puis recharge la page, quand l'utilisateur le demande.
      announceUpdate(() => updateServiceWorker(true))
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Un onglet resté ouvert ne rechargeant pas sa page, on demande au navigateur de vérifier le fichier du service worker.
      setInterval(() => {
        if (navigator.onLine) void registration.update().catch(() => undefined)
      }, UPDATE_CHECK_INTERVAL_MS)
    },
  })
}
