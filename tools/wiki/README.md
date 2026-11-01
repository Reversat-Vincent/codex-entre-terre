# Scripts d'extraction du wiki

Scripts Python qui ont produit les fichiers de `data/` à partir d'eldenring.wiki.gg, le 31/10/2026. Ce sont des scripts de travail, pas un pipeline automatisé : les listes de pages, les navboxes et les pages rendues ont été récupérées par des appels ponctuels à l'API, et les fichiers intermédiaires n'ont pas été conservés. Ils servent à revérifier une donnée ou à en extraire de nouvelles avec la même méthode.

## Utilisation
- Python 3, bibliothèque standard uniquement.
- Lancer avec `python -I`. Les téléchargements vont dans `.cache/wiki/`, hors du dépôt.
- La docstring de chaque script indique son usage.

## Scripts

| Script | Rôle |
|---|---|
| `fetch_pages.py` | Télécharge le wikitext d'une liste de pages par l'API : 50 titres par requête, 1,5 s entre deux requêtes, redirections résolues. `fetch_pages.py <titres.json> <sortie.json>` |
| `wikiparse.py` | Fonctions communes : modèles, infobox, tableaux avec fusions de cellules, sections, acquisitions, régions, transclusions, nettoyage du balisage, étiquette DLC tirée de l'introduction |
| `extract_index.py` | Index des armes depuis la page Melee Armaments rendue (`action=parse`) |
| `extract_gallery_index.py` | Index de tous les objets de « All Items (Gallery) », avec l'icône DLC |
| `build_weapons.py` | Armes de mêlée, à distance et boucliers. `build_weapons.py <index> <pages> <compétences> <cendres> <sortie> [--source URL] [--classes fichier] [--reference json] [--other-names json]` ; la ligne d'usage de sa docstring omet `<cendres>` et les options |
| `build_items.py` | Objets de la galerie (armures, talismans, sorts, outils…). `build_items.py <index_galerie> <pages> <sortie> <type> <section[::sous-section]>…` ; sa docstring indique `/` comme séparateur, le code attend `::` |
| `build_bosses.py` | Boss et combats : navboxes, pages hub, rangs, indicateurs |
| `build_locations.py` | Lieux, en deux modes : `candidates` puis `build` |
| `build_npcs.py` | PNJ, boutiques et quêtes, en deux modes : `list` puis `build` |
| `build_origins.py` | Origines |
| `build_mechanics.py` | Pages de mécaniques |
| `qa_all.py` | Contrôle de tous les JSON d'un dossier : étiquettes `source` autorisées, restes de balisage wiki, comptes |
| `crosscheck2.py` | Relit les stats d'armes dans le wikitext et les compare au JSON |
| `diff_json.py` | Compare deux versions d'un JSON |
