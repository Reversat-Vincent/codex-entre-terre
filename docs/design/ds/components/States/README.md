# States

États communs à tous les widgets, catalogues et fiches.

- **Vide** (`.cx-empty`) : titre qui dit ce qui manque, phrase qui dit pourquoi, une action qui élargit les critères (la plus efficace d'abord).
- **Chargement** (`.cx-loading` + `.cx-skel`) : squelettes aux dimensions du contenu final ; `aria-busy="true"`. Figés si `prefers-reduced-motion`.
- **Premier chargement** : barre `.cx-progress` et compteur de fichiers ; l'application est utilisable widget par widget dès que ses fichiers sont lus.
- **Partiel** (`.cx-note.partial`) : combien d'entrées manquent et comment elles apparaissent.
- **Estimé** (`.cx-note.est`) : quand un résultat repose sur une estimation.
- **Erreur** (`.cx-note.warn`) : quel fichier, quoi faire. Pas d'excuses.
- **Notification** (`.cx-toast`, `role="status"`) : reprend le verbe de l'action, propose « Annuler » quand c'est possible, disparaît après 5 s.
