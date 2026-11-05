// Déclaration minimale des modules `.vue` pour le projet TypeScript des tests (tsconfig.tests.json) : le routeur importe ses vues à la demande,
// et les tests qui le chargent compilent sans l'extension Vue. Le projet de l'application utilise `src/env.d.ts`.

declare module '*.vue' {
  const component: object
  export default component
}
