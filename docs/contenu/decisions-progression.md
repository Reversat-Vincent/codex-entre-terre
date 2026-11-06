# Décisions de contenu : étapes de progression, frise des boss, niveau recommandé

> Préparé par le référent contenu le 2026-11-01 pour le chef de projet. Rien n'est décidé ici : chaque section donne des options et une recommandation.
> Données : `data/*.json` extraites le 31/10/2026. Wiki : API d'eldenring.wiki.gg, interrogée le 01/11/2026 (accès vérifié : l'API répond).

**Conventions.** Chaque affirmation porte une étiquette :
- **[Wiki]** : fait lu dans le wikitext obtenu par l'API, avec l'URL ;
- **[Data]** : fait lu dans `data/`, avec le fichier et le champ ;
- **[Déduction]** : conséquence logique de faits sourcés ;
- **[Estimation]** : valeur calculée par l'application, jamais présentée comme un fait ;
- **[Choix]** : choix de conception (pondération, seuil, ancre), à arbitrer.

Abréviations : « T*n* » = palier *n* du tableau « Enemy "Leveling" System » de la page [Recommended Level by Location](https://eldenring.wiki.gg/wiki/Recommended_Level_by_Location) ; « guide étape *n* » = section « Step *n* » de la page [Elden Ring Guide](https://eldenring.wiki.gg/wiki/Elden_Ring_Guide).

---

## 0. Synthèse

| # | Décision | Options | Recommandation |
|---|---|---|---|
| 1a | Table région → étape | table de `calculs.md` (11 valeurs) · table complète (79 valeurs, § 1.3) | Table complète, avec la cascade de résolution du § 1.4 : 464 armes sur 487 reçoivent une étape, contre 192 au plus avec `acquisition[].region` seul |
| 1b | Mt. Gelmir | Fin (`calculs.md`) · Milieu, Volcano Manor en Fin · Milieu, Volcano Manor compris | **Milieu, Volcano Manor en Fin** : 16 armes passent de Fin à Milieu, Blasphemous Blade reste en Fin |
| 1c | DLC | une étape · trois étapes (Entrée, Cœur, Enir-Ilim) | **Une étape DLC**, la zone DLC servant de clé de tri secondaire |
| 2 | Rattachement Remembrance | lien porté par l'objet · lien porté par la Remembrance | Lien porté par l'objet, contrôlé par la Remembrance : 52 objets sur 52 reliés, 25 Remembrances sur 25 reliées à un boss |
| 3 | Frise | ordre du brief · ordre du wiki | Ils concordent pour les nœuds 1 à 11. Il faut compléter les prérequis (§ 3.2) et traiter Messmer et Romina sans ordre imposé entre eux |
| 4a | Niveau recommandé | M1 paliers · M2 runes · M3 hybride | **M3** (moyenne de M1 et M2), les PV restant affichés sans entrer dans le calcul |
| 4b | Niveau des boss du DLC | niveau d'entrée du DLC · M2 par boss | **Niveau d'entrée du DLC** (119 avec M3) |
| 4c | Bénédiction recommandée | B1 maximum du chemin · B2 ancre Messmer | **B2** : Messmer 7, Romina 8, Promised Consort Radahn 9 |
| 5 | Données de la frise | — | Matrice des faiblesses possible pour 11 nœuds sur 21. Correctifs proposés pour Sir Gideon Ofnir, Godskin Duo, Draconic Tree Sentinel, Elden Beast et Radagon (§ 6) |

---

## 1. Table région → étape

### 1.1 Constats

- **[Data]** `acquisition[].region` vaut `null` dans 2 167 acquisitions sur 2 592, tous fichiers d'objets confondus, et dans 335 acquisitions sur 536 pour les trois fichiers d'armes. Seules 192 armes sur 487 ont au moins une région d'acquisition renseignée : 135 armes de mêlée sur 335, 21 armes à distance sur 63, 36 boucliers sur 89. La règle de `calculs.md`, qui ne lit que `acquisition[].region`, laisserait donc plus de la moitié des armes sans étape.
- **[Data]** L'information manquante se trouve ailleurs : dans `acquisition[].location` (un lieu de `locations.json`, un nom de PNJ de `npcs.json` ou une liste séparée par ` / `), puis dans `regions_mentioned`.
- **[Data]** 79 valeurs distinctes de région ou de lieu de rang région apparaissent dans `acquisition[].region`, `regions_mentioned`, `bosses.json` `encounters[].regions`, `locations.json` `region` et dans les noms des entrées `locations.json` de type `Region`, `Subregion` et `Legacy Dungeon`. Le § 1.3 les rattache toutes à une étape.
- **[Data]** Hiérarchie de `locations.json` : 12 entrées de type `Region` (8 du jeu de base, 4 du DLC). Weeping Peninsula et Stormhill y sont des sous-régions de Limgrave, Mt. Gelmir et Capital Outskirts de l'Altus Plateau, Consecrated Snowfield, Flame Peak et Forbidden Lands des Mountaintops of the Giants, Mohgwyn Palace et Nokron de la Siofra River.
- **[Data] Défaut d'extraction.** `regions_mentioned` contient `Altus Plateau` à tort dans 107 entrées réparties sur 11 fichiers : le texte d'acquisition ne dit que « Scadu Altus » (liste en annexe A, correctif C6). La plupart sont des objets du DLC, dont 23 armes.

### 1.2 Repères du wiki

- **[Wiki]** [Recommended Level by Location](https://eldenring.wiki.gg/wiki/Recommended_Level_by_Location) (révision du 2025-07-02), tableau « Enemy "Leveling" System » : « Each enemy … has a base HP and damage that is slightly multiplied depending on the location they are ». Paliers : T1 Stranded Graveyard · T2 Limgrave (Middle) · T3 Limgrave (South) · T4 Limgrave (North) · T5 Stormveil · T6 Siofra River · T7 Liurnia (South) · T8 Liurnia (North) · T9 Mt. Gelmir (Lower Region) & Ainsel River · T10 Mt. Gelmir (Upper Region) & Caelid (West) · T11 Altus Plateau & Caelid (South) · T12 Leyndell & Nokstella · T13 Volcano Manor & Caelid (North) · T14 Leyndell Sewers · T15 Mountaintops of the Giants & Farum Azula · T16 Farum Azula (Late Farum Azula) · T17 Leyndell, Ashen Capital & Consecrated Snowfield · T18 Elden Throne · T19 Haligtree & Mohgwyn Palace · T20 Elphael · T21 Haligtree (Roots). Le tableau ne donne aucun palier pour le DLC, Weeping Peninsula, Raya Lucaria, Deeproot Depths, Lake of Rot, Capital Outskirts ni Forbidden Lands.
- **[Wiki]** [Elden Ring Guide](https://eldenring.wiki.gg/wiki/Elden_Ring_Guide) (révision du 2026-09-24) : soluce complète en 24 étapes, alors que `data/README.md` ne connaissait que le Walkthrough, inachevé. Ordre : 1 Chapel of Anticipation · 2 Limgrave · 3 Stormhill · 4 Weeping Peninsula · 5 Stormveil Castle · 6 Liurnia · 7 Academy of Raya Lucaria · 8 Caria Manor · 9 Siofra River · 10 Caelid · 11 Altus Plateau · 12 Nokron · 13 Deeproot Depths · 14 Ainsel River · 15 Dragonbarrow · 16 Mt. Gelmir · 17 Leyndell, Royal Capital · 18 Forbidden Lands · 19 Mountaintops of the Giants · 20 Consecrated Snowfield · 21 Mohgwyn Palace · 22 Miquella's Haligtree · 23 Crumbling Farum Azula · 24 End. Les étapes 22 à 24 n'ont qu'un titre, sans contenu.

### 1.3 Table complète proposée

Colonnes : nombre d'occurrences dans `acquisition[].region` (acq), `regions_mentioned` (rm, faux positifs `Altus Plateau` compris), `bosses.json` `encounters[].regions` (boss), `locations.json` `region` (loc.region) et noms d'entrées `locations.json` de type région, sous-région ou donjon principal (loc.nom). La colonne Base cite le palier wiki (T*n*), la position dans le guide ou la région parente de `locations.json`. Le rattachement à une étape reste un **[Choix]** : il s'appuie sur ces repères sans être un fait du wiki.

| Valeur exacte | acq | rm | boss | loc.region | loc.nom | Étape (option A) | Zone DLC (option B) | Base |
|---|---|---|---|---|---|---|---|---|
| `Castle Morne` |  |  |  |  | 1 | Début |  | sous-région de Limgrave, guide étape 4 |
| `Limgrave` | 46 | 182 | 48 | 43 | 1 | Début |  | T2-4 |
| `Roundtable Hold` |  | 182 |  |  | 1 | Début |  | hub (guide étape 5) ; Remembrances traitées à part |
| `Stormhill` |  | 31 | 5 |  | 1 | Début |  | sous-région de Limgrave ; T4 si Stormhill = « Limgrave (North) » (déduction) ; guide étape 3 |
| `Stormveil Castle` |  | 68 | 7 |  | 1 | Début |  | T5 |
| `Weeping Peninsula` | 21 | 94 | 18 | 12 | 1 | Début |  | sous-région de Limgrave, guide étape 4 |
| `Weeping Peninsula (Limgrave)` |  |  |  | 1 |  | Début |  | sous-région de Limgrave, guide étape 4 |
| `Academy of Raya Lucaria` |  | 87 | 8 |  | 1 | Milieu |  | T7-8 / région parente |
| `Ainsel River` | 3 | 26 | 6 | 5 | 1 | Milieu |  | T9 / région parente |
| `Ainsel River Main` |  |  | 8 | 1 | 1 | Milieu |  | T9 / région parente |
| `Altus Plateau` | 32 | 324 | 62 | 27 | 1 | Milieu |  | T11 / région parente |
| `Bellum Highway` |  |  |  |  | 1 | Milieu |  | T7-8 / région parente |
| `Caelid` | 27 | 158 | 36 | 30 | 1 | Milieu |  | T10-11 / région parente |
| `Capital Outskirts` | 1 | 44 | 12 | 7 | 1 | Milieu |  | T11 / région parente |
| `Deeproot Depths` | 1 | 28 | 9 | 3 | 1 | Milieu |  | sans palier ; guide étape 13 |
| `Grand Lift of Dectus` |  |  |  |  | 1 | Milieu |  | T7-8 / région parente |
| `Lake of Rot` | 1 | 14 | 3 |  | 1 | Milieu |  | T9 / région parente |
| `Liurnia of the Lakes` | 54 | 291 | 56 | 56 | 1 | Milieu |  | T7-8 / région parente |
| `Moonlight Altar` |  |  |  |  | 1 | Milieu |  | T7-8 / région parente |
| `Mt. Gelmir` | 19 | 103 | 27 | 12 | 1 | Milieu |  | T9-10 |
| `Nokron, Eternal City` |  | 25 | 7 | 2 | 1 | Milieu |  | T6 / région parente, guide étape 12 |
| `Redmane Castle` |  |  |  |  | 1 | Milieu |  | T10-11 / région parente |
| `Siofra River` | 7 | 45 | 14 | 5 | 1 | Milieu |  | T6 / région parente, guide étape 12 |
| `Swamp of Aeonia` |  |  |  |  | 1 | Milieu |  | T10-11 / région parente |
| `Three Sisters` | 1 |  |  |  |  | Milieu |  | T7-8 / région parente |
| `Writheblood Ruins` |  |  |  |  | 1 | Milieu |  | T11 / région parente |
| `Castle Sol` |  |  |  |  | 1 | Fin |  | T15 / région parente, guide étapes 18-19 |
| `Dragonbarrow` |  | 43 | 7 |  |  | Fin |  | T13 (Caelid North, déduction) |
| `Flame Peak` |  |  | 3 | 3 | 1 | Fin |  | T15 / région parente, guide étapes 18-19 |
| `Forbidden Lands` | 3 | 16 | 2 |  | 1 | Fin |  | T15 / région parente, guide étapes 18-19 |
| `Forge of the Giants` |  |  |  |  | 1 | Fin |  | T15 / région parente, guide étapes 18-19 |
| `Greyoll's Dragonbarrow` | 5 |  | 5 | 7 | 1 | Fin |  | T13 (Caelid North, déduction) |
| `Leyndell, Royal Capital` | 5 | 156 | 24 | 3 | 1 | Fin |  | T12 |
| `Leyndell, Royal Capital/Leyndell, Ashen Capital` | 2 |  |  |  |  | Fin |  | T12 |
| `Mountaintops of the Giants` | 12 | 115 | 43 | 16 | 1 | Fin |  | T15 / région parente, guide étapes 18-19 |
| `Nokstella, Eternal City` | 1 | 13 | 8 |  | 1 | Fin |  | T12 |
| `Subterranean Shunning-Grounds` | 1 | 22 | 4 |  | 1 | Fin |  | T14 (Leyndell Sewers) |
| `Volcano Manor` | 1 | 79 | 9 |  | 1 | Fin |  | T13 |
| `Accessed via Mountaintops of the Giants` |  |  |  | 1 |  | Fin de jeu |  | T15-16, accès après Fire Giant |
| `Consecrated Snowfield` | 10 | 66 | 21 | 9 | 1 | Fin de jeu |  | T17 |
| `Crumbling Farum Azula` | 1 | 51 | 11 |  | 1 | Fin de jeu |  | T15-16, accès après Fire Giant |
| `Elphael, Brace of the Haligtree` | 1 | 21 | 9 |  | 1 | Fin de jeu |  | T19-21 |
| `Leyndell, Ashen Capital` | 1 | 18 | 5 |  | 1 | Fin de jeu |  | T17 |
| `Miquella's Haligtree` | 2 | 78 | 17 | 2 | 1 | Fin de jeu |  | T19-21 |
| `Mohgwyn Dynasty Mausoleum` |  |  |  |  | 1 | Fin de jeu |  | T19 |
| `Mohgwyn Palace` |  | 26 | 2 |  | 1 | Fin de jeu |  | T19 |
| `Mohgwyn Palace (Siofra River)` |  |  |  | 1 |  | Fin de jeu |  | T19 |
| `Abyssal Woods` | 2 | 12 |  |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Abyssal Woods (Scadu Altus)` |  |  |  | 1 |  | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Ancient Ruins of Rauh` |  | 44 | 5 | 1 | 1 | DLC | DLC-Cœur | Great Runes : Rauh Base au rang de Scadu Altus Est / Shadow Keep |
| `Belurat, Tower Settlement` |  | 35 | 3 |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Castle Ensis` |  | 20 | 2 |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Cerulean Coast` | 3 | 32 | 5 |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Charo's Hidden Grave` | 1 | 17 | 3 |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Enir-Ilim` | 1 | 59 | 2 | 1 | 1 | DLC | DLC-Enir-Ilim | après Messmer's Kindling + Romina |
| `Fog Rift Catacombs` | 1 |  |  |  |  | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Foot of the Jagged Peak` | 2 |  |  |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Gate of Divinity` |  |  |  |  | 1 | DLC | DLC-Enir-Ilim | après Messmer's Kindling + Romina |
| `Gravesite Plain` | 39 | 108 | 24 | 29 | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Hinterland` |  | 2 |  |  |  | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Jagged Peak` | 2 | 38 | 4 |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `Land of the Tower` | 24 | 23 | 10 | 5 | 1 | DLC | DLC-Entrée | DLC non localisé |
| `Midra's Manse` |  | 4 | 1 |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Rauh Base` | 7 | 36 | 4 | 2 | 1 | DLC | DLC-Cœur | Great Runes : Rauh Base au rang de Scadu Altus Est / Shadow Keep |
| `Rauh Base (Land of the Tower)` |  |  |  | 1 |  | DLC | DLC-Cœur | Great Runes : Rauh Base au rang de Scadu Altus Est / Shadow Keep |
| `Realm of Shadow` | 22 |  |  |  |  | DLC | DLC-Entrée | DLC non localisé |
| `Scadu Altus` | 46 | 113 | 7 | 18 | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Scadu Altus (Abyssal Woods)` |  |  |  | 1 |  | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Scadutree Base` |  |  |  |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Scadutree Chalice` |  |  |  |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Scaduview` | 2 | 7 | 3 | 4 | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Shadow Keep` | 9 | 66 | 6 | 5 | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Shadow Keep, Church District` |  |  |  |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Shaman Village` |  |  |  |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Specimen Storehouse` |  | 30 |  |  | 1 | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `Stone Coffin Fissure` | 3 | 14 | 1 |  | 1 | DLC | DLC-Entrée | accès libre depuis l'arrivée |
| `accessed through Rauh Base` | 1 |  |  |  |  | DLC | DLC-Cœur | Great Runes : Rauh Base au rang de Scadu Altus Est / Shadow Keep |
| `accessed through Scadu Altus` | 1 |  |  |  |  | DLC | DLC-Cœur | après Rellana ou Spiritspring |
| `through Rauh Base` | 1 |  |  |  |  | DLC | DLC-Cœur | Great Runes : Rauh Base au rang de Scadu Altus Est / Shadow Keep |

Valeurs absentes de ces champs mais présentes dans `bosses.json` `encounters[].location` des 12 combats sans `regions` (**[Data]**) :

| `location` | Boss (`name`) | Étape proposée | Remarque |
|---|---|---|---|
| `null` | Draconic Tree Sentinel (rencontre Outskirts) | Milieu (Capital Outskirts) | **[Wiki]** l'infobox de la page indique littéralement `location = Location` ; la page situe ce combat à Capital Outskirts (correctif C3) |
| `Stone Platform` | Elden Beast | Fin de jeu | **[Wiki]** « encountered inside the Erdtree in Leyndell, Ashen Capital » ; T18 Elden Throne (correctif C4) |
| `Inside the Erdtree` | Radagon of the Golden Order | Fin de jeu | idem (correctif C5) |
| `Shaded Castle` | Elemer of the Briar | à confirmer | absent de `locations.json` ; hors frise |
| `Road's End Catacomb` | Crucible Knight | Milieu | **[Déduction]** coquille pour `Road's End Catacombs` (Liurnia of the Lakes dans `locations.json`) |
| `Lands Between` | Miranda Blossom | neutre | valeur générique, sans étape |
| `null` | Black Knight ×2, Curseblade Labirith, Dancer of Ranah, Golden Hippopotamus, Runebear (Rugalea) | DLC si `source` DLC, sinon non classé | hors frise |

### 1.4 Règles de résolution proposées [Choix]

Ordre d'application pour une arme ou un objet :
1. **Remembrance** : si l'objet est relié à une Remembrance (§ 2), il prend l'étape de la rencontre qui la donne.
2. **Par acquisition**, les équipements de départ étant ignorés :
   - on rassemble les valeurs de `location`, découpées sur ` / `. Chacune se résout ainsi : valeur de la table, sinon suffixe entre parenthèses `X (Région)`, sinon `locations.json[name].region` sans sa parenthèse, sinon `npcs.json[name].listed_region` (exemple : `Twin Maiden Husks` → `Roundtable Hold`) ;
   - on y ajoute les valeurs de `region`, découpées sur `/` ;
   - on retire les valeurs qui sont la région parente d'une autre valeur de la liste, d'après `locations.json` (exemple : `Mt. Gelmir` + `Volcano Manor` → `Volcano Manor`) ;
   - on retient l'étape la plus précoce parmi les valeurs restantes.
3. **Objet** : l'étape la plus précoce de ses acquisitions, comme dans `calculs.md`.
4. **Repli** : si aucune acquisition ne donne d'étape, on prend `regions_mentioned`, en ignorant `Altus Plateau` quand le texte ne contient « Altus » que dans « Scadu Altus », en retirant les régions parentes, puis en retenant l'étape la plus précoce.
5. **Étiquette DLC** : `source = "Shadow of the Erdtree"` impose l'étape DLC, puisque l'icône DLC est un fait du wiki. Si aucune zone DLC n'a été trouvée, l'objet reçoit « DLC non localisé ».
6. **`Roundtable Hold`** compte comme Début. **[Wiki]** Le guide, étape 5, y envoie le joueur dès l'approche de Stormveil. Les échanges de Remembrance passent par la règle 1.
7. Une arme qui n'a que des équipements de départ est rattachée à l'origine (règle de `calculs.md`). Les autres cas restent « Non classé », avec le badge Non documenté : ils sont exclus des 3 à 5 armes affichées par étape et restent visibles dans le tableau plein écran.

**Simulation sur les 487 armes** (mêlée, distance, boucliers) **[Data + Choix]** : Début 116 · Milieu 169 · Fin 53 · Fin de jeu 26 · DLC 102 (Entrée 44, Cœur 45, Enir-Ilim 8, non localisé 5) · départ seulement 2 (Broadsword, Halberd) · non classé 19. Aucune arme du jeu de base ne tombe dans le DLC, et aucune arme du DLC hors du DLC. Ces 19 armes non classées sont surtout des butins aléatoires sans lieu : Parrying Dagger, Bloodstained Dagger, Weathered Straight Sword, Noble's Slender Sword, Golden Epitaph, Pickaxe, Celebrant's Skull, Greathorn Hammer, Beastclaw Greathammer, Spiked Spear, Cross-Naginata, Cleanrot Spear, Vulgar Militia Shotel, Vulgar Militia Saw, Guardian's Swordspear, Pest's Glaive, Grave Scythe, Halo Scythe, Whip. Pour 4 d'entre elles, un nom de lieu de `locations.json` figure dans `acquisition[].details` : Golden Epitaph (Auriza Hero's Grave), Cross-Naginata (Gael Tunnel), Whip (Castle Morne), Celebrant's Skull (Windmill Village). Une recherche dans ce texte, en cinquième niveau, les classerait. Elle est optionnelle et plus fragile.

### 1.5 Mt. Gelmir

- **[Wiki]** Mt. Gelmir occupe T9 (partie basse) et T10 (partie haute), sous l'Altus Plateau (T11), que `calculs.md` classe en Milieu. Volcano Manor, où se trouve Rykard, occupe T13, au-dessus de Leyndell (T12).
- **[Wiki]** Le guide explore Mt. Gelmir à l'étape 16, avant Leyndell (étape 17). Il ne fait affronter Rykard qu'à l'étape 19, aux Mountaintops : « You should be at around level 100 now … You can definitely take on Praetor Rykard now ».
- **[Wiki]** Le brief (§ 5.2 A) ne met pas Mt. Gelmir en Fin : il cite seulement Leyndell et les Mountaintops of the Giants. `calculs.md` l'ajoute.
- **Conclusion** : placer Mt. Gelmir en Fin est contestable pour la région ouverte, mais justifié pour Volcano Manor.

| Option | Effet |
|---|---|
| A. Mt. Gelmir en Fin (`calculs.md`) | contredit les paliers T9-T10 et l'ordre du guide |
| **B. Mt. Gelmir en Milieu, Volcano Manor en Fin** (recommandé) | colle aux paliers ; avec la règle « valeur la plus spécifique », Rykard reste en Fin (`regions` = `Mt. Gelmir`, `Volcano Manor`), donc l'exemple de `calculs.md` tient, à condition d'écrire la chaîne « Blasphemous Blade → Rykard → Volcano Manor → Fin » |
| C. Mt. Gelmir et Volcano Manor en Milieu | contredit T13 |

Avec l'option B, 16 armes passent de Fin à Milieu : Great Knife, Scavenger's Curved Sword, Mantis Blade, Great Omenkiller Cleaver, Butchering Knife, Ringed Finger, Troll's Hammer, Fallingstar Beast Jaw, Thorned Whip, Pulley Bow, Pulley Crossbow, Jar Cannon, Albinauric Staff, Gelmir Glintstone Staff, Erdtree Seal, Coil Shield. Celles de Volcano Manor (Ghiza's Wheel, Inquisitor's Girandole, Godskin Stitcher, Man-Serpent's Shield, Serpent-Hunter…) restent en Fin.

**Autres placements à valider [Choix]** :
- Dragonbarrow (`Greyoll's Dragonbarrow`, `Dragonbarrow`) en Fin. **[Déduction]** Il correspondrait à T13 « Caelid (North) », mais le guide le traite à l'étape 15, avant Leyndell, ce qui plaiderait pour Milieu.
- Consecrated Snowfield (T17) et Mohgwyn Palace (T19) en Fin de jeu.
- Capital Outskirts en Milieu, par sa région parente : il n'a pas de palier et sert de porte de Leyndell.
- Deeproot Depths en Milieu, par le guide (étape 13) : il n'a pas de palier.
- Moonlight Altar et Lake of Rot en Milieu par leur région parente, sans repère du wiki.

### 1.6 Le DLC : une étape ou trois

Repères **[Wiki]** pour un découpage :
- [Scadu Altus](https://eldenring.wiki.gg/wiki/Scadu_Altus) n'a que deux accès : après Rellana, à Castle Ensis, ou par le Spiritspring près d'Elder's Hovel.
- [Enir-Ilim](https://eldenring.wiki.gg/wiki/Enir-Ilim) « may only be accessed after using Messmer's Kindling to burn the sealing tree … in the Ancient Ruins of Rauh ».
- [Great Runes](https://eldenring.wiki.gg/wiki/Great_Runes) (`mechanics.json`) met Rauh Base au rang de l'est de Scadu Altus et de Shadow Keep.
- Le wiki ne donne aucun palier de difficulté pour le DLC.

| Option | Contenu | Pour | Contre |
|---|---|---|---|
| **A. Une étape DLC** (recommandé) | toutes les valeurs DLC → DLC ; la zone (Entrée / Cœur / Enir-Ilim) sert de clé de tri dans la colonne | conforme au brief et au design (5 colonnes) ; la vraie progression du DLC est la bénédiction (§ 4.5) ; pas de palier wiki pour ordonner finement | 102 armes dans une seule colonne |
| B. Trois étapes | DLC-Entrée (Gravesite Plain et ses sous-régions, Castle Ensis, Belurat) · DLC-Cœur (Scadu Altus, Abyssal Woods, Shadow Keep, Scaduview, Rauh Base, Ancient Ruins of Rauh) · DLC-Enir-Ilim | coupures appuyées sur des verrous documentés ; colonnes équilibrées (44 / 45 / 8, plus 5 non localisées) | 7 étapes au lieu de 5 dans le sélecteur ; la pénalité « −4 par étape d'avance » s'applique deux fois de plus |

Ambiguïtés du DLC :
- `Land of the Tower` (24 acquisitions) regroupe Belurat, Rauh et Enir-Ilim : rattaché à Entrée par la règle du plus précoce.
- `Realm of Shadow` (22) est générique : Entrée, ou « non localisé ».
- `accessed through Scadu Altus`, `accessed through Rauh Base` et `through Rauh Base` sont des restes d'extraction, rattachés au lieu cité.

---

## 2. Armes et objets de Remembrance

### 2.1 Méthode de rattachement proposée

- **Objet → Remembrance**. On cherche le nom exact de chacune des 25 entrées `tools.json` de `category = "Remembrances"` dans les champs de l'objet `acquisition[].location`, `acquisition[].details[]` et `infobox.obtained`. **[Data]** Cette recherche relie 52 objets, chacun à une seule Remembrance : les 51 choix d'échange et `Ash of War: Spinning Gravity Thrust`, livrée montée sur la Sword Lance. Blades of Stone ne dit que « his Remembrance » dans `details` : c'est `infobox.obtained` qui le relie. Land of Shadow, Midra's Flame of Frenzy, Messmer's Orb et Light of Miquella sont reliés par `location`.
- **Contrôle croisé** : `tools.json` `effect_details[0]` de chaque Remembrance (« traded with Finger Reader Enia for either X or Y »). Ne pas l'utiliser seul : « Black Blade » (l'incantation) est contenu dans « Maliketh's Black Blade », un appariement naïf sur ce texte le perd.
- **Remembrance → boss** : rencontre de `bosses.json` dont `encounters[].drops[]` contient le nom exact de la Remembrance. On préfère la page qui porte un indicateur `remembrance_*`. On n'utilise pas `tools.json` `infobox.obtained` (« Drop: Astel Naturalborn of the Void ») : son orthographe ne correspond pas aux `name` de `bosses.json`.
- **Boss → étape** : règle 2 du § 1.4 appliquée à `encounters[].regions` de cette rencontre (retrait des régions parentes, puis valeur la plus précoce). Une seule exception : Elden Beast a `regions = []`, il faut le correctif C4 ou une surcharge vers Fin de jeu.
- **Indicateur du score** : `acquisition_flags` contient `remembrance_weapon` dans les fichiers d'armes et `remembrance_trade` dans les autres. Ces indicateurs couvrent bien les 52 objets.

### 2.2 Table de rattachement (option A ; zone DLC pour l'option B)

| Remembrance (`tools.json`) | Objets reliés (fichier) | Boss (`bosses.json` `name`) | Rencontre (`encounters[].name`) | `location` | `regions` | Étape | Zone DLC (option B) |
|---|---|---|---|---|---|---|---|
| Remembrance of the Regal Ancestor (Base game) | Ancestral Spirit's Horn (`talismans.json`)<br>Winged Greathorn (`melee_armaments.json`) | Regal Ancestor Spirit | Regal Ancestor Spirit | Northern Hallowhorn Grounds | Siofra River | Milieu |  |
| Remembrance of the Naturalborn (Base game) | Ash of War: Waves of Darkness (`ashes_of_war.json`)<br>Bastard's Stars (`melee_armaments.json`) | Astel | Astel, Naturalborn of the Void | Ainsel River | Ainsel River | Milieu |  |
| Remembrance of the Lichdragon (Base game) | Death Lightning (`spells.json`)<br>Fortissax's Lightning Spear (`spells.json`) | Lichdragon Fortissax | Lichdragon Fortissax | Deeproot Depths | Deeproot Depths | Milieu |  |
| Remembrance of the Fire Giant (Base game) | Burn, O Flame! (`spells.json`)<br>Giant's Red Braid (`melee_armaments.json`) | Fire Giant | Fire Giant | Flame Peak | Mountaintops of the Giants | Fin |  |
| Remembrance of the Grafted (Base game) | Axe of Godrick (`melee_armaments.json`)<br>Grafted Dragon (`melee_armaments.json`) | Godrick the Grafted | Godrick the Grafted – Phase 1 | Stormveil Castle | Limgrave, Stormveil Castle | Début |  |
| Remembrance of the Full Moon Queen (Base game) | Carian Regal Scepter (`ranged_weapons_catalysts.json`)<br>Rennala's Full Moon (`spells.json`) | Rennala, Queen of the Full Moon | Rennala, Queen of the Full Moon (Phase 2) | Academy of Raya Lucaria | Liurnia of the Lakes, Academy of Raya Lucaria | Milieu |  |
| Remembrance of the Blasphemous (Base game) | Blasphemous Blade (`melee_armaments.json`)<br>Rykard's Rancor (`spells.json`) | Rykard, Lord of Blasphemy | Rykard, Lord of Blasphemy – Phase 1 | Volcano Manor | Mt. Gelmir, Volcano Manor | Fin |  |
| Remembrance of the Starscourge (Base game) | Lion Greatbow (`ranged_weapons_catalysts.json`)<br>Starscourge Greatsword (`melee_armaments.json`) | Starscourge Radahn | Starscourge Radahn | Caelid (Wailing Dunes) | Caelid | Milieu |  |
| Remembrance of the Omen King (Base game) | Morgott's Cursed Sword (`melee_armaments.json`)<br>Regal Omen Bairn (`tools.json`) | Morgott, the Omen King | Morgott, the Omen King | Leyndell, Royal Capital | Altus Plateau, Leyndell, Royal Capital | Fin |  |
| Remembrance of the Blood Lord (Base game) | Bloodboon (`spells.json`)<br>Mohgwyn's Sacred Spear (`melee_armaments.json`) | Mohg, Lord of Blood | Mohg, Lord of Blood – Phase 1 | Mohgwyn Palace | Siofra River, Mohgwyn Palace | Fin de jeu |  |
| Remembrance of the Rot Goddess (Base game) | Hand of Malenia (`melee_armaments.json`)<br>Scarlet Aeonia (`spells.json`) | Malenia, Blade of Miquella | Malenia, Goddess of Rot | Elphael, Brace of the Haligtree | Miquella's Haligtree, Elphael, Brace of the Haligtree | Fin de jeu |  |
| Remembrance of the Black Blade (Base game) | Black Blade (`spells.json`)<br>Maliketh's Black Blade (`melee_armaments.json`) | Maliketh, the Black Blade | Maliketh, the Black Blade | Crumbling Farum Azula | Mountaintops of the Giants, Crumbling Farum Azula | Fin de jeu |  |
| Remembrance of Hoarah Loux (Base game) | Ash of War: Hoarah Loux's Earthshaker (`ashes_of_war.json`)<br>Axe of Godfrey (`melee_armaments.json`) | Godfrey, First Elden Lord | Godfrey, First Elden Lord (Leyndell, Ashen Capital) | Leyndell, Ashen Capital | Altus Plateau, Leyndell, Ashen Capital | Fin de jeu |  |
| Remembrance of the Dragonlord (Base game) | Dragon King's Cragblade (`melee_armaments.json`)<br>Placidusax's Ruin (`spells.json`) | Dragonlord Placidusax | Dragonlord Placidusax | Crumbling Farum Azula | Mountaintops of the Giants, Crumbling Farum Azula | Fin de jeu |  |
| Elden Remembrance (Base game) | Marika's Hammer (`melee_armaments.json`)<br>Sacred Relic Sword (`melee_armaments.json`) | Elden Beast | Elden Beast | Stone Platform | `[]` | Fin de jeu |  |
| Remembrance of the Dancing Lion (Shadow of the Erdtree) | Ash of War: Divine Beast Frost Stomp (`ashes_of_war.json`)<br>Enraged Divine Beast (`talismans.json`) | Divine Beast Dancing Lion | Divine Beast Dancing Lion | Belurat, Tower Settlement; Ancient Ruins of Rauh | Land of the Tower, Belurat, Tower Settlement, Ancient Ruins of Rauh | DLC | DLC-Entrée |
| Remembrance of the Twin Moon Knight (Shadow of the Erdtree) | Rellana's Twin Blades (`melee_armaments.json`)<br>Rellana's Twin Moons (`spells.json`) | Rellana, Twin Moon Knight | Rellana, Twin Moon Knight | Castle Ensis | Gravesite Plain, Castle Ensis | DLC | DLC-Entrée |
| Remembrance of Putrescence (Shadow of the Erdtree) | Putrescence Cleaver (`melee_armaments.json`)<br>Vortex of Putrescence (`spells.json`) | Putrescent Knight | Putrescent Knight | Stone Coffin Fissure | Gravesite Plain, Stone Coffin Fissure | DLC | DLC-Entrée |
| Remembrance of the Wild Boar Rider (Shadow of the Erdtree) | Ash of War: Spinning Gravity Thrust (`ashes_of_war.json`)<br>Blades of Stone (`spells.json`)<br>Sword Lance (`melee_armaments.json`) | Commander Gaius | Commander Gaius | Scaduview | Shadow Keep, Scaduview | DLC | DLC-Cœur |
| Remembrance of the Shadow Sunflower (Shadow of the Erdtree) | Land of Shadow (`spells.json`)<br>Shadow Sunflower Blossom (`melee_armaments.json`) | Scadutree Avatar | Scadutree Avatar | Scadutree Base | Shadow Keep | DLC | DLC-Cœur |
| Remembrance of the Saint of the Bud (Shadow of the Erdtree) | Poleblade of the Bud (`melee_armaments.json`)<br>Rotten Butterflies (`spells.json`) | Romina, Saint of the Bud | Romina, Saint of the Bud | Ancient Ruins of Rauh (Church of the Bud) | Land of the Tower, Ancient Ruins of Rauh | DLC | DLC-Cœur |
| Remembrance of the Lord of Frenzied Flame (Shadow of the Erdtree) | Greatsword of Damnation (`melee_armaments.json`)<br>Midra's Flame of Frenzy (`spells.json`) | Midra, Lord of Frenzied Flame | Midra, Lord of Frenzied Flame | Midra's Manse | Scadu Altus, Midra's Manse | DLC | DLC-Cœur |
| Remembrance of the Mother of Fingers (Shadow of the Erdtree) | Gazing Finger (`melee_armaments.json`)<br>Staff of the Great Beyond (`ranged_weapons_catalysts.json`) | Metyr, Mother of Fingers | Metyr, Mother of Fingers | Finger Ruins of Miyr | Scadu Altus | DLC | DLC-Cœur |
| Remembrance of the Impaler (Shadow of the Erdtree) | Messmer's Orb (`spells.json`)<br>Spear of the Impaler (`melee_armaments.json`) | Messmer the Impaler | Messmer the Impaler Base Serpent Messmer | Shadow Keep | Shadow Keep | DLC | DLC-Cœur |
| Remembrance of a God and a Lord (Shadow of the Erdtree) | Greatsword of Radahn (Light) (`melee_armaments.json`)<br>Greatsword of Radahn (Lord) (`melee_armaments.json`)<br>Light of Miquella (`spells.json`) | Promised Consort Radahn | Promised Consort Radahn – Radahn, Consort of Miquella | Enir-Ilim (Gate of Divinity) | Land of the Tower, Enir-Ilim | DLC | DLC-Enir-Ilim |

### 2.3 Cas particuliers et non reliables

- Aucun objet d'échange n'est impossible à relier.
- `Remembrance of the Regal Ancestor` est dans les `drops` de deux pages : `Regal Ancestor Spirit` (rencontre à Northern Hallowhorn Grounds) et `Ancestor Spirit` (rencontre « Regal Ancestor Spirit » à Siofra River). Les deux donnent Milieu. On garde la page qui porte l'indicateur.
- `Elden Remembrance` est dans les `drops` d'Elden Beast et de Radagon (« after defeating Elden Beast »). Il faut retenir Elden Beast. Les deux rencontres ont `regions = []`.
- `Hoarah Loux, Warrior`, cité par la liste wiki `remembrance_base_game` de `bosses.json` `metadata.flag_lists_from_bosses_page`, n'a pas de page dans `bosses.json`. C'est la rencontre « (Leyndell, Ashen Capital) » de `Godfrey, First Elden Lord`. Les indicateurs de page de Godfrey s'appliquent donc à ses deux rencontres, alors que la Remembrance ne vient que de la seconde.
- **[Data]** Incohérence interne : `Carian Regal Scepter` a `acquisition[0].method = "Purchase"` et l'indicateur `purchasable`, alors que son texte décrit un échange de Remembrance. Le score le marquerait à la fois « achat » et « Remembrance ». À vérifier sur la page wiki avant tout correctif.
- `tools.json` `Remembrance of a God and a Lord` porte lui-même l'indicateur `remembrance_trade` : c'est un faux positif sans effet.

---

## 3. Frise : histoire principale et voie DLC

### 3.1 Concordance avec le wiki

- **[Wiki]** La section « Mandatory bosses » de [Bosses](https://eldenring.wiki.gg/wiki/Bosses) (révision du 2026-09-25) donne exactement l'ordre 1 à 11 du brief : « Any two Shardbearers » (Godrick, Mohg, Rennala, Rykard, Radahn), Draconic Tree Sentinel ou Fia's Champions, Godfrey (Golden Shade), Morgott, Fire Giant, Godskin Duo, Maliketh, Sir Gideon Ofnir, Godfrey, Radagon, Elden Beast. Accès au DLC : Starscourge Radahn et Mohg, Lord of Blood. Fin du DLC : Messmer, Romina, Promised Consort Radahn.
- **[Data]** Les indicateurs `mandatory_base_game`, `required_to_access_dlc`, `mandatory_dlc` et `shardbearer` de `bosses.json` reproduisent ces listes. Attention : ces indicateurs sont posés sur la page, pas sur la rencontre (voir Godfrey et Mohg). Pour savoir si un nœud donne une Remembrance ou une Grande Rune, il faut lire `encounters[].drops` de la rencontre retenue.
- **[Data]** `shardbearer` désigne « l'un des 5 qui comptent pour Leyndell ». Morgott et Malenia portent aussi une Grande Rune (`drops`) sans avoir cet indicateur.

### 3.2 Nœuds, entrées exactes et prérequis

Tableau des nœuds : voir § 5 (colonnes `name`, rencontre, `location`, `regions`). La colonne Source vient de `encounters[].source` (DLC : `Shadow of the Erdtree`).

| Nœud | Entrée `bosses.json` (`name` · rencontre) | Prérequis documentés |
|---|---|---|
| P1a Margit | `Margit, the Fell Omen` · `Margit the Fell Omen`. Prendre la première valeur de `hp_values` et `runes_values` (Limgrave) ; la seconde (8193 PV, 16 800 runes) est le combat de Capital Outskirts | — |
| P1 Godrick | `Godrick the Grafted` · `Godrick the Grafted – Phase 1` | **[Wiki]** « Defeat Margit, the Fell Omen and navigate Stormveil Castle » ([Bosses](https://eldenring.wiki.gg/wiki/Bosses), § Facing the shardbearers) |
| P2a Red Wolf | `Red Wolf of Radagon` · `Red Wolf of Radagon` | **[Wiki]** l'[Academy Glintstone Key](https://eldenring.wiki.gg/wiki/Academy_Glintstone_Key) « is required to enter the Academy of Raya Lucaria ». C'est un objet clé, pas un boss |
| P2 Rennala | `Rennala, Queen of the Full Moon` · `… (Phase 2)` (runes, Remembrance, Grande Rune ; PV de la phase 1 : 3493) | **[Wiki]** « Defeat Red Wolf of Radagon and navigate the Academy of Raya Lucaria » |
| P3 Radahn | `Starscourge Radahn` · `Starscourge Radahn` | **[Wiki]** « Speak to Jerren at Redmane Castle after reaching Altus Plateau or defeating the Crucible Knight & Misbegotten Warrior duo » ; rencontres `Crucible Knight (Redmane Castle)` et `Misbegotten Warrior (Redmane Castle)` dans `bosses.json`. Absent du brief |
| P4 Rykard | `Rykard, Lord of Blasphemy` · `… – Phase 1` (`hp_values` 30439 puis 59174 pour la phase 2) | **[Wiki]** « Speak to Tanith … after completing all three of her contracts, or take the waygate after defeating the Godskin Noble » ; rencontre `Godskin Noble (Volcano Manor)`. Absent du brief |
| P5 Mohg | `Mohg, Lord of Blood` · `Mohg, Lord of Blood – Phase 1`. Ne pas confondre avec la rencontre `Mohg, the Omen` (Subterranean Shunning-Grounds) | **[Wiki]** Pureblood Knight's Medal (quête de Varré, Rose Church) ou passage de Consecrated Snowfield. Snowfield demande les deux moitiés de Haligtree Secret Medallion au Grand Lift of Rold ([Consecrated Snowfield](https://eldenring.wiki.gg/wiki/Consecrated_Snowfield)) ; le lift demande la Rold Medallion, remise par Melina à Leyndell après le mur d'épines ([Rold Medallion](https://eldenring.wiki.gg/wiki/Rold_Medallion)). **[Déduction]** Avant Leyndell, seule la voie Varré permet de compter Mohg parmi les deux. Absent du brief |
| 2a Draconic Tree Sentinel | `Draconic Tree Sentinel` · `Draconic Tree Sentinel (Outskirts Draconic Tree Sentinel)` (pas la rencontre de Farum Azula) | **[Wiki]** deux Grandes Runes pour entrer dans Leyndell ([Bosses](https://eldenring.wiki.gg/wiki/Bosses)) |
| 2b Fia's Champions | `Fia's Champions` · `Fia's Champions` (rencontre de groupe : runes 40 000, PV `null` ; trois rencontres individuelles portent des PV) | **[Wiki]** le Draconic Tree Sentinel « can be skipped by taking the gateway portal at the Prince of Death's Throne in Deeproot Depths » ([Draconic Tree Sentinel](https://eldenring.wiki.gg/wiki/Draconic_Tree_Sentinel)) |
| 3 Godfrey (Golden Shade) | `Godfrey, First Elden Lord` · `Godfrey, First Elden Lord (Leyndell, Royal Capital)` | **[Wiki]** « must be defeated to progress Leyndell further » |
| 4 Morgott | `Morgott, the Omen King` · `Morgott, the Omen King` | — |
| 5 Fire Giant | `Fire Giant` · `Fire Giant` | **[Wiki]** Morgott « must be defeated to unlock Mountaintops of the Giants » |
| 6 Godskin Duo | `Godskin Duo` · `Godskin Duo` | **[Wiki]** Fire Giant « must be completed to unlock Crumbling Farum Azula » |
| 7 Maliketh | `Maliketh, the Black Blade` · `Maliketh, the Black Blade` (pas `… – Beast Clergyman`) | **[Wiki]** les Godskin Duo « must be defeated to advance further in Crumbling Farum Azula » |
| 8 Sir Gideon Ofnir | `Sir Gideon Ofnir, the All-Knowing` · aucune rencontre dans `data/` | **[Wiki]** « After burning the Erdtree and defeating Maliketh … the player must fight Gideon before they can enter the Erdtree » |
| 9 Godfrey / Hoarah Loux | `Godfrey, First Elden Lord` · `Godfrey, First Elden Lord (Leyndell, Ashen Capital)` | — |
| 10 Radagon | `Radagon of the Golden Order` · `Radagon of the Golden Order` | — |
| 11 Elden Beast | `Elden Beast` · `Elden Beast` | **[Wiki]** Radagon est « the first half of the final boss fight, with Elden Beast as the second half » |
| D0 accès au DLC | P3 et P5 | **[Wiki]** [ELDEN RING Shadow of the Erdtree](https://eldenring.wiki.gg/wiki/ELDEN_RING_Shadow_of_the_Erdtree) et [Walkthrough/Shadow of the Erdtree](https://eldenring.wiki.gg/wiki/Walkthrough/Shadow_of_the_Erdtree) |
| D1 Messmer (Shadow of the Erdtree) | `Messmer the Impaler` · `Messmer the Impaler Base Serpent Messmer` | **[Wiki]** Scadu Altus et Shadow Keep ne s'ouvrent qu'après Rellana ou par le Spiritspring. Rellana est « an optional boss » |
| D2 Romina (Shadow of the Erdtree) | `Romina, Saint of the Bud` · `Romina, Saint of the Bud` | **[Wiki]** « must be defeated in order to burn the Sealing Tree and reach Enir-Ilim » |
| D3 Promised Consort Radahn (Shadow of the Erdtree) | `Promised Consort Radahn` · `Promised Consort Radahn – Radahn, Consort of Miquella` (runes et Remembrance ; PV de la phase 1 : 46 134 « until 65% ») | **[Wiki]** Enir-Ilim n'est accessible qu'après avoir brûlé l'arbre-sceau avec Messmer's Kindling (lâché par Messmer) |

### 3.3 Écarts entre le brief et le wiki

1. **Prérequis incomplets** : le brief ne cite que Margit et le Red Wolf. Le wiki documente aussi ceux de Radahn, Rykard et Mohg (tableau ci-dessus). Proposition : ajouter des sous-nœuds textuels (« Varré ou Consecrated Snowfield », « Tanith ou Godskin Noble », « Jerren à Redmane Castle »), sans calcul de niveau pour ceux qui ne sont pas des boss.
2. **Messmer → Romina** : le wiki dit que les deux sont nécessaires (Kindling pour l'un, arbre-sceau pour l'autre) mais n'impose pas d'ordre entre eux. Options : garder la chaîne linéaire du brief avec la mention « ordre Messmer / Romina libre » (recommandé, sans nouveau composant), ou ajouter une jonction « et » (nouveau composant).
3. **Données manquantes du brief** : le brief annonce « aucune donnée de combat » pour Sir Gideon Ofnir. Le wiki les documente pourtant, dans un tableau et non dans l'infobox : PV 6226, runes 150 000, Leyndell, Ashen Capital ([page](https://eldenring.wiki.gg/wiki/Sir_Gideon_Ofnir,_the_All-Knowing), § Basic Info). C'est un manque de l'extraction (correctif C1). Pour Godskin Duo, le brief annonce des PV non documentés : le wiki donne « around 24000 HP (NG) » dans le texte et 170 000 runes dans le champ `drops` de l'infobox ([page](https://eldenring.wiki.gg/wiki/Godskin_Duo)), correctif C2 pour les runes.
4. **Rangs** : `bosses.json` `tier` est l'union des groupes de la navbox sur la page. Godfrey (`Legends`, `Great Enemies`) et Mohg (`Demigods`, `Great Enemies`) ne permettent pas d'attribuer un rang par rencontre.

---

## 4. Niveau recommandé d'un boss

### 4.1 Ce que le wiki documente

- **[Wiki]** Aucun niveau recommandé par boss.
- **[Wiki]** [Recommended Level by Location](https://eldenring.wiki.gg/wiki/Recommended_Level_by_Location) : « it is possible to beat Elden Ring with a Level 120 (+/- 10) … Most casual players, though, beat the game between the levels 150-170 », plus les paliers T1 à T21 (§ 1.2).
- **[Wiki]** [Elden Ring Guide](https://eldenring.wiki.gg/wiki/Elden_Ring_Guide) : étape 15 (Dragonbarrow), « You should be at minimum level 60 by now, probably over 70 » ; étape 19 (Mountaintops), « You should be at around level 100 now and have a weapon at +20, or +9 in case of a Somber weapon. You can definitely take on Praetor Rykard now ».
- **[Wiki]** [Walkthrough/Limgrave Part 1](https://eldenring.wiki.gg/wiki/Walkthrough/Limgrave_Part_1) : le Tree Sentinel est un « very menacing high level boss », à reprendre « when you are about level 40 or so ». C'est un repère atypique : un boss volontairement trop fort pour sa zone. Il n'est pas utilisé.
- **[Wiki]** [Walkthrough/Shadow of the Erdtree](https://eldenring.wiki.gg/wiki/Walkthrough/Shadow_of_the_Erdtree) : « To fight Messmer, it is recommended to have 13 Scadutree Fragments (more or less) », et « If you don't gather any fragments, bosses will just kill you in 2 hits or so (regardless of your level) ».
- **[Data]** `origins.json` `level` : de 1 (Wretch) à 10 (Confessor, Heavy Knight).

### 4.2 Trois méthodes reproductibles [Estimation]

**M1 — Paliers de zone.**
- Entrée : palier wiki de la zone de la rencontre, tiré d'une table de configuration (colonne « Palier wiki » du § 5).
- Niveau : interpolation linéaire entre des ancres, arrondie à l'entier le plus proche (0,5 vers le haut) :
  - T1 = 10 **[Choix]** (niveau maximal d'une origine) ;
  - T13 = 60 **[Wiki + Déduction]** (minimum de l'étape 15 du guide, Dragonbarrow ≈ « Caelid (North) ») ;
  - T15 = 100 **[Wiki]** (étape 19, Mountaintops) ;
  - T18 = 120 **[Wiki + Déduction]** (niveau moyen de fin de jeu, Elden Throne).
- Au-delà de T18, on prolonge la pente du dernier segment (+6,67 par palier).
- Paliers des boss de la frise :
  - faits du wiki : Godrick T5, Rykard T13, Mohg T19, Godfrey (Golden Shade) et Morgott T12, Fire Giant T15, Gideon et Hoarah Loux T17 ;
  - déductions : Margit T4 (Stormhill = nord du Limgrave), Radagon et Elden Beast T18 (Inside the Erdtree = Elden Throne), Maliketh T16 (boss de fin de zone = Late Farum Azula) ;
  - choix, quand il y a plusieurs paliers on prend le plus bas : Red Wolf et Rennala T7 (Liurnia), Radahn T10 (Caelid West/South), Godskin Duo T15 (Farum Azula) ;
  - région parente : Draconic Tree Sentinel T11 (Altus Plateau) ;
  - sans palier : Fia's Champions et les boss du DLC.
- Limites : pas de palier pour le DLC ni pour Deeproot Depths ; ambiguïtés de zone ; saut de 60 à 100 entre T13 et T15, parce que l'ancre T13 est un minimum alors que l'ancre T15 est un niveau « around ».

**M2 — Runes NG.**
- Entrée : `runes_values` de la rencontre retenue.
- Formule : niveau = plus petit L tel que k × coût(L) ≥ runes, avec coût(L) = `floor((x + 0,1) × (L + 81)²) + 1` et x = `max(0, (L + 81 − 92) × 0,02)` (formule de `calculs.md`), et k = 500 000 / coût(120) = 500 000 / 92 115 ≈ 5,428. k est calé pour qu'Elden Beast (500 000 runes) vaille 120, le niveau moyen de fin du wiki. **[Choix]**
- Radagon est exclu : ses runes sont celles d'Elden Beast (« after defeating Elden Beast »).
- Limites : les runes ne mesurent pas la difficulté ; la méthode sous-estime le milieu de partie par rapport au guide (Draconic Tree Sentinel 39 alors que le guide attend au moins 60 à ce moment) ; elle demande des runes non nulles.

**M3 — Hybride (recommandé).**
- Niveau = arrondi((M1 + M2) / 2) si les deux existent, sinon celle qui existe ; « Non estimé » si la rencontre n'existe pas dans `data/`.
- Cette moyenne combine la position (palier) et les runes, comme le prévoit `calculs.md`. Elle lisse le saut T13-T15 : Fire Giant 88 au lieu de 100.
- Elle retrouve les ancres du wiki : environ 60 à l'entrée de Leyndell (Morgott 59), 120 pour Elden Beast.

**PV : affichés, pas utilisés.**
- **[Data]** Les PV ne suivent pas la progression. Gideon (6226 PV selon le wiki, fin de jeu) ≈ Godrick (6080, début) ; Rykard phase 1 (30 439) > Elden Beast (22 127) ; Red Wolf (2204) < Margit (4174).
- Proposition : modifier le texte de `calculs.md` en « à partir du palier de zone du wiki et des runes NG ». La décision revient au chef de projet.

### 4.3 Résultats sur la frise

| Nœud | M1 | M2 | **M3** | Remarque |
|---|---|---|---|---|
| P1a Margit | 23 | 18 | **21** | |
| P1 Godrick | 27 | 24 | **26** | |
| P2a Red Wolf | 35 | 19 | **27** | |
| P2 Rennala | 35 | 34 | **35** | runes de la phase 2 |
| P3 Radahn | 48 | 46 | **47** | |
| P4 Rykard | 60 | 64 | **62** | le guide le fait affronter vers 100 (étape 19) |
| P5 Mohg | 127 | 111 | **119** | M1 extrapolé au-delà de T18 |
| 2a Draconic Tree Sentinel | 52 | 39 | **46** | |
| 2b Fia's Champions | — | 34 | **34** | sans palier : M2 seul |
| 3 Godfrey (Golden Shade) | 56 | 50 | **53** | |
| 4 Morgott | 56 | 61 | **59** | |
| 5 Fire Giant | 100 | 75 | **88** | |
| 6 Godskin Duo | 100 | — | **100** | position seule ; avec le correctif C2 (170 000 runes) : M2 73, M3 **87** |
| 7 Maliketh | 107 | 83 | **95** | |
| 8 Sir Gideon Ofnir | 113 | — | **Non estimé** | aucune rencontre dans `data/` ; avec le correctif C1 (150 000 runes) : M2 69, M3 **91** |
| 9 Godfrey / Hoarah Loux | 113 | 96 | **105** | |
| 10 Radagon | 120 | — | **120** | runes exclues (ce sont celles d'Elden Beast) |
| 11 Elden Beast | 120 | 120 | **120** | ancre |
| D1 Messmer | — | 109 | voir 4.4 | |
| D2 Romina | — | 107 | voir 4.4 | |
| D3 Promised Consort Radahn | — | 120 | voir 4.4 | |

Cas limites demandés :
- **Godskin Duo** : PV et runes `null` dans `data/`, donc estimation par la position seule (M1 = 100).
- **Sir Gideon Ofnir** : aucune rencontre, donc « Non estimé ». Les deux valeurs changent si les correctifs C1 et C2 sont appliqués.

### 4.4 Niveau des boss du DLC

| Option | Valeurs | Pour | Contre |
|---|---|---|---|
| **D-A. Niveau d'entrée du DLC** (recommandé) : le plus élevé des M3 de P3 et P5, soit 119, pour tous les boss du DLC | Messmer, Romina, Promised Consort Radahn : 119 | **[Wiki]** le DLC exige Radahn et Mohg ; la difficulté du DLC est portée par la bénédiction (« regardless of your level ») | aucune différence de niveau entre les boss du DLC |
| D-B. M2 par boss | 109 / 107 / 120 | données propres à chaque boss | sous le niveau d'entrée (Mohg 119) : incohérent |

### 4.5 Bénédiction de l'Arbre-Ombre recommandée (boss du DLC) [Estimation]

- **[Wiki]** [Scadutree Fragment](https://eldenring.wiki.gg/wiki/Scadutree_Fragment) (`mechanics.json`) : 50 fragments en tout. Gravesite Plain 10, Charo's Hidden Grave 1, Cerulean Coast 2, Stone Coffin Fissure 1, Jagged Peak 1, Scadu Altus 12, Rauh Base 1, Abyssal Woods 3, Shadow Keep 11, Ancient Ruins of Rauh 4, Enir-Ilim 4. La table des niveaux de bénédiction donne le total requis : niveau 7 = 13, 8 = 15, 9 = 17, 14 = 32, 16 = 38, 17 = 41.
- **[Choix]** Chemin principal :
  - Messmer : Gravesite Plain + Scadu Altus + Shadow Keep = 33 fragments ;
  - Romina : les mêmes + Rauh Base + Ancient Ruins of Rauh = 38 ;
  - Promised Consort Radahn : les mêmes + Enir-Ilim = 42.
  - Les zones annexes (Cerulean Coast, Charo's Hidden Grave, Stone Coffin Fissure, Jagged Peak, Abyssal Woods : 8 fragments) sont exclues.

| Méthode | Formule | Messmer | Romina | Promised Consort Radahn | Limites |
|---|---|---|---|---|---|
| B1. Maximum du chemin | niveau atteint avec tous les fragments du chemin | 14 | 16 | 17 | contredit la seule recommandation du wiki (Messmer ≈ 13 fragments, niveau 7) : B1 donne ce qu'on peut avoir, pas ce qui est recommandé |
| **B2. Ancre Messmer** (recommandé) | fragments = arrondi(13 × chemin / 33), puis niveau de la table | **7** (13) | **8** (15) | **9** (17) | une seule ancre wiki, approximative (« more or less ») ; la proportionnalité est un choix |

Afficher B1 dans le panneau « Pourquoi ? » comme maximum atteignable. La préparation (Prêt, Limite, Trop tôt) reste celle de `calculs.md` : elle ne porte que sur le niveau.

---

## 5. Données des boss de la frise

« oui » = champ présent ; `null` = non documenté dans `data/`. Absorption = `damage_negation_percent` ; résistances = `status_resistance` ; immunités = valeurs `Immune`.

| Nœud | `name` | Rencontre (`encounters[].name`) | `location` | `regions` | PV (`hp_values`) | Runes (`runes_values`) | Absorption | Résistances | Immunités | Palier wiki | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1a Margit (prérequis Godrick) | Margit, the Fell Omen | Margit the Fell Omen | Limgrave; Capital Outskirts | Limgrave, Altus Plateau, Capital Outskirts | 4174 | 12000 | oui | oui | sleep, madness, death_blight | 4 | 23 | 18 | 21 |
| P1 Godrick | Godrick the Grafted | Godrick the Grafted – Phase 1 | Stormveil Castle | Limgrave, Stormveil Castle | 6080 | 20000 | oui | oui | madness | 5 | 27 | 24 | 26 |
| P2a Red Wolf (prérequis Rennala) | Red Wolf of Radagon | Red Wolf of Radagon | Academy of Raya Lucaria | Liurnia of the Lakes, Academy of Raya Lucaria | 2204 | 14000 | oui | oui | madness | 7 | 35 | 19 | 27 |
| P2 Rennala | Rennala, Queen of the Full Moon | Rennala, Queen of the Full Moon (Phase 2) | Academy of Raya Lucaria | Liurnia of the Lakes, Academy of Raya Lucaria | 4097 | 40000 | oui | oui | sleep, madness | 7 | 35 | 34 | 35 |
| P3 Starscourge Radahn | Starscourge Radahn | Starscourge Radahn | Caelid (Wailing Dunes) | Caelid | 9572 | 70000 | oui | oui | madness | 10 | 48 | 46 | 47 |
| P4 Rykard | Rykard, Lord of Blasphemy | Rykard, Lord of Blasphemy – Phase 1 | Volcano Manor | Mt. Gelmir, Volcano Manor | 30439 | 130000 | oui | oui | madness | 13 | 60 | 64 | 62 |
| P5 Mohg | Mohg, Lord of Blood | Mohg, Lord of Blood – Phase 1 | Mohgwyn Palace | Siofra River, Mohgwyn Palace | 18389 | 420000 | `null` | `null` |  | 19 | 127 | 111 | 119 |
| 2a Draconic Tree Sentinel | Draconic Tree Sentinel | Draconic Tree Sentinel (Outskirts Draconic Tree Sentinel) | `null` | `[]` | 8398 | 50000 | `null` | `null` |  | 11 | 52 | 39 | 46 |
| 2b Fia's Champions | Fia's Champions | Fia's Champions | Deeproot Depths | Deeproot Depths | `null` | 40000 | `null` | `null` |  | — | — | 34 | 34 |
| 3 Godfrey (Golden Shade) | Godfrey, First Elden Lord | Godfrey, First Elden Lord (Leyndell, Royal Capital) | Leyndell, Royal Capital | Altus Plateau, Leyndell, Royal Capital | 7099 | 80000 | `null` | `null` |  | 12 | 56 | 50 | 53 |
| 4 Morgott | Morgott, the Omen King | Morgott, the Omen King | Leyndell, Royal Capital | Altus Plateau, Leyndell, Royal Capital | 10399 | 120000 | oui | oui | madness | 12 | 56 | 61 | 59 |
| 5 Fire Giant | Fire Giant | Fire Giant | Flame Peak | Mountaintops of the Giants | 43263 | 180000 | oui | oui | madness | 15 | 100 | 75 | 88 |
| 6 Godskin Duo | Godskin Duo | Godskin Duo | Crumbling Farum Azula | Mountaintops of the Giants, Crumbling Farum Azula | `null` | `null` | `null` | `null` |  | 15 | 100 | — | 100 |
| 7 Maliketh | Maliketh, the Black Blade | Maliketh, the Black Blade | Crumbling Farum Azula | Mountaintops of the Giants, Crumbling Farum Azula | 10620 | 220000 | oui | oui | madness | 16 | 107 | 83 | 95 |
| 8 Sir Gideon Ofnir | Sir Gideon Ofnir, the All-Knowing | — (aucune) | `null` | — | `null` | `null` | `null` | `null` |  | 17 | 113 | — | Non estimé |
| 9 Godfrey / Hoarah Loux | Godfrey, First Elden Lord | Godfrey, First Elden Lord (Leyndell, Ashen Capital) | Leyndell, Ashen Capital | Altus Plateau, Leyndell, Ashen Capital | 21903 | 300000 | `null` | `null` |  | 17 | 113 | 96 | 105 |
| 10 Radagon | Radagon of the Golden Order | Radagon of the Golden Order | Inside the Erdtree | `[]` | 13339 | 500000 | `null` | `null` |  | 18 | 120 | — | 120 |
| 11 Elden Beast | Elden Beast | Elden Beast | Stone Platform | `[]` | 22127 | 500000 | oui | oui | poison, scarlet_rot, blood_loss, frostbite, sleep, madness | 18 | 120 | 120 | 120 |
| D1 Messmer | Messmer the Impaler | Messmer the Impaler Base Serpent Messmer | Shadow Keep | Shadow Keep | 38981 | 400000 | `null` | `null` |  | — | — | 109 | 109 |
| D2 Romina | Romina, Saint of the Bud | Romina, Saint of the Bud | Ancient Ruins of Rauh (Church of the Bud) | Land of the Tower, Ancient Ruins of Rauh | 35798 | 380000 | `null` | `null` |  | — | — | 107 | 107 |
| D3 Promised Consort Radahn | Promised Consort Radahn | Promised Consort Radahn – Radahn, Consort of Miquella | Enir-Ilim (Gate of Divinity) | Land of the Tower, Enir-Ilim | 29987 | 500000 | oui | oui | sleep, madness | — | — | 120 | 120 |

Bilan :
- **PV** présents pour 18 nœuds sur 21. Manquent : Fia's Champions (rencontre de groupe), Godskin Duo, Sir Gideon Ofnir.
- **Runes** présentes pour 19 nœuds sur 21. Manquent : Godskin Duo (la valeur est dans `drops`), Sir Gideon Ofnir.
- **Absorption et résistances** présentes pour 11 nœuds sur 21 : Margit, Godrick, Red Wolf, Rennala, Radahn, Rykard, Morgott, Fire Giant, Maliketh, Elden Beast, Promised Consort Radahn. La matrice des faiblesses ne peut afficher que ces 11.
- **Absorption et résistances absentes** pour 10 nœuds :
  - absentes aussi du wikitext des pages (vérifié le 01/11/2026), soit non documentées par le wiki : Mohg, Godfrey (les deux rencontres), Radagon, Messmer, Romina, Godskin Duo ;
  - documentées par le wiki mais non extraites : Fia's Champions (résistances aux statuts de certains champions individuels), Draconic Tree Sentinel (absorption au niveau de la page, sans rencontre identifiable).
- Messmer : le texte du wiki dit seulement « He also suffers a major weakness to Holy damage » (phase 2), sans valeur.
- **[Data]** Les immunités affichables sont celles de la colonne Immunités. Elden Beast est immunisé aux six statuts. Margit l'est aussi à `death_blight`, une clé que les autres boss n'ont pas.

---

## 6. Correctifs de données proposés

À appliquer seulement sur décision du chef de projet et à consigner dans `data/CHANGELOG.md`.

| # | Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur | URL |
|---|---|---|---|---|---|---|
| C1 | `bosses.json` | `Sir Gideon Ofnir, the All-Knowing` | `encounters` | `[]` | `[{"name": "Sir Gideon Ofnir, the All-Knowing", "location": "Leyndell, Ashen Capital", "regions": ["Altus Plateau", "Leyndell, Ashen Capital"], "source": "Base game", "hp": "6226", "hp_values": [6226], "runes": "150,000", "runes_values": [150000], "drops": ["All-Knowing Set", "Scepter of the All-Knowing"]}]` | https://eldenring.wiki.gg/wiki/Sir_Gideon_Ofnir,_the_All-Knowing (§ Basic Info) |
| C2 | `bosses.json` | `Godskin Duo` · rencontre `Godskin Duo` | `runes` / `runes_values` / `drops` | `null` / `[]` / `["170000 Runes, Smithing-Stone Miner's Bell Bearing [4], Ash of War: Black Flame Tornado"]` | `"170000"` / `[170000]` / `["Smithing-Stone Miner's Bell Bearing [4]", "Ash of War: Black Flame Tornado"]` | https://eldenring.wiki.gg/wiki/Godskin_Duo (champ `drops` de l'infobox). `hp` reste `null` : le wiki ne donne qu'une approximation dans le texte |
| C3 | `bosses.json` | `Draconic Tree Sentinel` · rencontre `… (Outskirts Draconic Tree Sentinel)` | `location` / `regions` | `null` / `[]` | `"Capital Outskirts"` / `["Altus Plateau", "Capital Outskirts"]` | https://eldenring.wiki.gg/wiki/Draconic_Tree_Sentinel (infobox de page « Captial Outskirts », coquille du wiki ; tableau Drops « Capital Outskirts » ; « Guards the Entrance to Leyndell ») |
| C4 | `bosses.json` | `Elden Beast` · rencontre `Elden Beast` | `regions` | `[]` | `["Altus Plateau", "Leyndell, Ashen Capital"]` | https://eldenring.wiki.gg/wiki/Elden_Beast (« encountered inside the Erdtree in Leyndell, Ashen Capital ») |
| C5 | `bosses.json` | `Radagon of the Golden Order` · rencontre du même nom | `regions` | `[]` | `["Altus Plateau", "Leyndell, Ashen Capital"]` | https://eldenring.wiki.gg/wiki/Radagon_of_the_Golden_Order (même phrase) |
| C6 | 11 fichiers (annexe A) | 107 entrées | `regions_mentioned` | contient `"Altus Plateau"` | sans `"Altus Plateau"` | `url` de chaque entrée : le texte d'acquisition ne cite que « Scadu Altus » (défaut de détection de l'extraction) |

L'ordre des `regions` de C1, C3, C4 et C5 suit l'usage de `data/` (région parente d'abord, voir Godfrey et Morgott).

---

## 7. Non vérifiable

- **Niveau recommandé par boss** et **niveau recommandé dans le DLC** : le wiki n'en documente aucun. Seules existent les ancres du § 4.1.
- **Paliers du DLC**, de Weeping Peninsula, Raya Lucaria, Deeproot Depths, Lake of Rot, Moonlight Altar, Capital Outskirts et Forbidden Lands : absents du tableau du wiki.
- **Correspondances de zones** (déductions, non confirmées par le wiki) : Stormhill = « Limgrave (North) », Dragonbarrow = « Caelid (North) », Raya Lucaria en Liurnia South ou North, Wailing Dunes (Radahn) en Caelid West ou South, Godskin Duo en Farum Azula ou Late Farum Azula.
- **Ordre Messmer / Romina** : le wiki ne l'impose pas.
- **Bénédiction recommandée** pour d'autres boss que Messmer : aucune recommandation du wiki.
- **PV de Godskin Duo** : seulement « around 24000 HP (NG) » dans le texte.
- **Absorption et résistances** de Mohg, Godfrey, Radagon, Messmer, Romina et Godskin Duo : absentes des pages.
- **Rang par rencontre** pour Godfrey (Golden Shade et Hoarah Loux) et pour Mohg (the Omen et Lord of Blood) : `data/` ne donne que l'union des rangs de la page.

---

## Annexe A — Entrées où `regions_mentioned` contient `Altus Plateau` à tort (correctif C6)

Critère : le texte de `acquisition` ne contient « Altus » que dans « Scadu Altus ».

- `armor.json` (36) : Armor of Night ; Common Soldier Cloth Armor ; Common Soldier Gauntlets ; Common Soldier Greaves ; Common Soldier Helm ; Dane's Hat ; Death Knight Armor ; Death Knight Gauntlets ; Death Knight Greaves ; Death Knight Helm ; Dryleaf Arm Wraps ; Dryleaf Cuissardes ; Dryleaf Robe ; Dryleaf Robe (Altered) ; Finger Robe ; Gauntlets of Night ; Gravebird Anklets ; Greaves of Night ; Helm of Night ; High Priest Gloves ; High Priest Hat ; High Priest Robe ; High Priest Undergarments ; Highland Attire ; Leather Arm Wraps ; Leather Crown ; Leather Leg Wraps ; Pelt of Ralva ; Rakshasa Armor ; Rakshasa Gauntlets ; Rakshasa Greaves ; Rakshasa Helm ; Verdigris Armor ; Verdigris Gauntlets ; Verdigris Greaves ; Verdigris Helm
- `ashes_of_war.json` (5) : Ash of War: Aspects of the Crucible: Wings ; Ash of War: Carian Sovereignty ; Ash of War: Piercing Throw ; Ash of War: Raging Beast ; Ash of War: Rolling Sparks
- `crafting_materials.json` (2) : Knot Resin ; Shadow Sunflower
- `key_items.json` (20) : Battlefield Priest's Cookbook [2] ; Battlefield Priest's Cookbook [3] ; Bloodsucking Cracked Tear ; Cerulean-Sapping Cracked Tear ; Crimsonburst Dried Tear ; Finger-Weaver's Cookbook [2] ; Forager Brood Cookbook [1] ; Forager Brood Cookbook [4] ; Forager Brood Cookbook [5] ; Forager Brood Cookbook [6] ; Greasemonger's Bell Bearing ; Greater Potentate's Cookbook [3] ; Greater Potentate's Cookbook [4] ; Larval Tear ; Map: Scadu Altus ; Moldmonger's Bell Bearing ; Moore's Bell Bearing ; Oil-Soaked Tear ; Spellmachinist's Bell Bearing ; Ymir's Bell Bearing
- `melee_armaments.json` (15) : Ancient Meteoric Ore Greatsword ; Barbed Staff-Spear ; Black Steel Twinblade ; Bonny Butchering Knife ; Carian Sorcery Sword ; Claws of Night ; Curseblade's Cirque ; Dryleaf Arts ; Forked-Tongue Hatchet ; Iron Cleaver ; Messmer Soldier's Axe ; Rakshasa's Great Katana ; Smithscript Cirque ; Sword of Night ; Tooth Whip
- `ranged_weapons_catalysts.json` (6) : Ansbach's Longbow ; Dryleaf Seal ; Maternal Staff ; Rabbath's Cannon ; Repeating Crossbow ; Shortbow
- `shields_torches.json` (2) : Shield of Night ; Verdigris Greatshield
- `spells.json` (8) : Aspects of the Crucible: Thorns ; Cherishing Fingers ; Fleeting Microcosm ; Giant Golden Arc ; Glintstone Pebble ; Golden Arcs ; Heal from Afar ; Impenetrable Thorns
- `talismans.json` (5) : Arrow's Soaring Sting Talisman ; Flamedrake Talisman +3 ; Lacerating Crossed-Tree ; Retaliatory Crossed-Tree ; Verdigris Discus
- `tools.json` (6) : Blessing of Marika ; Golden Vow ; Messmerfire Grease ; Opaline Pickled Liver ; Roundrock ; Well-Pickled Turtle Neck
- `upgrade_materials.json` (2) : Revered Spirit Ash ; Scadutree Fragment
