// Déclarations de types globales : constante injectée par Vite et modules `.vue`.

/** Version de l'application, lue dans `package.json` et injectée par `define` (vite.config.ts). */
declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
