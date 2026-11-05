# Compléments possibles depuis eldenring.wiki.gg

Recherche du 01/11/2026 : ce que le wiki documente et que `data/` ne contient pas encore. Rien n'a été extrait ni modifié ; le chef de projet décide de l'extraction.

**Méthode.** API MediaWiki seulement (`prop=revisions`, `list=search`, `list=categorymembers`, `list=embeddedin`, `list=allpages`, `meta=siteinfo`, `meta=allmessages`). Lots de 50 titres au plus, 1,6 s entre deux requêtes, User-Agent de `tools/wiki/fetch_pages.py`. Environ 45 requêtes, téléchargements dans `.cache/wiki/complements/`. Aucun autre site consulté.

**Étiquettes de fiabilité.**
- **[Wiki]** : valeur écrite sur une page du wiki.
- **[Déduction]** : conséquence d'une valeur du wiki et d'une règle que le wiki énonce.
- **[Data]** : calcul sur `data/`.
- **[Non vérifié]** : point à contrôler.

---

## 1. Type d'amélioration des armes

### Constat principal : une page de liste existe et n'a pas été lue

- **[Wiki]** La page [Armaments by Bolstering Material](https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material) donne le matériau de chaque arme.
  - Dernière révision : 2025-05-01 (Torbi).
  - Forme : un tableau par classe d'arme, chacun dans une `<section>`, avec deux colonnes : lien de l'arme, puis matériau.
  - Contenu : 479 lignes, dont 284 « Smithing Stone », 194 « Somberstone » et 1 « Unupgradable » (Meteorite Staff).
- **[Wiki]** La page [Ash of War-Compatible Armaments](https://eldenring.wiki.gg/wiki/Ash_of_War-Compatible_Armaments) a la même structure et la même date de révision (2025-05-01).
  - Contenu : 479 lignes, 257 `{{Yes}}` et 222 `{{No}}`.
- **[Data]** Chaque nom de la liste correspond à une arme de `data/`. En sens inverse, 8 armes de `data/` sont absentes de la liste : toutes sont étiquetées `Tarnished Pack`, contenu plus récent que la révision de la page.

### Couverture des `null` (309)

| Fichier | `null` actuels | Remplis par la liste | dont Smithing / Somber | Restent `null` |
|---|---|---|---|---|
| `melee_armaments.json` | 185 | 181 | 102 / 79 | 4 (Tarnished Pack) |
| `ranged_weapons_catalysts.json` | 42 | 42 | 30 / 12 | 0 |
| `shields_torches.json` | 82 | 80 | 68 / 12 | 2 (Tarnished Pack) |
| **Total** | **309** | **303** | 200 / 103 | **6** |

Les 6 armes qui restent sans valeur, toutes `Tarnished Pack` :
- Leontiel's Greatsword ;
- Reverse-Bladed Sword ;
- Reed Great Katana ;
- Golden Order Flail ;
- Silver Grooved Shield ;
- Ritual Thrusting Shield.

Pour Reed Great Katana, la page de l'arme permet une déduction forte (voir « Contrôle croisé » plus bas). Pour Reverse-Bladed Sword et Ritual Thrusting Shield, la déduction n'est que moyenne.

### Estimations confirmées ou contredites

**[Data]** La liste du wiki couvre 191 des estimations `upgrade.estimate_if_undocumented` :
- **178 confirmées** : 169 en mêlée, 1 à distance, 8 boucliers ;
- **13 contredites**, soit 7 %.

Les 13 estimations contredites :
- **Estimées Smithing, Somber selon la liste (12)** : Carian Sorcery Sword, Gargoyle's Black Blades, Gargoyle's Black Axe, Dragon Greatclaw, Inquisitor's Girandole, Crystal Spear, Rotten Crystal Spear, Gargoyle's Black Halberd, Ripple Crescent Halberd, Golden Halberd, Dragon Halberd, Clinging Bone.
- **Estimée Somber, Smithing selon la liste (1)** : Bone Bow.

### Valeurs déjà documentées

- **[Data]** La liste confirme 174 des 176 valeurs que `data/` tient déjà du wiki.
- Elle en contredit 2. Dans les deux cas, le texte de la page de l'arme donne raison à la liste : ce sont des erreurs de l'extraction (correctifs P-A1 et P-A2 ci-dessous).

### Cohérence interne

- **[Data]** Les deux listes concordent entièrement :
  - les 194 armes « Somberstone » sont toutes « No » pour les Cendres de guerre ;
  - les 257 armes « Yes » utilisent toutes des pierres normales ;
  - 27 armes à pierres normales n'acceptent pas de Cendres (arbalètes, sceaux, quelques armes).
- La règle est énoncée sur la page [Ashes of War](https://eldenring.wiki.gg/wiki/Ashes_of_War) **[Wiki]** : « Ashes of War also cannot be applied to any weapon that is upgraded using Somber Smithing Stones ».

### Champ `ash_of_war_changeable`

**[Data]** Ce champ vaut `null` pour 300 armes. La seconde liste en remplit 294. Les valeurs déjà présentes concordent avec elle dans 183 cas ; les 2 désaccords concernent les mêmes armes que P-A1 et P-A2.

### Contrôle croisé par le texte des pages (seconde méthode)

**[Déduction]** J'ai relu les 309 pages sans matériau. Une arme dont la page dit qu'elle prend une affinité, une Cendre de guerre, ou qu'elle monte au-delà de +10, utilise des pierres normales : la règle vient des pages Ashes of War et [Somber Smithing Stones](https://eldenring.wiki.gg/wiki/Somber_Smithing_Stones) (« up to +10 »).

- **65 déductions fortes** : 43 en mêlée, 5 à distance, 17 boucliers. Exemples :
  - [Falchion](https://eldenring.wiki.gg/wiki/Falchion) : « At +25, this weapon has a scaling of C/C/- » ;
  - [Serpent Crest Shield](https://eldenring.wiki.gg/wiki/Serpent_Crest_Shield) : « At +25 on a Fire and Flame Art infusion » ;
  - [Longbow](https://eldenring.wiki.gg/wiki/Longbow) : tableau d'amélioration jusqu'à Standard +15.
- **Accord avec la liste : 63 sur 64.** La 65ᵉ déduction, Reed Great Katana, n'est pas dans la liste.
- **Seul conflit : [Carian Sorcery Sword](https://eldenring.wiki.gg/wiki/Carian_Sorcery_Sword) (Shadow of the Erdtree).** La liste dit « Somberstone ». La page contient à la fois « when upgraded to +10 » et « At +25 it has 163 Sorcery Scaling ». C'est une incohérence du wiki **[Non vérifié]**.
- **6 déductions moyennes** : Smithscript Dagger, Reverse-Bladed Sword, Morning Star, Rickety Shield, Ritual Thrusting Shield, Dragonclaw Shield. Pour Dragonclaw Shield, la phrase porte sur le Fingerprint Stone Shield, et la liste dit « Somberstone » : cette déduction est à écarter.
- **[Wiki]** Une recherche plein texte `insource:"somber"` donne 194 pages, dont une seule page d'arme sans matériau. Il s'agit de Black Steel Greatshield, dont le modèle Somber est mis en commentaire, avec la mention « Copied over from Icon greatshield ». Hors de la liste, aucune autre page ne documente le type d'amélioration.

### Extraction proposée

1. Récupérer le wikitext des deux pages (2 titres, une requête).
2. Pour chaque tableau, lire les couples `[[arme]]` → matériau ou `{{Yes}}` / `{{No}}`.
3. Normaliser les valeurs :
   - `Smithing Stone` → `Smithing Stones` (max +25) ;
   - `Somberstone` → `Somber Smithing Stones` (max +10) ;
   - `{{No}} Unupgradable` → `Not upgradeable`.
4. Écrire `material_info_source: "wiki (Armaments by Bolstering Material)"` et `changeability_info_source: "wiki (Ash of War-Compatible Armaments)"`.
5. Conserver les estimations seulement pour les 6 armes `Tarnished Pack`.
6. Signaler Carian Sorcery Sword dans `metadata.wiki_inconsistencies_flagged`.

- **Effort** : faible, environ 40 lignes dans `tools/wiki/`, avec contrôle par `diff_json.py`.
- **Fiabilité** : fait du wiki, recoupé par deux méthodes indépendantes.

### Correctifs de données proposés

| Id | Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur | URL |
|---|---|---|---|---|---|---|
| P-A1 | `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.material` | `"Somber Smithing Stones"` | `"Smithing Stones"` | https://eldenring.wiki.gg/wiki/Hoslow%27s_Petal_Whip ; https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material |
| P-A1 | idem | idem | `upgrade.max_level` | `10` | `25` | idem |
| P-A1 | idem | idem | `upgrade.material_info_source` | `"wiki (text)"` | `"wiki (Armaments by Bolstering Material)"` | idem |
| P-A1 | idem | idem | `upgrade.ash_of_war_changeable` | `false` | `true` | https://eldenring.wiki.gg/wiki/Ash_of_War-Compatible_Armaments |
| P-A1 | idem | idem | `upgrade.affinity_changeable` | `false` | `true` | page de l'arme (« non-Blood-infused Hoslow's Petal Whip ») |
| P-A2 | `shields_torches.json` | Golden Lion Shield (Shadow of the Erdtree) | `upgrade.material` | `"Smithing Stones"` | `"Somber Smithing Stones"` | https://eldenring.wiki.gg/wiki/Golden_Lion_Shield ; https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material |
| P-A2 | idem | idem | `upgrade.max_level` | `25` | `10` | idem |
| P-A2 | idem | idem | `upgrade.material_info_source` | `"deduced (…)"` | `"wiki (Armaments by Bolstering Material)"` | idem |
| P-A2 | idem | idem | `upgrade.ash_of_war_changeable` | `true` | `false` | https://eldenring.wiki.gg/wiki/Ash_of_War-Compatible_Armaments |
| P-A2 | idem | idem | `upgrade.affinity_changeable` | `true` | `false` | règle Somber, page Ashes of War |

Ce que disent les pages des armes :
- **P-A1** : la page dit « the only weapon in the game to deal extra damage when inflicting Bleed without being a Somber weapon ». L'extraction a lu « Somber weapon » comme une affirmation.
- **P-A2** : la page dit « has a fixed Skill, whereas the Brass Shield can have its Skill changed using different Ashes of War ». L'extraction a attribué au Golden Lion Shield la phrase qui concerne le Brass Shield.

---

## 2. Combats des boss

**Échantillon** : les 133 pages de `bosses.json`, soit 315 infobox `Infobox Boss` ou `Infobox Enemy`, plus les 43 pages de la liste [NPC Invaders](https://eldenring.wiki.gg/wiki/NPC_Invaders).

### Absorption et résistances

- **[Wiki]** Sur 315 infobox :
  - 92 ont une absorption chiffrée ;
  - 16 ont les clés vides ;
  - 207 n'ont aucune clé d'absorption.
- **[Data]** `data/` en contient 88. Le gain possible est donc d'environ 4 combats en absorption et 5 en résistances. Il vient d'une variante de nommage non lue, `negation_standard`… / `negation_poison`… au lieu de `res …`, présente sur [Onyx Lord](https://eldenring.wiki.gg/wiki/Onyx_Lord) et [Miranda Blossom](https://eldenring.wiki.gg/wiki/Miranda_Blossom) (première infobox), et d'une infobox de [Draconic Tree Sentinel](https://eldenring.wiki.gg/wiki/Draconic_Tree_Sentinel).
- **[Wiki]** Aucune page de boss ne contient de tableau d'absorption hors infobox : les tableaux repérés sont des listes d'attaques. Aucune page de synthèse de ce type n'existe (recherches « boss damage negation », « enemy absorption »).

### Le cas Gideon (valeurs dans un tableau et non dans l'infobox)

- **Sur les 133 pages de boss**, le cas ne se répète qu'une fois : [Count Ymir](https://eldenring.wiki.gg/wiki/Count_Ymir), sous la forme du modèle `NPC encounter table`, avec :
  - `zone = Cathedral of Manus Metyr`, `hp = 11,147`, `runes = 210,000` ;
  - drops : High Priest Set, Ymir's Bell Bearing.
- Les autres sections « Basic Info » sont soit déjà lues (Patches), soit vides sur le wiki (Needle Knight Leda, Hornsent, Moore, Swordhand of Night Anna, Thiollier).
- **Sur les pages d'envahisseurs**, le cas est fréquent : 13 pages sur 43 ont un tableau « Basic Info » chiffré (Location, HP, Runes, Drops). La plupart de ces PNJ sont déjà dans `npcs.json`, qui conserve ces tableaux dans `character_information.tables` (exemple : Dung Eater).

### Liens de page erronés dans `bosses.json` [Data]

Ces trois entrées pointent vers une page homonyme qui n'est pas celle du combat :

| Entrée | Page actuelle | Page du combat | Ce que contient la page du combat |
|---|---|---|---|
| Perfumer Tricia | page de la Cendre spirituelle | [Perfumer](https://eldenring.wiki.gg/wiki/Perfumer) | infobox `title = Perfumer Tricia`, `location = Unsightly Catacombs`, `hp = 989`, `runes = 9,400` |
| Madding Hand | page de l'arme | [Madding Hand (NPC)](https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)) | infobox vide sur le wiki |
| Swordhand of Night Jolán | page de la Cendre spirituelle | [Jolán, Swordhand of Night](https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night) | « Basic Info » vide sur le wiki |

### Points de vie

- **[Data]** 22 combats n'ont pas de PV. Une valeur peut en être retrouvée pour 4 :
  - **Count Ymir** : 11,147 PV ;
  - **Perfumer Tricia** : 989 PV ;
  - **[Demi-Human Queen Gilika](https://eldenring.wiki.gg/wiki/Demi-Human_Queen_Gilika)** : le wiki écrit `hp = 3.284`, avec un point comme séparateur de milliers. Lire 3 284 est une déduction **[Non vérifié]** ;
  - **Godskin Duo** : « around 24000 HP », valeur approximative déjà relevée dans `decisions-progression.md`.
- Les autres PV manquants sont vides ou absents sur le wiki.

### Extraction proposée

- Lire les clés `negation_*` comme des alias de `res *`.
- Lire le modèle `NPC encounter table|row` (zone, hp, runes, drops).
- Corriger les 3 liens de page.
- **Effort** : faible.
- **Gain** : environ 6 à 8 combats.
- **Fiabilité** : fait du wiki, sauf Gilika (déduction).

**Non comblable** : l'absorption d'environ 210 combats et les résistances d'environ 220 ne figurent pas sur le wiki.

---

## 3. Coefficients de scaling

- **[Data]** 44 armes ont au moins un coefficient (le brief en compte 43). Ils viennent de tableaux d'amélioration où la lettre est suivie d'une décimale (« D⏎0.35 »).
- **[Wiki]** J'ai cherché sur les 487 pages d'armes une lettre suivie d'une décimale, et les paramètres `*_exact`. Résultat : aucun coefficient non lu.
- **[Wiki]** La page [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) n'a pas de valeurs par arme. Les recherches « scaling coefficient », « attack rating calculation » et « correction graph » ne donnent rien.
- **[Wiki]** Un seul complément existe : la sous-page [Great Épée/Upgrade](https://eldenring.wiki.gg/wiki/Great_%C3%89p%C3%A9e/Upgrade) (révision du 2025-07-05, `data_source` 1.16).
  - Elle contient 1 690 paramètres `*_exact`, **presque tous vides** : 34 sont remplis, dont 32 numériques (**erratum**, voir « Correctifs préparés », § 4).
  - `data/` retient déjà ces 32 coefficients pour cette arme.
  - C'est la seule page qui utilise le modèle `Weapon Upgrade (Affinity)`, avec la page Great Épée qui la transclut.
- **Non comblable** : les coefficients des 443 autres armes. Le wiki ne donne que la lettre.

---

## 4. Régions d'acquisition et butin des PNJ envahisseurs

### `regions_mentioned` vide

**[Data]** 746 objets sont concernés, sur 12 fichiers. 149 d'entre eux n'ont aucune acquisition.

| Source | Objets concernés | Fiabilité | Effort |
|---|---|---|---|
| **A. Croisement interne** : l'acquisition cite un lieu ou un site de grâce présent dans `locations.json` (`name`, `wiki_page`, `sites_of_grace`), ce qui donne sa `region` | 221 | déduction tirée de faits du wiki | faible, sans téléchargement |
| **B. Pages d'ennemis** : l'objet tombe d'un ennemi | 176 (« drop from X enemies ») | déduction (ennemi présent dans la région) | moyen |
| Aucune piste | environ 200, plus les 149 sans acquisition | — | — |

Exemples pour la source A :
- Bloodbone Arrow → Fort Haight → Limgrave ;
- Bull-Goat Helm → Ruin-Strewn Precipice → Liurnia of the Lakes.

Je recommande de ne pas mélanger ces valeurs avec `regions_mentioned`, dont la définition est « régions nommées dans le texte ». Un champ distinct, par exemple `regions_inferred` avec sa base, garde la distinction.

Détail de la source B :
- **[Wiki]** 225 pages utilisent `Infobox Enemy`, et la catégorie [Category:Enemies](https://eldenring.wiki.gg/wiki/Category:Enemies) compte 175 pages. Les champs `location` et `drops` sont renseignés sur 9 pages de l'échantillon de 12 (exemples : [Kaiden Sellsword](https://eldenring.wiki.gg/wiki/Kaiden_Sellsword), `location = Limgrave`, `drops = Dismounter` ; [Redmane Knight](https://eldenring.wiki.gg/wiki/Redmane_Knight)). Messmer Soldier et Noble Page n'ont pas d'infobox ; Wandering Noble a des valeurs de remplissage.
- **[Wiki]** Le modèle `Drops table`, qui donne les taux, est utilisé sur 33 pages.

### Butin des PNJ envahisseurs

- **[Data]** Sur les 43 pages de la liste [NPC Invaders](https://eldenring.wiki.gg/wiki/NPC_Invaders) :
  - 10 sont dans `bosses.json` ;
  - 21 dans `npcs.json` ;
  - les autres dans aucun des deux.
- **5 pages, soit 8 combats**, ont des données chiffrées qui ne figurent nulle part dans `data/` :
  - [Anastasia, Tarnished-Eater](https://eldenring.wiki.gg/wiki/Anastasia,_Tarnished-Eater) : tableau « Basic Info », par exemple Caelid, 1515 PV, 2,531 runes, Sacred Scorpion Charm ;
  - [Mad Tongue Alberich](https://eldenring.wiki.gg/wiki/Mad_Tongue_Alberich) : 2,387 PV, 1,562 runes ;
  - [Moongrum, Carian Knight](https://eldenring.wiki.gg/wiki/Moongrum,_Carian_Knight) : 1831 PV, 3000 runes, Carian Knight's Shield ;
  - [Maleigh Marais, Shaded Castle Castellan](https://eldenring.wiki.gg/wiki/Maleigh_Marais,_Shaded_Castle_Castellan) : 1,717 PV, 4,800 runes ;
  - [Millicent's Sisters](https://eldenring.wiki.gg/wiki/Millicent%27s_Sisters) : 4 infobox, 18,932 runes, Rotten Winged Sword Insignia.
- Sans données sur le wiki : Bloody Finger Ravenmount Assassin, Preceptor Miriam, Eleonora, Chief Guardian Arghanthy, Great Jar. Les titres Flame Guardian et Baleful Shadow n'existent pas.
- Les envahisseurs du DLC (Ansbach, Freyja, Dane, Moore, Hornsent) ont des pages ébauches où les PV, runes et drops sont vides.

### Régions des combats

- **[Wiki]** La page [Enemies/Bosses](https://eldenring.wiki.gg/wiki/Enemies/Bosses) (révision du 2026-10-28) classe 148 articles de boss par région.
- Pour les 9 combats sans région, 4 boss y figurent. Le classement se fait par page et non par combat : Crucible Knight est rangé sous Limgrave alors que le combat sans région se déroule dans Road's End Catacomb.
- **Fiabilité** : faible. À n'utiliser que pour les boss qui n'ont qu'un seul combat (exemple : Elemer of the Briar → Altus Plateau).

---

## 5. Liens utiles pour l'application

### Lien « Voir sur le wiki »

- **[Wiki]** `articlepath = /wiki/$1` (`meta=siteinfo`). La forme est donc `https://eldenring.wiki.gg/wiki/<titre>`.
- Le titre s'écrit avec `_` à la place des espaces, en encodage URL. On peut garder `:`, `(`, `)`, `,` et `/` ; il faut encoder `&`, `?` et `#`. Pour viser une section, ajouter `#Titre_de_section`.
- **[Data]** `data/` mélange deux écritures de l'apostrophe : 609 URL avec `%27` (fichiers d'objets et d'armes) et 54 avec `'` brut (50 dans `locations.json`, 4 dans `bosses.json`). Les deux fonctionnent. Je recommande de générer l'URL à la compilation depuis `wiki_page`, avec une seule fonction.

### Carte interactive

- **[Wiki]** L'extension « Interactive Data Maps » (DataMaps) est installée. La carte principale est [Map:ELDEN RING](https://eldenring.wiki.gg/wiki/Map:ELDEN_RING) (révision du 2025-07-11).
- **Contenu** : 238 marqueurs, 222 sur la couche « The Lands Between » et 16 sur « Great Underground Rivers ».
  - Le fond « Realm of Shadow » existe, mais **aucun marqueur Shadow of the Erdtree**.
  - Chaque marqueur a un `id` numérique (exemple : `100001` = Limgrave) et un champ `article`.
  - **[Data]** 228 de ces articles correspondent à une entrée de `locations.json`, toutes `Base game`.
- **Lien vers un marqueur** : l'extension propose « Get a shareable link » (message `datamap-popup-marker-link-get`). La forme exacte de l'URL n'est pas documentée sur le wiki, et sa documentation est hébergée sur support.wiki.gg, que je n'ai pas consulté. À vérifier dans un navigateur **[Non vérifié]**.
- **Cartes secondaires** : [Map:Item Location - Smithing Stones](https://eldenring.wiki.gg/wiki/Map:Item_Location_-_Smithing_Stones), [Map:Item Location - Maps](https://eldenring.wiki.gg/wiki/Map:Item_Location_-_Maps) (19 marqueurs) et des cartes plus anciennes (Lands Between, version 1.00). Seules les pages [Maps](https://eldenring.wiki.gg/wiki/Maps) et [Furnace Golem](https://eldenring.wiki.gg/wiki/Furnace_Golem) intègrent une carte.

### Guides et progression

| Page | État | Usage possible |
|---|---|---|
| [Elden Ring Guide](https://eldenring.wiki.gg/wiki/Elden_Ring_Guide) | 24 étapes, de Chapel of Anticipation à « End » | déjà utilisée par `decisions-progression.md` |
| [Recommended Level by Location](https://eldenring.wiki.gg/wiki/Recommended_Level_by_Location) | 21 paliers de zones | déjà utilisée |
| [Walkthrough](https://eldenring.wiki.gg/wiki/Walkthrough) | inachevé : The Basics → Weeping Peninsula, puis « TBA » ; une page [Walkthrough/Shadow of the Erdtree](https://eldenring.wiki.gg/wiki/Walkthrough/Shadow_of_the_Erdtree) | lien seulement |
| [Enemies/Bosses](https://eldenring.wiki.gg/wiki/Enemies/Bosses) | boss par région, base et DLC | lien « boss de la région » |
| [Sites of Grace](https://eldenring.wiki.gg/wiki/Sites_of_Grace) | sites de grâce par région, avec une section Shadow of the Erdtree | lien |
| [Map](https://eldenring.wiki.gg/wiki/Map) | fonctionnement de la carte en jeu | lien d'aide |

---

## 6. Autres ensembles de données absents de `data/`

Liste sans extraction :

| Ensemble | Source | Taille | Intérêt pour le Codex |
|---|---|---|---|
| Ennemis : PV, runes, lieux, butin | `Infobox Enemy` (225 pages), [Bestiary](https://eldenring.wiki.gg/wiki/Bestiary), `Drops table` (33 pages) | environ 225 pages | sources de butin et régions (§ 4) |
| Succès et trophées | [Category:Achievements/Trophies](https://eldenring.wiki.gg/wiki/Category:Achievements/Trophies) | 43 pages | liste de suivi |
| Ensembles d'armure | [Armor Sets](https://eldenring.wiki.gg/wiki/Armor_Sets), [Category:Armor Set](https://eldenring.wiki.gg/wiki/Category:Armor_Set) | 128 pages | regrouper les pièces de `armor.json`, qui n'a pas de champ « set » |
| Familles de talismans | [Category:Talisman Sets](https://eldenring.wiki.gg/wiki/Category:Talisman_Sets) | 33 pages | regrouper les talismans par niveau |
| Rareté des objets | [Item Rarity](https://eldenring.wiki.gg/wiki/Item_Rarity) (révision du 2025-05-06) | liste de tous les objets | absente de `data/` |
| Ennemis qui ne réapparaissent pas | [Enemies/Non-Respawning](https://eldenring.wiki.gg/wiki/Enemies/Non-Respawning) | par région | suivi de progression |
| Vêtements modifiables | [Alter Garments/List of alterable garments](https://eldenring.wiki.gg/wiki/Alter_Garments/List_of_alterable_garments) | liste | recoupe `armor.altered_version` |
| Notes de synthèse par arme | [Armament Overview](https://eldenring.wiki.gg/wiki/Armament_Overview) (révision du 2025-12-08) | texte | faible : avis rédactionnels |

---

## Recommandation, par gain décroissant

1. **Lire « Armaments by Bolstering Material » et « Ash of War-Compatible Armaments ».**
   - Gain : 303 `null` sur 309 remplacés par un fait du wiki, 294 `ash_of_war_changeable` remplis, 2 erreurs d'extraction corrigées (P-A1, P-A2), 13 estimations écartées.
   - Effort : faible, 2 pages.
   - Fiabilité : fait du wiki, recoupé à 100 % entre les deux listes et à 63 sur 64 avec le texte des pages.
   - Reste à trancher : Carian Sorcery Sword, où la liste et la page se contredisent. Deux options : (a) prendre la liste et signaler l'incohérence ; (b) laisser `null`. Je recommande (a).
2. **Croisement interne lieux → régions.**
   - Gain : 221 objets situés.
   - Effort : faible, sans téléchargement.
   - Fiabilité : déduction, à placer dans un champ distinct.
3. **Corrections de combats.**
   - Contenu : alias `negation_*`, modèle `NPC encounter table`, 3 liens de page, 5 pages d'envahisseurs absentes.
   - Gain : environ 15 combats, dont Count Ymir et Perfumer Tricia.
   - Effort : faible.
4. **Fichier ennemis** depuis `Infobox Enemy`.
   - Gain : sources de butin et régions pour une partie des 176 objets tombés d'ennemis, PV des ennemis.
   - Effort : moyen, environ 225 pages.
5. **Liens** : carte interactive (base seulement, forme du lien à vérifier), Enemies/Bosses, Sites of Grace ; une fonction unique de génération d'URL.
6. **Ensembles secondaires** : trophées, ensembles d'armure, rareté, sous-page Great Épée/Upgrade.

**Non vérifiable avec le wiki** :
- l'absorption d'environ 210 combats et les résistances d'environ 220 ;
- les coefficients de scaling de 443 armes ;
- le matériau de 3 armes `Tarnished Pack` (Leontiel's Greatsword, Golden Order Flail, Silver Grooved Shield) ;
- les PV, runes et drops des envahisseurs du DLC ;
- les marqueurs Shadow of the Erdtree de la carte interactive.

---

## Correctifs préparés (décision D29)

Préparés le 01/11/2026. **Rien n'est appliqué** : `data/` est inchangé (`git status` ne montre aucune modification sous `data/`). Les opérations sont dans deux fichiers :
- `docs/contenu/correctifs-complements.json` : **1 585 opérations**, applicables telles quelles ;
- `docs/contenu/correctifs-complements-schema.json` : **1 opération** qui exige d'abord un changement de schéma (voir § 4).

**Vérifications faites.** Toutes les valeurs `old` ont été comparées à `data/` par un script distinct du générateur : 0 écart. Les opérations ont été appliquées sur une copie des 18 fichiers, puis `prepareAll` (`scripts/data/pipeline.ts`, schémas et contrôles du projet) a accepté le résultat : 18 jeux de données, aucun échec bloquant. Les 479 armes de la liste concordent ensuite avec elle, pour le matériau, le niveau maximal et la Cendre de guerre.

### Format du fichier

Liste d'objets `{ op, file, entry, path, path_segments, old, new, url, reason, decision: "D29" }`, à appliquer **dans l'ordre**.
- `entry` : `wiki_page` de l'entrée (`title` pour `mechanics.json`) ; `null` pour une opération sur `metadata`.
- `path_segments` fait foi (liste de clés ou d'indices) ; `path` est la même chose en texte. Une clé contient un point (`upgrade.*_info_source`).
- `set` : `old` doit être égal à la valeur actuelle (`null` compris).
- `remove` : `old` est la valeur retirée ; un indice de liste retire l'élément.
- `add` : crée une clé absente avec `new`. Si l'opération porte `"append": true`, elle ajoute `new` à la fin de la liste visée. Si `path_segments` vaut `["bosses"]`, elle ajoute une page de boss (à replacer ensuite selon `(source != "Base game", name)`, le tri de `build_bosses.py`).
- Pour les trois pages de boss dont le lien change, l'opération `wiki_page` est la dernière de l'entrée : les autres la désignent par l'ancienne valeur.
- `url` : la page du wiki ; deux adresses séparées par ` ; ` quand la valeur vient d'une page de liste et de la page de l'arme.

### 1 et 2. Listes « Bolstering Material » et « Ash of War-Compatible »

| Catégorie | Opérations | Entrées |
|---|---|---|
| `upgrade.material`, `max_level`, `material_info_source` (3 par arme) | 909 | 303 armes : 181 mêlée, 42 distance, 80 boucliers ; 200 Smithing Stones, 103 Somber |
| `upgrade.ash_of_war_changeable` et `changeability_info_source` (2 par arme) | 588 | 294 armes : 185 mêlée, 29 distance, 80 boucliers ; 184 Yes, 110 No |
| P-A1 Hoslow's Petal Whip | 6 | `material`, `max_level`, `material_info_source`, `ash_of_war_changeable`, `affinity_changeable`, `changeability_info_source` |
| P-A2 Golden Lion Shield (Shadow of the Erdtree) | 6 | idem |
| Carian Sorcery Sword | 2 | signalement (voir plus bas) ; son matériau est compté dans les 303 |
| Métadonnées des 3 fichiers | 6 | `field_notes["upgrade.*_info_source"]` et `upgrade_path_documentation` (comptes recalculés) |

- **Provenance.** `material_info_source = "wiki (Armaments by Bolstering Material)"`. `changeability_info_source` n'a qu'une valeur pour les deux champs d'affinité et de Cendre. S'il est vide, il reçoit `"wiki (Ash of War-Compatible Armaments)"`. S'il existe déjà (12 armes à distance, par exemple « wiki (class page: Bows) »), la nouvelle provenance s'y ajoute avec ` + `, comme le font déjà les valeurs composées du fichier.
- **Les 191 estimations** (181 + 2 + 8) gardent leurs champs. Comparées à la liste :
  - 173 sont confirmées ;
  - **13 sont contredites sur le matériau** : 12 estimées Smithing et Somber selon la liste, plus Bone Bow estimée Somber et Smithing selon la liste ;
  - **5 ont le bon matériau mais une mauvaise valeur de Cendre** (`ash_of_war_changeable: true` estimé, `No` dans la liste) : Serpentbone Blade, Great Club, Troll's Hammer, Torchpole, Treespear. Ce dernier point est nouveau par rapport à l'étude.
- **Cas laissés de côté.**
  - 6 armes `Tarnished Pack` absentes de la liste restent à `null` (les 4 de mêlée gardent leur estimation) : Leontiel's Greatsword, Reverse-Bladed Sword, Reed Great Katana, Golden Order Flail, Silver Grooved Shield, Ritual Thrusting Shield. Les déductions tirées du texte des pages (forte pour Reed Great Katana, moyenne pour Reverse-Bladed Sword et Ritual Thrusting Shield) ne sont pas converties en valeurs.
  - Idus Sword et Hefty Scimitar (`Tarnished Pack`) ne sont pas dans la liste mais ont déjà une valeur : inchangées.
  - Les noms `Misericorde` et `Beast Claw` de la liste sont appariés aux entrées `Miséricorde` et `Beast Claw (weapon)` ; 479 armes sur 479 sont appariées.
  - `affinity_changeable` n'est pas touché, sauf pour P-A1 et P-A2. Après application, **95 armes Somber** ont encore `affinity_changeable: null`, alors que les 91 armes Somber déjà documentées ont toutes `false`. Option : les passer à `false` par la règle du wiki (page Ashes of War). Je le recommande ; hors du périmètre retenu, donc non préparé.
- **Carian Sorcery Sword.** Valeur de la liste retenue (Somberstone, max +10, Cendres `false`). L'incohérence est signalée ainsi :
  - le nom est ajouté à `metadata.wiki_inconsistencies_flagged` de `melee_armaments.json` ;
  - la raison est écrite dans une nouvelle entrée `metadata.field_notes["wiki_inconsistencies_flagged"]`.
  Le mécanisme existant ne portait pas de raison, et son sens d'origine est « tableau contre infobox ». Le schéma des métadonnées (`src/data/types/weapon.ts`) refuse toute clé nouvelle, d'où le choix de `field_notes`. Option B, plus propre mais qui demande un changement de schéma : une clé structurée `material_inconsistencies_flagged` avec `{weapon, field, value_kept, contradicting_text, urls}`.

### 3. Combats

| Catégorie | Opérations | Détail |
|---|---|---|
| Clés `negation_*` | 17 | Onyx Lord (1re rencontre) : `damage_negation_percent` (8 valeurs) ; l'objet `other_infobox_fields`, qui ne contenait que ces clés, est retiré. Miranda Blossom (1re rencontre) : `damage_negation_percent` (8), `status_resistance` (5 : poison, rot, bleed, frost, sleep), 13 clés `negation_*` retirées de `other_infobox_fields`. Les plages (« 1093 ~ 1235 ») restent en texte, comme ailleurs dans `status_resistance`. |
| Count Ymir | 1 | une rencontre : Cathedral of Manus Metyr, 11,147 PV, 210,000 runes, High Priest Set et Ymir's Bell Bearing ; source Shadow of the Erdtree ; région Scadu Altus d'après `locations.json` |
| 3 liens de page | 18 | voir ci-dessous |
| 5 pages d'envahisseurs | 5 | 5 entrées complètes, 9 rencontres |
| Métadonnées de `bosses.json` | 4 | `boss_pages` 133 → 138, `encounters` 302 → 314, `counts_by_source`, `encounters_by_source` |

Les 3 liens : nom, résumé, notes de combat, rencontre, `url` et `wiki_page` sont relus sur la bonne page.

| Entrée | Nouvelle page | Rencontre | Remarque |
|---|---|---|---|
| Perfumer Tricia | [Perfumer](https://eldenring.wiki.gg/wiki/Perfumer) | 1 : Unsightly Catacombs, 989 PV, 9,400 runes | la page contient aussi deux infobox d'ennemis ordinaires (Perfumer, Depraved Perfumer) ; je ne retiens que celle de Tricia |
| Madding Hand | [Madding Hand (NPC)](https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)) | 1 : Abyssal Woods, sans PV ni runes, butin Madding Hand | l'infobox existe (l'étude la disait vide) ; dans le résumé, « Madding Hand (NPC) is » est ramené à « Madding Hand is » |
| Swordhand of Night Jolán | [Jolán, Swordhand of Night](https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night) | aucune (tableau Basic Info vide) | nom devenu « Jolán, Swordhand of Night », `character_location` ajouté |

Autres écarts à signaler :
- **Identifiants.** `slug.ts` fait dériver l'identifiant de `wiki_page` : `perfumer-tricia` devient `perfumer`, `madding-hand` devient `madding-hand-npc`, `swordhand-of-night-jolan` devient `jolan-swordhand-of-night`. Si la persistance stocke déjà ces identifiants (suivi de boss vaincus), prévoir une migration. Aucun test ne contient ces trois identifiants.
- **Perfumer Tricia, deux options.** A (préparée, recommandée) : seule la rencontre de Tricia. B : les 3 infobox de la page, comme le ferait l'extracteur, ce qui ajoute deux ennemis ordinaires à une liste de boss.
- **Notes de combat.** La ligne « See also: Misbegotten Warrior#Unsightly Catacombs-0 » est retirée des notes de Tricia.

Les 5 pages d'envahisseurs. Les entrées sont construites avec le code de `build_bosses.py` ; rejoué sur les 133 pages existantes, il redonne 128 rencontres identiques, les 5 autres étant des correctifs manuels déjà appliqués.

| Entrée | Rencontres | Données |
|---|---|---|
| Anastasia, Tarnished-Eater | 1 | Caelid ; Mt. Gelmir ; Consecrated Snowfield ; PV « 1,515-4,370 » et runes « 2,531-19,634 » (texte du wiki), 3 butins |
| Mad Tongue Alberich | 1 | Roundtable Hold ; 2,387 PV, 1,562 runes ; absorption et résistances complètes |
| Moongrum, Carian Knight | 1 | Liurnia of the Lakes ; 1831 PV, 3000 runes |
| Maleigh Marais, Shaded Castle Castellan | 1 | « West of the Shaded Castle » ; 1,717 PV, 4,800 runes ; région Altus Plateau d'après `locations.json` (« The Shaded Castle ») |
| Millicent's Sisters | 5 | l'infobox de groupe (18,932 runes, Rotten Winged Sword Insignia, sans PV) et les 4 sœurs (5 533 ou 5 681 PV) |

- **Neuf rencontres, pas huit.** L'étude comptait 4 infobox pour les sœurs ; la page en a 5, dont l'infobox de groupe, que la règle d'extraction (PV, runes ou butin) retient.
- **`tier` vide** pour ces 5 entrées : aucune n'est dans les navbox Bosses (vérifié sur le wikitext des deux modèles). Option : leur donner `Invaders and other minibosses`, ce qui sort du sens « groupe de navbox » ; à décider. Le schéma accepte `tier: []`.
- **Corrections manuelles** par rapport à la sortie brute : nom de la rencontre d'Alberich (la légende d'une galerie, « Invader », s'était glissée dans le nom), lieux de Millicent's Sisters écrits `a; b` au lieu de `*a *b`, marque `__TOC__` retirée du résumé.
- **Non retenu, donc non traité :** les PV de Demi-Human Queen Gilika (« 3.284 ») et de Godskin Duo, l'infobox de Draconic Tree Sentinel.
- **Non traitées faute de données :** Bloody Finger Ravenmount Assassin, Preceptor Miriam, Eleonora, Chief Guardian Arghanthy, Great Jar (aucune donnée chiffrée) ; Flame Guardian et Baleful Shadow (pages absentes).

### 4. Great Épée : le constat est plus mince que l'étude

- **Erratum.** La sous-page [Great Épée/Upgrade](https://eldenring.wiki.gg/wiki/Great_%C3%89p%C3%A9e/Upgrade) ne contient pas 1 690 coefficients : elle a 1 690 paramètres `*_exact`, dont 34 remplis (32 numériques et 2 « ? »). Elle ne donne que les statistiques au niveau +0 (Standard), les statistiques au niveau +25 des 13 affinités, et le coût en runes de chaque niveau de +1 à +25.
- **Tout est déjà dans `data/`**, valeur par valeur, sauf les 24 coûts de +1 à +24 (le coût de +25, 2 262, y est). Comparaison faite sur les attaques, gardes, critiques, grades et 32 coefficients : 0 écart.
- **Opération préparée** (`correctifs-complements-schema.json`) : `upgrade.tables.Standard` reçoit les niveaux +1 à +24, chacun avec le seul champ `upgrade_cost_runes` (390 à 2 184), comme les tableaux des armes Somber.
- **Blocage.** `upgradeLevelSchema` (`src/data/types/weapon.ts`) exige `attack.physical` à chaque niveau, et le wiki ne le donne pas pour +1 à +24. Appliquer l'opération en l'état ferait échouer `prepareAll`. Options :
  - (A) rendre `attack` facultatif dans le schéma, puis appliquer ;
  - (B) ne pas appliquer : le gain est de 24 coûts en runes, qu'aucun code de `src/` n'utilise (`upgrade_cost_runes` n'y apparaît que dans le schéma).
  Je recommande B, sauf si un calcul de coût d'amélioration est prévu.

### 5. Nettoyage

| Catégorie | Opérations | Détail |
|---|---|---|
| Restes `ER Icon … .png` | 21 | `key_items.json` : Cracked Pot (2), Ritual Pot (1), Perfume Bottle (1). `mechanics.json` : Whetblades, Smithing Stones, Somber Smithing Stones, Skill (13 tableaux), Paired Weapons. |
| Fanged Imp Ashes | 2 | voir ci-dessous |

Les 21 valeurs sont des listes de galerie. Le nom de fichier et l'attribut `link=` sont retirés ; la légende est conservée, une par ligne. Les retours à la ligne internes d'une légende sont joints par une espace, et la mention DLC passe entre parenthèses (« Wing Stance (Shadow of the Erdtree) »). Seules 3 légendes diffèrent de leur lien (page à ancre ou à désambiguïsation), sans effet. Plus aucun « ER Icon » ne reste dans ces deux fichiers.

Constaté hors périmètre : `locations.json` (1 valeur), `mechanics.json` (topic « Locations ») et `bosses.json` (`og pic`, un `.jpg`) contiennent d'autres noms de fichiers image. Ils ne sont pas dans les 21 de `report.json` ; je ne les ai pas traités.

**Fanged Imp Ashes : écart avec la consigne.** La consigne était de renommer la clé « minor puzzle spoiler » en `version`. Sur la page, ce n'est pas une note de patch : c'est un tableau repliable intitulé « Minor puzzle spoiler », sous le tableau Patch Notes. Le renommer donnerait `version: "* Summoning this duo to fight…"`, une phrase de spoiler affichée comme numéro de version.
- **Option A (préparée, recommandée)** : retirer l'élément de `patch_notes` et verser le texte dans `notes`, sous le sous-titre `[Minor puzzle spoiler]`. Le but, un `patch_notes` conforme à `{version, official_notes, community_notes}`, est atteint.
- **Option B (consigne à la lettre)** : une seule opération, `set` de `patch_notes[1]` de `{"minor puzzle spoiler": "* Summoning…"}` vers `{"version": "* Summoning…"}`. Elle remplace les deux opérations de Fanged Imp Ashes si le chef de projet la préfère.

### Suites à prévoir lors de l'application
- Consigner chaque opération dans `data/CHANGELOG.md`.
- Mettre à jour `data/README.md`, « Limites connues » :
  - armes sans matériau : 185 / 42 / 82 deviennent 4 / 0 / 2 (mêlée / distance / boucliers) ;
  - combats sans PV : 22 sur 302 deviennent 24 sur 314 ;
  - absorption renseignée : 88 deviennent 91 ; résistances : 75 deviennent 77 ;
  - pages sans combat : 15 deviennent 12 ; 133 pages deviennent 138 ; 302 combats deviennent 314.
- Régénérer les fichiers de l'application (`npm run data`).
