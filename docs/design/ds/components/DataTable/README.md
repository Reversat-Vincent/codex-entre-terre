# DataTable

Tableau dense des catalogues et des vues plein écran. Lignes de 34 px, chiffres tabulaires, en-tête collant.

**Le consommateur fournit** les colonnes (libellé, alignement, tri possible), les lignes et l'état de tri.

- Tri multi-colonnes : clic = tri principal, Maj + clic = tri secondaire ; le rang du tri s'affiche dans `.cx-sort-rank` ; `aria-sort` sur `th`.
- Les valeurs `null` s'affichent « Non documenté » (`.cx-null`) et se trient toujours en dernier, quel que soit le sens.
- Une entrée sans aucune donnée de combat fusionne ses cellules de valeurs avec un message explicite.
- Nombres alignés à droite (`.num`), noms en lien vers la fiche, badge de source après le nom.
- Ligne sélectionnée `.is-selected` (comparateur, « Pourquoi ? » ouvert).
- Listes longues (704 pièces d'armure) : virtualisation des lignes, en-tête collant, compteur « 704 résultats ».
