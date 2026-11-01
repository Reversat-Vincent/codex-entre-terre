# ProgressThread

Le fil d'or : les cinq étapes de partie (Début, Milieu, Fin, Fin de jeu, DLC) en en-tête des colonnes du widget A et des vues par étape.

- Étapes passées : losange plein et ligne `gold`. Étape courante (`aria-current="step"`) : losange plein avec halo `gold-wash`, libellé `gold-text`. À venir : losange creux, ligne `line-strong`.
- Sous chaque étape, ses régions (correspondance Calculée et configurable).
- L'étape courante vient du critère Progression (étape choisie, boss vaincus ou régions atteintes).
