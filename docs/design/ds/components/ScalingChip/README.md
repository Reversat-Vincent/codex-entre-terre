# ScalingChip

Lettre de scaling d'un attribut (S la plus forte, E la plus faible).

**Le consommateur fournit** `scaling{str, dex, int, fai, arc}`. Ordre fixe : STR, DEX, INT, FAI, ARC.

- Un attribut absent du scaling n'a pas de puce. Un attribut à `null` montre une case hachurée « ? » avec l'info-bulle « Non documenté ».
- Couleurs `grade-*` + `on-grade-*` ; la lettre reste lisible seule (contraste ≥ 4,5:1).
- Les lettres décrivent l'arme à +0. Si l'application affiche un scaling à un autre niveau d'amélioration, ajoutez le badge Calculé.
