# SourceBadge

Badge de provenance d'une entrée (jeu de base ou DLC), affiché partout où l'entrée apparaît.

**Le consommateur fournit** le champ `source` : `Base game`, `Shadow of the Erdtree`, `Tarnished Pack` ou, pour un boss, `Base game + Shadow of the Erdtree`.

**Rendu** : `span.cx-badge.cx-src-base|sote|tp` avec l'icône `i-s-base` (carré), `i-s-sote` (demi-cercle) ou `i-s-tp` (losange), le libellé court (« Base », « SotE », « TP ») et le nom complet en `title` et `aria-label`. Variante double : `.cx-src-both` avec deux `span`.

- Placez-le juste après le nom : cartes, lignes de tableau, résultats de recherche, en-tête de fiche.
- Boss présent dans les deux contenus : badge double sur l'en-tête de la fiche, badge simple sur chaque onglet de rencontre.
- DLC désactivé dans le profil : ses entrées disparaissent des recommandations ; dans les catalogues elles restent visibles tant que le filtre « Contenu » n'est pas appliqué.
- Ne remplacez jamais le badge par une couleur seule.
