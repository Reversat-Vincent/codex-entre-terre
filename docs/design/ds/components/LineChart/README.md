# LineChart

Courbes de l'évolution d'une valeur par niveau d'amélioration et par affinité (fiche arme), et coût par niveau (calculateur de runes).

**Le consommateur fournit** les séries (tableaux d'amélioration du wiki, par affinité) ; sans tableau dans le wiki, le graphique est remplacé par un état vide explicite.

- Séries `cat-1` à `cat-4` dans l'ordre ; quatre au plus, choisies par un sélecteur d'affinités. Trait de 2 px, sans marqueurs sauf au survol.
- Légende toujours présente au-dessus pour deux séries ou plus ; libellés en encres.
- Survol : ligne verticale et info-bulle listant chaque série à ce niveau, avec la valeur de base +0 rappelée.
- Grille et axes en `line` et `line-strong` ; graduations rondes.
