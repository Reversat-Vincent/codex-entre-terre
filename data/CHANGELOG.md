# Journal des modifications de `data/`

Chaque modification apportée à `data/*.json` après l'extraction du 31/10/2026 : fichier, entrée, champ, ancienne et nouvelle valeur, page wiki, décision du chef de projet (`ROADMAP.md`, section Décisions), date.
Les fichiers modifiés ont été réécrits par script (Python, `json`, indentation 2), sans autre changement que ceux listés ici ; le contrôle d'intégrité `coef ≤ 3` de `scripts/prepare-data.ts` vérifie P2 à chaque préparation.

## 2026-11-01

Justifications détaillées : `docs/contenu/verification-calculs.md` (« Propositions de correctifs de données », P1 et P2) et `docs/contenu/decisions-progression.md` (§ 6 et annexe A, C1 à C6).

| # | Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur | Page wiki | Décision | Date |
|---|---|---|---|---|---|---|---|---|
| P1 | `origins.json` | Heavy Knight | `base_stats.equip_load` | `53.3` | `59.3` | https://eldenring.wiki.gg/wiki/Heavy_Knight (53.3 = poids de l'équipement de départ selon la note de la page) ; déduction de la table https://eldenring.wiki.gg/wiki/Endurance (17 → 59.3) | D8 | 2026-11-01 |
| P2 | `ranged_weapons_catalysts.json` | Horn Bow | `upgrade.tables.Standard["+N"].scaling.<attr>.coef` | 43 valeurs, liste ci-dessous | 43 valeurs, liste ci-dessous | https://eldenring.wiki.gg/wiki/Horn_Bow | D8 | 2026-11-01 |
| C1 | `bosses.json` | Sir Gideon Ofnir, the All-Knowing | `encounters` | `[]` | une rencontre, ci-dessous | https://eldenring.wiki.gg/wiki/Sir_Gideon_Ofnir,_the_All-Knowing (§ Basic Info) | D15 | 2026-11-01 |
| C1 | `bosses.json` | `metadata` | `encounters` | `301` | `302` | https://eldenring.wiki.gg/wiki/Sir_Gideon_Ofnir,_the_All-Knowing (compte recalculé) | D15 | 2026-11-01 |
| C1 | `bosses.json` | `metadata` | `encounters_by_source["Base game"]` | `250` | `251` | https://eldenring.wiki.gg/wiki/Sir_Gideon_Ofnir,_the_All-Knowing (compte recalculé) | D15 | 2026-11-01 |
| C2 | `bosses.json` | Godskin Duo · rencontre Godskin Duo | `runes` / `runes_values` / `drops` | `null` / `[]` / `["170000 Runes, Smithing-Stone Miner's Bell Bearing [4], Ash of War: Black Flame Tornado"]` | `"170000"` / `[170000]` / `["Smithing-Stone Miner's Bell Bearing [4]", "Ash of War: Black Flame Tornado"]` | https://eldenring.wiki.gg/wiki/Godskin_Duo (champ `drops` de l'infobox ; `hp` reste `null`) | D15 | 2026-11-01 |
| C3 | `bosses.json` | Draconic Tree Sentinel · rencontre Draconic Tree Sentinel (Outskirts Draconic Tree Sentinel) | `location` / `regions` | `null` / `[]` | `"Capital Outskirts"` / `["Altus Plateau", "Capital Outskirts"]` | https://eldenring.wiki.gg/wiki/Draconic_Tree_Sentinel | D15 | 2026-11-01 |
| C4 | `bosses.json` | Elden Beast · rencontre Elden Beast | `regions` | `[]` | `["Altus Plateau", "Leyndell, Ashen Capital"]` | https://eldenring.wiki.gg/wiki/Elden_Beast | D15 | 2026-11-01 |
| C5 | `bosses.json` | Radagon of the Golden Order · rencontre Radagon of the Golden Order | `regions` | `[]` | `["Altus Plateau", "Leyndell, Ashen Capital"]` | https://eldenring.wiki.gg/wiki/Radagon_of_the_Golden_Order | D15 | 2026-11-01 |
| C6 | 11 fichiers | 107 entrées, liste ci-dessous | `regions_mentioned` | contient `"Altus Plateau"` | même liste sans `"Altus Plateau"` | `url` de chaque entrée, ci-dessous | D15 | 2026-11-01 |

### P2 · Horn Bow, coefficients de scaling

Le wiki écrit ces décimales sans zéro initial (`.1`, `.104`, `.3068`) ; l'extraction les avait lues comme `1.0`, `104.0`, `3068.0`. Règle appliquée : nouvelle valeur = `0.` suivi des chiffres de l'ancienne, chaque valeur vérifiée contre la liste de `verification-calculs.md`. Lecture corrigée dans `tools/wiki/build_weapons.py` (`num`, `cell_value`) et `tools/wiki/wikiparse.py` (`num`) ; extraction non relancée.

| Niveau | Attribut | Ancienne valeur | Nouvelle valeur |
|---|---|---|---|
| `+0` | `int` | `1.0` | `0.1` |
| `+1` | `int` | `104.0` | `0.104` |
| `+2` | `int` | `108.0` | `0.108` |
| `+3` | `int` | `112.0` | `0.112` |
| `+4` | `int` | `116.0` | `0.116` |
| `+5` | `int` | `12.0` | `0.12` |
| `+6` | `int` | `124.0` | `0.124` |
| `+7` | `int` | `128.0` | `0.128` |
| `+8` | `int` | `132.0` | `0.132` |
| `+9` | `int` | `136.0` | `0.136` |
| `+10` | `int` | `14.0` | `0.14` |
| `+11` | `int` | `143.0` | `0.143` |
| `+12` | `int` | `146.0` | `0.146` |
| `+13` | `int` | `149.0` | `0.149` |
| `+14` | `int` | `152.0` | `0.152` |
| `+15` | `int` | `155.0` | `0.155` |
| `+16` | `int` | `158.0` | `0.158` |
| `+17` | `int` | `161.0` | `0.161` |
| `+18` | `int` | `164.0` | `0.164` |
| `+19` | `int` | `167.0` | `0.167` |
| `+20` | `int` | `17.0` | `0.17` |
| `+21` | `int` | `172.0` | `0.172` |
| `+22` | `int` | `174.0` | `0.174` |
| `+23` | `int` | `176.0` | `0.176` |
| `+24` | `int` | `178.0` | `0.178` |
| `+25` | `int` | `18.0` | `0.18` |
| `+9` | `dex` | `3068.0` | `0.3068` |
| `+10` | `dex` | `312.0` | `0.312` |
| `+11` | `dex` | `3172.0` | `0.3172` |
| `+12` | `dex` | `3224.0` | `0.3224` |
| `+13` | `dex` | `3276.0` | `0.3276` |
| `+14` | `dex` | `3328.0` | `0.3328` |
| `+15` | `dex` | `338.0` | `0.338` |
| `+16` | `dex` | `3432.0` | `0.3432` |
| `+17` | `dex` | `3484.0` | `0.3484` |
| `+18` | `dex` | `3536.0` | `0.3536` |
| `+19` | `dex` | `3588.0` | `0.3588` |
| `+20` | `dex` | `364.0` | `0.364` |
| `+21` | `dex` | `3692.0` | `0.3692` |
| `+22` | `dex` | `3744.0` | `0.3744` |
| `+23` | `dex` | `3796.0` | `0.3796` |
| `+24` | `dex` | `3848.0` | `0.3848` |
| `+25` | `dex` | `39.0` | `0.39` |

Chemin complet de chaque valeur : `weapons[name="Horn Bow"].upgrade.tables.Standard["<niveau>"].scaling.<attribut>.coef`.

### C1 · Rencontre ajoutée à Sir Gideon Ofnir, the All-Knowing

Mêmes clés, dans le même ordre, que les rencontres sans variante de `bosses.json` (`name`, `location`, `regions`, `source`, `hp`, `hp_values`, `runes`, `runes_values`, `drops`) ; aucune clé facultative (absorption, résistances) puisque `docs/contenu/decisions-progression.md` § 5 ne les relève pas sur la page. Le champ `encounter_data_note` de l'entrée est laissé tel quel.

```json
{
  "name": "Sir Gideon Ofnir, the All-Knowing",
  "location": "Leyndell, Ashen Capital",
  "regions": [
    "Altus Plateau",
    "Leyndell, Ashen Capital"
  ],
  "source": "Base game",
  "hp": "6226",
  "hp_values": [
    6226
  ],
  "runes": "150,000",
  "runes_values": [
    150000
  ],
  "drops": [
    "All-Knowing Set",
    "Scepter of the All-Knowing"
  ]
}
```

### C6 · `regions_mentioned` sans le faux `Altus Plateau`

Critère (annexe A de `decisions-progression.md`) : le texte de `acquisition` ne contient « Altus » que dans « Scadu Altus ». Seule la valeur `"Altus Plateau"` est retirée ; l'ordre des autres valeurs est conservé. Entrée désignée par `wiki_page`.

#### `armor.json` (36)

- Armor of Night — https://eldenring.wiki.gg/wiki/Armor_of_Night
- Common Soldier Cloth Armor — https://eldenring.wiki.gg/wiki/Common_Soldier_Cloth_Armor
- Common Soldier Gauntlets — https://eldenring.wiki.gg/wiki/Common_Soldier_Gauntlets
- Common Soldier Greaves — https://eldenring.wiki.gg/wiki/Common_Soldier_Greaves
- Common Soldier Helm — https://eldenring.wiki.gg/wiki/Common_Soldier_Helm
- Dane's Hat — https://eldenring.wiki.gg/wiki/Dane%27s_Hat
- Death Knight Armor — https://eldenring.wiki.gg/wiki/Death_Knight_Armor
- Death Knight Gauntlets — https://eldenring.wiki.gg/wiki/Death_Knight_Gauntlets
- Death Knight Greaves — https://eldenring.wiki.gg/wiki/Death_Knight_Greaves
- Death Knight Helm — https://eldenring.wiki.gg/wiki/Death_Knight_Helm
- Dryleaf Arm Wraps — https://eldenring.wiki.gg/wiki/Dryleaf_Arm_Wraps
- Dryleaf Cuissardes — https://eldenring.wiki.gg/wiki/Dryleaf_Cuissardes
- Dryleaf Robe — https://eldenring.wiki.gg/wiki/Dryleaf_Robe
- Dryleaf Robe (Altered) — https://eldenring.wiki.gg/wiki/Dryleaf_Robe_(Altered)
- Finger Robe — https://eldenring.wiki.gg/wiki/Finger_Robe
- Gauntlets of Night — https://eldenring.wiki.gg/wiki/Gauntlets_of_Night
- Gravebird Anklets — https://eldenring.wiki.gg/wiki/Gravebird_Anklets
- Greaves of Night — https://eldenring.wiki.gg/wiki/Greaves_of_Night
- Helm of Night — https://eldenring.wiki.gg/wiki/Helm_of_Night
- High Priest Gloves — https://eldenring.wiki.gg/wiki/High_Priest_Gloves
- High Priest Hat — https://eldenring.wiki.gg/wiki/High_Priest_Hat
- High Priest Robe — https://eldenring.wiki.gg/wiki/High_Priest_Robe
- High Priest Undergarments — https://eldenring.wiki.gg/wiki/High_Priest_Undergarments
- Highland Attire — https://eldenring.wiki.gg/wiki/Highland_Attire
- Leather Arm Wraps — https://eldenring.wiki.gg/wiki/Leather_Arm_Wraps
- Leather Crown — https://eldenring.wiki.gg/wiki/Leather_Crown
- Leather Leg Wraps — https://eldenring.wiki.gg/wiki/Leather_Leg_Wraps
- Pelt of Ralva — https://eldenring.wiki.gg/wiki/Pelt_of_Ralva
- Rakshasa Armor — https://eldenring.wiki.gg/wiki/Rakshasa_Armor
- Rakshasa Gauntlets — https://eldenring.wiki.gg/wiki/Rakshasa_Gauntlets
- Rakshasa Greaves — https://eldenring.wiki.gg/wiki/Rakshasa_Greaves
- Rakshasa Helm — https://eldenring.wiki.gg/wiki/Rakshasa_Helm
- Verdigris Armor — https://eldenring.wiki.gg/wiki/Verdigris_Armor
- Verdigris Gauntlets — https://eldenring.wiki.gg/wiki/Verdigris_Gauntlets
- Verdigris Greaves — https://eldenring.wiki.gg/wiki/Verdigris_Greaves
- Verdigris Helm — https://eldenring.wiki.gg/wiki/Verdigris_Helm

#### `ashes_of_war.json` (5)

- Ash of War: Aspects of the Crucible: Wings — https://eldenring.wiki.gg/wiki/Ash_of_War:_Aspects_of_the_Crucible:_Wings
- Ash of War: Carian Sovereignty — https://eldenring.wiki.gg/wiki/Ash_of_War:_Carian_Sovereignty
- Ash of War: Piercing Throw — https://eldenring.wiki.gg/wiki/Ash_of_War:_Piercing_Throw
- Ash of War: Raging Beast — https://eldenring.wiki.gg/wiki/Ash_of_War:_Raging_Beast
- Ash of War: Rolling Sparks — https://eldenring.wiki.gg/wiki/Ash_of_War:_Rolling_Sparks

#### `crafting_materials.json` (2)

- Knot Resin — https://eldenring.wiki.gg/wiki/Knot_Resin
- Shadow Sunflower — https://eldenring.wiki.gg/wiki/Shadow_Sunflower

#### `key_items.json` (20)

- Battlefield Priest's Cookbook 2 — https://eldenring.wiki.gg/wiki/Battlefield_Priest%27s_Cookbook_2
- Battlefield Priest's Cookbook 3 — https://eldenring.wiki.gg/wiki/Battlefield_Priest%27s_Cookbook_3
- Bloodsucking Cracked Tear — https://eldenring.wiki.gg/wiki/Bloodsucking_Cracked_Tear
- Cerulean-Sapping Cracked Tear — https://eldenring.wiki.gg/wiki/Cerulean-Sapping_Cracked_Tear
- Crimsonburst Dried Tear — https://eldenring.wiki.gg/wiki/Crimsonburst_Dried_Tear
- Finger-Weaver's Cookbook 2 — https://eldenring.wiki.gg/wiki/Finger-Weaver%27s_Cookbook_2
- Forager Brood Cookbook 1 — https://eldenring.wiki.gg/wiki/Forager_Brood_Cookbook_1
- Forager Brood Cookbook 4 — https://eldenring.wiki.gg/wiki/Forager_Brood_Cookbook_4
- Forager Brood Cookbook 5 — https://eldenring.wiki.gg/wiki/Forager_Brood_Cookbook_5
- Forager Brood Cookbook 6 — https://eldenring.wiki.gg/wiki/Forager_Brood_Cookbook_6
- Greasemonger's Bell Bearing — https://eldenring.wiki.gg/wiki/Greasemonger%27s_Bell_Bearing
- Greater Potentate's Cookbook 3 — https://eldenring.wiki.gg/wiki/Greater_Potentate%27s_Cookbook_3
- Greater Potentate's Cookbook 4 — https://eldenring.wiki.gg/wiki/Greater_Potentate%27s_Cookbook_4
- Larval Tear (SotE) — https://eldenring.wiki.gg/wiki/Larval_Tear_(SotE)
- Map Scadu Altus — https://eldenring.wiki.gg/wiki/Map_Scadu_Altus
- Moldmonger's Bell Bearing — https://eldenring.wiki.gg/wiki/Moldmonger%27s_Bell_Bearing
- Moore's Bell Bearing — https://eldenring.wiki.gg/wiki/Moore%27s_Bell_Bearing
- Oil-Soaked Tear — https://eldenring.wiki.gg/wiki/Oil-Soaked_Tear
- Spellmachinist's Bell Bearing — https://eldenring.wiki.gg/wiki/Spellmachinist%27s_Bell_Bearing
- Ymir's Bell Bearing — https://eldenring.wiki.gg/wiki/Ymir%27s_Bell_Bearing

#### `melee_armaments.json` (15)

- Ancient Meteoric Ore Greatsword — https://eldenring.wiki.gg/wiki/Ancient_Meteoric_Ore_Greatsword
- Barbed Staff-Spear — https://eldenring.wiki.gg/wiki/Barbed_Staff-Spear
- Black Steel Twinblade — https://eldenring.wiki.gg/wiki/Black_Steel_Twinblade
- Bonny Butchering Knife — https://eldenring.wiki.gg/wiki/Bonny_Butchering_Knife
- Carian Sorcery Sword — https://eldenring.wiki.gg/wiki/Carian_Sorcery_Sword
- Claws of Night — https://eldenring.wiki.gg/wiki/Claws_of_Night
- Curseblade's Cirque — https://eldenring.wiki.gg/wiki/Curseblade%27s_Cirque
- Dryleaf Arts — https://eldenring.wiki.gg/wiki/Dryleaf_Arts
- Forked-Tongue Hatchet — https://eldenring.wiki.gg/wiki/Forked-Tongue_Hatchet
- Iron Cleaver — https://eldenring.wiki.gg/wiki/Iron_Cleaver
- Messmer Soldier's Axe — https://eldenring.wiki.gg/wiki/Messmer_Soldier%27s_Axe
- Rakshasa's Great Katana — https://eldenring.wiki.gg/wiki/Rakshasa%27s_Great_Katana
- Smithscript Cirque — https://eldenring.wiki.gg/wiki/Smithscript_Cirque
- Sword of Night — https://eldenring.wiki.gg/wiki/Sword_of_Night
- Tooth Whip — https://eldenring.wiki.gg/wiki/Tooth_Whip

#### `ranged_weapons_catalysts.json` (6)

- Ansbach's Longbow — https://eldenring.wiki.gg/wiki/Ansbach%27s_Longbow
- Dryleaf Seal — https://eldenring.wiki.gg/wiki/Dryleaf_Seal
- Maternal Staff — https://eldenring.wiki.gg/wiki/Maternal_Staff
- Rabbath's Cannon — https://eldenring.wiki.gg/wiki/Rabbath%27s_Cannon
- Repeating Crossbow — https://eldenring.wiki.gg/wiki/Repeating_Crossbow
- Shortbow — https://eldenring.wiki.gg/wiki/Shortbow

#### `shields_torches.json` (2)

- Shield of Night — https://eldenring.wiki.gg/wiki/Shield_of_Night
- Verdigris Greatshield — https://eldenring.wiki.gg/wiki/Verdigris_Greatshield

#### `spells.json` (8)

- Aspects of the Crucible: Thorns — https://eldenring.wiki.gg/wiki/Aspects_of_the_Crucible:_Thorns
- Cherishing Fingers — https://eldenring.wiki.gg/wiki/Cherishing_Fingers
- Fleeting Microcosm — https://eldenring.wiki.gg/wiki/Fleeting_Microcosm
- Giant Golden Arc — https://eldenring.wiki.gg/wiki/Giant_Golden_Arc
- Glintstone Pebble — https://eldenring.wiki.gg/wiki/Glintstone_Pebble
- Golden Arcs — https://eldenring.wiki.gg/wiki/Golden_Arcs
- Heal from Afar — https://eldenring.wiki.gg/wiki/Heal_from_Afar
- Impenetrable Thorns (Sorcery) — https://eldenring.wiki.gg/wiki/Impenetrable_Thorns_(Sorcery)

#### `talismans.json` (5)

- Arrow's Soaring Sting Talisman — https://eldenring.wiki.gg/wiki/Arrow%27s_Soaring_Sting_Talisman
- Flamedrake Talisman +3 — https://eldenring.wiki.gg/wiki/Flamedrake_Talisman_%2B3
- Lacerating Crossed-Tree — https://eldenring.wiki.gg/wiki/Lacerating_Crossed-Tree
- Retaliatory Crossed-Tree — https://eldenring.wiki.gg/wiki/Retaliatory_Crossed-Tree
- Verdigris Discus — https://eldenring.wiki.gg/wiki/Verdigris_Discus

#### `tools.json` (6)

- Blessing of Marika — https://eldenring.wiki.gg/wiki/Blessing_of_Marika
- Golden Vow (Consumable) — https://eldenring.wiki.gg/wiki/Golden_Vow_(Consumable)
- Messmerfire Grease — https://eldenring.wiki.gg/wiki/Messmerfire_Grease
- Opaline Pickled Liver — https://eldenring.wiki.gg/wiki/Opaline_Pickled_Liver
- Roundrock — https://eldenring.wiki.gg/wiki/Roundrock
- Well-Pickled Turtle Neck — https://eldenring.wiki.gg/wiki/Well-Pickled_Turtle_Neck

#### `upgrade_materials.json` (2)

- Revered Spirit Ash — https://eldenring.wiki.gg/wiki/Revered_Spirit_Ash
- Scadutree Fragment — https://eldenring.wiki.gg/wiki/Scadutree_Fragment

## 2026-11-05

Décisions D29 (compléments d’eldenring.wiki.gg retenus) et D34 (arbitrages des correctifs préparés) ; `ROADMAP.md`, section Décisions. Opérations : `docs/contenu/correctifs-complements.json`, appliquées dans l’ordre après vérification de chaque `old` (0 écart), puis les arbitrages D34 ci-dessous. Justifications : `docs/contenu/complements-wiki-gg.md` (« Correctifs préparés »). Fichiers réécrits par script (Python, `json`, indentation 2, UTF-8, LF, sans changement de format).

Écarts avec le fichier d’opérations (D34) :
- Les 2 opérations qui signalaient Carian Sorcery Sword dans `wiki_inconsistencies_flagged` et dans `field_notes["wiki_inconsistencies_flagged"]` ne sont **pas appliquées** : remplacées par la clé structurée `material_inconsistencies_flagged` (catégorie K).
- `docs/contenu/correctifs-complements-schema.json` (Great Épée) n’est pas appliqué.

Page wiki : le champ `url` de l’entrée modifiée (celui du fichier) ; pour les métadonnées et les listes, la page citée dans la catégorie.

| Cat. | Contenu | Fichiers | Opérations | Décision |
|---|---|---|---|---|
| A | `material`, `max_level`, `material_info_source` (303 armes) | 3 fichiers d’armes | 909 | D29 |
| B | `ash_of_war_changeable`, `changeability_info_source` (294 armes) | 3 fichiers d’armes | 588 | D29 |
| C | Hoslow’s Petal Whip et Golden Lion Shield (P-A1, P-A2) | `melee_armaments.json`, `shields_torches.json` | 12 | D29 |
| D | Métadonnées des armes (`field_notes`, `upgrade_path_documentation`) | 3 fichiers d’armes | 6 | D29 |
| E | `affinity_changeable` des armes Somber (95 armes) | 3 fichiers d’armes | 190 champs | D34 |
| F | Clés `negation_*` (Onyx Lord, Miranda Blossom) | `bosses.json` | 17 | D29 |
| G | Count Ymir : rencontre ajoutée | `bosses.json` | 1 | D29 |
| H | 3 liens de page de boss corrigés | `bosses.json` | 18 | D29 |
| I | 5 pages d’envahisseurs ajoutées | `bosses.json` | 5 (+ rang D34) | D29, D34 |
| J | Métadonnées de `bosses.json` | `bosses.json` | 4 (+ 2 D34) | D29, D34 |
| K | Carian Sorcery Sword : `material_inconsistencies_flagged` | 3 fichiers d’armes | 6 métadonnées | D29, D34 |
| L | Restes d’images : 21 galeries `ER Icon`, 53 cellules `ER Site of Grace`, 1 site de grâce, 1 `og pic` | `key_items.json`, `mechanics.json`, `locations.json`, `bosses.json` | 21 + 55 | D29, D34 |
| M | Fanged Imp Ashes : tableau « Minor puzzle spoiler » | `spirit_ashes.json` | 2 | D29, D34 (option A) |

### A · Matériau d’amélioration (liste « Armaments by Bolstering Material »)

Page : https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material (et la page de chaque arme). Décision D29. Pour toutes les armes, `upgrade.material_info_source` passe de `null` à `wiki (Armaments by Bolstering Material)` ; la valeur n’est citée ci-dessous que si elle diffère. Les estimations (`upgrade.estimate_if_undocumented`) ne changent pas : 13 sont contredites par la liste (12 estimées Smithing et Somber selon la liste, Bone Bow estimée Somber et Smithing selon la liste), les autres sont confirmées.

#### `melee_armaments.json` (181 armes)

- Smithscript Dagger — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Leda's Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Rellana's Twin Blades — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Lordsworn's Greatsword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gargoyle's Blackblade — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Sword of Milos — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Marais Executioner's Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Greatsword of Solitude — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Helphen's Steeple — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Blasphemous Blade — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Sacred Relic Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Fire Knight's Greatsword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Moonrithyll's Knight Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Greatsword of Radahn (Lord) — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Greatsword of Radahn (Light) — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Godslayer's Greatsword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Estoc — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Noble's Estoc — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Cleanrot Knight's Sword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Rogier's Rapier — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Antspur Rapier — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Carian Sorcery Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Godskin Stitcher — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Bloody Helice — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Scimitar — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Falchion — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Shamshir — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Grossmesser — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Mantis Blade — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Beastman's Curved Sword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Flowing Curved Sword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Serpent-God's Curved Sword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Magma Blade — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Spirit Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dancing Blade of Ranah — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Horned Warrior's Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Eclipse Shotel — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Omen Cleaver — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Freyja's Greatsword — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Zamor Curved Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Horned Warrior's Greatsword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Smithscript Cirque — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Curseblade's Cirque — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Nagakiba — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Serpentbone Blade — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Moonveil — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dragonscale Blade — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Star-Lined Sword — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Great Katana — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Dragon-Hunter's Great Katana — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Twinned Knight Swords — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gargoyle's Black Blades — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Battle Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Messmer Soldier's Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Jawbone Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Iron Cleaver — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Smithscript Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Celebrant's Cleaver — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Sacrificial Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Stormhawk Axe — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Rosus' Axe — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Death Knight's Twin Axes — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Greataxe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Crescent Moon Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Longhaft Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Executioner's Greataxe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Rusted Anchor — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Butchering Knife — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Bonny Butchering Knife — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Gargoyle's Great Axe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gargoyle's Black Axe — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Death Knight's Longhaft Axe — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Winged Greathorn — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Axe of Godrick — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Club — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spiked Club — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Mace — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Morning Star — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Monk's Flamemace — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Envoy's Horn — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Nox Flowing Hammer — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Ringed Finger — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Scepter of the All-Knowing — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Flowerstone Gavel — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Marika's Hammer — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Flail — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Nightrider Flail — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Large Club — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Curved Great Club — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Great Mace — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Pickaxe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Brick Hammer — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Battle Hammer — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Rotten Battle Hammer — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Celebrant's Skull — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Great Stars — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Smithscript Greathammer — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Greathorn Hammer — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Envoy's Long Horn — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Cranial Vessel Candlestand — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Devourer's Scepter — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Duelist Greataxe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Rotten Greataxe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Golem's Halberd — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Giant-Crusher — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Prelate's Inferno Crozier — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Great Club — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Troll's Hammer — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Dragon Greatclaw — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Watchdog's Staff — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Envoy's Greathorn — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Anvil Hammer — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Devonia's Hammer — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Axe of Godfrey — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Shadow Sunflower Blossom — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Gazing Finger — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Short Spear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Iron Spear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Partisan — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Pike — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Swift Spear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spiked Spear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Cross-Naginata — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Clayman's Harpoon — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Bloodfiend's Fork — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Celebrant's Rib-Rake — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Torchpole — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Smithscript Spear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Inquisitor's Girandole — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Crystal Spear — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Rotten Crystal Spear — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Cleanrot Spear — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Bolt of Gransax — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Treespear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Serpent-Hunter — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Siluria's Tree — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Vyke's War Spear — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Spear of the Impaler — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Halberd — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Banished Knight's Halberd — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Lucerne — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Glaive — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Vulgar Militia Shotel — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Vulgar Militia Saw — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Guardian's Swordspear — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gargoyle's Halberd — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gargoyle's Black Halberd — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Nightrider Glaive — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Pest's Glaive — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Ripple Crescent Halberd — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Golden Halberd — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dragon Halberd — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Commander's Standard — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Spirit Glaive — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Scythe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Grave Scythe — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Halo Scythe — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Winged Scythe — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Obsidian Lamina — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Whip — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Thorned Whip — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Magma Whip Candlestick — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Caestus — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spiked Caestus — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Iron Ball — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Star Fist — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Clinging Bone — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Veteran's Prosthesis — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Cipher Pata — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Poisoned Hand — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Thiollier's Hidden Needle — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Golem Fist — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Grafted Dragon — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dryleaf Arts — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Dane's Footwork — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Hookclaws — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Bloodhound Claws — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Venomous Fang — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Raptor Talons — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Red Bear's Claw — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`

#### `ranged_weapons_catalysts.json` (42 armes)

- Shortbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Composite Bow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Red Branch Shortbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Misbegotten Shortbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Harp Bow — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Bone Bow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Longbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Black Bow — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Ansbach's Longbow — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Pulley Bow — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Serpent Bow — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Erdtree Bow — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Soldier's Crossbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Light Crossbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Heavy Crossbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Arbalest — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spread Crossbow — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Hand Ballista — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Astrologer's Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Glintstone Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Academy Glintstone Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Digger's Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Demi-Human Queen's Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Lusat's Glintstone Staff — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Carian Glintstone Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Carian Glintblade Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Carian Regal Scepter — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Albinauric Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Staff of Loss — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gelmir Glintstone Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Rotten Crystal Staff — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Staff of the Guilty — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Prince of Death's Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Maternal Staff — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Staff of the Great Beyond — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dryleaf Seal — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spiraltree Seal — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gravel Stone Seal — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Giant's Seal — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Godslayer's Seal — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Frenzied Flame Seal — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dragon Communion Seal — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`

#### `shields_torches.json` (80 armes)

- Torch — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Beast-Repellent Torch — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Steel-Wire Torch — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Sentry's Torch — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Ghostflame Torch — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- St. Trina's Torch — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Nanaya's Torch — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Lamenting Visage — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Rickety Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Riveted Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Blue-White Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Scripture Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Red Thorn Roundshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Pillory Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Buckler — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Iron Roundshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gilded Iron Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Man-Serpent's Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Ice Crest Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Rift Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Perfumer's Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Shield of the Guilty — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spiralhorn Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Smoldering Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Coil Shield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Shield of Night — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Hawk Crest Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Horse Crest Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Candletree Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Flame Crest Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Marred Wooden Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Sun Realm Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Round Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Large Leather Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Black Leather Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Marred Leather Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Heater Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Blue Crest Heater Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Red Crest Heater Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Beast Crest Heater Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Inverted Hawk Heater Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Eclipse Crest Heater Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Kite Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Blue-Gold Kite Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Scorpion Kite Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Twinbird Kite Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Brass Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Messmer Soldier Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Banished Knight's Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Wolf Crest Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Serpent Crest Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Albinauric Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Beastman's Jar-Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Carian Knight's Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Silver Mirrorshield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Great Turtle Shell — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Wooden Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Lordsworn's Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Briar Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Spiked Palisade Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Golden Beast Crest Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Manor Towershield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Crossed-Tree Towershield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Inverted Hawk Towershield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Dragon Towershield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Distinguished Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Gilded Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Cuckoo Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Redmane Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Golden Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Haligtree Crest Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Black Steel Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Crucible Hornshield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dragonclaw Shield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Eclipse Crest Greatshield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Erdtree Greatshield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Jellyfish Shield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Visage Shield — `material` `null` → `"Somber Smithing Stones"` ; `max_level` `null` → `10`
- Dueling Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`
- Carian Thrusting Shield — `material` `null` → `"Smithing Stones"` ; `max_level` `null` → `25`

### B · Cendre de guerre (liste « Ash of War-Compatible Armaments »)

Page : https://eldenring.wiki.gg/wiki/Ash_of_War-Compatible_Armaments (et la page de chaque arme). Décision D29. `upgrade.changeability_info_source` passe de `null` à `wiki (Ash of War-Compatible Armaments)`, sauf les 12 armes à distance qui avaient déjà une provenance : la nouvelle s’y ajoute avec ` + ` (valeur citée ci-dessous). `affinity_changeable` n’est pas touché par cette catégorie (voir C et E). Cinq armes dont l’estimation disait `true` (Serpentbone Blade, Great Club, Troll’s Hammer, Torchpole, Treespear) reçoivent `false` de la liste.

#### `melee_armaments.json` (185 armes)

- Smithscript Dagger — `ash_of_war_changeable` `null` → `true`
- Leda's Sword — `ash_of_war_changeable` `null` → `false`
- Rellana's Twin Blades — `ash_of_war_changeable` `null` → `false`
- Bastard Sword — `ash_of_war_changeable` `null` → `true`
- Lordsworn's Greatsword — `ash_of_war_changeable` `null` → `true`
- Gargoyle's Blackblade — `ash_of_war_changeable` `null` → `false`
- Sword of Milos — `ash_of_war_changeable` `null` → `false`
- Marais Executioner's Sword — `ash_of_war_changeable` `null` → `false`
- Greatsword of Solitude — `ash_of_war_changeable` `null` → `false`
- Helphen's Steeple — `ash_of_war_changeable` `null` → `false`
- Blasphemous Blade — `ash_of_war_changeable` `null` → `false`
- Sacred Relic Sword — `ash_of_war_changeable` `null` → `false`
- Fire Knight's Greatsword — `ash_of_war_changeable` `null` → `true`
- Moonrithyll's Knight Sword — `ash_of_war_changeable` `null` → `false`
- Greatsword of Radahn (Lord) — `ash_of_war_changeable` `null` → `false`
- Greatsword of Radahn (Light) — `ash_of_war_changeable` `null` → `false`
- Godslayer's Greatsword — `ash_of_war_changeable` `null` → `false`
- Estoc — `ash_of_war_changeable` `null` → `true`
- Noble's Estoc — `ash_of_war_changeable` `null` → `true`
- Cleanrot Knight's Sword — `ash_of_war_changeable` `null` → `true`
- Rogier's Rapier — `ash_of_war_changeable` `null` → `true`
- Antspur Rapier — `ash_of_war_changeable` `null` → `true`
- Carian Sorcery Sword — `ash_of_war_changeable` `null` → `false`
- Godskin Stitcher — `ash_of_war_changeable` `null` → `true`
- Bloody Helice — `ash_of_war_changeable` `null` → `false`
- Scimitar — `ash_of_war_changeable` `null` → `true`
- Falchion — `ash_of_war_changeable` `null` → `true`
- Shamshir — `ash_of_war_changeable` `null` → `true`
- Grossmesser — `ash_of_war_changeable` `null` → `true`
- Mantis Blade — `ash_of_war_changeable` `null` → `true`
- Beastman's Curved Sword — `ash_of_war_changeable` `null` → `true`
- Flowing Curved Sword — `ash_of_war_changeable` `null` → `true`
- Serpent-God's Curved Sword — `ash_of_war_changeable` `null` → `true`
- Magma Blade — `ash_of_war_changeable` `null` → `false`
- Spirit Sword — `ash_of_war_changeable` `null` → `false`
- Dancing Blade of Ranah — `ash_of_war_changeable` `null` → `false`
- Horned Warrior's Sword — `ash_of_war_changeable` `null` → `false`
- Eclipse Shotel — `ash_of_war_changeable` `null` → `false`
- Omen Cleaver — `ash_of_war_changeable` `null` → `true`
- Freyja's Greatsword — `ash_of_war_changeable` `null` → `true`
- Zamor Curved Sword — `ash_of_war_changeable` `null` → `false`
- Horned Warrior's Greatsword — `ash_of_war_changeable` `null` → `false`
- Smithscript Cirque — `ash_of_war_changeable` `null` → `true`
- Curseblade's Cirque — `ash_of_war_changeable` `null` → `false`
- Nagakiba — `ash_of_war_changeable` `null` → `true`
- Serpentbone Blade — `ash_of_war_changeable` `null` → `false`
- Moonveil — `ash_of_war_changeable` `null` → `false`
- Dragonscale Blade — `ash_of_war_changeable` `null` → `false`
- Star-Lined Sword — `ash_of_war_changeable` `null` → `false`
- Great Katana — `ash_of_war_changeable` `null` → `true`
- Dragon-Hunter's Great Katana — `ash_of_war_changeable` `null` → `false`
- Twinned Knight Swords — `ash_of_war_changeable` `null` → `true`
- Gargoyle's Black Blades — `ash_of_war_changeable` `null` → `false`
- Forked-Tongue Hatchet — `ash_of_war_changeable` `null` → `false`
- Battle Axe — `ash_of_war_changeable` `null` → `true`
- Messmer Soldier's Axe — `ash_of_war_changeable` `null` → `true`
- Jawbone Axe — `ash_of_war_changeable` `null` → `true`
- Iron Cleaver — `ash_of_war_changeable` `null` → `true`
- Highland Axe — `ash_of_war_changeable` `null` → `true`
- Smithscript Axe — `ash_of_war_changeable` `null` → `true`
- Celebrant's Cleaver — `ash_of_war_changeable` `null` → `true`
- Sacrificial Axe — `ash_of_war_changeable` `null` → `true`
- Stormhawk Axe — `ash_of_war_changeable` `null` → `false`
- Rosus' Axe — `ash_of_war_changeable` `null` → `false`
- Death Knight's Twin Axes — `ash_of_war_changeable` `null` → `false`
- Greataxe — `ash_of_war_changeable` `null` → `true`
- Crescent Moon Axe — `ash_of_war_changeable` `null` → `true`
- Longhaft Axe — `ash_of_war_changeable` `null` → `true`
- Executioner's Greataxe — `ash_of_war_changeable` `null` → `true`
- Rusted Anchor — `ash_of_war_changeable` `null` → `true`
- Butchering Knife — `ash_of_war_changeable` `null` → `true`
- Bonny Butchering Knife — `ash_of_war_changeable` `null` → `false`
- Gargoyle's Great Axe — `ash_of_war_changeable` `null` → `true`
- Gargoyle's Black Axe — `ash_of_war_changeable` `null` → `false`
- Death Knight's Longhaft Axe — `ash_of_war_changeable` `null` → `false`
- Winged Greathorn — `ash_of_war_changeable` `null` → `false`
- Axe of Godrick — `ash_of_war_changeable` `null` → `false`
- Club — `ash_of_war_changeable` `null` → `true`
- Spiked Club — `ash_of_war_changeable` `null` → `true`
- Mace — `ash_of_war_changeable` `null` → `true`
- Morning Star — `ash_of_war_changeable` `null` → `true`
- Monk's Flamemace — `ash_of_war_changeable` `null` → `true`
- Envoy's Horn — `ash_of_war_changeable` `null` → `false`
- Nox Flowing Hammer — `ash_of_war_changeable` `null` → `false`
- Ringed Finger — `ash_of_war_changeable` `null` → `false`
- Scepter of the All-Knowing — `ash_of_war_changeable` `null` → `false`
- Flowerstone Gavel — `ash_of_war_changeable` `null` → `false`
- Marika's Hammer — `ash_of_war_changeable` `null` → `false`
- Flail — `ash_of_war_changeable` `null` → `true`
- Nightrider Flail — `ash_of_war_changeable` `null` → `true`
- Large Club — `ash_of_war_changeable` `null` → `true`
- Curved Great Club — `ash_of_war_changeable` `null` → `true`
- Great Mace — `ash_of_war_changeable` `null` → `true`
- Pickaxe — `ash_of_war_changeable` `null` → `true`
- Brick Hammer — `ash_of_war_changeable` `null` → `true`
- Battle Hammer — `ash_of_war_changeable` `null` → `true`
- Rotten Battle Hammer — `ash_of_war_changeable` `null` → `true`
- Celebrant's Skull — `ash_of_war_changeable` `null` → `true`
- Great Stars — `ash_of_war_changeable` `null` → `true`
- Smithscript Greathammer — `ash_of_war_changeable` `null` → `true`
- Greathorn Hammer — `ash_of_war_changeable` `null` → `true`
- Envoy's Long Horn — `ash_of_war_changeable` `null` → `false`
- Cranial Vessel Candlestand — `ash_of_war_changeable` `null` → `false`
- Devourer's Scepter — `ash_of_war_changeable` `null` → `false`
- Duelist Greataxe — `ash_of_war_changeable` `null` → `true`
- Rotten Greataxe — `ash_of_war_changeable` `null` → `true`
- Golem's Halberd — `ash_of_war_changeable` `null` → `true`
- Giant-Crusher — `ash_of_war_changeable` `null` → `true`
- Prelate's Inferno Crozier — `ash_of_war_changeable` `null` → `true`
- Great Club — `ash_of_war_changeable` `null` → `false`
- Troll's Hammer — `ash_of_war_changeable` `null` → `false`
- Dragon Greatclaw — `ash_of_war_changeable` `null` → `false`
- Bloodfiend's Arm — `ash_of_war_changeable` `null` → `true`
- Watchdog's Staff — `ash_of_war_changeable` `null` → `false`
- Envoy's Greathorn — `ash_of_war_changeable` `null` → `false`
- Anvil Hammer — `ash_of_war_changeable` `null` → `false`
- Devonia's Hammer — `ash_of_war_changeable` `null` → `false`
- Axe of Godfrey — `ash_of_war_changeable` `null` → `false`
- Shadow Sunflower Blossom — `ash_of_war_changeable` `null` → `false`
- Gazing Finger — `ash_of_war_changeable` `null` → `false`
- Short Spear — `ash_of_war_changeable` `null` → `true`
- Iron Spear — `ash_of_war_changeable` `null` → `true`
- Spear — `ash_of_war_changeable` `null` → `true`
- Partisan — `ash_of_war_changeable` `null` → `true`
- Pike — `ash_of_war_changeable` `null` → `true`
- Swift Spear — `ash_of_war_changeable` `null` → `true`
- Spiked Spear — `ash_of_war_changeable` `null` → `true`
- Cross-Naginata — `ash_of_war_changeable` `null` → `true`
- Clayman's Harpoon — `ash_of_war_changeable` `null` → `true`
- Bloodfiend's Fork — `ash_of_war_changeable` `null` → `true`
- Celebrant's Rib-Rake — `ash_of_war_changeable` `null` → `true`
- Torchpole — `ash_of_war_changeable` `null` → `false`
- Smithscript Spear — `ash_of_war_changeable` `null` → `true`
- Inquisitor's Girandole — `ash_of_war_changeable` `null` → `false`
- Crystal Spear — `ash_of_war_changeable` `null` → `false`
- Rotten Crystal Spear — `ash_of_war_changeable` `null` → `false`
- Cleanrot Spear — `ash_of_war_changeable` `null` → `false`
- Bolt of Gransax — `ash_of_war_changeable` `null` → `false`
- Treespear — `ash_of_war_changeable` `null` → `false`
- Serpent-Hunter — `ash_of_war_changeable` `null` → `false`
- Siluria's Tree — `ash_of_war_changeable` `null` → `false`
- Vyke's War Spear — `ash_of_war_changeable` `null` → `false`
- Spear of the Impaler — `ash_of_war_changeable` `null` → `false`
- Halberd — `ash_of_war_changeable` `null` → `true`
- Banished Knight's Halberd — `ash_of_war_changeable` `null` → `true`
- Lucerne — `ash_of_war_changeable` `null` → `true`
- Glaive — `ash_of_war_changeable` `null` → `true`
- Vulgar Militia Shotel — `ash_of_war_changeable` `null` → `true`
- Vulgar Militia Saw — `ash_of_war_changeable` `null` → `true`
- Guardian's Swordspear — `ash_of_war_changeable` `null` → `true`
- Gargoyle's Halberd — `ash_of_war_changeable` `null` → `true`
- Gargoyle's Black Halberd — `ash_of_war_changeable` `null` → `false`
- Nightrider Glaive — `ash_of_war_changeable` `null` → `true`
- Pest's Glaive — `ash_of_war_changeable` `null` → `true`
- Ripple Crescent Halberd — `ash_of_war_changeable` `null` → `false`
- Golden Halberd — `ash_of_war_changeable` `null` → `false`
- Dragon Halberd — `ash_of_war_changeable` `null` → `false`
- Commander's Standard — `ash_of_war_changeable` `null` → `false`
- Spirit Glaive — `ash_of_war_changeable` `null` → `false`
- Scythe — `ash_of_war_changeable` `null` → `true`
- Grave Scythe — `ash_of_war_changeable` `null` → `true`
- Halo Scythe — `ash_of_war_changeable` `null` → `false`
- Winged Scythe — `ash_of_war_changeable` `null` → `false`
- Obsidian Lamina — `ash_of_war_changeable` `null` → `false`
- Whip — `ash_of_war_changeable` `null` → `true`
- Thorned Whip — `ash_of_war_changeable` `null` → `true`
- Magma Whip Candlestick — `ash_of_war_changeable` `null` → `false`
- Caestus — `ash_of_war_changeable` `null` → `true`
- Spiked Caestus — `ash_of_war_changeable` `null` → `true`
- Iron Ball — `ash_of_war_changeable` `null` → `true`
- Star Fist — `ash_of_war_changeable` `null` → `true`
- Clinging Bone — `ash_of_war_changeable` `null` → `false`
- Veteran's Prosthesis — `ash_of_war_changeable` `null` → `false`
- Cipher Pata — `ash_of_war_changeable` `null` → `false`
- Poisoned Hand — `ash_of_war_changeable` `null` → `false`
- Thiollier's Hidden Needle — `ash_of_war_changeable` `null` → `false`
- Golem Fist — `ash_of_war_changeable` `null` → `true`
- Grafted Dragon — `ash_of_war_changeable` `null` → `false`
- Dryleaf Arts — `ash_of_war_changeable` `null` → `true`
- Dane's Footwork — `ash_of_war_changeable` `null` → `true`
- Hookclaws — `ash_of_war_changeable` `null` → `true`
- Bloodhound Claws — `ash_of_war_changeable` `null` → `true`
- Venomous Fang — `ash_of_war_changeable` `null` → `true`
- Raptor Talons — `ash_of_war_changeable` `null` → `true`
- Red Bear's Claw — `ash_of_war_changeable` `null` → `false`

#### `ranged_weapons_catalysts.json` (29 armes)

- Shortbow — `ash_of_war_changeable` `null` → `true` ; `changeability_info_source` `"wiki (class page: Light Bows)"` → `"wiki (class page: Light Bows) + wiki (Ash of War-Compatible Armaments)"`
- Composite Bow — `ash_of_war_changeable` `null` → `true` ; `changeability_info_source` `"wiki (class page: Light Bows)"` → `"wiki (class page: Light Bows) + wiki (Ash of War-Compatible Armaments)"`
- Red Branch Shortbow — `ash_of_war_changeable` `null` → `true` ; `changeability_info_source` `"wiki (class page: Light Bows)"` → `"wiki (class page: Light Bows) + wiki (Ash of War-Compatible Armaments)"`
- Misbegotten Shortbow — `ash_of_war_changeable` `null` → `true` ; `changeability_info_source` `"wiki (class page: Light Bows)"` → `"wiki (class page: Light Bows) + wiki (Ash of War-Compatible Armaments)"`
- Harp Bow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Light Bows)"` → `"wiki (class page: Light Bows) + wiki (Ash of War-Compatible Armaments)"`
- Bone Bow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Light Bows)"` → `"wiki (class page: Light Bows) + wiki (Ash of War-Compatible Armaments)"`
- Longbow — `ash_of_war_changeable` `null` → `true` ; `changeability_info_source` `"wiki (class page: Bows)"` → `"wiki (class page: Bows) + wiki (Ash of War-Compatible Armaments)"`
- Black Bow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Bows)"` → `"wiki (class page: Bows) + wiki (Ash of War-Compatible Armaments)"`
- Ansbach's Longbow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Bows)"` → `"wiki (class page: Bows) + wiki (Ash of War-Compatible Armaments)"`
- Pulley Bow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Bows)"` → `"wiki (class page: Bows) + wiki (Ash of War-Compatible Armaments)"`
- Serpent Bow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Bows)"` → `"wiki (class page: Bows) + wiki (Ash of War-Compatible Armaments)"`
- Erdtree Bow — `ash_of_war_changeable` `null` → `false` ; `changeability_info_source` `"wiki (class page: Bows)"` → `"wiki (class page: Bows) + wiki (Ash of War-Compatible Armaments)"`
- Astrologer's Staff — `ash_of_war_changeable` `null` → `true`
- Glintstone Staff — `ash_of_war_changeable` `null` → `true`
- Academy Glintstone Staff — `ash_of_war_changeable` `null` → `true`
- Digger's Staff — `ash_of_war_changeable` `null` → `true`
- Demi-Human Queen's Staff — `ash_of_war_changeable` `null` → `true`
- Lusat's Glintstone Staff — `ash_of_war_changeable` `null` → `false`
- Carian Glintstone Staff — `ash_of_war_changeable` `null` → `true`
- Carian Glintblade Staff — `ash_of_war_changeable` `null` → `true`
- Carian Regal Scepter — `ash_of_war_changeable` `null` → `false`
- Albinauric Staff — `ash_of_war_changeable` `null` → `true`
- Staff of Loss — `ash_of_war_changeable` `null` → `true`
- Gelmir Glintstone Staff — `ash_of_war_changeable` `null` → `true`
- Rotten Crystal Staff — `ash_of_war_changeable` `null` → `false`
- Staff of the Guilty — `ash_of_war_changeable` `null` → `true`
- Prince of Death's Staff — `ash_of_war_changeable` `null` → `true`
- Maternal Staff — `ash_of_war_changeable` `null` → `true`
- Staff of the Great Beyond — `ash_of_war_changeable` `null` → `false`

#### `shields_torches.json` (80 armes)

- Torch — `ash_of_war_changeable` `null` → `true`
- Beast-Repellent Torch — `ash_of_war_changeable` `null` → `true`
- Steel-Wire Torch — `ash_of_war_changeable` `null` → `false`
- Sentry's Torch — `ash_of_war_changeable` `null` → `false`
- Ghostflame Torch — `ash_of_war_changeable` `null` → `true`
- St. Trina's Torch — `ash_of_war_changeable` `null` → `false`
- Nanaya's Torch — `ash_of_war_changeable` `null` → `false`
- Lamenting Visage — `ash_of_war_changeable` `null` → `false`
- Rickety Shield — `ash_of_war_changeable` `null` → `true`
- Riveted Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Blue-White Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Scripture Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Red Thorn Roundshield — `ash_of_war_changeable` `null` → `true`
- Pillory Shield — `ash_of_war_changeable` `null` → `true`
- Buckler — `ash_of_war_changeable` `null` → `true`
- Iron Roundshield — `ash_of_war_changeable` `null` → `true`
- Gilded Iron Shield — `ash_of_war_changeable` `null` → `true`
- Man-Serpent's Shield — `ash_of_war_changeable` `null` → `true`
- Ice Crest Shield — `ash_of_war_changeable` `null` → `true`
- Rift Shield — `ash_of_war_changeable` `null` → `true`
- Perfumer's Shield — `ash_of_war_changeable` `null` → `true`
- Shield of the Guilty — `ash_of_war_changeable` `null` → `true`
- Spiralhorn Shield — `ash_of_war_changeable` `null` → `true`
- Smoldering Shield — `ash_of_war_changeable` `null` → `false`
- Coil Shield — `ash_of_war_changeable` `null` → `false`
- Shield of Night — `ash_of_war_changeable` `null` → `false`
- Hawk Crest Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Horse Crest Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Candletree Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Flame Crest Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Marred Wooden Shield — `ash_of_war_changeable` `null` → `true`
- Sun Realm Shield — `ash_of_war_changeable` `null` → `true`
- Round Shield — `ash_of_war_changeable` `null` → `true`
- Large Leather Shield — `ash_of_war_changeable` `null` → `true`
- Black Leather Shield — `ash_of_war_changeable` `null` → `true`
- Marred Leather Shield — `ash_of_war_changeable` `null` → `true`
- Heater Shield — `ash_of_war_changeable` `null` → `true`
- Blue Crest Heater Shield — `ash_of_war_changeable` `null` → `true`
- Red Crest Heater Shield — `ash_of_war_changeable` `null` → `true`
- Beast Crest Heater Shield — `ash_of_war_changeable` `null` → `true`
- Inverted Hawk Heater Shield — `ash_of_war_changeable` `null` → `true`
- Eclipse Crest Heater Shield — `ash_of_war_changeable` `null` → `true`
- Kite Shield — `ash_of_war_changeable` `null` → `true`
- Blue-Gold Kite Shield — `ash_of_war_changeable` `null` → `true`
- Scorpion Kite Shield — `ash_of_war_changeable` `null` → `true`
- Twinbird Kite Shield — `ash_of_war_changeable` `null` → `true`
- Brass Shield — `ash_of_war_changeable` `null` → `true`
- Messmer Soldier Shield — `ash_of_war_changeable` `null` → `true`
- Banished Knight's Shield — `ash_of_war_changeable` `null` → `true`
- Wolf Crest Shield — `ash_of_war_changeable` `null` → `true`
- Serpent Crest Shield — `ash_of_war_changeable` `null` → `true`
- Albinauric Shield — `ash_of_war_changeable` `null` → `true`
- Beastman's Jar-Shield — `ash_of_war_changeable` `null` → `true`
- Carian Knight's Shield — `ash_of_war_changeable` `null` → `true`
- Silver Mirrorshield — `ash_of_war_changeable` `null` → `false`
- Great Turtle Shell — `ash_of_war_changeable` `null` → `true`
- Wooden Greatshield — `ash_of_war_changeable` `null` → `true`
- Lordsworn's Shield — `ash_of_war_changeable` `null` → `true`
- Briar Greatshield — `ash_of_war_changeable` `null` → `true`
- Spiked Palisade Shield — `ash_of_war_changeable` `null` → `true`
- Golden Beast Crest Shield — `ash_of_war_changeable` `null` → `true`
- Manor Towershield — `ash_of_war_changeable` `null` → `true`
- Crossed-Tree Towershield — `ash_of_war_changeable` `null` → `true`
- Inverted Hawk Towershield — `ash_of_war_changeable` `null` → `true`
- Dragon Towershield — `ash_of_war_changeable` `null` → `true`
- Distinguished Greatshield — `ash_of_war_changeable` `null` → `true`
- Gilded Greatshield — `ash_of_war_changeable` `null` → `true`
- Cuckoo Greatshield — `ash_of_war_changeable` `null` → `true`
- Redmane Greatshield — `ash_of_war_changeable` `null` → `true`
- Golden Greatshield — `ash_of_war_changeable` `null` → `true`
- Haligtree Crest Greatshield — `ash_of_war_changeable` `null` → `true`
- Black Steel Greatshield — `ash_of_war_changeable` `null` → `true`
- Crucible Hornshield — `ash_of_war_changeable` `null` → `false`
- Dragonclaw Shield — `ash_of_war_changeable` `null` → `false`
- Eclipse Crest Greatshield — `ash_of_war_changeable` `null` → `true`
- Erdtree Greatshield — `ash_of_war_changeable` `null` → `false`
- Jellyfish Shield — `ash_of_war_changeable` `null` → `false`
- Visage Shield — `ash_of_war_changeable` `null` → `false`
- Dueling Shield — `ash_of_war_changeable` `null` → `true`
- Carian Thrusting Shield — `ash_of_war_changeable` `null` → `true`

### C · Hoslow’s Petal Whip (P-A1) et Golden Lion Shield (P-A2)

Décision D29. Pages : https://eldenring.wiki.gg/wiki/Hoslow%27s_Petal_Whip et https://eldenring.wiki.gg/wiki/Golden_Lion_Shield (+ listes A et B).

| Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur |
|---|---|---|---|---|
| `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.material` | `"Somber Smithing Stones"` | `"Smithing Stones"` |
| `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.max_level` | `10` | `25` |
| `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.material_info_source` | `"wiki (text)"` | `"wiki (Armaments by Bolstering Material)"` |
| `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.ash_of_war_changeable` | `false` | `true` |
| `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.affinity_changeable` | `false` | `true` |
| `melee_armaments.json` | Hoslow's Petal Whip | `upgrade.changeability_info_source` | `"wiki rule (Ashes of War cannot be applied to weapons upgraded with Somber Smithing Stones)"` | `"wiki (Ash of War-Compatible Armaments) + wiki (text)"` |
| `shields_torches.json` | Golden Lion Shield | `upgrade.material` | `"Smithing Stones"` | `"Somber Smithing Stones"` |
| `shields_torches.json` | Golden Lion Shield | `upgrade.max_level` | `25` | `10` |
| `shields_torches.json` | Golden Lion Shield | `upgrade.material_info_source` | `"deduced (wiki shows the weapon accepts Ashes of War/affinities; somber weapons cannot)"` | `"wiki (Armaments by Bolstering Material)"` |
| `shields_torches.json` | Golden Lion Shield | `upgrade.ash_of_war_changeable` | `true` | `false` |
| `shields_torches.json` | Golden Lion Shield | `upgrade.affinity_changeable` | `true` | `false` |
| `shields_torches.json` | Golden Lion Shield | `upgrade.changeability_info_source` | `"wiki (text)"` | `"wiki (Ash of War-Compatible Armaments) + wiki rule (Ashes of War cannot be applied to weapons upgraded with Somber Smithing Stones)"` |

### D · Métadonnées des fichiers d’armes

Décision D29. Page : https://eldenring.wiki.gg/wiki/Armaments_by_Bolstering_Material. Comptes recalculés après application.

| Fichier | Champ | Ancienne valeur | Nouvelle valeur |
|---|---|---|---|
| `melee_armaments.json` | `metadata.field_notes["upgrade.*_info_source"]` | texte précédent | même texte, plus : « 'wiki (Armaments by Bolstering Material)' / 'wiki (Ash of War-Compatible Armaments)' = row of the wiki list pages of the same names (one row per armament). » |
| `ranged_weapons_catalysts.json` | `metadata.field_notes["upgrade.*_info_source"]` | texte précédent | même texte, plus : « 'wiki (Armaments by Bolstering Material)' / 'wiki (Ash of War-Compatible Armaments)' = row of the wiki list pages of the same names (one row per armament). » |
| `shields_torches.json` | `metadata.field_notes["upgrade.*_info_source"]` | texte précédent | même texte, plus : « 'wiki (Armaments by Bolstering Material)' / 'wiki (Ash of War-Compatible Armaments)' = row of the wiki list pages of the same names (one row per armament). » |
| `melee_armaments.json` | `metadata.upgrade_path_documentation` | `{"documented_by_wiki": 150, "undocumented": 185, "undocumented_with_estimate": 185}` | `{"documented_by_wiki": 331, "undocumented": 4, "undocumented_with_estimate": 4}` |
| `ranged_weapons_catalysts.json` | `metadata.upgrade_path_documentation` | `{"documented_by_wiki": 21, "undocumented": 42, "undocumented_with_estimate": 2}` | `{"documented_by_wiki": 63, "undocumented": 0, "undocumented_with_estimate": 0}` |
| `shields_torches.json` | `metadata.upgrade_path_documentation` | `{"documented_by_wiki": 7, "undocumented": 82, "undocumented_with_estimate": 8}` | `{"documented_by_wiki": 87, "undocumented": 2, "undocumented_with_estimate": 0}` |

### E · `affinity_changeable` des armes Somber (D34)

Décision D34. Le wiki précise que les Cendres de guerre ne se posent pas sur une arme améliorée avec des Somber Smithing Stones, et l’affinité vient d’une Cendre : les armes Somber documentées ont toutes `affinity_changeable: false` (99 après D29, avant ce correctif). Pages : https://eldenring.wiki.gg/wiki/Ashes_of_War et la page de chaque arme. Pour les 95 armes Somber qui avaient `affinity_changeable` à `null` :
- `upgrade.affinity_changeable` : `null` → `false` ;
- `upgrade.changeability_info_source` : ancienne valeur (après B, ou `null`) + ` + ` + `deduced (affinity_changeable: wiki rule, a weapon upgraded with Somber Smithing Stones takes no Ash of War, hence no affinity)`. Convention : `metadata.field_notes["upgrade.*_info_source"]` (« deduced (...) = conséquence logique stricte de ce que dit la page »). Le champ n’a qu’une valeur pour les deux champs de Cendre et d’affinité ; la mention nomme `affinity_changeable`.

#### `melee_armaments.json` (79 armes)

Leda's Sword, Rellana's Twin Blades, Gargoyle's Blackblade, Sword of Milos, Marais Executioner's Sword, Greatsword of Solitude, Helphen's Steeple, Blasphemous Blade, Sacred Relic Sword, Moonrithyll's Knight Sword, Greatsword of Radahn (Lord), Greatsword of Radahn (Light), Godslayer's Greatsword, Carian Sorcery Sword, Bloody Helice, Magma Blade, Spirit Sword, Dancing Blade of Ranah, Horned Warrior's Sword, Eclipse Shotel, Zamor Curved Sword, Horned Warrior's Greatsword, Curseblade's Cirque, Moonveil, Dragonscale Blade, Star-Lined Sword, Dragon Hunter's Great Katana, Gargoyle's Black Blades, Stormhawk Axe, Rosus' Axe, Death Knight's Twin Axes, Bonny Butchering Knife, Gargoyle's Black Axe, Death Knight's Longhaft Axe, Winged Greathorn, Axe of Godrick, Envoy's Horn, Nox Flowing Hammer, Ringed Finger, Scepter of the All-Knowing, Flowerstone Gavel, Marika's Hammer, Envoy's Long Horn, Cranial Vessel Candlestand, Devourer's Scepter, Dragon Greatclaw, Watchdog's Staff, Envoy's Greathorn, Anvil Hammer, Devonia's Hammer, Axe of Godfrey, Shadow Sunflower Blossom, Gazing Finger, Inquisitor's Girandole, Crystal Spear, Rotten Crystal Spear, Cleanrot Spear, Bolt of Gransax, Serpent-Hunter, Siluria's Tree, Vyke's War Spear, Spear of the Impaler, Gargoyle's Black Halberd, Ripple Crescent Halberd, Golden Halberd, Dragon Halberd, Commander's Standard, Spirit Glaive, Halo Scythe, Winged Scythe, Obsidian Lamina, Magma Whip Candlestick, Clinging Bone, Veteran's Prosthesis, Cipher Pata, Poisoned Hand, Thiollier's Hidden Needle, Grafted Dragon, Red Bear's Claw

#### `ranged_weapons_catalysts.json` (4 armes)

Lusat's Glintstone Staff, Carian Regal Scepter, Rotten Crystal Staff, Staff of the Great Beyond

#### `shields_torches.json` (12 armes)

Sentry's Torch, St. Trina's Torch, Nanaya's Torch, Lamenting Visage, Coil Shield, Shield of Night, Silver Mirrorshield, Crucible Hornshield, Dragonclaw Shield, Erdtree Greatshield, Jellyfish Shield, Visage Shield

### F · Clés `negation_*` lues comme absorption et résistances (`bosses.json`)

Décision D29. Onyx Lord (1re rencontre) : https://eldenring.wiki.gg/wiki/Onyx_Lord ; Miranda Blossom (1re rencontre) : https://eldenring.wiki.gg/wiki/Miranda_Blossom.

- Onyx Lord · `encounters[0].damage_negation_percent` (add) : `null` → `{"standard": 10, "strike": 10, "slash": 10, "pierce": 10, "magic": 20, "fire": 20, "lightning": 20, "holy": 20}`
- Onyx Lord · `encounters[0].other_infobox_fields` (remove) : `{"negation_standard": 10, "negation_strike": 10, "negation_slash": 10, "negation_pierce": 10, "negation_magic": 20, "negation_fire": 20, "negation_li…` → `null`
- Miranda Blossom · `encounters[0].damage_negation_percent` (add) : `null` → `{"standard": 0, "strike": 35, "slash": -40, "pierce": 0, "magic": 0, "fire": -40, "lightning": -40, "holy": 40}`
- Miranda Blossom · `encounters[0].status_resistance` (add) : `null` → `{"poison": "1093 ~ 1235", "scarlet_rot": "508 ~ 574", "blood_loss": "508 ~ 574", "frostbite": "127 ~ 143", "sleep": "226 ~ 255"}`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_standard` (remove) : `0` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_strike` (remove) : `35` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_slash` (remove) : `-40` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_pierce` (remove) : `0` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_magic` (remove) : `0` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_fire` (remove) : `-40` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_lightning` (remove) : `-40` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_holy` (remove) : `40` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_poison` (remove) : `"1093 ~ 1235"` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_scarlet_rot` (remove) : `"508 ~ 574"` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_blood_loss` (remove) : `"508 ~ 574"` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_frostbite` (remove) : `"127 ~ 143"` → `null`
- Miranda Blossom · `encounters[0].other_infobox_fields.negation_sleep` (remove) : `"226 ~ 255"` → `null`

### G · Count Ymir (`bosses.json`)

- Count Ymir · `encounters` (ajout en fin de liste) : `{"name": "Count Ymir, High Priest", "location": "Cathedral of Manus Metyr", "regions": ["Scadu Altus"], "source": "Shadow of the Erdtree", "hp": "11,…` — https://eldenring.wiki.gg/wiki/Count_Ymir

### H · Trois liens de page de boss corrigés (`bosses.json`)

Décision D29. Identifiants issus de `slug(wiki_page)` : `perfumer-tricia` → `perfumer`, `madding-hand` → `madding-hand-npc`, `swordhand-of-night-jolan` → `jolan-swordhand-of-night` (changement sans migration, D34 : rien n’est publié). Perfumer Tricia : seule l’infobox de Tricia est retenue (D34).

- Perfumer Tricia · `summary` (set) : `"Perfumer Tricia is a spirit ash in Elden Ring."` → `"Perfumer is an enemy in Elden Ring."` — https://eldenring.wiki.gg/wiki/Perfumer
- Perfumer Tricia · `fight_notes` (set) : `["[Notes]", "Upgraded with Ghost Glovewort.", "Summons a Perfumer to provide support.", "Deals Fire damage.", "Uses the long-lasting Perfumer-variant…` → `["[Bosses]", "[Background]", "A perfumer who dedicated her efforts to treating Misbegotten, Omen, and all those seen as impure. She remained with the…` — https://eldenring.wiki.gg/wiki/Perfumer
- Perfumer Tricia · `encounters` (add) : `null` → `{"name": "Perfumer Tricia", "variant": "Perfumer Tricia", "location": "Unsightly Catacombs", "regions": ["Altus Plateau"], "source": "Base game", "hp…` — https://eldenring.wiki.gg/wiki/Perfumer
- Perfumer Tricia · `encounter_data_note` (remove) : `"No HP/runes/drops infobox on the wiki page."` → `null` — https://eldenring.wiki.gg/wiki/Perfumer
- Perfumer Tricia · `url` (set) : `"https://eldenring.wiki.gg/wiki/Perfumer_Tricia"` → `"https://eldenring.wiki.gg/wiki/Perfumer"` — https://eldenring.wiki.gg/wiki/Perfumer
- Perfumer Tricia · `wiki_page` (set) : `"Perfumer Tricia"` → `"Perfumer"` — https://eldenring.wiki.gg/wiki/Perfumer
- Madding Hand · `summary` (set) : `"Madding Hand is a melee armament in Shadow of the Erdtree."` → `"Madding Hand is a hostile character in Shadow of the Erdtree. He is an unmarked optional boss encountered in the Abyssal Woods."` — https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)
- Madding Hand · `fight_notes` (set) : `["[Notes]", "The Madding Hand's Unique Skill, Madding Spear-Hand Strike, deals 250 Madness build-up on hit, which can usually instantly inflict Madne…` → `["[Notes]", "Madding Hand's attacks cause buildup of Madness."]` — https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)
- Madding Hand · `encounters` (add) : `null` → `{"name": "Madding Hand", "location": "Abyssal Woods", "regions": ["Scadu Altus", "Abyssal Woods"], "source": "Shadow of the Erdtree", "hp": null, "hp…` — https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)
- Madding Hand · `encounter_data_note` (remove) : `"No HP/runes/drops infobox on the wiki page."` → `null` — https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)
- Madding Hand · `url` (set) : `"https://eldenring.wiki.gg/wiki/Madding_Hand"` → `"https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)"` — https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)
- Madding Hand · `wiki_page` (set) : `"Madding Hand"` → `"Madding Hand (NPC)"` — https://eldenring.wiki.gg/wiki/Madding_Hand_(NPC)
- Swordhand of Night Jolán · `name` (set) : `"Swordhand of Night Jolán"` → `"Jolán, Swordhand of Night"` — https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night
- Swordhand of Night Jolán · `summary` (set) : `"Swordhand of Night Jolán is a spirit ash in Elden Ring: Shadow of the Erdtree."` → `"Jolán, Swordhand of Night is a character in Shadow of the Erdtree."` — https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night
- Swordhand of Night Jolán · `fight_notes` (add) : `null` → `["[Notes]", "As shown by Zullie the Witch's video about the face data for DLC NPCs, her face is extremely similar to her sister Anna's face. The only…` — https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night
- Swordhand of Night Jolán · `character_location` (add) : `null` → `"Cathedral of Manus Metyr"` — https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night
- Swordhand of Night Jolán · `url` (set) : `"https://eldenring.wiki.gg/wiki/Swordhand_of_Night_Jolán"` → `"https://eldenring.wiki.gg/wiki/Jolán,_Swordhand_of_Night"` — https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night
- Swordhand of Night Jolán · `wiki_page` (set) : `"Swordhand of Night Jolán"` → `"Jolán, Swordhand of Night"` — https://eldenring.wiki.gg/wiki/Jol%C3%A1n,_Swordhand_of_Night

### I · Cinq pages d’envahisseurs ajoutées (`bosses.json`)

Décision D29 pour les pages, D34 pour le rang. Les pages sont replacées par le tri de `build_bosses.py` (`(source != "Base game", name)`). Chaque page reçoit `tier` = `["Invaders and other minibosses"]` (ancienne valeur : `[]`) : le rang est déduit de la page, ces pages étant absentes des deux navbox ; la phrase est ajoutée à `metadata.field_notes.tier`.

- Anastasia, Tarnished-Eater — 1 rencontre(s), source `Base game`, `tier` `[]` → `["Invaders and other minibosses"]` — https://eldenring.wiki.gg/wiki/Anastasia,_Tarnished-Eater
- Mad Tongue Alberich — 1 rencontre(s), source `Base game`, `tier` `[]` → `["Invaders and other minibosses"]` — https://eldenring.wiki.gg/wiki/Mad_Tongue_Alberich
- Moongrum, Carian Knight — 1 rencontre(s), source `Base game`, `tier` `[]` → `["Invaders and other minibosses"]` — https://eldenring.wiki.gg/wiki/Moongrum,_Carian_Knight
- Maleigh Marais, Shaded Castle Castellan — 1 rencontre(s), source `Base game`, `tier` `[]` → `["Invaders and other minibosses"]` — https://eldenring.wiki.gg/wiki/Maleigh_Marais,_Shaded_Castle_Castellan
- Millicent's Sisters — 5 rencontre(s), source `Base game`, `tier` `[]` → `["Invaders and other minibosses"]` — https://eldenring.wiki.gg/wiki/Millicent's_Sisters

### J · Métadonnées de `bosses.json`

| Champ | Ancienne valeur | Nouvelle valeur | Décision |
|---|---|---|---|
| `metadata.boss_pages` | `133` | `138` | D29 |
| `metadata.encounters` | `302` | `314` | D29 |
| `metadata.counts_by_source` | `{"Base game": 78, "Base game + Shadow of the Erdtree": 14, "Shadow of the Erdtree": 41}` | `{"Base game": 83, "Base game + Shadow of the Erdtree": 14, "Shadow of the Erdtree": 41}` | D29 |
| `metadata.encounters_by_source` | `{"Base game": 251, "Shadow of the Erdtree": 46, "Base game + Shadow of the Erdtree": 5}` | `{"Base game": 261, "Shadow of the Erdtree": 48, "Base game + Shadow of the Erdtree": 5}` | D29 |
| `metadata.counts_by_tier` | `{"Enemies": 67, "Great Enemies": 22, "Legends": 18, "Gods": 3, "Demigods": 8, "Invaders and other minibosses": 14}` | `{"Enemies": 67, "Great Enemies": 22, "Legends": 18, "Gods": 3, "Demigods": 8, "Invaders and other minibosses": 19}` | D34 |
| `metadata.field_notes.tier` | `"Group of the wiki boss navbox (matches the in-game victory banner: God / Demigod / Legend / Great Enemy / Enemy; plus invaders & minibosses)."` | `"Group of the wiki boss navbox (matches the in-game victory banner: God / Demigod / Legend / Great Enemy / Enemy; plus invaders & minibosses). The 5 …` | D34 |

### K · Carian Sorcery Sword : `material_inconsistencies_flagged` (D29, D34)

Le matériau de la liste (Somber Smithing Stones, max +10, Cendres `false`) est gardé (catégories A et B). La page de l’arme dit aussi « At +25 it has 163 Sorcery Scaling » et une note de patch cite une valeur à +25, ce qui suppose des pierres normales. Page : https://eldenring.wiki.gg/wiki/Carian_Sorcery_Sword. Au lieu de `wiki_inconsistencies_flagged` (réservée aux tableaux qui contredisent l’infobox), une clé structurée `{name, reason, url}`, reprise dans `derived.inconsistent` (`upgrade.material`) :

| Fichier | Champ | Ancienne valeur | Nouvelle valeur |
|---|---|---|---|
| `melee_armaments.json` | `metadata.material_inconsistencies_flagged` | absent | `[{"name": "Carian Sorcery Sword", "reason": "upgrade.material comes from the list page 'Armaments by Bolstering Material' (Somberstone, max +10), but…` |
| `melee_armaments.json` | `metadata.field_notes.material_inconsistencies_flagged` | absent | `"Weapons whose upgrade.material, read from a wiki list page ('Armaments by Bolstering Material'), is contradicted by another statement on the weapon'…` |
| `ranged_weapons_catalysts.json` | `metadata.material_inconsistencies_flagged` | absent | `[]` |
| `ranged_weapons_catalysts.json` | `metadata.field_notes.material_inconsistencies_flagged` | absent | `"Weapons whose upgrade.material, read from a wiki list page ('Armaments by Bolstering Material'), is contradicted by another statement on the weapon'…` |
| `shields_torches.json` | `metadata.material_inconsistencies_flagged` | absent | `[]` |
| `shields_torches.json` | `metadata.field_notes.material_inconsistencies_flagged` | absent | `"Weapons whose upgrade.material, read from a wiki list page ('Armaments by Bolstering Material'), is contradicted by another statement on the weapon'…` |

Valeur complète pour `melee_armaments.json` (les deux autres fichiers reçoivent `[]` et la même note) :

```json
[
  {
    "name": "Carian Sorcery Sword",
    "reason": "upgrade.material comes from the list page 'Armaments by Bolstering Material' (Somberstone, max +10), but the weapon page also says 'At +25 it has 163 Sorcery Scaling' and a patch note quotes a +25 value, which implies regular Smithing Stones; the list value is kept.",
    "url": "https://eldenring.wiki.gg/wiki/Carian_Sorcery_Sword"
  }
]
```

Note `field_notes["material_inconsistencies_flagged"]` : « Weapons whose upgrade.material, read from a wiki list page ('Armaments by Bolstering Material'), is contradicted by another statement on the weapon's own page. Each item: name, reason, url. The list value is kept in upgrade.material and the weapon is reported in derived.inconsistent as 'upgrade.material'. Distinct from wiki_inconsistencies_flagged, which only names weapons whose upgrade table contradicts the infobox (see tables_consistent_with_infobox). Carian Sorcery Sword: material comes from the list page 'Armaments by Bolstering Material' (Somberstone, max +10), but the weapon page also says 'At +25 it has 163 Sorcery Scaling' and a patch note quotes a +25 value, which implies regular Smithing Stones; the list value is kept. »

### L · Restes d’images

Règle de D29 (21 galeries `ER Icon …png`) : le nom de fichier et l’attribut `link=` sont retirés, la légende est conservée, une par ligne ; les retours à la ligne internes d’une légende sont joints par une espace, la mention DLC passe entre parenthèses ; les lignes vides disparaissent. Étendue en D34 aux cellules `ER Site of Grace …png` et au `og pic` (nom de fichier sans légende : la clé est retirée, et l’objet `other_infobox_fields` qui n’avait que cette clé aussi, comme pour Onyx Lord). Après application, `data/` ne contient plus aucun nom de fichier image.

Les anciennes valeurs sont des listes de lignes `fichier.png|légende[|link=…]` : elles sont résumées par leur nombre de lignes ; le texte intégral est dans l’historique git.

#### Galeries `ER Icon` (D29) — 21

- `key_items.json` · Cracked Pot · `used_in_crafting.tables[0][0].Pots` : 11 lignes → 11 légendes ("Fire Pot"…) — https://eldenring.wiki.gg/wiki/Cracked_Pot
- `key_items.json` · Cracked Pot · `used_in_crafting.tables[1][0].Roped Pots` : 9 lignes → 9 légendes ("Roped Fire Pot"…) — https://eldenring.wiki.gg/wiki/Cracked_Pot
- `key_items.json` · Ritual Pot · `effect_tables[0][0].Pots` : 11 lignes → 11 légendes ("Redmane Fire Pot"…) — https://eldenring.wiki.gg/wiki/Ritual_Pot
- `key_items.json` · Perfume Bottle · `used_in_crafting.tables[0][0].Perfumes` : 6 lignes → 6 légendes ("Spark Aromatic"…) — https://eldenring.wiki.gg/wiki/Perfume_Bottle
- `mechanics.json` · Whetblades · `summary_tables[0][0].All Whetblades` : 6 lignes → 6 légendes ("Whetstone Knife"…) — https://eldenring.wiki.gg/wiki/Whetblades
- `mechanics.json` · Smithing Stones · `summary_tables[0][0][0]` : 9 lignes → 9 légendes ("Smithing Stone 1"…) — https://eldenring.wiki.gg/wiki/Smithing_Stones
- `mechanics.json` · Somber Smithing Stones · `summary_tables[0][0].Somber Smithing Stones` : 10 lignes → 10 légendes ("Somber Smithing Stone 1"…) — https://eldenring.wiki.gg/wiki/Somber_Smithing_Stones
- `mechanics.json` · Skill · `sections.List of Skills.tables[0][0][0]` : 16 lignes → 16 légendes ("Skill: Stamp (Upward Cut)"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[1][0][0]` : 18 lignes → 18 légendes ("Skill: Spinning Slash"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[2][0][0]` : 13 lignes → 13 légendes ("Skill: Square Off"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[3][0][0]` : 9 lignes → 9 légendes ("Skill: Glintstone Pebble"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[4][0][0]` : 11 lignes → 11 légendes ("Skill: Flaming Strike"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[5][0][0]` : 11 lignes → 11 légendes ("Skill: Sacred Blade"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[6][0][0]` : 12 lignes → 12 légendes ("Skill: Poisonous Mist"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[7][0][0]` : 5 lignes → 5 légendes ("Skill: Spectral Lance"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[8][0][0]` : 4 lignes → 4 légendes ("Skill: Palm Blast (Shadow of the Erdtree)"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[9][0][0]` : 7 lignes → 7 légendes ("Skill: Mighty Shot"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[10][0][0]` : 10 lignes → 10 légendes ("Skill: Parry"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[11][0][0]` : 4 lignes → 4 légendes ("Skill: Spinning Chain"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Skill · `sections.List of Skills.tables[12][0][0]` : 143 lignes → 143 légendes ("Unique Skill: Glintstone Dart"…) — https://eldenring.wiki.gg/wiki/Skill
- `mechanics.json` · Paired Weapons · `sections.Armaments without a two-handed stance.tables[0][0][0]` : 41 lignes → 41 légendes ("Smithscript Dagger (Shadow of the Erdtree)"…) — https://eldenring.wiki.gg/wiki/Paired_Weapons

#### Cellules `ER Site of Grace …png` et autres images (D34)

- `mechanics.json` · Sites of Grace · `sections.Locations.tables[0][0][0]` : 1 lignes → 1 légendes ("Table of Lost Grace"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[1][0][0]` : 21 lignes → 21 légendes ("The First Step"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[2][0][0]` : 2 lignes → 2 légendes ("Cave of Knowledge"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[3][0][0]` : 8 lignes → 8 légendes ("Stormhill Shack"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[4][0][0]` : 18 lignes → 18 légendes ("Church of Pilgrimage"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[5][0][0]` : 7 lignes → 7 légendes ("Stormveil Main Gate"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[6][0][0]` : 52 lignes → 52 légendes ("Lake-Facing Cliffs"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[7][0][0]` : 5 lignes → 5 légendes ("East Raya Lucaria Gate"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[8][0][0]` : 3 lignes → 3 légendes ("Ruin-Strewn Precipice"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[9][0][0]` : 3 lignes → 3 légendes ("Moonlight Altar"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[10][0][0]` : 4 lignes → 4 légendes ("Church of the Cuckoo"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[11][0][0]` : 19 lignes → 19 légendes ("Abandoned Coffin"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[12][0][0]` : 12 lignes → 12 légendes ("Bridge of Iniquity"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[13][0][0]` : 10 lignes → 10 légendes ("Outer Wall Phantom Tree"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[14][0][0]` : 8 lignes → 8 légendes ("Volcano Manor"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[15][0][0]` : 9 lignes → 9 légendes ("Erdtree Sanctuary"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[16][0][0]` : 5 lignes → 5 légendes ("Underground Roadside"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[17][0][0]` : 7 lignes → 7 légendes ("East Capital Rampart"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[18][0][0]` : 25 lignes → 25 légendes ("Smoldering Church"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[19][0][0]` : 4 lignes → 4 légendes ("Aeonia Swamp Shore"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[20][0][0]` : 12 lignes → 12 légendes ("Dragonbarrow West"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[21][0][0]` : 5 lignes → 5 légendes ("Forbidden Lands"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[22][0][0]` : 10 lignes → 10 légendes ("Zamor Ruins"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[23][0][0]` : 7 lignes → 7 légendes ("Giants' Gravepost"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[24][0][0]` : 7 lignes → 7 légendes ("Consecrated Snowfield"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[25][0][0]` : 4 lignes → 4 légendes ("Haligtree Canopy"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[26][0][0]` : 5 lignes → 5 légendes ("Prayer Room"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[27][0][0]` : 5 lignes → 5 légendes ("Ainsel River Well Depths"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[28][0][0]` : 3 lignes → 3 légendes ("Ainsel River Main"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[29][0][0]` : 2 lignes → 2 légendes ("Lake of Rot Shoreside"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[30][0][0]` : 5 lignes → 5 légendes ("Nokron, Eternal City"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[31][0][0]` : 4 lignes → 4 légendes ("Siofra River Well Depths"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[32][0][0]` : 4 lignes → 4 légendes ("Palace Approach Ledge-Road"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[33][0][0]` : 6 lignes → 6 légendes ("Root-Facing Cliffs"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations.tables[34][0][0]` : 11 lignes → 11 légendes ("Crumbling Beast Grave"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[0][0][0]` : 17 lignes → 17 légendes ("Gravesite Plain"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[1][0][0]` : 3 lignes → 3 légendes ("Castle Ensis Checkpoint"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[2][0][0]` : 5 lignes → 5 légendes ("Cerulean Coast"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[3][0][0]` : 2 lignes → 2 légendes ("Charo's Hidden Grave"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[4][0][0]` : 5 lignes → 5 légendes ("Stone Coffin Fissure"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[5][0][0]` : 2 lignes → 2 légendes ("Grand Altar of Dragon Communion"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[6][0][0]` : 3 lignes → 3 légendes ("Jagged Peak Mountainside"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[7][0][0]` : 4 lignes → 4 légendes ("Belurat, Tower Settlement"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[8][0][0]` : 6 lignes → 6 légendes ("Enir-Ilim: Outer Wall"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[9][0][0]` : 6 lignes → 6 légendes ("Viaduct Minor Tower"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[10][0][0]` : 5 lignes → 5 légendes ("Ancient Ruins Base"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[11][0][0]` : 18 lignes → 18 légendes ("Highroad Cross"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[12][0][0]` : 5 lignes → 5 légendes ("Forsaken Graveyard"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[13][0][0]` : 4 lignes → 4 légendes ("Manse Hall"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[14][0][0]` : 2 lignes → 2 légendes ("Shadow Keep Main Gate"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[15][0][0]` : 4 lignes → 4 légendes ("Church District Entrance"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[16][0][0]` : 8 lignes → 8 légendes ("Storehouse, First Floor"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `mechanics.json` · Sites of Grace · `sections.Locations (Shadow of the Erdtree).tables[17][0][0]` : 6 lignes → 6 légendes ("Scaduview"…) — https://eldenring.wiki.gg/wiki/Sites_of_Grace
- `locations.json` · Bellum Church · `sites_of_grace[1]` : `"ER Site of Grace Bellum Church.png"` → `"Bellum Church"` (nom recoupé avec la légende du tableau « Locations » de `mechanics.json`) — https://eldenring.wiki.gg/wiki/Bellum_Church
- `bosses.json` · Fia's Champions · rencontre 0 · `other_infobox_fields` : `{"og pic": "Eldenringfiachampions.jpg"}` → clé et objet retirés (aucune légende) — https://eldenring.wiki.gg/wiki/Fia%27s_Champions

### M · Fanged Imp Ashes (`spirit_ashes.json`)

Décision D29, option A confirmée par D34. Le tableau repliable « Minor puzzle spoiler » n’est pas une note de patch : il passe de `patch_notes` à `notes`, sous le sous-titre `[Minor puzzle spoiler]` (convention de `data/README.md`). Page : https://eldenring.wiki.gg/wiki/Fanged_Imp_Ashes.

- `patch_notes[1]` (remove) : `{"minor puzzle spoiler": "* Summoning this duo to fight the nearby Imps is one of the ways to solve the puzzle at Albinauric Rise."}` → `null`
- `notes` (set) : `["Upgraded with Grave Gloveworts.", "Summons two Imps, wielding serrated Forked Hatchets and throw Magic Pots as a ranged attack.", "Deal Standard da…` → `["Upgraded with Grave Gloveworts.", "Summons two Imps, wielding serrated Forked Hatchets and throw Magic Pots as a ranged attack.", "Deal Standard da…`

## 2026-11-05 (D39)

Décision D39 (correctifs de données issus de la vérification du socle) ; justifications : `docs/contenu/verification-socle.md`, section 11, « Données ». Chaque ancienne valeur a été vérifiée avant écriture (0 écart) ; fichiers réécrits par script au format d'origine (indentation 2, `ensure_ascii` désactivé, LF, sans retour à la ligne final). Aucun compte de `metadata` ne change. L7 : pas de correctif de données (surcharge S2 en configuration).

| # | Fichier | Entrée | Champ | Ancienne valeur | Nouvelle valeur | Page wiki | Décision | Date |
|---|---|---|---|---|---|---|---|---|
| L1 | `locations.json` | Crumbling Farum Azula | `region` | `"Accessed via Mountaintops of the Giants"` | `"Mountaintops of the Giants"` | https://eldenring.wiki.gg/wiki/Crumbling_Farum_Azula | D39 | 2026-11-05 |
| L2 | `shields_torches.json` | Perfumer's Shield | `acquisition[0].location` | `"Altus Plateau/Leyndell, Royal Capital/Scadu Altus/Shadow Keep"` | `"Altus Plateau / Leyndell, Royal Capital / Scadu Altus / Shadow Keep"` | https://eldenring.wiki.gg/wiki/Perfumer%27s_Shield | D39 | 2026-11-05 |
| L3 | `melee_armaments.json` | Prelate's Inferno Crozier | `acquisition[0].method` / `.location` | `null` / `null` | `"Guaranteed drop"` / `"Fort Laiedd"` | https://eldenring.wiki.gg/wiki/Prelate%27s_Inferno_Crozier | D39 | 2026-11-05 |
| L4 | `melee_armaments.json` | Erdsteel Dagger | `acquisition[0].location` | `null` | `"Fort Haight / Leyndell, Royal Capital"` | https://eldenring.wiki.gg/wiki/Erdsteel_Dagger | D39 | 2026-11-05 |
| L5 | `melee_armaments.json` | Stone-Sheathed Sword | `acquisition[0].location` | `null` | `"Fog Rift Catacombs / Ruins of Unte / Ancient Ruins of Rauh"` | https://eldenring.wiki.gg/wiki/Stone-Sheathed_Sword | D39 | 2026-11-05 |
| L6 | `melee_armaments.json` | Anvil Hammer | `acquisition[0].location` | `null` | `"Ruined Forge Lava Intake"` | https://eldenring.wiki.gg/wiki/Anvil_Hammer | D39 | 2026-11-05 |
| L8 | `key_items.json` | Somberstone Miner's Bell Bearing [5] | `acquisition[0].location` | `null` | `"Crumbling Farum Azula"` | https://eldenring.wiki.gg/wiki/Somberstone_Miner%27s_Bell_Bearing_5 | D39 | 2026-11-05 |
| L9 | `ranged_weapons_catalysts.json` | Carian Regal Scepter | `acquisition[0].method` / `acquisition_flags` | `"Purchase"` / `["remembrance_weapon", "purchasable"]` | `"Trade"` / `["remembrance_weapon"]` | https://eldenring.wiki.gg/wiki/Carian_Regal_Scepter | D39 | 2026-11-05 |

L8 est une **déduction**, non un fait écrit par le wiki : Dragon Temple Rooftop et Beside the Great Bridge sont des sites de grâce de Crumbling Farum Azula dans `locations.json`. L9 : l'intertitre « Purchase » de la page est erroné, le texte décrit un échange.
