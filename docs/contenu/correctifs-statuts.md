# Correctifs `status_buildup` manquants (D44)

Recherche du 05/11/2026. Fichier d'opérations : `docs/contenu/correctifs-statuts.json` (même format que `correctifs-complements.json`, `decision: "D44"`). `data/` n'a pas été modifié.

**Méthode.** Script sur `melee_armaments.json`, `ranged_weapons_catalysts.json` et `shields_torches.json` : toute arme dont `passive_effects` cite un statut (sang, givre, poison, putréfaction, sommeil, folie, mort) absent de `status_buildup`. Pages des armes via `tools/wiki/fetch_pages.py`, pages de statut (Blood Loss, Frostbite, Scarlet Rot, Poison, Sleep, Madness, Death Blight) via l'API. Téléchargements dans `.cache/wiki/statuts/`. Aucun autre site.

## Constats

- **[Data]** 9 armes concernées, pas 12 : celles que le développeur a nommées (Spiked Club, Cross-Naginata, Halo Scythe, Hookclaws, Bloodhound Claws, Death's Poker, Chilling Perfume Bottle, Rotten Crystal Staff, Ghostflame Torch). Les trois autres du relevé du développeur ne ressortent ni du texte de `passive_effects`, ni des tableaux « Weapons » des pages de statut comparés à `data/`. Il faudrait ses noms pour les examiner.
- **[Data]** Sur ces 9 armes, la clé `status_buildup` est absente de l'entrée (pas à `null`). Les opérations sont donc des `add` avec `old: null`.
- **[Data]** Format : `status_buildup` est un objet `{clé: entier}` ; clés présentes dans `data/` : `blood_loss`, `frostbite`, `poison`, `scarlet_rot`, `sleep`, `madness`. Pas de clé `death_blight`.
- **[Data]** Aucune arme n'a de statut de mort dans `passive_effects`. Eclipse Shotel et Greatsword of Damnation évoquent la mort ou un statut dans leur compétence seulement, hors périmètre.
- **[Wiki]** Les tableaux « Weapons » des pages de statut concordent avec `status_buildup` pour toutes les armes déjà renseignées, sauf deux écarts (ci-dessous).

## Armes traitées (9)

| Fichier | Arme | Clé | Valeur | Source |
|---|---|---|---|---|
| melee | Spiked Club | `blood_loss` | 50 | page de l'arme sans chiffre ; [Blood Loss](https://eldenring.wiki.gg/wiki/Blood_Loss), tableau Weapons |
| melee | Cross-Naginata | `blood_loss` | 50 | idem |
| melee | Halo Scythe | `blood_loss` | 55 | idem |
| melee | Bloodhound Claws | `blood_loss` | 60 | idem |
| melee | Hookclaws | `blood_loss` | 60 | tableau d'amélioration de [la page](https://eldenring.wiki.gg/wiki/Hookclaws) (60 en Standard et Standard +1) ; Blood Loss confirme |
| melee | Death's Poker | `frostbite` | 65 | infobox « Causes frost buildup (65) » ; [Frostbite](https://eldenring.wiki.gg/wiki/Frostbite) confirme |
| melee | Chilling Perfume Bottle (Shadow of the Erdtree) | `frostbite` | 60 | infobox « (60) » ; Frostbite confirme ; la page précise que la valeur est fixe |
| ranged | Rotten Crystal Staff | `scarlet_rot` | 50 | page de l'arme sans chiffre (« slight ») ; [Scarlet Rot](https://eldenring.wiki.gg/wiki/Scarlet_Rot), tableau Weapons |
| shields_torches | Ghostflame Torch | `frostbite` | 65 | infobox « (65) » ; Frostbite confirme |

Niveau de preuve : les chiffres de Spiked Club, Cross-Naginata, Halo Scythe, Bloodhound Claws et Rotten Crystal Staff ne figurent que sur les pages de statut, pas sur la page de l'arme. Ces tableaux sont fiables pour le reste des armes (concordance avec `data/`), mais restent une source secondaire. Les 4 autres armes ont le chiffre sur leur propre page. Les valeurs sont celles du wiki sans mention de niveau (+0) ; les pages de statut ne l'indiquent pas.

Rotten Crystal Staff : `Causes slight scarlet rot buildup` correspond à 50, comme Rotten Crystal Sword (`Causes slight scarlet rot buildup (50)` dans `data/`).

## Non traitables

Aucune : les 9 ont un chiffre sur le wiki.

## Propositions

- **Appliquer les 9 `add`.** Le texte de `passive_effects` reste sans chiffre pour 6 armes (« Causes blood loss buildup »). Option A : ne rien changer, car `status_buildup` suffit. Option B : ajouter la valeur au texte. Recommandation : A, le texte reproduit le wiki.
- **Écarts hors périmètre, sans changement proposé.**
  - Reduvia : le tableau Blood Loss donne +30, `data/` donne 50 ; la page de l'arme (`effects`) dit 50, donc `data/` est cohérent avec sa page.
  - Nanaya's Torch (Shadow of the Erdtree) : le tableau Madness donne +55, `data/` donne 65 ; page de l'arme non relue, à contrôler avant toute correction.

## Non vérifiable

- Le niveau d'amélioration auquel les tableaux de statut donnent leurs valeurs (le wiki ne le précise pas).
- Les 3 armes du relevé du développeur qui n'apparaissent pas dans ce recensement.
