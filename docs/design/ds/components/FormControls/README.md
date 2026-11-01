# FormControls

Contrôles du panneau de critères et des filtres. Tous natifs, stylés par les tokens (`accent-color: gold` pour cases et curseurs).

- Segments `.cx-seg` : choix exclusif court (style de jeu, étape, une main / deux mains). Chaque segment est un `button` avec `aria-pressed`.
- Liste `.cx-select` : plus de cinq options (origine, archétype, profil).
- Interrupteur `.cx-toggle` : option binaire qui s'applique immédiatement (contraintes, fiabilité). `button` + `aria-pressed`.
- Cases `.cx-check` : sélection multiple (contenus, classes d'armes) ; compteur à droite dans `.cx-check-meta`.
- Curseur `.cx-range` : valeur continue avec sa valeur lisible à côté.
- Aucun bouton « Appliquer » : chaque changement recalcule.
