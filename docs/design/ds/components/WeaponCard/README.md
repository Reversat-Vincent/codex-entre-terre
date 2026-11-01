# WeaponCard

Carte d'une arme recommandée, conçue pour une colonne de 190–260 px (widget A, une colonne par étape).

**Le consommateur fournit** l'entrée d'arme (nom, classe, poids, source, prérequis, scaling, compétence, effet passif, amélioration, acquisition, drapeaux), le score calculé et sa décomposition, l'état épinglé.

Ordre fixe des lignes : nom et score ; classe, poids, source ; prérequis comparés ; scaling ; compétence (unique ou Cendre de guerre) ; effet passif ; amélioration avec badge de fiabilité ; « où l'obtenir » ; drapeaux (Remembrance, achat, butin aléatoire, quête) ; actions.

- La recommandation n°1 du widget porte `.is-top` (`glow-gold`). Une seule par widget.
- Score : `chiffre-l` en `gold-text` + barre ; le détail est dans « Pourquoi ? ».
- Effet passif absent : ligne omise. Effet non chiffré : texte en `ink-3`.
- Actions : Épingler (`aria-pressed`), Comparer, Alternatives, Pourquoi ?. Le nom ouvre la fiche.
- Drapeaux à risque (`.cx-flag.is-alert`) : Remembrance, butin aléatoire, quête manquable.
