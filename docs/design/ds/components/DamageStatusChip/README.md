# DamageStatusChip

Puce d'un type de dégâts ou d'un statut, avec sa valeur éventuelle (absorption, accumulation).

**Le consommateur fournit** la clé (`slash`, `bleed`…), le libellé français et la valeur.

- L'icône porte la couleur (`dmg-*`, `st-*` via la variable `--dt`) ; le libellé et la valeur restent en encres.
- Immunité : `.is-immune` barre l'icône et passe la bordure en pointillé. Ajoutez « Immunisé : » dans `title`.
- Faiblesse : valeur d'absorption en pourcentage signé (« −10 % ») ; un vrai zéro s'écrit « 0 % ».
- Statuts : Saignement, Givre, Poison, Putréfaction écarlate, Sommeil, Folie, Mort. Types : Standard, Frappe, Tranchant, Estoc, Magie, Feu, Foudre, Sacré.
