# RequirementChip

Prérequis d'attribut d'une arme ou d'un sort, comparé aux attributs du profil actif.

**Le consommateur fournit** `requirements`, les attributs du profil et le mode une main / deux mains.

- Atteint : `.cx-req.is-ok`, icône coche, « STR 11 ».
- Manquant : `.cx-req.is-miss`, icône triangle, valeur demandée puis l'écart « +14 INT » dans `.cx-req-gap`.
- À deux mains, la Force effective vaut `floor(STR × 1,5)` : la puce porte `.cx-req-2h` (« 2M ») quand c'est ce qui la rend atteinte, et l'écart s'exprime en Force réelle.
- Info-bulle : valeur actuelle, valeur demandée, règle des deux mains le cas échéant.
- Sans profil configuré : puces neutres (`.cx-req` sans état) et message « Configurez votre profil pour comparer ».
