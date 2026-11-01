# BossTimeline

Frise verticale des boss de l'histoire principale, avec embranchements et voie DLC parallèle.

**Le consommateur fournit** la séquence (étapes, groupes « N parmi M », alternatives « ou », prérequis), les entrées de boss, l'état vaincu et le niveau du profil.

- Chaque étape : rail (losange + ligne) et corps. Étape vaincue `.is-done` (or), prochaine `.is-next` (halo).
- Groupe de choix `.cx-choice` : titre « 2 au choix parmi 5 » et compteur d'avancement ; chaque boss du groupe garde ses prérequis en sous-nœuds `.cx-sub` (Margit avant Godrick, Red Wolf avant Rennala).
- Alternative `.cx-or` : deux nœuds séparés par le losange « ou » ; l'option non retenue passe en `.is-optional` dès que l'autre est vaincue.
- Nœud `.cx-boss` : nom, rang, région, source ; PV, runes, Remembrance ; faiblesses et immunités ; colonne de droite : état et jauge de préparation.
- Données manquantes : « Non documenté » pour une valeur ; « Aucune donnée de combat sur le wiki » et état « Non estimé » quand rien n'existe.
- Voie DLC `.cx-lane` à droite sur desktop (sous la frise sur mobile), avec la condition d'accès (Radahn et Mohg) puis Messmer → Romina → Promised Consort Radahn.
- Cocher « Vaincu » sur un nœud bascule le critère Progression en mode « Boss vaincus ».
