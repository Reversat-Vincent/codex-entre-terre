# Vérification du contenu et des calculs, deuxième tour de la boucle (v2)

> Rapport du référent contenu, 06/11/2026, pour le chef de projet. Rien n'est décidé ici : chaque constat a une gravité proposée et une correction à arbitrer.
> Périmètre : les corrections faites après `verification-v1.md` (`git diff fc3fdd3..HEAD` sur `data/`, `src/engine/`, `src/stores/`, `src/ui/explainText.ts`, `calculs.md`, `data/CHANGELOG.md`), ce qu'elles touchent, et trois textes d'interface demandés après la passe B (`WeaponAttackTable.vue`, `WeaponScaling.vue`, `hiddenReasonOf`).
> Application : branche `dev` au commit `8d6d463` (moteur D48 : `4cc1446` ; données D47 : `037d9f6`). Données préparées : `public/data/`, manifeste `dataVersion` 355f309cdf3ecc5f, générées après les correctifs D47 (D-V4 et D-V5 présents dans les fichiers préparés).
> Méthode : les **vrais stores** (`analysis`, `criteria`, `data`) montés sous Vitest sur les fichiers préparés, dans `.cache/verif/contenu-v2/` : `a_reco` (profils du tour 1 et témoins, contrefactuels « sans filtre » et « règle D47 »), `b_stages_now` / `b_stages_sans_kv3` (étapes de toutes les entités et niveaux de toutes les rencontres, avec et sans le lien K-V3, par `vi.mock`), `c_effets`, `d_textes`, `e_marges`, `f_robustesse`, `g_portee`. Sorties `*.txt` et `*.json` du même dossier. Suite du projet : 404 tests du moteur, des stores et de `explainText` passent.
> Wiki : API d'eldenring.wiki.gg, 5 lots (1 + 1 + 2 + 3 + 2 pages), sans recherche, téléchargés dans `.cache/wiki/contenu-v2/`. Aucune page « Nightreign: ».

Étiquettes : **[wiki]** fait lu dans le wikitext · **[data]** fait lu dans `data/`, `public/data/` ou mesuré par le store · **[déduction]** · **[conception]** choix du projet.

## Synthèse

| # | Constat | Gravité proposée | Correction proposée |
|---|---|---|---|
| V13 | V2 n'est pas robuste. Avec les critères par défaut, Lusat's, Azur's et Crystal Staff ne sortent du top 5 du Milieu que d'1 à 2 points (67, 66 et 66 contre 68 pour la 5e arme). Avec la préférence « pierres sombres », Lusat's (INT 52, 38 points manquants) revient 4e et Azur's 5e pour le mage INT 16. En Foi mêlée, Staff of the Avatar (31 points manquants) y apparaît de même. | majeur | règle « hors de portée » : plus de 25 points manquants, à l'étape du joueur ou à la suivante (§ 1.3) |
| V14 | Plein écran : le motif d'une arme hors build n'affiche jamais son seuil (« Hors du build cible » seul), et son « Pourquoi ? » n'a pas la limite `weapon-hidden-off-build`. Ces lignes viennent de `analysis.scored`, qui ne porte pas cette limite. Le texte prévu omet aussi « avant arrondi ». | mineur | `weaponsModel.ts` et `WeaponsTable.vue` (§ 3.3) |
| V15 | « Pourquoi ? » d'une arme hors build : « Adéquation au build : 5 / 25 » s'affiche à côté de « inférieure à 5 sur 25 avant arrondi » (Rogier's Rapier, 4,58). Les deux phrases se lisent comme contradictoires. | mineur | citer la valeur exacte dans la limite (§ 3.2) |
| V16 | Facteur 0,6 des catalyseurs : `calculs.md` et `weights.ts` le présentent comme un fait du wiki. Or la page Sorcery Scaling dit seulement « will be reduced », sans chiffre. Pour les bâtons et les sceaux, c'est une extension de la règle des armes. | mineur | étiquette [déduction] (§ 3.1) |
| V17 | Finitions de texte : « réduction de 40 % » écrit en dur dans `unmet-requirement-factor` ; en-tête de `weights.ts` contredit par `unmetRequirementFactor` ; l'exemple Winged Scythe de `calculs.md` n'est pas exact ; « les dégâts physique » | mineur | § 3.4 |
| V18 | K-V3 change aussi le niveau recommandé de deux rencontres, ce que `calculs.md` ne dit pas : Flying Dragon Greyll passe de 49 à 55, Elder Dragon Greyoll de 48 à 54 (palier T10 → T13) | mineur | phrase dans `calculs.md` (§ 4.2) |
| V19 | `data/README.md` périmé : « 429 `wiki`, 51 `deduced` » au lieu de 478 et 2 ; D47 manque dans l'historique des correctifs | mineur | texte au § 5.2 |
| V20 | Erratum de `verification-v1.md` § 1.3 : la couverture affiche **479** types documentés (478 en fiabilité `wiki`, plus Meteorite Staff, non améliorable), et non 478 ; avant D47, 430 et non 429 | mineur | erratum, aucune correction de l'application |
| V21 | Sans build cible, le symptôme de V1 subsiste, comme D48 le prévoit : pour un Astrologer en mêlée, les 5 armes du Début ont une adéquation de 0 | mineur | statu quo et phrase dans `calculs.md` (§ 2.4) |
| V22 | Rotten Crystal Staff (INT 48) reste la seule arme de la colonne Fin de jeu du mage INT 16 (60 sur 100, accessibilité 0, facteur 0,6) | mineur | statu quo (§ 1.2) |

Décompte : **0 bloquant, 1 majeur, 9 mineurs.**

État des points du tour 1 :

| Point | État |
|---|---|
| V1 | Résolu avec un build cible : plus aucune arme d'adéquation inférieure à 5 dans les colonnes des 13 profils mesurés ; Rogier's Rapier n'est plus la cible des priorités du mage. Sans build cible, voir V21. |
| V2 | Résolu avec les critères par défaut (marge de 1 à 2 points) ; non résolu avec la préférence « pierres sombres » (V13) ; Rotten Crystal Staff en Fin de jeu (V22). |
| V3 | Résolu : Clawmark Seal et Spiked Caestus passent en Fin ; effet sur deux rencontres (V18). |
| V4, V5, V6 | Résolus, conformes à leur ligne du § 6 de la v1, consignés dans `data/CHANGELOG.md` ; README à mettre à jour (V19). |
| V10 | Résolu : le cas réel de `calculs.md` est reproduit à l'identique. |
| V11 | Résolu : les quatre résumés sont appliqués ; voir V15 à V17 pour les nouveaux textes. |
| V12 | Laissé en l'état par décision, mais **résolu de fait** depuis D48 : pour `int` en style magie, l'Astrologer passe 1er (adéquation 23,4, dont +5 pour Astrologer's Staff), devant le Prisoner (21,8). Astrologer's Staff entre dans le top 5 préliminaire du Milieu depuis que Lusat's, Azur's et Crystal Staff en sortent. Ce résultat dépend toujours de la composition des colonnes. |
| V7 à V9 | Interface, hors de ce tour (passe B). |

---

## 1. V1 et V2 : profils du tour 1 rejoués

Mêmes profils et attributs qu'au tour 1 (`a_reco.txt`). Colonnes : 5 meilleures armes visibles par étape.

### 1.1 Build Intelligence (Astrologer, `int` 150)

- **[data] Mêlée** : Début **vide** (70 armes hors build), avec l'élargissement « style » (2 armes). Milieu : Carian Knight's Sword, Lazuli Glintstone Sword, Glintstone Kris, Crystal Knife, Crystal Sword. Fin : Death Ritual Spear, Helphen's Steeple. Fin de jeu : Rotten Crystal Sword, Rotten Crystal Spear, Scepter of the All-Knowing, Loretta's War Sickle. DLC : Spirit Sword, Velvet Sword of St Trina, Chilling Perfume Bottle, Carian Sorcery Sword, Star-Lined Sword. Chaque arme affichée a une lettre d'Intelligence.
- **[data] Neuf armes retirées des colonnes par le filtre** : Rogier's Rapier, Rapier, Dagger, Hand Axe, Hookclaws (Début) ; Cinquedea, Serpent-Hunter, Spiked Caestus (Fin) ; Beastman's Curved Sword (Fin de jeu). Aucune n'a de lettre d'Intelligence.
- **[data] Priorités** : VIG 9 → 40, INT 16 → 80, MND 15 → 38, END 9 → 18. Limite affichée : « Aucune arme recommandée à votre étape : pas de prérequis d'arme parmi les priorités. » DEX 12 → 17 (Rogier's Rapier) a disparu.
- **[data] Magie** : Début : Demi-Human Queen's Staff, Astrologer's Staff, Glintstone Staff. Milieu : Digger's Staff (80), Staff of Loss (79), Meteorite Staff (74), Carian Glintblade Staff (71), Academy Glintstone Staff (68). Fin : Albinauric Staff, Gelmir Glintstone Staff (D-V4). Fin de jeu : Rotten Crystal Staff. DLC : Staff of the Great Beyond, Maternal Staff. Seul Staff of the Guilty est hors build (FAI C, aucune lettre d'Intelligence).

### 1.2 V2 : bâtons à INT 48–52 (mage INT 16)

| Bâton | Prérequis | Points manquants | Total | Rang au Milieu | Tour 1 |
|---|---|---|---|---|---|
| Lusat's Glintstone Staff | STR 10, INT 52 | 38 | 67 (25 + 16 + 6 + 20) | 7e | 80, 2e |
| Azur's Glintstone Staff | INT 52 | 38 | 66 | 8e | 78, 4e |
| Crystal Staff | INT 48 | 32 | 66 | 9e | 78, 5e |
| 5e du Milieu : Academy Glintstone Staff | INT 28 | 12 | 68 | 5e | — |
| Rotten Crystal Staff (Fin de jeu) | INT 48 | 32 | 60 (25 + 15 + 0 + 20) | seule arme de sa colonne | idem |

- **[data]** La puissance des trois bâtons passe de 161 à 96,6 sur 162 (× 0,6) et leur accessibilité vaut 25 − 4 − 15 = 6. C'est conforme à D48, et au test `analysis.test.ts` (« accessibilité 6 »).
- **V22 (mineur).** Rotten Crystal Staff reste affiché en Fin de jeu : c'est le seul bâton de cette étape, et la colonne porte sur une étape lointaine (le gabarit `int` vise INT 80). Son « Pourquoi ? » affiche 32 points manquants, le facteur 0,6 et une accessibilité nulle. Options : (a) **statu quo** ; (b) masquer, dans toutes les colonnes, une arme à plus de 25 points du profil : la colonne Fin de jeu du mage serait vide, et Hand of Malenia ou Mohgwyn's Sacred Spear disparaîtraient de la Fin de jeu du build saignement. Recommandation : (a).

### 1.3 V13 (majeur) : la correction de V2 ne tient pas avec la préférence « pierres sombres »

- **[data]** (`f_robustesse.txt`) Mage INT 16, magie, critère « pierres sombres préférées », colonne Milieu : Digger's Staff 74, Meteorite Staff 74, Staff of Loss 73, **Lusat's Glintstone Staff 72 (38 points manquants)**, **Azur's Glintstone Staff 71 (38)**. Avec le joueur à l'étape Milieu, Lusat's obtient 76 et Azur's 75, toujours 4e et 5e.
- Cause [data] : ces bâtons gardent 25 en adéquation et passent à 25 en amélioration (pierres sombres, +5). Le facteur 0,6 ne leur retire que 5 points de puissance, et l'accessibilité ne peut pas tomber sous 6 (plafond de 15). Avec les critères par défaut, ils ne sont sortis du top 5 que d'1 à 2 points (§ 1.2).
- Simulation sur 24 cas (8 profils × 3 préférences de pierres, `g_portee.txt`) : seuls trois cas montrent, à l'étape du joueur ou à la suivante, une arme à plus de 25 points manquants. Ce sont Lusat's et Azur's (INT magie, pierres sombres) et Staff of the Avatar (Foi mêlée, pierres sombres, 31 points, Milieu).
- **[wiki]** Pas de chiffre plus sévère à appliquer aux catalyseurs. [Sorcery Scaling](https://eldenring.wiki.gg/wiki/Sorcery_Scaling) : « must meet the required attribute stats to wield the weapon, or the Sorcery Scaling will be reduced ». Aucun fait du wiki ne contredit D48 ; le constat porte sur l'objectif de V2.
- Options :
  - (a) statu quo, en écrivant la limite dans `calculs.md` : une préférence de pierres peut ramener un bâton hors de portée ;
  - (b) **règle « hors de portée » [conception]** : une arme dont l'étape est celle du joueur ou la suivante, et à qui il manque **plus de 25 points** de prérequis (seuil où le malus d'accessibilité atteint son plafond, 15 / 0,6), est écartée des colonnes. La raison est comptée comme « hors build », sans être proposée en élargissement. Les étapes plus lointaines ne sont pas touchées (Rotten Crystal Staff, Hand of Malenia restent). Sur les 24 cas simulés, seuls les trois cas ci-dessus changent, et aucune colonne ne se vide ;
  - (c) appliquer le plafond d'accessibilité seulement aux armes de l'étape du joueur, ce qui est moins lisible.
- Recommandation : (b). Réglage proposé : `SCORE_FILTERS.maxMissingPointsNearStages = 25` et `SCORE_FILTERS.nearStagesAhead = 1` dans `src/engine/config/weights.ts`, nouvelle raison `out-of-reach` dans `MASK_REASONS` (`score.ts`), texte de limite « Il manque N points de prérequis à cette arme, au-delà de 25 : elle ne figure pas dans les recommandations de votre étape ni de la suivante. » ; paragraphe ajouté dans `calculs.md`, « Filtres appliqués avant le score ».

### 1.4 Build Dextérité / Arcane (attributs du Samurai, `dexarc`, saignement)

- **[data]** Début : Reduvia, Hookclaws, Rogier's Rapier, Great Knife, Forked Hatchet. Fin de jeu : Varré's Bouquet, Flowing Curved Sword, Rotten Crystal Spear, **Hand of Malenia**, **Mohgwyn's Sacred Spear**. Les deux armes de saignement évincées au tour 1 reviennent, et Rotten Crystal Sword et Miquellan Knight's Sword sont hors build.
- **[data]** Priorités : ARC 8 → 13 (Reduvia), VIG 12 → 40, DEX 15 → 50, END 13 → 25. Identiques au tour 1.

### 1.5 Troisième profil : Force (Vagabond, `str` 150)

- **[data]** Début : Iron Cleaver 79, Chainlink Flail, Banished Knight's Halberd, Battle Axe, Club. Le filtre ne retire **aucune** arme des colonnes. Hors build : 13 armes (2 au Début, 3 au Milieu, 8 dans le DLC), dont aucune n'a de lettre D ou mieux en Force.
- Priorités : voir § 6.

---

## 2. Effets de bord

### 2.1 Nombre d'armes visibles par étape

« Tour 1 » : moteur et données d'avant D47 (`contenu-v1/a_reco.txt`). « Sans filtre » : moteur actuel (facteur, plafond 15, étapes K-V3 et D-V4), filtre « hors build » neutralisé. « Après » : état actuel.

| Profil | Mesure | Début | Milieu | Fin | Fin de jeu | DLC |
|---|---|---|---|---|---|---|
| Défaut D31 (sans build) | tour 1 → après | 67 → 67 | 107 → 106 | 36 → 37 | 19 → 19 | 79 → 79 |
| Force (Vagabond, `str`) | tour 1 / sans filtre / après | 68 / 68 / 66 | 107 / 106 / 103 | 36 / 37 / 37 | 19 / 19 / 19 | 79 / 79 / 71 |
| Dex / saignement (`dexarc`) | tour 1 / sans filtre / après | 68 / 68 / 51 | 106 / 105 / 54 | 36 / 37 / 20 | 19 / 19 / 7 | 79 / 79 / 46 |
| INT magie (Astrologer) | tour 1 / sans filtre / après | 2 / 3 / 3 | 15 / 12 / 11 | 0 / 2 / 2 | 1 / 1 / 1 | 2 / 2 / 2 |
| INT mêlée (Astrologer) | tour 1 / sans filtre / après | 68 / 68 / **0** | 106 / 105 / 24 | 36 / 37 / 2 | 19 / 19 / 4 | 79 / 79 / 19 |
| Foi magie (Prophet) | tour 1 / après | 3 / 3 | 3 / **1** | 3 / 5 | 0 / 0 | 3 / 3 |

Écarts hors filtre : Spiked Caestus passe du Milieu à la Fin (K-V3). Pour INT magie, Albinauric Staff et Gelmir Glintstone Staff passent du Milieu à la Fin (D-V4), et Astrologer's Staff du Milieu au Début (équipement de départ de l'Astrologer, devenu l'origine retenue). En Foi magie, Clawmark Seal et Erdtree Seal passent en Fin (K-V3, D-V4) : le Milieu n'a plus que Golden Order Seal et propose l'élargissement « style » (24). C'est fidèle aux lieux du wiki ; aucune correction n'est proposée.

### 2.2 Armes pertinentes écartées à tort : aucune

`c_effets.txt`, 13 profils avec build cible :

| Profil | Visibles (sans filtre → après) | Retirées des colonnes | Écartées avec une lettre ≥ C sur un attribut principal |
|---|---|---|---|
| Force `str` | 309 → 296 | 0 | 0 |
| Qualité `qual` | 308 → 302 | 0 | 0 |
| Dextérité `dex` | 308 → 300 | 0 | 0 |
| Dex / saignement `dexarc` | 308 → 178 | 1 (Beastman's Curved Sword, STR C, DEX E) | 0 (63 avec un D, toutes pénalisées par un prérequis supérieur à 10 hors build) |
| INT magie / mêlée / hybride | 20 → 19 / 308 → 49 / 371 → 71 | 0 / 9 / 3 | 0 |
| Foi magie / mêlée | 12 → 12 / 308 → 92 | 0 / 1 | 0 |
| Arcane `arc` | 308 → 75 | 5 (Cinquedea, Serpent-Hunter, Beastman's, Miquellan, Rotten Crystal Sword) | 0 |
| Int / Dex `intdex` | 308 → 185 | 0 | 0 (57 avec un D) |
| Force / Foi `strfai` | 309 → 221 | 0 | 1 : Marais Executioner's Sword (STR C ; DEX 14 et ARC 23 hors build, −4 − 7 : 2,75) |
| Int / Foi magie `intfai` | 32 → 31 | 1 (Maternal Staff, ARC 21) | 0 |

- Armes de qualité d'un build Force ou Dextérité : aucune écartée. Catalyseurs à portée : aucun écarté (INT magie : Staff of the Guilty seulement, sans lettre d'Intelligence). Le cas Marais Executioner's Sword est défendable (ARC 23 pour un build Force / Foi).
- **Lettre secondaire, constat sans correction (D48 l'a tranché).** Le seuil de 5 dépend du poids secondaire de l'archétype. Une lettre D seule dans l'attribut secondaire est écartée pour `int` et `str` (poids 0,2 : 3,3) et pour `fai` (poids 0,3 : 4,6). Elle est gardée pour `arc` (poids 0,4 : 5,7). Pour l'Arcane (Bandit), 4 des 5 armes du Début n'ont pas de lettre d'Arcane (Rogier's Rapier, Hand Axe, Rapier, Dagger ; adéquation 6 à 8). Une arme STR D / DEX D est gardée avec un prérequis de Force de 9 (Hand Axe) et écartée à 11 (Uchigatana, −4 au-delà de 10).

### 2.3 Colonnes vidées

Une seule colonne se vide : le Début du mage INT en mêlée, comme le prévoyait la v1 (§ 3.2). Elle affiche l'élargissement « style » (2 bâtons), jamais « hors build ». En style hybride, la colonne garde 2 armes.

### 2.4 Profil sans build cible

- **[data]** Le filtre ne s'applique pas (0 arme hors build ; test `analysis.test.ts` « Sans build cible, rien n'est écarté »). Les nombres d'armes par étape du profil par défaut ne changent que par K-V3 (Milieu 107 → 106, Fin 36 → 37).
- Les classements changent par le facteur 0,6 et le plafond 15 (D48). Profil par défaut, attributs à 10 : Nox Flowing Hammer (STR 17) passe de 76 à 72, et Lazuli Glintstone Sword prend la tête du Milieu. Iron Greatsword, Rotten Staff et Anvil Hammer sortent de leurs colonnes.
- **V21 (mineur).** Pour un Astrologer sans build cible en mêlée (poids automatiques INT 1), le Début affiche Battle Axe, Hand Axe, Highland Axe, Reduvia et Rogier's Rapier, **tous d'adéquation 0**. D48 le prévoit (« sans build cible, ce filtre ne s'applique pas »). Options :
  - (a) **statu quo**, avec une phrase ajoutée dans `calculs.md`, « Filtres appliqués avant le score », après « ce filtre ne s'applique pas » : « une colonne peut alors montrer des armes d'adéquation nulle (Astrologer en mêlée sans build cible : Battle Axe, Hand Axe, Highland Axe, Reduvia, Rogier's Rapier au Début) ; choisir un build cible les écarte » ;
  - (b) étendre le filtre aux poids automatiques : la colonne serait vide.
  - Recommandation : (a).

---

## 3. Seuils de D48 et textes

### 3.1 Cohérence des seuils : conforme

| Réglage | `config/weights.ts` | `score.ts` | `calculs.md` | `explainText.ts` | Test |
|---|---|---|---|---|---|
| Hors build : composante 1 < 5 sur 25, avant arrondi, exclusif | `SCORE_FILTERS.minFitComponent = 5` | `isOffBuild` : `fitScore().exact < 5` | « inférieure à 5 sur 25 avant arrondi », « (exclusif) » | `weapon-hidden-off-build`, seuil lu dans `params.max` | `config.test.ts:72` |
| Facteur 0,6 | `POWER_WEIGHTS.unmetRequirementFactor = 0.6` | `base × factor` | « multipliée par 0,6 » | paramètre `factor` ; « 40 % » écrit en dur (V17) | `config.test.ts:74` |
| Strictement plus de 5 points | `unmetRequirementTolerance = 5` | `missingPoints > tolerance` | « plus de 5 points » ; « strictement plus de 5 points » | `requirement-not-met` et `unmet-requirement-factor`, lus dans la configuration | `config.test.ts:74` |
| Plafond 15 | `ACCESS_WEIGHTS.missingPointsCap = 15` | `min(15, 0,6 × points)` | « plafonné à 15, atteint à 25 points » | — | `config.test.ts:73` |

Bornes vérifiées [data] : Rogier's Rapier, 5 points manquants → × 1 ; Rotten Crystal Sword (profil Force), 6 points → × 0,6 ; Lusat's, 38 points → accessibilité 6. Les points manquants sont comptés en Force réelle, et le prérequis est atteint en Force effective (`compareRequirements`), comme `calculs.md` le dit pour les composantes 2 et 3.

- **V16 (mineur), étiquette.** `calculs.md` (composante 2) cite « [wiki : Weapon Scaling, « takes a -40% penalty » ; Sorcery Scaling pour les catalyseurs] ». `weights.ts` dit du facteur : « Seule valeur de ce fichier tirée du jeu ».
  - **[wiki]** [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) : « If that requirement is not met, anything that scales with that attribute receives no scaling, and instead takes a -40% penalty. »
  - **[wiki]** [Sorcery Scaling](https://eldenring.wiki.gg/wiki/Sorcery_Scaling) : seulement « the Sorcery Scaling will be reduced », sans chiffre.
  - Pour les catalyseurs, le facteur 0,6 est donc une **[déduction]** (extension de la règle des armes).
  - Correction : `calculs.md`, composante 2, remplacer « ; [Sorcery Scaling](…) pour les catalyseurs] » par « ] ; pour les catalyseurs, [Sorcery Scaling](…) dit seulement que la puissance de sort « will be reduced », sans chiffre : le même facteur leur est appliqué [déduction] ». Dans `weights.ts`, compléter le commentaire de `unmetRequirementFactor` : « fait du wiki pour les armes ; déduction pour la puissance de sort des catalyseurs ».

### 3.2 « Pourquoi ? » des armes concernées (rendu de `describeComponent` et `limitText`)

- **Iron Cleaver**, Vagabond STR 14 (tolérance) : « Puissance retenue, × 1 : prérequis non atteints (STR), total manquant 1 ; réduction de 40 % seulement au-delà de 5 points manquants : 120 / 200 ». Total 79. Exact.
- **Lusat's Glintstone Staff**, mage INT 16 : « Puissance de base à +0, puissance de sort (sorcery_scaling) : 161 / 162 » puis « Puissance retenue, × 0,6 : prérequis non atteints (STR, INT), total manquant 38 ; … : 96,6 / 162 » ; accessibilité 6 / 25 ; « Points d'attribut manquants : 38 ». Exact : 161 × 0,6 = 96,6, et l'Astrologer a STR 8 pour un prérequis de 10.
- **Winged Scythe**, mage INT en mêlée : adéquation 0 / 25 (moyenne 0,07, pénalité −11) ; « Puissance retenue, × 0,6 : prérequis non atteints (STR, DEX, FAI), total manquant 29 ; … : 114,6 / 200 » ; limite « L'adéquation de cette arme à votre build cible est inférieure à 5 sur 25 avant arrondi : elle ne figure pas dans les recommandations. » Exact et lisible.
- **Rogier's Rapier**, mage INT en mêlée : « Adéquation au build : 5 / 25 », « Moyenne pondérée des lettres de scaling : 0,09 », puis la même limite « inférieure à 5 sur 25 avant arrondi ».
- **V15 (mineur).** Les deux lignes sont justes (4,58 s'arrondit à 5), mais on lit « 5 » et « inférieure à 5 » côte à côte. Correction :
  - `src/engine/score.ts`, ajouter à `WeaponScore` la composante 1 avant arrondi (`fitExact`, déjà calculée par `fitScore`) ;
  - `withVisibilityLimits` passe `params: { max: SCORE_FILTERS.minFitComponent, value: fitExact arrondie à 0,1 }` ;
  - `src/ui/explainText.ts`, `LIMIT_TEXTS['weapon-hidden-off-build']` : « L'adéquation de cette arme à votre build cible vaut ${value} sur 25 avant arrondi, sous le seuil de ${max} : elle ne figure pas dans les recommandations. »

### 3.3 Textes d'interface relus (demande du coordinateur, après la passe B)

- **`WeaponAttackTable.vue`** : conforme au wiki et à D48.
  - Étiquette par type : « Prérequis non atteint : −40 %, sans bonus ».
  - Note : texte de `requirement-not-met`, rendu « Prérequis non atteint (DEX) : les dégâts physique sont réduits de 40 % et sans bonus de scaling, dès un point manquant. Le score de recommandation, lui, ne réduit la puissance qu'au-delà de 5 points manquants. »
  - [data] Rogier's Rapier, Astrologer (DEX 12 pour 17) : l'attaque physique passe de 136 à 81 (136 × 0,6), alors que le score garde le facteur × 1 (5 points manquants, dans la tolérance). La fiche réduit donc dès le premier point, le score seulement au-delà de 5 points, comme D48 le prévoit.
  - Un type élémentaire dont l'attribut de scaling n'est pas documenté garde sa base, avec la limite visible « L'effet d'un prérequis non atteint sur les dégâts sacré n'est pas documenté » (Winged Scythe : sacré 104). C'est honnête. Seul défaut, l'accord « dégâts physique » (V17).
- **`WeaponScaling.vue`** : conforme. Texte : « Il manque … L'arme reste utilisable, mais l'attaque calculée est réduite de 40 % dès le premier point manquant (règle du jeu) pour les types de dégâts concernés, sans bonus de scaling. » Cela correspond au wiki : « anything that scales with that attribute receives no scaling, and instead takes a -40% penalty ». La note ne parle pas du score, ce qui est juste.
- **`hiddenReasonOf`** (`src/widgets/weapons/weaponsModel.ts`), V14 (mineur) : la fonction cherche le seuil dans la limite `weapon-hidden-off-build` du score de la ligne. Or le tableau plein écran reçoit `analysis.scored` (`WeaponsFullscreenView.vue:43`), dont les scores n'ont pas cette limite : seul `scoreOf` l'ajoute (`withVisibilityLimits`).
  - [data] (`d_textes.txt`) Rogier's Rapier, Winged Scythe et Club donnent « Hors du build cible », sans seuil. Le texte complet n'apparaît qu'en passant par `scoreOf`.
  - Pour la même raison, le « Pourquoi ? » de la ligne (`WeaponsTable.vue:355`, `row.score.explanation`) n'a pas la phrase de la limite.
  - Le texte prévu, « adéquation inférieure à 5 sur 25 », omet « avant arrondi », alors que la colonne Adéquation affiche 5 pour Rogier's Rapier.
  - Aucun test ne couvre ce texte.
  - Correction :
    - `hiddenReasonOf` lit le seuil dans `SCORE_FILTERS.minFitComponent` (`src/engine/config/weights.ts`) et rend « Hors du build cible : adéquation inférieure à 5 sur 25 avant arrondi » ; corriger en conséquence le commentaire de la ligne 86 ;
    - `WeaponsTable.vue:355` : `:explanation="analysis.scoreOf(row.candidate.ref)?.explanation ?? row.score.explanation"`, pour que le « Pourquoi ? » porte les limites `weapon-hidden-*` ;
    - un test dans `tests/unit/widgets/weaponsModel.test.ts` sur une ligne de `analysis.scored`.

### 3.4 V17 (mineur) : finitions

1. `src/ui/explainText.ts`, `COMPONENT_SPECS['unmet-requirement-factor']` : « réduction de 40 % » est écrit en dur, alors que le facteur vient de la configuration. Le dériver : `formatPercent(1 - POWER_WEIGHTS.unmetRequirementFactor)`.
2. `src/engine/config/weights.ts`, ligne 2 : « Aucune valeur de ce fichier n'est un fait du jeu. » → « Aucune valeur de ce fichier n'est un fait du jeu, sauf `POWER_WEIGHTS.unmetRequirementFactor` (voir son commentaire). »
3. `calculs.md`, « Filtres appliqués avant le score » : « Winged Scythe, 0 après pénalité de Foi » → « Winged Scythe, DEX D : 3,3, puis 0 après les pénalités de Force (STR 16, −4) et de Foi (FAI 24, −7) ».
4. `src/ui/explainText.ts` : « les dégâts ${type} » donne « les dégâts physique », « les dégâts magie ». Remplacer par « les dégâts de type ${type} » dans `requirement-not-met`, `requirement-effect-undocumented`, `penalty-exception` et `weakness-absorption`.

---

## 4. Étapes

### 4.1 Armes : 5 changements, tous attendus

**[data]** Les 487 armes ont été comparées à `contenu-v1/b_stages.json`. Seules 5 changent d'étape :

| Arme | Tour 1 | Après | Cause |
|---|---|---|---|
| Spiked Caestus | Milieu (Caelid) | **Fin** (Dragonbarrow) | K-V3 |
| Clawmark Seal | Milieu (Caelid) | **Fin** (Dragonbarrow) | K-V3 |
| Albinauric Staff | Milieu (Mt. Gelmir) | **Fin** (Volcano Manor) | D-V4 |
| Erdtree Seal | Milieu (Mt. Gelmir) | **Fin** (Volcano Manor) | D-V4 |
| Gelmir Glintstone Staff | Milieu (Mt. Gelmir) | **Fin** (Volcano Manor) | D-V4 |

- Les 28 autres armes du tableau de 33 du tour 1 sont inchangées : même étape, même règle, même région (Cinquedea toujours en Fin).
- Répartition : Début 116 · Milieu **168** (173) · Fin **54** (49) · Fin de jeu 26 · DLC 102 (Entrée 45, Cœur 44, Enir-Ilim 9, non localisé 4) · Non classé 21. Le décompte « 466 sur 487 » reste exact.

### 4.2 K-V3 sur les autres entités et les rencontres (contrefactuel)

**[data]** `b_stages_now.json` contre `b_stages_sans_kv3.json`, avec le lien `Dragonbarrow → Caelid` retiré par `vi.mock` :
- Entités à acquisitions (armes, armures, talismans, sorts, cendres, esprits, outils, matériaux) : seuls Spiked Caestus et Clawmark Seal changent.
- Rencontres : deux changent. Leur lieu est `Greyoll's Dragonbarrow` et leurs régions `Caelid` et `Dragonbarrow` (`bosses.json`) :

| Rencontre | Étape | Palier | M1 | M2 | Niveau recommandé |
|---|---|---|---|---|---|
| Flying Dragon Greyll | Milieu → Fin | T10 → T13 | 48 → 60 | 50 | **49 → 55** |
| Elder Dragon Greyoll | Milieu → Fin | T10 → T13 | 48 → 60 | 48 | **48 → 54** |

- Frise : niveaux identiques. Aucun des 18 nœuds de l'histoire n'est en Dragonbarrow.
- **V18 (mineur).** Le résultat suit la règle écrite (« palier de la région la plus précise », `calculs.md`, « Autres rencontres ») et le palier de Dragonbarrow (T13, `config/bossLevel.ts`, `deduced`). Mais `calculs.md` ne mentionne que le changement d'étape. Correction : dans le paragraphe K-V3 de `calculs.md` (« Étape de progression d'une arme »), après « les rencontres Flying Dragon Greyll et Elder Dragon Greyoll (`Caelid` + `Dragonbarrow`) aussi », ajouter : « Leur palier de zone passe aussi de T10 (Caelid) à T13 (Dragonbarrow) : niveau recommandé 55 au lieu de 49 (Greyll), 54 au lieu de 48 (Greyoll). »

---

## 5. Données

### 5.1 D-V4 à D-V6 : conformes

**[data]** Comparaison champ à champ de `data/*.json` entre `fc3fdd3` et `HEAD` :
- **D-V4** : 3 changements dans `ranged_weapons_catalysts.json`, `acquisition[0].location` `"Mt. Gelmir"` → `"Volcano Manor"` (Albinauric Staff, Erdtree Seal, Gelmir Glintstone Staff). Les textes d'acquisition citent bien Volcano Manor ; `regions_mentioned` garde `Mt. Gelmir` et `Volcano Manor`. Conforme à la ligne D-V4 de la v1.
- **D-V5** : 49 changements de `upgrade.material_info_source`, `deduced (…)` → `wiki (Armaments by Bolstering Material)` : 45 en mêlée, 3 à distance, 1 bouclier. Ce sont exactement les 49 armes de la v1. `material` est inchangé. Restent déduites Idus Sword et Hefty Scimitar (Tarnished Pack).
- **D-V6** : `shields_torches.json`, `metadata.field_notes.status_inconsistencies_flagged` = « Nanaya's Torch: weapon page 65 (kept), Madness page list +55 ». Aucune valeur d'arme n'a changé (`status_buildup.madness` = 65).
- Aucune autre différence, sauf un saut de ligne final ajouté aux trois fichiers (sans effet).
- `data/CHANGELOG.md`, section « 2026-11-06 (D47) » : les 5 lignes (fichier, entrée, champ, ancienne et nouvelle valeur, URL, décision, date) et la liste des 49 armes. Conforme.
- **Couverture** [data] : fiabilité `wiki` 478 (429 au tour 1), `deduced` 2, `estimate` 4, `null` 2, non améliorable 1 (Meteorite Staff). Le décompte de couverture (`coverage.ts`) compte « non améliorable » comme documenté : mêlée 329, distance 63, boucliers 87, soit **479**.
- **V20 (mineur), erratum.** La v1 (§ 1.3) annonçait « 478 types documentés au lieu de 429 ». Le bon chiffre de la couverture est **479 au lieu de 430**. 478 est le nombre d'armes en fiabilité `wiki`. Aucune correction de l'application.

### 5.2 V19 (mineur) : `data/README.md`

- « Limites connues », 3e sous-point du type d'amélioration : « 429 `wiki` (listes comprises), 51 `deduced` (déduit d'une règle du wiki), 4 `estimate`, 2 `null`, 1 non améliorable » → « 478 `wiki` (listes comprises), 2 `deduced` (Idus Sword et Hefty Scimitar, Tarnished Pack, absentes de la liste), 4 `estimate`, 2 `null`, 1 non améliorable (Meteorite Staff) ».
- « Correctifs après l'extraction » : ajouter « 06/11/2026, D47 : lieu de trois objets de Volcano Manor (D-V4), provenance du type d'amélioration de 49 armes lue dans « Armaments by Bolstering Material » (D-V5), incohérence de Nanaya's Torch consignée dans les métadonnées (D-V6) ». La liste ne cite pas non plus D39 ni D44, qui ont des sections dans `CHANGELOG.md`.

---

## 6. Exemple des priorités de `calculs.md` : reproduit

**[data]** Profil Vagabond (VIG 15, MND 10, END 11, STR 14, DEX 13), build `str` 150, étape Début :
- Cible (`target`) : VIG 60, MND 15, END 31, STR 80, DEX 16. Origine retenue : Vagabond.
- Meilleure arme : Iron Cleaver, **79 points**, 1 point manquant, facteur × 1.
- Priorités affichées : « STR, prérequis de la meilleure arme de votre étape (actuellement 14), à atteindre : 15 » ; « VIG, premier palier de rendement publié par le wiki (actuellement 15), à atteindre : 40 » ; « END, cible du build (actuellement 11, écart de 20, poids 0,5), à atteindre : 31 » ; « MND, cible du build (actuellement 10, écart de 5, poids 0,5), à atteindre : 15 ».
- À l'étape Milieu : STR 14 → 17 (Nox Flowing Hammer), puis VIG 40, END 31, MND 15.

Identique au texte de `calculs.md` et au test `analysis.test.ts`. Prérequis d'Iron Cleaver (STR 15, DEX 7) conformes à `melee_armaments.json` et vérifiés au tour 1 sur [Iron Cleaver](https://eldenring.wiki.gg/wiki/Iron_Cleaver).

---

## 7. Meteoric Ore Blade : saignement 50 confirmé

- **[wiki]** [Meteoric Ore Blade](https://eldenring.wiki.gg/wiki/Meteoric_Ore_Blade), infobox : `effects =Causes [[blood loss]] buildup (50)`. Dans le tableau d'amélioration (`Weapon_Upgrades_Somber`), `+0_passive` à `+10_passive` donnent tous « Causes blood loss buildup (50) ». Scaling STR D, DEX E, INT D ; prérequis 15 / 14 / 18.
- **[wiki]** [Blood Loss](https://eldenring.wiki.gg/wiki/Blood_Loss), liste des armes : « Meteoric Ore Blade || +50 Blood loss ».
- **[data]** `melee_armaments.json` : `status_buildup.blood_loss = 50`, `passive_effects = ["Causes blood loss buildup (50)"]`, scaling et prérequis identiques. Conforme.
- Test `analysis.test.ts:243` : l'arme est hors build pour `dexarc` + saignement. Calcul : moyenne DEX E 0,125 → 6,25 ; −4 (STR 15) ; −4 (INT 18) ; +4 (saignement) = 2,25, sous 5. Le commentaire du test dit juste. Les trois autres armes de saignement de ce test concordent aussi :
  - Moonveil, 50 ([page](https://eldenring.wiki.gg/wiki/Moonveil) et liste) ;
  - Winged Scythe, 55 (liste ; page vérifiée au tour 1) ;
  - Barbed Staff-Spear, 55 ([page](https://eldenring.wiki.gg/wiki/Barbed_Staff-Spear), Shadow of the Erdtree).

---

## 8. Correctifs proposés

Aucun correctif de données (`data/*.json`). Le texte de `data/README.md` relève du chef de projet (V19).

| # | Fichier | Changement |
|---|---|---|
| V13 | `src/engine/config/weights.ts`, `src/engine/score.ts`, `src/ui/explainText.ts`, `calculs.md` | Règle « hors de portée » : plus de 25 points manquants, à l'étape du joueur ou à la suivante ; raison `out-of-reach`, non proposée en élargissement (option b, § 1.3) |
| V14 | `src/widgets/weapons/weaponsModel.ts` (`hiddenReasonOf`, commentaire l. 86), `src/widgets/weapons/WeaponsTable.vue:355`, `tests/unit/widgets/weaponsModel.test.ts` | Seuil lu dans `SCORE_FILTERS.minFitComponent`, avec « avant arrondi » ; « Pourquoi ? » tiré de `scoreOf` ; un test |
| V15 | `src/engine/score.ts` (`WeaponScore.fitExact`, `withVisibilityLimits`), `src/ui/explainText.ts` | La limite `weapon-hidden-off-build` cite la valeur exacte (« vaut 4,6 sur 25 avant arrondi, sous le seuil de 5 ») |
| V16 | `calculs.md` (composante 2), `src/engine/config/weights.ts` (commentaire de `unmetRequirementFactor`) | Facteur 0,6 des catalyseurs étiqueté [déduction] |
| V17 | `src/ui/explainText.ts`, `src/engine/config/weights.ts` (l. 2), `calculs.md` | Les 4 finitions du § 3.4 |
| V18 | `calculs.md` (paragraphe K-V3) | Niveaux recommandés de Greyll (55) et Greyoll (54) |
| V19 | `data/README.md` | Fiabilité 478 / 2, ligne D47 dans l'historique |
| V20 | — | Erratum de la v1 : 479 au lieu de 430 dans la couverture |
| V21 | `calculs.md` (« Filtres appliqués avant le score ») | Phrase sur les profils sans build cible |
| V22 | — | Statu quo |

## Non vérifiable

- **Réduction de la puissance de sort** d'un bâton ou d'un sceau dont un prérequis manque : le wiki dit « will be reduced », sans chiffre ([Sorcery Scaling](https://eldenring.wiki.gg/wiki/Sorcery_Scaling)). Le facteur 0,6 des catalyseurs reste une déduction (V16).
- **Plausibilité des seuils** (5 sur 25, 25 points, poids secondaires) : choix de conception ; le wiki ne recommande aucune arme par build.
- **Palier de zone de Dragonbarrow** (T13) : déduction déjà inscrite dans `config/bossLevel.ts` ; le wiki ne publie pas de niveau par boss.
- Le reste figure déjà dans `verification-v1.md` et `verification-socle.md`.
