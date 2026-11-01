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
  - Elle contient 1 690 coefficients `*_exact` : 13 affinités, de +0 à +25.
  - `data/` n'en retient que 32 pour cette arme.
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
