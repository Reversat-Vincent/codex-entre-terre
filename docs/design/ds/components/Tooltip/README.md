# Tooltip

Explication courte au survol et au focus. Jamais d'information indispensable uniquement dans une info-bulle sur mobile : prévoyez un appui.

- Déclencheur focusable (`button.cx-tip-trigger`) relié par `aria-describedby` ; `role="tooltip"`.
- Contenu : une phrase en gras qui répond, une phrase qui explique la méthode ou la source. 280 px maximum.
- Positions : au-dessus par défaut, `.below`, `.start`, `.end` près des bords.
- Usages obligatoires : badge Calculé (méthode), Incohérence (champ et valeur retenue), case de heatmap (boss, type, valeur), abréviation d'attribut (nom complet).
