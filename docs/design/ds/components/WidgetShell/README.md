# WidgetShell

Enveloppe commune des widgets du tableau de bord : titre, ligne « comment c'est calculé », actions, corps, pied.

**Le consommateur fournit** le titre, la méthode en une phrase, le contenu et l'état (`ready`, `loading`, `empty`, `partial`, `error`).

- En-tête : poignée `i-grip` (glisser pour réordonner ; au clavier, « Déplacer vers le haut / bas » dans le menu), titre `cx-w-title`, méthode `cx-w-how` avec l'icône `i-calc`.
- Actions : Réduire, Plein écran (si le widget a une vue détaillée), menu `.cx-menu` (déplacer, retirer). Un widget retiré se rajoute depuis « Ajouter un widget ».
- Réduit : seul l'en-tête reste. L'état réduit est mémorisé localement.
- États : squelettes `.cx-skel` au chargement, `.cx-empty` sans résultat avec une suggestion d'élargissement, `.cx-note.partial` quand une partie des données manque.
- Grille : 12 colonnes, `space-4` de gouttière ; largeurs 12, 7 ou 5 colonnes.
