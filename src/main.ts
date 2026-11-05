// Point d'entrée : crée l'application, branche Pinia, charge les styles globaux dans l'ordre, démarre l'état (lecture, migration, thème, données), puis monte.
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createAppRouter } from './router/index.ts'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/base.css'
import { registerBootHook, useAppStore } from './stores/app.ts'
import { registerServiceWorker } from './pwa/registerSW.ts'

const app = createApp(App)
app.use(createPinia())
app.use(createAppRouter())

// Le service worker s'enregistre à la fin de `boot()` (hors développement) et signale les nouvelles versions à l'interface.
registerBootHook(registerServiceWorker)

// `boot()` pose `data-theme` sur <html> : il précède le montage pour éviter un éclair de mauvais thème.
useAppStore().boot()

app.mount('#app')
