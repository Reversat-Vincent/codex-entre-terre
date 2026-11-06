# Codex de l'Entre-terre

Application web compagnon d'*Elden Ring*, pensée pour être consultée en second écran pendant le jeu. **État : version bêta 0.1.0, publiée le 06/11/2026 pour essai ; des corrections sont en cours.**

## Ce que fait l'application

- **Un tableau de bord** qui se recalcule à chaque changement de critère : DLC possédés, attributs du personnage, build visé, style de jeu, progression, contraintes d'obtention, fiabilité des données. Les réglages s'enregistrent en profils. Ses widgets :
  - les armes à récupérer à chaque étape de la partie, du début au DLC, avec un score expliqué ;
  - l'origine (classe de départ) la plus efficace pour le build visé, et les priorités de montée de niveau ;
  - l'ordre des boss de l'histoire principale et de la voie du DLC, avec le niveau recommandé et l'état de préparation ;
  - la matrice des faiblesses des boss, le plan d'amélioration d'une arme, le calculateur de runes, le rendement des attributs et la couverture des données.
- **Un explorateur** : 17 catalogues filtrables (armes, cendres de guerre, armures, talismans, sorts, esprits, objets, boss, lieux, PNJ, origines) et leurs fiches, une recherche globale (Ctrl/⌘ + K) et les mécaniques du jeu.
- **Ma liste** pour les objets à récupérer, un **comparateur** de 2 à 4 éléments, et le suivi des étapes de quête des PNJ.
- **La provenance de chaque valeur** : donnée du wiki, estimation, valeur non documentée, incohérence du wiki ou calcul de l'application, avec son « Pourquoi ? ». Les méthodes de calcul sont décrites dans `docs/design/ds/calculs.md`.
- Des liens vers les pages d'eldenring.wiki.gg et de Fextralife, vers leurs cartes interactives et vers leurs guides.

## Fonctionnement

- **Site** : https://reversat-vincent.github.io/codex-entre-terre/
- **Langues** : interface en français, données en anglais, comme sur le wiki.
- **Dans le navigateur** : sans compte, sans serveur et sans traceur. Les réglages restent dans le navigateur ; ils s'exportent dans un fichier, qui peut être réimporté.
- **Hors ligne** : le site fonctionne sans réseau après une première visite et peut s'installer comme une application.
- Le site demande aux moteurs de recherche de ne pas l'indexer.

Outil de fan non officiel. *Elden Ring* est une marque de FromSoftware et Bandai Namco ; ce projet n'est pas affilié à ces sociétés.

## Données

Les 18 fichiers JSON de `data/` ont été extraits d'eldenring.wiki.gg le 31/10/2026 (patch 1.17), jeu de base et DLC compris, puis complétés et corrigés à partir du même wiki. Chaque correction est consignée dans `data/CHANGELOG.md`, avec la page du wiki qui la justifie.

## Contenu du dépôt

| Emplacement | Contenu |
|---|---|
| `src/` | L'application (Vue 3, TypeScript) : moteur de calcul, état de l'utilisateur, composants et écrans |
| `scripts/` | Préparation des données pour le navigateur et génération des icônes |
| `tests/` | Tests unitaires et tests dans un navigateur |
| `public/` | Icônes de l'application ; les données préparées y sont générées à la compilation |
| `data/` | Les 18 fichiers JSON du jeu, leur documentation (`data/README.md`) et leurs corrections (`data/CHANGELOG.md`) |
| `docs/cahier_des_charges.md` | Périmètre, exigences, critères d'acceptation et décisions |
| `docs/architecture.md` | Architecture de l'application |
| `docs/contenu/` | Vérifications et décisions de contenu, établies à partir du wiki |
| `docs/design/` | Copie du design : écrans, notes de spécification et design system (`ds/`) |
| `docs/brief/design_prompt.md` | Brief qui a servi à produire le design |
| `tools/wiki/` | Scripts Python d'extraction du wiki |
| `ROADMAP.md` | Feuille de route et décisions du développement |
| `CLAUDE.md`, `.claude/` | Instructions du chef de projet, sous-agents, règles et permissions de Claude Code |
| `lancer-dev.cmd` | Lance la session de développement |
| `.github/workflows/` | Publication sur GitHub Pages |

## Licences

- **Code** : aucune licence. Il reste soumis au droit d'auteur : on peut le consulter, pas le réutiliser sans autorisation.
- **Données** (`data/` et les fichiers qui en dérivent) : elles proviennent d'Eldenpedia (eldenring.wiki.gg) et restent sous licence [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0). Toute rediffusion crédite les contributeurs d'eldenring.wiki.gg et garde la même licence.
- **Polices** : Cormorant Garamond et Source Sans 3, sous licence SIL Open Font License 1.1, servies par le site.
