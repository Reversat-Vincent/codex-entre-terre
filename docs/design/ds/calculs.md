# Méthodes de calcul

Toute valeur produite par l'application porte le badge **Calculé** et renvoie à l'une de ces méthodes dans son panneau « Pourquoi ? ». Les pondérations ci-dessous sont celles du prototype : elles sont paramétrables et doivent rester décrites ici quand elles changent.

## Étape de progression d'une arme

- Chaque entrée `acquisition[].region` est rattachée à une étape par une table configurable : Début (Limgrave, Weeping Peninsula), Milieu (Liurnia of the Lakes, Caelid, Altus Plateau), Fin (Leyndell, Mountaintops of the Giants, Mt. Gelmir), Fin de jeu (Crumbling Farum Azula), DLC (Gravesite Plain → Enir-Ilim).
- Une arme obtenue par échange de Remembrance prend l'étape du boss dont elle dépend (Blasphemous Blade → Rykard → Mt. Gelmir → Fin).
- Quand une arme a plusieurs acquisitions, on retient la plus précoce. Un équipement de départ compte pour l'origine choisie seulement.

## Score de recommandation d'une arme (0–100)

Quatre composantes de 0 à 25, arrondies puis additionnées.

1. **Adéquation au build** : moyenne pondérée des lettres de scaling (S = 1 ; A = 0,85 ; B = 0,7 ; C = 0,55 ; D = 0,4 ; E = 0,25) selon les poids de l'archétype, ramenée sur 25 (une moyenne de 0,5 vaut 25). Pénalité de 4 par attribut hors build requis au-delà de 10, de 7 au-delà de 20. Bonus de 4 si l'effet passif correspond au statut privilégié, de 2 si la classe est préférée (−2 sinon, quand une préférence existe).
2. **Puissance et scaling** : 70 % sur l'attaque de base totale à +0 (plafond 200), 30 % sur la somme des lettres de scaling (plafond 1,6). −4 si l'arme dépasse le budget de poids issu de la limite de charge.
3. **Accessibilité** : 25, moins 4 par étape d'avance sur l'étape du joueur, moins 0,6 par point d'attribut manquant (plafond 9), moins 4 pour un échange de Remembrance, moins 1 pour un butin de PNJ envahisseur, plus 2 si l'arme est l'équipement de départ de l'origine choisie.
4. **Coût d'amélioration** : 20 pour des pierres sombres (+10, une pierre par niveau), 16 pour des pierres normales (+25). Préférence de pierres : +5 pour le type préféré, −6 pour l'autre. −2 quand le type d'amélioration est une estimation.

Filtres appliqués avant le score : contenus désactivés, exclusions (Remembrance, butin aléatoire, quête), estimations exclues si la fiabilité l'impose.

## Prérequis comparés au profil

- Un prérequis est atteint si l'attribut du profil est supérieur ou égal à la valeur demandée.
- À deux mains, la Force effective vaut `floor(STR × 1,5)`. La puce l'indique (« 2M ») et l'écart affiché est exprimé en Force réelle : `ceil(prérequis / 1,5) − STR`.

## Origine optimale

- Niveau final pour une cible : `Σ max(attribut de départ, attribut cible) − 79` (toutes les origines vérifient niveau = somme des attributs − 79).
- Points gaspillés : `Σ max(0, attribut de départ − attribut cible)`.
- Tri : niveau final croissant, puis points gaspillés, puis adéquation précoce (attributs utiles au build dès le départ, bonus si l'équipement de départ contient une arme recommandée).

## Niveau recommandé d'un boss et préparation

- Niveau recommandé : estimation de l'application à partir des PV et des runes NG du wiki et de la position du boss dans la progression (valeur de maquette dans le prototype). Les boss du DLC ajoutent une bénédiction de l'Arbre-Ombre recommandée.
- Préparation : **Prêt** si niveau ≥ recommandé ; **Limite** si niveau ≥ recommandé − 8 ; **Trop tôt** sinon ; **Non estimé** si le boss n'a pas de données de combat.
- Jauge : échelle de 0 à `max(recommandé + 30, niveau + 12, 60)`.

## Coût en runes d'un niveau

- Pour passer du niveau L à L + 1 : `x = max(0, (L + 81 − 92) × 0,02)`, coût = `floor((x + 0,1) × (L + 81)²) + 1`. Exemples : niveau 1 → 673 runes, niveau 150 → 153 680 runes, niveau 712 → 8 879 348 runes.
- Les totaux additionnent les coûts niveau par niveau. La table officielle (niveaux 1 à 713) du fichier `mechanics` fait foi en cas d'écart.

## Plan d'amélioration

- Pierres normales : niveaux +1 à +24 par paliers de trois, 2, 4 puis 6 pierres du palier (12 par palier) ; +25 demande une Ancient Dragon Smithing Stone.
- Pierres sombres : une Somber Smithing Stone [n] pour le niveau +n (n ≤ 9) ; +10 demande une Somber Ancient Dragon Smithing Stone.
- Bell Bearings (achat illimité) : Smithing-Stone Miner's [1] à [4] couvrent les paliers 1–2, 3–4, 5–6, 7–8 ; Somberstone Miner's [1] à [5] couvrent 1–2, 3–4, 5–6, 7–8 et 9. Les pierres anciennes ne s'achètent pas en quantité illimitée.
- Le plan hérite du badge Estimation quand le type d'amélioration de l'arme est estimé.

## Statistiques dérivées

PV, FP, endurance et charge sont calculés à partir de Vigor, Mind et Endurance avec les courbes du fichier `mechanics` (exemple : Vigor 15 → 522 PV). L'équilibre dépend de l'armure et reste une valeur de données, pas un calcul.
