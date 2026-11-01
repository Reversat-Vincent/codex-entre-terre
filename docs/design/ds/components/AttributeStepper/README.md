# AttributeStepper

Saisie rapide d'un attribut au clavier ou à la souris (−/+), dans une grille de deux colonnes.

**Le consommateur fournit** l'attribut (abréviation, nom complet), la valeur, le minimum (valeur de l'origine choisie) et le maximum (99).

- Le bouton − est désactivé au minimum de l'origine : un personnage ne descend pas sous ses attributs de départ.
- Le niveau se calcule (somme des attributs − 79) et s'affiche sous la grille avec le badge Calculé.
- Mode build cible : `.is-target` passe la valeur en `gold-text`. Un écart à combler s'affiche en `.is-gap` (`warn`).
- Raccourcis : flèches ↑ ↓ sur la valeur, Maj pour ±5.
