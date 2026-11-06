# Vérification anticipée du socle (moteur, données préparées, faits du jeu)

> Rapport du référent contenu, 05/11/2026, pour le chef de projet. Rien n'est décidé ici : chaque constat porte une gravité proposée et une correction à arbitrer.
> Moteur : `src/engine/` et `src/engine/config/` (état de travail de la branche `dev`). Données : `public/data/` (manifeste `dataVersion` 7fde6e4d126166cd, extraction du 31/10/2026).
> Wiki : API d'eldenring.wiki.gg, interrogée le 05/11/2026 (deux lots de 50 et 39 pages, plus 4 requêtes de recherche), téléchargements dans `.cache/wiki/socle/`.
> Scripts reproductibles : `.cache/verif/socle/` (`s1_runes_stats.ts` à `s11_fix.ts`, lancés avec `node` 24 ; aides Python dans `py/`, lancées avec `python -I`).

Étiquettes : **[wiki]** fait lu dans le wikitext · **[data]** fait lu dans `data/` ou `public/data/` · **[déduction]** · **[estimation]** · **[conception]**.

## Synthèse

| # | Constat | Gravité proposée | Correction proposée |
|---|---|---|---|
| F1 | Crumbling Farum Azula n'a pas `Mountaintops of the Giants` pour parent : Maliketh, Placidusax et Godskin Duo tombent en **Fin** au lieu de **Fin de jeu** (Maliketh's Black Blade, Dragon King's Cragblade, étape courante en mode « Boss vaincus ») | majeur | correctif de données L1 (ou lien ajouté dans `REGION_PARENT`) |
| F2 | Le style « magie » recommande des Sacred Seals (adéquation 0) à un mage Intelligence, dans 4 colonnes sur 5 | majeur | filtrer les catalyseurs par les poids du build (`weaponPools.ts`) |
| F3 | Clinging Bone recommandée en Début ; elle ne s'obtient qu'après une moitié du Haligtree Secret Medallion | majeur | surcharge d'étape en configuration |
| F4 | `calculs.md` applique la courbe « physique » à toutes les affinités ; le wiki rattache la courbe à l'affinité de l'arme | majeur (méthode Estimation) | texte corrigé du point 6, courbe « non physique » en configuration |
| F5 | Six objets mal placés par des défauts de lieu dans `data/` (Perfumer's Shield, Prelate's Inferno Crozier, Erdsteel Dagger, Stone-Sheathed Sword, Anvil Hammer, Somberstone Miner's Bell Bearing [5]), et Spiraltree Seal par une condition de quête | mineur | correctifs L2 à L6 et L8 ; surcharge S2 |
| F6 | Carian Regal Scepter : « Purchase » et `purchasable` viennent d'un intertitre faux du wiki ; c'est un échange de Remembrance | mineur | correctif L9 |
| F7 | Paliers de rendement : le wiki cite aussi FP 50 et endurance 15, que la détection ne trouve pas | mineur | choix à arbitrer (§ 9) |
| F8 | Adéquation précoce des origines non pondérée : Samurai passe devant Vagabond pour un build Force | mineur | pondérer par les poids du build |
| F9 | Écarts de texte dans `calculs.md` (maxima de bénédiction, cas de test du plan d'amélioration, décompte des armes classées) | mineur | textes corrigés (§ 4, § 10, § 3) |

Conformes sans écart : coût en runes (713 lignes contre le wiki), statistiques dérivées (4 × 99 lignes contre le wiki), deux mains, cas A, B et C de l'origine optimale, tous les niveaux M3 de la frise, niveau 119 du DLC, bénédiction par sous-zone, exemples de puissance d'attaque (Club 61, 7 cas Longsword), paliers des Bell Bearings.

---

## 1. Coût en runes, statistiques dérivées, deux mains

**Constats : tout est conforme.**
- **[data]** Les 11 cas de test de `calculs.md` (coûts de 1, 11, 12, 150, 209, 679, 712 ; totaux 9→10, 9→40, 1→150, 1→713) sont exacts (`runeCost`, `runesBetween`).
- **[data]** 10 niveaux tirés au hasard (graine fixe : 7, 70, 71, 98, 168, 409, 469, 482, 535, 608) : moteur = `mechanics.json` (`Level`, `summary_tables[0]`, `Runes to next`) = formule entière, sans écart.
- **[wiki]** Les 713 lignes de la colonne « Runes to next » de [Level](https://eldenring.wiki.gg/wiki/Level) concordent toutes avec `tables.levelCosts`.
- **[wiki]** Les tables de [Vigor](https://eldenring.wiki.gg/wiki/Vigor) (HP), [Mind](https://eldenring.wiki.gg/wiki/Mind) (FP) et [Endurance](https://eldenring.wiki.gg/wiki/Endurance) (Stamina, Equip Load) concordent avec les tables préparées sur leurs 99 lignes chacune. Vigor 15 → 522 PV, Mind 10 → 78 FP, Endurance 25 → 121 et 72,0 : conformes, comme tous les cas de test de `calculs.md` (Astrologer 396 / 95 / 94 / 46,6 ; Samurai 455 / 82 / 101 / 52,9).
- **[data]** Deux mains : `floor(STR × 1,5)` (7 → 10, 9 → 13, 14 → 21, 15 → 22) et Force réelle nécessaire (20 → 14, 22 → 15, 23 → 16, 24 → 16, 28 → 19, 30 → 20, 34 → 23) conformes. Igon's Greatbow avec STR 15 : effective 22, écart 1, mode « toujours à deux mains ». **[wiki]** La page [Strength](https://eldenring.wiki.gg/wiki/Strength) dit toujours « rounded up » : incohérence déjà connue, sans effet.

## 2. Origine optimale

**Constats.**
- **[data]** Cas A, B et C de `calculs.md` reproduits à l'identique ; niveau final et points gaspillés recalculés indépendamment pour les 12 origines × 6 cibles, sans écart.
- Classement au niveau 150 (Tarnished Pack compris ; sans lui, le haut du classement ne change pas) :

| Archétype (gabarit) | 1 | 2 | 3 | Dernier |
|---|---|---|---|---|
| Force `str` (60, 15, 31, 80, 16, 9, 9, 9) | Samurai (150, 0) | Vagabond (150, 0) | Heavy Knight (150, 0) | Prophet (158, 8) |
| Intelligence `int` (50, 38, 18, 12, 18, 80, 7, 6) | Astrologer (153, 3) | Prisoner (153, 3) | Samurai (153, 3) | Prophet (163, 13) |
| Dextérité / Arcane `dexarc` (60, 15, 25, 14, 50, 9, 8, 48) | Bandit (150, 0) | Samurai (150, 0) | Warrior (151, 1) | Prophet (158, 8) |

  Avec le départage par les armes recommandées (pipeline complet du store), Prisoner passe devant Astrologer pour `int` (Glintstone Staff recommandée, +5).
- **[déduction]** Plausibilité : Bandit pour l'Arcane, Astrologer et Prisoner pour l'Intelligence sont cohérents avec leurs attributs de départ (`origins.json`). Pour la Force, le premier rang du Samurai (STR 12) devant le Vagabond (STR 14) et le Hero (STR 16) vient du calcul de l'adéquation précoce : elle additionne les attributs de poids non nul **sans les pondérer**. La DEX, au poids 0,2, compte autant que la STR (Samurai 12 + 15 = 27 = Vagabond 14 + 13), puis le nom départage. Le wiki ne publie aucune recommandation d'origine : la plausibilité reste une déduction.
- **[data]** Avec les critères par défaut (D31 : aucun build cible), il n'y a pas de cible, donc pas de classement : l'origine « Automatique » ne retient **aucune** origine (`effectiveOrigin` = `null`). Broadsword et Halberd restent alors Non classé. `calculs.md` (« origine retenue, rang 1 en mode Automatique ») ne décrit pas ce cas.

**Propositions.**
- F8, mineur. Options : (a) garder la somme brute ; (b) **somme pondérée** `Σ poids × attribut de départ` (Vagabond 16,6 devant Samurai 15,0 pour `str`). Recommandation : (b). Texte de `calculs.md`, « Adéquation précoce » : « somme des attributs de départ pondérés par les poids du build, plus 5 si… ». Fichier : `src/engine/origins.ts` (ligne `fit += start[k]`).
- Ajouter à `calculs.md`, « Ordre d'évaluation » : « Sans build cible, aucune origine n'est classée ni retenue en mode Automatique ; les armes de départ restent Non classé. »

## 3. Étape de 30 armes

**[data]** Répartition actuelle des 487 armes (sans origine retenue) : Début 116, Milieu 170, Fin 54, Fin de jeu 24, DLC 102 (Entrée 44, Cœur 45, Enir-Ilim 8, non localisé 5), Non classé 21 (dont Broadsword et Halberd, classées Début quand leur origine est retenue). Aucune arme du jeu de base en DLC, aucune arme du DLC hors du DLC. Avec F1 corrigé : Fin 52, Fin de jeu 26, comme la simulation de `decisions-progression.md`.

| Arme | Étape calculée (règle, région) | Attendu (`decisions-progression.md`, wiki) | Verdict |
|---|---|---|---|
| Blasphemous Blade | Fin (Remembrance, Volcano Manor) | Fin | conforme |
| Maliketh's Black Blade | **Fin** (Remembrance, Mountaintops of the Giants) | Fin de jeu | **F1** |
| Dragon King's Cragblade | **Fin** (Remembrance, Mountaintops of the Giants) | Fin de jeu | **F1** |
| Starscourge Greatsword, Lion Greatbow | Milieu (Remembrance, Caelid) | Milieu | conforme |
| Axe of Godrick | Début (Remembrance, Stormveil Castle) | Début | conforme |
| Sacred Relic Sword, Axe of Godfrey | Fin de jeu (Remembrance, Leyndell, Ashen Capital) | Fin de jeu | conforme |
| Giant's Red Braid | Fin (Remembrance, Mountaintops) | Fin | conforme |
| Carian Regal Scepter | Milieu (Remembrance, Academy of Raya Lucaria) | Milieu | conforme (voir F6) |
| Great Omenkiller Cleaver | Milieu (Altus Plateau) | Milieu ; [wiki] Perfumer's Grotto (Altus Plateau) / Volcano Manor | conforme |
| Ringed Finger, Gelmir Glintstone Staff, Coil Shield, Jar Cannon, Erdtree Seal, Albinauric Staff | Milieu (Mt. Gelmir) | Milieu (option B) | conforme |
| Ghiza's Wheel, Godskin Stitcher | Fin (Volcano Manor) | Fin | conforme |
| Serpent-Hunter | Fin (Volcano Manor, repli `regions_mentioned`) | Fin ; [wiki] arène de Rykard | conforme |
| Prelate's Inferno Crozier | **Fin** (repli, Mt. Gelmir retiré comme parent de Volcano Manor) | Milieu ; [wiki] « guaranteed drop from the Fire Prelate in Fort Laiedd », Fort Laiedd = Mt. Gelmir dans `locations.json` | **F5** |
| Perfumer's Shield | **Fin** (repli, Altus Plateau retiré comme parent de Leyndell) | Milieu ; [wiki] Perfumer's Grotto (Altus Plateau) | **F5** |
| Erdsteel Dagger | **Fin** (repli, Leyndell) | Début ; [wiki] « Received from Kenneth Haight after helping him retake Fort Haight », Fort Haight = Limgrave dans `locations.json` | **F5** |
| Clinging Bone | **Début** (Roundtable Hold) | Milieu au plus tôt ; voir F3 | **F3** |
| Rogier's Rapier | Début (Roundtable Hold) | [wiki] « Given … after defeating Godrick the Grafted » | conforme |
| Battle Axe, Rapier | Début (achat Roundtable Hold) | [wiki] Twin Maiden Husks | conforme |
| Cinquedea | Fin (Bestial Sanctum → Greyoll's Dragonbarrow) | Fin (Dragonbarrow) | conforme |
| Demi-Human Queen's Staff | Début (Weeping Peninsula) | [wiki] Demi-Human Forest Ruins, Weeping Peninsula | conforme |
| Rotten Crystal Sword | Fin de jeu (Elphael) | [wiki] coffre d'Elphael | conforme |
| Messmer Soldier's Axe | DLC Entrée (Gravesite Plain) | Entrée | conforme |
| Spirit Sword | DLC Entrée (Cerulean Coast) | Entrée | conforme |
| Sword of Night | DLC Cœur (Scadu Altus) | Cœur | conforme |
| Obsidian Lamina | DLC Enir-Ilim | [wiki] après Promised Consort Radahn | conforme |
| Stone-Sheathed Sword | **DLC Cœur** (repli, Ancient Ruins of Rauh) | Entrée ; [wiki] autel de Fog Rift Catacombs, Ruins of Unte ou Ancient Ruins of Rauh | **F5** |
| Anvil Hammer | **DLC non localisé** | Entrée ; [wiki] « Ruined Forge Lava Intake », Gravesite Plain dans `locations.json` | **F5** |
| Spiraltree Seal | **DLC Entrée** (Gravesite Plain) | Enir-Ilim ; [wiki] « only acquire this item after having burned the sealing tree past the Church of the Bud » | **F5** |
| Whip, Golden Epitaph, Cross-Naginata, Celebrant's Skull | Non classé | Non classé (`decisions-progression.md` § 1.4) | conforme |
| Broadsword, Halberd | Non classé sans origine ; Début avec l'origine qui les donne | règle 7 | conforme |

**Cause de F5 (Perfumer's Shield, Prelate's Inferno Crozier) [data].** Le repli `regions_mentioned` retire les régions parentes sur toute la liste (`scripts/data/regions.ts`, `deriveRegions`), alors que ces valeurs désignent des lieux distincts. La règle D37 (« le retrait des parents ne joue qu'à l'intérieur d'un groupe ») n'est appliquée qu'aux acquisitions. Perfumer's Shield a en outre un `location` séparé par `/` sans espaces, copie fidèle du wiki (`'''Drop:''' [[Altus Plateau]]/[[Leyndell, Royal Capital]]/…`), que la préparation ne découpe pas. Cinq autres armes ont ce séparateur (Glintstone Staff, Academy Glintstone Staff, Digger's Staff, Rickety Shield, Scripture Wooden Shield) sans changement d'étape.

**Propositions.**
- Corrections de données L2 à L8 (§ 11). Option de code, à décider par le développeur : découper `location` aussi sur `/` quand chaque partie est une région connue, et ne pas retirer les parents dans le repli `regions_mentioned`. Seuls Prelate's Inferno Crozier et Serpent-Hunter changeraient d'étape, et Serpent-Hunter passerait à tort en Milieu (son texte cite Mt. Gelmir et Volcano Manor pour un seul lieu). Recommandation : les correctifs de données, plus sûrs.
- Décompte de `calculs.md` (« 464 armes sur 487 ») : écrire « 466 armes sur 487, plus Broadsword et Halberd quand leur origine est retenue (données du 31/10/2026, moteur du 05/11/2026) ».

## 4. Niveau recommandé (M3) de la frise

**[data] Constat : conforme sur les 21 nœuds.** M1, M2 et M3 calculés = table de `calculs.md` : Margit 23/18/21 · Godrick 27/24/26 · Red Wolf 35/19/27 · Rennala 35/34/35 · Radahn 48/46/47 · Rykard 60/64/62 · Mohg 127/111/119 · Draconic Tree Sentinel 52/39/46 · Fia's Champions —/34/34 · Godfrey (Golden Shade) 56/50/53 · Morgott 56/61/59 · Fire Giant 100/75/88 · **Godskin Duo 100/73/87** · Maliketh 107/83/95 · **Sir Gideon Ofnir 113/69/91** · Hoarah Loux 113/96/105 · Radagon 120/—/120 · Elden Beast 120/120/120. **DLC : 119** (max de Radahn 47 et Mohg 119) pour Messmer, Romina et Promised Consort Radahn.
- **[wiki]** Paliers T1 à T21 relus sur [Recommended Level by Location](https://eldenring.wiki.gg/wiki/Recommended_Level_by_Location) : identiques à ceux de `config/bossLevel.ts`.
- **[data]** Bénédiction par sous-zone : Entrée 4 fragments → niveau 2 (Rellana, Putrescent Knight, Dancing Lion, Bayle) · Cœur 13 → 7 (Messmer, Romina, Gaius, Metyr, Midra, Scadutree Avatar) · Enir-Ilim 17 → 9 (Promised Consort Radahn). Table des niveaux lue dans `tables.scadutreeBlessing` (13 → 7, 17 → 9, 4 → 2) : conforme.
- **[data] Écart de texte (F9).** `calculs.md` annonce des maxima « 14, 16 et 17 pour Messmer, Romina et Promised Consort Radahn ». Le moteur calcule le maximum sur le chemin de la **sous-zone** : Cœur 33 fragments → 14 pour Romina comme pour Messmer, et Entrée 10 → 5. Le moteur suit D14 (Romina reçoit la recommandation du Cœur) ; c'est le texte qui est en retard. Texte proposé : « le maximum atteignable avec tous les fragments du chemin de la sous-zone (Entrée 10 fragments, niveau 5 ; Cœur 33, niveau 14 ; Enir-Ilim 42, niveau 17) ».
- **[data] F1** touche aussi la frise : l'étape de rencontre de Godskin Duo et de Maliketh vaut Fin (`Mountaintops of the Giants`) au lieu de Fin de jeu. En mode « Boss vaincus », un joueur qui a battu le Fire Giant est donc placé en Fin, et non en Fin de jeu.

## 5. Score : recommandations par étape

Critères : D31 = contenu de base + Shadow of the Erdtree, origine Automatique, attributs à 10, pas de build (poids automatiques STR 1), mêlée, une main, charge moyenne, étape Début. Profil Dextérité / saignement : archétype `dexarc`, statut `blood_loss`, attributs du Bandit. Profil mage : archétype `int`, style « magie », attributs de l'Astrologer. Scores = adéquation + puissance + accessibilité + amélioration. Colonne DLC triée par sous-zone, comme à l'écran.

**Critères par défaut (D31)**, aucune origine retenue :
- Début : Club 78 · Iron Cleaver 77 · Battle Axe 75 · Hand Axe 75 · Highland Axe 75
- Milieu : Nox Flowing Hammer 76 · Lazuli Glintstone Sword 75 · Carian Knight's Sword 73 · Crystal Sword 72 · Ringed Finger 72
- Fin : Serpent-Hunter 72 · Cinquedea 69 · Hammer 66 · Iron Greatsword 66 · Veteran's Prosthesis 65
- Fin de jeu : Rotten Crystal Sword 64 · Beastman's Curved Sword 62 · Miquellan Knight's Sword 60 · Rotten Staff 57 · Rotten Battle Hammer 56
- DLC : Messmer Soldier's Axe 58 (Entrée) · Stone-Sheathed Sword 65, Red Bear's Claw 61 (Cœur) · Dane's Footwork 56 (Enir-Ilim) · Anvil Hammer 57 (non localisé)

**Dextérité / saignement**, origine retenue Bandit :
- Début : Reduvia 81 · Clinging Bone 77 · Great Knife 69 · Rogier's Rapier 69 · Forked Hatchet 67
- Milieu : Eleonora's Poleblade 70 · Regalia of Eochaid 70 · Bloody Helice 68 · Scorpion's Stinger 66 · Thorned Whip 66
- Fin : Rivers of Blood 67 · Morgott's Cursed Sword 64 · Envoy's Horn 57 · Magma Blade 56 · Blade of Calling 55
- Fin de jeu : Varré's Bouquet 60 · Flowing Curved Sword 50 · Miquellan Knight's Sword 49 · Hand of Malenia 48 · Mohgwyn's Sacred Spear 48
- DLC : Deadly Poison Perfume Bottle 59, Flowerstone Gavel 57, Curseblade's Cirque 55 (Entrée) · Claws of Night 57 (Cœur) · Obsidian Lamina 60 (Enir-Ilim)
- (Variante `dex` + saignement, Samurai : Rogier's Rapier, Morning Star, Uchigatana, Bloodhound's Fang, Estoc en Début ; Dragonscale Blade, Icerind Hatchet, Scorpion's Stinger, Scythe, Lucerne en Milieu.)

**Mage Intelligence**, origine retenue Prisoner :
- Début (5 visibles en tout) : Demi-Human Queen's Staff 84 · Glintstone Staff 80 · **Dragon Communion Seal 61 · Finger Seal 57 · Godslayer's Seal 52**
- Milieu : Digger's Staff 80 · Lusat's Glintstone Staff 80 · Staff of Loss 79 · Azur's Glintstone Staff 78 · Crystal Staff 78
- Fin (3 visibles) : Frenzied Flame Seal 68 · **Giant's Seal 47 · Gravel Stone Seal 45**
- Fin de jeu (1 visible) : Rotten Crystal Staff 70
- DLC : **Spiraltree Seal 37** (Entrée) · Staff of the Great Beyond 50, Maternal Staff 44, **Dryleaf Seal 37, Fire Knight's Seal 35** (Cœur)

**Plausibilité.** Pour la mêlée, l'ordre est cohérent avec les poids : armes Force en défaut, armes à saignement (Reduvia, Rivers of Blood, Eleonora's Poleblade, Bloody Helice, Varré's Bouquet, Obsidian Lamina) pour le profil Arcane. Aucune arme du DLC hors de sa colonne. Recommandations à reprendre :
1. **F2, majeur : sceaux pour un mage Intelligence.** Huit Sacred Seals sont recommandés avec une adéquation de 0 (Dragon Communion, Finger, Godslayer's, Giant's, Gravel Stone, Spiraltree, Dryleaf, Fire Knight's). [wiki] Ils ne tirent que de la Foi : par exemple [Spiraltree Seal](https://eldenring.wiki.gg/wiki/Spiraltree_Seal) a `fai_scale = C`, `int_scale = -`. Ils l'emportent pourtant par la puissance, l'accessibilité et l'amélioration (jusqu'à 61/100). Cause : le style « magie » prend Staves **et** Sacred Seals quel que soit le build (`config/weaponPools.ts`), et aucune règle n'écarte une adéquation nulle. Options : (a) candidats « magie » selon les poids : Staves si INT a un poids non nul, Sacred Seals si FAI en a un, les deux sinon ; (b) écarter des colonnes toute arme dont la moyenne de scaling pondérée vaut 0 quand un build est défini ; (c) ne rien changer. Recommandation : (a), plus (b) comme garde-fou pour la mêlée. Texte de `calculs.md`, « Candidats selon le style de jeu » : « magie → Staves si le build a un poids en Intelligence, Sacred Seals s'il en a un en Foi, les deux sinon ».
2. **F3, majeur : Clinging Bone en Début** (2e du profil Arcane). [wiki] [Ensha of the Royal Remains](https://eldenring.wiki.gg/wiki/Ensha_of_the_Royal_Remains) : « After retrieving the Haligtree Secret Medallion (Right) from Old Albus in the Village of the Albinaurics, or the Haligtree Secret Medallion (Left) from Castle Sol, Ensha will invade the player. Upon death, he drops the Clinging Bone ». [data] Village of the Albinaurics est en Liurnia (Milieu). L'acquisition de `data/` (« Guaranteed Drop @ Roundtable Hold ») est exacte : c'est la condition de quête qui manque. Options : (a) **surcharge d'étape en configuration** (`weapon:clinging-bone` → Milieu, avec la source wiki) ; (b) correctif de données qui mettrait `region = "Liurnia of the Lakes"`, ce qui serait faux sur le lieu. Recommandation : (a), par exemple une table `STAGE_OVERRIDES` dans `config/stages.ts`, décrite dans `calculs.md`.
3. **Spiraltree Seal** (Entrée) : il n'est obtenable qu'après avoir brûlé l'arbre-sceau, donc à l'accès d'Enir-Ilim (citation au § 3). Même traitement que F3 : surcharge de sous-zone → Enir-Ilim.
4. Points à signaler sans correction proposée : Lusat's Glintstone Staff recommandé en Milieu avec 38 points d'Intelligence manquants, à cause du plafond de pénalité (9 points de score, `ACCESS_WEIGHTS.missingPointsCap`), un choix du prototype ; les colonnes Fin et Fin de jeu du mage n'ont que 3 et 1 armes visibles, conformément aux données ; Reduvia n'a pas la pénalité « PNJ envahisseur », parce que Bloody Finger Nerijus n'est pas une rencontre de `bosses.json` (limite connue de `invaderDrop`).

## 6. Puissance d'attaque estimée

**Constats sur les exemples : conformes.** Club +0, STR 9, une main → 61 (pénalité) ; à deux mains (effective 13) → 103, bonus non calculable (Club : lettre C sans coefficient). Les 7 cas Longsword donnent 141, 380, 453, 236, 135, 66 et 130. **[wiki]** [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) : « the Club has 103 base Physical Attack Power … A character with only 9 Strength would have 61 Physical Attack Power (103 - 42) ».

**Courbe : ce que dit le wiki.**
- **[wiki]** [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling), section « Stat Scaling » : « This value increases as the associated stat increases, varying somewhat depending on if the used **affinity** is physical (Standard, Heavy, Keen, Quality, or Occult) or non-physical (Fire, Flame Art, Lightning, Sacred, Magic, Cold, Blood, or Poison) ». Suivent les deux séries de valeurs, dont « Non-physical affinity values » : 10 → 19, 20 → 40, 30 → 53, 40 → 66,5, 50 → 80, 60 → 85, 70 → 90, 80 → 95, 90 → 97,5, 99 → 100.
- **[wiki]** Le choix de la courbe est rattaché à **l'affinité de l'arme** (« the used affinity »), pas au type de dégâts. Aucune page ne distingue la courbe des dégâts physiques et celle des dégâts élémentaires d'une même arme. Lues : Weapon Scaling, Affinities, les 11 pages `Affinity/…`, Holy, Strength, Dexterity, Stats and Attributes, plus les recherches « non-physical affinity scaling » et « physical affinity ». La seule lecture que le wiki permet est donc : arme d'affinité Fire, Flame Art, Lightning, Sacred, Magic, Cold, Blood ou Poison → courbe « non physique », **pour tous ses types de dégâts, physique compris**.
- **[wiki]** Le classement est un peu inattendu : Occult est « physique », Blood et Poison « non physiques », alors que les trois pages d'affinité les décrivent comme « Physical-focused » et appliquent l'Arcane à l'attaque physique. Le texte proposé suit le wiki tel quel.
- **[wiki]** Autre écart avec le point 4 de `calculs.md` (attributs pris en compte par type). La page [Holy](https://eldenring.wiki.gg/wiki/Holy) dit des Erdsteel Daggers : « their Faith scaling applying to both the Holy damage and the Physical damage (also applies to the Flame Art Affinity) ». Pour Sacred et Flame Art, la Foi agit donc aussi sur le physique, au moins pour cette arme. La règle générale n'est pas publiée.
- **[déduction]** Les armes uniques n'ont pas d'affinité ; le moteur les traite en Standard. Le wiki ne dit pas quelle courbe elles suivent : la courbe « physique » reste un choix [conception].

**Texte corrigé proposé pour `calculs.md`, point 6 :**
> 6. **Courbe**, choisie selon l'affinité de l'arme (page Weapon Scaling) [wiki] : famille **physique** pour Standard, Heavy, Keen, Quality et Occult, interpolation linéaire entre (10 ; 15), (20 ; 35), (30 ; 46,5), (40 ; 57,5), (50 ; 67,5), (60 ; 75), (70 ; 82,5), (80 ; 90), (90 ; 92,5), (99 ; 96) ; famille **non physique** pour Fire, Flame Art, Lightning, Sacred, Magic, Cold, Blood et Poison, entre (10 ; 19), (20 ; 40), (30 ; 53), (40 ; 66,5), (50 ; 80), (60 ; 85), (70 ; 90), (80 ; 95), (90 ; 97,5), (99 ; 100). La courbe de l'affinité s'applique à **tous** les types de dégâts de l'arme, physique compris : le wiki ne distingue pas les types. Armes uniques (sans affinité) : famille physique [conception]. Sous 10 : non documenté ; [conception] interpoler entre (1 ; 0) et le premier point de la famille, et le signaler. Limite affichée : « courbe générique de l'affinité ; le wiki ne publie pas de courbe par type de dégâts ».

Et au point 4, ajouter : « [wiki] Pour Sacred et Flame Art, la page Holy indique que la Foi s'applique aussi au physique (exemple : Erdsteel Dagger) ; sans règle générale publiée, ce bonus n'est pas calculé et la limite « scaling non documenté » est affichée. »

**Configuration** (`src/engine/config/attackPower.ts`) : remplacer `curve` par deux familles, `curves: { physical: [...], nonPhysical: [...] }`, et ajouter `nonPhysicalAffinities: ['Fire', 'Flame Art', 'Lightning', 'Sacred', 'Magic', 'Cold', 'Blood', 'Poison']`. Les tests Longsword en Standard ne changent pas. Effet sur un cas : Longsword +25 Blood, attributs à 40, aujourd'hui 470 avec la courbe physique (57,5 à 40 points), plus élevé avec 66,5 ; les valeurs exactes restent non vérifiables.

## 7. Coût en FP des sorts : « 22 (4) »

- **[wiki]** [Rock Blaster](https://eldenring.wiki.gg/wiki/Rock_Blaster) : `fp_cost = 22 (4)` ; texte : « Costs 22 FP per cast. Costs 4 FP per tick when channeling. » La notation est **« coût par lancement (coût par tick quand le sort est maintenu) »**. Même lecture sur Crystal Barrage 14 (2), Comet Azur 40 (10), Meteorite 30 (10), Meteorite of Astel 60 (12), Dragonfire, Glintstone Breath 28 (4), Ekzykes's Decay 48 (6), Dragonice 36 (4), Ghostflame Breath 36 (6), Surge, O Flame! 1 (1), Thops's Barrier 7 (0). Variantes : Unendurable Frenzy 22 (6), « 6 FP … per bolt » ; Midra's Flame of Frenzy 22 (5), où le texte précise que le coût réel est de 35 FP par seconde.
- **Conclusion : 22 est la bonne valeur à classer** (coût d'un lancement). La facette « premier nombre de `fp_cost` » est juste ; son libellé pourrait dire « Coût en PF par lancement ».
- **[wiki] Exception, Gelmir's Fury** : l'infobox dit `27 (32)`, le texte dit « Costs 16 FP per cast … 3 FP per tick when channeling », et la note de patch « reduced from 32 to 28 ». La page se contredit : la tranche 20–29 attribuée par la facette n'est pas vérifiable (voir Non vérifiable).

## 8. Carian Regal Scepter

- **[data]** `ranged_weapons_catalysts.json`, Carian Regal Scepter : `acquisition[0].method = "Purchase"`, `acquisition_flags = ["remembrance_weapon", "purchasable"]`, `derived.methods = ["purchase"]` ; le détail dit « Trade the Remembrance of the Full Moon Queen … with Finger Reader Enia ». Seule arme de Remembrance sur 28 marquée achetable.
- **[wiki]** [Carian Regal Scepter](https://eldenring.wiki.gg/wiki/Carian_Regal_Scepter) : l'intertitre de l'acquisition est « '''Purchase:''' [[Roundtable Hold]] », suivi du texte d'échange. Les autres armes de Remembrance ont « '''Trade:''' [[Roundtable Hold]] » (Blasphemous Blade, Maliketh's Black Blade, Dragon King's Cragblade). L'extraction a recopié une erreur de saisie du wiki.
- **Effet** : aucun sur l'étape (règle Remembrance) ni sur le score, qui ne lit pas `purchasable` ; le catalogue affiche la méthode « Achat ». Correctif L9 (§ 11), gravité mineure. Le wiki pourrait aussi être corrigé à la source.

## 9. Rendement des attributs

| Statistique | Paliers déduits (moteur) | Paliers du wiki | Verdict |
|---|---|---|---|
| PV (Vigor) | 40, 60 | « two soft cap points, 40 and 60 » | conforme |
| FP (Mind) | 60 | « a soft cap of 50 and 60 for increasing FP » | **50 manquant** |
| Endurance (Stamina) | 30, 50 | « three soft cap points … at 15, 30 and 50 » | **15 manquant** |
| Charge (Equip Load) | 25, 60 | « soft caps at 25 and 60 Endurance » | conforme |

- **[data]** Ce qui manque est faible dans les tables : FP, gain moyen 6,4 avant 50 puis 5,6 après (rapport 0,875) ; endurance, 1,8 puis 1,6 autour de 15. Le seuil `ATTRIBUTE_YIELD.dropRatio = 0,75` les écarte.
- **Options (F7, mineur)** : (a) garder la détection et ajouter au « Pourquoi ? » la liste du wiki ; (b) **afficher les paliers publiés par le wiki** ([wiki], en configuration, avec URL) et garder les gains de la table comme illustration ; (c) relâcher le seuil à 0,9, ce qui ferait apparaître des paliers que le wiki ne cite pas. Recommandation : (b). Les paliers sont publiés, donc ce sont des faits, et les déduire contredit le wiki sur deux points. Texte de `calculs.md`, « Rendement des attributs » : « Paliers où le gain baisse : ceux publiés par le wiki (PV 40 et 60 ; FP 50 et 60 ; endurance 15, 30 et 50 ; charge 25 et 60), en configuration ; la déduction par les tables sert de contrôle. »

## 10. Plan d'amélioration et Bell Bearings

- **[wiki]** Paliers débloqués, lus dans la description de chaque Bell Bearing : Smithing-Stone Miner's [1] Smithing Stone [1]–[2] · [2] [3]–[4] · [3] [5]–[6] · [4] [7]–[8] ; Somberstone Miner's [1] [1]–[2] · [2] [3]–[4] · [3] [5]–[6] · [4] [7]–[8] · [5] [9]. Conforme à `config/upgrade.ts`. [Smithing Stones](https://eldenring.wiki.gg/wiki/Smithing_Stones) : 2, 4 puis 6 pierres par palier, une Ancient Dragon pour +25, les pierres anciennes non achetables : conforme.
- **[data]** Plans : Longsword +0 → +3 = 12 × [1] ; +5 → +10 = 6 × [2], 12 × [3], 2 × [4] ; +0 → +25 = 96 pierres + 1 Ancient Dragon ; Blasphemous Blade +0 → +10 = une Somber [1] à [9] + 1 Somber Ancient Dragon. Conforme.
- Étape des Bell Bearings (`bellBearingStages`), comparée au lieu du wiki :

| Bell Bearing | Étape calculée | Lieu du wiki | Verdict |
|---|---|---|---|
| Smithing-Stone Miner's [1] | Milieu | Raya Lucaria Crystal Tunnel, Liurnia | conforme (`regions_mentioned` cite à tort Academy of Raya Lucaria, sans effet) |
| Smithing-Stone Miner's [2] | Milieu | Sealed Tunnel, Capital Outskirts | conforme |
| Smithing-Stone Miner's [3] | Fin | Zamor Ruins, Mountaintops | conforme |
| Smithing-Stone Miner's [4] | Fin de jeu | butin de Godskin Duo, Crumbling Farum Azula | conforme |
| Somberstone Miner's [1] | Milieu | Fallingstar Beast, Sellia Crystal Tunnel, Caelid | conforme |
| Somberstone Miner's [2] | Milieu | Altus Tunnel, Altus Plateau | conforme |
| Somberstone Miner's [3] | Fin | First Church of Marika, Mountaintops | conforme |
| Somberstone Miner's [4] | Fin de jeu | Tempest-Facing Balcony, Crumbling Farum Azula | conforme |
| Somberstone Miner's [5] | **aucune** | après le site de grâce Dragon Temple Rooftop ; [data] site de grâce de Crumbling Farum Azula (`locations.json`) | **F5**, correctif L8 |

- **[data] Écart de texte (F9).** Les cas de test « Club (`material` null, estimation normale…) = plan +25 avec badge Estimation » de `calculs.md` sont périmés : un correctif de `data/CHANGELOG.md` a donné au Club `material = "Smithing Stones"` (fiabilité `wiki`). Il reste 4 estimations : Reverse-Bladed Sword et Reed Great Katana (normales, confiance moyenne), Leontiel's Greatsword et Golden Order Flail (sombres, confiance haute) ; et 2 armes sans type : Silver Grooved Shield, Ritual Thrusting Shield. Texte proposé : « Reverse-Bladed Sword (estimation normale, confiance moyenne) = plan +25 avec badge Estimation · Silver Grooved Shield (`material` null sans estimation) = « Non documenté » ». Même correction pour l'exemple Club cité au point 4 du score.

## 11. Correctifs proposés

### Données (à appliquer seulement sur décision, et à consigner dans `data/CHANGELOG.md`)

| # | Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur | URL |
|---|---|---|---|---|---|---|
| L1 | `locations.json` | `Crumbling Farum Azula` | `region` | `"Accessed via Mountaintops of the Giants"` | `"Mountaintops of the Giants"` | https://eldenring.wiki.gg/wiki/Crumbling_Farum_Azula (« accessed from the Mountaintops of the Giants after burning the Erdtree » ; l'infobox `region=Accessed via [[Mountaintops of the Giants]]` est une formule, pas une région). Ensuite : `REGION_PARENT` de `config/stages.ts` suit (`'Crumbling Farum Azula': 'Mountaintops of the Giants'`), et la clé `'Accessed via Mountaintops of the Giants'` de `REGION_STAGE` peut rester. |
| L2 | `shields_torches.json` | `Perfumer's Shield` | `acquisition[0].location` | `"Altus Plateau/Leyndell, Royal Capital/Scadu Altus/Shadow Keep"` | `"Altus Plateau / Leyndell, Royal Capital / Scadu Altus / Shadow Keep"` | https://eldenring.wiki.gg/wiki/Perfumer%27s_Shield |
| L3 | `melee_armaments.json` | `Prelate's Inferno Crozier` | `acquisition[0].method` / `.location` | `null` / `null` | `"Guaranteed drop"` / `"Fort Laiedd"` | https://eldenring.wiki.gg/wiki/Prelate%27s_Inferno_Crozier (« one-time guaranteed drop from the Fire Prelate in Fort Laiedd ») |
| L4 | `melee_armaments.json` | `Erdsteel Dagger` | `acquisition[0].location` | `null` | `"Fort Haight / Leyndell, Royal Capital"` | https://eldenring.wiki.gg/wiki/Erdsteel_Dagger |
| L5 | `melee_armaments.json` | `Stone-Sheathed Sword` | `acquisition[0].location` | `null` | `"Fog Rift Catacombs / Ruins of Unte / Ancient Ruins of Rauh"` | https://eldenring.wiki.gg/wiki/Stone-Sheathed_Sword |
| L6 | `melee_armaments.json` | `Anvil Hammer` | `acquisition[0].location` | `null` | `"Ruined Forge Lava Intake"` | https://eldenring.wiki.gg/wiki/Anvil_Hammer (« can be found and obtained at Ruined Forge Lava Intake ») |
| L7 | `ranged_weapons_catalysts.json` | `Spiraltree Seal` | aucun | — | aucun correctif de données : condition de quête, voir surcharge S2 | https://eldenring.wiki.gg/wiki/Spiraltree_Seal |
| L8 | `key_items.json` | `Somberstone Miner's Bell Bearing [5]` | `acquisition[0].location` | `null` | `"Crumbling Farum Azula"` [déduction : Dragon Temple Rooftop et Beside the Great Bridge sont des sites de grâce de Crumbling Farum Azula dans `locations.json`] | https://eldenring.wiki.gg/wiki/Somberstone_Miner%27s_Bell_Bearing_5 |
| L9 | `ranged_weapons_catalysts.json` | `Carian Regal Scepter` | `acquisition[0].method` / `acquisition_flags` | `"Purchase"` / `["remembrance_weapon", "purchasable"]` | `"Trade"` / `["remembrance_weapon"]` | https://eldenring.wiki.gg/wiki/Carian_Regal_Scepter (texte d'échange ; intertitre « Purchase » erroné sur le wiki) |

Effets attendus après préparation : Perfumer's Shield, Prelate's Inferno Crozier → Milieu ; Erdsteel Dagger → Début ; Stone-Sheathed Sword, Anvil Hammer → DLC Entrée ; Somberstone Miner's Bell Bearing [5] → Fin de jeu ; Maliketh's Black Blade, Dragon King's Cragblade, Black Blade, Placidusax's Ruin et les rencontres de Farum Azula (Godskin Duo, Maliketh, Placidusax, Draconic Tree Sentinel de Farum Azula, Ancient Dragon) → Fin de jeu. Simulé pour L1 : Fin 52 armes, Fin de jeu 26.

### Configuration (décision du chef de projet, code par le développeur)

| # | Fichier | Valeur | Raison |
|---|---|---|---|
| S1 | `config/stages.ts` (table de surcharge à créer) | `weapon:clinging-bone` → `mid` | F3, page Ensha of the Royal Remains |
| S2 | idem | `weapon:spiraltree-seal` → `dlc`, sous-zone `enir-ilim` | page Spiraltree Seal |
| S3 | `config/weaponPools.ts` | candidats « magie » selon les poids INT / FAI | F2 |
| S4 | `config/attackPower.ts` | deux courbes et liste `nonPhysicalAffinities` | F4, § 6 |
| S5 | `config/weights.ts` ou nouvelle entrée | paliers publiés : PV 40, 60 ; FP 50, 60 ; endurance 15, 30, 50 ; charge 25, 60 | F7, § 9 |
| S6 | `origins.ts` | adéquation précoce pondérée par les poids | F8, § 2 |

Alternative à L1, sans toucher `data/` : ajouter `'Accessed via Mountaintops of the Giants': 'Mountaintops of the Giants'` à `REGION_PARENT`. Le test qui compare chaque lien à `locations.json` devra admettre ce lien, et la préparation des données (qui lit `locations.json`) ne sera pas corrigée.

## Non vérifiable

- **Courbe par type de dégâts** : le wiki ne publie que deux familles génériques par affinité. Que le physique d'une arme Fire suive vraiment la courbe « non physique » est la seule lecture du texte, mais aucune valeur publiée ne la confirme. Courbe des armes uniques : non documentée.
- **Foi et physique pour Sacred et Flame Art** : documenté pour l'Erdsteel Dagger seulement (page Holy).
- **Coût en FP de Gelmir's Fury** : infobox 27 (32), texte 16 / 3, patch 32 → 28.
- **Plausibilité du classement des origines** : le wiki ne recommande aucune origine par build.
- **Plafond de 713 niveaux** : le wiki donne la table jusqu'à 713 sans dire que c'est le maximum (déjà signalé dans `calculs.md`).
- **Niveau recommandé par boss et bénédiction recommandée hors Messmer** : toujours aucune valeur publiée ; seules les ancres de `decisions-progression.md` § 4.1 existent.
