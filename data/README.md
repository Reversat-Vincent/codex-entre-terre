# Données Elden Ring — extraites d'eldenring.wiki.gg

Ce dossier rassemble des données structurées (JSON) sur *Elden Ring* : armes, équipement, objets, sorts, boss, lieux, PNJ, classes de départ et mécaniques de jeu. Elles ont été extraites du wiki communautaire **[Eldenpedia — eldenring.wiki.gg](https://eldenring.wiki.gg/)** le **31/10/2026** (état du wiki à cette date, patch 1.17 inclus).

- **Couverture** : jeu de base + DLC *Shadow of the Erdtree* + DLC *Tarnished Pack* (Tarnished Edition). Le contenu *ELDEN RING NIGHTREIGN*, un autre jeu également couvert par ce wiki, est exclu.
- **Langue des données** : anglais, comme sur le wiki (noms, descriptions, notes).
- **Volume** : 18 fichiers JSON, environ 10 Mo, 3 253 entrées.

---

## Étiquette DLC : le champ `source`

Chaque entrée de chaque fichier porte un champ `source` :

| Valeur | Signification |
|---|---|
| `Base game` | Contenu du jeu de base |
| `Shadow of the Erdtree` | Contenu du DLC *Shadow of the Erdtree* (Royaume de l'Ombre) |
| `Tarnished Pack` | Contenu du DLC *Tarnished Pack* / *ELDEN RING Tarnished Edition* (Switch 2) |
| `Base game + Shadow of the Erdtree` | Boss présent à la fois dans le jeu de base et dans le DLC. Chaque combat a sa propre étiquette dans `encounters[].source`. |

L'étiquette vient toujours d'un marquage du wiki :
- **Objets et armes** : icône DLC à côté de l'objet dans les galeries du wiki.
- **Boss** : navbox séparée pour le DLC, et région du combat.
- **Lieux** : groupe « Realm of Shadow » de la navbox des lieux.
- **PNJ** : rubrique « Realm of Shadow » de la page NPCs.
- **Sinon** : mention du DLC dans l'introduction de la page.

---

## Fichiers

Les 18 fichiers JSON sont dans ce dossier.

### Armes

| Fichier | Contenu | Entrées (base / SotE / TP) | Source principale |
|---|---|---|---|
| `melee_armaments.json` | Armes de mêlée, 30 classes : stats de base, scaling, prérequis, effets, compétence, acquisition, amélioration et tableaux par affinité, notes, patchs | 335 (250 / 79 / 6) | [Melee Armaments](https://eldenring.wiki.gg/wiki/Melee_Armaments) |
| `ranged_weapons_catalysts.json` | Arcs, arbalètes, balistes, bâtons, sceaux : mêmes champs + portée, puissance des sorts, règles de Cendres de guerre par classe | 63 (52 / 11 / 0) | [Ranged Weapons/Catalysts](https://eldenring.wiki.gg/wiki/Ranged_Weapons/Catalysts) |
| `shields_torches.json` | Torches, petits / moyens / grands boucliers, boucliers d'estoc : mêmes champs que les armes | 89 (75 / 12 / 2) | [Shields](https://eldenring.wiki.gg/wiki/Shields) |
| `ashes_of_war.json` | Cendres de guerre : affinité, coût FP, compétence, classes d'armes et affinités compatibles, acquisition | 116 (91 / 25 / 0) | [All Items (Gallery)](https://eldenring.wiki.gg/wiki/All_Items_(Gallery)) |
| `ammunition.json` | Flèches, grandes flèches, carreaux, grands carreaux : attaque, effet, acquisition | 68 (63 / 5 / 0) | idem |

### Équipement et objets

| Fichier | Contenu | Entrées (base / SotE) | Source |
|---|---|---|---|
| `armor.json` | Armures (tête, torse, bras, jambes) : poids, absorption par type de dégâts, résistances, équilibre (poise), acquisition | 704 (559 / 145) | [All Items (Gallery)](https://eldenring.wiki.gg/wiki/All_Items_(Gallery)) |
| `talismans.json` | Talismans : effet, valeurs exactes (résumé), poids, acquisition | 154 (115 / 39) | idem |
| `spirit_ashes.json` | Esprits invocables et marionnettes : coût FP/PV, effet, matériau d'amélioration, acquisition | 84 (64 / 20) | idem |
| `spells.json` | Sorts (84 sorcelleries, 129 incantations) : type, école, coûts FP/endurance, emplacements, prérequis INT/FOI/ARC, effet, vendeur | 213 (171 / 42) | idem |
| `tools.json` | Outils : consommables, pots, arts du parfum, graisses, objets de quête, runes dorées, Remembrances, objets multijoueur | 285 (191 / 94) | idem |
| `upgrade_materials.json` | Matériaux d'amélioration : pierres de forge, pierres sombres, Gloveworts, Golden Seed / Sacred Tear, fragments de l'Arbre-Ombre / Revered Spirit Ash (avec les tables de bénédiction) | 43 (41 / 2) | idem |
| `key_items.json` | Objets clés : Grandes Runes, larmes cristallines, contenants et emplacements, livres de recettes, cartes, Bell Bearings, parchemins et livres de prières | 331 (249 / 82) | idem |
| `crafting_materials.json` | Matériaux d'artisanat : utilisation en fabrication, acquisition | 106 (67 / 39) | idem |

### Monde

| Fichier | Contenu | Entrées | Source |
|---|---|---|---|
| `bosses.json` | Boss : rang (Dieu / Demi-dieu / Légende / Grand ennemi / Ennemi / Envahisseur), indicateurs (obligatoire, porteur de Grande Rune, Remembrance), et pour chaque combat : lieu, régions, PV, runes, butin, absorption par type de dégâts, résistances aux statuts, parade et critique, notes de combat | 133 pages / 302 combats (pages : 78 base, 41 SotE, 14 mixtes ; combats : 251 base, 46 SotE, 5 mixtes) | [Bosses](https://eldenring.wiki.gg/wiki/Bosses), navbox [Bosses](https://eldenring.wiki.gg/wiki/Template:Navbox_Bosses) / [Bosses Shadow](https://eldenring.wiki.gg/wiki/Template:Navbox_Bosses_Shadow), [Category:Bosses](https://eldenring.wiki.gg/wiki/Category:Bosses) |
| `locations.json` | Lieux : type (région, donjon principal, donjon et son sous-type, evergaol…), région, sites de grâce, boss, PNJ, ennemis, butin notable, matériaux, sous-lieux | 315 (247 / 68) | [Locations](https://eldenring.wiki.gg/wiki/Locations), [Navbox Locations](https://eldenring.wiki.gg/wiki/Template:Navbox_Locations) |
| `npcs.json` | PNJ : rôle, lieu, région, **inventaire de boutique** (objet, prix, stock, condition), équipement, objets de quête, **progression de quête**, notes | 114 (95 / 19), dont 35 boutiques et 60 quêtes | [NPCs](https://eldenring.wiki.gg/wiki/NPCs), [Category:NPC](https://eldenring.wiki.gg/wiki/Category:NPC), [Category:Merchants](https://eldenring.wiki.gg/wiki/Category:Merchants), [Merchant & Instructor Inventories](https://eldenring.wiki.gg/wiki/Merchant_%26_Instructor_Inventories) |

### Personnage et mécaniques

| Fichier | Contenu | Entrées | Source |
|---|---|---|---|
| `origins.json` | Classes de départ : niveau, 8 attributs, PV/FP/endurance/charge/poise, défenses, résistances, équipement de départ, conseils d'optimisation | 12 (10 base / 2 Tarnished Pack) | [Origins](https://eldenring.wiki.gg/wiki/Origins) |
| `mechanics.json` | 88 pages de mécaniques en texte et tableaux, regroupées par thème (détail ci-dessous) | 88 (82 base / 6 SotE) | pages listées dans `metadata.source_pages` |

Thèmes couverts par `mechanics.json` :
- **Attributs et statistiques** : Vigor… Arcane, PV, FP, endurance, charge d'équipement, découverte, poise, et la table complète des coûts en runes des niveaux 1 à 713.
- **Effets de statut et résistances.**
- **Types de dégâts.**
- **Armes et amélioration** : scaling, les 13 affinités, Whetblades, pierres de forge, buffs et leurs règles de cumul, compétences, armes jumelées.
- **Combat** : critiques, parade, contre-garde, Torrent, esprits.
- **Progression** : runes, Rune Arc, Grandes Runes, fioles, Golden Seed / Sacred Tear, Wondrous Physick, bénédiction de l'Arbre-Ombre, NG+, mort, sites de grâce, multijoueur.

---

## Structure commune des fichiers

Chaque fichier a la forme `{"metadata": {...}, "<liste>": [...]}`. La clé de la liste dépend du fichier :

| Clé | Fichiers |
|---|---|
| `weapons` | armes de mêlée, à distance, boucliers |
| `items` | fichiers d'objets (galerie) |
| `bosses` | boss |
| `locations` | lieux |
| `npcs` | PNJ |
| `origins` | origines |
| `topics` | mécaniques |

`metadata` contient les pages sources, la date d'extraction, les comptes (par source DLC, par catégorie) et **`field_notes`**, qui explique les champs propres au fichier.

**Champs récurrents :**

| Champ | Contenu |
|---|---|
| `name`, `wiki_page`, `url` | Nom affiché, titre de la page wiki, lien direct |
| `source` | Étiquette jeu de base / DLC (voir plus haut) |
| `description` | Description en jeu (anglais) |
| `summary` | Paragraphe d'introduction de la page wiki ; contient souvent les valeurs exactes |
| `acquisition` | Liste de `{method, location, region, details[]}` |
| `regions_mentioned` | Grandes régions repérées dans le texte d'acquisition, utile pour situer un objet dans la progression |
| `acquisition_flags` | Indices sur le mode d'obtention : achetable, échange de Remembrance, butin aléatoire, lié à un PNJ ou une quête, fabricable |
| `notes`, `patch_notes` | Notes du wiki ; changements d'équilibrage par version |
| `infobox` | (objets) Tous les champs bruts de l'infobox, nettoyés |

**Conventions :**
- Dans les listes de texte, une puce imbriquée est préfixée par `→` (un par niveau), et un sous-titre de section apparaît comme `[Titre]`.
- `null` signifie « non documenté par le wiki », et non « zéro » ou « absent du jeu ».
- Notation des coûts de compétence (`fp_cost`) : `X (Y Z)`, où X est le coût de la compétence et Y/Z celui des suites légère/lourde.
- Échelle de scaling : S > A > B > C > D > E ; `null` = pas de scaling.

---

## Méthode

1. **Listes de référence** : les pages d'index et de listes du wiki servent à recenser toutes les entrées d'un sujet :
   - pages de catégorie d'armes ;
   - galerie « All Items (Gallery) », qui donne aussi l'icône DLC ;
   - navbox des boss et des lieux ;
   - catégories Bosses / NPC / Merchants ;
   - pages Bosses, Locations, NPCs, Origins.
2. **Téléchargement** : le source wiki (wikitext) de chaque page est récupéré via l'API MediaWiki officielle (`api.php`), par lots de 50 pages, avec une pause entre les requêtes. 3 446 pages distinctes au total ; les redirections sont résolues.
3. **Extraction** :
   - lecture des modèles du wiki : infobox, tableaux d'amélioration, boutiques, descriptions ;
   - lecture des tableaux, avec gestion des fusions de cellules ;
   - résolution des transclusions, par exemple pour les inventaires de marchands ;
   - conversion du balisage wiki en texte brut.
4. **Contrôles** :
   - Les stats d'armes ont été relues par une seconde méthode indépendante : 6 842 valeurs en mêlée, 1 288 à distance, 1 831 pour les boucliers, aucun écart.
   - Aucun reste de balisage wiki dans les textes.
   - L'étiquette DLC a été vérifiée sur des cas connus.
5. **Correctifs après l'extraction** (01/11/2026, décisions D8 et D15 du projet) : charge d'équipement de Heavy Knight, 43 coefficients de scaling du Horn Bow (décimales sans zéro initial mal lues, lecture corrigée dans `tools/wiki/`), combat de Sir Gideon Ofnir, runes de Godskin Duo, lieu et régions de trois combats, 107 faux `Altus Plateau` dans `regions_mentioned`. Détail, anciennes valeurs et pages wiki : [`CHANGELOG.md`](CHANGELOG.md).

Les principaux scripts d'extraction sont dans `tools/wiki/`, à la racine du dépôt (voir son README).

---

## Limites connues

- **Type d'amélioration des armes souvent non documenté** : le wiki ne précise pas pierres normales ou sombres pour 185 armes de mêlée sur 335, 42 armes à distance sur 63 et 82 boucliers sur 89.
  - Pour ces armes, `upgrade.material` vaut `null`.
  - Une estimation statistique est ajoutée dans `upgrade.estimate_if_undocumented` uniquement quand sa confiance est au moins moyenne.
  - Par exemple, une compétence unique implique une arme sombre dans 57 cas documentés sur 58.
  - Cette estimation est à traiter comme non vérifiée.
- **Incohérences du wiki signalées** :
  - Sur 29 armes de mêlée et 1 arme à distance, le tableau d'amélioration de la page contredit son infobox (`tables_consistent_with_infobox: false`, liste dans `metadata.wiki_inconsistencies_flagged`). Les valeurs de l'infobox font foi.
  - Dans `bosses.json`, un lien de la navbox DLC (« Radahn Consort of Miquella ») redirige à tort vers la page de Starscourge Radahn. Son rang « Gods » n'est pas propagé à ce boss du jeu de base ; le cas est consigné dans `metadata.navbox_tier_conflicts_ignored`.
- **Boss** :
  - 15 pages (surtout des PNJ envahisseurs) n'ont aucune donnée de combat (`encounters` vide). Sir Gideon Ofnir en a une depuis le correctif C1 ([`CHANGELOG.md`](CHANGELOG.md)).
  - Les PV manquent pour 22 combats sur 302.
  - L'absorption par type de dégâts n'est renseignée que pour 88 combats, et les résistances aux statuts pour 75.
  - 9 combats n'ont pas de région identifiable (`regions` vide) ; les correctifs C3 à C5 en ont situé 3 ([`CHANGELOG.md`](CHANGELOG.md)).
- **PNJ** : la liste combine la page NPCs et les catégories NPC / Merchants ; elle n'est pas exhaustive.
- **Acquisition vide** pour certains objets dont la section est vide sur le wiki lui-même : certaines pierres sombres, Gloveworts, Golden Runes…
- **Pas de fichier « ordre de progression »** : le Walkthrough du wiki est inachevé (il s'arrête à Weeping Peninsula). Pour situer un élément dans la partie, utiliser `regions_mentioned`, `acquisition` et `locations.json`.
- **Exclus volontairement** :
  - notes, lettres et peintures, tutoriels, gestes ;
  - sections lore, histoire, trivia, galeries, dialogues et movesets ;
  - le contenu *NIGHTREIGN*.

---

## Licence et attribution

Le contenu textuel provient d'**Eldenpedia (eldenring.wiki.gg)**, publié sous licence **[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0)**. Les données de ce dossier en sont dérivées. En cas de rediffusion, créditer les contributeurs d'eldenring.wiki.gg et conserver la même licence. Chaque entrée renvoie à sa page d'origine via son champ `url`.

*Elden Ring* est une marque de FromSoftware / Bandai Namco. Ce dossier n'est pas affilié à ces sociétés.
