---
paths:
  - "src/**"
  - "scripts/**"
  - "tests/**"
  - "index.html"
  - "*.config.*"
  - ".github/**"
---

# Règles de code du Codex

## Commentaires (obligatoires, quelle que soit la technologie)
- En tête de chaque fichier : son rôle, en une ou deux phrases.
- Chaque composant, composable, store, fonction et type exportés : un commentaire de documentation (TSDoc) qui donne son rôle, ses paramètres, sa valeur de retour et ses effets.
- Chaque calcul cite sa méthode dans `docs/design/ds/calculs.md`.
- Le pourquoi d'un choix non évident (contournement, performance, accessibilité) est commenté. Pas de paraphrase du code, pas de code mort laissé en commentaire.
- Commentaires en français, identifiants en anglais.

## Stack et architecture
- Vue 3 avec `<script setup lang="ts">`, Vue Router en mode hash, Pinia, Vite, Vitest.
- Structure, modules et interfaces : `docs/architecture.md`.
- Aucune ressource chargée depuis un autre domaine : polices, icônes et scripts sont servis par le site, et le mode hors ligne en dépend. Aucun traceur, aucune API tierce.
- Le code tourne sous Windows en développement et sous Linux pour la publication : casse exacte des chemins d'import, chemins construits avec `path` ou `/`, scripts npm sans commande propre à un shell.

## Interface
- Couleurs, typographie, espacements, rayons et ombres viennent uniquement des variables CSS des tokens du design system (source : `docs/design/ds/tokens.css` ; copie dans le code indiquée par l'architecture). Aucune couleur codée en dur, aucun style propre à un thème : le thème se bascule par `data-theme` sur la racine.
- Points de rupture : mobile < 768 px, tablette 768–1279 px, desktop ≥ 1280 px (cible 1440 px).
- Accessibilité : vrais `button`, `a`, `input` avec `label` ; `aria-label` sur les boutons-icônes ; focus visible ; jamais la couleur seule ; `prefers-reduced-motion` respecté ; ce qui s'ouvre au survol s'ouvre aussi à l'appui et au clavier.
- Textes d'interface en français, selon la section « Contenu et langue » du README du design system. Les données s'affichent telles quelles, en anglais.
- Données à l'écran, selon la section « Conventions de données » du même README : `null` → « Non documenté », jamais 0 ni vide ; estimation → badge Estimation ; valeur calculée → badge Calculé et « Pourquoi ? », à côté de la valeur de base, jamais à sa place ; badge de source sur chaque entité ; lien « Voir sur le wiki ».
- Le badge « valeur de maquette » du prototype n'est jamais livré.

## Sécurité
- Aucun `v-html` sur des données ou sur le contenu d'un fichier importé.
- Un fichier importé n'est jamais considéré comme fiable : il est validé entièrement avant usage.

## Persistance
- L'état de l'utilisateur passe par un module de persistance unique : stockage du navigateur, schéma versionné, export et import. Aucun accès direct au stockage ailleurs.
- Le stockage peut être indisponible ou vide : l'application fonctionne quand même.
