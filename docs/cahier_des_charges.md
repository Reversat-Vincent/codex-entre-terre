# Cahier des charges — Codex de l'Entre-terre

> Version du 01/11/2026. Le détail des écrans et des comportements est dans le design ; ce document fixe le périmètre, les exigences et les décisions à prendre.

## 1. Objet

Application web compagnon d'*Elden Ring*, souvent consultée en second écran pendant le jeu. Un tableau de bord recalcule ses agrégations selon des critères configurables (DLC possédés, personnage, style de jeu, progression, contraintes d'obtention, fiabilité des données). Un explorateur donne accès à toutes les données extraites du wiki. Outil de fan non officiel, sans compte ni serveur.

## 2. Références

| Référence | Contenu |
|---|---|
| `data/` et sa documentation | Seule source des faits du jeu : structure des fichiers, étiquettes DLC, limites connues |
| Design (`docs/design/`) | Écrans (`*.dc.html`) et notes de spécification par écran (`canvas.json`, clé `notes`) |
| Design system (`docs/design/ds/`) | Règles d'affichage et de rédaction (`README.md`), tokens sombre et parchemin, composants, méthodes de calcul (`calculs.md`) |
| Brief (`docs/brief/design_prompt.md`) | Intentions d'origine : utilisateurs et tâches clés (§ 2), critères et widgets (§ 5), écrans (§ 4 et 6) |

Priorité en cas de contradiction : décisions du développeur > ce document > design > brief. Le design est une feuille de route : un écart justifié est permis s'il est décidé par le chef de projet et consigné.

## 3. Périmètre de la v1

**Écrans dessinés**
- Tableau de bord desktop et mobile, avec le panneau de critères (feuille du bas sur mobile).
- Widgets (d'après la note de spécification du tableau de bord) : A, armes recommandées par étape, avec sa vue plein écran ; B, origine optimale ; C, ordre des boss et préparation ; matrice des faiblesses ; plan d'amélioration ; calculateur de runes ; couverture des données.
- Catalogue des armes de mêlée, fiche arme, fiche boss, recherche globale.

**Écrans à construire avec le design system** (non dessinés)
- Les autres catalogues et fiches du brief (§ 4) : armes à distance et catalyseurs, boucliers et torches, cendres de guerre, armures, talismans, sorts, esprits, objets, lieux, PNJ, origines.
- Ma liste, Comparateur (2 à 4 éléments), Mécaniques, Profil.
- Les mises en page tablette.
- Le widget « Rendement des attributs » (courbes des statistiques dérivées par niveau d'attribut), suggéré par le développeur le 01/11/2026.

**Liens externes** : « Voir sur le wiki » (eldenring.wiki.gg) sur chaque entité ; à la demande du développeur, « Voir sur Fextralife », sa carte interactive et ses pages de guides, en liens qui s'ouvrent dans un nouvel onglet. Aucun contenu de ces pages n'est recopié ni chargé dans l'application.

**Extensions possibles, hors v1** : les agrégations du brief (§ 5.2 D) absentes du design.

**Hors périmètre** : traduction des données (l'emplacement du sous-titre reste vide), comptes et synchronisation, données d'autres sources que le wiki, *ELDEN RING NIGHTREIGN*.

## 4. Exigences techniques

- **Hébergement** : site statique sur GitHub Pages. Limites de GitHub : site publié de 1 Go au plus, dépôt de 1 Go recommandé au plus, déploiement de 10 min au plus. Aucun serveur, aucune API tierce, aucun traceur.
- **Dépôt** : https://github.com/Reversat-Vincent/codex-entre-terre, public. Site : https://reversat-vincent.github.io/codex-entre-terre/, d'où `base` = `/codex-entre-terre/` dans Vite.
- **Stack** : Vue 3, Vite, TypeScript, Vue Router en mode hash (aucune configuration serveur requise), Pinia, Vitest. Déploiement par GitHub Actions (source Pages : « GitHub Actions »).
- **Dépendances** : le minimum ; chaque ajout est justifié et consigné.
- **Données** : les 18 JSON (environ 10 Mo) sont préparés à la compilation pour le navigateur. Chargement par fichier avec progression : un widget s'affiche dès que ses fichiers sont lus ; un fichier illisible affiche un message dans les widgets concernés.
- **Hors ligne** : un service worker garde le site et ses données dans le navigateur.
  - Après une première visite, l'application s'ouvre sans réseau et peut s'installer comme une application (manifeste avec le nom et la marque du design system).
  - Une nouvelle version publiée est signalée par un message qui propose de recharger.
  - Vérification : test Playwright sur son propre Chromium (première visite, puis rechargement sans réseau).
- **Non-indexation** : le site ne doit pas être indexé par les moteurs de recherche.
  - La page porte `<meta name="robots" content="noindex, nofollow">`.
  - Pas de sitemap, ni de `robots.txt` qui bloquerait l'exploration : les robots ne verraient plus la consigne.
  - Limites : un `robots.txt` n'agit qu'à la racine d'un domaine, donc pas pour un site de projet `<compte>.github.io/<dépôt>/` ; certains moteurs peuvent ne pas respecter la consigne ; le dépôt public reste visible et indexable sur github.com.
- **Commentaires** obligatoires dans tout le code (règles : `.claude/rules/code.md`).

## 5. Persistance, export et import

- Tout l'état de l'utilisateur reste dans son navigateur : profils de critères, Ma liste, progression (boss vaincus), disposition des widgets, préférences d'affichage (thème, tableau ou grille, panneaux repliés), recherches récentes.
- Schéma versionné, avec migration à chaque changement. Sans stockage disponible (navigation privée, stockage plein), l'application fonctionne et le signale.
- **Export** : un fichier JSON avec la version du schéma, la date, la version de l'application et le contenu.
- **Import** : remplace tout l'état existant, après confirmation. Validation complète avant toute écriture : un fichier invalide ou d'une version inconnue est refusé avec un message clair, sans rien modifier. « Annuler » restaure l'état précédent.

## 6. Données affichées et calculs

- Conventions obligatoires sur chaque écran : README du design system, section « Conventions de données » (sources, `null` → « Non documenté », estimations, incohérences, valeurs calculées, « Voir sur le wiki »).
- `calculs.md` fait référence pour toute valeur calculée. Les pondérations sont regroupées dans une configuration et `calculs.md` est mis à jour quand elles changent.
- Chaque valeur calculée porte le badge Calculé et son « Pourquoi ? ».
- Les exemples chiffrés de `calculs.md` deviennent des tests. Les formules liées au jeu sont vérifiées par `contenu-jeu` contre `data/mechanics.json` et le wiki avant d'être figées.
- Le badge « valeur de maquette » du prototype n'est pas livré.
- Pied de page : « Outil de fan non officiel — données : eldenring.wiki.gg (CC BY-SA 4.0) ».

## 7. Qualité

- Accessibilité : section « Accessibilité » du README du design system (contraste AA dans les deux thèmes, clavier, jamais la couleur seule).
- Responsive : mobile < 768 px, tablette 768–1279 px, desktop ≥ 1280 px (cible 1440 px).
- Thèmes : sombre par défaut, parchemin.
- Textes : section « Contenu et langue » du README du design system.

## 8. Critères d'acceptation de la v1

- La compilation et le contrôle complet (types, lint, tests) passent ; le site se déploie et fonctionne sur https://reversat-vincent.github.io/codex-entre-terre/.
- Après une première visite, l'application s'ouvre et fonctionne sans réseau (test Playwright).
- Chaque écran du périmètre existe ; chaque écart au design est consigné dans `ROADMAP.md`.
- Les méthodes de `calculs.md` sont testées et leurs exemples chiffrés passent.
- Un export puis un import restituent le même état ; un fichier invalide est refusé sans rien modifier.
- La page publiée porte la consigne `noindex`.
- La dernière boucle de vérification ne laisse aucun constat bloquant ou majeur.
- Le README présente le projet : l'application, le contenu du dépôt et les licences (§ 9).

## 9. Décisions du développeur

- Dépôt GitHub public (offre GitHub Free).
- Commentaires et messages de commit en français.
- TypeScript.
- Tests dans un navigateur : Playwright, avec son propre Chromium uniquement, sans jamais utiliser ni modifier les navigateurs installés sur la machine (Opera, Firefox).
- Import : remplace l'état existant.
- Dépôt : https://github.com/Reversat-Vincent/codex-entre-terre.
- Licence : aucune pour le code, qui reste soumis au droit d'auteur. Les données (`data/` et les fichiers qui en dérivent) gardent la licence CC BY-SA 4.0 du wiki.
- Hors ligne : service worker (§ 4).
- Le 01/11/2026 :
  - GitHub Pages est activé, avec la source « GitHub Actions ».
  - La puissance d'attaque calculée avec les attributs du profil est une estimation signalée, puisqu'un calcul exact est impossible avec les données du wiki.
  - Fextralife sert seulement de liens (fiches, carte interactive, guides) : ses conditions interdisent la récupération automatisée de son contenu.
  - La carte interactive est un lien, sans intégration dans l'application.
