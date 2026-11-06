# Vérification du contenu et des calculs, premier tour de la boucle (v1)

> Rapport du référent contenu, 06/11/2026, pour le chef de projet. Rien n'est décidé ici : chaque constat porte une gravité proposée et une correction à arbitrer.
> Application : branche `dev` au commit `a2d12c4`. Données préparées : `public/data/` (manifeste `dataVersion` 3480ca2403b6c0e6, extraction du 31/10/2026), régénérées par `node scripts/prepare-data.ts`.
> Méthode : les **vrais stores** (`analysis`, `criteria`, `data`) montés sous Vitest sur les fichiers préparés (`.cache/verif/contenu-v1/harness.ts`, scripts `a_reco` à `e_dlc`, sorties `*.txt` et `*.json` du même dossier). Captures : `.cache/e2e/screens/` (fiches arme, armure, boss, origine).
> Wiki : API d'eldenring.wiki.gg, 4 lots (50 + 18 + 1 + 2 pages) et 7 recherches, téléchargés dans `.cache/wiki/contenu-v1/`. Aucune page « Nightreign: ».
> Points de `verification-socle.md` non refaits, sauf régression. Aucune régression constatée.

Étiquettes : **[wiki]** fait lu dans le wikitext · **[data]** fait lu dans `data/` ou `public/data/` · **[déduction]** · **[conception]** choix du projet.

## Synthèse

| # | Constat | Gravité proposée | Correction proposée |
|---|---|---|---|
| V1 | Des armes d'adéquation nulle (0 à 2 sur 25) entrent dans les colonnes d'un build défini : Winged Scythe (Foi) pour un build Intelligence, Rotten Crystal Sword (Intelligence) et Miquellan Knight's Sword (Foi) pour un build Dextérité / Arcane. Elles faussent aussi les priorités de montée de niveau. | majeur | règle d'exclusion en configuration (§ 3.2) |
| V2 | Des bâtons à INT 48–52 (Lusat's, Azur's, Crystal Staff, Rotten Crystal Staff) sont recommandés à un mage à INT 16, alors que le wiki réduit leur puissance de sort tant que le prérequis manque | majeur | puissance du score réduite de 40 % quand un prérequis manque, ou plafond de pénalité relevé (§ 3.3) |
| V3 | « Dragonbarrow » (sans « Greyoll's ») n'a pas de région parente : Clawmark Seal et Spiked Caestus tombent en Milieu, au lieu de Fin comme Cinquedea, au même lieu | mineur | `REGION_PARENT` : `Dragonbarrow` → `Caelid` (§ 2.1) |
| V4 | Albinauric Staff, Erdtree Seal et Gelmir Glintstone Staff sont dans Volcano Manor d'après le wiki, mais classés en Milieu (lieu `Mt. Gelmir`), alors que les autres objets du manoir sont en Fin | mineur | correctif de données D-V4, ou statu quo (§ 2.1) |
| V5 | 49 types d'amélioration marqués « déduits » sont confirmés par la liste « Armaments by Bolstering Material » du wiki : la fiche affiche à tort « déduit, non lu sur le wiki » | mineur | correctif de données D-V5 |
| V6 | Nanaya's Torch : la page de l'arme donne folie 65, la page Madness 55 | mineur | garder 65, signaler l'incohérence (§ 4.1) |
| V7 | Vocabulaire incohérent : résistances en français dans les catalogues (Immunité…) mais en anglais sur les fiches (Immunity…) ; « FP » et « PF » ; « Endurance » désigne à la fois l'attribut et la jauge ; emplacement « Head » sur la fiche, « Tête » dans le catalogue | mineur | § 4.3 |
| V8 | Catalogue : une arme sans compétence (`skill.type = "No skill"`, 62 armes) affiche « Non documenté » | mineur | afficher « Aucune » (§ 4.3) |
| V9 | Libellé « Version altérée : Yes » ambigu : le champ dit qu'une version altérée existe, et 4 armures ont deux fiches au même nom | mineur | § 4.3 |
| V10 | Exemple fictif des priorités de montée de niveau dans `calculs.md` | mineur | cas réel du Vagabond (§ 4.2) |
| V11 | Quatre résumés de méthode de `explainText.ts` sont incomplets (étape, prérequis, niveau de boss, prérequis non atteint) | mineur | textes au § 5 |
| V12 | Classement des origines, build Intelligence : Prisoner passe devant Astrologer par le bonus +5 de son Glintstone Staff, alors que l'Astrologer part aussi avec un bâton | mineur | option au § 3.4 |

Conformes : les valeurs de 30 entités contre le wiki, l'étiquette DLC de chaque entité sondée, les 21 niveaux recommandés et les bénédictions de la frise, les trois classements d'origine, les deux jeux de priorités, le rendement des attributs et ses paliers, les plans d'amélioration et le coût en runes, et les 11 exemples de puissance d'attaque.

---

## 1. Valeurs affichées contre `data/` et le wiki

### 1.1 Sondage de 30 entités : conforme

Comparaison champ à champ du wikitext (infobox, tableaux) avec `data/` ; lecture des captures pour Dagger, Commoner's Headband, Abductor Virgin et Vagabond.

| Famille | Entités (source) | Champs comparés | Verdict |
|---|---|---|---|
| Armes (22) | Uchigatana, Rivers of Blood, Lusat's Glintstone Staff, Azur's Glintstone Staff, Staff of Loss, Crystal Staff, Prince of Death's Staff, Albinauric Staff, Gelmir Glintstone Staff, Astrologer's Staff, Glintstone Staff, Dragon Communion Seal, Erdtree Seal, Gravel Stone Seal, Clawmark Seal, Golden Order Seal, Frenzied Flame Seal, Brass Shield, Chainlink Flail, Lazuli Glintstone Sword, Hookclaws, Winged Scythe, Serpent-Hunter, Iron Cleaver, Reduvia, Vyke's War Spear, Rotten Crystal Sword, Miquellan Knight's Sword, Spiked Caestus (base) · Sword of Night, Bonny Butchering Knife, Nanaya's Torch, Red Bear's Claw, Velvet Sword of St. Trina, Messmer Soldier's Axe, Anvil Hammer (Shadow of the Erdtree) | attaque à +0 (6 types et critique), lettres de scaling, prérequis, puissance de sort, poids, accumulation de statut, type d'amélioration | conforme (Nanaya's Torch : V6 ; type d'amélioration : V5) |
| Boss (5) | Margit, the Fell Omen ; Rennala, Queen of the Full Moon ; Malenia, Blade of Miquella (base) · Messmer the Impaler ; Rellana, Twin Moon Knight (Shadow of the Erdtree) | PV, runes, absorption (8 types), résistances aux statuts | conforme. Rellana et Messmer : pas d'absorption sur le wiki, « Non documenté » à l'écran |
| Armures (4) | Bull-Goat Helm, Raging Wolf Armor, Raging Wolf Armor (Altered) (base) · Messmer Soldier Armor (Shadow of the Erdtree) | poids, 8 absorptions, 4 résistances, équilibre | conforme. Altered : poids et absorption physique « ? » sur le wiki, `null` dans `data/` |
| Sorts (3) | Comet Azur, Swarm of Flies (base) · Fleeting Microcosm (Shadow of the Erdtree) | coût en FP, endurance, emplacements, prérequis, vendeur | conforme |
| Talismans (3) | Erdtree's Favor, Shard of Alexander (base) · Two-Headed Turtle Talisman (Shadow of the Erdtree) | effet, poids | conforme |
| Objets (3) | Golden Seed, Rune Arc (base) · Scadutree Fragment (Shadow of the Erdtree) | effet, prix, table des fioles, table de bénédiction | conforme |
| PNJ (3) | Merchant Kalé, Twin Maiden Husks (base) · Moore (Shadow of the Erdtree) | boutique : objet, prix, stock (18, 32 et 17 lignes) | conforme. Kalé : page transcluse « Merchant & Instructor Inventories » |
| Origines (3) | Vagabond, Astrologer (base) · Heavy Knight (Tarnished Pack) | niveau, 8 attributs, PV, FP, endurance, charge, défenses, absorptions, résistances, équipement de départ | conforme ; charge du Heavy Knight 59,3 (correctif P1, D8) |

URL : `https://eldenring.wiki.gg/wiki/<titre>` pour chaque entité ; boutique de Kalé : https://eldenring.wiki.gg/wiki/Merchant_%26_Instructor_Inventories.

- **[data] Fiche Vagabond (capture)** : niveau 9, PV 522, FP 78, endurance 97, charge 49,8, découverte 107, équilibre 46, défenses et absorptions, résistances 92 / 81 / 173… Identique à l'infobox de [Vagabond](https://eldenring.wiki.gg/wiki/Vagabond).
- **[data] Fiche Dagger (capture)** : attaque 74, critique 130, scaling D / C, prérequis 5 / 9, coût jusqu'au maximum « 96 pierres et 1 pierre ancienne » : conformes.

### 1.2 Étiquettes DLC : conformes

- **[data]** Sur les 30 entités sondées, l'étiquette `source` correspond à la page. Six pages de base citent le DLC dans une liste (Comet Azur, Dragon Communion Seal…) : faux positifs du contrôle automatique.
- **[data]** Dans tous les fichiers, aucune entité `Base game` ne cite seulement des régions du DLC (sauf Starlight Shards, objet de base qu'on trouve aussi dans le DLC). Les entités `Shadow of the Erdtree` qui ne citent que Roundtable Hold sont des échanges de Remembrance ou des achats chez Enia : l'étiquette est juste. Tarnished Pack : 6 armes, 2 boucliers, 2 origines, toutes masquées par défaut (D31).

### 1.3 Type d'amélioration et fiabilité (V5, mineur)

- **[data]** 51 armes ont `upgrade.material_info_source = "deduced (wiki shows the weapon accepts Ashes of War/affinities; somber weapons cannot)"` ; la fiche affiche la limite `upgrade-type-deduced` (« déduit d'une règle du wiki, et non lu sur la page de l'arme »).
- **[wiki]** [Armaments by Bolstering Material](https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material) liste **49 de ces 51 armes avec le même matériau** (Smithing Stone), sans aucun désaccord. Les deux absentes sont Idus Sword et Hefty Scimitar (Tarnished Pack).
- Correctif D-V5 (§ 6) : elles passent en fiabilité `wiki`, comme les 303 armes comblées en D29. Effet : la couverture affiche 478 types documentés au lieu de 429, et la limite « déduit » disparaît des fiches concernées (Uchigatana, Rapier, Greatsword…).

---

## 2. Calculs par sondage

### 2.1 Étape de 33 armes

Les étapes viennent du getter `stageOf` (`b_stages.json`). Répartition des 487 armes : Début 116 · Milieu 173 · Fin 49 · Fin de jeu 26 · DLC 102 (Entrée 45, Cœur 44, Enir-Ilim 9, non localisé 4) · Non classé 21. Le décompte « 466 sur 487 » de `calculs.md` est exact.

| Arme | Étape (règle, région) | Lieu du wiki | Verdict |
|---|---|---|---|
| Clinging Bone | Milieu (surcharge) | invasion d'Ensha après le médaillon d'Albus | conforme (S1) |
| Spiraltree Seal | DLC Enir-Ilim (surcharge) | après l'arbre-sceau | conforme (S2) |
| Sword of Night, Maternal Staff | DLC Cœur (Cathedral of Manus Metyr → Scadu Altus) | idem | conforme |
| Staff of the Great Beyond | DLC Cœur (Remembrance, Metyr) | échange | conforme |
| Red Bear's Claw | DLC Cœur | Northern Nameless Mausoleum, « accessed through Rauh Base » | conforme |
| Obsidian Lamina, Thiollier's Hidden Needle | DLC Enir-Ilim | idem | conforme |
| Star-Lined Sword, Velvet Sword of St. Trina | DLC Entrée (Cerulean Coast) | idem | conforme |
| Death Knight's Twin Axes | DLC Entrée (Fog Rift Catacombs) | idem | conforme |
| Azur's Glintstone Staff | Milieu (Liurnia) | [wiki] Church of the Cuckoo, toits de l'Academy of Raya Lucaria | conforme |
| Lusat's Glintstone Staff, Staff of Loss | Milieu (Caelid) | [wiki] Sellia, Town of Sorcery | conforme |
| Crystal Staff | Milieu (Liurnia) | [wiki] Academy Crystal Cave | conforme |
| Prince of Death's Staff | Milieu (Deeproot Depths) | idem | conforme |
| Golden Order Seal | Milieu (Capital Outskirts) | Minor Erdtree Church | conforme |
| Lazuli Glintstone Sword | Milieu (repli, Academy) | [wiki] sorciers de l'Academy of Raya Lucaria | conforme |
| Dragon Communion Seal | Début (repli, Limgrave) | [wiki] Fringefolk Hero's Grave, Limgrave | conforme |
| Chainlink Flail | Début (Limgrave) | [wiki] Mad Pumpkin Head devant Fort Haight | conforme |
| Hookclaws | Début (repli, Stormveil Castle) | [wiki] près de Stormveil Cliffside | conforme |
| Winged Scythe | Début (repli, Weeping Peninsula) | [wiki] Tombsward Ruins | conforme |
| Iron Cleaver | Début (Weeping Peninsula) | Morne Tunnel & Castle Morne | conforme |
| Gravel Stone Seal | Fin (Leyndell) | idem | conforme |
| Serpent-Hunter | Fin (Volcano Manor) | arène de Rykard | conforme |
| Rotten Crystal Sword, Miquellan Knight's Sword | Fin de jeu (Elphael) | idem | conforme |
| **Clawmark Seal** | **Milieu** (`Dragonbarrow` + `Caelid`, étape la plus précoce) | [wiki] « Quest Reward: Dragonbarrow (Caelid) », Bestial Sanctum | **V3** : Fin attendue |
| **Spiked Caestus** | **Milieu** (`Isolated Merchant's Shack (Dragonbarrow)` + `Caelid`) | [wiki] Isolated Merchant (Dragonbarrow) | **V3** : Fin attendue |
| Cinquedea (témoin) | Fin (Bestial Sanctum → Greyoll's Dragonbarrow) | Bestial Sanctum | conforme |
| **Albinauric Staff, Erdtree Seal, Gelmir Glintstone Staff** | **Milieu** (`Mt. Gelmir`) | [wiki] « third floor of the same building as the Guest Hall … in Volcano Manor » ; « open cell just northwest of the Prison Town Church … in Volcano Manor » ; « near the throne in Volcano Manor » | **V4** |

**V3 (mineur), cause [data].** `Dragonbarrow` est dans `REGION_STAGE` (Fin) mais absent de `locations.json` (seul `Greyoll's Dragonbarrow` y figure), donc de `REGION_PARENT`. `Caelid` n'est pas retiré comme parent, et l'étape la plus précoce, Milieu, l'emporte. Deux objets sont concernés (Beast-Repellent Torch, qui n'a que `Dragonbarrow`, est bien en Fin). `calculs.md` annonce « Dragonbarrow (`Greyoll's Dragonbarrow` compris) » en Fin.
- Options : (a) **`REGION_PARENT` de `src/engine/config/stages.ts` : ajouter `Dragonbarrow: 'Caelid'`**, avec une exception admise par le test qui compare les liens à `locations.json` ; (b) alias à la préparation (`scripts/data/knownRegions.ts`) : `Dragonbarrow` → `Greyoll's Dragonbarrow` ; (c) statu quo. Recommandation : (a), plus simple, sans toucher `data/`.

**V4 (mineur).** [wiki] [Volcano Manor](https://eldenring.wiki.gg/wiki/Volcano_Manor) : Rya peut téléporter le joueur dans le manoir depuis l'Altus Plateau. Le manoir est donc accessible en Milieu ; mais D10 le place en Fin (palier T13) et les autres objets du manoir (Ghiza's Wheel, Godskin Stitcher, Serpent-Hunter…) y sont. Les trois objets ne sont en Milieu que parce que l'infobox du wiki donne la région `Mt. Gelmir`.
- Options : (a) **correctif de données D-V4** : `acquisition[0].location` passe à `"Volcano Manor"`. Les trois objets rejoignent la Fin, comme le reste du manoir (le texte du wiki le justifie) ; (b) statu quo, en écrivant dans `calculs.md` que la région de l'infobox prévaut sur le texte ; (c) repasser tout Volcano Manor en Milieu, ce qui reviendrait sur D10. Recommandation : (a), par cohérence avec D10. Note : la liste de l'option B (`decisions-progression.md` § 1.5) comptait ces trois objets parmi ceux qui passent en Milieu ; elle se fondait sur le champ région, pas sur le texte.

### 2.2 Niveau recommandé et bénédiction de la frise : conforme

**[data]** Les 18 nœuds de l'histoire donnent exactement les M1, M2 et M3 de `calculs.md` : Margit 21, Godrick 26, Red Wolf 27, Rennala 35, Radahn 47, Rykard 62, Mohg 119, Draconic Tree Sentinel 46, Fia's Champions 34, Godfrey (Golden Shade) 53, Morgott 59, Fire Giant 88, Godskin Duo 87, Maliketh 95, Sir Gideon Ofnir 91, Hoarah Loux 105, Radagon 120, Elden Beast 120. L'étape de rencontre de Godskin Duo et de Maliketh vaut bien Fin de jeu (L1 appliqué). Voie DLC : niveau 119 ; Messmer et Romina, Cœur, 13 fragments, bénédiction 7, maximum 14 ; Promised Consort Radahn, Enir-Ilim, 17 fragments, bénédiction 9, maximum 17. Prochain boss avec les critères par défaut : Margit.

### 2.3 Classement des origines (trois builds, niveau 150) : conforme

Niveaux finaux recalculés à la main depuis `origins.json` :

| Build | 1 | 2 | 3 |
|---|---|---|---|
| Force `str` | Vagabond (150, adéquation 16,6) | Samurai (150 ; 15) | Warrior (151) |
| Dextérité / Arcane `dexarc` | Bandit (150 ; 27) | Samurai (150 ; 23) | Warrior (151 ; 25) |
| Intelligence `int`, style magie | Prisoner (153 ; 16,8 + 5 Glintstone Staff = 21,8) | Astrologer (153 ; 18,4) | Samurai (153) |

Le cas Vagabond 16,6 / Samurai 15 de `calculs.md` est reproduit. En style mêlée, l'Astrologer repasse premier. Voir V12 au § 3.4.

### 2.4 Priorités de montée de niveau (deux profils) : conforme à D42

- **Force** (Vagabond, `str` 150, Début) : STR 14 → 15 (prérequis d'Iron Cleaver) ; VIG 15 → 40 (palier) ; END 11 → 31 (écart 20 × 0,5) ; MND 10 → 15 (5 × 0,5). En Milieu : STR → 17 (Nox Flowing Hammer), puis la même suite.
- **Dextérité / saignement** (attributs du Samurai, `dexarc` 150, Début, origine retenue Bandit) : ARC 8 → 13 (Reduvia) ; VIG 12 → 40 ; DEX 15 → 50 (35 × 1) ; END 13 → 25 (12 × 0,5).
- Un défaut hérité de V1 : pour un mage Intelligence en mêlée, la première priorité est DEX 12 → 17 pour Rogier's Rapier, une arme d'adéquation 5 sur 25.

### 2.5 Rendement des attributs : conforme

**[data]** Les paliers sont ceux du wiki, avec leurs gains moyens : PV 40 (46,8 → 26,2) et 60 (17,2 → 6) ; FP 50 (6,4 → 5,6, l'exemple de `calculs.md`) et 60 (4,4 → 2,4) ; endurance 15 (1,8 → 1,6), 30 (1,8 → 1,2) et 50 (1,4 → 0,2) ; charge 25 (1,58 → 1,12) et 60 (1,5 → 1,02). Statistiques de VIG 40, MND 50 et END 15 : 1 450 PV, 300 FP, 105 d'endurance, 56,1 de charge.

### 2.6 Plans d'amélioration et Bell Bearings : conformes

**[data]** Uchigatana de +3 à +12 : 12 × [2], 12 × [3], 12 × [4], soit 36 pierres, avec les Bell Bearings Smithing-Stone Miner's [1] (paliers 1–2) et [2] (3–4). Longsword +0 → +25 : 96 pierres et 1 Ancient Dragon. Blasphemous Blade, Rivers of Blood, Sword of Night et Serpent-Hunter de +0 à +10 : une Somber [1] à [9] et 1 Somber Ancient Dragon. Messmer Soldier's Axe (DLC) : plan normal jusqu'à +25. Reverse-Bladed Sword : plan +25 avec Estimation (confiance moyenne). Silver Grooved Shield : « Non documenté ». Étapes des neuf Bell Bearings : identiques au tableau de `verification-socle.md` § 10, et Somberstone [5] est maintenant en Fin de jeu (L8 appliqué).

### 2.7 Coût en runes : conforme

**[data]** coût(1) = 673 ; coût(150) = 153 680 ; total de 9 à 40 = 134 856 ; total de 1 à 150 = 7 112 459 (getter `runeCostsBetween`).

### 2.8 Puissance d'attaque estimée : conforme

**[data]** Résultats du getter `weaponCalcs` : Club +0, STR 9, une main → 61 (pénalité) ; à deux mains → 103 (« bonus non calculable »). Pour la Longsword, les 8 cas du tableau : 141, 380, 453, 236 (interpolé), 135, 66, 130, et 197 en Cold (115 + 82, courbe non physique). **[wiki]** [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) : « A character with only 9 Strength would have 61 Physical Attack Power (103 - 42) ».

---

## 3. Recommandations : plausibilité

Profils simulés (`a_reco.txt`) :
- critères par défaut (D31) ;
- Force : Vagabond, `str` 150, Début puis Milieu ;
- Dextérité / saignement : attributs du Samurai, `dexarc`, statut saignement ;
- Intelligence : Astrologer, `int`, en style magie puis en mêlée ;
- Foi (témoin) : `fai`, style magie.

### 3.1 Ce qui est sensé

- **Par défaut** (poids automatiques STR 1) : Club, Iron Cleaver, Battle Axe, Hand Axe, Highland Axe en Début ; Nox Flowing Hammer, Stone Club, Ringed Finger en Milieu. Ce sont des armes de Force accessibles, sans arme du DLC hors de sa colonne.
- **Force** : Iron Cleaver, Chainlink Flail, Banished Knight's Halberd, Battle Axe, Club ; Iron Greatsword et Veteran's Prosthesis en Fin ; Bonny Butchering Knife et Red Bear's Claw dans le DLC.
- **Saignement** : Reduvia, Hookclaws, Eleonora's Poleblade, Bloody Helice, Rivers of Blood, Morgott's Cursed Sword, Varré's Bouquet, Obsidian Lamina. **[wiki]** Les accumulations de saignement de Reduvia (50), Rivers of Blood (50) et Hookclaws (60) sont vérifiées. Clinging Bone est maintenant en Milieu (S1).
- **Intelligence, style magie** : uniquement des Staves (S3 appliqué), dont Demi-Human Queen's Staff et Glintstone Staff en Début. La colonne Fin est vide : **[data]** aucun bâton n'a de lieu en Fin. C'est fidèle aux données, et l'élargissement est proposé.
- **Foi** : uniquement des Sacred Seals ; la colonne Fin de jeu est vide pour la même raison.

### 3.2 V1, majeur : adéquation nulle recommandée

| Profil | Colonne | Arme | Adéquation | Fait du wiki |
|---|---|---|---|---|
| Intelligence, mêlée | Début, 3e | Winged Scythe (58/100) | 0 | [wiki] [Winged Scythe](https://eldenring.wiki.gg/wiki/Winged_Scythe) : `fai_scale = D`, `fai_req = 24`, `int_scale` vide, dégâts sacrés 104 |
| Dextérité / Arcane | Fin de jeu, 5e | Rotten Crystal Sword (49) | 0 | [wiki] [Rotten Crystal Sword](https://eldenring.wiki.gg/wiki/Rotten_Crystal_Sword) : `int_scale = D`, `dex_scale = E`, `arc_scale = -` |
| Dextérité / Arcane | Fin de jeu, 3e | Miquellan Knight's Sword (50) | 2 | [wiki] [Miquellan Knight's Sword](https://eldenring.wiki.gg/wiki/Miquellan_Knight%27s_Sword) : `fai_req = 16`, `arc_scale = -` |
| Intelligence, mêlée | Début, 1re | Rogier's Rapier (59) | 5 | sans scaling d'Intelligence ; devient la cible des priorités (DEX 17) |

- **Cause [data].** L'adéquation n'est qu'une composante sur quatre, chacune sur 25. Une arme d'adéquation nulle peut dépasser une arme adaptée grâce à sa puissance, son accessibilité et son amélioration. Par exemple, pour le build Dextérité / Arcane, Hand of Malenia et Mohgwyn's Sacred Spear sortent du top 5 de Fin de jeu, battues par Rotten Crystal Sword. Le garde-fou proposé dans `verification-socle.md` § 5 (option b) n'a pas été retenu par D39.
- Options :
  - (a) **quand un build cible est défini, écarter des colonnes toute arme dont la moyenne pondérée des lettres vaut 0** (composante 1 avant bonus) ; elle reste visible grisée en plein écran, avec une nouvelle raison « hors build » comptée dans les élargissements ;
  - (b) un seuil, par exemple une moyenne inférieure à 0,25 (lettre E) ;
  - (c) un score multiplicatif ;
  - (d) statu quo.
- Recommandation : (a). Réglage proposé : `SCORE_FILTERS.minFitMean = 0` (exclusif) dans `src/engine/config/weights.ts`. Texte de `calculs.md`, « Filtres appliqués avant le score », à ajouter : « Quand un build cible est défini, une arme dont la moyenne pondérée des lettres de scaling vaut 0 (aucun attribut du build ne la fait progresser) est écartée des colonnes (raison « hors build ») [conception]. » Effet attendu : la colonne Début du mage en mêlée n'a plus d'arme à Intelligence et propose l'élargissement, ce qui est le comportement honnête.

### 3.3 V2, majeur : bâtons très au-dessus du profil

- **[data]** Mage Intelligence (INT 16), colonne Milieu : Lusat's Glintstone Staff 80 (2e ; INT 52, 38 points manquants), Azur's Glintstone Staff 78 (4e ; INT 52), Crystal Staff 78 (5e ; INT 48). En Fin de jeu : Rotten Crystal Staff (INT 48), seule arme. Ces bâtons ont la meilleure puissance de sort à +0 (Lusat's 161, Azur's 151 ; plafond 162). L'accessibilité ne perd que 9 points au plus (`ACCESS_WEIGHTS.missingPointsCap`).
- **[wiki]** [Sorcery Scaling](https://eldenring.wiki.gg/wiki/Sorcery_Scaling) : « The Tarnished must meet the required attribute stats to wield the weapon, or the Sorcery Scaling will be reduced ». [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) : si un prérequis manque, « anything that scales with that attribute receives no scaling, and instead takes a -40% penalty ». [Lusat's Glintstone Staff](https://eldenring.wiki.gg/wiki/Lusat%27s_Glintstone_Staff) : « 284 Sorcery Scaling at 52 Intelligence (minimum requirement) ». Le score crédite donc ces bâtons d'une puissance que le profil n'a pas.
- Options :
  - (a) **composante « Puissance » : la puissance de base (ou de sort) est multipliée par 0,6 quand un prérequis de l'arme n'est pas atteint par le profil**, règle du wiki déjà appliquée par la méthode de puissance d'attaque (point 5) ;
  - (b) relever le plafond `missingPointsCap` (9 → 15, par exemple) ;
  - (c) statu quo, avec une limite affichée.
- Recommandation : (a), fondée sur un fait du wiki et valable pour toutes les armes. Texte de `calculs.md`, composante 2, à ajouter : « Si un prérequis de l'arme n'est pas atteint par le profil (« Prérequis comparés au profil »), la puissance retenue est multipliée par 0,6 [wiki : Weapon Scaling, −40 %] ; la lettre de scaling n'est pas modifiée. » Réglage proposé : `POWER.unmetRequirementFactor = 0.6` dans `config/weights.ts`.

### 3.4 Points mineurs

- **V12, origines.** Pour `int` en style magie, Prisoner devance Astrologer grâce au bonus +5 de son Glintstone Staff, présent dans la colonne Début. Or **[wiki]** [Astrologer's Staff](https://eldenring.wiki.gg/wiki/Astrologer%27s_Staff) est l'équipement de départ de l'Astrologer : l'arme n'est recommandée nulle part, parce que sans origine retenue son seul lieu est l'achat en Liurnia (Milieu). Le bonus dépend donc du hasard des colonnes. Options : (a) statu quo, le wiki ne recommandant aucune origine ; (b) évaluer le bonus de chaque origine avec ses propres armes de départ classées en Début. Recommandation : (a) pour la v1, avec (b) à reprendre plus tard ; plausibilité non vérifiable (aucune recommandation d'origine sur le wiki).
- **Serpent-Hunter**, 1re de la colonne Fin par défaut et pour la Force. **[wiki]** [Serpent-Hunter](https://eldenring.wiki.gg/wiki/Serpent-Hunter) : « no stat requirements » et « only Strength builds can make any good use of it », mais ses rayons ne fonctionnent que contre Rykard et le God-Devouring Serpent. La recommandation est défendable : aucune correction proposée.
- Anvil Hammer (STR 39, FAI 20) en DLC Entrée par défaut : l'accessibilité vaut 0 et l'arme reste 3e de la colonne. C'est cohérent avec le niveau d'entrée du DLC (119) : pas de correction.

---

## 4. Points en attente

### 4.1 Nanaya's Torch (V6, mineur)

- **[wiki]** [Nanaya's Torch](https://eldenring.wiki.gg/wiki/Nanaya%27s_Torch), infobox : `effects = Causes [[madness]] buildup (65)`. La page n'a ni tableau d'amélioration ni note qui donne un autre chiffre.
- **[wiki]** [Madness](https://eldenring.wiki.gg/wiki/Madness), onglet « Weapons » : « Nanaya's Torch {{SOTE}} || +55 Madness ». La même liste donne Vyke's War Spear +65, Frenzied Flame Seal +55, Madding Hand +55 et Frenzyflame Perfume Bottle +60. Pour Vyke's War Spear et Frenzied Flame Seal, `data/` et leurs pages concordent (65 et 55).
- **[data]** `shields_torches.json`, Nanaya's Torch : `status_buildup.madness = 65`, `passive_effects = ["Causes madness buildup (65)"]`, conformes à la page de l'arme.
- Options :
  - (a) **garder 65** (règle de D44 pour Reduvia : la page de l'arme prévaut sur la liste du statut) et consigner l'incohérence dans les métadonnées ;
  - (b) passer à 55, ce qui contredirait la page de l'arme ;
  - (c) `null`, pour signaler une valeur contestée.
- Recommandation : (a). Correctif D-V6 (§ 6) : métadonnées seulement, aucune valeur changée. Non vérifiable : laquelle des deux pages est juste en jeu.

### 4.2 Exemple des priorités de montée de niveau (V10, mineur)

Cas réel vérifié par le store (§ 2.4) ; il remplace le cas de test de `calculs.md`, section « Priorités de montée de niveau » :

> - Cas de test : profil Vagabond (VIG 15, MND 10, END 11, STR 14, DEX 13 ; `origins.json`), build `str` au niveau 150 (cible VIG 60, MND 15, END 31, STR 80, DEX 16), étape Début, critères par défaut sinon. Meilleure arme recommandée de la colonne : Iron Cleaver (prérequis STR 15, DEX 7 ; `melee_armaments.json`, [wiki](https://eldenring.wiki.gg/wiki/Iron_Cleaver)) → STR 15 (prérequis) ; VIG 40 (palier) ; STR déjà retenue, puis END 31 (écart 20 × 0,5 = 10), MND 15 (écart 5 × 0,5 = 2,5) ; DEX (écart 3 × 0,2 = 0,6) n'entre pas, la liste étant pleine. À l'étape Milieu, la meilleure arme devient Nox Flowing Hammer (STR 17) : STR 17, puis la même suite.

Réserve : l'arme retenue dépend des pondérations du score. Si V1 ou V2 sont appliqués, il faudra recalculer ce cas (Iron Cleaver ne devrait pas changer : adéquation 25, prérequis presque atteints).

### 4.3 Libellés (V7 à V9, mineur)

Le wiki ne donne aucune traduction officielle : aucune n'est proposée ici comme officielle. Les constats portent sur la cohérence de l'application avec elle-même.

| Sujet | Constat [data, code, captures] | Proposition |
|---|---|---|
| Résistances d'armure | Catalogue des armures : « Immunité, Robustesse, Concentration, Vitalité » (`catalogModel.ts`, `RESISTANCES`). Fiches armure et origine : « Immunity, Robustness, Focus, Vitality » (`armorModel.ts`, `originModel.ts`). Le même concept porte deux noms. | Un seul jeu. Option A : l'anglais du wiki partout, comme les attributs (« Strength », « Vigor » sur les fiches). Option B : le français partout, avec le nom anglais en info-bulle. Recommandation : A, cohérent avec la règle « les noms du jeu restent en anglais » et avec les attributs. « Concentration » pour Focus était le libellé le moins évident. Les sous-titres de la fiche (Poison et pourriture écarlate ; saignement et givre ; folie et sommeil ; mort) sont justes et à garder. |
| FP / PF | « Coût en PF » : catalogues des sorts, cendres et esprits ; compétence de la fiche arme ; colonne « PF » des origines. « Coût en FP », « FP » : fiches sort, cendre, objet et origine ; widget de rendement ; textes du « Pourquoi ? ». | Choisir un sigle. Recommandation : FP, plus fréquent dans l'application et identique au wiki (« FP »). |
| Endurance | La fiche origine affiche « Endurance 97 » (la jauge, `stamina`) à côté de l'attribut « END Endurance 11 ». | Libellé « Endurance (jauge) » partout où il s'agit de `stamina`, comme dans `explainText.ts` (composante `stamina`), ou « Stamina ». |
| Emplacement d'armure | Catalogue : « Tête, Torse, Bras, Jambes » ; fiche : « Head » (fil d'Ariane et Caractéristiques). | Même libellé des deux côtés (`SLOT_LABELS`). |
| Types de compétence | Fiche : « Compétence unique », « Cendre de guerre », « Compétence standard » (`weaponModel.ts`). Catalogue : « compétence unique », « compétence standard » en minuscules (`catalogModel.ts`). « Cendre de guerre » désigne l'objet ; pour la compétence d'une arme, `Ash of War skill` veut dire « compétence de cendre, remplaçable ». « Compétence standard » (9 armes, `Standard skill (no Ash of War item)`) se confond avec « compétence de cendre ». | « Cendre de guerre » → « Compétence de cendre de guerre » ; « Compétence standard » → « Compétence sans cendre de guerre » ; même casse partout. |
| V8 : aucune compétence | 62 armes ont `skill = { name: null, type: "No skill" }` (Astrologer's Staff, Blue-White Wooden Shield…). La cellule du catalogue affiche « Non documenté » (`CatalogCell.vue`, `skill.name === null`) : or le wiki documente l'absence de compétence. | Afficher « Aucune » quand `type = "No skill"`. Un `null` reste « Non documenté ». |
| V9 : « Version altérée : Yes » | Le champ `altered_version` / infobox `altered` vaut « Yes » sur la pièce normale **et** sur sa version altérée ([Raging Wolf Armor](https://eldenring.wiki.gg/wiki/Raging_Wolf_Armor), [Raging Wolf Armor (Altered)](https://eldenring.wiki.gg/wiki/Raging_Wolf_Armor_(Altered))). Quatre armures ont deux entrées au même nom (Raging Wolf Armor, Elden Lord Armor, War Surgeon Gown, Spellblade's Traveling Attire), indiscernables dans le catalogue et la recherche. | Libellé « Version altérée existante : oui » ; afficher le titre de page du wiki (`wiki_page`, qui porte « (Altered) ») quand deux entrées ont le même nom. |

---

## 5. Textes d'explication (`src/ui/explainText.ts`)

Relecture de toutes les phrases contre `calculs.md`. Elles sont exactes, avec quatre résumés à compléter (V11, mineur). Les quatre textes proposés sont appliqués depuis D48 ; le texte de `requirement-not-met` rappelle en plus la tolérance du score (voir la ligne ajoutée sous le tableau).

| Clé | Texte d'origine | Écart | Texte appliqué |
|---|---|---|---|
| `METHOD_SUMMARIES.stage` | « L'étape d'une arme est celle de son lieu d'obtention le plus précoce, parmi les cinq étapes de la partie » | omet la surcharge (règle 0) et la Remembrance (règle 1), qui passent avant les lieux | « L'étape d'une arme est celle de son lieu d'obtention le plus précoce, sauf condition d'obtention documentée ou échange de Remembrance (étape du boss), parmi les cinq étapes de la partie » |
| `METHOD_SUMMARIES.requirements` | « …la Force comptant 1,5 fois à deux mains » | omet l'arrondi inférieur et les armes sans posture à deux mains | « …la Force effective valant Force × 1,5 arrondie à l'inférieur à deux mains, sauf pour les armes sans posture à deux mains » |
| `METHOD_SUMMARIES['boss-level']` | « …la moyenne du palier de zone du wiki et du niveau que représentent les runes du boss » | M1 est le niveau associé au palier, pas le palier ; les boss du DLC reçoivent le niveau d'entrée du DLC | « …la moyenne du niveau associé au palier de zone du wiki et du niveau que représentent les runes du boss ; pour un boss du DLC, le niveau d'entrée du DLC » |
| `LIMIT_TEXTS['requirement-not-met']` | « …les dégâts X sont réduits et sans bonus de scaling » | ne chiffre pas la réduction | « …les dégâts X sont réduits de 40 % et sans bonus de scaling, dès un point manquant. Le score de recommandation, lui, ne réduit la puissance qu'au-delà de 5 points manquants. » |

Textes ajoutés avec D48, pour les règles K-V1 et K-V2 :

| Clé | Texte appliqué |
|---|---|
| `LIMIT_TEXTS['weapon-hidden-off-build']` | « L'adéquation de cette arme à votre build cible est inférieure à 5 sur 25 avant arrondi : elle ne figure pas dans les recommandations. » (le seuil vient de `SCORE_FILTERS.minFitComponent`) |
| `COMPONENT_SPECS['unmet-requirement-factor']` | « Puissance retenue, × 0,6 : prérequis non atteints (INT), total manquant 36 ; réduction de 40 % seulement au-delà de 5 points manquants » (× 1 dans la tolérance) |

Vérifiés sans écart : `widget-how-upgrade-plan` (2, 4 puis 6 pierres par palier ; une pierre sombre par niveau), `widget-how-optimal-origin`, `widget-how-boss-order` (Limite à 8 niveaux), `curve-below-10` (corrigé depuis 4.6b), `curve-non-physical`, `two-hand-*`, `soft-caps-published`, `priorities-*`, `dlc-entry-level-used`, `tier-missing`, `runes-excluded`, `hp-not-used`, et les résumés `optimal-origin`, `readiness`, `rune-cost`, `upgrade-plan`, `derived-stats`, `attack-power`, `level`, `level-up-priorities`, `attribute-yield`.

---

## 6. Correctifs proposés

### Données (à appliquer seulement sur décision, à consigner dans `data/CHANGELOG.md`)

| # | Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur | URL |
|---|---|---|---|---|---|---|
| D-V4 | `ranged_weapons_catalysts.json` | Albinauric Staff | `acquisition[0].location` | `"Mt. Gelmir"` | `"Volcano Manor"` | https://eldenring.wiki.gg/wiki/Albinauric_Staff (« located in Volcano Manor ») |
| D-V4 | `ranged_weapons_catalysts.json` | Erdtree Seal | `acquisition[0].location` | `"Mt. Gelmir"` | `"Volcano Manor"` | https://eldenring.wiki.gg/wiki/Erdtree_Seal (« Prison Town Church Site of Grace, located in Volcano Manor ») |
| D-V4 | `ranged_weapons_catalysts.json` | Gelmir Glintstone Staff | `acquisition[0].location` | `"Mt. Gelmir"` | `"Volcano Manor"` | https://eldenring.wiki.gg/wiki/Gelmir_Glintstone_Staff (« near the throne in Volcano Manor ») |
| D-V5 | `melee_armaments.json` (45), `ranged_weapons_catalysts.json` (3), `shields_torches.json` (1) | les 49 armes listées ci-dessous | `upgrade.material_info_source` | `"deduced (wiki shows the weapon accepts Ashes of War/affinities; somber weapons cannot)"` | `"wiki (Armaments by Bolstering Material)"` (`material` inchangé : Smithing Stones) | https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material |
| D-V6 | `shields_torches.json` | métadonnées | `metadata.field_notes.status_buildup` (ou une clé `status_inconsistencies_flagged`) | — | « Nanaya's Torch: weapon page 65 (kept), Madness page list +55 » | https://eldenring.wiki.gg/wiki/Nanaya%27s_Torch · https://eldenring.wiki.gg/wiki/Madness |

Armes de D-V5 :
- **Mêlée (45)** : Milady, Iron Greatsword, Knight's Greatsword, Banished Knight's Greatsword, Forked Greatsword, Lizard Greatsword, Flamberge, Gargoyle's Greatsword, Zweihander, Greatsword, Watchdog's Greatsword, Troll's Golden Sword, Rapier, Queelign's Greatsword, Bandit's Curved Sword, Shotel, Scavenger's Curved Sword, Dismounter, Monk's Flameblade, Beastman's Cleaver, Backhand Blade, Uchigatana, Twinblade, Black Steel Twinblade, Godskin Peeler, Gargoyle's Twinblade, Hand Axe, Forked Hatchet, Warped Axe, Great Omenkiller Cleaver, Curved Club, Stone Club, Warpick, Hammer, Chainlink Flail, Black Steel Greathammer, Lance, Messmer Soldier's Spear, Urumi, Katar, Pata, Firespark Perfume Bottle, Lightning Perfume Bottle, Chilling Perfume Bottle, Frenzyflame Perfume Bottle.
- **À distance (3)** : Albinauric Bow, Greatbow, Igon's Greatbow.
- **Bouclier (1)** : Fingerprint Stone Shield.
- **Restent déduites** : Idus Sword et Hefty Scimitar (Tarnished Pack), absentes de la liste.

### Configuration (décision du chef de projet, code par `dev-logique`)

| # | Fichier | Valeur | Raison |
|---|---|---|---|
| K-V3 | `src/engine/config/stages.ts`, `REGION_PARENT` | `Dragonbarrow: 'Caelid'` (exception au test de concordance avec `locations.json`) | V3 |
| K-V1 | `src/engine/config/weights.ts` et `score.ts` | exclusion des colonnes si la moyenne pondérée des lettres vaut 0 avec un build cible ; nouvelle raison de masquage « hors build » | V1 |
| K-V2 | `src/engine/config/weights.ts` et `score.ts` | `unmetRequirementFactor = 0.6` sur la puissance de la composante 2 | V2 |

### Textes

- `calculs.md` : cas de test des priorités (§ 4.2) ; filtre « hors build » (§ 3.2) ; facteur 0,6 de la composante 2 (§ 3.3) ; si D-V4 est rejeté, préciser que la région de l'infobox prévaut sur le texte.
- `explainText.ts` : les quatre textes du § 5.
- Interface (`dev-interface`) : les libellés du § 4.3.

## Non vérifiable

- **Nanaya's Torch** : laquelle des pages (65 ou 55) dit juste en jeu.
- **Plausibilité des classements d'origines et des recommandations** : le wiki ne recommande ni origine ni arme par build. Les constats V1 et V2 s'appuient sur des faits (lettres de scaling, pénalité de prérequis), pas sur une recommandation du wiki.
- **Traduction française officielle** des résistances, des types de compétence et des statistiques : le wiki n'en publie pas.
- **Accessibilité réelle de Volcano Manor** avant Leyndell : le wiki documente la téléportation de Rya depuis l'Altus Plateau, mais aucun palier propre aux salles du manoir.
- Le reste est déjà listé dans `verification-socle.md` : courbes par type de dégâts, Gelmir's Fury, plafond de 713 niveaux, niveaux recommandés par boss.
