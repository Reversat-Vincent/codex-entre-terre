# Vérification des méthodes de `docs/design/ds/calculs.md`

Vérification du 01/11/2026, faite avant toute écriture de code et de tests. Sources : `data/*.json` (extraction du 31/10/2026) et l'API d'eldenring.wiki.gg, joignable, interrogée avec au moins 3,5 s entre deux requêtes. Le wikitext téléchargé est dans `.cache/wiki/verif/`.

Conventions : **[wiki]** fait publié par le wiki · **[déduction]** conséquence logique de faits du wiki ou de `data/` · **[estimation]** valeur approchée · **[conception]** choix du projet, non jugé ici.

## Synthèse

| Méthode | Verdict |
|---|---|
| Coût en runes d'un niveau | Confirmée, à préciser : la formule doit être calculée en entiers |
| Statistiques dérivées | Confirmée : lecture directe de tables complètes 1–99. Une anomalie à signaler (Heavy Knight) |
| Prérequis à deux mains | Confirmée (`floor`), à compléter : exceptions des armes appariées, Greatbows et Ballistas |
| Origine optimale | Confirmée (12/12) ; le 2e critère de tri ne départage jamais |
| Plan d'amélioration | Confirmée ; il manque le cas `null` et une source de données pour les Bell Bearings |
| Lettres de scaling | Pas de contradiction avec le jeu ; une précision à ajouter |
| Puissance d'attaque calculée | **Calcul exact impossible** ; calcul approché possible pour 43 armes sur 487 |
| Étapes, score, niveau recommandé | Choix de conception ; plusieurs champs de `data/` ne permettent pas de les appliquer tels que décrits (§ 8) |

---

## 1. Coût en runes d'un niveau

**Verdict : confirmée, à préciser.**

### Constats
- [wiki] La page [Level](https://eldenring.wiki.gg/wiki/Level) ne contient que la table des niveaux 1 à 713 : elle ne publie pas de formule. `data/mechanics.json`, sujet `Level`, `summary_tables[0]` reproduit cette table : 713 lignes, identiques au wikitext du 01/11/2026.
- [déduction] La formule de `calculs.md` reproduit les 713 lignes **en arithmétique exacte**. En virgule flottante IEEE 754 (le `number` de JavaScript), `floor((x + 0,1) × (L + 81)²)` donne **1 rune de moins** pour 17 niveaux : 209, 224, 234, 249, 274, 299, 309, 324, 374, 399, 429, 454, 479, 504, 529, 654, 679. Par exemple, au niveau 209, la virgule flottante donne 341 446 alors que la table indique 341 447.
- [déduction] Forme entière, sans aucun écart sur les 713 lignes : `k = max(0, 2 × (L − 11)) + 10` ; coût = `floor(k × (L + 81)² / 100) + 1`.
- La colonne `Total runes` de la ligne L vaut la somme des coûts des niveaux 1 à L − 1 : elle est cohérente sur les 713 lignes. La colonne `Cost increase` vaut le coût de L moins le coût de L − 1, sauf à la ligne 713 où le wiki affiche 0 au lieu de 35 018.
- Non vérifiable : la page Level ne dit pas que 713 est le niveau maximum. La ligne 713 donne un coût (8 914 366) qui ne sert à rien si 713 est bien le plafond.

### Correction proposée (texte à substituer à la section « Coût en runes d'un niveau »)
> - Pour passer du niveau L au niveau L + 1 (1 ≤ L ≤ 712), en arithmétique entière : `k = max(0, 2 × (L − 11)) + 10`, coût = `floor(k × (L + 81)² / 100) + 1`. C'est l'écriture exacte de `x = max(0, (L + 81 − 92) × 0,02)`, `floor((x + 0,1) × (L + 81)²) + 1`. Évaluée en virgule flottante, cette dernière perd 1 rune sur 17 niveaux (209, 224… 679). Exemples : niveau 1 → 673 runes, niveau 12 → 1 038, niveau 150 → 153 680, niveau 209 → 341 447, niveau 712 → 8 879 348.
> - Les totaux additionnent les coûts niveau par niveau ; ils tiennent dans un entier JavaScript sûr (1 692 566 842 au plus). La formule n'est pas publiée par le wiki : elle reproduit sans écart la table des niveaux 1 à 713 du fichier `mechanics` (sujet `Level`), qui fait foi.

### Champs de `data/`
- `mechanics.json` → `topics[title="Level"].summary_tables[0][i]` = `{"Level": 150, "Runes to next": 153680, "Cost increase": 2385, "Total runes": 7112459}`. Couverture : niveaux 1 à 713, sans `null`. Ne pas utiliser `Cost increase` (ligne 713 fausse).

### Cas de test (vérifiés contre la table du wiki)
| Entrée | Attendu |
|---|---|
| coût(1) | 673 |
| coût(11) / coût(12) (changement de régime) | 847 / 1 038 |
| coût(150) | 153 680 |
| coût(209) (piège de la virgule flottante) | 341 447 |
| coût(679) (piège de la virgule flottante) | 7 774 497 |
| coût(712) | 8 879 348 |
| total de 9 à 10 (Vagabond, 1 niveau) | 811 |
| total de 9 à 40 | 134 856 |
| total de 1 à 150 | 7 112 459 (= `Total runes` de la ligne 150) |
| total de 1 à 713 | 1 692 566 842 |

---

## 2. Statistiques dérivées (PV, FP, endurance, charge)

**Verdict : confirmée. Les données sont des tables complètes, pas des courbes ni des formules par paliers.**

### Constats
- [wiki] Tables 1–99 complètes sur [Vigor](https://eldenring.wiki.gg/wiki/Vigor) (PV), [Mind](https://eldenring.wiki.gg/wiki/Mind) (FP) et [Endurance](https://eldenring.wiki.gg/wiki/Endurance) (endurance et charge d'équipement). Les 99 lignes de chaque table de `data/` sont identiques au wikitext du 01/11/2026.
- L'exemple Vigor 15 → 522 PV est exact.
- [déduction] Les 12 origines de `origins.json` (`base_stats.hp`, `.fp`, `.stamina`, `.equip_load`) concordent avec les tables, à une exception près, signalée ci-dessous.
- **Anomalie Heavy Knight** (*Tarnished Pack*) : son `base_stats.equip_load` vaut 53.3, alors que la table donne Endurance 17 → 59.3. La note de la page [Heavy Knight](https://eldenring.wiki.gg/wiki/Heavy_Knight) explique l'écart : « its starter equipment weight has a total of 53.3, or 89.8% of its equip capacity ». Le champ `equip` de l'infobox contient donc le poids de l'équipement de départ, pas la charge maximale. [déduction] 53,3 / 59,3 = 89,9 %, ce qui correspond à la note à l'arrondi près.
- Il manque, pour un calcul complet : les bonus de talismans, de Great Runes, de Physick et de pièces d'armure (Erdtree's Favor, Radagon's Soreseal…). Les tables donnent les valeurs **de base**. Pour l'endurance, la table `Stamina` (sujet `Stamina`) est vide pour Endurance 1 à 10 : utiliser la table du sujet `Endurance`.
- La colonne `Increments` est un défaut d'extraction : elle ne garde qu'une des colonnes d'incréments du wiki, et la ligne 1 contient le nom d'en-tête (`"Immunity"`, `"Focus"`, `"Robustness"`). Ne pas l'utiliser.
- La charge d'équipement a un type mixte (`45.0` / `45`) : la lire comme un nombre et l'afficher avec une décimale.

### Correction proposée (texte à substituer)
> PV, FP, endurance et charge d'équipement de base se lisent directement dans les tables 1–99 du fichier `mechanics` : sujet `Vigor` (colonne `HP`), sujet `Mind` (colonne `FP`), sujet `Endurance` (colonnes `Stamina` et `Equip Load`, une décimale). Ni interpolation ni formule. Exemples : Vigor 15 → 522 PV ; Mind 10 → 78 FP ; Endurance 25 → 121 d'endurance et 72,0 de charge. Les valeurs ne comptent ni les talismans, ni les Great Runes, ni l'armure. L'équilibre dépend de l'armure et reste une valeur de données, pas un calcul.

### Champs de `data/`
- `mechanics.json` → `topics[title="Vigor"].summary_tables[0][i]` = `{"Vigor": 15, "HP": 522, …}` ; `topics[title="Mind"]…` = `{"Mind": 10, "FP": 78, …}` ; `topics[title="Endurance"]…` = `{"Endurance": 25, "Stamina": 121, "Equip Load": 72, …}`. Couverture : 1 à 99, sans `null`.

### Cas de test
| Entrée | Attendu |
|---|---|
| Vigor 15 / 40 / 60 / 99 | 522 / 1 450 / 1 900 / 2 100 PV |
| Mind 10 / 50 / 99 | 78 / 300 / 450 FP |
| Endurance 8 / 15 / 60 / 99 | endurance 92 / 105 / 158 / 170 ; charge 45,0 / 56,1 / 120,0 / 160,0 |
| Astrologer (9 / 15 / 9) | 396 PV, 95 FP, 94 d'endurance, 46,6 de charge (= `origins.json`) |
| Samurai (12 / 11 / 13) | 455 PV, 82 FP, 101 d'endurance, 52,9 de charge (= `origins.json`) |

---

## 3. Prérequis comparés au profil, deux mains

**Verdict : confirmée (`floor`), à compléter par les exceptions.**

### Constats
- [wiki] La page [Strength](https://eldenring.wiki.gg/wiki/Strength) dit « Strength is increased by 50%, **rounded up** ». Les pages d'armes la contredisent en donnant la Force réelle nécessaire à deux mains, ce qui permet de trancher :
  - [Igon's Greatbow](https://eldenring.wiki.gg/wiki/Igon%27s_Greatbow) (*Shadow of the Erdtree*), prérequis 23 : « effectively always 16 ». Avec `floor`, ceil(23 / 1,5) = 16 ; avec un arrondi supérieur, 15 suffirait (15 × 1,5 = 22,5 → 23).
  - [Greatbow](https://eldenring.wiki.gg/wiki/Greatbow) et [Erdtree Greatbow](https://eldenring.wiki.gg/wiki/Erdtree_Greatbow), prérequis 20 : « effectively 14 ». Un arrondi supérieur donnerait 13.
  - Ces pages confirment `floor(STR × 1,5)` et l'écart `ceil(prérequis / 1,5) − STR`. La phrase de la page Strength est une incohérence du wiki.
- [wiki] Le tutoriel en jeu ([About Wielding Armaments](https://eldenring.wiki.gg/wiki/About_Wielding_Armaments)) dit « boosting effective strength by 50% », sans préciser l'arrondi.
- [wiki] Exceptions :
  - Les armes appariées n'ont pas de posture à deux mains et ne reçoivent pas le bonus ([Strength](https://eldenring.wiki.gg/wiki/Strength), [Ornamental Straight Sword](https://eldenring.wiki.gg/wiki/Ornamental_Straight_Sword)). Ce sont les classes Fists, Claws, Hand-to-Hand, Throwing Blades, Backhand Blades, Beast Claws et Perfume Bottles, plus une liste d'armes : Smithscript Dagger, Ornamental Straight Sword, Rellana's Twin Blades, Greatsword of Radahn (Lord / Light), Falx, Dancing Blade of Ranah, Horned Warrior's Sword, Smithscript Cirque, Curseblade's Cirque, Death Knight's Twin Axes ([Paired Weapons](https://eldenring.wiki.gg/wiki/Paired_Weapons)).
  - La **Starscourge Greatsword** reçoit le bonus malgré tout ([Starscourge Greatsword](https://eldenring.wiki.gg/wiki/Starscourge_Greatsword)).
  - Les **Greatbows** et les **Ballistas** se manient toujours à deux mains : le prérequis de Force est « effectivement » réduit en permanence (pages de ces armes).
- Non vérifiable : je n'ai trouvé sur le wiki aucune mention du maniement à deux mains obligatoire pour les Light Bows, Bows et Crossbows. Les pages lues ne parlent que des Greatbows et des Ballistas.
- Aucun champ de `data/` n'indique qu'une arme est appariée ou toujours à deux mains : il faut le déduire de `category` et de la liste ci-dessus.

### Correction proposée (texte à substituer à la 2e puce)
> - À deux mains, la Force effective vaut `floor(STR × 1,5)` (en entiers : `STR + floor(STR / 2)`). La puce l'indique (« 2M ») et l'écart affiché est exprimé en Force réelle : `max(0, ceil(2 × prérequis / 3) − STR)`, soit en entiers `floor((2 × prérequis + 2) / 3) − STR`.
> - Pas de bonus pour les armes sans posture à deux mains : catégories Fists, Claws, Hand-to-Hand, Throwing Blades, Backhand Blades, Beast Claws, Perfume Bottles, et armes de la liste « Armaments without a two-handed stance » de la page Paired Weapons. La Starscourge Greatsword fait exception et reçoit le bonus. Les Greatbows et les Ballistas se manient toujours à deux mains : la Force effective s'y applique d'office et la bascule 1M / 2M est masquée.

### Champs de `data/`
- `*_armaments.json` / `ranged_weapons_catalysts.json` / `shields_torches.json` → `weapons[].requirements` = `{"str": 23, "dex": 16, "int": 0, "fai": 0, "arc": 0}` (Igon's Greatbow). Aucun `null`. 0 = pas de prérequis.
- `weapons[].category` (par exemple `"Greatbows"`, `"Ballistas"`, `"Fists"`) pour les exceptions.

### Cas de test (Force réelle nécessaire à deux mains, publiée par chaque page)
| Arme (prérequis Force) | Attendu |
|---|---|
| Igon's Greatbow (23), *Shadow of the Erdtree* | 16 ; avec STR 15, effective 22, écart affiché 1 |
| Greatbow (20) | 14 |
| Golem Greatbow (24) | 16 |
| Lion Greatbow (22) | 15 |
| Hand Ballista (30) | 20 |
| Jar Cannon (34) | 23 |
| Rabbath's Cannon (28), *Shadow of the Erdtree* | 19 |
| STR 15 → Force effective | 22 |

---

## 4. Origine optimale

**Verdict : confirmée.**

### Constats
- [déduction] niveau = somme des 8 attributs − 79 pour les 12 origines de `origins.json`, dont Idus Knight et Heavy Knight (*Tarnished Pack*). Exemples : Wretch 80 → 1, Confessor 89 → 10, Heavy Knight 89 → 10.
- [déduction] Identité : `Σ max(départ, cible) = Σ cible + Σ max(0, départ − cible)`. Le niveau final vaut donc `(Σ cible − 79) + points gaspillés`, et pour une cible donnée, trier par niveau final revient à trier par points gaspillés. Le 2e critère du tri ne départage jamais : seul le 3e (adéquation précoce) départage les ex æquo. Ce n'est pas une erreur, mais le texte le laisse croire.
- [wiki] Le cas A ci-dessous reproduit l'affirmation de [Vagabond](https://eldenring.wiki.gg/wiki/Vagabond) (`origins.json`, `build_optimization`) : « saves a total of 5 levels when compared to Wretch ».
- Préconditions à écrire : chaque attribut cible est compris entre 1 et 99 ; un attribut ne descend jamais sous sa valeur de départ.

### Correction proposée (ajout après la 2e puce)
> - Identité : niveau final = (Σ attributs cibles − 79) + points gaspillés. Pour une même cible, les deux premiers critères de tri sont donc équivalents ; les ex æquo se départagent par l'adéquation précoce.

### Champs de `data/`
- `origins.json` → `origins[].attributes` = `{"vigor": 15, "mind": 10, "endurance": 11, "strength": 14, "dexterity": 13, "intelligence": 9, "faith": 9, "arcane": 7}` ; `origins[].level` = 9 ; `origins[].starting_equipment` ; `origins[].source`. 12 entrées, aucun `null` dans ces champs.

### Cas de test (ordre VIG, MND, END, STR, DEX, INT, FAI, ARC)
| Cible | Résultat attendu (niveau final, points gaspillés) |
|---|---|
| A : 40, 10, 20, 14, 13, 9, 9, 7 | Vagabond (43, 0) ; Heavy Knight (46, 3) ; Samurai (47, 4) ; Wretch (48, 5) ; Prophet et Astrologer (57, 14) |
| B : 40, 20, 15, 8, 12, 60, 7, 9 | Astrologer (92, 0) ; Prisoner (97, 5) ; Wretch (98, 6) ; Prophet (105, 13) |
| C : 40, 25, 20, 12, 10, 7, 60, 10 | Prophet (105, 0) ; Wretch (108, 3) ; Confessor et Heavy Knight (109, 4) |
| Cible = attributs du Wretch | Wretch (1, 0) |

---

## 5. Plan d'amélioration

**Verdict : confirmée ; à compléter (cas `null`, source des Bell Bearings).**

### Constats
- [wiki] [Smithing Stones](https://eldenring.wiki.gg/wiki/Smithing_Stones) : chaque palier sert 3 fois (2, 4 puis 6 pierres) ; l'Ancient Dragon Smithing Stone sert une fois, de +24 à +25. [Somber Smithing Stones](https://eldenring.wiki.gg/wiki/Somber_Smithing_Stones) : une pierre par niveau, la Somber Smithing Stone [n] mène à +n, la Somber Ancient Dragon à +10. `upgrade_materials.json`, `items[].effect`, concorde : « Reinforce armaments up to +3 » … « up to +24 » ; « Reinforce special armaments to +1 » … « up to +10 ».
- [wiki] [Bell Bearing](https://eldenring.wiki.gg/wiki/Bell_Bearing), remis aux Twin Maiden Husks (Roundtable Hold), stock illimité :
  - Smithing-Stone Miner's [1] à [4] : pierres [1]–[2], [3]–[4], [5]–[6], [7]–[8], aux prix de 200, 400, 600, 900, 1 200, 1 500, 2 400 et 3 600 runes.
  - Somberstone Miner's [1] à [5] : pierres sombres [1]–[2], [3]–[4], [5]–[6], [7]–[8] et [9], aux prix de 2 000, 3 000, 4 000, 6 000, 9 000, 12 000, 16 000, 20 000 et 25 000 runes.
  - `calculs.md` est exact. La page Somber Smithing Stones dit « 4 » Somberstone Bell Bearings alors que la page Bell Bearing en liste 5 : incohérence du wiki, recopiée dans `mechanics.json`, sujet `Somber Smithing Stones`, `summary`.
- [wiki] Pierres anciennes : 22 Ancient Dragon Smithing Stones par partie (13 dans le jeu de base, 9 dans *Shadow of the Erdtree*), dont une achetable à Gostoc pour 20 000 runes à la fin de la quête de Nepheli ([page](https://eldenring.wiki.gg/wiki/Ancient_Dragon_Smithing_Stone)). 8 Somber Ancient Dragon recensées, plus celles des Ghostflame Dragons (*Shadow of the Erdtree*) ([page](https://eldenring.wiki.gg/wiki/Somber_Ancient_Dragon_Smithing_Stone)). Aucune ne s'achète en quantité illimitée.
- Où trouver les Bell Bearings : `key_items.json`, `items[].acquisition[].details` (texte libre ; `region` vaut `null` pour les 9 entrées).
  - Smithing-Stone [1] : Raya Lucaria Crystal Tunnel (Liurnia) ; [2] : Sealed Tunnel (Capital Outskirts) ; [3] : Zamor Ruins (Mountaintops of the Giants) ; [4] : Godskin Duo (Crumbling Farum Azula).
  - Somberstone [1] : Fallingstar Beast, Sellia Crystal Tunnel (Caelid) ; [2] : duo de Crystalians, Altus Tunnel ; [3] : First Church of Marika (Mountaintops) ; [4] et [5] : Crumbling Farum Azula. `regions_mentioned` est vide pour [5].
- **Lacune de `data/`** : `npcs.json`, Twin Maiden Husks, `shop_inventory` ne contient que le stock de base, sans les objets débloqués par les Bell Bearings ni leurs prix. Dans `key_items.json`, `description` liste les objets débloqués pour 2 Bell Bearings sur 9 seulement (Somberstone [1] et [2]). La correspondance Bell Bearing → pierres → prix n'existe donc dans `data/` que par la convention de nommage.
- **Cas `null`** : `upgrade.material` est `null` sans estimation pour 114 armes (40 armes à distance ou catalyseurs, 74 boucliers ou torches). Une arme vaut `"Not upgradeable"` (`max_level` 0). `calculs.md` ne traite pas ces cas.

### Correction proposée (texte à substituer à la section « Plan d'amélioration »)
> - Pierres normales (`upgrade.material = "Smithing Stones"`, +25) : le niveau +n (1 ≤ n ≤ 24) demande `2 × ((n − 1) mod 3 + 1)` Smithing Stone [`ceil(n / 3)`], soit 2, 4 puis 6 pierres de chaque palier (12 par palier, 96 de +0 à +24) ; +25 demande une Ancient Dragon Smithing Stone.
> - Pierres sombres (`"Somber Smithing Stones"`, +10) : une Somber Smithing Stone [n] pour le niveau +n (n ≤ 9) ; +10 demande une Somber Ancient Dragon Smithing Stone.
> - Bell Bearings, à remettre aux Twin Maiden Husks (Roundtable Hold) pour un achat illimité : Smithing-Stone Miner's [1] à [4] couvrent les paliers 1–2, 3–4, 5–6, 7–8 ; Somberstone Miner's [1] à [5] couvrent 1–2, 3–4, 5–6, 7–8 et 9. Les pierres anciennes ne s'achètent pas en quantité illimitée.
> - Le plan hérite du badge Estimation quand le type d'amélioration vient de `upgrade.estimate_if_undocumented`. Sans type ni estimation, ou si l'arme vaut `"Not upgradeable"`, le plan affiche « Non documenté » ou « Non améliorable » et n'est pas calculé.

### Champs de `data/`
- `weapons[].upgrade.material` (`"Smithing Stones"`, `"Somber Smithing Stones"`, `"Not upgradeable"`, `null`), `.max_level` (25, 10, 0, `null`), `.estimate_if_undocumented.material` / `.confidence`. Couverture des armes de mêlée : 76 normales, 74 sombres, 116 estimées normales (confiance moyenne), 69 estimées sombres (confiance élevée).
- `upgrade_materials.json` → `items[name="Smithing Stone [3]"].effect` = `"Reinforce armaments up to +9"`.
- `key_items.json` → `items[category="Bell Bearings", name~"Miner"]` : `acquisition[].details`, `regions_mentioned`.
- Prix des pierres : aucun champ de `data/` (voir la proposition P3).

### Cas de test
| Entrée | Attendu |
|---|---|
| Normale, +0 → +3 | 12 × Smithing Stone [1] (2 + 4 + 6) |
| Normale, +5 → +10 | 6 × [2], 12 × [3], 2 × [4] |
| Normale, +0 → +25 | 12 de chaque palier [1]–[8] (96) + 1 Ancient Dragon |
| Sombre, +0 → +10 | une Somber [1]–[9] + 1 Somber Ancient Dragon |
| Coût d'achat, normale +0 → +24 | 129 600 runes [déduction : 12 × somme des 8 prix] |
| Coût d'achat, sombre +0 → +9 | 97 000 runes |
| Club (`material` null, estimation normale, confiance moyenne) | plan +25 avec badge Estimation |
| Bouclier avec `material` null sans estimation | « Non documenté » |

---

## 6. Lettres de scaling

**Verdict : pas de contradiction avec le jeu ; une précision à ajouter.**

### Constats
- [wiki] Ordre S > A > B > C > D > E ([Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling)) : E < 0,25 ; D 0,25–0,5999 ; C 0,6–0,8999 ; B 0,9–1,3999 ; A 1,4–1,75 ; S > 1,75. L'ordre utilisé par `calculs.md` est conforme.
- [conception] Les poids S = 1 … E = 0,25 sont une pondération du score, pas les coefficients du jeu. Il n'y a pas de contradiction tant qu'ils ne servent pas à calculer une puissance d'attaque.
- Précision : `weapons[].scaling` donne les lettres **à +0 et en affinité Standard** (`field_notes`). Dans le jeu, la lettre change avec le niveau et l'affinité ; par exemple, la Dexterity de la Dagger passe de C (0,65) à +0 à B (0,97) à +25 (`upgrade.tables.Standard`). Le score compare donc les armes à +0, en affinité Standard : il faut l'écrire.
- [wiki] 8 lettres de tableaux d'amélioration contredisent les seuils de la page Weapon Scaling. Par exemple, Miséricorde +25 indique B avec un coefficient de 0,75, et Ivory Sickle +25 indique E avec 0,34. Ces incohérences n'affectent pas `scaling` à +0.

### Correction proposée (ajout à la composante 1 du score)
> Les lettres sont celles de `scaling`, c'est-à-dire à +0 en affinité Standard ; elles ne reflètent ni le niveau d'amélioration ni l'affinité choisie.

---

## 7. Puissance d'attaque calculée (colonne « Calculé » de la fiche arme)

**Verdict : calcul exact impossible ; calcul approché possible pour une minorité d'armes.**

### Ce que publie le wiki ([Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling))
- [wiki] Bonus de scaling = `coefficient × base × (valeur de courbe / 100)`, pour chaque attribut.
- [wiki] Courbes données **seulement par pas de 10**, et pour deux familles génériques :
  - « physique » (Standard, Heavy, Keen, Quality, Occult) : 10 → 15, 20 → 35, 30 → 46,5, 40 → 57,5, 50 → 67,5, 60 → 75, 70 → 82,5, 80 → 90, 90 → 92,5, 99 → 96 ;
  - « non physique » : 10 → 19, 20 → 40, 30 → 53, 40 → 66,5, 50 → 80, 60 → 85, 70 → 90, 80 → 95, 90 → 97,5, 99 → 100.
  - Les catalyseurs n'ont qu'une description qualitative. Rien n'est publié sous 10.
- [wiki] Prérequis non atteint : « anything that scales with that attribute receives no scaling, and instead takes a −40% penalty ». Exemple de la page : Club, 103 de physique, prérequis STR 10, STR 9 → 61.
- [wiki] Exception à cette règle sur [Ruins Greatsword](https://eldenring.wiki.gg/wiki/Ruins_Greatsword) : si l'Intelligence n'est pas atteinte, la puissance magique n'est pas réduite.
- [wiki] L'augmentation du scaling avec le niveau est décrite comme « +8 % par niveau » pour les armes sombres et « +2 % » pour les autres, mais les tableaux la contredisent : Keen Dagger, +6,4 % en STR et +2,7 % en DEX.
- [wiki] Quel attribut fait varier quel type de dégâts : documenté seulement pour certaines affinités (`mechanics.json`, sujets `Affinity/Cold`, `Affinity/Occult`, `Affinity/Blood`, `Affinity/Poison`) ; non documenté pour Fire, Flame Art, Lightning, Sacred et Magic, ni pour les armes uniques à dégâts mixtes (Moonveil, Blasphemous Blade…).

### Ce que contient `data/`
- `weapons[].attack_power` (+0 Standard, depuis l'infobox) : complet.
- `weapons[].upgrade.tables[<affinité>]["+N"].attack` et `.scaling.<attr>.{grade, coef}`. Couverture des **coefficients** à +0 :
  - armes de mêlée : **40 sur 335** (dagues, épées droites… ; 93 tableaux n'ont que des lettres ; 202 armes n'ont pas de tableau) ;
  - armes à distance et catalyseurs : 3 sur 63 ;
  - boucliers et torches : 0 sur 89.
  - Les niveaux intermédiaires ne sont présents que sur 53 tableaux, surtout des armes sombres. Les armes normales n'ont en général que +0 et +25, avec `growth_per_level`.
- `upgrade.tables_consistent_with_infobox: false` pour 29 armes de mêlée (prendre l'infobox à +0). Exemple : Greatsword of Damnation (*Shadow of the Erdtree*), dont le tableau indique 138 à +0 contre 123 de physique et 79 de sacré dans l'infobox.
- Défaut d'extraction : coefficients du **Horn Bow** faux (voir la proposition P2).

### Pourquoi un calcul exact est impossible
1. Les courbes de correction **par arme et par type de dégâts** ne sont pas publiées : seulement deux familles génériques, par pas de 10.
2. La correspondance attribut → type de dégâts n'est pas publiée pour la plupart des affinités et des armes uniques.
3. Les valeurs aux niveaux intermédiaires des armes normales ne sont pas publiées.
4. Aucun coefficient pour environ 91 % des armes (lettres seulement). Une lettre couvre une plage large : D va de 0,25 à 0,6, soit jusqu'à 2,4 fois la valeur.

### Options
| Option | Contenu | Couverture | Risque |
|---|---|---|---|
| A. Pas de calcul | Colonne Calculé limitée à ce qui est publié : valeur du tableau au niveau choisi s'il est documenté, sinon « Non documenté » | toutes | aucun, mais la colonne est souvent vide |
| **B. Approché, borné** (recommandée) | Base au niveau choisi (exacte si documentée, sinon interpolée) ; pénalité de −40 % (règle du wiki) ; bonus de scaling **physique** estimé, seulement si les coefficients existent ; le reste affiché « non calculable » | bonus de scaling : 43 armes ; base et pénalité : toutes les armes à tableau | approximation des courbes, à afficher avec le badge Estimation |
| C. Approché pour tout | Coefficient tiré du milieu de la plage de la lettre | toutes | erreur pouvant dépasser ±40 % du bonus ; contraire à la règle « jamais de valeur supposée » |
| D. Enrichir les données | Récupérer les coefficients manquants | — | impossible depuis le wiki : les pages n'ont que des lettres |

**Recommandation : B.** C'est la seule option qui affiche une valeur utile sans présenter une supposition comme un fait. La pénalité des prérequis repose sur une règle du wiki et sur un exemple chiffré du wiki ; le reste porte le badge Estimation.

### Méthode proposée pour `calculs.md` (nouvelle section)
> ## Puissance d'attaque calculée (Estimation)
>
> Valeurs publiées par le wiki à +0 toujours affichées ; la colonne Calculé est une estimation. Entrées : arme, affinité A (Standard par défaut), niveau N, attributs du profil, une ou deux mains.
>
> 1. **Attributs effectifs.** STR effective = `floor(STR × 1,5)` à deux mains, selon les règles de la section « Prérequis comparés au profil » (exceptions comprises) ; les autres attributs sont inchangés.
> 2. **Base au niveau N**, pour chaque type de dégâts t, depuis `upgrade.tables[A]` : si la ligne `"+N"` existe, prendre `attack[t]` ; sinon, interpoler linéairement entre les deux niveaux documentés qui l'encadrent : `base = b₀ + (b₁ − b₀) × (N − N₀) / (N₁ − N₀)`. Pour +0 en Standard, l'infobox (`attack_power`) fait foi si `tables_consistent_with_infobox` vaut `false`. Sans tableau pour A : seul N = 0 en Standard est calculable. Une valeur interpolée porte le badge Estimation (écart médian de 0,2 % mesuré sur les 754 lignes intermédiaires connues).
> 3. **Coefficients au niveau N** : même règle, appliquée à `scaling[attr].coef`. Si un attribut qui fait varier un type n'a pas de coefficient (`coef` absent ou `null`), le bonus de ce type n'est pas calculé : afficher « bonus de scaling non calculable (le wiki ne publie que la lettre) ».
> 4. **Attributs pris en compte par type** : physique ← STR et DEX, plus ARC pour les affinités Occult, Blood et Poison (pages d'affinité du wiki) ; magie ← INT pour l'affinité Cold (page Affinity/Cold). Pour toute autre combinaison, base seule et mention « scaling élémentaire non documenté ».
> 5. **Prérequis.** Si un attribut requis n'est pas atteint (attribut effectif < `requirements[attr]`), chaque type de dégâts qui varie avec cet attribut vaut `base × 0,6`, sans aucun bonus, avec le message « Prérequis non atteint : −40 %, pas de bonus de scaling ». Pour le physique, le test porte sur STR et DEX (et ARC dans les cas du point 4). Exception connue : Ruins Greatsword (magie non réduite).
> 6. **Courbe** (famille physique du wiki, interpolation linéaire entre les points (10, 15), (20, 35), (30, 46,5), (40, 57,5), (50, 67,5), (60, 75), (70, 82,5), (80, 90), (90, 92,5), (99, 96)). Sous 10 : non documenté. [conception] Proposition : interpoler entre (1, 0) et (10, 15) et le signaler.
> 7. **Résultat** : `AR_t = floor(base_t × (1 + Σ coef_attr × courbe(attr effectif) / 100))` ; total = somme des types. L'arrondi inférieur est déduit de l'exemple du wiki (Club : 103 × 0,6 = 61,8, affiché 61).
> 8. Le panneau « Pourquoi ? » affiche la base, les coefficients, les valeurs de courbe et les limites (courbes génériques, interpolations).

### Exemples
Vérifiable sur le wiki :
| Cas | Attendu | Source |
|---|---|---|
| Club +0, STR 9, une main (prérequis STR 10) | 61 | [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) |
| Club +0, STR 9, deux mains (effective 13) | prérequis atteint ; bonus non calculable (Club : `scaling.str` = C, pas de coefficient) | déduction |

Estimations reproductibles depuis `data/`, **non vérifiables sur le wiki** : à utiliser comme tests de non-régression de la méthode, pas comme vérité du jeu. Longsword Standard : +0 = 110, coefficients STR 0,5 / DEX 0,33 ; +25 = 265, coefficients 0,75 / 0,49.

| Cas | Attendu |
|---|---|
| Longsword +0, STR 20, DEX 20, une main | 141 (110 × (1 + 0,5 × 0,35 + 0,33 × 0,35) = 141,955) |
| Longsword +25, STR 20, DEX 20 | 380 |
| Longsword +25, STR 40, DEX 40 | 453 |
| Longsword +10 (interpolé : base 172, coefficients 0,6 / 0,394), STR 30, DEX 15 | 236 |
| Longsword +0, STR 14 à deux mains (effective 21, courbe 36,15), DEX 10 | 135 |
| Longsword +0, STR 9, DEX 20, une main | 66 (pénalité : 110 × 0,6) |
| Longsword +0, STR 7 à deux mains (effective 10), DEX 20 | 130 |

Non vérifiable : la page [Lion Greatbow](https://eldenring.wiki.gg/wiki/Lion_Greatbow) publie des puissances d'attaque à attributs donnés (45/45 → 501 ; 80/18 → 488 ; 54/18 → 470 ; 15/80 → 466), sans niveau d'amélioration ; `data/` n'a pas ses coefficients. Ces valeurs ne permettent pas de valider la méthode.

---

## 8. Étapes, score, niveau recommandé : ce qui contredit les données

Choix de conception non jugés. Points où la description ne peut pas s'appliquer aux champs réels :
- **`acquisition[].region` vaut `null` pour 335 acquisitions d'armes** ; il faut alors repartir de `regions_mentioned` ou de `location`.
- Les valeurs réelles absentes de la table d'étapes sont nombreuses :
  - jeu de base : Consecrated Snowfield, Forbidden Lands, Miquella's Haligtree, Siofra River, Ainsel River, Greyoll's Dragonbarrow, et `Leyndell, Royal Capital` (la table dit « Leyndell ») ;
  - *Shadow of the Erdtree* : Scadu Altus, Shadow Keep, Rauh Base, Jagged Peak, Cerulean Coast, Abyssal Woods, Charo's Hidden Grave ;
  - valeurs mal extraites : `"accessed through Rauh Base"`, `"through Rauh Base"`, `"Realm of Shadow"` ;
  - aucune arme n'a `Crumbling Farum Azula` en région.
  - La table doit couvrir ces valeurs ou prévoir un repli.
- **Remembrance → boss** : aucun champ structuré. Exemple : Blasphemous Blade a `region: null`, `location: "Roundtable Hold"`, `regions_mentioned: ["Roundtable Hold"]`. Le lien vers Rykard n'existe que dans `acquisition[].details` (« gained by defeating Rykard ») ; Rykard est bien à Mt. Gelmir (`bosses.json`, `encounters[].regions` = `["Mt. Gelmir", "Volcano Manor"]`). Sans table de correspondance Remembrance → boss, la règle donne une étape fausse.
- **« Butin de PNJ envahisseur »** : aucun indicateur. `acquisition_flags` ne connaît que `random_enemy_drop`, `purchasable`, `npc_or_quest_related` (qui mêle quêtes et envahisseurs), `remembrance_weapon`, `starting_equipment`.
- **Équipement de départ de l'origine choisie** : `starting_equipment` ne dit pas de quelle origine il s'agit ; faire la jointure avec `origins.json`, `starting_equipment`.
- Composante « Puissance » : l'attaque totale à +0 n'a pas de sens pour les bâtons et les sceaux, qui ont une puissance d'attaque faible et une puissance de sort (`sorcery_scaling` / `incantation_scaling`) à part. Le score les pénalise mécaniquement.

---

## Propositions de correctifs de données (décision du chef de projet)

**P1. `data/origins.json`, entrée Heavy Knight (*Tarnished Pack*), champ `base_stats.equip_load`** : 53.3 → 59.3.
- Justification [déduction] : 53.3 est le poids de l'équipement de départ selon la note de la page ; la table [Endurance](https://eldenring.wiki.gg/wiki/Endurance) donne 17 → 59.3. URL : https://eldenring.wiki.gg/wiki/Heavy_Knight
- Options : (a) corriger à 59.3 et consigner la déduction ; (b) passer à `null` (valeur du wiki non fiable) ; (c) laisser et ne jamais lire ce champ dans l'application.
- **Recommandation : (a)**, et l'application calcule de toute façon les statistiques dérivées depuis les tables.

**P2. `data/ranged_weapons_catalysts.json`, entrée Horn Bow, `upgrade.tables.Standard["+N"].scaling.<attr>.coef`** : 43 valeurs mal lues. Le wiki écrit des décimales sans zéro initial (`.1`, `.104`, `.3068`), lues comme 1.0, 104.0, 3068.0. URL : https://eldenring.wiki.gg/wiki/Horn_Bow
- Règle : nouvelle valeur = `0.` suivi des chiffres de l'ancienne.
- `int` : +0 1.0 → 0.1 ; +1 104.0 → 0.104 ; +2 108.0 → 0.108 ; +3 112.0 → 0.112 ; +4 116.0 → 0.116 ; +5 12.0 → 0.12 ; +6 124.0 → 0.124 ; +7 128.0 → 0.128 ; +8 132.0 → 0.132 ; +9 136.0 → 0.136 ; +10 14.0 → 0.14 ; +11 143.0 → 0.143 ; +12 146.0 → 0.146 ; +13 149.0 → 0.149 ; +14 152.0 → 0.152 ; +15 155.0 → 0.155 ; +16 158.0 → 0.158 ; +17 161.0 → 0.161 ; +18 164.0 → 0.164 ; +19 167.0 → 0.167 ; +20 17.0 → 0.17 ; +21 172.0 → 0.172 ; +22 174.0 → 0.174 ; +23 176.0 → 0.176 ; +24 178.0 → 0.178 ; +25 18.0 → 0.18.
- `dex` : +9 3068.0 → 0.3068 ; +10 312.0 → 0.312 ; +11 3172.0 → 0.3172 ; +12 3224.0 → 0.3224 ; +13 3276.0 → 0.3276 ; +14 3328.0 → 0.3328 ; +15 338.0 → 0.338 ; +16 3432.0 → 0.3432 ; +17 3484.0 → 0.3484 ; +18 3536.0 → 0.3536 ; +19 3588.0 → 0.3588 ; +20 364.0 → 0.364 ; +21 3692.0 → 0.3692 ; +22 3744.0 → 0.3744 ; +23 3796.0 → 0.3796 ; +24 3848.0 → 0.3848 ; +25 39.0 → 0.39.
- Options : (a) corriger la lecture des nombres dans `tools/wiki/` puis régénérer le fichier ; (b) corriger les 43 valeurs à la main.
- **Recommandation : (a)**, puis contrôler qu'aucun `coef` ne dépasse 3 dans les trois fichiers d'armes.

**P3. Inventaire débloqué par les Bell Bearings** : absent de `data/`. URL : https://eldenring.wiki.gg/wiki/Bell_Bearing
- Options : (a) ajouter à `npcs.json`, Twin Maiden Husks, `shop_inventory`, les 17 pierres avec prix, stock illimité et condition « Bell Bearing [n] » ; (b) ajouter un champ `unlocks` aux 9 Bell Bearings de `key_items.json` ; (c) s'appuyer sur la convention de nommage, sans les prix.
- **Recommandation : (a)** : c'est la seule option qui donne les prix et qui reste fidèle à la structure des boutiques.

Signalements sans correctif : la colonne `Increments` des tables de `mechanics.json` (en-tête recopié en ligne 1) est à ignorer ; la phrase « rounded up » de la page Strength et le « 4 » Somberstone Bell Bearings sont des incohérences du wiki lui-même.

## Non vérifiable
- La formule du coût des niveaux (le wiki ne publie que la table) et le plafond de 713.
- Le maniement à deux mains obligatoire des Light Bows, Bows et Crossbows.
- Les courbes de correction par arme, la correspondance attribut → type de dégâts hors Cold, Occult, Blood et Poison, les valeurs intermédiaires des armes normales, les coefficients de 444 armes sur 487.
- Le comportement des courbes sous 10 points d'attribut.
