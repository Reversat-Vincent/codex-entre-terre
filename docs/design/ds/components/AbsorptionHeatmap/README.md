# AbsorptionHeatmap

Matrice des faiblesses : absorption de chaque type de dégâts par boss (%), avec les immunités aux statuts. C'est un vrai `table` : il sert aussi de vue tableau.

**Le consommateur fournit** `damage_negation_percent` de chaque rencontre et `status_resistance` (immunités), dans l'ordre de l'histoire.

- Échelle divergente : `h-w2` (≤ −10), `h-w1` (−9 à 5), `h-n` (6 à 15), `h-r1` (16 à 30), `h-r2` (31 à 50), `h-r3` (> 50). La valeur est écrite dans chaque case.
- `null` : case hachurée `h-null` avec « — » et l'info-bulle « Non documenté par le wiki ». Une ligne entièrement hachurée reste dans la matrice.
- En-têtes de colonne : icône du type (teinte `dmg-*`) et abréviation ; libellé complet en info-bulle.
- Boss vaincus atténués (`tr.is-done`) ou masqués selon l'option du widget.
- Info-bulle de case : « Margit — Tranchant : −10 % (faiblesse) ».
