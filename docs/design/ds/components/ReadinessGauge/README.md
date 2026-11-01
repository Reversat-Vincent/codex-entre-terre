# ReadinessGauge

Compare le niveau du joueur au niveau minimum recommandé d'un boss.

**Le consommateur fournit** le niveau du profil, le niveau recommandé (Calculé) et l'état vaincu.

- États : **Prêt** (niveau ≥ recommandé, `ready`, icône coche cerclée), **Limite** (à 8 niveaux ou moins, `warn`, triangle), **Trop tôt** (`danger`, horloge), **Vaincu** (`ink-2`, coche), **Non estimé** (pointillé, aucune donnée de combat).
- Piste `surface-sunken`, remplissage jusqu'au niveau du joueur, repère vertical `ink` au niveau recommandé. Échelle : 0 → max(recommandé + 30, niveau + 12, 60).
- Légende chiffrée sous la piste. Le mot de l'état est toujours affiché.
- Boss du DLC : ajoutez la bénédiction de l'Arbre-Ombre recommandée sur une seconde ligne.
