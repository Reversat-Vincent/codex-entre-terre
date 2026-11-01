Le Codex de l'Entre-terre est un compagnon d'*Elden Ring* que l'on consulte en second écran, entre deux combats. Ce système a un seul but : lire vite des données denses sans jamais confondre un fait du wiki, une estimation et un calcul de l'application. Les données (18 fichiers JSON extraits d'eldenring.wiki.gg) sont chargées dans le navigateur ; tout calcul est fait côté client.

## Principes

1. **Lisible d'un coup d'œil.** Une information forte par carte, chiffres tabulaires, hiérarchie portée par la taille et la graisse, pas par la décoration.
2. **La provenance se voit toujours.** Chaque valeur montre sa nature : wiki, estimation, non documentée, incohérente, calculée. Jamais par la couleur seule : forme, icône et mot.
3. **L'or est la voix de l'application.** `gold` et ses dérivés marquent ce que l'application propose : actions, recommandations, valeurs calculées, progression. Les faits du wiki restent dans les encres neutres (`ink`, `ink-2`, `ink-3`).
4. **Pierre, pas néon.** Fonds chauds quasi noirs, surfaces à peine élevées, une seule lueur (`glow-gold`) sur la recommandation n°1 d'un widget.

## Contenu et langue

- Interface en français. Données en anglais, telles qu'extraites du wiki : noms d'objets, de boss, de lieux, descriptions, notes de combat. Ne traduisez jamais une donnée à la volée.
- Sous un nom anglais, réservez l'emplacement `sous-titre` à une traduction française éventuelle. Quand elle est absente, n'affichez rien (pas de tiret, pas de « N/A »).
- Attributs abrégés en anglais, comme dans les données : VIG, MND, END, STR, DEX, INT, FAI, ARC. Le nom complet (Vigor, Mind…) apparaît en info-bulle et dans le panneau de critères.
- Casse de phrase partout (« Ajouter un widget »). Pas de capitales décoratives.
- Vouvoiement dans les messages. Possessif à la première personne pour ce qui appartient au joueur : « Ma liste », « Mon profil ».
- Nombres à la française : espace fine insécable pour les milliers (`70 000`), virgule décimale (`5,5`), espace insécable avant `%` (`−10 %`), vrai signe moins (`−`).
- Un bouton dit ce qui arrive (« Épingler », « Comparer », « Voir sur le wiki ») et la notification reprend le même verbe (« Épinglé à Ma liste »).
- Un état vide dit ce qui manque et propose d'élargir : « Aucune arme de fin de jeu ne correspond à vos critères. Inclure les échanges de Remembrance ? »

## Conventions de données (obligatoires sur chaque écran)

| Situation | Affichage | Composant, tokens |
|---|---|---|
| `source: Base game` | Badge « Base », icône carré | SourceBadge, `src-base` |
| `source: Shadow of the Erdtree` | Badge « SotE », icône demi-cercle | SourceBadge, `src-sote` |
| `source: Tarnished Pack` | Badge « TP », icône losange | SourceBadge, `src-tp` |
| `source: Base game + Shadow of the Erdtree` | Badge double « Base + SotE » sur le boss ; chaque rencontre garde sa propre étiquette | SourceBadge (double) |
| Valeur `null` | « Non documenté » + icône ∅ ; dans une case : hachures + info-bulle | ReliabilityBadge, `.cx-null`, `hatch` |
| Estimation (type d'amélioration) | Badge pointillé « Estimation (haute) » ou « (moyenne) », icône ≈ | ReliabilityBadge, `estimate` |
| Tableau du wiki contredit par l'infobox | Badge « Incohérence » discret, explication au survol | ReliabilityBadge, `warn` |
| Valeur calculée par l'application | Badge « Calculé », icône ƒ, méthode au survol ou dans « Pourquoi ? » | ReliabilityBadge, `gold-text`, `gold-wash` |
| Valeur de base | Libellée « +0 » (armes) ou « NG » (boss) | EntityName |
| Lien vers la source | « Voir sur le wiki » + icône de sortie, vers `url` | Button (ghost) |

- N'affichez jamais `0` pour un `null`, ni une case vide. Un vrai zéro (absorption de 0 %) s'affiche `0 %`.
- Une estimation ne prend jamais l'apparence d'un fait : badge obligatoire, à côté de la valeur, dans les cartes, tableaux, fiches et exports.
- Une valeur calculée à partir d'une estimation hérite du badge Estimation (exemple : plan d'amélioration de Moonveil).
- Les valeurs calculées (puissance d'attaque à +X avec les stats du profil) passent en `gold-text` avec le badge Calculé, à côté de la valeur de base, jamais à sa place.
- Le badge « valeur de maquette » (`mock`, `mock-wash`) n'existe que dans le prototype. Il ne doit pas être livré.

## Couleurs

- Fond de page `bg`. Widgets, panneaux et barre latérale `surface`. Cartes dans un widget, menus, info-bulles `surface-raised`. Champs, steppers et pistes `surface-sunken`. Survol `surface-hover`.
- Texte : `ink` principal, `ink-2` secondaire, `ink-3` légendes et lignes « comment c'est calculé ». `ink-disabled` sert uniquement aux contrôles désactivés.
- Accent : `gold` en remplissage avec `on-gold` dessus ; `gold-text` quand l'or est du texte ; `gold-wash` et `gold-line` pour un élément sélectionné ou recommandé.
- États de préparation : `ready` (Prêt, prérequis atteint), `warn` (Limite, prérequis manquant, incohérence), `danger` (Trop tôt, erreur). Toujours avec icône et mot, sur leur fond `*-wash`.
- Les couleurs `dmg-*` (types de dégâts) et `st-*` (statuts) teignent l'icône seulement ; le libellé reste en `ink`.
- Scaling : `grade-s` à `grade-e` avec `on-grade-*`. La lettre porte le sens, la couleur le renforce (échelle ordinale, S la plus lumineuse en sombre, la plus foncée en parchemin).
- Heatmap d'absorption : échelle divergente `abs-w2` (forte faiblesse) → `abs-w1` → `abs-n` (neutre) → `abs-r1` → `abs-r2` → `abs-r3` (forte résistance). Texte dans les cases : `on-abs-w2`, `on-abs-w1`, `ink`, `ink`, `ink`, `on-abs-r3`.
- Graphiques : séries `cat-1` à `cat-4` dans cet ordre fixe (validé daltonisme, ΔE ≥ 8 entre voisines dans les deux thèmes). Au-delà de quatre séries, un sélecteur ; jamais une cinquième teinte.
- Deux thèmes : `sombre` (défaut) et `parchemin`. Basculez avec `data-theme` sur la racine ; aucun composant ne porte de couleur propre à un thème.

## Typographie

- **Cormorant Garamond** pour les titres et les noms d'entité : `titre-xl` en tête de fiche, `titre-l` pour la page, `titre-m` pour un widget, `titre-s` pour les noms dans les cartes et les nœuds, `sous-titre` (italique) pour la traduction facultative.
- **Source Sans 3** pour l'interface et les données : `ui` par défaut, `ui-fort` pour les libellés et valeurs clés, `donnee` en tableau, `libelle`, `micro` (11 px, taille minimale), `chiffre-l` pour un score, `chiffre-xl` pour le chiffre principal d'une vue (un seul).
- Jamais de chiffres en serif, jamais de serif sous 16 px.
- `font-variant-numeric: tabular-nums` dans les tableaux, jauges, légendes et colonnes de valeurs.

## Espacement, rayons, élévation

- Grille de 4 px : `space-1` à `space-16`. Gouttière de la grille de widgets `space-4`, marge interne des widgets `space-5`, marge de page `space-6` (desktop) et `space-4` (mobile).
- Rayons : `radius-xs` lettres de scaling et cases ; `radius-s` contrôles et puces ; `radius-m` cartes et nœuds ; `radius-l` widgets et panneaux ; `radius-pill` uniquement pour les puces de critères et les interrupteurs.
- Élévation par la surface d'abord, l'ombre ensuite : `shadow-1` widgets, `shadow-2` menus et info-bulles, `shadow-3` recherche globale et feuilles mobiles. `glow-gold` une seule fois par widget, sur la recommandation n°1.

## Iconographie

- Jeu d'icônes original au trait : grille 24, trait 1,6, extrémités arrondies, dans l'esprit de Lucide. Aucune icône, logo, illustration ni police du jeu.
- Familles : interface, sources (carré, demi-cercle, losange), 8 types de dégâts, 7 statuts, classes d'armes. Les symboles `i-*` sont dans l'aperçu Iconographie : copiez le sprite tel quel.
- Une icône hérite de `currentColor`. Taille 16 px par défaut, 12–14 px dans les badges, 20–24 px en tête de fiche.
- Immunité à un statut : icône du statut barrée et bordure pointillée.
- Marque : losange double traversé d'un fil (`i-mark`) en `gold`, suivi de « Codex de l'Entre-terre » en Cormorant Garamond 600. Pied de page obligatoire : « Outil de fan non officiel — données : eldenring.wiki.gg (CC BY-SA 4.0) ».

## Données visuelles

- **Le fil d'or** relie toute progression : étapes de partie et frise des boss. Ligne de 2 px et losanges ; passé en `gold`, à venir en `line-strong`, étape courante avec un halo `gold-wash`.
- Chaque graphique a une lecture sans couleur : valeurs au survol et vue tableau (la heatmap est un tableau ; les courbes ont une légende et des étiquettes en bout de ligne).
- Le texte d'un graphique reste dans les encres, jamais dans la couleur de la série.
- Jauge de préparation : piste `surface-sunken`, remplissage selon l'état, repère vertical `ink` au niveau recommandé, légende chiffrée « Niv. 42 / recommandé 50 ».

## Mise en page et responsive

- Desktop (≥ 1280 px, cible 1440 px) : barre latérale `size-nav` repliable en rail `size-rail`, panneau de critères `size-criteres` repliable à 52 px, grille de widgets sur 12 colonnes.
- Tablette (768–1279 px) : rail d'icônes, critères en tiroir superposé, widgets pleine largeur.
- Mobile (< 768 px) : barre d'onglets en bas (Accueil, Explorer, Ma liste, Mécaniques, Profil), recherche dans l'en-tête, critères en feuille, cibles d'au moins `size-cible`.

## Interaction et mouvement

- Chaque changement de critère recalcule immédiatement tous les widgets. Pas de bouton « Appliquer ».
- Transitions sobres de 150 ms sur la largeur des barres et la position des repères. Pas de rebond. Avec `prefers-reduced-motion`, aucune animation.
- Focus clavier : anneau `focus` de 2 px plein, décalé de 2 px, sur tout élément interactif.
- Recherche globale : Ctrl/⌘ + K depuis n'importe quel écran, Échap pour fermer, ↑ ↓ pour naviguer, Entrée pour ouvrir.
- Toute recommandation propose « Pourquoi ? » : décomposition du score, données utilisées (fichier et champ), limites connues. Les méthodes sont décrites dans la section Méthodes de calcul.

## Accessibilité

- Contraste du texte ≥ 4,5:1 sur ses fonds dans les deux thèmes ; bordures de contrôle, icônes porteuses de sens et anneau de focus ≥ 3:1.
- Jamais la couleur seule : chaque état porte une icône et un mot, chaque source une forme et un texte, chaque immunité une icône barrée.
- Contrôles réels : `button`, `a`, `input` avec `label`. `aria-pressed` pour les bascules, `aria-sort` sur les en-têtes triés, `aria-label` sur les boutons-icônes.
