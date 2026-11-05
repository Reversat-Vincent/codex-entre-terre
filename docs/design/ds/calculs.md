# Méthodes de calcul

> Document tenu par le projet depuis le 01/11/2026 : il s'écarte de l'artefact du design system (voir `docs/design/VERSION.md`). Sources des corrections : `docs/contenu/verification-calculs.md`, `docs/contenu/decisions-progression.md` et `docs/contenu/verification-socle.md` (décision D39).

Toute valeur produite par l'application porte le badge **Calculé** et renvoie à l'une de ces méthodes dans son panneau « Pourquoi ? ». Les pondérations ci-dessous étaient celles du prototype : elles sont regroupées dans une configuration unique, `src/engine/config/` (chaque valeur commentée), et doivent rester décrites ici quand elles changent. Une valeur calculée à partir d'une estimation hérite de l'estimation ; un `null` reste un `null`, jamais un 0.

Étiquettes utilisées quand la source les distingue : **[wiki]** fait publié par le wiki · **[déduction]** conséquence logique de faits du wiki ou de `data/` · **[estimation]** valeur approchée de l'application · **[conception]** choix du projet.

## Étape de progression d'une arme

Cinq étapes : Début, Milieu, Fin, Fin de jeu, DLC. La table complète région → étape (79 valeurs réelles de `data/`, option A du § 1.3 de `decisions-progression.md`) est dans `src/engine/config/stages.ts`. Placements principaux [conception] :

- **Début** : Limgrave, Weeping Peninsula, Stormhill, Stormveil Castle, Castle Morne, Roundtable Hold.
- **Milieu** : Liurnia of the Lakes, Academy of Raya Lucaria, Caelid, Altus Plateau, **Mt. Gelmir**, Capital Outskirts, Siofra River, Ainsel River, Nokron, Deeproot Depths, Lake of Rot, Redmane Castle.
- **Fin** : Leyndell, Royal Capital, **Volcano Manor**, **Dragonbarrow** (`Greyoll's Dragonbarrow` compris), Mountaintops of the Giants, Forbidden Lands, Flame Peak, Nokstella, Subterranean Shunning-Grounds, Castle Sol.
- **Fin de jeu** : Crumbling Farum Azula, **Consecrated Snowfield**, **Mohgwyn Palace**, Miquella's Haligtree, Elphael, Leyndell, Ashen Capital.
- **DLC** : une seule étape, de Gravesite Plain à Enir-Ilim. Sa sous-zone est une **clé de tri** dans la colonne, pas une étape : Entrée (Gravesite Plain, Castle Ensis, Belurat, Cerulean Coast, Charo's Hidden Grave, Stone Coffin Fissure, Jagged Peak ; `Land of the Tower` et `Realm of Shadow`, trop génériques, y sont rattachés), Cœur (Scadu Altus, Abyssal Woods, Shadow Keep, Scaduview, Rauh Base, Ancient Ruins of Rauh, Midra's Manse), Enir-Ilim (Enir-Ilim, Gate of Divinity).

Règles de résolution, appliquées dans cet ordre à une arme :

0. **Surcharge d'étape** (D39) : une condition d'obtention documentée par le wiki rend l'objet obtenable plus tard que son lieu ne l'indique. La table `STAGE_OVERRIDES` de `stages.ts` donne l'étape (et la sous-zone DLC) avec la page du wiki ; elle passe avant toutes les autres règles, et le « Pourquoi ? » la cite (limite `stage-override`, page du wiki dans les données utilisées). Les lieux de `data/` restent exacts : c'est la condition qui manque aux données, d'où une surcharge plutôt qu'un correctif de données.
   - Clinging Bone → **Milieu** [wiki + déduction] : Ensha of the Royal Remains ne l'envahit qu'après une moitié du Haligtree Secret Medallion, dont celle d'Old Albus au Village of the Albinaurics (Liurnia of the Lakes) ([Ensha of the Royal Remains](https://eldenring.wiki.gg/wiki/Ensha_of_the_Royal_Remains)).
   - Spiraltree Seal → **DLC, Enir-Ilim** [wiki] : « only acquire this item after having burned the sealing tree past the Church of the Bud » ([Spiraltree Seal](https://eldenring.wiki.gg/wiki/Spiraltree_Seal)).
1. **Remembrance** : si l'arme est un choix d'échange de Remembrance, elle prend l'étape de la rencontre qui donne cette Remembrance (voir ci-dessous).
2. **Acquisitions** (équipements de départ ignorés). On rassemble :
   - les `acquisition[].location`, découpés sur ` / ` ; chaque valeur se résout par la table, sinon par le suffixe entre parenthèses `X (Région)`, sinon par `locations.json[name].region` sans sa parenthèse, sinon par `npcs.json[name].listed_region` (exemple : `Twin Maiden Husks` → `Roundtable Hold`) ;
   - les `acquisition[].region`, découpés sur `/`.
   On retire les valeurs qui sont la région parente d'une autre valeur de la liste (`locations.json`), pour garder la **région la plus précise** (exemple : `Mt. Gelmir` + `Volcano Manor` → `Volcano Manor`), puis on retient l'étape la plus précoce parmi les valeurs restantes.
3. **Plusieurs acquisitions** : on retient la plus précoce.
4. **Repli** `regions_mentioned`, si aucune acquisition ne donne d'étape : même traitement (régions parentes retirées, étape la plus précoce). `Altus Plateau` est ignoré quand le texte d'acquisition ne contient « Altus » que dans « Scadu Altus » (défaut d'extraction signalé : correctif C6 de `decisions-progression.md`).
5. **Étiquette DLC** : `source = "Shadow of the Erdtree"` impose l'étape DLC. Sans sous-zone trouvée, l'arme est « DLC non localisé », triée en fin de colonne DLC (D18).
6. `Roundtable Hold` compte comme Début. Les échanges de Remembrance passent par la règle 1.
7. Un équipement de départ compte pour l'origine retenue seulement, comme une acquisition de Début : une arme qui n'a que des équipements de départ (Broadsword, Halberd) est rattachée à l'origine qui la donne. Les autres cas restent **Non classé** (badge Non documenté) : l'arme est hors des colonnes (3 à 5 armes affichées par étape), n'a pas de score (D18) et reste visible dans le tableau plein écran.

Les régions des objets sont celles du champ dérivé `derived.regions` (régions parentes déjà retirées par la préparation des données). Pour une rencontre de boss, le moteur retire lui-même les régions parentes de `encounters[].regions` avec une copie de la hiérarchie de `locations.json` (`REGION_PARENT` de `stages.ts`, contrôlée par un test). Depuis le correctif L1 (D39), Crumbling Farum Azula a pour parent Mountaintops of the Giants : ses rencontres (Godskin Duo, Maliketh, Placidusax…) et leurs Remembrances (Maliketh's Black Blade, Dragon King's Cragblade) tombent en **Fin de jeu**.

### Étape courante du joueur
- Mode « Étape » : l'étape choisie.
- Mode « Régions atteintes » : l'étape la plus avancée des régions cochées (Début si aucune n'est dans la table).
- Mode « Boss vaincus » : l'étape de la rencontre du prochain boss de la frise (règle 2 appliquée à ses `regions`, voir « Frise des boss ») ; l'histoire finie, Fin de jeu, ou DLC si le DLC est activé et sa voie terminée.

Avec les données du 31/10/2026 et le moteur du 05/11/2026 [data] : **466 armes sur 487** reçoivent une étape par ces règles, plus Broadsword et Halberd quand leur origine est retenue (contre 192 au plus avec `acquisition[].region` seul).

### Remembrances
- Les armes et objets obtenus par échange de Remembrance sont reliés à leur boss par une **table explicite**, `src/engine/config/remembrances.ts` (§ 2.2 de `decisions-progression.md`) : objet → Remembrance → boss → rencontre. Elle couvre 52 objets et 25 Remembrances ; un test contrôle que chaque référence existe dans `data/`.
- Étape du boss : règle 2 appliquée aux `encounters[].regions` de la rencontre. Elden Beast, qui avait `regions = []`, a reçu `Altus Plateau` et `Leyndell, Ashen Capital` par le correctif C4 (`data/CHANGELOG.md`) : il tombe en Fin de jeu sans exception.
- Exemple : Blasphemous Blade → Remembrance of the Blasphemous → Rykard, Lord of Blasphemy → `Mt. Gelmir` + `Volcano Manor` → Volcano Manor → **Fin**.
- Étapes des Remembrances [conception] : Début, Godrick · Milieu, Regal Ancestor Spirit, Astel, Lichdragon Fortissax, Rennala, Starscourge Radahn · Fin, Fire Giant, Rykard, Morgott · Fin de jeu, Mohg, Malenia, Maliketh, Godfrey (Hoarah Loux), Placidusax, Elden Beast · DLC, les 10 autres (sous-zones : Entrée pour Divine Beast Dancing Lion, Rellana et Putrescent Knight ; Cœur pour Commander Gaius, Scadutree Avatar, Romina, Midra, Metyr et Messmer ; Enir-Ilim pour Promised Consort Radahn).

## Score de recommandation d'une arme (0–100)

Quatre composantes de 0 à 25, arrondies puis additionnées.

1. **Adéquation au build** : moyenne pondérée des lettres de scaling (S = 1 ; A = 0,85 ; B = 0,7 ; C = 0,55 ; D = 0,4 ; E = 0,25 ; pas de scaling = 0) selon les poids de l'archétype (ou les poids automatiques, voir « Build cible »), ramenée sur 25 (une moyenne de 0,5 vaut 25), plafonnée à 25. Les lettres sont celles de `scaling`, c'est-à-dire à +0 en affinité Standard ; elles ne reflètent ni le niveau d'amélioration ni l'affinité choisie. Ces poids sont une pondération du score, pas les coefficients du jeu. Pénalité de 4 par attribut hors build (poids nul) dont le prérequis dépasse 10, de 7 s'il dépasse 20. Bonus de 4 si l'effet passif correspond au statut privilégié (`status_buildup` de ce statut non nul ; un statut absent de `status_buildup` n'est pas compté, même s'il est décrit dans `passive_effects`), de 2 si la classe (`category`) est préférée (−2 sinon, quand une préférence existe).
2. **Puissance et scaling** : `25 × 0,7 × min(1, puissance / plafond) + 25 × 0,3 × min(1, Σ lettres / 1,6)`, −4 si l'arme dépasse le budget de poids (voir « Budget de charge » ; sans table de charge, pas de malus et une limite est affichée).
   - Armes de mêlée, à distance, boucliers : attaque de base totale à +0 (plafond 200).
   - Catalyseurs (Staves, Sacred Seals) : puissance de sort à +0 (`sorcery_scaling` pour les Staves, `incantation_scaling` pour les Sacred Seals), car leur attaque physique est faible et ne dit rien de leur valeur. Plafond par catégorie (D18) = maximum observé dans les données chargées pour ce champ et cette catégorie (162 pour les Staves, 137 pour les Sacred Seals au 31/10/2026), calculé au chargement. Le Staff of the Great Beyond, qui a aussi une puissance d'incantation, est lu sur `sorcery_scaling` comme les autres Staves. Une puissance de sort `null` rend la composante `null` (et le total), jamais 0.
3. **Accessibilité** : 25, moins 4 par étape d'avance sur l'étape du joueur, moins 0,6 par point d'attribut manquant (plafond 9 ; points manquants = somme des écarts de « Prérequis comparés au profil », à deux mains en Force réelle), moins 4 pour un échange de Remembrance, moins 1 pour un butin de PNJ envahisseur, plus 2 si l'arme est l'équipement de départ de l'origine retenue. Une arme **Non classé** n'a pas d'étape : la composante vaut `null`, le total aussi ; l'arme est triée en dernier et visible seulement en plein écran (D18).
   - **Butin de PNJ envahisseur** : l'arme figure dans les `drops` d'une rencontre d'un boss dont le rang (`tier`) contient `Invaders and other minibosses`. Champ dérivé `invaderDrop`, calculé au chargement (aucun indicateur de ce type dans `acquisition_flags`).
   - **Équipement de départ de l'origine choisie** : jointure entre le nom de l'arme et `origins.json`, `starting_equipment` de l'origine (`acquisition_flags.starting_equipment` ne dit pas de quelle origine il s'agit).
4. **Coût d'amélioration** : 20 pour des pierres sombres (+10, une pierre par niveau), 16 pour des pierres normales (+25). Préférence de pierres : +5 pour le type préféré, −6 pour l'autre. −2 quand le type d'amélioration est une estimation. Cas sans type : type non documenté et sans estimation → **14**, sans préférence de pierres ; arme non améliorable (`"Not upgradeable"`) → **8**.

Chaque composante est arrondie à l'entier le plus proche puis bornée à 0–25. Le score est calculé à +0 : il ne tient compte ni du niveau d'amélioration ni des Cendres de guerre. Il hérite du badge Estimation quand le type d'amélioration est une estimation.

**Candidats selon le style de jeu** (`weaponPools.ts`) : mêlée → armes de mêlée ; distance → Light Bows, Bows, Greatbows, Crossbows, Ballistas ; magie → **Staves si le build a un poids en Intelligence, Sacred Seals s'il en a un en Foi, les deux s'il en a dans les deux (build hybride) ou dans aucun** (D39 ; `MAGIC_CATALYST_ATTRIBUTE`) [wiki : les sceaux ne tirent que de la Foi, les bâtons de l'Intelligence] ; hybride → armes de mêlée et tout le fichier des armes à distance et catalyseurs. Les boucliers et les torches ne sont candidats que si leur classe est préférée, quel que soit le style.

Filtres appliqués avant le score, dans cet ordre (la première raison qui s'applique est comptée) : contenus désactivés (Shadow of the Erdtree, Tarnished Pack), exclusions lues dans `acquisition_flags` (Remembrance : `remembrance_weapon` ou table des Remembrances ; butin aléatoire : `random_enemy_drop` ; quête : `npc_or_quest_related`), estimations exclues si la fiabilité l'impose (`derived.upgrade.reliability = estimate`). Une exclusion porte sur l'indicateur de l'arme, même si elle a d'autres acquisitions [conception, prototype]. Les armes masquées sont comptées par raison et restent affichables grisées en plein écran.

Consultée hors du widget A (fiche arme, comparateur ; getter `scoreOf` du store `analysis`), une arme masquée par un filtre ou hors du style choisi reçoit le même score, calculé avec l'origine retenue ; le « Pourquoi ? » donne la raison qui l'écarte des recommandations (limite). Une arme « Non classé » reste sans score (D18).

### Armes efficaces contre une rencontre
Fiche boss, « Pour votre profil » (getter `weaponsAgainst(clé de rencontre)` du store `analysis`, fonction `weaponsAgainst` de `weakness.ts`) [conception] :
- Faiblesses : les **2** types de dégâts les moins absorbés par la rencontre (`damage_negation_percent`, ex æquo dans l'ordre standard, frappe, tranchant, perforant, magie, feu, foudre, sacré), autant qu'un nœud de la frise en affiche (`WEAKNESS_WEAPONS.bestTypes`, `weights.ts`).
- Types infligés par une arme, à +0 : les types physiques de `attack_type` (Standard, Strike, Slash, Pierce) si l'attaque physique est non nulle, et chaque type élémentaire dont l'attaque (`attack_power`) est non nulle. Ni l'affinité, ni les Cendres de guerre, ni les sorts ne sont comptés (limite affichée).
- Armes retenues : les armes évaluées pour les critères courants (scores définitifs du widget A), visibles et classées (une arme « Non classé » n'a pas de score, D18), qui infligent l'une des faiblesses ; triées par rang de la faiblesse puis par score, **5** au plus (`WEAKNESS_WEAPONS.max`). Chaque arme porte le type exploité, l'absorption, son attaque à +0 pour ce type (attaque physique pour un type physique) et ses prérequis comparés au profil. La liste hérite de l'estimation des scores retenus.
- Absorption non documentée (Mohg) : liste vide et limite « absorption non documentée », aucune suggestion.

### Budget de charge
- Budget de poids d'une arme = `arrondi(charge × ratio × 0,25, 1 décimale)`, où la charge est lue dans la table Endurance → charge d'équipement (voir « Statistiques dérivées ») pour l'Endurance du profil, et le ratio vaut 0,3 (charge légère), 0,7 (moyenne) ou 1 (lourde) [conception, prototype].
- Exemple : Endurance 25 (charge 72,0), charge moyenne → `arrondi(72,0 × 0,7 × 0,25)` = 12,6.

### Recommandations par étape
- Chaque colonne d'étape affiche les 5 meilleures armes visibles de l'étape (score décroissant, puis nom) ; la colonne DLC ordonne ensuite ces 5 armes par sous-zone (Entrée, Cœur, Enir-Ilim, puis « DLC non localisé ») et par score.
- Sous 3 armes, la colonne propose les élargissements les plus efficaces : pour chaque raison de masquage (contenu, Remembrance, butin aléatoire, quête, estimations) et pour le style (armes de l'étape hors du style choisi, parmi les fichiers chargés), le nombre d'armes qu'il ferait apparaître, du plus grand au plus petit.
- Alternatives à une arme : les armes visibles à une étape d'écart au plus, de la plus proche en étape à la plus lointaine, puis par score ; 4 au plus [conception, prototype].

## Prérequis comparés au profil

- Un prérequis est atteint si l'attribut du profil est supérieur ou égal à la valeur demandée.
- À deux mains, la Force effective vaut `floor(STR × 1,5)` (en entiers : `STR + floor(STR / 2)`). La puce l'indique (« 2M ») et l'écart affiché est exprimé en Force réelle : `max(0, ceil(2 × prérequis / 3) − STR)`, soit en entiers `floor((2 × prérequis + 2) / 3) − STR`. [wiki] Les pages d'armes confirment `floor` (Igon's Greatbow, prérequis 23 : « effectively always 16 ») ; la phrase « rounded up » de la page Strength est une incohérence du wiki.
- **Pas de bonus** pour les armes sans posture à deux mains : catégories Fists, Claws, Hand-to-Hand, Throwing Blades, Backhand Blades, Beast Claws, Perfume Bottles, et armes appariées de la liste « Armaments without a two-handed stance » de la page Paired Weapons (Smithscript Dagger, Ornamental Straight Sword, Rellana's Twin Blades, Greatsword of Radahn (Lord / Light), Falx, Dancing Blade of Ranah, Horned Warrior's Sword, Smithscript Cirque, Curseblade's Cirque, Death Knight's Twin Axes). La **Starscourge Greatsword** fait exception et reçoit le bonus.
- Les **Greatbows** et les **Ballistas** se manient toujours à deux mains : la Force effective s'y applique d'office et la bascule 1M / 2M est masquée.
- Aucun champ de `data/` n'indique ces cas : ils se déduisent de `category` et d'une liste de configuration (`src/engine/config/twoHanded.ts`). Non vérifié sur le wiki : le maniement obligatoire à deux mains des Light Bows, Bows et Crossbows (la bascule y reste disponible).
- Exemples (Force réelle nécessaire à deux mains) : Igon's Greatbow (23) → 16, avec STR 15 la Force effective vaut 22 et l'écart affiché 1 ; Greatbow (20) → 14 ; Golem Greatbow (24) → 16 ; Lion Greatbow (22) → 15 ; Hand Ballista (30) → 20 ; Jar Cannon (34) → 23 ; Rabbath's Cannon (28) → 19.

## Origine optimale

- Niveau final pour une cible : `Σ max(attribut de départ, attribut cible) − 79` (toutes les origines vérifient niveau = somme des attributs − 79).
- Points gaspillés : `Σ max(0, attribut de départ − attribut cible)`.
- Identité : niveau final = `(Σ attributs cibles − 79)` + points gaspillés. Les points gaspillés ne départagent donc jamais deux origines pour une même cible : ils restent affichés, mais ne sont pas un critère de tri.
- Tri : niveau final croissant, puis adéquation précoce décroissante, puis nom.
- **Adéquation précoce** [conception] : somme des attributs de départ **pondérés par les poids du build** (`Σ poids × attribut de départ`, arrondie à 2 décimales ; D39, le prototype les additionnait sans poids), plus 5 si l'équipement de départ (`starting_equipment.Armaments`, quantités retirées) contient une arme recommandée, c'est-à-dire l'une des armes affichées dans les colonnes du widget A par les scores préliminaires.
- **Ordre d'évaluation** (architecture § 5.4) : scores des armes sans bonus d'origine (ou avec l'origine choisie si elle n'est pas « Automatique ») → classement des origines, départagé par ces armes recommandées → origine retenue (rang 1 en mode « Automatique ») → scores définitifs avec le bonus d'équipement de départ de l'origine retenue. Le « Pourquoi ? » du classement le mentionne. Sans build cible, aucune origine n'est classée ni retenue en mode « Automatique » ; les armes qui n'ont que des équipements de départ restent alors Non classé.
- Seules les origines des contenus activés sont classées (Idus Knight et Heavy Knight demandent le Tarnished Pack).
- Préconditions : chaque attribut cible est compris entre 1 et 99 ; un attribut ne descend jamais sous sa valeur de départ.
- Cas de test (ordre VIG, MND, END, STR, DEX, INT, FAI, ARC ; résultat : niveau final, points gaspillés) :
  - A : 40, 10, 20, 14, 13, 9, 9, 7 → Vagabond (43, 0) ; Heavy Knight (46, 3) ; Samurai (47, 4) ; Wretch (48, 5) ; Prophet et Astrologer (57, 14).
  - B : 40, 20, 15, 8, 12, 60, 7, 9 → Astrologer (92, 0) ; Prisoner (97, 5) ; Wretch (98, 6) ; Prophet (105, 13).
  - C : 40, 25, 20, 12, 10, 7, 60, 10 → Prophet (105, 0) ; Wretch (108, 3) ; Confessor et Heavy Knight (109, 4).
  - Cible = attributs du Wretch → Wretch (1, 0).
  - Adéquation précoce, archétype `str` (poids STR 1, DEX 0,2) au niveau 150 : Vagabond 14 + 0,2 × 13 = **16,6**, Samurai 12 + 0,2 × 15 = **15** ; tous deux au niveau 150 sans point gaspillé, le Vagabond passe devant (la somme brute les mettait à égalité, 27).

## Build cible

Quand un archétype est choisi, les attributs cibles du niveau cible `L` se déduisent des gabarits du prototype (`Main.dc.html`, `ARCH`, `FLOOR`, `targetFor`, `autoW`), transcrits dans `src/engine/config/archetypes.ts`. Ordre des attributs : VIG, MND, END, STR, DEX, INT, FAI, ARC. Les poids `w` sont ceux du score (composante 1).

| Identifiant | Nom | Poids | Gabarit au niveau 150 |
|---|---|---|---|
| `str` | Force | STR 1 ; DEX 0,2 | 60, 15, 31, 80, 16, 9, 9, 9 |
| `dex` | Dextérité | DEX 1 ; STR 0,3 | 60, 15, 30, 16, 80, 9, 9, 10 |
| `qual` | Qualité | STR 1 ; DEX 1 | 58, 14, 28, 55, 55, 7, 6, 6 |
| `int` | Intelligence | INT 1 ; DEX 0,2 | 50, 38, 18, 12, 18, 80, 7, 6 |
| `fai` | Foi | FAI 1 ; STR 0,3 | 50, 35, 20, 16, 12, 7, 80, 9 |
| `arc` | Arcane | ARC 1 ; DEX 0,4 | 55, 25, 25, 12, 30, 9, 13, 60 |
| `dexarc` | Dextérité / Arcane | DEX 1 ; ARC 1 | 60, 15, 25, 14, 50, 9, 8, 48 |
| `intdex` | Intelligence / Dextérité | INT 1 ; DEX 1 | 55, 25, 20, 12, 45, 55, 8, 9 |
| `intfai` | Intelligence / Foi | INT 1 ; FAI 1 | 50, 30, 18, 12, 12, 50, 50, 7 |
| `strfai` | Force / Foi | STR 1 ; FAI 1 | 55, 20, 25, 55, 15, 7, 45, 7 |

- Plancher `FLOOR` = 9, 8, 8, 8, 9, 7, 6, 6 (somme 61, soit un total de 61 points d'attributs).
- Répartition `targetFor(archétype, L)` : `S = L + 79` (somme des attributs), `k = (S − 61) / 168`. Valeur brute de chaque attribut : `FLOOR[i] + (gabarit[i] − FLOOR[i]) × k`. Chaque brute est arrondie à l'entier inférieur ; le reste `S − Σ parties entières` est distribué, un point chacun, aux attributs de plus grande partie fractionnaire (tri décroissant, ex æquo dans l'ordre des attributs). Résultat borné à 1–99. Au niveau 150, `k = 1` et la cible est le gabarit.
- Poids automatiques `autoW(attributs du profil)`, sans archétype : pour chacun de STR, DEX, INT, FAI, ARC dont la valeur dépasse 12, poids = valeur − 10 ; si aucun ne dépasse 12, poids STR = 1. Tous les poids sont ensuite divisés par le plus grand et arrondis à deux décimales (`round(p / max × 100) / 100`, demi vers le haut).
- Le gabarit est un choix de conception du prototype, pas une donnée du jeu : la cible porte le badge Calculé (pas Estimation) et une limite le rappelle. Le niveau calculé reste `Σ attributs − 79`. Au-delà du niveau où un attribut atteindrait 99, la borne s'applique et la somme n'atteint plus `L + 79` (limite affichée).

## Priorités de montée de niveau

Widget B (brief § 5.2 B), décision D42 [conception]. Où placer les prochains points d'attributs, dans cet ordre :

1. **Prérequis de l'arme** : les prérequis non atteints de la meilleure arme recommandée de l'étape courante (la mieux notée de la colonne du widget A, quel que soit l'ordre d'affichage de la colonne DLC), dans l'ordre STR, DEX, INT, FAI, ARC. Valeur visée en points réels, selon « Prérequis comparés au profil » : à deux mains, la Force réelle qui donne la Force effective demandée [wiki].
2. **Vigor** jusqu'au premier palier publié, **40** ([Vigor](https://eldenring.wiki.gg/wiki/Vigor), voir « Rendement des attributs ») [wiki], si elle est en dessous.
3. **Build cible** : pour chaque autre attribut, `écart = max(0, cible − actuel)` multiplié par son poids (« Build cible ») ; VIG, MND et END, qu'aucun archétype ne pondère, reçoivent le poids **0,5** ; les autres attributs hors build, 0. Priorités par produit décroissant, ex æquo dans l'ordre des attributs, valeur visée = attribut cible.

- Un attribut n'apparaît qu'une fois, retenu par la première règle qui s'applique (Vigor visée à 40 par la règle 2, puis à sa cible quand 40 est atteint).
- **4** priorités au plus, chacune avec l'attribut, sa valeur actuelle, la valeur visée et sa raison (code de composante). Sans build cible, seules les règles 1 et 2 s'appliquent (limite affichée). Sans arme recommandée à l'étape, la règle 1 ne donne rien (limite affichée).
- Badge Calculé et « Pourquoi ? ». La liste hérite de l'estimation du score de l'arme quand la règle 1 retient un de ses prérequis : le choix de l'arme en dépend.
- Réglages : `LEVEL_UP_PRIORITIES` de `config/weights.ts` (4 priorités, poids 0,5, attributs VIG, MND, END) ; palier de Vigor : `PUBLISHED_SOFT_CAPS` de `config/softCaps.ts`.
- Cas de test : profil Vagabond (VIG 15, MND 10, END 11, STR 14, DEX 13 ; `origins.json`), build `str` au niveau 150 (cible VIG 60, MND 15, END 31, STR 80), meilleure arme de l'étape demandant STR 20 (cas fictif) → STR 20 (prérequis) ; VIG 40 (palier) ; STR déjà retenue, puis END 31 (écart 20 × 0,5 = 10), MND 15 (écart 5 × 0,5 = 2,5) ; DEX (écart 3 × 0,2 = 0,6) n'entre pas, la liste étant pleine.

## Niveau recommandé d'un boss et préparation

Le wiki ne publie aucun niveau recommandé par boss. Le niveau est une **estimation** [estimation] ; il suit la méthode M3 ci-dessous. Ses repères du wiki : [wiki] « Level 120 (+/- 10) » pour finir le jeu, la plupart des joueurs entre 150 et 170 ; le guide attend au moins 60 à Dragonbarrow et environ 100 aux Mountaintops of the Giants. Les PV sont affichés dans la fiche mais **n'entrent pas dans le calcul** : ils ne suivent pas la progression (Sir Gideon Ofnir, 6 226 PV, vaut Godrick, 6 080 ; Rykard phase 1, 30 439, dépasse Elden Beast, 22 127).

### M1 : palier de zone du wiki
- Entrée : palier de la zone de la rencontre dans le tableau « Enemy "Leveling" System » de la page Recommended Level by Location (T1 à T21), tiré d'une table de configuration (`src/engine/config/bossLevel.ts`).
- Ancres, interpolation linéaire entre elles, résultat arrondi à l'entier le plus proche (0,5 vers le haut) : T1 = 10 [conception : niveau maximal d'une origine] ; T13 = 60 [wiki + déduction : minimum du guide à Dragonbarrow] ; T15 = 100 [wiki : guide, Mountaintops] ; T18 = 120 [wiki + déduction : niveau moyen de fin de jeu]. Au-delà de T18, la pente du dernier segment est prolongée (+6,67 par palier).
- Paliers des boss de la frise : faits du wiki : Godrick T5, Rykard T13, Mohg T19, Godfrey (Golden Shade) et Morgott T12, Fire Giant T15, Sir Gideon Ofnir et Hoarah Loux T17 · déductions : Margit T4, Radagon et Elden Beast T18, Maliketh T16 · choix (plus bas palier quand il y en a plusieurs) : Red Wolf of Radagon et Rennala T7, Starscourge Radahn T10, Godskin Duo T15 · région parente : Draconic Tree Sentinel T11 · sans palier : Fia's Champions et boss du DLC.
- Autres rencontres (fiche boss) : palier de la région la plus précise de `encounters[].regions` dans la table des zones de `bossLevel.ts`, sinon celui de sa région parente ; le plus bas quand plusieurs régions en ont un ; sans palier, M1 n'existe pas.
- Limites : aucun palier pour le DLC, Deeproot Depths, Weeping Peninsula, Raya Lucaria, Capital Outskirts, Forbidden Lands ; ambiguïtés de zone ; saut de 60 à 100 entre T13 et T15 (T13 est un minimum, T15 un niveau « around »).

### M2 : runes NG
- Entrée : `runes_values` de la rencontre retenue. Radagon est exclu (ses runes sont celles d'Elden Beast).
- Niveau = plus petit `L` tel que `k × coût(L) ≥ runes`, avec `coût(L)` lu dans la table des coûts (section « Coût en runes d'un niveau ») et `k = 500 000 / coût(120) = 500 000 / 92 115` ≈ 5,428 : `k` est calé pour qu'Elden Beast (500 000 runes) vaille 120 [conception]. En arithmétique entière : `coût(L) × 500 000 ≥ runes × 92 115`.
- Limites : les runes ne mesurent pas la difficulté ; la méthode sous-estime le milieu de partie (Draconic Tree Sentinel 39) ; elle demande des runes non nulles.

### M3 : hybride (méthode retenue)
- Niveau = `arrondi((M1 + M2) / 2)` (0,5 vers le haut) si les deux existent ; sinon celle qui existe ; **Non estimé** sans l'une ni l'autre (rencontre absente de `data/`). Le « Pourquoi ? » donne M1, M2 et leurs données.
- M2 lit la première valeur de `runes_values` (combat principal : Limgrave pour Margit).
- Cas de test (M1 / M2 → M3) : Margit 23 / 18 → 21 · Godrick 27 / 24 → 26 · Red Wolf 35 / 19 → 27 · Rennala 35 / 34 → 35 · Radahn 48 / 46 → 47 · Rykard 60 / 64 → 62 · Mohg 127 / 111 → 119 · Draconic Tree Sentinel 52 / 39 → 46 · Fia's Champions — / 34 → 34 · Godfrey (Golden Shade) 56 / 50 → 53 · Morgott 56 / 61 → 59 · Fire Giant 100 / 75 → 88 · Godskin Duo 100 / 73 → 87 (runes 170 000 depuis le correctif C2, PV toujours `null`) · Maliketh 107 / 83 → 95 · Sir Gideon Ofnir 113 / 69 → 91 (rencontre ajoutée par le correctif C1) · Godfrey (Hoarah Loux) 113 / 96 → 105 · Radagon 120 / — → 120 · Elden Beast 120 / 120 → 120.
- Le cas « Non estimé » reste celui d'une rencontre absente de `data/`, ou sans palier ni runes.

### Boss du DLC
- Niveau recommandé : **niveau d'entrée du DLC**, le plus haut des M3 de Starscourge Radahn et de Mohg, Lord of Blood (le DLC exige ces deux boss) : **119** avec les données actuelles, pour tous les boss du DLC. [wiki] La difficulté du DLC est portée par la bénédiction (« regardless of your level »).
- **Bénédiction de l'Arbre-Ombre recommandée** [estimation, méthode B2] : le wiki recommande environ 13 fragments pour Messmer (« more or less »), seule ancre disponible. Fragments recommandés = `arrondi(13 × fragments du chemin / 33)`, où le chemin compte les fragments des zones principales [conception] : Entrée = Gravesite Plain, 10 ; Cœur = Gravesite Plain + Scadu Altus + Shadow Keep, 33 ; Enir-Ilim = Cœur + Rauh Base + Ancient Ruins of Rauh + Enir-Ilim, 42. Les zones annexes (Cerulean Coast, Charo's Hidden Grave, Stone Coffin Fissure, Jagged Peak, Abyssal Woods) sont exclues.
  - Entrée : `arrondi(13 × 10 / 33)` = **4** fragments · Cœur : **13** · Enir-Ilim : **17**.
  - Le niveau de bénédiction est lu dans la table `tables.scadutreeBlessing` du fichier `tables` (D37), préparée depuis `mechanics.json` (sujet `Scadutree Fragment`, section « Scadutree Blessing Level », colonne « Total Fragments Required » ; « 12 (Softcap) » lu 12) : le plus haut niveau dont le total requis est inférieur ou égal au nombre de fragments (13 → niveau 7, 17 → niveau 9, 4 → niveau 2). Tant que le fichier `tables` n'est pas chargé, les fragments sont affichés sans niveau.
  - Sous-zone d'une rencontre du DLC : la plus précoce de ses régions les plus précises (Messmer : Shadow Keep → Cœur ; Romina : Ancient Ruins of Rauh → Cœur ; Promised Consort Radahn : Enir-Ilim ; Rellana : Castle Ensis → Entrée). La recommandation est simplifiée par sous-zone (D14) : Romina reçoit celle du Cœur (13 fragments, niveau 7).
  - Le panneau « Pourquoi ? » affiche aussi le maximum atteignable avec tous les fragments du chemin de la sous-zone : Entrée 10 fragments, niveau **5** ; Cœur 33, niveau **14** (Messmer comme Romina) ; Enir-Ilim 42, niveau **17**.
- La bénédiction n'entre pas dans la préparation, qui ne porte que sur le niveau.

### Préparation et jauge
- Préparation : **Prêt** si niveau ≥ recommandé ; **Limite** si niveau ≥ recommandé − 8 ; **Trop tôt** sinon ; **Non estimé** si le boss n'a pas de données de combat.
- Jauge : échelle de 0 à `max(recommandé + 30, niveau + 12, 60)`. Sans niveau recommandé (« Non estimé »), l'échelle vaut `max(niveau + 12, 60)` pour que le repère du joueur reste visible, et aucun repère de recommandation n'est tracé.

## Frise des boss

La frise suit la page Bosses du wiki (section « Mandatory bosses »), dans l'ordre. Sa configuration est dans `src/engine/config/timeline.ts` (étapes, nœuds, entrées exactes de `bosses.json`, prérequis, voie DLC). Les indicateurs de `bosses.json` (`mandatory_base_game`, `required_to_access_dlc`, `mandatory_dlc`, `shardbearer`) sont posés sur la page, pas sur la rencontre : la rencontre retenue se lit dans la configuration, et ses `drops` disent si elle donne une Remembrance ou une Grande Rune.

1. **Deux porteurs de Grande Rune parmi cinq** (« N parmi M ») : Godrick, Rennala, Starscourge Radahn, Rykard, Mohg. Prérequis :
   - Godrick : Margit, the Fell Omen (puis le château de Stormveil) ;
   - Rennala : Red Wolf of Radagon (puis l'Académie de Raya Lucaria ; l'Academy Glintstone Key est un objet, pas un boss) ;
   - Radahn : sous-nœud textuel « parler à Jerren à Redmane Castle » (après l'Altus Plateau ou le duo Crucible Knight / Misbegotten Warrior) ;
   - Rykard : sous-nœud textuel « Tanith (ses trois contrats) ou Godskin Noble » ;
   - Mohg : sous-nœud textuel « Varré ou Consecrated Snowfield » (avant Leyndell, seule la voie de Varré est ouverte [déduction]).
   Les sous-nœuds textuels ne reçoivent aucun calcul de niveau.
2. **Draconic Tree Sentinel ou Fia's Champions** (« ou ») : le Sentinel peut être contourné par le portail du trône du Prince de la Mort, à Deeproot Depths. Entrée retenue pour le Sentinel : la rencontre de Capital Outskirts, pas celle de Farum Azula.
3. Godfrey (Golden Shade) · 4. Morgott · 5. Fire Giant · 6. Godskin Duo · 7. Maliketh · 8. Sir Gideon Ofnir · 9. Godfrey (Hoarah Loux) · 10. Radagon · 11. Elden Beast. Chaque nœud suit l'ordre de progression des lieux (Morgott ouvre les Mountaintops, Fire Giant ouvre Farum Azula, etc.).
- Points de données : Margit utilise la première valeur de ses PV et de ses runes (Limgrave) ; la seconde est le combat de Capital Outskirts. Sir Gideon Ofnir a une rencontre depuis le correctif C1 ; Godskin Duo n'a pas de PV mais des runes depuis le correctif C2 (voir les cas de test de M3). Rennala : l'une ou l'autre phase cochée vaut le nœud ; le niveau lit la phase 2 (runes). Promised Consort Radahn : idem, le niveau lit la seconde rencontre. Mohg a deux rencontres : `Mohg, Lord of Blood – Phase 1`, pas `Mohg, the Omen`. Les rangs (`tier`) sont l'union des groupes de la page : ils ne permettent pas d'attribuer un rang par rencontre pour Godfrey et Mohg.
- **Prochain boss** : dans la première étape non terminée, les nœuds non vaincus, chacun remplacé par son prérequis boss s'il n'est pas vaincu, du plus bas niveau recommandé au plus haut (non estimés en dernier, puis ordre de la frise) ; l'histoire terminée et le DLC activé, le premier nœud non vaincu de la voie DLC (Messmer et Romina départagés de la même façon).
- **Voie DLC** : ouverte par Starscourge Radahn et Mohg, Lord of Blood (le DLC en dépend). Puis Messmer the Impaler et Romina, Saint of the Bud, avec la mention « ordre libre » (le wiki exige les deux mais n'impose pas d'ordre entre eux), puis Promised Consort Radahn, accessible une fois l'arbre-sceau brûlé avec la Messmer's Kindling. Rellana est optionnelle.
- Matrice des faiblesses : seuls les nœuds dont l'absorption et les résistances sont documentées peuvent l'afficher (11 sur 21).

## Coût en runes d'un niveau

- La table officielle (niveaux 1 à 713) du fichier `mechanics` (sujet `Level`, `summary_tables[0]`, colonne `Runes to next`) **fait foi** : c'est elle que lit le moteur. Ne pas utiliser la colonne `Cost increase` (ligne 713 fausse).
- Pour passer du niveau L au niveau L + 1 (1 ≤ L ≤ 712), la formule en arithmétique entière sert de **test de cohérence** : `k = max(0, 2 × (L − 11)) + 10`, coût = `floor(k × (L + 81)² / 100) + 1`. C'est l'écriture exacte de `x = max(0, (L + 81 − 92) × 0,02)`, `floor((x + 0,1) × (L + 81)²) + 1`. Évaluée en virgule flottante, cette dernière perd 1 rune sur 17 niveaux (209, 224, 234, 249, 274, 299, 309, 324, 374, 399, 429, 454, 479, 504, 529, 654, 679). Le wiki ne publie pas la formule : elle reproduit sans écart les 713 lignes de la table.
- Le calculateur peut détailler le coût de chaque niveau de la plage (getter `runeCostsBetween(de, à)`) : ce sont les lignes lues, sans autre calcul ; leur somme est le total.
- Les totaux additionnent les coûts niveau par niveau et tiennent dans un entier JavaScript sûr (1 692 566 842 au plus). Le plafond de 713 niveaux n'est pas confirmé par le wiki (non vérifiable).
- Cas de test : coût(1) = 673 · coût(11) = 847 · coût(12) = 1 038 · coût(150) = 153 680 · coût(209) = 341 447 · coût(679) = 7 774 497 · coût(712) = 8 879 348 · total de 9 à 10 = 811 · total de 9 à 40 = 134 856 · total de 1 à 150 = 7 112 459 · total de 1 à 713 = 1 692 566 842.

## Plan d'amélioration

- Pierres normales (`upgrade.material = "Smithing Stones"`, +25) : le niveau +n (1 ≤ n ≤ 24) demande `2 × ((n − 1) mod 3 + 1)` Smithing Stone [`ceil(n / 3)`], soit 2, 4 puis 6 pierres de chaque palier (12 par palier, 96 de +0 à +24) ; +25 demande une Ancient Dragon Smithing Stone.
- Pierres sombres (`"Somber Smithing Stones"`, +10) : une Somber Smithing Stone [n] pour le niveau +n (n ≤ 9) ; +10 demande une Somber Ancient Dragon Smithing Stone.
- Bell Bearings, à remettre aux Twin Maiden Husks (Roundtable Hold) pour un achat illimité : Smithing-Stone Miner's [1] à [4] couvrent les paliers 1–2, 3–4, 5–6, 7–8 ; Somberstone Miner's [1] à [5] couvrent 1–2, 3–4, 5–6, 7–8 et 9. Les pierres anciennes ne s'achètent pas en quantité illimitée. Les prix et l'inventaire débloqué ne sont pas dans `data/` : le plan n'en affiche pas tant qu'ils n'y sont pas.
- Le plan hérite du badge Estimation quand le type d'amélioration vient de `upgrade.estimate_if_undocumented`. Sans type ni estimation, ou si l'arme vaut `"Not upgradeable"`, le plan affiche « Non documenté » ou « Non améliorable » et n'est pas calculé.
- Cas de test : normale +0 → +3 = 12 × Smithing Stone [1] (2 + 4 + 6) · normale +5 → +10 = 6 × [2], 12 × [3], 2 × [4] · normale +0 → +25 = 12 de chaque palier [1] à [8] (96) + 1 Ancient Dragon · sombre +0 → +10 = une Somber [1] à [9] + 1 Somber Ancient Dragon · Reverse-Bladed Sword (`material` null, estimation normale, confiance moyenne) = plan +25 avec badge Estimation · Silver Grooved Shield (`material` null sans estimation) = « Non documenté ». Le Club, ancien exemple, a reçu `material = "Smithing Stones"` (fiabilité `wiki`, `data/CHANGELOG.md`).

## Statistiques dérivées

PV, FP, endurance et charge d'équipement de base se lisent directement dans les tables 1–99 du fichier `mechanics` : sujet `Vigor` (colonne `HP`), sujet `Mind` (colonne `FP`), sujet `Endurance` (colonnes `Stamina` et `Equip Load`, une décimale ; la table du sujet `Stamina` est vide pour Endurance 1 à 10). Ni interpolation ni formule. La colonne `Increments` (défaut d'extraction) est ignorée. Les valeurs de `origins[].base_stats` ne servent jamais (anomalie Heavy Knight : `equip_load` y vaut 53,3, le poids de son équipement, au lieu de 59,3).

- Exemples : Vigor 15 → 522 PV ; Mind 10 → 78 FP ; Endurance 25 → 121 d'endurance et 72,0 de charge.
- Cas de test : Vigor 15 / 40 / 60 / 99 → 522 / 1 450 / 1 900 / 2 100 PV · Mind 10 / 50 / 99 → 78 / 300 / 450 FP · Endurance 8 / 15 / 60 / 99 → endurance 92 / 105 / 158 / 170, charge 45,0 / 56,1 / 120,0 / 160,0 · Astrologer (9 / 15 / 9) → 396 PV, 95 FP, 94 d'endurance, 46,6 de charge · Samurai (12 / 11 / 13) → 455 PV, 82 FP, 101 d'endurance, 52,9 de charge.
- Les valeurs ne comptent ni les talismans, ni les Great Runes, ni le Physick, ni l'armure. L'équilibre dépend de l'armure et reste une valeur de données, pas un calcul.

### Rendement des attributs
Widget « Rendement des attributs » (D23) : pour Vigor (PV), Mind (FP) et Endurance (endurance et charge), les tables 1–99 ci-dessus, sans formule.
- Gain du point suivant : `valeur(p + 1) − valeur(p)`, arrondi à la précision de la table ; `null` au point 99.
- **Paliers où le gain baisse** : ceux publiés par le wiki (D39) [wiki], en configuration avec leur page (`config/softCaps.ts`, phrases également dans `mechanics.json`) : **PV 40 et 60** ([Vigor](https://eldenring.wiki.gg/wiki/Vigor)) ; **FP 50 et 60** ([Mind](https://eldenring.wiki.gg/wiki/Mind)) ; **endurance 15, 30 et 50** et **charge 25 et 60** ([Endurance](https://eldenring.wiki.gg/wiki/Endurance)). Pour chaque palier p, le « Pourquoi ? » donne le gain moyen avant `(valeur(p) − valeur(p − 5)) / 5` et après `(valeur(p + 5) − valeur(p)) / 5`, lus dans les tables (`null` si la fenêtre sort de la table). Exemple : FP 50, 6,4 puis 5,6.
- **Contrôle** par les tables [conception] : un point est candidat si le gain après vaut au plus 0,75 fois le gain avant et lui est inférieur d'au moins deux pas d'arrondi de la table divisés par 5 (un pas = 1 pour les tables entières, 0,1 pour la charge) ; dans une suite de candidats consécutifs, le point de plus forte baisse est retenu (`ATTRIBUTE_YIELD` de `config/weights.ts`). Résultat avec les tables actuelles : PV 40 et 60 ; FP 60 ; endurance 30 et 50 ; charge 25 et 60, tous publiés par le wiki. FP 50 et endurance 15, de baisse plus faible (rapport 0,875 pour les FP), ne sont pas détectés : ce contrôle n'est plus affiché.
- Position du profil : valeur et gain du point suivant à l'attribut du profil.

## Couverture des données
Widget D8 : part de chaque champ documentée par le wiki, déduite, estimée ou non documentée, avec le décompte par étiquette de source. Simple décompte des données chargées, sans pondération.
- Type d'amélioration, par fichier d'armes (`derived.upgrade.reliability`) : `wiki` et « non améliorable » = documenté ; `deduced` = déduit ; `estimate` = estimé ; `null` = non documenté.
- PV, runes et absorption des rencontres de la frise (rencontre qui porte le niveau de chaque nœud de `timeline.ts`, prérequis boss compris) : documenté si `hp_values` ou `runes_values` n'est pas vide, ou si `damage_negation_percent` est présent ; non documenté sinon, ou si la rencontre manque.
- PV et absorption de toutes les rencontres de `bosses.json`, mêmes règles.

## Puissance d'attaque calculée (Estimation)

**Hypothèse, en attente de décision du développeur** (hypothèse C3 de `architecture.md`). Le calcul exact est impossible : le wiki ne publie que deux courbes génériques par pas de 10, aucune correspondance attribut → type de dégâts pour la plupart des affinités et armes uniques, et des coefficients pour 43 armes sur 487 seulement (les autres n'ont que des lettres). La méthode ci-dessous est approchée ; la colonne « Calculé » porte toujours le badge Estimation et les valeurs publiées par le wiki à +0 sont toujours affichées.

**Modes** (`src/engine/config/attackPower.ts`, `mode`) :
- `estimate` : la méthode ci-dessous ;
- `published` (**repli**) : seulement ce qui est publié, c'est-à-dire la valeur du tableau d'amélioration au niveau choisi si elle est documentée, sinon « Non documenté ». Aucune interpolation, aucun scaling calculé.

Entrées : arme, affinité A (Standard par défaut), niveau N, attributs du profil, une ou deux mains.

1. **Attributs effectifs.** STR effective = `floor(STR × 1,5)` à deux mains, selon la section « Prérequis comparés au profil » (exceptions comprises) ; les autres attributs sont inchangés.
2. **Base au niveau N**, pour chaque type de dégâts t, depuis `upgrade.tables[A]` : si la ligne `"+N"` existe, prendre `attack[t]` ; sinon interpoler linéairement entre les deux niveaux documentés qui l'encadrent : `base = b₀ + (b₁ − b₀) × (N − N₀) / (N₁ − N₀)`. Pour +0 en Standard, l'infobox (`attack_power`) fait foi si `tables_consistent_with_infobox` vaut `false` (29 armes de mêlée). Sans tableau pour A, seul N = 0 en Standard est calculable. Une valeur interpolée porte le badge Estimation (écart médian de 0,2 % mesuré sur les 754 lignes intermédiaires connues).
3. **Coefficients au niveau N** : même règle, appliquée à `scaling[attr].coef`. Si un attribut qui fait varier un type n'a pas de coefficient (`coef` absent ou `null`), le bonus de ce type n'est pas calculé : afficher « bonus de scaling non calculable (le wiki ne publie que la lettre) ».
4. **Attributs pris en compte par type** : physique ← STR et DEX, plus ARC pour les affinités Occult, Blood et Poison (pages d'affinité du wiki) ; magie ← INT pour l'affinité Cold (page Affinity/Cold). Pour toute autre combinaison, base seule et mention « scaling élémentaire non documenté ». [wiki] Pour Sacred et Flame Art, la page Holy indique que la Foi s'applique aussi au physique (exemple : Erdsteel Dagger) ; sans règle générale publiée, ce bonus n'est pas calculé et la limite « scaling non documenté » est affichée.
5. **Prérequis.** Si un attribut requis n'est pas atteint (attribut effectif < `requirements[attr]`), chaque type de dégâts qui varie avec cet attribut vaut `base × 0,6`, sans aucun bonus, avec le message « Prérequis non atteint : −40 %, pas de bonus de scaling ». Pour le physique, le test porte sur STR et DEX (et ARC dans les cas du point 4). [wiki] Exception connue : Ruins Greatsword (puissance magique non réduite).
6. **Courbe**, choisie selon l'affinité de l'arme (page [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling), copie dans `mechanics.json`) [wiki] : famille **physique** pour Standard, Heavy, Keen, Quality et Occult, interpolation linéaire entre (10 ; 15), (20 ; 35), (30 ; 46,5), (40 ; 57,5), (50 ; 67,5), (60 ; 75), (70 ; 82,5), (80 ; 90), (90 ; 92,5), (99 ; 96) ; famille **non physique** pour Fire, Flame Art, Lightning, Sacred, Magic, Cold, Blood et Poison, entre (10 ; 19), (20 ; 40), (30 ; 53), (40 ; 66,5), (50 ; 80), (60 ; 85), (70 ; 90), (80 ; 95), (90 ; 97,5), (99 ; 100) (D39). La courbe de l'affinité s'applique à **tous** les types de dégâts de l'arme, physique compris : le wiki ne distingue pas les types. Armes uniques (sans affinité, traitées en Standard) : famille physique [conception]. Sous 10 : non documenté ; [conception] interpoler entre (1 ; 0) et le premier point de la famille, et le signaler. Limite affichée : « courbe générique de l'affinité ; le wiki ne publie pas de courbe par type de dégâts » (et, pour une affinité non physique, que cette courbe s'applique aussi au physique). Configuration : `curves.physical`, `curves.nonPhysical` et `nonPhysicalAffinities` de `config/attackPower.ts`.
7. **Résultat** : `AR_t = floor(base_t × (1 + Σ coef_attr × courbe(attr effectif) / 100))` ; total = somme des types. L'arrondi inférieur est déduit de l'exemple du wiki (Club : 103 × 0,6 = 61,8, affiché 61).
8. Le panneau « Pourquoi ? » affiche la base, les coefficients, les valeurs de courbe et les limites (courbes génériques, interpolations).

Exemples vérifiables sur le wiki : Club +0, STR 9, une main (prérequis STR 10) → **61** · Club +0, STR 9, deux mains (effective 13) → prérequis atteint ; bonus non calculable (Club : `scaling.str` = C, pas de coefficient) [déduction].

Tests de non-régression de la méthode (Longsword Standard : +0 = 110, coefficients STR 0,5 / DEX 0,33 ; +25 = 265, coefficients 0,75 / 0,49). Reproductibles depuis `data/`, **non vérifiables sur le wiki** : ce ne sont pas des vérités du jeu.

| Cas | Attendu |
|---|---|
| Longsword +0, STR 20, DEX 20, une main | 141 (110 × (1 + 0,5 × 0,35 + 0,33 × 0,35) = 141,955) |
| Longsword +25, STR 20, DEX 20 | 380 |
| Longsword +25, STR 40, DEX 40 | 453 |
| Longsword +10 (interpolé : base 172, coefficients 0,6 / 0,394), STR 30, DEX 15 | 236 |
| Longsword +0, STR 14 à deux mains (effective 21, courbe 36,15), DEX 10 | 135 |
| Longsword +0, STR 9, DEX 20, une main | 66 (pénalité : 110 × 0,6) |
| Longsword +0, STR 7 à deux mains (effective 10), DEX 20 | 130 |
| Longsword +0 Cold (base 89 physique, 71 magie ; coefficients STR 0,45, DEX 0,29, INT 0,4), STR, DEX et INT 20, courbe non physique (40) | 197 (115 + 82) |

Non vérifiable : les puissances d'attaque publiées sur la page Lion Greatbow (45/45 → 501 ; 80/18 → 488 ; 54/18 → 470 ; 15/80 → 466) n'indiquent pas de niveau d'amélioration, et `data/` n'a pas ses coefficients ; elles ne valident pas la méthode. Les coefficients du Horn Bow sont mal lus dans `data/` (correctif de données P2 en attente) : ne pas s'en servir comme cas de test.
