# Button

Actions. Un seul bouton principal (`.cx-btn-primary`, or plein) par zone, pour l'action que la zone sert.

- Secondaire `.cx-btn` par défaut ; discret `.cx-btn-ghost` dans les barres d'actions des cartes ; icône seule `.cx-btn-icon` avec `aria-label` obligatoire ; petit `.cx-btn-sm` (26 px) dans les cartes et en-têtes de widget.
- Bascule : `aria-pressed="true"` (Épinglé, filtre actif) prend `gold-wash` et `gold-line`.
- Désactivé : attribut `disabled` et raison dans le libellé ou l'info-bulle (« Comparer (4 maximum) »).
- Libellé : verbe qui dit ce qui arrive. Un lien vers une page externe est un `a` avec l'icône `i-ext`.
- Cible minimale 32 px sur desktop, 44 px sur mobile.
