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
