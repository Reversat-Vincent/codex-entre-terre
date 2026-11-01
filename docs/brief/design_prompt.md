Crée un **artefact de design** : le **prototype interactif haute fidélité** d'une application web compagnon pour *Elden Ring* (nom de travail : **« Codex de l'Entre-terre »**, modifiable). Agis en designer produit senior, spécialiste des interfaces riches en données (tableaux de bord analytiques, outils compagnons de jeux vidéo).

Ce prototype servira de référence : l'application réelle sera ensuite développée par un autre agent (Claude Code) **à partir de ton design**. Il doit donc être cohérent, réaliste vis-à-vis des données décrites ci-dessous, implémentable et documenté (design tokens, composants, règles d'affichage).

---

## 1. Le produit

Une application **locale, sans serveur**, qui donne accès à toutes les données du jeu : armes, équipement, sorts, objets, boss, lieux, PNJ, classes de départ, mécaniques. Sa page d'accueil est un **tableau de bord** qui **calcule dynamiquement** des analyses selon un ensemble de **critères configurables**. Il répond par exemple aux questions suivantes :
- Quelles armes obtenir, et à quel moment de la partie, pour mon build ?
- Quelle classe de départ choisir ?
- Dans quel ordre affronter les boss de l'histoire principale, et à partir de quel niveau ?

## 2. Utilisateur et usages

- Joueur ou joueuse francophone qui prépare ou suit une partie (premier run ou NG+). L'application est souvent consultée **en second écran pendant le jeu**.
- Tâches clés :
  1. Configurer son profil : build visé, attributs actuels, DLC possédés, avancement.
  2. Voir les armes à récupérer au fil de la progression, adaptées au build.
  3. Choisir l'origine (classe de départ) la plus efficace pour ce build.
  4. Suivre l'ordre des boss principaux et savoir si l'on est « prêt ».
  5. Trouver n'importe quel élément du jeu (recherche) et savoir où et comment l'obtenir.
  6. Comprendre une mécanique : statuts, affinités, scaling, buffs…
- **Langue de l'interface : français.** Les données (noms propres, descriptions, notes) sont **en anglais**, telles qu'extraites du wiki. Conserve les noms anglais des objets, boss et lieux (« Moonveil », « Margit, the Fell Omen », « Liurnia of the Lakes ») et prévois la place d'une éventuelle traduction en sous-titre.

## 3. Les données disponibles (le design doit s'y tenir)

18 fichiers JSON locaux (environ 3 250 entrées, 10 Mo), extraits du wiki communautaire eldenring.wiki.gg (état au 31/10/2026). Ils couvrent le jeu de base et les DLC *Shadow of the Erdtree* et *Tarnished Pack*. Le détail des fichiers et de leurs champs est en **annexe A** ; des extraits réels sont en **annexe B**.

**Conventions de données que l'interface doit rendre visibles, partout :**
- **`source`** (badge DLC) :
  - `Base game` ;
  - `Shadow of the Erdtree` (DLC) ;
  - `Tarnished Pack` (DLC) ;
  - `Base game + Shadow of the Erdtree` (boss présent dans les deux ; chaque combat porte sa propre étiquette).
- **`null`** signifie « non documenté par le wiki », et non zéro ou absent du jeu. Affiche « Non documenté », pas « 0 » ni un vide ambigu.
- **Estimation** : quand le wiki ne documente pas le type d'amélioration d'une arme, une estimation statistique est fournie avec un niveau de confiance (moyenne ou haute). Elle doit avoir un badge distinct et ne jamais apparaître comme un fait.
- **Incohérence du wiki** : certaines pages ont un tableau qui contredit leur infobox. Prévois un avertissement discret, avec explication au survol.
- **Valeur calculée par l'application** : scores de recommandation, niveaux recommandés, étapes de progression. Badge « Calculé » et explication de la méthode au survol ou dans un panneau « Pourquoi ? ».
- Chaque entrée a une **`url`** vers sa page wiki : lien « Voir sur le wiki ».
- Les **valeurs du wiki sont des valeurs de base** : attaque à +0, PV des boss en NG. Le design doit permettre d'afficher plus tard des valeurs calculées (puissance d'attaque au niveau d'amélioration choisi, avec les stats du profil) en les distinguant des valeurs brutes.

## 4. Architecture et navigation

- **Navigation principale** : barre latérale repliable sur desktop, barre d'onglets en bas sur mobile.
  - **Tableau de bord** (accueil).
  - **Explorer** (catalogues) :
    - Armes : mêlée, distance et catalyseurs, boucliers et torches.
    - Cendres de guerre, Armures, Talismans, Sorts, Esprits.
    - Objets : outils et consommables, matériaux d'amélioration, objets clés, artisanat, munitions.
    - Boss, Lieux, PNJ, Origines.
  - **Comparateur**, **Mécaniques**, **Profil**.
- **Recherche globale** toujours accessible (raccourci Ctrl/⌘+K) sur l'ensemble des données, avec résultats groupés par type et badges DLC.
- **Fiches détail** accessibles depuis partout, avec des liens croisés entre entités : boss → butin → arme → lieu → PNJ marchand → quête.
- **« Ma liste »** : éléments épinglés à récupérer, cochables.

## 5. Le tableau de bord (écran prioritaire)

### 5.1 Critères configurables

Un panneau de critères, latéral repliable ou en bandeau, dont **chaque modification recalcule instantanément tous les widgets**. Les critères actifs sont résumés sous forme de chips en haut du tableau de bord. On peut sauvegarder et charger des **profils** (ex. « Dex / Saignement », « Mage pur NG+ »).

- **Contenu** : jeu de base / Shadow of the Erdtree / Tarnished Pack (cases à cocher).
- **Personnage** :
  - origine (ou « automatique ») et niveau actuel ;
  - les 8 attributs (Vigor, Mind, Endurance, Strength, Dexterity, Intelligence, Faith, Arcane), en saisie rapide par steppers ;
  - **ou** un build cible : archétype (Force, Dextérité, Qualité, Intelligence, Foi, Arcane, hybrides) et niveau cible.
- **Style de jeu** :
  - mêlée / distance / magie / hybride ;
  - classes d'armes préférées (multi-sélection parmi plus de 40 classes) ;
  - une main / deux mains ;
  - effet de statut privilégié (saignement, givre, poison, putréfaction écarlate, sommeil, folie) ;
  - limite de charge d'équipement.
- **Progression** : étape actuelle (Début, Milieu, Fin, Fin de jeu, DLC), **ou** boss déjà vaincus (checklist), **ou** régions atteintes.
- **Contraintes d'obtention** :
  - exclure les armes obtenues par échange de Remembrance ;
  - exclure les butins aléatoires à farmer ;
  - exclure les objets liés à des quêtes de PNJ ;
  - préférer les armes à pierres normales ou à pierres sombres.
- **Fiabilité** : inclure ou exclure les valeurs estimées.

### 5.2 Widgets (système modulaire)

Une grille de cartes que l'on peut **ajouter, retirer, réordonner, réduire et passer en plein écran**. Chaque carte a un titre, une ligne « comment c'est calculé » et ses propres états : chargement, vide, données partielles.

**A. Armes recommandées au fil de la partie** (widget principal)
- **Disposition** : visualisation par **étapes de progression** (colonnes ou frise horizontale : Début → Milieu → Fin → Fin de jeu → DLC), 3 à 5 armes par étape.
  - La correspondance région → étape est calculée et configurable par l'application. Exemples :
    - Début : Limgrave, Weeping Peninsula ;
    - Milieu : Liurnia of the Lakes, Caelid, Altus Plateau ;
    - Fin : Leyndell, Mountaintops of the Giants ;
    - Fin de jeu : Crumbling Farum Azula ;
    - DLC : Gravesite Plain → Enir-Ilim.
- **Carte d'arme** :
  - nom, classe, badge DLC, poids ;
  - **score de recommandation** (Calculé) et sa décomposition : adéquation au build, puissance et scaling, accessibilité / étape d'obtention, coût d'amélioration ;
  - **prérequis comparés aux attributs du profil** : chip validée si atteint, sinon chip d'alerte indiquant l'écart (« +5 INT ») ;
  - lettres de scaling S→E par attribut ;
  - compétence : nom et type (compétence unique ou Cendre de guerre) ;
  - effet passif (ex. saignement 45) ;
  - **type d'amélioration** : pierres normales jusqu'à +25 ou pierres sombres jusqu'à +10, avec badge Wiki / Estimation / Non documenté ;
  - **où l'obtenir** : méthode, lieu, région (« Guaranteed Drop — Gael Tunnel, Caelid »), avec indicateurs Remembrance / achat / butin aléatoire / quête.
- **Actions** : épingler à « Ma liste », comparer, voir la fiche, voir les alternatives.
- **Vue plein écran** : tableau triable et filtrable de toutes les armes compatibles avec les critères.

**B. Configuration de départ optimale**
- Classement des **12 origines** (10 du jeu de base + 2 du Tarnished Pack) pour le build cible : points « gaspillés », niveau nécessaire pour atteindre la cible. La recommandation est mise en avant, avec son explication.
- **Détail** :
  - attributs de départ comparés à la cible (barres) ;
  - statistiques dérivées : PV, FP, endurance, charge, équilibre ;
  - équipement de départ ;
  - premières armes recommandées accessibles tôt (lien avec le widget A) ;
  - priorités de montée de niveau (Calculé).

**C. Ordre des boss de l'histoire principale et niveau minimum recommandé**
- **Frise verticale ordonnée**, issue des données du wiki :
  1. **2 porteurs de Grande Rune au choix parmi 5**, chacun avec ses prérequis en sous-nœuds :
     - Godrick (après Margit) ;
     - Rennala (après Red Wolf of Radagon) ;
     - Starscourge Radahn ;
     - Rykard ;
     - Mohg.
  2. Draconic Tree Sentinel **ou** Fia's Champions.
  3. Godfrey (ombre dorée).
  4. Morgott.
  5. Fire Giant.
  6. Godskin Duo.
  7. Maliketh.
  8. Sir Gideon Ofnir.
  9. Godfrey / Hoarah Loux.
  10. Radagon.
  11. Elden Beast.
- **Voie DLC** dans un couloir parallèle : Radahn et Mohg sont requis pour accéder au DLC, puis Messmer → Romina → Promised Consort Radahn.
- Représente clairement les **embranchements** (« 2 parmi 5 », « ou ») et l'état **vaincu / à faire** de chaque boss, lié au critère de progression.
- **Nœud de boss** :
  - nom, rang (Dieu, Demi-dieu, Légende, Grand ennemi…), région ;
  - PV, runes, Remembrance (oui / non) ;
  - **types de dégâts les plus efficaces** (absorption la plus faible) et **statuts auxquels il est immunisé** ;
  - **niveau minimum recommandé** (Calculé), avec une jauge comparée au niveau du joueur : Prêt / Limite / Trop tôt.
- **Données manquantes à prévoir** : PV non documentés (Godskin Duo), aucune donnée de combat (Sir Gideon Ofnir).

**D. Autres agrégations.** Prévois-les dans le système de widgets et **maquettes-en au moins 3** :
1. **Matrice des faiblesses des boss** : heatmap des types de dégâts par boss, avec les immunités aux statuts.
2. **Plan d'amélioration** : pierres nécessaires pour amener l'arme choisie à +X, et où acheter des pierres en quantité illimitée (Bell Bearings) avec leur moment d'obtention.
3. **Butin par région pour mon build** : armes, talismans, sorts et armures pertinents par région et par étape (« où explorer ensuite »).
4. **Équipement complémentaire** :
   - talismans ;
   - Cendres de guerre compatibles avec l'arme recommandée ;
   - sorts accessibles avec mes attributs ;
   - esprits ;
   - armures (rapport équilibre / poids).
5. **Calculateur de runes** : runes nécessaires pour atteindre un niveau cible (table officielle du niveau 1 au niveau 713).
6. **Bénédiction de l'Arbre-Ombre** (DLC) : fragments collectés et bonus de dégâts infligés / réduction des dégâts reçus.
7. **Quêtes et marchands** :
   - PNJ importants ;
   - inventaires utiles (pierres de forge, Whetblades…) ;
   - avertissements sur les objets exclusifs ou manquables.
8. **Couverture des données** : part documentée, estimée ou absente, pour la transparence. Exemple réel : type d'amélioration documenté pour 150 armes de mêlée sur 335.

### 5.3 Règles d'interaction
- Recalcul instantané, transitions de valeurs sobres.
- Toute recommandation est **explicable** (« Pourquoi ? » ouvre le détail du score et les données utilisées).
- États prévus :
  - aucun résultat pour ces critères, avec une suggestion d'élargissement ;
  - premier chargement des données ;
  - données partielles ou estimées.

## 6. Explorer, fiches, comparateur, mécaniques

**Catalogues**
- Bascule entre **tableau dense** et **grille de cartes**.
- **Filtres à facettes** propres à chaque type :
  - armes : classe, DLC, scaling dominant, prérequis atteints, type d'amélioration, effet passif, région ;
  - armures : emplacement, poids, équilibre, absorption ;
  - sorts : type, école, prérequis, coût en FP ;
  - boss : rang, région, obligatoire, Remembrance ;
  - lieux : type, région.
- Tri multi-colonnes. Les longues listes (704 pièces d'armure) doivent rester fluides : virtualisation ou pagination.

**Fiche arme**
- En-tête : nom, classe, badge DLC, poids, types d'attaque.
- Blocs Attaque, Garde, Scaling et Prérequis, ces derniers comparés au profil.
- Compétence avec sa description, effets passifs.
- Amélioration :
  - matériau et niveau max ;
  - Cendre de guerre et affinité modifiables ou non ;
  - **graphique d'évolution par niveau et par affinité** quand le wiki fournit le tableau.
- Acquisition (méthode, lieu, région, détails), notes, **historique des patchs**, alertes de qualité, lien wiki.

**Fiche boss**
- Onglets par rencontre quand le boss apparaît à plusieurs endroits.
- PV, runes, butin (liens vers les fiches).
- **Absorption par type de dégâts** (barres), **résistances aux statuts**, parade et critique possibles.
- Notes de combat.

**Autres fiches**
- **Lieu** : fil d'Ariane de région, sites de grâce, boss, PNJ, butin notable.
- **PNJ** : **inventaire de boutique** en tableau (objet, prix, stock, condition) et **étapes de quête** en checklist.
- Sort, talisman, armure, esprit, objet, origine.

**Comparateur** : 2 à 4 éléments du même type côte à côte, avec les écarts mis en évidence.

**Mécaniques** : vue article lisible (titres, listes, tableaux), sommaire latéral, liens vers les entités concernées.

## 7. Direction visuelle

- **Ambiance** : dark fantasy sobre et élégante (or terni, pierre, parchemin, lueur dorée), au service de la lisibilité des données.
- **Identité originale obligatoire** : aucun logo, illustration, capture d'écran, icône ni police officiels du jeu. Pied de page : « Outil de fan non officiel — données : eldenring.wiki.gg (CC BY-SA 4.0) ».
- **Thèmes** : **sombre par défaut** (fond quasi noir à nuance chaude, surfaces légèrement élevées, accent or pour les actions et les recommandations) ; thème clair « parchemin » optionnel.
- **Typographie** : une serif de caractère pour les titres (Cormorant Garamond, Cinzel ou équivalent libre), une sans-serif très lisible pour les données (Inter ou équivalent), chiffres tabulaires.
- **Codes visuels cohérents et accessibles** (contraste WCAG AA, jamais la couleur seule) pour :
  - les sources DLC ;
  - les niveaux de fiabilité : wiki / estimation / non documenté / incohérence / calculé ;
  - les lettres de scaling S→E ;
  - les types de dégâts : standard, frappe, tranchant, estoc, magie, feu, foudre, sacré ;
  - les statuts : saignement, givre, poison, putréfaction écarlate, sommeil, folie, mort.
- **Iconographie** : au trait (style Lucide), avec un jeu d'icônes original pour les types de dégâts, les statuts et les classes d'armes.
- **Densité** : forte mais aérée, hiérarchie nette, lisible d'un coup d'œil en second écran.
- **Responsive** :
  - desktop 1440 px (cible principale) ;
  - tablette ;
  - mobile 390 px (consultation rapide du tableau de bord et des fiches).

## 8. Contraintes pour l'implémentation future

- Application statique : les 18 JSON sont chargés dans le navigateur, sans serveur ni API externe. Filtres, scores et agrégations sont calculés côté client.
- Profils, « Ma liste » et préférences sont sauvegardés localement.
- Composants **réutilisables pour tous les types de données** : carte, tableau, filtres, badges, fiche, onglets, frise, jauge, heatmap.

## 9. Livrables attendus dans l'artefact

1. **Prototype navigable**, avec au minimum :
   - le tableau de bord desktop : panneau de critères, widgets A, B, C et au moins 3 widgets D ;
   - la vue plein écran du widget A ;
   - le tableau de bord mobile ;
   - le catalogue des armes (filtres + tableau / grille) et une fiche arme ;
   - une fiche boss ;
   - la recherche globale ouverte.
2. **Une page « Design system »** :
   - tokens exportables en variables CSS : couleurs avec valeurs hexadécimales, typographie, espacements, rayons, ombres ;
   - **composants avec leurs états** : badges DLC et de fiabilité, chips de scaling et de prérequis, cartes, tableaux, filtres, jauges, frise, onglets, info-bulles, états vides et de chargement.
3. **De courtes notes de spécification** par écran : comportements, règles d'affichage, cas limites.

Utilise les **données réelles de l'annexe B** telles quelles. Pour les valeurs que l'application calculera (scores, niveaux recommandés, étapes), utilise des valeurs plausibles mais marque-les visiblement « valeur de maquette ». Si tout ne tient pas dans un seul artefact, donne la priorité au tableau de bord et au design system.

---

## Annexe A — Fichiers de données et champs clés

| Fichier | Contenu | Volume | Champs clés |
|---|---|---|---|
| melee_armaments | Armes de mêlée (30 classes) | 335 (250 base / 79 SotE / 6 TP) | category, weight, attack_power{physical, magic, fire, lightning, holy, critical}, guarded_damage_negation, scaling{str, dex, int, fai, arc} (S–E), requirements, skill{name, type, fp_cost, description}, passive_effects, status_buildup, acquisition[{method, location, region, details}], regions_mentioned, acquisition_flags, upgrade{material, max_level, ash_of_war_changeable, affinity_changeable, estimate_if_undocumented, tables par affinité +0→+25}, notes, patch_notes |
| ranged_weapons_catalysts | Arcs, arbalètes, balistes, bâtons, sceaux | 63 (52 / 11) | idem + range, sorcery_scaling, incantation_scaling, spell_buff par niveau, règle de Cendres de guerre de la classe |
| shields_torches | Boucliers et torches | 89 (75 / 12 / 2 TP) | idem armes |
| ashes_of_war | Cendres de guerre | 116 (91 / 25) | affinity, fp_cost, skill, compatible_weapon_classes, compatible_affinities, acquisition |
| armor | Armures (tête, torse, bras, jambes) | 704 (559 / 145) | slot, weight, damage_negation{physical, strike, slash, pierce, magic, fire, lightning, holy}, resistance{immunity, robustness, focus, vitality}, poise |
| talismans | Talismans | 154 (115 / 39) | effect, summary (valeurs exactes), weight |
| spirit_ashes | Esprits invocables | 84 (64 / 20) | fp_cost / hp_cost, effect, upgrade_material |
| spells | Sorcelleries (84) et incantations (129) | 213 (171 / 42) | spell_type, sub_type (école), fp_cost, stamina_cost, slots_used, requirements{int, fai, arc}, effect |
| tools, upgrade_materials, key_items, crafting_materials, ammunition | Consommables, pierres de forge, objets clés (Bell Bearings, cartes…), artisanat, munitions | 285 / 43 / 331 / 106 / 68 | category, effect, acquisition, crafting, tables (ex. bénédiction de l'Arbre-Ombre) |
| bosses | Boss | 133 pages, 301 combats | tier, flags (mandatory_base_game, required_to_access_dlc, mandatory_dlc, shardbearer, remembrance_*), encounters[{location, regions, hp_values, runes_values, drops, damage_negation_percent, status_resistance, damage_types_dealt, parryable, critable}], fight_notes |
| locations | Lieux | 315 (247 / 68) | kind (région, donjon principal, donjon…), subtype, region, sites_of_grace, bosses, npcs, enemies, notable_loot |
| npcs | PNJ | 114 (95 / 19) | role, location, regions, shop_inventory (objet, prix, stock, note), quest_items, questline (étapes) |
| origins | Classes de départ | 12 (10 / 2 TP) | level, attributes (8), base_stats{hp, fp, stamina, equip_load, poise}, starting_equipment |
| mechanics | Articles de mécaniques | 88 | topic, summary, sections{texte, tableaux} : attributs, statuts, affinités, buffs, coût des niveaux 1→713… |

## Annexe B — Extraits réels à utiliser dans la maquette

### B1. Origines (niveau ; Vigor / Mind / Endurance / Strength / Dexterity / Intelligence / Faith / Arcane ; armes de départ)

| Origine | Source | Niv. | Attributs | Armement de départ |
|---|---|---|---|---|
| Vagabond | Base game | 9 | 15 / 10 / 11 / 14 / 13 / 9 / 9 / 7 | Longsword, Halberd, Heater Shield |
| Warrior | Base game | 8 | 11 / 12 / 11 / 10 / 16 / 10 / 8 / 9 | Scimitar ×2, Riveted Wooden Shield |
| Hero | Base game | 7 | 14 / 9 / 12 / 16 / 9 / 7 / 8 / 11 | Battle Axe, Large Leather Shield |
| Bandit | Base game | 5 | 10 / 11 / 10 / 9 / 13 / 9 / 8 / 14 | Great Knife, Shortbow, Buckler |
| Astrologer | Base game | 6 | 9 / 15 / 9 / 8 / 12 / 16 / 7 / 9 | Astrologer's Staff, Short Sword, Scripture Wooden Shield |
| Prophet | Base game | 7 | 10 / 14 / 8 / 11 / 10 / 7 / 16 / 10 | Finger Seal, Short Spear, Rickety Shield |
| Samurai | Base game | 9 | 12 / 11 / 13 / 12 / 15 / 9 / 8 / 8 | Uchigatana, Red Thorn Roundshield, Longbow |
| Prisoner | Base game | 9 | 11 / 12 / 11 / 11 / 14 / 14 / 6 / 9 | Glintstone Staff, Estoc, Rift Shield |
| Confessor | Base game | 10 | 10 / 13 / 10 / 12 / 12 / 9 / 14 / 9 | Finger Seal, Broadsword, Blue Crest Heater Shield |
| Wretch | Base game | 1 | 10 / 10 / 10 / 10 / 10 / 10 / 10 / 10 | Club |
| Idus Knight | Tarnished Pack | 7 | 10 / 12 / 11 / 13 / 15 / 8 / 11 / 6 | Idus Sword, Silver Grooved Shield |
| Heavy Knight | Tarnished Pack | 10 | 14 / 8 / 17 / 15 / 11 / 7 / 8 / 9 | Hefty Scimitar |

### B2. Armes (valeurs de base à +0)

| Arme | Classe | Source | Poids | Attaque | Scaling | Prérequis | Compétence | Passif | Amélioration | Obtention |
|---|---|---|---|---|---|---|---|---|---|---|
| Uchigatana | Katana | Base game | 5.5 | Phys 115 | STR D, DEX D | STR 11, DEX 15 | Unsheathe (Cendre de guerre) | Saignement 45 | Pierres normales (déduit du wiki) | Départ Samurai ; butin, Deathtouched Catacombs (Limgrave) |
| Lordsworn's Greatsword | Greatsword | Base game | 9.0 | Phys 136 | STR D, DEX D | STR 16, DEX 10 | Stamp (Upward Cut) (Cendre) | — | **Estimation** : pierres normales (confiance moyenne) | Butin, Gatefront Ruins (Limgrave) |
| Claymore | Greatsword | Base game | 9.0 | Phys 138 | STR D, DEX D | STR 16, DEX 13 | Lion's Claw (Cendre) | — | Pierres normales (wiki) | Butin, Castle Morne (Weeping Peninsula) |
| Moonveil | Katana | Base game | 6.5 | Phys 73, Magie 87 | STR E, DEX D, INT C | STR 12, DEX 18, INT 23 | Transient Moonlight (unique) | Saignement 50 | **Estimation** : pierres sombres (confiance haute) | Butin garanti, Magma Wyrm, Gael Tunnel (Caelid) |
| Sword of Night and Flame | Straight Sword | Base game | 4.0 | Phys 87, Magie 56, Feu 56 | STR E, DEX E, INT D, FAI D | STR 12, DEX 12, INT 24, FAI 24 | Night-and-Flame Stance (unique) | — | Pierres sombres (wiki) | Pièce verrouillée, Caria Manor (Liurnia of the Lakes) |
| Rivers of Blood | Katana | Base game | 6.5 | Phys 76, Feu 76 | STR E, DEX D, ARC D | STR 12, DEX 18, ARC 20 | Corpse Piler (unique) | Saignement 50 | Pierres sombres (wiki) | Vaincre Okina, Church of Repose (Mountaintops of the Giants) |
| Blasphemous Blade | Greatsword | Base game | 13.5 | Phys 121, Feu 78 | STR D, DEX D, FAI D | STR 22, DEX 15, FAI 21 | Taker's Flames (unique) | Rend 4 % des PV max + 40 à chaque mort proche | **Estimation** : pierres sombres (confiance haute) | Échange de la Remembrance de Rykard (Finger Reader Enia, Roundtable Hold) |
| Milady | Light Greatsword | Shadow of the Erdtree | 6.5 | Phys 116 | STR D, DEX D | STR 12, DEX 17 | Impaling Thrust (Cendre) | — | Pierres normales (déduit du wiki) | Butin, Castle Ensis (Gravesite Plain) |
| Rellana's Twin Blades | Light Greatsword | Shadow of the Erdtree | 8.0 | Phys 103, Magie 66, Feu 66 | STR D, DEX D, INT D, FAI D | STR 13, DEX 16, INT 16, FAI 16 | Moon-and-Fire Stance (unique) | — | **Estimation** : pierres sombres (confiance haute) | Échange de la Remembrance de Rellana (Roundtable Hold) |
| Idus Sword | Light Greatsword | Tarnished Pack | 7.0 | Phys 124 | STR D, DEX D | STR 10, DEX 15 | Impaling Thrust (Cendre) | — | Pierres normales (déduit du wiki) | Départ Idus Knight ; butin, Laskyar Ruins (Liurnia of the Lakes) |

### B3. Boss de l'histoire principale (valeurs NG du wiki)

« Faiblesse » = types de dégâts à l'absorption la plus faible (en %). « Immunités » = statuts sans effet. « — » = non documenté par le wiki.

| Boss | Rang | Indicateurs | Lieu (région) | PV | Runes | Faiblesse | Immunités |
|---|---|---|---|---|---|---|---|
| Margit, the Fell Omen | Grand ennemi | — | Stormveil (Limgrave) ; 2ᵉ rencontre Capital Outskirts | 4 174 ; 8 193 | 12 000 ; 16 800 | Tranchant −10 %, Feu 0 % | Sommeil, Folie, Mort |
| Godrick the Grafted | Demi-dieu | Porteur de Grande Rune, Remembrance | Stormveil Castle (Limgrave) | 6 080 | 20 000 | Estoc 0 %, Tranchant 0 % | Folie |
| Rennala, Queen of the Full Moon | Légende | Porteur de Grande Rune, Remembrance | Academy of Raya Lucaria (Liurnia) | 3 493 (phase 1), 4 097 (phase 2) | 40 000 | Estoc −10 %, Tranchant −10 % | Sommeil, Folie |
| Starscourge Radahn | Demi-dieu | Porteur de Grande Rune, Remembrance, requis pour le DLC | Wailing Dunes (Caelid) | 9 572 | 70 000 | Estoc 0 %, Tranchant 10 % | Folie |
| Rykard, Lord of Blasphemy | Demi-dieu | Porteur de Grande Rune, Remembrance | Volcano Manor (Mt. Gelmir) | 30 439 (phase 1) ; 59 174 (phase 2) | 130 000 | Estoc 10 %, Tranchant 10 % | Folie |
| Mohg, Lord of Blood | Demi-dieu | Porteur de Grande Rune, Remembrance, requis pour le DLC | Mohgwyn Palace (Siofra River) | 18 389 | 420 000 | — | — |
| Draconic Tree Sentinel | Ennemi | Obligatoire | Capital Outskirts | 8 398 | 50 000 | — | — |
| Godfrey (ombre dorée) | Grand ennemi | Obligatoire | Leyndell, Royal Capital | 7 099 | 80 000 | — | — |
| Morgott, the Omen King | Demi-dieu | Obligatoire, Remembrance | Leyndell, Royal Capital | 10 399 | 120 000 | Tranchant −10 %, Feu 0 % | Folie |
| Fire Giant | Légende | Obligatoire, Remembrance | Flame Peak (Mountaintops of the Giants) | 43 263 | 180 000 | Tranchant −10 %, Foudre 0 % | Folie |
| Godskin Duo | Grand ennemi | Obligatoire | Crumbling Farum Azula | — | — | — | — |
| Maliketh, the Black Blade | Légende | Obligatoire, Remembrance | Crumbling Farum Azula | 10 620 | 220 000 | Estoc 35 %, Tranchant 35 % | Folie |
| Sir Gideon Ofnir, the All-Knowing | Ennemi | Obligatoire | Leyndell, Ashen Capital, avant l'entrée de l'Erdtree | — (aucune donnée de combat) | — | — | — |
| Godfrey / Hoarah Loux | Légende | Obligatoire, Remembrance | Leyndell, Ashen Capital | 21 903 | 300 000 | — | — |
| Radagon of the Golden Order | Dieu | Obligatoire | Intérieur de l'Erdtree (Leyndell, Ashen Capital) | 13 339 | 500 000 (après Elden Beast) | — | — |
| Elden Beast | Dieu | Obligatoire, Remembrance | Intérieur de l'Erdtree (Leyndell, Ashen Capital) | 22 127 | 500 000 | Estoc 10 %, Tranchant 10 % | Poison, Putréfaction, Saignement, Givre, Sommeil, Folie |
| Messmer the Impaler | Demi-dieu | DLC, obligatoire, Remembrance | Shadow Keep | 38 981 | 400 000 | — | — |
| Romina, Saint of the Bud | Légende | DLC, obligatoire, Remembrance | Ancient Ruins of Rauh | 35 798 | 380 000 | — | — |
| Promised Consort Radahn | Dieu | DLC, obligatoire, Remembrance | Enir-Ilim | 46 134 (phase 1), 29 987 (phase 2) | 500 000 | Sacré 0 %, Estoc 20 % | Sommeil, Folie |
