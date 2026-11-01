# Feuille de route
> Phase : développement · Mise à jour : 2026-11-01

## Étapes
- [x] 0. Lancement
  - [x] 0.1 Vérification de l'environnement : dépôt propre, `main` et `dev` alignés sur `origin`, Node 24.21, npm 12.2, `CLAUDE_CODE_EFFORT_LEVEL` vide — chef de projet
  - [x] 0.2 Architecture `docs/architecture.md` — general-purpose (opus)
    > Note : validée par le chef de projet avec les décisions de contenu (C7) et l'arbitrage des points ouverts (D17).
  - [x] 0.3 Vérification des formules de `calculs.md` → `docs/contenu/verification-calculs.md` — contenu-jeu (opus)
    > Note : formules confirmées (runes, statistiques dérivées, deux mains, origine, plan) avec des précisions ; puissance d'attaque exacte impossible (Q2) ; correctifs P1 à P3 arbitrés en D8.
  - [x] 0.4 Décisions de progression → `docs/contenu/decisions-progression.md` — contenu-jeu (opus)
    > Note : arbitrées en D10 à D15 ; correctifs C1 à C6 acceptés.
  - [x] 0.5 Validation de l'architecture, arbitrage du contenu, feuille de route détaillée — chef de projet
- [ ] 1. Socle technique et données
  - [ ] 1.1 Socle d'outillage : dépendances (§ 14), Vite, TypeScript, ESLint, Vitest, Playwright, `index.html`, `.editorconfig`, `.gitignore`, scripts npm, workflow `deploy.yml`, `main.ts` et `App.vue` provisoires — dev-outillage
  - [ ] 1.2 Correctifs de données P1, P2, C1 à C6, `data/CHANGELOG.md`, limites de `data/README.md`, lecture des décimales dans `tools/wiki/` — dev-donnees
  - [ ] 1.3 Préparation des données : `scripts/prepare-data.ts`, types, `datasets.ts`, `slug.ts`, `keys.ts`, champs dérivés, `tables`, `search-index`, manifeste, contrôles d'intégrité, fixtures et tests — dev-donnees (opus)
  - [ ] 1.4 `calculs.md` mis à jour (D4 à D7, D9 à D16, hypothèse de Q2) et note dans `docs/design/VERSION.md` — dev-logique
- [ ] 2. Socle logique et composants de base
  - [ ] 2.1 Styles et composants de base : `tokens.css` sans maquette, polices, `base.css`, sprite, `CxIcon`, `CxButton`, badges, `CxValue`, `CxEntityName`, `CxWikiLink`, `CxTooltip`, contrôles de formulaire, états, `CxWidgetShell`, `CxTabs`, `CxDialog`, `CxSheet`, `CxMenu`, `CxToastHost`, `labels.ts` — dev-interface
  - [ ] 2.2 Chargement, persistance et stores utilisateur : `loader.ts`, stores `data` et `app`, `persistence/` (document, migrations, mode dégradé, export, import, pont), stores `criteria`, `profiles`, `pins`, `layout`, `preferences`, `search`, `toasts`, `format.ts`, tests — dev-logique
  - [ ] 2.3 Moteur, partie 1 : types `Calc`, `level`, `requirements`, `runes`, `derivedStats`, `upgradePlan`, `origins`, `weakness`, `attackPower`, `methods`, `weights`, `twoHanded`, `upgrade`, tests des exemples de `calculs.md` — dev-logique (opus)
  - [ ] 2.4 Recherche et catalogues : `search/` (normalisation, classement, surlignage, tolérance, actions, glossaire), `catalog/` (facettes, tri, pagination), tests — dev-logique
  - [ ] 2.5 Moteur, partie 2 : configuration `stages`, `remembrances`, `timeline`, `bossLevel`, `archetypes`, `weaponPools` ; modules `stage`, `score`, `target`, `timeline`, `bossLevel`, `coverage` ; store `analysis`, `widgets/registry.ts`, `links.ts`, `wikiText.ts`, tests — dev-logique (opus)
  - [ ] 2.6 Vérification anticipée du socle (données, persistance, moteur) — verif-masse, contenu-jeu
- [ ] 3. Coquille et navigation
  - [ ] 3.1 Coquille : `App.vue`, routes, navigation latérale et rail, barre supérieure, barre d'onglets, pied de page, progression du chargement, bandeau de stockage, message de mise à jour, notifications, thème, palette de recherche, page introuvable — dev-interface
  - [ ] 3.2 Critères : panneau desktop, tiroir tablette, feuille mobile, puces de critères, profils enregistrés — dev-interface
- [ ] 4. Tableau de bord
  - [ ] 4.1 Grille de widgets (disposition, réordonner, réduire, retirer, ajouter, plein écran) et `DashboardView` — dev-interface
  - [ ] 4.2 Widget A et sa vue plein écran — dev-interface
  - [ ] 4.3 Widget B (origine optimale) et widget C (frise des boss) — dev-interface
  - [ ] 4.4 Matrice des faiblesses, plan d'amélioration, calculateur de runes, couverture des données — dev-interface
- [ ] 5. Explorateur
  - [ ] 5.1 Catalogue générique et catalogue des armes (trois familles) — dev-interface
  - [ ] 5.2 Fiche arme — dev-interface
  - [ ] 5.3 Fiche boss et catalogue des boss — dev-interface
  - [ ] 5.4 Autres catalogues et fiches : cendres, armures, talismans, sorts, esprits, objets, lieux, PNJ, origines — dev-interface
  - [ ] 5.5 Page de résultats de recherche et `ExploreView` — dev-interface
- [ ] 6. Ma liste, comparateur, mécaniques, profil
  - [ ] 6.1 Ma liste et comparateur — dev-interface
  - [ ] 6.2 Mécaniques (sommaire, article) et profil (profils, préférences, stockage, export et import, versions, licences) — dev-interface
- [ ] 7. Hors ligne et finitions
  - [ ] 7.1 Service worker, manifeste, icônes, enregistrement et mise à jour ; scripts e2e (captures, hors ligne, persistance) — dev-outillage
  - [ ] 7.2 Mises en page tablette et passe responsive — dev-interface
  - [ ] 7.3 README à jour (présentation, publication) — chef de projet
- [ ] 8. Boucle de vérification
- [ ] 9. Publication : merge dans `main`, tag `v1.0.0`, déploiement, contrôle du site publié

## Questions en attente
> Retenues jusqu'à un moment où le développeur est disponible (lancement de nuit) : aucune ne bloque le développement.
- [ ] Q1 — Pages est-il activé dans le dépôt (Settings → Pages → Source « GitHub Actions ») ? — bloque : 9 — hypothèse en attendant : le workflow de déploiement est écrit et ne se déclenche que sur un push sur `main`.
- [ ] Q2 — Puissance d'attaque « Calculé » de la fiche arme : le wiki ne publie ni les courbes de correction par arme ni, pour 444 armes sur 487, les coefficients de scaling (seulement les lettres). Option B (base au niveau choisi, pénalité de −40 % des prérequis, bonus de scaling estimé pour les 43 armes qui ont des coefficients, « non calculable » sinon, badge Estimation) ou A (valeurs publiées seulement) ? — bloque : 5.2 — hypothèse en attendant : B, isolée dans `src/engine/attackPower.ts` (`verification-calculs.md` § 7).
- [ ] Q3 — `docs/design/ds/calculs.md` reçoit les corrections et décisions de contenu (D5) : faut-il les reporter aussi dans l'artefact du design system en ligne, ou la copie locale fait-elle foi ? — bloque : rien — hypothèse en attendant : la copie locale fait foi, l'artefact n'est pas touché.

## Décisions
- D1 · 2026-11-01 · Dépendances d'exécution limitées à `vue`, `vue-router`, `pinia` et aux polices servies par le site ; ni bibliothèque d'interface, de graphiques, de virtualisation, de recherche, de glisser-déposer ni d'utilitaires — raison : cahier § 4 (« le minimum ») ; les composants du design system sont faits maison — par : chef de projet
- D2 · 2026-11-01 · Service worker et manifeste par `vite-plugin-pwa` en mode « prompt » — raison : précache éprouvé et signalement d'une nouvelle version (cahier § 4) sans service worker maison — par : chef de projet
- D3 · 2026-11-01 · Données préparées à chaque compilation par un script, dans des fichiers générés hors du dépôt ; identifiants d'entité stables (slug) ; index de recherche généré — raison : cahier § 4 (chargement par fichier, hors ligne) — par : chef de projet
- D4 · 2026-11-01 · Coût en runes : le moteur lit la table officielle 1–713 de `mechanics.json`, qui fait foi ; la formule, réécrite en entiers dans `calculs.md`, sert de test de cohérence — raison : en virgule flottante, elle perd 1 rune sur 17 niveaux — par : chef de projet
- D5 · 2026-11-01 · `docs/design/ds/calculs.md` devient un document vivant du projet : il reçoit les corrections de `verification-calculs.md` (deux mains et ses exceptions, origine optimale, plan d'amélioration et cas `null`, lettres de scaling à +0 en Standard) et les décisions de contenu ; il s'écarte de l'artefact du design system, ce que `docs/design/VERSION.md` signalera — raison : cahier § 6 — par : chef de projet
- D6 · 2026-11-01 · Score, composante « Coût d'amélioration » : type non documenté et sans estimation → 14, sans préférence de pierres ; arme non améliorable → 8 ; « Pourquoi ? » le dit — raison : 114 armes n'ont ni type ni estimation ; un `null` ne devient pas 0 mais une valeur prudente et expliquée — par : chef de projet
- D7 · 2026-11-01 · Widget A, candidats selon le style : mêlée → armes de mêlée ; distance → arcs, arbalètes, balistes ; magie → bâtons et sceaux ; hybride → tout ; boucliers et torches seulement s'ils sont parmi les classes préférées. Pour les catalyseurs, les 70 % de la composante « Puissance » portent sur la puissance de sort à +0 (`sorcery_scaling` / `incantation_scaling`), plafond = maximum observé dans `data/` — raison : l'attaque physique pénalise mécaniquement les catalyseurs — par : chef de projet
- D8 · 2026-11-01 · Correctifs de données : P1 accepté (Heavy Knight, `base_stats.equip_load` 53.3 → 59.3, déduction de la table Endurance) ; P2 : les 43 coefficients du Horn Bow corrigés par script (règle « 0. » + chiffres), lecture des décimales corrigée dans `tools/wiki/`, contrôle d'intégrité `coef ≤ 3` ajouté à la préparation ; P3 reporté (le design du plan d'amélioration n'affiche pas de prix ; correspondance Bell Bearing → pierres par la convention de nommage) — par : chef de projet
- D9 · 2026-11-01 · Butin de PNJ envahisseur : dérivé à la préparation des données par jointure avec le butin des boss de rang envahisseur de `bosses.json` ; équipement de départ par jointure avec `origins.json` — raison : `acquisition_flags` n'a pas d'indicateur propre — par : chef de projet
- D10 · 2026-11-01 · Étape d'un objet : table complète et règles de résolution de `decisions-progression.md` § 1.3–1.4 (Remembrance, puis lieux et régions d'acquisition, puis `regions_mentioned`, puis étiquette DLC) ; Mt. Gelmir en Milieu et Volcano Manor en Fin ; Dragonbarrow en Fin ; Consecrated Snowfield et Mohgwyn Palace en Fin de jeu ; Roundtable Hold en Début ; pas de recherche de lieux dans le texte libre : 19 armes restent « Non classé » (hors des colonnes, visibles en plein écran) — raison : `acquisition[].region` est vide dans 2 167 acquisitions sur 2 592 ; paliers du wiki — par : chef de projet
- D11 · 2026-11-01 · Le DLC reste une seule étape ; sa sous-zone (Entrée, Cœur, Enir-Ilim) sert de clé de tri dans la colonne — raison : design à 5 colonnes ; le wiki ne donne aucun palier pour le DLC — par : chef de projet
- D12 · 2026-11-01 · Rattachement Remembrance → boss : table explicite `src/engine/config/remembrances.ts`, transcrite de `decisions-progression.md` § 2.2 (52 objets, 25 Remembrances), références contrôlées par un test — raison : aucun champ structuré dans `data/` ; une table explicite est plus sûre qu'une recherche dans le texte (cas « Black Blade ») — par : chef de projet
- D13 · 2026-11-01 · Frise : ordre de la page Bosses du wiki, identique au brief ; sous-nœuds textuels pour les prérequis de Radahn, Rykard et Mohg (sans niveau, ce ne sont pas des boss) ; Messmer → Romina en chaîne avec la mention « ordre libre » — raison : prérequis documentés par le wiki, pas de nouveau composant — par : chef de projet
- D14 · 2026-11-01 · Niveau recommandé : méthode M3 (moyenne de M1, palier de zone du wiki avec ses ancres, et de M2, runes NG calées sur Elden Beast = 120), une seule des deux si l'autre manque, « Non estimé » sans l'une ni l'autre ; PV affichés mais hors calcul. Boss du DLC : niveau d'entrée du DLC (119, le plus haut des M3 de Radahn et Mohg). Bénédiction recommandée : méthode B2 (ancre Messmer ≈ 13 fragments), simplifiée par sous-zone du DLC : Entrée = arrondi(13 × 10 / 33) = 4 fragments, Cœur = 13, Enir-Ilim = 17, niveau lu dans la table de `mechanics.json` (Romina passe de 8 à 7 par rapport au rapport) — raison : seuls repères du wiki ; les PV ne suivent pas la progression ; une table à trois valeurs suffit pour une estimation — par : chef de projet
- D15 · 2026-11-01 · Correctifs C1 à C6 acceptés : combat de Sir Gideon Ofnir, runes de Godskin Duo, lieu du Draconic Tree Sentinel de Capital Outskirts, régions d'Elden Beast et de Radagon, 107 faux `Altus Plateau` dans `regions_mentioned`. Écart au design : Sir Gideon Ofnir n'est plus « Non estimé », puisque le wiki documente son combat ; le cas limite reste celui des pages sans données de combat — par : chef de projet
- D16 · 2026-11-01 · Build cible : archétypes, poids, gabarits cibles (niveau 150), plancher et poids automatiques repris du prototype (`Main.dc.html` : `ARCH`, `FLOOR`, `targetFor`, `autoW`) et décrits dans `calculs.md` — raison : choix de conception déjà faits par le design, sans fait du jeu — par : chef de projet
- D17 · 2026-11-01 · Architecture validée ; points P2 à P14 de `docs/architecture.md` § 15 arbitrés comme recommandé, dont deux écarts au design : `scaling` `null` = pas de scaling, donc pas de puce (le README ScalingChip affiche « ? ») ; 4 résultats par groupe dans la recherche (le README CommandPalette en annonce 5). Aussi : comparateur non persisté (reflété dans l'URL), e2e hors du workflow de publication, glossaire français → anglais de mots courants pour les suggestions de recherche — par : chef de projet

## Vérifications
