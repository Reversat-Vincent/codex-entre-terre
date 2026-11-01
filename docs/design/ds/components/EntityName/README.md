# EntityName

En-tête d'une entrée : nom anglais des données, emplacement de traduction, métadonnées et lien vers le wiki.

**Le consommateur fournit** `name`, `translation` (facultatif), la classe ou le rang, `source`, `url`.

- Nom en `titre-xl` sur une fiche, `titre-s` dans une carte, un nœud ou une ligne de résultat.
- Traduction en `sous-titre` sous le nom. Sans traduction, rien ne s'affiche (l'encadré pointillé de l'aperçu n'existe que pour montrer l'emplacement).
- Rappel « Valeurs de base à +0 » (armes) ou « Valeurs NG » (boss) dans la ligne de métadonnées dès qu'une fiche affiche des chiffres bruts.
- « Voir sur le wiki » ouvre `url` dans un nouvel onglet.
